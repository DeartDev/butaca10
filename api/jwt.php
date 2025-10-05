<?php
/**
 * Butaca10 - JWT Authentication Manager
 * Sistema de autenticación basado en JWT
 */

class JWTAuth {
    private static $secretKey;
    private static $algorithm = 'HS256';
    private static $expireTime;
    private static $refreshExpireTime;
    
    /**
     * Inicializar configuración JWT
     */
    public static function init() {
        self::$secretKey = $_ENV['JWT_SECRET'] ?? 'default_secret_key_change_in_production';
        self::$expireTime = (int)($_ENV['JWT_EXPIRE'] ?? 86400); // 24 horas
        self::$refreshExpireTime = (int)($_ENV['JWT_REFRESH_EXPIRE'] ?? 604800); // 7 días
    }
    
    /**
     * Generar token JWT
     */
    public static function generateToken($userId, $userData = [], $type = 'access') {
        self::init();
        
        $expireTime = $type === 'refresh' ? self::$refreshExpireTime : self::$expireTime;
        
        $header = json_encode(['typ' => 'JWT', 'alg' => self::$algorithm]);
        
        $payload = [
            'iss' => $_ENV['APP_NAME'] ?? 'Butaca10',
            'aud' => 'butaca10-app',
            'iat' => time(),
            'exp' => time() + $expireTime,
            'user_id' => $userId,
            'type' => $type,
            'data' => $userData
        ];
        
        $payloadJson = json_encode($payload);
        
        $base64Header = self::base64urlEncode($header);
        $base64Payload = self::base64urlEncode($payloadJson);
        
        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, self::$secretKey, true);
        $base64Signature = self::base64urlEncode($signature);
        
        $token = $base64Header . "." . $base64Payload . "." . $base64Signature;
        
        // Guardar token en base de datos
        self::saveTokenToDatabase($userId, $token, $type, time() + $expireTime);
        
