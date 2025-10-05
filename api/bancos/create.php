<?php
/**
 * Butaca10 - Crear Banco de Películas
 * POST /api/bancos/create.php
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
    // Verificar autenticación
    $user = requireAuth();
    $userId = getCurrentUserId();
    
    // Obtener datos JSON del body
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON inválido', 400);
    }
    
    // Validar campos requeridos
    if (!isset($data['nombre']) || empty(trim($data['nombre']))) {
        throw new Exception('El nombre del banco es requerido', 400);
    }
    
    $nombre = trim($data['nombre']);
    $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : null;
    
    // Validaciones
    if (strlen($nombre) < 2 || strlen($nombre) > 100) {
        throw new Exception('El nombre debe tener entre 2 y 100 caracteres', 400);
    }
    
    if ($descripcion && strlen($descripcion) > 500) {
        throw new Exception('La descripción no puede exceder 500 caracteres', 400);
    }
    
    $db = getDB();
    
    // Verificar límite de bancos por usuario
    $bancosCount = $db->fetchOne(
        "SELECT COUNT(*) as count FROM bancos WHERE id_usuario = ?",
        [$userId]
    );
    
    $maxBancos = (int)($_ENV['MAX_BANCOS_POR_USUARIO'] ?? 10);
    if ($bancosCount && $bancosCount['count'] >= $maxBancos) {
        throw new Exception("No puedes crear más de {$maxBancos} bancos", 400);
    }
    
    // Verificar que no exista un banco con el mismo nombre para este usuario
    $existingBanco = $db->fetchOne(
        "SELECT id FROM bancos WHERE id_usuario = ? AND nombre = ?",
        [$userId, $nombre]
    );
    
    if ($existingBanco) {
        throw new Exception('Ya tienes un banco con ese nombre', 409);
    }
    
    // Crear el banco
    $sql = "INSERT INTO bancos (id_usuario, nombre, descripcion) VALUES (?, ?, ?)";
    $db->execute($sql, [$userId, $nombre, $descripcion]);
    
    $bancoId = $db->lastInsertId();
    
    // Obtener el banco creado con información completa
    $nuevoBanco = $db->fetchOne(
        "SELECT id, nombre, descripcion, fecha_creacion,
                (SELECT COUNT(*) FROM peliculas WHERE id_banco = ?) as total_peliculas
         FROM bancos WHERE id = ?",
        [$bancoId, $bancoId]
    );
    
    // Registrar en historial
    $db->execute(
        "INSERT INTO historial (id_usuario, tipo_accion, detalles, ip_cliente, user_agent) 
         VALUES (?, 'banco_created', ?, ?, ?)",
        [
            $userId,
            json_encode(['banco_id' => $bancoId, 'nombre' => $nombre]),
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]
    );
    
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Banco creado exitosamente',
        'data' => [
            'banco' => [
                'id' => (int)$nuevoBanco['id'],
                'nombre' => $nuevoBanco['nombre'],
                'descripcion' => $nuevoBanco['descripcion'],
                'fecha_creacion' => $nuevoBanco['fecha_creacion'],
                'total_peliculas' => (int)$nuevoBanco['total_peliculas']
            ]
        ]
    ]);
    
} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    
    // Log del error
    error_log("Create Banco Error [{$statusCode}]: " . $e->getMessage());
    
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'CREATE_BANCO_ERROR'
    ]);
}
?>