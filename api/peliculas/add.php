<?php
/**
 * Butaca10 - Agregar Película a Banco
 * POST /api/peliculas/add.php
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
    $requiredFields = ['id_banco', 'tmdb_id', 'titulo'];
    $errors = [];
    
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && empty(trim($data[$field])))) {
            $errors[] = "El campo '{$field}' es requerido";
        }
    }
    
    if (!empty($errors)) {
        throw new Exception(implode(', ', $errors), 400);
    }
    
    // Extraer y validar datos
    $bancoId = (int)$data['id_banco'];
    $tmdbId = (int)$data['tmdb_id'];
    $titulo = trim($data['titulo']);
    
    // Campos opcionales
    $tituloOriginal = isset($data['titulo_original']) ? trim($data['titulo_original']) : null;
    $resumen = isset($data['resumen']) ? trim($data['resumen']) : null;
    $fechaEstreno = isset($data['fecha_estreno']) ? $data['fecha_estreno'] : null;
    $poster = isset($data['poster']) ? trim($data['poster']) : null;
    $backdrop = isset($data['backdrop']) ? trim($data['backdrop']) : null;
    $generos = isset($data['generos']) ? $data['generos'] : [];
    $calificacion = isset($data['calificacion']) ? (float)$data['calificacion'] : null;
    $duracion = isset($data['duracion']) ? (int)$data['duracion'] : null;
    $idioma = isset($data['idioma']) ? trim($data['idioma']) : null;
    $director = isset($data['director']) ? trim($data['director']) : null;
    $actores = isset($data['actores']) ? $data['actores'] : [];
    $notas = isset($data['notas']) ? trim($data['notas']) : null;
    
    // Validaciones específicas
    if ($tmdbId <= 0) {
        throw new Exception('ID de TMDB inválido', 400);
    }
    
    if (strlen($titulo) < 1 || strlen($titulo) > 255) {
        throw new Exception('El título debe tener entre 1 y 255 caracteres', 400);
    }
    
    if ($tituloOriginal && strlen($tituloOriginal) > 255) {
        throw new Exception('El título original no puede exceder 255 caracteres', 400);
    }
    
    if ($resumen && strlen($resumen) > 2000) {
        throw new Exception('El resumen no puede exceder 2000 caracteres', 400);
    }
    
    if ($fechaEstreno && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaEstreno)) {
        throw new Exception('Formato de fecha de estreno inválido. Use YYYY-MM-DD', 400);
    }
    
    if ($calificacion !== null && ($calificacion < 0 || $calificacion > 10)) {
        throw new Exception('La calificación debe estar entre 0 y 10', 400);
    }
    
    if ($duracion !== null && $duracion < 0) {
        throw new Exception('La duración no puede ser negativa', 400);
    }
    
    if ($notas && strlen($notas) > 1000) {
        throw new Exception('Las notas no pueden exceder 1000 caracteres', 400);
    }
    
    $db = getDB();
    
    // Verificar que el banco existe y pertenece al usuario
    $banco = $db->fetchOne(
        "SELECT id, nombre FROM bancos WHERE id = ? AND id_usuario = ?",
        [$bancoId, $userId]
    );
    
    if (!$banco) {
        throw new Exception('Banco no encontrado o no tienes permisos para agregarlo', 404);
    }
    
    // Verificar límite de películas por banco
    $peliculasCount = $db->fetchOne(
        "SELECT COUNT(*) as count FROM peliculas WHERE id_banco = ?",
        [$bancoId]
    );
    
    $maxPeliculas = (int)($_ENV['MAX_PELICULAS_POR_BANCO'] ?? 500);
    if ($peliculasCount && $peliculasCount['count'] >= $maxPeliculas) {
        throw new Exception("No puedes agregar más de {$maxPeliculas} películas a este banco", 400);
    }
    
    // Verificar que la película no esté ya en el banco
    $existingPelicula = $db->fetchOne(
        "SELECT id FROM peliculas WHERE id_banco = ? AND tmdb_id = ?",
        [$bancoId, $tmdbId]
    );
    
    if ($existingPelicula) {
        throw new Exception('Esta película ya está en el banco', 409);
    }
    
    // Procesar géneros (convertir array a JSON)
    $generosJson = !empty($generos) ? json_encode($generos) : null;
    
    // Procesar actores (convertir array a JSON)
    $actoresJson = !empty($actores) ? json_encode($actores) : null;
    
    // Insertar película
    $sql = "INSERT INTO peliculas (
                id_banco, tmdb_id, titulo, titulo_original, resumen, 
                fecha_estreno, poster, backdrop, generos, calificacion, 
                duracion, idioma, director, actores, notas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $params = [
        $bancoId, $tmdbId, $titulo, $tituloOriginal, $resumen,
        $fechaEstreno, $poster, $backdrop, $generosJson, $calificacion,
        $duracion, $idioma, $director, $actoresJson, $notas
    ];
    
    $db->execute($sql, $params);
    $peliculaId = $db->lastInsertId();
    
    // Obtener la película agregada con información completa
    $nuevaPelicula = $db->fetchOne(
        "SELECT p.*, b.nombre as nombre_banco
         FROM peliculas p
         JOIN bancos b ON p.id_banco = b.id
         WHERE p.id = ?",
        [$peliculaId]
    );
    
    // Procesar géneros y actores para la respuesta
    $nuevaPelicula['generos'] = $nuevaPelicula['generos'] ? json_decode($nuevaPelicula['generos'], true) : [];
    $nuevaPelicula['actores'] = $nuevaPelicula['actores'] ? json_decode($nuevaPelicula['actores'], true) : [];
    
    // Registrar en historial
    $db->execute(
        "INSERT INTO historial (id_usuario, tipo_accion, detalles, ip_cliente, user_agent) 
         VALUES (?, 'pelicula_added', ?, ?, ?)",
        [
            $userId,
            json_encode([
                'pelicula_id' => $peliculaId,
                'banco_id' => $bancoId,
                'tmdb_id' => $tmdbId,
                'titulo' => $titulo
            ]),
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]
    );
    
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Película agregada exitosamente',
        'data' => [
            'pelicula' => [
                'id' => (int)$nuevaPelicula['id'],
                'id_banco' => (int)$nuevaPelicula['id_banco'],
                'nombre_banco' => $nuevaPelicula['nombre_banco'],
                'tmdb_id' => (int)$nuevaPelicula['tmdb_id'],
                'titulo' => $nuevaPelicula['titulo'],
                'titulo_original' => $nuevaPelicula['titulo_original'],
                'resumen' => $nuevaPelicula['resumen'],
                'fecha_estreno' => $nuevaPelicula['fecha_estreno'],
                'poster' => $nuevaPelicula['poster'],
                'backdrop' => $nuevaPelicula['backdrop'],
                'generos' => $nuevaPelicula['generos'],
                'calificacion' => $nuevaPelicula['calificacion'] ? (float)$nuevaPelicula['calificacion'] : null,
                'duracion' => $nuevaPelicula['duracion'] ? (int)$nuevaPelicula['duracion'] : null,
                'idioma' => $nuevaPelicula['idioma'],
                'director' => $nuevaPelicula['director'],
                'actores' => $nuevaPelicula['actores'],
                'notas' => $nuevaPelicula['notas'],
                'fecha_agregada' => $nuevaPelicula['fecha_agregada']
            ]
        ]
    ]);
    
} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    
    // Log del error
    error_log("Add Pelicula Error [{$statusCode}]: " . $e->getMessage());
    
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'ADD_PELICULA_ERROR'
    ]);
}
?>