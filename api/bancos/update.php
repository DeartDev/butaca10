<?php
/**
 * Butaca10 - Actualizar Banco de Películas
 * PUT /api/bancos/update.php
 */

// Headers CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Auth-Token');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Permitir PUT o POST (para compatibilidad)
if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'POST'])) {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Use PUT o POST.',
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
    
    // Validar ID del banco
    if (!isset($data['id']) || empty($data['id'])) {
        throw new Exception('ID del banco es requerido', 400);
    }
    
    $bancoId = (int)$data['id'];
    
    $db = getDB();
    
    // Verificar que el banco existe y pertenece al usuario
    $bancoActual = $db->fetchOne(
        "SELECT id, nombre, descripcion FROM bancos WHERE id = ? AND id_usuario = ?",
        [$bancoId, $userId]
    );
    
    if (!$bancoActual) {
        throw new Exception('Banco no encontrado o no tienes permisos para editarlo', 404);
    }
    
    // Preparar campos a actualizar
    $camposActualizar = [];
    $parametros = [];
    $cambios = [];
    
    // Validar y procesar nombre
    if (isset($data['nombre'])) {
        $nuevoNombre = trim($data['nombre']);
        
        if (empty($nuevoNombre)) {
            throw new Exception('El nombre del banco no puede estar vacío', 400);
        }
        
        if (strlen($nuevoNombre) < 2 || strlen($nuevoNombre) > 100) {
            throw new Exception('El nombre debe tener entre 2 y 100 caracteres', 400);
        }
        
        // Verificar que no exista otro banco con el mismo nombre para este usuario
        if ($nuevoNombre !== $bancoActual['nombre']) {
            $existingBanco = $db->fetchOne(
                "SELECT id FROM bancos WHERE id_usuario = ? AND nombre = ? AND id != ?",
                [$userId, $nuevoNombre, $bancoId]
            );
            
            if ($existingBanco) {
                throw new Exception('Ya tienes un banco con ese nombre', 409);
            }
            
            $camposActualizar[] = "nombre = ?";
            $parametros[] = $nuevoNombre;
            $cambios['nombre'] = ['anterior' => $bancoActual['nombre'], 'nuevo' => $nuevoNombre];
        }
    }
    
    // Validar y procesar descripción
    if (isset($data['descripcion'])) {
        $nuevaDescripcion = $data['descripcion'] ? trim($data['descripcion']) : null;
        
        if ($nuevaDescripcion && strlen($nuevaDescripcion) > 500) {
            throw new Exception('La descripción no puede exceder 500 caracteres', 400);
        }
        
        if ($nuevaDescripcion !== $bancoActual['descripcion']) {
            $camposActualizar[] = "descripcion = ?";
            $parametros[] = $nuevaDescripcion;
            $cambios['descripcion'] = [
                'anterior' => $bancoActual['descripcion'], 
                'nuevo' => $nuevaDescripcion
            ];
        }
    }
    
    // Verificar si hay cambios para realizar
    if (empty($camposActualizar)) {
        throw new Exception('No se proporcionaron cambios para actualizar', 400);
    }
    
    // Actualizar banco
    $sql = "UPDATE bancos SET " . implode(', ', $camposActualizar) . " WHERE id = ?";
    $parametros[] = $bancoId;
    
    $db->execute($sql, $parametros);
    
    // Obtener banco actualizado con información completa
    $bancoActualizado = $db->fetchOne(
        "SELECT b.id, b.nombre, b.descripcion, b.fecha_creacion,
                COUNT(p.id) as total_peliculas,
                MAX(p.fecha_agregada) as ultima_pelicula
         FROM bancos b
         LEFT JOIN peliculas p ON b.id = p.id_banco
         WHERE b.id = ?
         GROUP BY b.id, b.nombre, b.descripcion, b.fecha_creacion",
        [$bancoId]
    );
    
    // Registrar cambios en historial
    $db->execute(
        "INSERT INTO historial (id_usuario, tipo_accion, detalles, ip_cliente, user_agent) 
         VALUES (?, 'banco_updated', ?, ?, ?)",
        [
            $userId,
            json_encode([
                'banco_id' => $bancoId,
                'cambios' => $cambios
            ]),
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]
    );
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Banco actualizado exitosamente',
        'data' => [
            'banco' => [
                'id' => (int)$bancoActualizado['id'],
                'nombre' => $bancoActualizado['nombre'],
                'descripcion' => $bancoActualizado['descripcion'],
                'fecha_creacion' => $bancoActualizado['fecha_creacion'],
                'total_peliculas' => (int)$bancoActualizado['total_peliculas'],
                'ultima_pelicula' => $bancoActualizado['ultima_pelicula']
            ],
            'cambios_realizados' => $cambios
        ]
    ]);
    
} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    
    // Log del error
    error_log("Update Banco Error [{$statusCode}]: " . $e->getMessage());
    
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'UPDATE_BANCO_ERROR'
    ]);
}
?>