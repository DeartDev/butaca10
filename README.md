# Butaca10 🎬

Una aplicación web progresiva (PWA) completa para gestionar listas personales de películas con autenticación, almacenamiento en base de datos y integración con TMDB API.

## Características Principales

### Frontend (PWA)
- ✅ **Aplicación Web Progresiva** completa con Service Worker
- ✅ **Instalable** en dispositivos móviles y desktop
- ✅ **Funcionalidad Offline** con cache inteligente
- ✅ **Diseño Responsive** adaptable a todos los dispositivos
- ✅ **Sistema de Temas** (claro/oscuro) con persistencia
- ✅ **Autenticación JWT** integrada con el backend
- ✅ **Gestión de Bancos** de películas (hasta 10 por usuario)
- ✅ **Búsqueda y Filtrado** avanzado de películas
- ✅ **Integración TMDB API** para información de películas
- ✅ **Interfaz Intuitiva** con navegación fluida

### Backend (PHP + MySQL)
- ✅ **API REST** completa con documentación
- ✅ **Autenticación JWT** con refresh tokens
- ✅ **Base de Datos MySQL** con diseño normalizado
- ✅ **Gestión de Usuarios** con registro y login
- ✅ **CRUD Completo** para bancos y películas
- ✅ **Sistema de Límites** (10 bancos, 500 películas por banco)
- ✅ **Historial de Acciones** para auditoría
- ✅ **Seguridad Robusta** con validaciones y sanitización
- ✅ **Manejo de Errores** centralizado con logging
- ✅ **CORS Configurado** para desarrollo y producción

## Estructura del Proyecto

```
butaca10/
├── 📁 Frontend (PWA)
│   ├── index.html              # Página principal
│   ├── manifest.json           # Web App Manifest
│   ├── sw.js                   # Service Worker
│   ├── offline.html            # Página offline
│   ├── 📁 css/
│   │   ├── styles.css          # Estilos principales
│   │   ├── components.css      # Componentes UI
│   │   └── responsive.css      # Media queries
│   └── 📁 js/
│       ├── config.js           # Configuración global
│       ├── api.js              # Comunicación con API
│       ├── auth.js             # Autenticación
│       ├── movies.js           # Gestión de películas
│       ├── banks.js            # Gestión de bancos
│       ├── ui.js               # Interfaz de usuario
│       ├── theme.js            # Sistema de temas
│       └── app.js              # Aplicación principal
├── 📁 Backend (PHP + MySQL)
│   ├── .env                    # Variables de entorno
│   ├── database.sql            # Esquema de base de datos
│   ├── 📁 api/
│   │   ├── database.php        # Conexión PDO
│   │   ├── jwt.php             # Autenticación JWT
│   │   ├── 📁 auth/
│   │   │   ├── register.php    # Registro de usuarios
│   │   │   ├── login.php       # Inicio de sesión
│   │   │   ├── verify.php      # Verificar token
│   │   │   ├── refresh.php     # Refrescar token
│   │   │   └── logout.php      # Cerrar sesión
│   │   ├── 📁 bancos/
│   │   │   ├── create.php      # Crear banco
│   │   │   ├── list.php        # Listar bancos
│   │   │   ├── update.php      # Actualizar banco
│   │   │   └── delete.php      # Eliminar banco
│   │   └── 📁 peliculas/
│   │       ├── add.php         # Agregar película
│   │       ├── list.php        # Listar películas
│   │       ├── update.php      # Actualizar película
│   │       └── delete.php      # Eliminar película
│   └── .htaccess               # Configuración Apache
└── README.md                   # Documentación
```

## Instalación y Configuración

### Requisitos del Sistema
- **Servidor Web**: Apache 2.4+ con mod_rewrite
- **PHP**: 7.4+ (recomendado 8.0+)
- **MySQL**: 5.7+ o MariaDB 10.3+
- **Extensiones PHP**: PDO, PDO_MySQL, JSON, OpenSSL

### 1. Configurar Base de Datos

```sql
-- Crear base de datos
CREATE DATABASE butaca10 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Importar esquema
mysql -u root -p butaca10 < database.sql
```

### 2. Configurar Variables de Entorno

Editar `.env` con tus credenciales:

```env
# Base de Datos
DB_HOST=localhost
DB_NAME=butaca10
DB_USER=tu_usuario
DB_PASS=tu_password

# JWT Configuración
JWT_SECRET=tu_clave_secreta_muy_segura_aqui
JWT_EXPIRE=86400
JWT_REFRESH_EXPIRE=604800

# TMDB API
TMDB_API_KEY=tu_api_key_de_tmdb

# Límites de la Aplicación
MAX_BANCOS_POR_USUARIO=10
MAX_PELICULAS_POR_BANCO=500

# Configuración de la App
APP_NAME=Butaca10
APP_VERSION=1.0.0
DEBUG=false
```

### 3. Configurar TMDB API

