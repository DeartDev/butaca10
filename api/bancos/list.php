<?php
/**
 * Butaca10 - Listar Bancos de Películas
 * GET /api/bancos/list.php
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
    $limit = isset($_GET['limit']) ? max(1, min(50, (int)$_GET['limit'])) : 20;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $sortBy = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'fecha_creacion';
    $sortOrder = isset($_GET['sort_order']) && $_GET['sort_order'] === 'asc' ? 'ASC' : 'DESC';
    
    // Validar campos de ordenamiento
    $allowedSortFields = ['nombre', 'fecha_creacion', 'total_peliculas'];
    if (!in_array($sortBy, $allowedSortFields)) {
        $sortBy = 'fecha_creacion';
    }
    
    $offset = ($page - 1) * $limit;
    
    // Construir consulta base
    $whereClause = "WHERE b.id_usuario = ?";
    $params = [$userId];
    
    // Agregar filtro de búsqueda si se proporciona
    if (!empty($search)) {
        $whereClause .= " AND (b.nombre LIKE ? OR b.descripcion LIKE ?)";
        $searchParam = "%{$search}%";
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    // Consulta para obtener el total de registros
    $totalQuery = "SELECT COUNT(*) as total FROM bancos b {$whereClause}";
    $totalResult = $db->fetchOne($totalQuery, $params);
    $total = $totalResult['total'];
    
    // Consulta principal con información de películas
    $sql = "SELECT b.id, b.nombre, b.descripcion, b.fecha_creacion,
                   COUNT(p.id) as total_peliculas,
                   MAX(p.fecha_agregada) as ultima_pelicula
            FROM bancos b
            LEFT JOIN peliculas p ON b.id = p.id_banco
            {$whereClause}
            GROUP BY b.id, b.nombre, b.descripcion, b.fecha_creacion
            ORDER BY ";
    
    // Manejar ordenamiento especial para total_peliculas
    if ($sortBy === 'total_peliculas') {
        $sql .= "COUNT(p.id) {$sortOrder}";
    } else {
        $sql .= "b.{$sortBy} {$sortOrder}";
    }
    
    $sql .= " LIMIT {$limit} OFFSET {$offset}";
    
    $bancos = $db->fetchAll($sql, $params);
    
    // Formatear resultados
    $bancosFormateados = array_map(function($banco) {
        return [
            'id' => (int)$banco['id'],
            'nombre' => $banco['nombre'],
            'descripcion' => $banco['descripcion'],
            'fecha_creacion' => $banco['fecha_creacion'],
            'total_peliculas' => (int)$banco['total_peliculas'],
            'ultima_pelicula' => $banco['ultima_pelicula']
        ];
    }, $bancos);
    
    // Calcular información de paginación
    $totalPages = ceil($total / $limit);
    $hasNextPage = $page < $totalPages;
    $hasPrevPage = $page > 1;
    
    // Obtener estadísticas generales del usuario
    $stats = $db->fetchOne(
        "SELECT 
            COUNT(DISTINCT b.id) as total_bancos,
            COUNT(p.id) as total_peliculas,
            AVG(CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END) as promedio_peliculas_por_banco
         FROM bancos b
         LEFT JOIN peliculas p ON b.id = p.id_banco
         WHERE b.id_usuario = ?",
        [$userId]
    );
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Bancos obtenidos exitosamente',
        'data' => [
            'bancos' => $bancosFormateados,
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
                'sort_by' => $sortBy,
                'sort_order' => strtolower($sortOrder)
            ],
            'stats' => [
                'total_bancos' => (int)$stats['total_bancos'],
                'total_peliculas' => (int)$stats['total_peliculas'],
                'promedio_peliculas_por_banco' => round($stats['promedio_peliculas_por_banco'], 2)
            ]
        ]
    ]);
    
} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    
    // Log del error
    error_log("List Bancos Error [{$statusCode}]: " . $e->getMessage());
    
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'LIST_BANCOS_ERROR'
    ]);
}
?>