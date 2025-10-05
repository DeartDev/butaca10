// Main Application Controller for Butaca10
class Butaca10App {
  constructor() {
    this.version = CONFIG.APP.VERSION;
    this.isInitialized = false;
    this.isOnline = navigator.onLine;
    this.serviceWorkerReady = false;
    this.updateAvailable = false;
  }
  
  // Initialize the application
  async init() {
    try {
      console.log(`🎬 Initializing Butaca10 v${this.version}`);
      
      // Show loading screen
      UI.showLoading(true);
      
      // Wait for DOM to be fully loaded
      if (document.readyState !== 'complete') {
        await new Promise(resolve => {
          window.addEventListener('load', resolve);
        });
      }
      
      // Initialize core services
      await this.initializeServices();
      
      // Setup global event listeners
      this.setupGlobalEventListeners();
      
      // Initialize PWA features
      await this.initializePWA();
      
      // Check authentication state
      await this.checkAuthState();
      
      // Setup periodic tasks
      this.setupPeriodicTasks();
      
      // Mark as initialized
      this.isInitialized = true;
      
      console.log('✅ Butaca10 initialized successfully');
      
      // Hide loading screen
      UI.showLoading(false);
      
      // Show welcome message for first-time users
      this.showWelcomeMessage();
      
    } catch (error) {
      console.error('❌ Failed to initialize Butaca10:', error);
      UI.showLoading(false);
      UI.showToast('Error al inicializar la aplicación', 'error');
    }
  }
  
  // Initialize core services
  async initializeServices() {
    console.log('Initializing services...');
    
    // Initialize theme manager
    if (window.Theme) {
      Theme.init();
    }
    
    // Initialize UI manager
    if (window.UI) {
      UI.init();
    }
    
    // Initialize authentication
    if (window.Auth) {
      await Auth.init();
    }
    
    // Initialize movies manager
    if (window.Movies) {
      Movies.init();
    }
    
    // Initialize banks manager
    if (window.Banks) {
      Banks.init();
    }
    
    console.log('✅ Services initialized');
  }
  
