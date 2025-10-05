// Configuration constants for Butaca10
const CONFIG = {
  // TMDB API Configuration
  TMDB: {
    API_KEY: 'tu_tmdb_api_key_aqui', // Replace with your actual TMDB API key
    BASE_URL: 'https://api.themoviedb.org/3',
    IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
    IMAGE_SIZES: {
      poster: 'w500',
      backdrop: 'w1280',
      profile: 'w185'
    }
  },
  
  // Backend API Configuration
  API: {
    BASE_URL: '/api', // Adjust this to match your PHP backend
    ENDPOINTS: {
      AUTH: {
        LOGIN: '/auth/login.php',
        REGISTER: '/auth/register_simple.php',
        LOGOUT: '/auth/logout.php',
        VERIFY_TOKEN: '/auth/verify.php',
        REFRESH: '/auth/refresh.php'
      },
      BANKS: {
        LIST: '/bancos/list.php',
        CREATE: '/bancos/create.php',
        DELETE: '/bancos/delete.php',
        UPDATE: '/bancos/update.php'
      },
      MOVIES: {
        ADD: '/peliculas/add.php',
        LIST: '/peliculas/list.php',
        DELETE: '/peliculas/delete.php',
        UPDATE: '/peliculas/update.php'
      }
    }
  },
  
  // Application Settings
  APP: {
    NAME: 'Butaca10',
    VERSION: '1.0.0',
    MAX_BANKS: 10,
    MOVIES_PER_PAGE: 20,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes in milliseconds
    GENRES: {
      28: 'Acción',
      12: 'Aventura',
      16: 'Animación',
      35: 'Comedia',
      80: 'Crimen',
      99: 'Documental',
      18: 'Drama',
      10751: 'Familiar',
      14: 'Fantasía',
      36: 'Historia',
      27: 'Terror',
      10402: 'Música',
      9648: 'Misterio',
      10749: 'Romance',
      878: 'Ciencia ficción',
      10770: 'Película de TV',
      53: 'Thriller',
      10752: 'Guerra',
      37: 'Western'
    },
    YEARS: (() => {
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let year = currentYear; year >= 1900; year--) {
        years.push(year);
      }
      return years;
    })()
  },
  
  // Theme Settings
  THEME: {
    DEFAULT: 'light',
    STORAGE_KEY: 'butaca10-theme'
  },
  
  // LocalStorage Keys
  STORAGE_KEYS: {
    USER: 'butaca10-user',
    TOKEN: 'butaca10-token',
    THEME: 'butaca10-theme',
    MOVIES_CACHE: 'butaca10-movies-cache',
    BANKS_CACHE: 'butaca10-banks-cache'
  },
  
  // IndexedDB Configuration
  INDEXEDDB: {
    NAME: 'butaca10-db',
    VERSION: 1,
    STORES: {
      MOVIES: 'movies',
      BANKS: 'banks',
      PENDING_ACTIONS: 'pending-actions'
    }
  },
  
  // Animation Settings
  ANIMATIONS: {
    DURATION: {
      FAST: 150,
      NORMAL: 300,
      SLOW: 500
    },
    EASING: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },
  
  // Network Settings
  NETWORK: {
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    TIMEOUT: 10000
  },
  
  // UI Settings
  UI: {
    TOAST_DURATION: 4000,
    DEBOUNCE_DELAY: 300,
    INFINITE_SCROLL_THRESHOLD: 100
  },
  
  // PWA Settings
  PWA: {
    UPDATE_CHECK_INTERVAL: 60000, // 1 minute
    CACHE_NAME: 'butaca10-v1.0.0'
  }
};

// Environment detection
CONFIG.ENV = {
  IS_DEVELOPMENT: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
  IS_MOBILE: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  IS_TOUCH_DEVICE: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  IS_ONLINE: navigator.onLine,
  SUPPORTS_SERVICE_WORKER: 'serviceWorker' in navigator,
  SUPPORTS_PUSH_NOTIFICATIONS: 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
};

// Feature flags
CONFIG.FEATURES = {
  OFFLINE_MODE: true,
  PUSH_NOTIFICATIONS: CONFIG.ENV.SUPPORTS_PUSH_NOTIFICATIONS,
  BACKGROUND_SYNC: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
  INSTALL_PROMPT: 'beforeinstallprompt' in window
};

// Error messages
CONFIG.MESSAGES = {
  ERRORS: {
    NETWORK: 'Error de conexión. Verifica tu conexión a internet.',
    AUTH_FAILED: 'Credenciales incorrectas. Intenta de nuevo.',
    AUTH_REQUIRED: 'Debes iniciar sesión para continuar.',
    SERVER_ERROR: 'Error del servidor. Intenta más tarde.',
    NOT_FOUND: 'Recurso no encontrado.',
    VALIDATION_ERROR: 'Datos inválidos. Verifica la información.',
    MAX_BANKS_REACHED: `No puedes crear más de ${CONFIG.APP.MAX_BANKS} bancos.`,
    BANK_NOT_FOUND: 'Banco no encontrado.',
    MOVIE_NOT_FOUND: 'Película no encontrada.',
    DUPLICATE_MOVIE: 'Esta película ya está en el banco.',
    EMPTY_BANK: 'El banco está vacío.'
  },
  SUCCESS: {
    LOGIN: '¡Bienvenido de vuelta!',
    REGISTER: '¡Cuenta creada exitosamente!',
    BANK_CREATED: 'Banco creado exitosamente.',
    BANK_DELETED: 'Banco eliminado exitosamente.',
    MOVIE_ADDED: 'Película añadida al banco.',
    MOVIE_REMOVED: 'Película eliminada del banco.',
    MOVIE_WATCHED: 'Película marcada como vista.'
  },
  INFO: {
    LOADING: 'Cargando...',
    NO_MOVIES: 'No se encontraron películas.',
    NO_BANKS: 'No tienes bancos creados aún.',
    OFFLINE: 'Modo offline activado.',
    ONLINE: 'Conexión restaurada.'
  }
};

// Utility functions
CONFIG.UTILS = {
  // Generate unique ID
  generateId: () => Date.now().toString(36) + Math.random().toString(36).substr(2),
  
  // Format date
  formatDate: (date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  },
  
  // Format runtime
  formatRuntime: (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  },
  
  // Truncate text
  truncateText: (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  },
  
  // Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  // Throttle function
  throttle: (func, limit) => {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  // Sleep function
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

// Development helpers
if (CONFIG.ENV.IS_DEVELOPMENT) {
  console.log('🎬 Butaca10 - Development Mode');
  console.log('Config:', CONFIG);
  
  // Add development helpers to global scope
  window.BUTACA10_CONFIG = CONFIG;
  window.BUTACA10_DEBUG = true;
}

// Export config for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}