1. Registrarse en [The Movie Database](https://www.themoviedb.org/)
2. Obtener API Key desde [configuración de API](https://www.themoviedb.org/settings/api)
3. Agregar la clave al archivo `.env`
4. Actualizar `js/config.js` con tu dominio:

```javascript
const CONFIG = {
    API_BASE_URL: 'https://tu-dominio.com/api',
    TMDB_API_KEY: 'tu_tmdb_api_key',
    TMDB_BASE_URL: 'https://api.themoviedb.org/3',
    TMDB_IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/'
};
```

### 4. Configurar Permisos

```bash
# Dar permisos de escritura a logs
chmod 755 /var/www/html/butaca10
chmod 644 /var/www/html/butaca10/.env
```

## API Endpoints

### Autenticación

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register.php` | Registrar usuario | No |
| POST | `/api/auth/login.php` | Iniciar sesión | No |
| GET/POST | `/api/auth/verify.php` | Verificar token | Sí |
| POST | `/api/auth/refresh.php` | Refrescar token | Sí |
| POST | `/api/auth/logout.php` | Cerrar sesión | Sí |

### Bancos de Películas

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/bancos/create.php` | Crear banco | Sí |
| GET | `/api/bancos/list.php` | Listar bancos | Sí |
| PUT/POST | `/api/bancos/update.php` | Actualizar banco | Sí |
| DELETE/POST | `/api/bancos/delete.php` | Eliminar banco | Sí |

### Películas

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/peliculas/add.php` | Agregar película | Sí |
| GET | `/api/peliculas/list.php` | Listar películas | Sí |
| PUT/POST | `/api/peliculas/update.php` | Actualizar película | Sí |
| DELETE/POST | `/api/peliculas/delete.php` | Eliminar película | Sí |

### Parámetros de Autenticación

Incluir en headers:
```
Authorization: Bearer {access_token}
```
o
```
X-Auth-Token: {access_token}
```

## Base de Datos

### Esquema de Tablas

- **usuarios**: Información de usuarios registrados
- **bancos**: Listas de películas de cada usuario (máx. 10)
- **peliculas**: Películas guardadas en los bancos (máx. 500 por banco)
- **tokens_sesion**: Tokens JWT activos para sesiones
- **historial**: Log de acciones para auditoría

### Características de Seguridad

- Contraseñas hasheadas con `password_hash()`
- Tokens JWT con expiración y renovación
- Validación y sanitización de todas las entradas
- Protección contra SQL injection con PDO
- Rate limiting para registro y login
- Logs de seguridad y auditoría

## Uso de la Aplicación

### Para Usuarios Finales

1. **Registro/Login**: Crear cuenta o iniciar sesión
2. **Crear Bancos**: Organizar películas en listas temáticas
3. **Buscar Películas**: Usar la integración con TMDB
4. **Gestionar Colección**: Agregar, editar, eliminar películas
5. **Tema Personalizado**: Cambiar entre modo claro/oscuro
6. **Instalación PWA**: Instalar como app nativa

### Para Desarrolladores

1. **Extensión de API**: Agregar nuevos endpoints en `/api/`
2. **Personalización Frontend**: Modificar componentes UI
3. **Temas Adicionales**: Crear nuevas paletas de colores
4. **Integración Externa**: Conectar con otras APIs de películas

## Características Técnicas

### Frontend
- **Vanilla JavaScript ES6+** sin frameworks pesados
- **CSS Grid y Flexbox** para layouts responsivos
- **Service Worker** con estrategias de cache inteligentes
- **Local Storage** para persistencia de configuración
- **Fetch API** para comunicación con backend
- **Progressive Enhancement** para mejor accesibilidad

### Backend
- **PHP OOP** con patrones de diseño modernos
- **PDO** para acceso seguro a base de datos
- **JWT** para autenticación stateless
- **RESTful API** con códigos de estado HTTP correctos
- **Error Handling** centralizado con logging
- **Transacciones** para operaciones críticas

## Seguridad Implementada

- ✅ Validación y sanitización de entrada
- ✅ Protección contra SQL injection
- ✅ Protección contra XSS
- ✅ Headers de seguridad HTTP
- ✅ Rate limiting para APIs críticas
- ✅ Tokens JWT con expiración
- ✅ Logs de auditoría y security
- ✅ Archivos sensibles protegidos

## Mantenimiento

### Logs y Monitoreo
- Logs de PHP en `/var/log/php_errors.log`
- Logs de aplicación en base de datos (tabla `historial`)
- Monitoreo de tokens expirados automático

### Tareas de Limpieza
```php
// Ejecutar periódicamente para limpiar tokens expirados
JWTAuth::cleanupExpiredTokens();
```

### Backup de Base de Datos
```bash
mysqldump -u root -p butaca10 > backup_butaca10_$(date +%Y%m%d).sql
```

## Licencia y Contribución

Este proyecto está disponible bajo licencia MIT. Las contribuciones son bienvenidas siguiendo las mejores prácticas de desarrollo seguro.

---

**Desarrollado con ❤️ para los amantes del cine**