        return $token;
    }
    
    /**
     * Verificar y decodificar token JWT
     */
    public static function verifyToken($token) {
        self::init();
        
        if (empty($token)) {
            throw new Exception('Token no proporcionado', 401);
        }
        
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new Exception('Token inválido', 401);
        }
        
        list($base64Header, $base64Payload, $base64Signature) = $parts;
        
        // Verificar firma
        $signature = self::base64urlDecode($base64Signature);
        $expectedSignature = hash_hmac('sha256', $base64Header . "." . $base64Payload, self::$secretKey, true);
        
        if (!hash_equals($signature, $expectedSignature)) {
            throw new Exception('Token inválido', 401);
        }
        
        // Decodificar payload
        $payload = json_decode(self::base64urlDecode($base64Payload), true);
        
        if (!$payload) {
            throw new Exception('Token inválido', 401);
        }
        
        // Verificar expiración
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            throw new Exception('Token expirado', 401);
        }
        
        // Verificar que el token exista en la base de datos y esté activo
        if (!self::isTokenValid($token)) {
            throw new Exception('Token revocado', 401);
        }
        
        return $payload;
    }
    
    /**
     * Obtener información del usuario desde el token
     */
    public static function getUserFromToken($token) {
        try {
            $payload = self::verifyToken($token);
            return $payload;
        } catch (Exception $e) {
            return null;
        }
    }
    
    /**
     * Revocar token
     */
    public static function revokeToken($token) {
        try {
            $db = getDB();
            $sql = "UPDATE tokens_sesion SET activo = FALSE WHERE token = ? AND activo = TRUE";
            $db->execute($sql, [$token]);
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Revocar todos los tokens de un usuario
     */
    public static function revokeAllUserTokens($userId) {
        try {
            $db = getDB();
            $sql = "UPDATE tokens_sesion SET activo = FALSE WHERE id_usuario = ? AND activo = TRUE";
            $db->execute($sql, [$userId]);
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Refrescar token
     */
    public static function refreshToken($refreshToken) {
        try {
            $payload = self::verifyToken($refreshToken);
            
            if ($payload['type'] !== 'refresh') {
                throw new Exception('Token de refresco inválido', 401);
            }
            
            $userId = $payload['user_id'];
            $userData = $payload['data'] ?? [];
            
            // Revocar el token de refresco usado
            self::revokeToken($refreshToken);
            
            // Generar nuevos tokens
            $newAccessToken = self::generateToken($userId, $userData, 'access');
            $newRefreshToken = self::generateToken($userId, $userData, 'refresh');
            
            return [
                'access_token' => $newAccessToken,
                'refresh_token' => $newRefreshToken,
                'expires_in' => self::$expireTime
            ];
            
        } catch (Exception $e) {
            throw new Exception('Error al refrescar token: ' . $e->getMessage(), 401);
        }
    }
    
    /**
     * Guardar token en base de datos
     */
    private static function saveTokenToDatabase($userId, $token, $type, $expiration) {
        try {
            $db = getDB();
            
            $sql = "INSERT INTO tokens_sesion (id_usuario, token, tipo_token, fecha_expiracion, ip_cliente, user_agent) 
                    VALUES (?, ?, ?, FROM_UNIXTIME(?), ?, ?)";
            
            $params = [
                $userId,
                $token,
                $type,
                $expiration,
                $_SERVER['REMOTE_ADDR'] ?? '',
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ];
            
            $db->execute($sql, $params);
            
        } catch (Exception $e) {
            // Log error but don't throw - token can still work without DB storage
            error_log("Failed to save token to database: " . $e->getMessage());
        }
    }
    
    /**
     * Verificar si token es válido en base de datos
     */
    private static function isTokenValid($token) {
        try {
            $db = getDB();
            $sql = "SELECT id FROM tokens_sesion WHERE token = ? AND activo = TRUE AND fecha_expiracion > NOW()";
            $result = $db->fetchOne($sql, [$token]);
            return $result !== false;
        } catch (Exception $e) {
            // Si hay error en DB, asumimos que el token es válido si pasa la verificación JWT
            return true;
        }
    }
    
    /**
     * Codificar base64 URL-safe
     */
    private static function base64urlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    /**
     * Decodificar base64 URL-safe
     */
    private static function base64urlDecode($data) {
        return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
    }
    
    /**
     * Obtener token desde headers HTTP
     */
    public static function getTokenFromHeaders() {
        $headers = getallheaders();
        
        // Buscar en Authorization header
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                return $matches[1];
            }
        }
        
        // Buscar en header personalizado
        if (isset($headers['X-Auth-Token'])) {
            return $headers['X-Auth-Token'];
        }
        
        // Buscar en parámetros GET (no recomendado para producción)
        if (isset($_GET['token'])) {
            return $_GET['token'];
        }
        
        return null;
    }
    
    /**
     * Middleware de autenticación
     */
    public static function requireAuth() {
        try {
            $token = self::getTokenFromHeaders();
            
            if (!$token) {
                throw new Exception('Token de autenticación requerido', 401);
            }
            
            $payload = self::verifyToken($token);
            
            // Agregar información del usuario a la request global
            $GLOBALS['current_user'] = $payload;
            $GLOBALS['current_user_id'] = $payload['user_id'];
            
            return $payload;
            
        } catch (Exception $e) {
            http_response_code($e->getCode() ?: 401);
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage(),
                'error_code' => 'AUTH_REQUIRED'
            ]);
            exit;
        }
    }
    
    /**
     * Obtener usuario actual desde la sesión
     */
    public static function getCurrentUser() {
        return $GLOBALS['current_user'] ?? null;
    }
    
    /**
     * Obtener ID del usuario actual
     */
    public static function getCurrentUserId() {
        return $GLOBALS['current_user_id'] ?? null;
    }
    
    /**
     * Limpiar tokens expirados
     */
    public static function cleanupExpiredTokens() {
        try {
            $db = getDB();
            $sql = "DELETE FROM tokens_sesion WHERE fecha_expiracion < NOW() OR activo = FALSE";
            $db->execute($sql);
        } catch (Exception $e) {
            error_log("Failed to cleanup expired tokens: " . $e->getMessage());
        }
    }
    
    /**
     * Obtener estadísticas de tokens
     */
    public static function getTokenStats($userId = null) {
        try {
            $db = getDB();
            
            $where = $userId ? "WHERE id_usuario = ?" : "";
            $params = $userId ? [$userId] : [];
            
            $sql = "SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN activo = TRUE THEN 1 END) as active,
                        COUNT(CASE WHEN fecha_expiracion > NOW() THEN 1 END) as valid,
                        COUNT(CASE WHEN tipo_token = 'access' THEN 1 END) as access_tokens,
                        COUNT(CASE WHEN tipo_token = 'refresh' THEN 1 END) as refresh_tokens
                    FROM tokens_sesion {$where}";
            
            return $db->fetchOne($sql, $params);
            
        } catch (Exception $e) {
            return null;
        }
    }
}

// Función helper para requerir autenticación
function requireAuth() {
    return JWTAuth::requireAuth();
}

// Función helper para obtener usuario actual
function getCurrentUser() {
    return JWTAuth::getCurrentUser();
}

// Función helper para obtener ID del usuario actual
function getCurrentUserId() {
    return JWTAuth::getCurrentUserId();
}
?>