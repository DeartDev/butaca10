<?php
/**
 * Butaca10 - Logout de Usuario
 * POST /api/auth/logout.php
 */

// Headers CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Auth-Token');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Solo permitir método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Use POST.',
        'error_code' => 'METHOD_NOT_ALLOWED'
    ]);
    exit;
}

// Incluir dependencias
require_once '../database.php';
require_once '../jwt.php';

try {
    // Obtener token del usuario actual
    $token = JWTAuth::getTokenFromHeaders();
    
    if (!$token) {
        throw new Exception('Token no proporcionado', 401);
    }
    
    // Verificar token y obtener información del usuario
    $payload = JWTAuth::verifyToken($token);
    $userId = $payload['user_id'];
    
    // Obtener datos del body para determinar tipo de logout
    $input = file_get_contents('php://input');
    $data = json_decode($input, true) ?: [];
    
    $logoutAll = isset($data['logout_all']) && $data['logout_all'];
    
    if ($logoutAll) {
        // Revocar todos los tokens del usuario
        JWTAuth::revokeAllUserTokens($userId);
        $message = 'Logout exitoso de todas las sesiones';
        $actionType = 'logout_all';
    } else {
        // Revocar solo el token actual
        JWTAuth::revokeToken($token);
        $message = 'Logout exitoso';
        $actionType = 'logout';
        
        // Si se proporciona refresh token, también revocarlo
        if (isset($data['refresh_token'])) {
            JWTAuth::revokeToken($data['refresh_token']);
        }
    }
    
    // Registrar logout en historial
    $db = getDB();
    $db->execute(
        "INSERT INTO historial (id_usuario, tipo_accion, detalles, ip_cliente, user_agent) 
         VALUES (?, ?, ?, ?, ?)",
        [
            $userId,
            $actionType,
            json_encode(['logout_all' => $logoutAll]),
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]
    );
    
    // Limpiar tokens expirados (mantenimiento)
    JWTAuth::cleanupExpiredTokens();
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => [
            'logout_all' => $logoutAll,
            'timestamp' => time()
        ]
    ]);
    
} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    
    // Log del error
    error_log("Logout Error [{$statusCode}]: " . $e->getMessage());
    
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'LOGOUT_ERROR'
    ]);
}
?>