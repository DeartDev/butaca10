<?php
/**
 * Butaca10 - Database Connection Manager
 * Manejo de conexión a la base de datos con PDO
 */

class Database {
    private static $instance = null;
    private $connection;
    private $host;
    private $dbname;
    private $username;
    private $password;
    private $port;
    private $charset;
    
    private function __construct() {
        $this->loadEnvironment();
        $this->host = $_ENV['DB_HOST'] ?? 'localhost';
        $this->dbname = $_ENV['DB_NAME'] ?? 'butaca10';
        $this->username = $_ENV['DB_USER'] ?? 'root';
        $this->password = $_ENV['DB_PASS'] ?? '';
        $this->port = $_ENV['DB_PORT'] ?? '3306';
        $this->charset = $_ENV['DB_CHARSET'] ?? 'utf8mb4';
        
        $this->connect();
    }
    
    /**
     * Cargar variables de entorno desde .env
     */
    private function loadEnvironment() {
        $envFile = __DIR__ . '/../.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos($line, '#') === 0) continue; // Ignorar comentarios
                
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // Eliminar comillas si existen
                if (preg_match('/^["\'](.*)["\']\z/', $value, $matches)) {
                    $value = $matches[1];
                }
                
                $_ENV[$key] = $value;
            }
        }
    }
    
    /**
     * Establecer conexión a la base de datos
     */
    private function connect() {
        try {
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->dbname};charset={$this->charset}";
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$this->charset}",
                PDO::ATTR_TIMEOUT => 30,
                PDO::ATTR_PERSISTENT => false
            ];
            
            $this->connection = new PDO($dsn, $this->username, $this->password, $options);
            
            // Configurar timezone
            $timezone = $_ENV['APP_TIMEZONE'] ?? 'UTC';
            $this->connection->exec("SET time_zone = '{$timezone}'");
            
        } catch (PDOException $e) {
            $this->logError("Database connection failed: " . $e->getMessage());
            throw new Exception("Error de conexión a la base de datos", 500);
        }
    }
    
    /**
     * Obtener instancia singleton
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Obtener conexión PDO
     */
    public function getConnection() {
        // Verificar si la conexión sigue activa
        if (!$this->isConnected()) {
            $this->connect();
        }
        return $this->connection;
    }
    
    /**
     * Verificar si la conexión está activa
     */
    private function isConnected() {
        try {
            $this->connection->query('SELECT 1');
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }
    
    /**
     * Ejecutar consulta preparada
     */
    public function execute($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            $this->logError("Query execution failed: " . $e->getMessage() . " SQL: " . $sql);
            throw new Exception("Error en la consulta a la base de datos", 500);
        }
    }
    
    /**
     * Ejecutar consulta y obtener un registro
     */
    public function fetchOne($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->fetch();
    }
    
    /**
     * Ejecutar consulta y obtener todos los registros
     */
    public function fetchAll($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->fetchAll();
    }
    
    /**
     * Obtener el último ID insertado
     */
    public function lastInsertId() {
        return $this->connection->lastInsertId();
    }
    
    /**
     * Iniciar transacción
     */
    public function beginTransaction() {
        return $this->connection->beginTransaction();
    }
    
    /**
     * Confirmar transacción
     */
    public function commit() {
        return $this->connection->commit();
    }
    
    /**
     * Revertir transacción
     */
    public function rollback() {
        return $this->connection->rollback();
    }
    
    /**
     * Verificar si hay una transacción activa
     */
    public function inTransaction() {
        return $this->connection->inTransaction();
    }
    
    /**
     * Obtener información de la base de datos
     */
    public function getDatabaseInfo() {
        $info = $this->fetchOne("SELECT VERSION() as version, DATABASE() as database");
        return [
            'version' => $info['version'],
            'database' => $info['database'],
            'charset' => $this->charset,
            'host' => $this->host,
            'port' => $this->port
        ];
    }
    
    /**
     * Verificar y crear tablas si no existen
     */
    public function initializeDatabase() {
        try {
            $sqlFile = __DIR__ . '/../database.sql';
            if (file_exists($sqlFile)) {
                $sql = file_get_contents($sqlFile);
                $statements = explode(';', $sql);
                
                foreach ($statements as $statement) {
                    $statement = trim($statement);
                    if (!empty($statement)) {
                        $this->connection->exec($statement);
                    }
                }
                
                return true;
            }
            return false;
        } catch (PDOException $e) {
            $this->logError("Database initialization failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Limpiar conexiones inactivas
     */
    public function cleanup() {
        try {
            // Limpiar tokens expirados
            $this->execute("DELETE FROM tokens_sesion WHERE fecha_expiracion < NOW()");
            
            // Limpiar logs antiguos (más de 30 días)
            $this->execute("DELETE FROM historial WHERE fecha_vista < DATE_SUB(NOW(), INTERVAL 30 DAY)");
            
            return true;
        } catch (Exception $e) {
            $this->logError("Database cleanup failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Registrar errores
     */
    private function logError($message) {
        $logFile = $_ENV['LOG_FILE'] ?? 'logs/database.log';
        $logDir = dirname($logFile);
        
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] ERROR: {$message}" . PHP_EOL;
        
        file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
    }
    
    /**
     * Prevenir clonación
     */
    public function __clone() {
        throw new Exception("Cannot clone singleton Database instance");
    }
    
    /**
     * Prevenir deserialización
     */
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton Database instance");
    }
    
    /**
     * Cerrar conexión al destruir el objeto
     */
    public function __destruct() {
        $this->connection = null;
    }
}

// Función helper para obtener la instancia de la base de datos
function getDB() {
    return Database::getInstance();
}

// Función helper para obtener la conexión PDO
function getPDO() {
    return Database::getInstance()->getConnection();
}
?>