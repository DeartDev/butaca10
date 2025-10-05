// Theme Manager for Butaca10
class ThemeManager {
  constructor() {
    this.currentTheme = 'light';
    this.systemPreference = this.getSystemPreference();
    this.storageKey = CONFIG.STORAGE_KEYS.THEME;
  }
  
  // Initialize theme manager
  init() {
    this.loadTheme();
    this.setupEventListeners();
    this.watchSystemChanges();
  }
  
  // Setup event listeners
  setupEventListeners() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
    
    // Keyboard shortcut for theme toggle (Ctrl/Cmd + Shift + T)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        this.toggleTheme();
      }
    });
  }
  
  // Get system color scheme preference
  getSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
  
  // Watch for system theme changes
  watchSystemChanges() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', (e) => {
          this.systemPreference = e.matches ? 'dark' : 'light';
          
          // Only auto-switch if user hasn't manually set a preference
          const savedTheme = localStorage.getItem(this.storageKey);
          if (!savedTheme || savedTheme === 'system') {
            this.applyTheme(this.systemPreference);
          }
        });
      }
      // Fallback for older browsers
      else if (mediaQuery.addListener) {
        mediaQuery.addListener((e) => {
          this.systemPreference = e.matches ? 'dark' : 'light';
          
          const savedTheme = localStorage.getItem(this.storageKey);
          if (!savedTheme || savedTheme === 'system') {
            this.applyTheme(this.systemPreference);
          }
        });
      }
    }
  }
  
  // Load theme from storage or system preference
  loadTheme() {
    try {
      const savedTheme = localStorage.getItem(this.storageKey);
      
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        if (savedTheme === 'system') {
          this.currentTheme = this.systemPreference;
        } else {
          this.currentTheme = savedTheme;
        }
      } else {
        // Use system preference as default
        this.currentTheme = this.systemPreference;
      }
      
      this.applyTheme(this.currentTheme);
      
    } catch (error) {
      console.error('Error loading theme:', error);
      this.currentTheme = 'light';
      this.applyTheme(this.currentTheme);
    }
  }
  
  // Toggle between light and dark theme
  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    
    // Show feedback
    const themeNames = {
      light: 'Modo Claro',
      dark: 'Modo Oscuro'
    };
    
    UI.showToast(`${themeNames[newTheme]} activado`, 'info', 2000);
  }
  
  // Set specific theme
  setTheme(theme) {
    if (!['light', 'dark'].includes(theme)) {
      console.error('Invalid theme:', theme);
      return;
    }
    
    this.currentTheme = theme;
    this.applyTheme(theme);
    this.saveTheme(theme);
  }
  
  // Apply theme to DOM
  applyTheme(theme) {
    const root = document.documentElement;
    const body = document.body;
    
    // Remove existing theme classes
    body.classList.remove('theme-light', 'theme-dark');
    root.removeAttribute('data-theme');
    
    // Apply new theme
    body.classList.add(`theme-${theme}`);
    root.setAttribute('data-theme', theme);
    
    // Update theme toggle icon
    this.updateThemeToggleIcon(theme);
    
    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(theme);
    
    // Dispatch theme change event
    this.dispatchThemeChangeEvent(theme);
    
    // Apply theme-specific adjustments
    this.applyThemeAdjustments(theme);
  }
  
  // Update theme toggle icon
  updateThemeToggleIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
      
      const toggleButton = document.getElementById('theme-toggle');
      if (toggleButton) {
        toggleButton.title = theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
      }
    }
  }
  
  // Update meta theme-color for mobile browsers
  updateMetaThemeColor(theme) {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const colors = {
        light: '#E63946',
        dark: '#E63946'
      };
      metaThemeColor.setAttribute('content', colors[theme]);
    }
  }
  
  // Dispatch theme change event for other components
  dispatchThemeChangeEvent(theme) {
    const event = new CustomEvent('themechange', {
      detail: { theme, previousTheme: this.currentTheme }
    });
    window.dispatchEvent(event);
  }
  
  // Apply theme-specific adjustments
  applyThemeAdjustments(theme) {
    // Smooth transition for theme change
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    
    // Reset transition after animation
    setTimeout(() => {
      document.body.style.transition = '';
    }, 300);
    
    // Update charts, maps, or other components that need theme-specific colors
    this.updateThemeSpecificComponents(theme);
  }
  
  // Update components that need theme-specific styling
  updateThemeSpecificComponents(theme) {
    // Update any charts or third-party components
    const charts = document.querySelectorAll('.chart, .graph');
    charts.forEach(chart => {
      chart.classList.toggle('dark-theme', theme === 'dark');
    });
    
    // Update syntax highlighting if any
    const codeBlocks = document.querySelectorAll('pre, code');
    codeBlocks.forEach(block => {
      block.classList.toggle('dark-theme', theme === 'dark');
    });
  }
  
  // Save theme to localStorage
  saveTheme(theme) {
    try {
      localStorage.setItem(this.storageKey, theme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }
  
  // Get current theme
  getCurrentTheme() {
    return this.currentTheme;
  }
  
  // Check if current theme is dark
  isDarkTheme() {
    return this.currentTheme === 'dark';
  }
  
  // Check if current theme is light
  isLightTheme() {
    return this.currentTheme === 'light';
  }
  
  // Get theme colors for dynamic styling
  getThemeColors() {
    const colors = {
      light: {
        primary: '#E63946',
        secondary: '#457B9D',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        textPrimary: '#1E293B',
        textSecondary: '#475569',
        border: '#E2E8F0'
      },
      dark: {
        primary: '#E63946',
        secondary: '#A8DADC',
        background: '#0F172A',
        surface: '#1E293B',
        textPrimary: '#F8FAFC',
        textSecondary: '#CBD5E1',
        border: '#334155'
      }
    };
    
    return colors[this.currentTheme];
  }
  
  // Create color scheme for external libraries
  getColorScheme() {
    const colors = this.getThemeColors();
    
    return {
      background: colors.background,
      surface: colors.surface,
      primary: colors.primary,
      secondary: colors.secondary,
      text: colors.textPrimary,
      textSecondary: colors.textSecondary,
      border: colors.border,
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: colors.primary
    };
  }
  
  // Auto theme based on time of day
  setAutoTheme() {
    const hour = new Date().getHours();
    const isNightTime = hour < 7 || hour > 19; // 7 PM to 7 AM
    
    const autoTheme = isNightTime ? 'dark' : 'light';
    this.setTheme(autoTheme);
    
    return autoTheme;
  }
  
  // Schedule auto theme changes
  scheduleAutoTheme() {
    // Check every hour
    setInterval(() => {
      const savedTheme = localStorage.getItem(this.storageKey);
      if (savedTheme === 'auto') {
        this.setAutoTheme();
      }
    }, 60 * 60 * 1000);
  }
  
  // Apply theme to PWA manifest (for install prompt)
  updateManifestTheme(theme) {
    try {
      // Update the theme color in the manifest
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        fetch(manifestLink.href)
          .then(response => response.json())
          .then(manifest => {
            const colors = this.getThemeColors();
            manifest.theme_color = colors.primary;
            manifest.background_color = colors.background;
            
            // Create new manifest blob
            const manifestBlob = new Blob([JSON.stringify(manifest)], {
              type: 'application/json'
            });
            
            const manifestURL = URL.createObjectURL(manifestBlob);
            manifestLink.href = manifestURL;
          })
          .catch(error => {
            console.error('Error updating manifest theme:', error);
          });
      }
    } catch (error) {
      console.error('Error updating manifest theme:', error);
    }
  }
  
  // Accessibility: Check contrast ratios
  checkContrast() {
    const colors = this.getThemeColors();
    
    // Simple contrast ratio calculation
    const getLuminance = (hex) => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      
      const rsRGB = r / 255;
      const gsRGB = g / 255;
      const bsRGB = b / 255;
      
      const rLin = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
      const gLin = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
      const bLin = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
      
      return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
    };
    
    const getContrastRatio = (color1, color2) => {
      const lum1 = getLuminance(color1);
      const lum2 = getLuminance(color2);
      
      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);
      
      return (brightest + 0.05) / (darkest + 0.05);
    };
    
    const contrast = getContrastRatio(colors.textPrimary, colors.background);
    
    if (contrast < 4.5) {
      console.warn('Low contrast ratio detected:', contrast);
    }
    
    return contrast;
  }
}

// Initialize theme manager
const Theme = new ThemeManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
});

// Listen for theme change events
window.addEventListener('themechange', (e) => {
  console.log('Theme changed to:', e.detail.theme);
  
  // Update any components that need to respond to theme changes
  if (window.Movies) {
    // Movies component theme update
  }
  
  if (window.Banks) {
    // Banks component theme update
  }
});

// Export for use in other modules
window.Theme = Theme;