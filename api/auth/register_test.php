<?php
/**
 * Test simple de registro
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

try {
    // Obtener datos JSON del body
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON inválido', 400);
    }
    
    // Log para debug
    error_log("Register attempt: " . json_encode($data));
    
    // Respuesta temporal de éxito
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Registro procesado (modo test)',
        'data' => [
            'received' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Register error: " . $e->getMessage());
    
    http_response_code($e->getCode() ?: 500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'REGISTER_TEST_ERROR'
    ]);
}
?>