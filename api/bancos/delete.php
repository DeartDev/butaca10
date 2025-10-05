<?php
/**
 * Butaca10 - Eliminar Banco de Películas
 * DELETE /api/bancos/delete.php
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
    
    // Obtener ID del banco a eliminar
    $bancoId = null;
    
    // Intentar obtener de diferentes fuentes
    if (isset($_GET['id'])) {
        $bancoId = (int)$_GET['id'];
    } else {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if ($data && isset($data['id'])) {
            $bancoId = (int)$data['id'];
        }
    }
    
    if (!$bancoId) {
        throw new Exception('ID del banco es requerido', 400);
    }
    
    $db = getDB();
    
    // Verificar que el banco existe y pertenece al usuario
    $banco = $db->fetchOne(
        "SELECT id, nombre, 
                (SELECT COUNT(*) FROM peliculas WHERE id_banco = ?) as total_peliculas
         FROM bancos 
         WHERE id = ? AND id_usuario = ?",
        [$bancoId, $bancoId, $userId]
    );
    
    if (!$banco) {
        throw new Exception('Banco no encontrado o no tienes permisos para eliminarlo', 404);
    }
    
    // Verificar si es el último banco del usuario
    $totalBancos = $db->fetchOne(
        "SELECT COUNT(*) as count FROM bancos WHERE id_usuario = ?",
        [$userId]
    );
    
    if ($totalBancos && $totalBancos['count'] <= 1) {
        throw new Exception('No puedes eliminar tu último banco. Debes tener al menos uno.', 400);
    }
    
    // Obtener datos adicionales para el historial
    $peliculasInfo = [];
    if ($banco['total_peliculas'] > 0) {
        $peliculas = $db->fetchAll(
            "SELECT tmdb_id, titulo FROM peliculas WHERE id_banco = ?",
            [$bancoId]
        );
        $peliculasInfo = array_map(function($p) {
            return ['tmdb_id' => $p['tmdb_id'], 'titulo' => $p['titulo']];
        }, $peliculas);
    }
    
    // Iniciar transacción para eliminar el banco y sus películas
    $db->beginTransaction();
    
    try {
        // Eliminar todas las películas del banco
        if ($banco['total_peliculas'] > 0) {
            $db->execute("DELETE FROM peliculas WHERE id_banco = ?", [$bancoId]);
        }
        
        // Eliminar el banco
        $db->execute("DELETE FROM bancos WHERE id = ?", [$bancoId]);
        
        // Registrar en historial
        $db->execute(
            "INSERT INTO historial (id_usuario, tipo_accion, detalles, ip_cliente, user_agent) 
             VALUES (?, 'banco_deleted', ?, ?, ?)",
            [
                $userId,
                json_encode([
                    'banco_id' => $bancoId,
                    'nombre' => $banco['nombre'],
                    'total_peliculas' => $banco['total_peliculas'],
                    'peliculas' => $peliculasInfo
                ]),
                $_SERVER['REMOTE_ADDR'] ?? '',
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]
        );
        
        $db->commit();
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Banco eliminado exitosamente',
            'data' => [
                'banco_eliminado' => [
                    'id' => $bancoId,
                    'nombre' => $banco['nombre'],
                    'peliculas_eliminadas' => (int)$banco['total_peliculas']
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
    error_log("Delete Banco Error [{$statusCode}]: " . $e->getMessage());
    
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'DELETE_BANCO_ERROR'
    ]);
}
?>