  // Setup global event listeners
  setupGlobalEventListeners() {
    // Online/Offline status
    window.addEventListener('online', () => {
      this.handleOnlineStatus(true);
    });
    
    window.addEventListener('offline', () => {
      this.handleOnlineStatus(false);
    });
    
    // Unhandled errors
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error);
    });
    
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason);
      event.preventDefault(); // Prevent console error
    });
    
    // Visibility change (app becomes visible/hidden)
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
    
    // Before unload (app closing)
    window.addEventListener('beforeunload', (event) => {
      this.handleBeforeUnload(event);
    });
    
    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
  }
  
  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Don't trigger shortcuts when typing in inputs
      if (event.target.matches('input, textarea, select')) {
        return;
      }
      
      const { ctrlKey, metaKey, shiftKey, altKey, key } = event;
      const isModKey = ctrlKey || metaKey;
      
      // Ctrl/Cmd + K: Search
      if (isModKey && key === 'k') {
        event.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }
      
      // Ctrl/Cmd + N: New bank
      if (isModKey && key === 'n') {
        event.preventDefault();
        if (Auth.isAuthenticated && window.Banks) {
          Banks.showCreateBankModal();
        }
      }
      
      // Ctrl/Cmd + H: Home/Dashboard
      if (isModKey && key === 'h') {
        event.preventDefault();
        if (Auth.isAuthenticated) {
          Auth.showDashboard();
        }
      }
      
      // Escape: Close modals/go back
      if (key === 'Escape') {
        event.preventDefault();
        UI.hideAllModals();
      }
      
      // ? : Show help (future feature)
      if (key === '?' && !isModKey) {
        event.preventDefault();
        this.showKeyboardShortcuts();
      }
    });
  }
  
  // Initialize PWA features
  async initializePWA() {
    if (!CONFIG.ENV.SUPPORTS_SERVICE_WORKER) {
      console.warn('Service Workers not supported');
      return;
    }
    
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered');
      this.serviceWorkerReady = true;
      
      // Listen for service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.handleServiceWorkerUpdate();
          }
        });
      });
      
      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }
  
  // Check authentication state
  async checkAuthState() {
    if (window.Auth) {
      // Auth.init() handles token verification
      console.log('Authentication state checked');
    }
  }
  
  // Setup periodic tasks
  setupPeriodicTasks() {
    // Check for app updates every minute
    setInterval(() => {
      this.checkForUpdates();
    }, CONFIG.PWA.UPDATE_CHECK_INTERVAL);
    
    // Clean up old cache data every 30 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 30 * 60 * 1000);
    
    // Sync pending actions when online (every 5 minutes)
    setInterval(() => {
      if (this.isOnline && window.API) {
        API.processQueue();
      }
    }, 5 * 60 * 1000);
  }
  
  // Handle online/offline status
  handleOnlineStatus(isOnline) {
    this.isOnline = isOnline;
    
    const statusIndicator = document.getElementById('network-status');
    if (statusIndicator) {
      statusIndicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
      statusIndicator.innerHTML = `
        <span class="status-dot"></span>
        ${isOnline ? 'En línea' : 'Sin conexión'}
      `;
    }
    
    if (isOnline) {
      // Process any queued requests
      if (window.API) {
        API.processQueue();
      }
      
      // Refresh data if needed
      this.refreshDataOnReconnect();
    }
  }
  
  // Handle global errors
  handleGlobalError(error) {
    console.error('Global error:', error);
    
    // Don't show error toasts for network errors (they're handled elsewhere)
    if (error && !error.message?.includes('fetch')) {
      UI.showToast('Se ha producido un error inesperado', 'error');
    }
    
    // Log error for debugging
    if (CONFIG.ENV.IS_DEVELOPMENT) {
      console.group('Error Details');
      console.error(error);
      console.trace();
      console.groupEnd();
    }
  }
  
  // Handle visibility changes
  handleVisibilityChange() {
    if (document.hidden) {
      // App became hidden
      console.log('App hidden');
      this.onAppHidden();
    } else {
      // App became visible
      console.log('App visible');
      this.onAppVisible();
    }
  }
  
  // Handle app becoming hidden
  onAppHidden() {
    // Pause any timers or animations
    // Save any unsaved data
  }
  
  // Handle app becoming visible
  onAppVisible() {
    // Resume timers or animations
    // Check for updates
    this.checkForUpdates();
    
    // Refresh data if user has been away for more than 5 minutes
    const lastActivity = localStorage.getItem('last-activity');
    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
      if (timeSinceLastActivity > 5 * 60 * 1000) {
        this.refreshDataOnReconnect();
      }
    }
    
    localStorage.setItem('last-activity', Date.now().toString());
  }
  
  // Handle before unload
  handleBeforeUnload(event) {
    // Save any unsaved data
    localStorage.setItem('last-activity', Date.now().toString());
    
    // Don't show confirmation dialog unless there's unsaved data
    // event.returnValue = 'Are you sure you want to leave?';
  }
  
  // Handle service worker updates
  handleServiceWorkerUpdate() {
    this.updateAvailable = true;
    
    // Show update notification
    const updateToast = UI.createToast(
      'Nueva versión disponible. Haz clic para actualizar.',
      'info'
    );
    
    // Add update button
    const updateButton = document.createElement('button');
    updateButton.textContent = 'Actualizar';
    updateButton.className = 'btn-primary btn-small';
    updateButton.style.marginLeft = '10px';
    
    updateButton.addEventListener('click', () => {
      this.applyUpdate();
    });
    
    updateToast.querySelector('.toast-content').appendChild(updateButton);
    
    const container = document.getElementById('toast-container');
    if (container) {
      container.appendChild(updateToast);
    }
  }
  
  // Handle service worker messages
  handleServiceWorkerMessage(data) {
    console.log('Service Worker message:', data);
    
    switch (data.type) {
      case 'CACHE_UPDATED':
        console.log('Cache updated');
        break;
      case 'OFFLINE_READY':
        UI.showToast('Aplicación lista para usar sin conexión', 'success');
        break;
      default:
        console.log('Unknown service worker message:', data);
    }
  }
  
  // Apply service worker update
  async applyUpdate() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Reload the page after the new service worker takes control
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      }
    }
  }
  
  // Check for app updates
  async checkForUpdates() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    }
  }
  
  // Clean up old cache data
  cleanupCache() {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      
      keys.forEach(key => {
        if (key.includes('cache')) {
          try {
            const cached = JSON.parse(localStorage.getItem(key));
            if (cached && cached.timestamp) {
              const age = now - cached.timestamp;
              // Remove cache older than 1 hour
              if (age > 60 * 60 * 1000) {
                localStorage.removeItem(key);
                console.log('Removed old cache:', key);
              }
            }
          } catch (error) {
            // Invalid cache data, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning cache:', error);
    }
  }
  
  // Refresh data when reconnecting
  async refreshDataOnReconnect() {
    if (!this.isOnline || !Auth.isAuthenticated) return;
    
    try {
      // Refresh banks data
      if (window.Banks) {
        await Banks.loadUserBanks();
      }
      
      // Clear movie cache to get fresh data
      if (window.API) {
        API.clearCache(CONFIG.STORAGE_KEYS.MOVIES_CACHE);
      }
      
      console.log('Data refreshed on reconnect');
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }
  
  // Show welcome message for new users
  showWelcomeMessage() {
    const isFirstVisit = !localStorage.getItem('butaca10-visited');
    
    if (isFirstVisit) {
      localStorage.setItem('butaca10-visited', 'true');
      
      setTimeout(() => {
        UI.showToast('¡Bienvenido a Butaca10! 🎬', 'success', 5000);
      }, 1000);
    }
  }
  
  // Show keyboard shortcuts help
  showKeyboardShortcuts() {
    const shortcuts = [
      'Ctrl/Cmd + K: Buscar películas',
      'Ctrl/Cmd + N: Crear nuevo banco',
      'Ctrl/Cmd + H: Ir al inicio',
      'Ctrl/Cmd + Shift + T: Cambiar tema',
      'Escape: Cerrar modales',
      '?: Mostrar esta ayuda'
    ];
    
    const helpText = shortcuts.join('\n');
    alert(`Atajos de teclado:\n\n${helpText}`);
  }
  
  // Get app info
  getAppInfo() {
    return {
      name: CONFIG.APP.NAME,
      version: this.version,
      isOnline: this.isOnline,
      isAuthenticated: Auth?.isAuthenticated || false,
      serviceWorkerReady: this.serviceWorkerReady,
      updateAvailable: this.updateAvailable,
      theme: Theme?.getCurrentTheme() || 'light'
    };
  }
  
  // Restart the app
  restart() {
    // Clear all data
    localStorage.clear();
    sessionStorage.clear();
    
    // Reload the page
    window.location.reload();
  }
  
  // Export user data (future feature)
  async exportUserData() {
    if (!Auth.isAuthenticated) {
      UI.showToast('Debes iniciar sesión para exportar datos', 'error');
      return;
    }
    
    try {
      const userData = {
        user: Auth.getCurrentUser(),
        banks: await API.getBanks(),
        settings: {
          theme: Theme.getCurrentTheme()
        },
        exportDate: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `butaca10-export-${Date.now()}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      
      UI.showToast('Datos exportados correctamente', 'success');
      
    } catch (error) {
      console.error('Error exporting data:', error);
      UI.showToast('Error al exportar los datos', 'error');
    }
  }
}

// Create and initialize the app
const app = new Butaca10App();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app.init();
  });
} else {
  app.init();
}

// Make app globally available for debugging
if (CONFIG.ENV.IS_DEVELOPMENT) {
  window.Butaca10App = app;
}

// Export for use in other modules
window.App = app;