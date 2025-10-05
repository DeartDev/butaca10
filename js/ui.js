// UI Manager for Butaca10
class UIManager {
  constructor() {
    this.currentScreen = 'auth-screen';
    this.modals = new Map();
    this.toasts = [];
    this.loadingStack = 0;
  }
  
  // Initialize UI manager
  init() {
    this.setupEventListeners();
    this.setupModals();
    this.initializeScreens();
  }
  
  // Setup global event listeners
  setupEventListeners() {
    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideAllModals();
      }
    });
    
    // Close modals on backdrop click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.hideModal(e.target.id);
      }
    });
    
    // Handle loading screen
    window.addEventListener('load', () => {
      this.hideLoadingScreen();
    });
    
    // Handle PWA install prompt
    this.setupPWAInstall();
  }
  
  // Setup modals
  setupModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      this.modals.set(modal.id, modal);
      
      // Setup close buttons
      const closeButtons = modal.querySelectorAll('.modal-close, .modal-cancel');
      closeButtons.forEach(button => {
        button.addEventListener('click', () => {
          this.hideModal(modal.id);
        });
      });
    });
  }
  
  // Initialize screens
  initializeScreens() {
    // Hide all screens initially
    this.hideAllScreens();
    
    // Show auth screen by default
    this.showScreen('auth-screen');
  }
  
  // Screen management
  showScreen(screenId) {
    this.hideAllScreens();
    
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add('active');
      screen.style.display = 'block';
      this.currentScreen = screenId;
      
      // Add animation
      screen.classList.add('fade-in');
      setTimeout(() => {
        screen.classList.remove('fade-in');
      }, CONFIG.ANIMATIONS.DURATION.NORMAL);
    }
  }
  
  hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
      screen.classList.remove('active');
      screen.style.display = 'none';
    });
  }
  
  getCurrentScreen() {
    return this.currentScreen;
  }
  
  // Navbar management
  showNavbar() {
    const navbar = document.getElementById('navbar');
    if (navbar) {
      navbar.style.display = 'block';
    }
  }
  
  hideNavbar() {
    const navbar = document.getElementById('navbar');
    if (navbar) {
      navbar.style.display = 'none';
    }
  }
  
  // Modal management
  showModal(modalId) {
    const modal = this.modals.get(modalId);
    if (modal) {
      modal.classList.add('active');
      modal.style.display = 'flex';
      
      // Focus management
      const firstInput = modal.querySelector('input, button, select, textarea');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
  }
  
  hideModal(modalId) {
    const modal = this.modals.get(modalId);
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
      
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Clear form data if exists
      const forms = modal.querySelectorAll('form');
      forms.forEach(form => {
        if (form.dataset.clearOnClose !== 'false') {
          form.reset();
        }
      });
    }
  }
  
  hideAllModals() {
    this.modals.forEach((modal, modalId) => {
      this.hideModal(modalId);
    });
  }
  
  // Loading management
  showLoading(show = true) {
    if (show) {
      this.loadingStack++;
    } else {
      this.loadingStack = Math.max(0, this.loadingStack - 1);
    }
    
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      if (this.loadingStack > 0) {
        loadingScreen.classList.remove('hidden');
        loadingScreen.style.display = 'flex';
      } else {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
          if (this.loadingStack === 0) {
            loadingScreen.style.display = 'none';
          }
        }, CONFIG.ANIMATIONS.DURATION.NORMAL);
      }
    }
  }
  
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, CONFIG.ANIMATIONS.DURATION.NORMAL);
    }
  }
  
  // Toast notifications
  showToast(message, type = 'info', duration = CONFIG.UI.TOAST_DURATION) {
    const toast = this.createToast(message, type);
    const container = document.getElementById('toast-container');
    
    if (container) {
      container.appendChild(toast);
      
      // Animate in
      setTimeout(() => {
        toast.classList.add('fade-in');
      }, 10);
      
      // Auto remove
      const toastTimeout = setTimeout(() => {
        this.removeToast(toast);
      }, duration);
      
      // Store reference
      this.toasts.push({ element: toast, timeout: toastTimeout });
      
      // Limit number of toasts
      if (this.toasts.length > 5) {
        const oldestToast = this.toasts.shift();
        clearTimeout(oldestToast.timeout);
        this.removeToast(oldestToast.element);
      }
    }
  }
  
  createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <p class="toast-message">${message}</p>
        <button class="toast-close">&times;</button>
      </div>
    `;
    
    // Setup close button
    const closeButton = toast.querySelector('.toast-close');
    closeButton.addEventListener('click', () => {
      this.removeToast(toast);
    });
    
    return toast;
  }
  
  removeToast(toastElement) {
    if (toastElement && toastElement.parentNode) {
      toastElement.style.opacity = '0';
      toastElement.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        if (toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement);
        }
      }, CONFIG.ANIMATIONS.DURATION.FAST);
      
      // Remove from toasts array
      this.toasts = this.toasts.filter(toast => toast.element !== toastElement);
    }
  }
  
  clearAllToasts() {
    this.toasts.forEach(toast => {
      clearTimeout(toast.timeout);
      this.removeToast(toast.element);
    });
    this.toasts = [];
  }
  
  // Form utilities
  getFormData(formElement) {
    const formData = new FormData(formElement);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    return data;
  }
  
  setFormData(formElement, data) {
    Object.entries(data).forEach(([key, value]) => {
      const input = formElement.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = value;
      }
    });
  }
  
  validateForm(formElement) {
    const requiredFields = formElement.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        this.showFieldError(field, 'Este campo es requerido');
        isValid = false;
      } else {
        this.clearFieldError(field);
      }
    });
    
    return isValid;
  }
  
  showFieldError(fieldElement, message) {
    this.clearFieldError(fieldElement);
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.style.color = 'var(--danger-color)';
    errorElement.style.fontSize = '0.8rem';
    errorElement.style.marginTop = 'var(--spacing-xs)';
    
    fieldElement.style.borderColor = 'var(--danger-color)';
    fieldElement.parentNode.appendChild(errorElement);
  }
  
  clearFieldError(fieldElement) {
    const existingError = fieldElement.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
    fieldElement.style.borderColor = '';
  }
  
  // Animation utilities
  animateElement(element, animationClass, callback) {
    element.addEventListener('animationend', function handler() {
      element.removeEventListener('animationend', handler);
      element.classList.remove(animationClass);
      if (callback) callback();
    });
    
    element.classList.add(animationClass);
  }
  
  fadeIn(element, duration = CONFIG.ANIMATIONS.DURATION.NORMAL) {
    element.style.opacity = '0';
    element.style.display = 'block';
    
    const fade = () => {
      let opacity = 0;
      const timer = setInterval(() => {
        if (opacity >= 1) {
          clearInterval(timer);
        }
        element.style.opacity = opacity;
        opacity += 0.05;
      }, duration / 20);
    };
    
    fade();
  }
  
  fadeOut(element, duration = CONFIG.ANIMATIONS.DURATION.NORMAL, callback) {
    let opacity = 1;
    const timer = setInterval(() => {
      if (opacity <= 0) {
        clearInterval(timer);
        element.style.display = 'none';
        if (callback) callback();
      }
      element.style.opacity = opacity;
      opacity -= 0.05;
    }, duration / 20);
  }
  
  // Utility functions
  scrollToTop(smooth = true) {
    window.scrollTo({
      top: 0,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }
  
  scrollToElement(element, offset = 0) {
    const elementPosition = element.offsetTop - offset;
    window.scrollTo({
      top: elementPosition,
      behavior: 'smooth'
    });
  }
  
  // PWA Install functionality
  setupPWAInstall() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install button or banner
      this.showInstallPrompt(deferredPrompt);
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.showToast('¡Butaca10 instalado correctamente!', 'success');
      deferredPrompt = null;
    });
  }
  
  showInstallPrompt(deferredPrompt) {
    // Create install button
    const installButton = document.createElement('button');
    installButton.textContent = '📱 Instalar App';
    installButton.className = 'btn-secondary';
    installButton.style.position = 'fixed';
    installButton.style.bottom = '20px';
    installButton.style.right = '20px';
    installButton.style.zIndex = '1000';
    
    installButton.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        
        deferredPrompt = null;
        installButton.remove();
      }
    });
    
    document.body.appendChild(installButton);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (installButton.parentNode) {
        installButton.remove();
      }
    }, 10000);
  }
  
  // Responsive utilities
  isMobile() {
    return window.innerWidth <= 768;
  }
  
  isTablet() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
  }
  
  isDesktop() {
    return window.innerWidth > 1024;
  }
  
  // Accessibility utilities
  announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    
    document.body.appendChild(announcement);
    announcement.textContent = message;
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
  
  // Focus management
  trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    });
  }
}

// Initialize UI manager
const UI = new UIManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
});

// Export for use in other modules
window.UI = UI;