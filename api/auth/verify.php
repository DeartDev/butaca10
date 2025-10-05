<?php
/**
 * Butaca10 - Verificación y Refresco de Token
 * POST /api/auth/verify.php - Verificar token
 * POST /api/auth/refresh.php - Refrescar token
 */

// Headers CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Auth-Token');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Incluir dependencias
require_once '../database.php';
require_once '../jwt.php';

// Determinar acción basada en la URL
$action = 'verify';
if (strpos($_SERVER['REQUEST_URI'], 'refresh.php') !== false) {
    $action = 'refresh';
}

try {
    if ($action === 'verify') {
        // VERIFICAR TOKEN
        if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
            throw new Exception('Método no permitido', 405);
        }
        
        $token = JWTAuth::getTokenFromHeaders();
        if (!$token) {
            throw new Exception('Token no proporcionado', 401);
        }
        
        $payload = JWTAuth::verifyToken($token);
        
        // Obtener información actualizada del usuario
        $db = getDB();
        $user = $db->fetchOne(
            "SELECT id, nombre, email, avatar, activo, fecha_ultimo_acceso FROM usuarios WHERE id = ?",
            [$payload['user_id']]
        );
        
        if (!$user || !$user['activo']) {
            throw new Exception('Usuario no encontrado o inactivo', 401);
        }
        
        // Obtener estadísticas actualizadas
        $stats = $db->fetchOne(
            "SELECT 
                (SELECT COUNT(*) FROM bancos WHERE id_usuario = ?) as total_bancos,
                (SELECT COUNT(*) FROM peliculas p 
                 JOIN bancos b ON p.id_banco = b.id 
                 WHERE b.id_usuario = ?) as total_peliculas",
            [$user['id'], $user['id']]
        );
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Token válido',
            'data' => [
                'user' => [
                    'id' => $user['id'],
                    'nombre' => $user['nombre'],
                    'email' => $user['email'],
                    'avatar' => $user['avatar'],
                    'fecha_ultimo_acceso' => $user['fecha_ultimo_acceso'],
                    'stats' => [
                        'total_bancos' => (int)($stats['total_bancos'] ?? 0),
                        'total_peliculas' => (int)($stats['total_peliculas'] ?? 0)
                    ]
                ],
                'token_info' => [
                    'expires_at' => $payload['exp'],
                    'issued_at' => $payload['iat'],
                    'type' => $payload['type']
                ]
            ]
        ]);
        
    } else {
        // REFRESCAR TOKEN
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            throw new Exception('Use POST para refrescar token', 405);
        }
        
        // Obtener refresh token del body o headers
        $refreshToken = null;
        
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if ($data && isset($data['refresh_token'])) {
            $refreshToken = $data['refresh_token'];
        } else {
            $refreshToken = JWTAuth::getTokenFromHeaders();
        }
        
        if (!$refreshToken) {
            throw new Exception('Refresh token no proporcionado', 401);
        }
        
        $newTokens = JWTAuth::refreshToken($refreshToken);
        
        // Obtener información del usuario para incluir en la respuesta
        $payload = JWTAuth::verifyToken($newTokens['access_token']);
        $db = getDB();
        $user = $db->fetchOne(
            "SELECT id, nombre, email, avatar FROM usuarios WHERE id = ?",
            [$payload['user_id']]
        );
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Token refrescado exitosamente',
            'data' => [
                'user' => [
                    'id' => $user['id'],
                    'nombre' => $user['nombre'],
                    'email' => $user['email'],
                    'avatar' => $user['avatar']
                ],
                'tokens' => $newTokens
            ]
        ]);
    }
    
} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    
    // Log del error
    error_log("Auth {$action} Error [{$statusCode}]: " . $e->getMessage());
    
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => strtoupper($action) . '_ERROR'
    ]);
}
?>