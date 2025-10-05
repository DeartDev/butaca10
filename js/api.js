// API Manager for Butaca10
class ApiManager {
  constructor() {
    this.baseUrl = CONFIG.API.BASE_URL;
    this.tmdbBaseUrl = CONFIG.TMDB.BASE_URL;
    this.tmdbApiKey = CONFIG.TMDB.API_KEY;
    this.token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    this.requestQueue = [];
    this.isOnline = navigator.onLine;
    
    // Listen to online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
      UI.showToast('Conexión restaurada', 'success');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      UI.showToast('Modo offline activado', 'info');
    });
  }
  
  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    } else {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    }
  }
  
  // Get default headers
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }
  
  // Generic HTTP request method
  async request(url, options = {}) {
    try {
      const config = {
        method: 'GET',
        headers: this.getHeaders(options.includeAuth !== false),
        ...options
      };
      
      // Add timeout
      const controller = new AbortController();
      config.signal = controller.signal;
      
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, CONFIG.NETWORK.TIMEOUT);
      
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      // Handle different response types
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
      
    } catch (error) {
      // Handle network errors
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      if (!this.isOnline) {
        // Queue request for later if offline
        this.queueRequest(url, options);
        throw new Error('No internet connection');
      }
      
      throw error;
    }
  }
  
  // Queue request for offline processing
  queueRequest(url, options) {
    if (options.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
      this.requestQueue.push({ url, options, timestamp: Date.now() });
    }
  }
  
  // Process queued requests when back online
  async processQueue() {
    if (this.requestQueue.length === 0) return;
    
    const queue = [...this.requestQueue];
    this.requestQueue = [];
    
    for (const queuedRequest of queue) {
      try {
        await this.request(queuedRequest.url, queuedRequest.options);
      } catch (error) {
        console.error('Failed to process queued request:', error);
        // Re-queue if still failing
        this.requestQueue.push(queuedRequest);
      }
    }
  }
  
  // Authentication API calls
  async login(email, password) {
    const data = await this.request(`${this.baseUrl}${CONFIG.API.ENDPOINTS.AUTH.LOGIN}`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      includeAuth: false
    });
    
    if (data.success && data.data && data.data.tokens) {
      this.setToken(data.data.tokens.access_token);
    }
    
    return data;
  }
  
  async register(name, email, password) {
    const data = await this.request(`${this.baseUrl}${CONFIG.API.ENDPOINTS.AUTH.REGISTER}`, {
      method: 'POST',
      body: JSON.stringify({ nombre: name, email, password }),
      includeAuth: false
    });
    
    if (data.success && data.data && data.data.tokens) {
      this.setToken(data.data.tokens.access_token);
    }
    
    return data;
  }
  
  async logout() {
    try {
      await this.request(`${this.baseUrl}${CONFIG.API.ENDPOINTS.AUTH.LOGOUT}`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.setToken(null);
    }
  }
  
  async verifyToken() {
    try {
      const data = await this.request(`${this.baseUrl}${CONFIG.API.ENDPOINTS.AUTH.VERIFY_TOKEN}`);
      return data;
    } catch (error) {
      this.setToken(null);
      throw error;
    }
  }
  
  // Banks API calls
  async getBanks() {
    const cacheKey = CONFIG.STORAGE_KEYS.BANKS_CACHE;
    const cached = this.getCache(cacheKey);
    
    if (cached && !this.isCacheExpired(cached.timestamp)) {
      return cached.data;
    }
    
    try {
      const data = await this.request(`${this.baseUrl}${CONFIG.API.ENDPOINTS.BANKS.LIST}`);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      if (cached) {
        console.warn('Using stale cache due to network error');
        return cached.data;
      }
      throw error;
    }
  }
  
  async createBank(name) {
    const data = await this.request(`${this.baseUrl}${CONFIG.API.ENDPOINTS.BANKS.CREATE}`, {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    
    // Invalidate cache
    this.clearCache(CONFIG.STORAGE_KEYS.BANKS_CACHE);
    
    return data;
  }
  
  async deleteBank(bankId) {
    const data = await this.request(`${this.baseUrl}${CONFIG.API.ENDPOINTS.BANKS.DELETE}`, {
      method: 'DELETE',
      body: JSON.stringify({ bankId })
    });
    
    // Invalidate cache
    this.clearCache(CONFIG.STORAGE_KEYS.BANKS_CACHE);
    
    return data;
  }
  
  async getBank(bankId) {
    return await this.request(`${this.baseUrl}${CONFIG.API.ENDPOINTS.BANKS.GET}?id=${bankId}`);
  }
  
  async addMovieToBank(bankId, movie) {
    const data = await this.request(`${this.baseUrl}${CONFIG.API.ENDPOINTS.BANKS.ADD_MOVIE}`, {
      method: 'POST',
      body: JSON.stringify({ bankId, movie })
    });
    
    // Invalidate cache
    this.clearCache(CONFIG.STORAGE_KEYS.BANKS_CACHE);
    
    return data;
  }
  
  async removeMovieFromBank(bankId, movieId) {
    const data = await this.request(`${this.baseUrl}${CONFIG.API.ENDPOINTS.BANKS.REMOVE_MOVIE}`, {
      method: 'DELETE',
      body: JSON.stringify({ bankId, movieId })
    });
    
    // Invalidate cache
    this.clearCache(CONFIG.STORAGE_KEYS.BANKS_CACHE);
    
    return data;
  }
  
  async markMovieAsWatched(bankId, movieId) {
    const data = await this.request(`${this.baseUrl}${CONFIG.API.ENDPOINTS.BANKS.MARK_WATCHED}`, {
      method: 'POST',
      body: JSON.stringify({ bankId, movieId })
    });
    
    // Invalidate cache
    this.clearCache(CONFIG.STORAGE_KEYS.BANKS_CACHE);
    
    return data;
  }
  
  // TMDB API calls
  async getPopularMovies(page = 1) {
    const cacheKey = `${CONFIG.STORAGE_KEYS.MOVIES_CACHE}-popular-${page}`;
    const cached = this.getCache(cacheKey);
    
    if (cached && !this.isCacheExpired(cached.timestamp)) {
      return cached.data;
    }
    
    try {
      const url = `${this.tmdbBaseUrl}/movie/popular?api_key=${this.tmdbApiKey}&language=es-ES&page=${page}`;
      const data = await this.request(url, { includeAuth: false });
      
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      if (cached) {
        console.warn('Using stale cache due to network error');
        return cached.data;
      }
      throw error;
    }
  }
  
  async searchMovies(query, page = 1) {
    if (!query.trim()) return { results: [] };
    
    const url = `${this.tmdbBaseUrl}/search/movie?api_key=${this.tmdbApiKey}&language=es-ES&query=${encodeURIComponent(query)}&page=${page}`;
    return await this.request(url, { includeAuth: false });
  }
  
  async getMoviesByGenre(genreId, page = 1) {
    const cacheKey = `${CONFIG.STORAGE_KEYS.MOVIES_CACHE}-genre-${genreId}-${page}`;
    const cached = this.getCache(cacheKey);
    
    if (cached && !this.isCacheExpired(cached.timestamp)) {
      return cached.data;
    }
    
    try {
      const url = `${this.tmdbBaseUrl}/discover/movie?api_key=${this.tmdbApiKey}&language=es-ES&with_genres=${genreId}&page=${page}`;
      const data = await this.request(url, { includeAuth: false });
      
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      if (cached) {
        console.warn('Using stale cache due to network error');
        return cached.data;
      }
      throw error;
    }
  }
  
  async getMoviesByYear(year, page = 1) {
    const cacheKey = `${CONFIG.STORAGE_KEYS.MOVIES_CACHE}-year-${year}-${page}`;
    const cached = this.getCache(cacheKey);
    
    if (cached && !this.isCacheExpired(cached.timestamp)) {
      return cached.data;
    }
    
    try {
      const url = `${this.tmdbBaseUrl}/discover/movie?api_key=${this.tmdbApiKey}&language=es-ES&primary_release_year=${year}&page=${page}`;
      const data = await this.request(url, { includeAuth: false });
      
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      if (cached) {
        console.warn('Using stale cache due to network error');
        return cached.data;
      }
      throw error;
    }
  }
  
  async getMovieDetails(movieId) {
    const cacheKey = `${CONFIG.STORAGE_KEYS.MOVIES_CACHE}-details-${movieId}`;
    const cached = this.getCache(cacheKey);
    
    if (cached && !this.isCacheExpired(cached.timestamp)) {
      return cached.data;
    }
    
    try {
      const url = `${this.tmdbBaseUrl}/movie/${movieId}?api_key=${this.tmdbApiKey}&language=es-ES`;
      const data = await this.request(url, { includeAuth: false });
      
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      if (cached) {
        console.warn('Using stale cache due to network error');
        return cached.data;
      }
      throw error;
    }
  }
  
  // Cache management
  setCache(key, data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }
  
  getCache(key) {
    try {
      const cached = localStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Failed to get cached data:', error);
      return null;
    }
  }
  
  clearCache(key) {
    try {
      if (key) {
        localStorage.removeItem(key);
      } else {
        // Clear all cache
        Object.values(CONFIG.STORAGE_KEYS).forEach(storageKey => {
          if (storageKey.includes('cache')) {
            localStorage.removeItem(storageKey);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
  
  isCacheExpired(timestamp) {
    return Date.now() - timestamp > CONFIG.APP.CACHE_DURATION;
  }
  
  // Utility methods
  getTMDBImageUrl(path, size = 'w500') {
    if (!path) return '/icons/icon-192x192.png'; // Fallback image
    return `${CONFIG.TMDB.IMAGE_BASE_URL}/${size}${path}`;
  }
  
  // Retry mechanism for failed requests
  async retryRequest(requestFn, maxRetries = CONFIG.NETWORK.RETRY_ATTEMPTS) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries - 1) {
          const delay = CONFIG.NETWORK.RETRY_DELAY * Math.pow(2, i); // Exponential backoff
          await CONFIG.UTILS.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }
}

// Initialize API manager
const API = new ApiManager();

// Export for use in other modules
window.API = API;