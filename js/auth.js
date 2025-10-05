// Authentication Manager for Butaca10
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.init();
  }
  
  // Initialize authentication
  async init() {
    try {
      // Check if user data exists in localStorage
      const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
      const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
      
      if (userData && token) {
        this.currentUser = JSON.parse(userData);
        
        // Verify token with backend
        try {
          const response = await API.verifyToken();
          if (response.valid) {
            this.isAuthenticated = true;
            this.showDashboard();
          } else {
            throw new Error('Invalid token');
          }
        } catch (error) {
          console.warn('Token verification failed:', error);
          this.logout();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.logout();
    }
  }
  
  // Login user
  async login(email, password) {
    try {
      UI.showLoading(true);
      
      // Validate input
      if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
      }
      
      if (!this.isValidEmail(email)) {
        throw new Error('Email no válido');
      }
      
      // Call login API
      const response = await API.login(email, password);
      
      if (response.success) {
        // Store user data
        this.currentUser = response.data.user;
        this.isAuthenticated = true;
        
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(response.data.user));
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, response.data.tokens.access_token);
        
        // Show success message
        UI.showToast(CONFIG.MESSAGES.SUCCESS.LOGIN, 'success');
        
        // Navigate to dashboard
        this.showDashboard();
        
        return response;
      } else {
        throw new Error(response.message || CONFIG.MESSAGES.ERRORS.AUTH_FAILED);
      }
    } catch (error) {
      console.error('Login error:', error);
      UI.showToast(error.message || CONFIG.MESSAGES.ERRORS.AUTH_FAILED, 'error');
      throw error;
    } finally {
      UI.showLoading(false);
    }
  }
  
  // Register user
  async register(name, email, password, confirmPassword) {
    try {
      UI.showLoading(true);
      
      // Validate input
      const validation = this.validateRegistration(name, email, password, confirmPassword);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }
      
      // Call register API
      const response = await API.register(name, email, password);
      
      if (response.success) {
        // Store user data
        this.currentUser = response.data.user;
        this.isAuthenticated = true;
        
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(response.data.user));
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, response.data.tokens.access_token);
        
        // Show success message
        UI.showToast(CONFIG.MESSAGES.SUCCESS.REGISTER, 'success');
        
        // Navigate to dashboard
        this.showDashboard();
        
        return response;
      } else {
        throw new Error(response.message || 'Error al crear la cuenta');
      }
    } catch (error) {
      console.error('Registration error:', error);
      UI.showToast(error.message || 'Error al crear la cuenta', 'error');
      throw error;
    } finally {
      UI.showLoading(false);
    }
  }
  
  // Logout user
  async logout() {
    try {
      // Call logout API
      if (this.isAuthenticated) {
        await API.logout();
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local data
      this.currentUser = null;
      this.isAuthenticated = false;
      
      localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
      
      // Clear API cache
      API.clearCache();
      
      // Navigate to auth screen
      this.showAuthScreen();
      
      UI.showToast('Sesión cerrada correctamente', 'info');
    }
  }
  
  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // Validate registration data
  validateRegistration(name, email, password, confirmPassword) {
    if (!name || name.trim().length < 2) {
      return { isValid: false, message: 'El nombre debe tener al menos 2 caracteres' };
    }
    
    if (!email || !this.isValidEmail(email)) {
      return { isValid: false, message: 'Email no válido' };
    }
    
    if (!password || password.length < 6) {
      return { isValid: false, message: 'La contraseña debe tener al menos 6 caracteres' };
    }
    
    if (password !== confirmPassword) {
      return { isValid: false, message: 'Las contraseñas no coinciden' };
    }
    
    // Check password strength
    if (!this.isStrongPassword(password)) {
      return { 
        isValid: false, 
        message: 'La contraseña debe contener al menos una letra mayúscula, una minúscula y un número' 
      };
    }
    
    return { isValid: true };
  }
  
  // Check password strength
  isStrongPassword(password) {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    return hasUpperCase && hasLowerCase && hasNumbers;
  }
  
  // Show authentication screen
  showAuthScreen() {
    UI.hideAllScreens();
    UI.showScreen('auth-screen');
    UI.hideNavbar();
  }
  
  // Show dashboard
  showDashboard() {
    UI.hideAllScreens();
    UI.showScreen('dashboard-screen');
    UI.showNavbar();
    
    // Load dashboard data
    if (window.Movies) {
      Movies.loadPopularMovies();
    }
    
    if (window.Banks) {
      Banks.loadUserBanks();
    }
  }
  
  // Check if user is authenticated
  requireAuth() {
    if (!this.isAuthenticated) {
      UI.showToast(CONFIG.MESSAGES.ERRORS.AUTH_REQUIRED, 'error');
      this.showAuthScreen();
      return false;
    }
    return true;
  }
  
  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }
  
  // Update user data
  updateUserData(userData) {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, ...userData };
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
    }
  }
  
  // Setup event listeners
  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        
        try {
          await this.login(email, password);
        } catch (error) {
          // Error already handled in login method
        }
      });
    }
    
    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;
        
        try {
          await this.register(name, email, password, confirmPassword);
        } catch (error) {
          // Error already handled in register method
        }
      });
    }
    
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        this.switchTab(tab);
      });
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
          await this.logout();
        }
      });
    }
  }
  
  // Switch between login and register tabs
  switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Update forms
    document.querySelectorAll('.auth-form').forEach(form => {
      form.classList.toggle('active', form.id === `${tab}-form`);
    });
    
    // Clear form data
    document.querySelectorAll('.auth-form input').forEach(input => {
      input.value = '';
    });
  }
  
  // Handle authentication errors
  handleAuthError(error) {
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      this.logout();
      return;
    }
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      UI.showToast(CONFIG.MESSAGES.ERRORS.NETWORK, 'error');
      return;
    }
    
    UI.showToast(error.message || CONFIG.MESSAGES.ERRORS.SERVER_ERROR, 'error');
  }
}

// Initialize authentication manager
const Auth = new AuthManager();

// Setup event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Auth.setupEventListeners();
});

// Export for use in other modules
window.Auth = Auth;