<?php
/**
 * Butaca10 - Login de Usuario
 * POST /api/auth/login.php
 */

// Headers CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

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
    // Obtener datos JSON del body
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON inválido', 400);
    }
    
    // Validar campos requeridos
    if (!isset($data['email']) || !isset($data['password'])) {
        throw new Exception('Email y contraseña son requeridos', 400);
    }
    
    $email = trim(strtolower($data['email']));
    $password = $data['password'];
    
    if (empty($email) || empty($password)) {
        throw new Exception('Email y contraseña no pueden estar vacíos', 400);
    }
    
    // Validar formato de email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Formato de email inválido', 400);
    }
    
    // Verificar límite de intentos de login por IP (prevención de fuerza bruta)
    $clientIP = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $db = getDB();
    
    // Contar intentos fallidos en la última hora
    $intentosFallidos = $db->fetchOne(
        "SELECT COUNT(*) as count FROM historial 
         WHERE tipo_accion = 'login_failed' 
         AND ip_cliente = ? 
         AND fecha_accion > DATE_SUB(NOW(), INTERVAL 1 HOUR)",
        [$clientIP]
    );
    
    if ($intentosFallidos && $intentosFallidos['count'] >= 10) {
        throw new Exception('Demasiados intentos fallidos. Intente más tarde.', 429);
    }
    
    // Buscar usuario por email
    $user = $db->fetchOne(
        "SELECT id, nombre, email, password, avatar, activo, fecha_ultimo_acceso 
         FROM usuarios WHERE email = ?",
        [$email]
    );
    
    if (!$user) {
        // Registrar intento fallido
        $db->execute(
            "INSERT INTO historial (tipo_accion, detalles, ip_cliente, user_agent) 
             VALUES ('login_failed', ?, ?, ?)",
            [
                json_encode(['email' => $email, 'reason' => 'user_not_found']),
                $clientIP,
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]
        );
        
        throw new Exception('Credenciales inválidas', 401);
    }
    
    // Verificar si el usuario está activo
    if (!$user['activo']) {
        throw new Exception('Cuenta desactivada. Contacte al administrador.', 403);
    }
    
    // Verificar contraseña
    if (!password_verify($password, $user['password'])) {
        // Registrar intento fallido
        $db->execute(
            "INSERT INTO historial (id_usuario, tipo_accion, detalles, ip_cliente, user_agent) 
             VALUES (?, 'login_failed', ?, ?, ?)",
            [
                $user['id'],
                json_encode(['email' => $email, 'reason' => 'invalid_password']),
                $clientIP,
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]
        );
        
        throw new Exception('Credenciales inválidas', 401);
    }
    
    // Login exitoso - actualizar último acceso
    $db->execute(
        "UPDATE usuarios SET fecha_ultimo_acceso = NOW(), ip_ultimo_acceso = ? WHERE id = ?",
        [$clientIP, $user['id']]
    );
    
    // Registrar login exitoso
    $db->execute(
        "INSERT INTO historial (id_usuario, tipo_accion, detalles, ip_cliente, user_agent) 
         VALUES (?, 'login_success', ?, ?, ?)",
        [
            $user['id'],
            json_encode(['email' => $email]),
            $clientIP,
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]
    );
    
    // Limpiar tokens expirados del usuario
    JWTAuth::cleanupExpiredTokens();
    
    // Generar nuevos tokens JWT
    $userData = [
        'nombre' => $user['nombre'],
        'email' => $user['email'],
        'avatar' => $user['avatar']
    ];
    
    $accessToken = JWTAuth::generateToken($user['id'], $userData, 'access');
    $refreshToken = JWTAuth::generateToken($user['id'], $userData, 'refresh');
    
    // Obtener estadísticas del usuario
    $stats = $db->fetchOne(
        "SELECT 
            (SELECT COUNT(*) FROM bancos WHERE id_usuario = ?) as total_bancos,
            (SELECT COUNT(*) FROM peliculas p 
             JOIN bancos b ON p.id_banco = b.id 
             WHERE b.id_usuario = ?) as total_peliculas",
        [$user['id'], $user['id']]
    );
    
    // Respuesta exitosa
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Login exitoso',
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
            'tokens' => [
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken,
                'expires_in' => (int)($_ENV['JWT_EXPIRE'] ?? 86400)
            ]
        ]
    ]);
    
} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    
    // Log del error
    error_log("Login Error [{$statusCode}]: " . $e->getMessage() . " - Email: " . ($email ?? 'unknown'));
    
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'LOGIN_ERROR'
    ]);
}
?>