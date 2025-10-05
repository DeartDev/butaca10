-- Base de datos Butaca10
-- Ejecutar este script para crear la base de datos y las tablas necesarias

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS butaca10 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE butaca10;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    correo VARCHAR(255) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    INDEX idx_correo (correo),
    INDEX idx_fecha_registro (fecha_registro)
) ENGINE=InnoDB;

-- Tabla de bancos de películas
CREATE TABLE IF NOT EXISTS bancos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre_banco VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (id_usuario),
    INDEX idx_fecha_creacion (fecha_creacion),
    UNIQUE KEY unique_banco_usuario (id_usuario, nombre_banco)
) ENGINE=InnoDB;

-- Tabla de películas en bancos
CREATE TABLE IF NOT EXISTS peliculas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_banco INT NOT NULL,
    id_pelicula_api INT NOT NULL, -- ID de TMDB
    titulo VARCHAR(500) NOT NULL,
    titulo_original VARCHAR(500),
    sinopsis TEXT,
    genero VARCHAR(500), -- JSON string con géneros
    origen VARCHAR(100), -- País de origen
    duracion INT, -- Duración en minutos
    fecha_estreno DATE,
    puntuacion DECIMAL(3,1), -- Rating de 0.0 a 10.0
    poster_url VARCHAR(500), -- URL del poster
    backdrop_url VARCHAR(500), -- URL del backdrop
    estado ENUM('pendiente', 'vista') DEFAULT 'pendiente',
    fecha_agregada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vista TIMESTAMP NULL,
    notas TEXT, -- Notas personales del usuario
    FOREIGN KEY (id_banco) REFERENCES bancos(id) ON DELETE CASCADE,
    INDEX idx_banco (id_banco),
    INDEX idx_api (id_pelicula_api),
    INDEX idx_estado (estado),
    INDEX idx_fecha_agregada (fecha_agregada),
    INDEX idx_fecha_vista (fecha_vista),
    UNIQUE KEY unique_pelicula_banco (id_banco, id_pelicula_api)
) ENGINE=InnoDB;

-- Tabla de historial (opcional - para mantener registro permanente)
CREATE TABLE IF NOT EXISTS historial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_pelicula_api INT NOT NULL,
    titulo VARCHAR(500) NOT NULL,
    nombre_banco VARCHAR(255) NOT NULL,
    fecha_vista TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    puntuacion_usuario DECIMAL(2,1), -- Rating personal del usuario (1.0-5.0)
    comentario TEXT, -- Comentario personal
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_historial (id_usuario),
    INDEX idx_fecha_vista_historial (fecha_vista),
    INDEX idx_pelicula_api_historial (id_pelicula_api)
) ENGINE=InnoDB;

-- Tabla de tokens de sesión (para JWT o sesiones personalizadas)
CREATE TABLE IF NOT EXISTS tokens_sesion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    tipo_token ENUM('access', 'refresh') DEFAULT 'access',
    fecha_expiracion TIMESTAMP NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_cliente VARCHAR(45), -- Para IPv4 e IPv6
    user_agent TEXT,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_usuario_token (id_usuario),
    INDEX idx_expiracion (fecha_expiracion),
    INDEX idx_activo (activo)
) ENGINE=InnoDB;

-- Insertar usuario de prueba (opcional)
-- Contraseña: "admin123" (ya hasheada)
INSERT IGNORE INTO usuarios (nombre, correo, contrasena) VALUES 
('Administrador', 'admin@butaca10.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Crear índices adicionales para optimización
CREATE INDEX idx_peliculas_titulo ON peliculas(titulo);
CREATE INDEX idx_peliculas_genero ON peliculas(genero(100));
CREATE INDEX idx_bancos_nombre ON bancos(nombre_banco);

-- Estadísticas para optimización de consultas
ANALYZE TABLE usuarios, bancos, peliculas, historial, tokens_sesion;