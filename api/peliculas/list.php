<?php
/**
 * Butaca10 - Listar Películas
 * GET /api/peliculas/list.php
 */

// Headers CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Auth-Token');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Solo permitir método GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Use GET.',
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
    
    $db = getDB();
    
    // Parámetros de consulta
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 20;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $bancoId = isset($_GET['banco_id']) ? (int)$_GET['banco_id'] : null;
    $sortBy = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'fecha_agregada';
    $sortOrder = isset($_GET['sort_order']) && $_GET['sort_order'] === 'asc' ? 'ASC' : 'DESC';
    $genero = isset($_GET['genero']) ? trim($_GET['genero']) : '';
    $anoEstreno = isset($_GET['ano_estreno']) ? (int)$_GET['ano_estreno'] : null;
    $calificacionMin = isset($_GET['calificacion_min']) ? (float)$_GET['calificacion_min'] : null;
    $calificacionMax = isset($_GET['calificacion_max']) ? (float)$_GET['calificacion_max'] : null;
    
    // Validar campos de ordenamiento
    $allowedSortFields = ['titulo', 'fecha_estreno', 'fecha_agregada', 'calificacion', 'duracion'];
    if (!in_array($sortBy, $allowedSortFields)) {
        $sortBy = 'fecha_agregada';
    }
    
    $offset = ($page - 1) * $limit;
    
    // Construir consulta base
    $whereClause = "WHERE b.id_usuario = ?";
    $params = [$userId];
    
    // Filtro por banco específico
    if ($bancoId) {
        // Verificar que el banco pertenece al usuario
        $bancoExists = $db->fetchOne(
            "SELECT id FROM bancos WHERE id = ? AND id_usuario = ?",
            [$bancoId, $userId]
        );
        
        if (!$bancoExists) {
            throw new Exception('Banco no encontrado o no tienes permisos para acceder', 404);
        }
        
        $whereClause .= " AND p.id_banco = ?";
        $params[] = $bancoId;
    }
    
    // Filtro de búsqueda por título, título original o director
    if (!empty($search)) {
        $whereClause .= " AND (p.titulo LIKE ? OR p.titulo_original LIKE ? OR p.director LIKE ?)";
        $searchParam = "%{$search}%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    // Filtro por género
    if (!empty($genero)) {
        $whereClause .= " AND JSON_SEARCH(p.generos, 'one', ?) IS NOT NULL";
        $params[] = $genero;
    }
    
    // Filtro por año de estreno
    if ($anoEstreno) {
        $whereClause .= " AND YEAR(p.fecha_estreno) = ?";
        $params[] = $anoEstreno;
    }
    
    // Filtro por rango de calificación
    if ($calificacionMin !== null) {
        $whereClause .= " AND p.calificacion >= ?";
        $params[] = $calificacionMin;
    }
    
    if ($calificacionMax !== null) {
        $whereClause .= " AND p.calificacion <= ?";
        $params[] = $calificacionMax;
    }
    
    // Consulta para obtener el total de registros
    $totalQuery = "SELECT COUNT(*) as total 
                   FROM peliculas p 
                   JOIN bancos b ON p.id_banco = b.id 
                   {$whereClause}";
    $totalResult = $db->fetchOne($totalQuery, $params);
    $total = $totalResult['total'];
    
    // Consulta principal
    $sql = "SELECT p.*, b.nombre as nombre_banco
            FROM peliculas p
            JOIN bancos b ON p.id_banco = b.id
            {$whereClause}
            ORDER BY p.{$sortBy} {$sortOrder}
            LIMIT {$limit} OFFSET {$offset}";
    
    $peliculas = $db->fetchAll($sql, $params);
    
    // Formatear resultados
    $peliculasFormateadas = array_map(function($pelicula) {
        return [
            'id' => (int)$pelicula['id'],
            'id_banco' => (int)$pelicula['id_banco'],
            'nombre_banco' => $pelicula['nombre_banco'],
            'tmdb_id' => (int)$pelicula['tmdb_id'],
            'titulo' => $pelicula['titulo'],
            'titulo_original' => $pelicula['titulo_original'],
            'resumen' => $pelicula['resumen'],
            'fecha_estreno' => $pelicula['fecha_estreno'],
            'poster' => $pelicula['poster'],
            'backdrop' => $pelicula['backdrop'],
            'generos' => $pelicula['generos'] ? json_decode($pelicula['generos'], true) : [],
            'calificacion' => $pelicula['calificacion'] ? (float)$pelicula['calificacion'] : null,
            'duracion' => $pelicula['duracion'] ? (int)$pelicula['duracion'] : null,
            'idioma' => $pelicula['idioma'],
            'director' => $pelicula['director'],
            'actores' => $pelicula['actores'] ? json_decode($pelicula['actores'], true) : [],
            'notas' => $pelicula['notas'],
            'fecha_agregada' => $pelicula['fecha_agregada']
        ];
    }, $peliculas);
    
    // Calcular información de paginación
    $totalPages = ceil($total / $limit);
    $hasNextPage = $page < $totalPages;
    $hasPrevPage = $page > 1;
    
    // Obtener estadísticas
    $statsWhere = $bancoId ? "WHERE b.id_usuario = ? AND p.id_banco = ?" : "WHERE b.id_usuario = ?";
    $statsParams = $bancoId ? [$userId, $bancoId] : [$userId];
    
    $stats = $db->fetchOne(
        "SELECT 
            COUNT(p.id) as total_peliculas,
            AVG(p.calificacion) as calificacion_promedio,
            AVG(p.duracion) as duracion_promedio,
            COUNT(DISTINCT YEAR(p.fecha_estreno)) as anos_diferentes,
            MIN(p.fecha_estreno) as pelicula_mas_antigua,
            MAX(p.fecha_estreno) as pelicula_mas_reciente
         FROM peliculas p
         JOIN bancos b ON p.id_banco = b.id
         {$statsWhere}",
        $statsParams
    );
    
    // Obtener géneros más populares
    $generosPopulares = [];
    if ($total > 0) {
        $generosQuery = "SELECT p.generos 
                        FROM peliculas p 
                        JOIN bancos b ON p.id_banco = b.id 
                        {$whereClause} 
                        AND p.generos IS NOT NULL";
        
        $generosData = $db->fetchAll($generosQuery, $params);
        $generosCount = [];
        
        foreach ($generosData as $row) {
            $generos = json_decode($row['generos'], true);
            if ($generos) {
                foreach ($generos as $genero) {
                    $generosCount[$genero] = ($generosCount[$genero] ?? 0) + 1;
                }
            }
        }
        
        arsort($generosCount);
        $generosPopulares = array_slice($generosCount, 0, 10, true);
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Películas obtenidas exitosamente',
        'data' => [
            'peliculas' => $peliculasFormateadas,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $totalPages,
                'total_items' => (int)$total,
                'items_per_page' => $limit,
                'has_next_page' => $hasNextPage,
                'has_prev_page' => $hasPrevPage
            ],
            'filters' => [
                'search' => $search,
                'banco_id' => $bancoId,
                'genero' => $genero,
                'ano_estreno' => $anoEstreno,
                'calificacion_min' => $calificacionMin,
                'calificacion_max' => $calificacionMax,
                'sort_by' => $sortBy,
                'sort_order' => strtolower($sortOrder)
            ],
            'stats' => [
                'total_peliculas' => (int)$stats['total_peliculas'],
                'calificacion_promedio' => $stats['calificacion_promedio'] ? round($stats['calificacion_promedio'], 2) : null,
                'duracion_promedio' => $stats['duracion_promedio'] ? round($stats['duracion_promedio']) : null,
                'anos_diferentes' => (int)$stats['anos_diferentes'],
                'pelicula_mas_antigua' => $stats['pelicula_mas_antigua'],
                'pelicula_mas_reciente' => $stats['pelicula_mas_reciente'],
                'generos_populares' => $generosPopulares
            ]
        ]
    ]);
    
} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    
    // Log del error
    error_log("List Peliculas Error [{$statusCode}]: " . $e->getMessage());
    
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'LIST_PELICULAS_ERROR'
    ]);
}
?>