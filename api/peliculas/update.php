<?php
/**
 * Butaca10 - Actualizar Película
 * PUT /api/peliculas/update.php
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
    
    // Validar ID de la película
    if (!isset($data['id']) || empty($data['id'])) {
        throw new Exception('ID de la película es requerido', 400);
    }
    
    $peliculaId = (int)$data['id'];
    
    $db = getDB();
    
    // Verificar que la película existe y el usuario tiene permisos
    $peliculaActual = $db->fetchOne(
        "SELECT p.*, b.nombre as nombre_banco
         FROM peliculas p
         JOIN bancos b ON p.id_banco = b.id
         WHERE p.id = ? AND b.id_usuario = ?",
        [$peliculaId, $userId]
    );
    
    if (!$peliculaActual) {
        throw new Exception('Película no encontrada o no tienes permisos para editarla', 404);
    }
    
    // Preparar campos a actualizar
    $camposActualizar = [];
    $parametros = [];
    $cambios = [];
    
    // Campos actualizables
    $camposPermitidos = [
        'titulo' => ['max_length' => 255, 'required' => false],
        'titulo_original' => ['max_length' => 255, 'required' => false],
        'resumen' => ['max_length' => 2000, 'required' => false],
        'fecha_estreno' => ['format' => 'date', 'required' => false],
        'poster' => ['max_length' => 500, 'required' => false],
        'backdrop' => ['max_length' => 500, 'required' => false],
        'calificacion' => ['type' => 'float', 'min' => 0, 'max' => 10, 'required' => false],
        'duracion' => ['type' => 'int', 'min' => 0, 'required' => false],
        'idioma' => ['max_length' => 10, 'required' => false],
        'director' => ['max_length' => 255, 'required' => false],
        'notas' => ['max_length' => 1000, 'required' => false]
    ];
    
    // Validar y procesar campos
    foreach ($camposPermitidos as $campo => $reglas) {
        if (!isset($data[$campo])) {
            continue;
        }
        
        $valor = $data[$campo];
        $valorActual = $peliculaActual[$campo];
        
        // Permitir valores null para campos opcionales
        if ($valor === null || $valor === '') {
            $valor = null;
        } else {
            $valor = is_string($valor) ? trim($valor) : $valor;
        }
        
        // Validaciones específicas
        if (isset($reglas['max_length']) && $valor && strlen($valor) > $reglas['max_length']) {
            throw new Exception("El campo '{$campo}' no puede exceder {$reglas['max_length']} caracteres", 400);
        }
        
        if (isset($reglas['format']) && $reglas['format'] === 'date' && $valor) {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $valor)) {
                throw new Exception("Formato de fecha inválido para '{$campo}'. Use YYYY-MM-DD", 400);
            }
        }
        
        if (isset($reglas['type']) && $reglas['type'] === 'float' && $valor !== null) {
            $valor = (float)$valor;
            if (isset($reglas['min']) && $valor < $reglas['min']) {
                throw new Exception("El campo '{$campo}' debe ser mayor o igual a {$reglas['min']}", 400);
            }
            if (isset($reglas['max']) && $valor > $reglas['max']) {
                throw new Exception("El campo '{$campo}' debe ser menor o igual a {$reglas['max']}", 400);
            }
        }
        
        if (isset($reglas['type']) && $reglas['type'] === 'int' && $valor !== null) {
            $valor = (int)$valor;
            if (isset($reglas['min']) && $valor < $reglas['min']) {
                throw new Exception("El campo '{$campo}' debe ser mayor o igual a {$reglas['min']}", 400);
            }
        }
        
        // Solo agregar si el valor es diferente
        if ($valor !== $valorActual) {
            $camposActualizar[] = "{$campo} = ?";
            $parametros[] = $valor;
            $cambios[$campo] = ['anterior' => $valorActual, 'nuevo' => $valor];
        }
    }
    
    // Manejar campos especiales de arrays (géneros y actores)
    if (isset($data['generos'])) {
        $nuevosGeneros = is_array($data['generos']) ? json_encode($data['generos']) : null;
        $generosActuales = $peliculaActual['generos'];
        
        if ($nuevosGeneros !== $generosActuales) {
            $camposActualizar[] = "generos = ?";
            $parametros[] = $nuevosGeneros;
            $cambios['generos'] = [
                'anterior' => $generosActuales ? json_decode($generosActuales, true) : [],
                'nuevo' => $data['generos']
            ];
        }
    }
    
    if (isset($data['actores'])) {
        $nuevosActores = is_array($data['actores']) ? json_encode($data['actores']) : null;
        $actoresActuales = $peliculaActual['actores'];
        
        if ($nuevosActores !== $actoresActuales) {
            $camposActualizar[] = "actores = ?"; 
            $parametros[] = $nuevosActores;
            $cambios['actores'] = [
                'anterior' => $actoresActuales ? json_decode($actoresActuales, true) : [],
                'nuevo' => $data['actores']
            ];
        }
    }
    
    // Verificar si hay cambios para realizar
    if (empty($camposActualizar)) {
        throw new Exception('No se proporcionaron cambios para actualizar', 400);
    }
    
    // Actualizar película
    $sql = "UPDATE peliculas SET " . implode(', ', $camposActualizar) . " WHERE id = ?";
    $parametros[] = $peliculaId;
    
    $db->execute($sql, $parametros);
    
    // Obtener película actualizada
    $peliculaActualizada = $db->fetchOne(
        "SELECT p.*, b.nombre as nombre_banco
         FROM peliculas p
         JOIN bancos b ON p.id_banco = b.id
         WHERE p.id = ?",
        [$peliculaId]
    );
    
    // Formatear respuesta
    $peliculaFormateada = [
        'id' => (int)$peliculaActualizada['id'],
        'id_banco' => (int)$peliculaActualizada['id_banco'],
        'nombre_banco' => $peliculaActualizada['nombre_banco'],
        'tmdb_id' => (int)$peliculaActualizada['tmdb_id'],
        'titulo' => $peliculaActualizada['titulo'],
        'titulo_original' => $peliculaActualizada['titulo_original'],
        'resumen' => $peliculaActualizada['resumen'],
        'fecha_estreno' => $peliculaActualizada['fecha_estreno'],
        'poster' => $peliculaActualizada['poster'],
        'backdrop' => $peliculaActualizada['backdrop'],
        'generos' => $peliculaActualizada['generos'] ? json_decode($peliculaActualizada['generos'], true) : [],
        'calificacion' => $peliculaActualizada['calificacion'] ? (float)$peliculaActualizada['calificacion'] : null,
        'duracion' => $peliculaActualizada['duracion'] ? (int)$peliculaActualizada['duracion'] : null,
        'idioma' => $peliculaActualizada['idioma'],
        'director' => $peliculaActualizada['director'],
        'actores' => $peliculaActualizada['actores'] ? json_decode($peliculaActualizada['actores'], true) : [],
        'notas' => $peliculaActualizada['notas'],
        'fecha_agregada' => $peliculaActualizada['fecha_agregada']
    ];
    
    // Registrar cambios en historial
    $db->execute(
        "INSERT INTO historial (id_usuario, tipo_accion, detalles, ip_cliente, user_agent) 
         VALUES (?, 'pelicula_updated', ?, ?, ?)",
        [
            $userId,
            json_encode([
                'pelicula_id' => $peliculaId,
                'titulo' => $peliculaActualizada['titulo'],
                'cambios' => $cambios
            ]),
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]
    );
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Película actualizada exitosamente',
        'data' => [
            'pelicula' => $peliculaFormateada,
            'cambios_realizados' => $cambios
        ]
    ]);
    
} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    
    // Log del error
    error_log("Update Pelicula Error [{$statusCode}]: " . $e->getMessage());
    
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'UPDATE_PELICULA_ERROR'
    ]);
}
?>