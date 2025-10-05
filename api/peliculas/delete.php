<?php
/**
 * Butaca10 - Eliminar Película
 * DELETE /api/peliculas/delete.php
 */

// Headers CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Auth-Token');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Permitir DELETE o POST (para compatibilidad)
if (!in_array($_SERVER['REQUEST_METHOD'], ['DELETE', 'POST'])) {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Use DELETE o POST.',
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
    
    // Obtener ID de la película a eliminar
    $peliculaId = null;
    
    // Intentar obtener de diferentes fuentes
    if (isset($_GET['id'])) {
        $peliculaId = (int)$_GET['id'];
    } else {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if ($data && isset($data['id'])) {
            $peliculaId = (int)$data['id'];
        }
    }
    
    if (!$peliculaId) {
        throw new Exception('ID de la película es requerido', 400);
    }
    
    $db = getDB();
    
    // Verificar que la película existe y el usuario tiene permisos
    $pelicula = $db->fetchOne(
        "SELECT p.id, p.titulo, p.tmdb_id, p.id_banco, b.nombre as nombre_banco
         FROM peliculas p
         JOIN bancos b ON p.id_banco = b.id
         WHERE p.id = ? AND b.id_usuario = ?",
        [$peliculaId, $userId]
    );
    
    if (!$pelicula) {
        throw new Exception('Película no encontrada o no tienes permisos para eliminarla', 404);
    }
    
    // Eliminar la película
    $db->execute("DELETE FROM peliculas WHERE id = ?", [$peliculaId]);
    
    // Registrar eliminación en historial
    $db->execute(
        "INSERT INTO historial (id_usuario, tipo_accion, detalles, ip_cliente, user_agent) 
         VALUES (?, 'pelicula_deleted', ?, ?, ?)",
        [
            $userId,
            json_encode([
                'pelicula_id' => $peliculaId,
                'banco_id' => $pelicula['id_banco'],
                'banco_nombre' => $pelicula['nombre_banco'],
                'tmdb_id' => $pelicula['tmdb_id'],
                'titulo' => $pelicula['titulo']
            ]),
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]
    );
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Película eliminada exitosamente',
        'data' => [
            'pelicula_eliminada' => [
                'id' => $peliculaId,
                'titulo' => $pelicula['titulo'],
                'banco' => $pelicula['nombre_banco']
            ]
        ]
    ]);
    
} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    
    // Log del error
    error_log("Delete Pelicula Error [{$statusCode}]: " . $e->getMessage());
    
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'DELETE_PELICULA_ERROR'
    ]);
}
?>