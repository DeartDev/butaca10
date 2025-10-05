<?php
/**
 * Butaca10 - Registro de Usuario
 * POST /api/auth/register.php
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
    $requiredFields = ['nombre', 'email', 'password'];
    $errors = [];
    
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty(trim($data[$field]))) {
            $errors[] = "El campo '{$field}' es requerido";
        }
    }
    
    if (!empty($errors)) {
        throw new Exception(implode(', ', $errors), 400);
    }
    
    // Sanitizar y validar datos
    $nombre = trim($data['nombre']);
    $email = trim(strtolower($data['email']));
    $password = $data['password'];
    $avatar = isset($data['avatar']) ? trim($data['avatar']) : null;
    
    // Validaciones específicas
    if (strlen($nombre) < 2 || strlen($nombre) > 100) {
        throw new Exception('El nombre debe tener entre 2 y 100 caracteres', 400);
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Email inválido', 400);
    }
    
    if (strlen($password) < 6) {
        throw new Exception('La contraseña debe tener al menos 6 caracteres', 400);
    }
    
    // Verificar si el email ya existe
    $db = getDB();
    
    $existingUser = $db->fetchOne(
        "SELECT id FROM usuarios WHERE email = ?",
        [$email]
    );
    
    if ($existingUser) {
        throw new Exception('El email ya está registrado', 409);
    }
    
    // Verificar límite de registros por IP (prevención de spam)
    $clientIP = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $registrosRecientes = $db->fetchOne(
        "SELECT COUNT(*) as count FROM usuarios 
         WHERE ip_registro = ? AND fecha_registro > DATE_SUB(NOW(), INTERVAL 1 HOUR)",
        [$clientIP]
    );
    
    if ($registrosRecientes && $registrosRecientes['count'] >= 3) {
        throw new Exception('Demasiados registros desde esta IP. Intente más tarde.', 429);
    }
    
    // Encriptar contraseña
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Generar avatar por defecto si no se proporciona
    if (empty($avatar)) {
        $avatar = "https://ui-avatars.com/api/?name=" . urlencode($nombre) . "&background=667eea&color=fff&size=200";
    }
    
    // Iniciar transacción
    $db->beginTransaction();
    
    try {
        // Insertar usuario
        $sql = "INSERT INTO usuarios (nombre, email, password, avatar, ip_registro) 
                VALUES (?, ?, ?, ?, ?)";
        
        $db->execute($sql, [
            $nombre,
            $email,
            $hashedPassword,
            $avatar,
            $clientIP
        ]);
        
        $userId = $db->lastInsertId();
        
        // Crear banco predeterminado
        $sqlBanco = "INSERT INTO bancos (id_usuario, nombre, descripcion) 
                     VALUES (?, 'Mi Primera Lista', 'Lista de películas por defecto')";
        
        $db->execute($sqlBanco, [$userId]);
        
        $db->commit();
        
        // Generar tokens JWT
        $userData = [
            'nombre' => $nombre,
            'email' => $email,
            'avatar' => $avatar
        ];
        
        $accessToken = JWTAuth::generateToken($userId, $userData, 'access');
        $refreshToken = JWTAuth::generateToken($userId, $userData, 'refresh');
        
        // Respuesta exitosa
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Usuario registrado exitosamente',
            'data' => [
                'user' => [
                    'id' => $userId,
                    'nombre' => $nombre,
                    'email' => $email,
                    'avatar' => $avatar,
                    'fecha_registro' => date('Y-m-d H:i:s')
                ],
                'tokens' => [
                    'access_token' => $accessToken,
                    'refresh_token' => $refreshToken,
                    'expires_in' => (int)($_ENV['JWT_EXPIRE'] ?? 86400)
                ]
            ]
        ]);
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    
    // Log del error
    error_log("Register Error [{$statusCode}]: " . $e->getMessage() . " - " . json_encode($data ?? []));
    
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'REGISTER_ERROR'
    ]);
}
?>