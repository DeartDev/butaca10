<?php
/**
 * Butaca10 - Registro Simplificado
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
        'message' => 'Método no permitido. Use POST.'
    ]);
    exit;
}

try {
    // Incluir base de datos simplificada
    require_once '../database_simple.php';
    
    // Obtener datos JSON del body
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON inválido', 400);
    }
    
    // Validar campos requeridos
    if (empty($data['nombre']) || empty($data['email']) || empty($data['password'])) {
        throw new Exception('Nombre, email y contraseña son requeridos', 400);
    }
    
    $nombre = trim($data['nombre']);
    $email = trim(strtolower($data['email']));
    $password = $data['password'];
    
    // Validaciones básicas
    if (strlen($nombre) < 2) {
        throw new Exception('El nombre debe tener al menos 2 caracteres', 400);
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Email inválido', 400);
    }
    
    if (strlen($password) < 6) {
        throw new Exception('La contraseña debe tener al menos 6 caracteres', 400);
    }
    
    $db = getDB();
    
    // Verificar si el email ya existe
    $existingUser = $db->fetchOne("SELECT id FROM usuarios WHERE email = ?", [$email]);
    
    if ($existingUser) {
        throw new Exception('El email ya está registrado', 409);
    }
    
    // Crear usuario
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $avatar = "https://ui-avatars.com/api/?name=" . urlencode($nombre) . "&background=667eea&color=fff&size=200";
    
    $db->execute(
        "INSERT INTO usuarios (nombre, email, password, avatar) VALUES (?, ?, ?, ?)",
        [$nombre, $email, $hashedPassword, $avatar]
    );
    
    $userId = $db->lastInsertId();
    
    // Crear banco por defecto
    $db->execute(
        "INSERT INTO bancos (id_usuario, nombre, descripcion) VALUES (?, 'Mi Primera Lista', 'Lista de películas por defecto')",
        [$userId]
    );
    
    // Respuesta exitosa (sin JWT por ahora)
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Usuario registrado exitosamente',
        'data' => [
            'user' => [
                'id' => $userId,
                'nombre' => $nombre,
                'email' => $email,
                'avatar' => $avatar
            ],
            'tokens' => [
                'access_token' => 'temp_token_' . $userId,
                'refresh_token' => 'temp_refresh_' . $userId
            ]
        ]
    ]);
    
} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    
    error_log("Register error: " . $e->getMessage());
    
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>