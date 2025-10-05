# 🚀 Guía de Despliegue - Butaca10

Esta guía te ayudará a desplegar Butaca10 en producción.

## 📋 Requisitos Previos

### Servidor Web
- Apache/Nginx con soporte para HTTPS
- PHP 7.4+ con extensiones: PDO, JSON, OpenSSL
- MySQL 5.7+ o MariaDB 10.3+
- Certificado SSL válido (requerido para PWA)

### APIs Externas
- Cuenta en [TMDB](https://www.themoviedb.org/) con API key

## 🛠️ Pasos de Despliegue

### 1. Preparar el Servidor

#### Apache
```apache
# .htaccess
RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# API Routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ api/index.php [QSA,L]

# PWA Cache Headers
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# Security Headers
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://image.tmdb.org; connect-src 'self' https://api.themoviedb.org"
</IfModule>
```

#### Nginx
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    
    root /var/www/html/butaca10;
    index index.html;
    
    # Security Headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://image.tmdb.org; connect-src 'self' https://api.themoviedb.org";
    
    # API Routes
    location /api/ {
        try_files $uri $uri/ /api/index.php?$query_string;
    }
    
    # Static Files Caching
    location ~* \.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # PWA Files
    location ~* \.(json|webmanifest)$ {
        expires 1d;
        add_header Cache-Control "public";
    }
}
```

### 2. Configurar la Base de Datos

```sql
-- Crear base de datos
CREATE DATABASE butaca10 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear usuario
CREATE USER 'butaca10_user'@'localhost' IDENTIFIED BY 'tu_password_seguro';
GRANT ALL PRIVILEGES ON butaca10.* TO 'butaca10_user'@'localhost';
FLUSH PRIVILEGES;

-- Usar la base de datos
USE butaca10;

-- Tabla de usuarios
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de bancos de películas
CREATE TABLE movie_banks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Tabla de películas en bancos
CREATE TABLE bank_movies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bank_id INT NOT NULL,
    tmdb_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    overview TEXT,
    poster_path VARCHAR(255),
    release_date DATE,
    vote_average DECIMAL(3,1),
    genre_ids JSON,
    is_watched BOOLEAN DEFAULT FALSE,
    watched_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bank_id) REFERENCES movie_banks(id) ON DELETE CASCADE,
    INDEX idx_bank_id (bank_id),
    INDEX idx_tmdb_id (tmdb_id),
    INDEX idx_is_watched (is_watched)
);
```

### 3. Configurar el Backend PHP

Crea el archivo `api/.env`:
```env
DB_HOST=localhost
DB_NAME=butaca10
DB_USER=butaca10_user
DB_PASS=tu_password_seguro
JWT_SECRET=tu_jwt_secret_muy_seguro_y_largo
JWT_EXPIRE=86400
```

### 4. Configurar el Frontend

Edita `js/config.js`:
```javascript
const CONFIG = {
  TMDB: {
    API_KEY: 'tu_tmdb_api_key_aqui',
    // ... resto de configuración
  },
  
  API: {
    BASE_URL: '/api', // Ajusta según tu configuración
    // ... resto de configuración
  }
  
  // ... resto de configuración
};
```

### 5. Generar Iconos PWA

Utiliza [PWA Builder](https://www.pwabuilder.com/imageGenerator) o [RealFaviconGenerator](https://realfavicongenerator.net/):

1. Crea un icono base de 512x512px con el logo de Butaca10
2. Genera todos los tamaños requeridos
3. Colócalos en la carpeta `/icons/`

### 6. Tomar Screenshots

1. Abre la aplicación en un navegador
2. Toma screenshot desktop (1280x720)
3. Toma screenshot mobile (640x1136)
4. Guárdalos en `/screenshots/`

## 🔒 Configuración de Seguridad

### 1. Variables de Entorno
Nunca subas credenciales al repositorio. Usa variables de entorno o archivos `.env` excluidos del control de versiones.

### 2. Permisos de Archivos
```bash
# Archivos PHP
chmod 644 *.php
chmod 644 api/*.php

# Directorio de archivos
chmod 755 /var/www/html/butaca10

# Archivos sensibles
chmod 600 api/.env
```

### 3. Firewall
Configura el firewall para permitir solo los puertos necesarios:
- 80 (HTTP - redirigir a HTTPS)
- 443 (HTTPS)
- 22 (SSH - solo desde IPs específicas)

## 📊 Monitoreo

### 1. Logs de Error
Configura PHP para registrar errores:
```php
// En php.ini
log_errors = On
error_log = /var/log/php_errors.log
```

### 2. Métricas de PWA
Usa herramientas como:
- Google Analytics
- Google Search Console
- Lighthouse CI

### 3. Uptime Monitoring
Configura monitoreo con herramientas como:
- UptimeRobot
- Pingdom
- StatusCake

## 🚀 Optimizaciones de Rendimiento

### 1. Compresión
Habilita Gzip/Brotli en el servidor:
```apache
# Apache
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
```

### 2. CDN
Considera usar un CDN para:
- Archivos estáticos (CSS, JS, imágenes)
- Mejor rendimiento global
- Reducción de carga del servidor

### 3. Cache de Base de Datos
Implementa cache con Redis o Memcached para:
- Resultados de API TMDB
- Datos de usuario frecuentes
- Sesiones de usuario

## 🔄 Proceso de Actualización

### 1. Backup
Antes de cada actualización:
```bash
# Backup de archivos
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/html/butaca10/

# Backup de base de datos
mysqldump -u butaca10_user -p butaca10 > backup-db-$(date +%Y%m%d).sql
```

### 2. Despliegue
```bash
# 1. Subir nuevos archivos
# 2. Actualizar base de datos si es necesario
# 3. Limpiar cache
# 4. Verificar funcionamiento
```

### 3. Rollback
Ten un plan de rollback en caso de problemas:
```bash
# Restaurar archivos
tar -xzf backup-YYYYMMDD.tar.gz

# Restaurar base de datos
mysql -u butaca10_user -p butaca10 < backup-db-YYYYMMDD.sql
```

## ✅ Lista de Verificación Pre-Producción

- [ ] SSL certificate instalado y funcionando
- [ ] Base de datos creada y configurada
- [ ] API key de TMDB configurada
- [ ] Todos los endpoints del backend funcionando
- [ ] Iconos PWA generados y optimizados
- [ ] Screenshots tomados y optimizados
- [ ] Headers de seguridad configurados
- [ ] Compresión habilitada
- [ ] Cache configurado
- [ ] Monitoreo configurado
- [ ] Backup automatizado configurado
- [ ] Pruebas de funcionalidad completas
- [ ] Pruebas de PWA (instalación, offline)
- [ ] Pruebas de rendimiento (Lighthouse)

## 🆘 Solución de Problemas Comunes

### Service Worker no funciona
- Verificar HTTPS
- Verificar ruta del SW
- Limpiar cache del navegador

### PWA no se puede instalar
- Verificar manifest.json
- Verificar iconos
- Verificar HTTPS
- Verificar criterios de instalación

### API no responde
- Verificar configuración del servidor
- Verificar permisos de archivos
- Verificar logs de error
- Verificar conexión a base de datos

---

¡Listo! Tu aplicación Butaca10 debería estar funcionando correctamente en producción. 🎬✨