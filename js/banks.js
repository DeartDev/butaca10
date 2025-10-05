// Banks Manager for Butaca10
class BanksManager {
  constructor() {
    this.userBanks = [];
    this.currentBank = null;
    this.isLoading = false;
  }
  
  // Initialize banks manager
  init() {
    this.setupEventListeners();
  }
  
  // Setup event listeners
  setupEventListeners() {
    // My banks button
    const myBanksBtn = document.getElementById('my-banks-btn');
    if (myBanksBtn) {
      myBanksBtn.addEventListener('click', () => {
        if (!Auth.requireAuth()) return;
        this.showBanksScreen();
      });
    }
    
    // Create bank button
    const createBankBtn = document.getElementById('create-bank-btn');
    if (createBankBtn) {
      createBankBtn.addEventListener('click', () => {
        if (!Auth.requireAuth()) return;
        this.showCreateBankModal();
      });
    }
    
    // Create bank form
    const createBankForm = document.getElementById('create-bank-form');
    if (createBankForm) {
      createBankForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.createBank();
      });
    }
    
    // Back to dashboard button
    const backToDashboard = document.getElementById('back-to-dashboard');
    if (backToDashboard) {
      backToDashboard.addEventListener('click', () => {
        this.showDashboard();
      });
    }
    
    // Back to banks button
    const backToBanks = document.getElementById('back-to-banks');
    if (backToBanks) {
      backToBanks.addEventListener('click', () => {
        this.showBanksScreen();
      });
    }
    
    // Random movie button
    const randomMovieBtn = document.getElementById('random-movie-btn');
    if (randomMovieBtn) {
      randomMovieBtn.addEventListener('click', () => {
        this.selectRandomMovie();
      });
    }
    
    // Delete bank button
    const deleteBankBtn = document.getElementById('delete-bank-btn');
    if (deleteBankBtn) {
      deleteBankBtn.addEventListener('click', () => {
        this.confirmDeleteBank();
      });
    }
    
    // Mark as watched button
    const markAsWatchedBtn = document.getElementById('mark-as-watched');
    if (markAsWatchedBtn) {
      markAsWatchedBtn.addEventListener('click', () => {
        this.markRandomMovieAsWatched();
      });
    }
  }
  
  // Load user banks
  async loadUserBanks() {
    if (!Auth.isAuthenticated) return;
    
    try {
      this.isLoading = true;
      
      const response = await API.getBanks();
      this.userBanks = response.banks || [];
      
      // Update my banks button
      this.updateMyBanksButton();
      
      // If we're on the banks screen, render them
      if (UI.getCurrentScreen() === 'banks-screen') {
        this.renderBanks();
      }
      
    } catch (error) {
      console.error('Error loading user banks:', error);
      UI.showToast('Error al cargar los bancos', 'error');
    } finally {
      this.isLoading = false;
    }
  }
  
  // Update my banks button text
  updateMyBanksButton() {
    const myBanksBtn = document.getElementById('my-banks-btn');
    if (myBanksBtn) {
      const count = this.userBanks.length;
      myBanksBtn.textContent = `Mis Bancos (${count})`;
    }
  }
  
  // Show banks screen
  showBanksScreen() {
    UI.hideAllScreens();
    UI.showScreen('banks-screen');
    this.renderBanks();
  }
  
  // Show dashboard
  showDashboard() {
    UI.hideAllScreens();
    UI.showScreen('dashboard-screen');
  }
  
  // Render banks grid
  renderBanks() {
    const banksGrid = document.getElementById('banks-grid');
    if (!banksGrid) return;
    
    if (this.userBanks.length === 0) {
      this.showEmptyBanksState();
      return;
    }
    
    banksGrid.innerHTML = this.userBanks.map(bank => this.createBankCard(bank)).join('');
    
    // Setup bank card event listeners
    this.setupBankCardListeners();
  }
  
  // Create bank card HTML
  createBankCard(bank) {
    const totalMovies = (bank.pending_count || 0) + (bank.watched_count || 0);
    const watchedPercentage = totalMovies > 0 ? Math.round((bank.watched_count || 0) / totalMovies * 100) : 0;
    
    return `
      <div class="bank-card" data-bank-id="${bank.id}">
        <div class="bank-header">
          <h3 class="bank-name">${bank.name}</h3>
          <div class="bank-menu">
            <button class="bank-menu-btn">⋮</button>
          </div>
        </div>
        
        <div class="bank-stats">
          <div class="bank-stat">
            <span class="bank-stat-number">${bank.pending_count || 0}</span>
            <span class="bank-stat-label">Pendientes</span>
          </div>
          <div class="bank-stat">
            <span class="bank-stat-number">${bank.watched_count || 0}</span>
            <span class="bank-stat-label">Vistas</span>
          </div>
        </div>
        
        <div class="bank-progress">
          <div class="bank-progress-label">
            <span>Progreso</span>
            <span>${watchedPercentage}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${watchedPercentage}%"></div>
          </div>
        </div>
        
        <div class="bank-actions">
          <button class="btn-primary btn-small view-bank-btn">Ver Banco</button>
          ${(bank.pending_count || 0) > 0 ? '<button class="btn-secondary btn-small random-btn">🎲 Aleatoria</button>' : ''}
        </div>
      </div>
    `;
  }
  
  // Setup bank card event listeners
  setupBankCardListeners() {
    // View bank buttons
    document.querySelectorAll('.view-bank-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const bankCard = e.target.closest('.bank-card');
        const bankId = bankCard.dataset.bankId;
        this.viewBank(bankId);
      });
    });
    
    // Random movie buttons
    document.querySelectorAll('.random-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const bankCard = e.target.closest('.bank-card');
        const bankId = bankCard.dataset.bankId;
        this.selectRandomMovieFromBank(bankId);
      });
    });
    
    // Bank card click
    document.querySelectorAll('.bank-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const bankId = card.dataset.bankId;
        this.viewBank(bankId);
      });
    });
  }
  
  // Show create bank modal
  showCreateBankModal() {
    if (this.userBanks.length >= CONFIG.APP.MAX_BANKS) {
      UI.showToast(CONFIG.MESSAGES.ERRORS.MAX_BANKS_REACHED, 'warning');
      return;
    }
    
    // Clear form
    const bankNameInput = document.getElementById('bank-name');
    if (bankNameInput) {
      bankNameInput.value = '';
    }
    
    UI.showModal('create-bank-modal');
  }
  
  // Create bank
  async createBank() {
    try {
      const bankNameInput = document.getElementById('bank-name');
      const bankName = bankNameInput.value.trim();
      
      if (!bankName) {
        UI.showToast('El nombre del banco es requerido', 'error');
        return;
      }
      
      if (bankName.length < 3) {
        UI.showToast('El nombre debe tener al menos 3 caracteres', 'error');
        return;
      }
      
      if (bankName.length > 50) {
        UI.showToast('El nombre no puede exceder 50 caracteres', 'error');
        return;
      }
      
      // Check for duplicate names
      if (this.userBanks.some(bank => bank.name.toLowerCase() === bankName.toLowerCase())) {
        UI.showToast('Ya tienes un banco con ese nombre', 'error');
        return;
      }
      
      UI.showLoading(true);
      
      const response = await API.createBank(bankName);
      
      if (response.success) {
        UI.showToast(CONFIG.MESSAGES.SUCCESS.BANK_CREATED, 'success');
        UI.hideModal('create-bank-modal');
        
        // Reload banks
        await this.loadUserBanks();
        
        // If we're on the banks screen, refresh the view
        if (UI.getCurrentScreen() === 'banks-screen') {
          this.renderBanks();
        }
      } else {
        throw new Error(response.message || 'Error al crear el banco');
      }
      
    } catch (error) {
      console.error('Error creating bank:', error);
      UI.showToast(error.message || 'Error al crear el banco', 'error');
    } finally {
      UI.showLoading(false);
    }
  }
  
  // View bank details
  async viewBank(bankId) {
    try {
      UI.showLoading(true);
      
      const response = await API.getBank(bankId);
      this.currentBank = response.bank;
      
      if (!this.currentBank) {
        throw new Error(CONFIG.MESSAGES.ERRORS.BANK_NOT_FOUND);
      }
      
      this.showBankDetailScreen();
      
    } catch (error) {
      console.error('Error loading bank details:', error);
      UI.showToast(error.message || 'Error al cargar el banco', 'error');
    } finally {
      UI.showLoading(false);
    }
  }
  
  // Show bank detail screen
  showBankDetailScreen() {
    if (!this.currentBank) return;
    
    UI.hideAllScreens();
    UI.showScreen('bank-detail-screen');
    
    // Update bank title
    const bankTitle = document.getElementById('bank-detail-title');
    if (bankTitle) {
      bankTitle.textContent = this.currentBank.name;
    }
    
    // Render bank movies
    this.renderBankMovies();
    
    // Update counts
    this.updateBankCounts();
  }
  
  // Render bank movies
  renderBankMovies() {
    if (!this.currentBank) return;
    
    const pendingMovies = this.currentBank.movies?.filter(movie => !movie.is_watched) || [];
    const watchedMovies = this.currentBank.movies?.filter(movie => movie.is_watched) || [];
    
    // Render pending movies
    const pendingContainer = document.getElementById('pending-movies');
    if (pendingContainer) {
      if (pendingMovies.length === 0) {
        pendingContainer.innerHTML = this.createEmptyMoviesState('No hay películas pendientes');
      } else {
        pendingContainer.innerHTML = pendingMovies.map(movie => this.createBankMovieCard(movie, false)).join('');
      }
    }
    
    // Render watched movies
    const watchedContainer = document.getElementById('watched-movies');
    if (watchedContainer) {
      if (watchedMovies.length === 0) {
        watchedContainer.innerHTML = this.createEmptyMoviesState('No hay películas vistas');
      } else {
        watchedContainer.innerHTML = watchedMovies.map(movie => this.createBankMovieCard(movie, true)).join('');
      }
    }
    
    // Setup movie card listeners
    this.setupBankMovieListeners();
  }
  
  // Create bank movie card HTML
  createBankMovieCard(movie, isWatched) {
    const posterUrl = API.getTMDBImageUrl(movie.poster_path, 'w300');
    
    return `
      <div class="bank-movie-card ${isWatched ? 'watched' : ''}" data-movie-id="${movie.id}">
        <div class="bank-movie-poster">
          <img src="${posterUrl}" alt="${movie.title}" loading="lazy">
          <div class="bank-movie-actions">
            <button class="bank-movie-action remove-movie-btn" data-movie-id="${movie.id}" title="Eliminar">
              🗑️
            </button>
          </div>
        </div>
        <div class="bank-movie-info">
          <h4 class="bank-movie-title">${movie.title}</h4>
        </div>
      </div>
    `;
  }
  
  // Setup bank movie listeners
  setupBankMovieListeners() {
    // Remove movie buttons
    document.querySelectorAll('.remove-movie-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.stopPropagation();
        const movieId = button.dataset.movieId;
        await this.removeMovieFromBank(movieId);
      });
    });
  }
  
  // Update bank counts
  updateBankCounts() {
    if (!this.currentBank) return;
    
    const pendingCount = this.currentBank.movies?.filter(movie => !movie.is_watched).length || 0;
    const watchedCount = this.currentBank.movies?.filter(movie => movie.is_watched).length || 0;
    
    const pendingCountEl = document.getElementById('pending-count');
    const watchedCountEl = document.getElementById('watched-count');
    
    if (pendingCountEl) pendingCountEl.textContent = pendingCount;
    if (watchedCountEl) watchedCountEl.textContent = watchedCount;
  }
  
  // Select random movie
  async selectRandomMovie() {
    if (!this.currentBank) return;
    
    const pendingMovies = this.currentBank.movies?.filter(movie => !movie.is_watched) || [];
    
    if (pendingMovies.length === 0) {
      UI.showToast(CONFIG.MESSAGES.ERRORS.EMPTY_BANK, 'warning');
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * pendingMovies.length);
    const selectedMovie = pendingMovies[randomIndex];
    
    this.showRandomMovieModal(selectedMovie);
  }
  
  // Select random movie from bank (from banks grid)
  async selectRandomMovieFromBank(bankId) {
    try {
      UI.showLoading(true);
      
      const response = await API.getBank(bankId);
      const bank = response.bank;
      
      if (!bank) {
        throw new Error(CONFIG.MESSAGES.ERRORS.BANK_NOT_FOUND);
      }
      
      const pendingMovies = bank.movies?.filter(movie => !movie.is_watched) || [];
      
      if (pendingMovies.length === 0) {
        UI.showToast(CONFIG.MESSAGES.ERRORS.EMPTY_BANK, 'warning');
        return;
      }
      
      const randomIndex = Math.floor(Math.random() * pendingMovies.length);
      const selectedMovie = pendingMovies[randomIndex];
      
      // Set current bank for marking as watched
      this.currentBank = bank;
      
      this.showRandomMovieModal(selectedMovie);
      
    } catch (error) {
      console.error('Error selecting random movie:', error);
      UI.showToast(error.message || 'Error al seleccionar película', 'error');
    } finally {
      UI.showLoading(false);
    }
  }
  
  // Show random movie modal
  showRandomMovieModal(movie) {
    this.selectedRandomMovie = movie;
    
    const modalContent = document.getElementById('random-movie-content');
    if (modalContent) {
      const posterUrl = API.getTMDBImageUrl(movie.poster_path, 'w300');
      const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
      const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
      const runtime = movie.runtime ? CONFIG.UTILS.formatRuntime(movie.runtime) : 'N/A';
      
      modalContent.innerHTML = `
        <div class="random-movie-content">
          <div class="random-movie-poster">
            <img src="${posterUrl}" alt="${movie.title}">
          </div>
          <div class="random-movie-details">
            <h3 class="random-movie-title">${movie.title}</h3>
            <div class="random-movie-meta">
              <span>📅 ${year}</span>
              <span>⭐ ${rating}</span>
              <span>⏱️ ${runtime}</span>
            </div>
            <p class="random-movie-overview">${movie.overview || 'No hay descripción disponible.'}</p>
          </div>
        </div>
      `;
    }
    
    UI.showModal('random-movie-modal');
  }
  
  // Mark random movie as watched
  async markRandomMovieAsWatched() {
    if (!this.selectedRandomMovie || !this.currentBank) return;
    
    try {
      UI.showLoading(true);
      
      const response = await API.markMovieAsWatched(this.currentBank.id, this.selectedRandomMovie.id);
      
      if (response.success) {
        UI.showToast(CONFIG.MESSAGES.SUCCESS.MOVIE_WATCHED, 'success');
        UI.hideModal('random-movie-modal');
        
        // Reload current bank if we're viewing it
        if (UI.getCurrentScreen() === 'bank-detail-screen') {
          await this.viewBank(this.currentBank.id);
        }
        
        // Reload banks list
        await this.loadUserBanks();
        
      } else {
        throw new Error(response.message || 'Error al marcar como vista');
      }
      
    } catch (error) {
      console.error('Error marking movie as watched:', error);
      UI.showToast(error.message || 'Error al marcar como vista', 'error');
    } finally {
      UI.showLoading(false);
    }
  }
  
  // Remove movie from bank
  async removeMovieFromBank(movieId) {
    if (!this.currentBank) return;
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta película del banco?')) {
      return;
    }
    
    try {
      UI.showLoading(true);
      
      const response = await API.removeMovieFromBank(this.currentBank.id, movieId);
      
      if (response.success) {
        UI.showToast(CONFIG.MESSAGES.SUCCESS.MOVIE_REMOVED, 'success');
        
        // Reload current bank
        await this.viewBank(this.currentBank.id);
        
        // Reload banks list
        await this.loadUserBanks();
        
      } else {
        throw new Error(response.message || 'Error al eliminar la película');
      }
      
    } catch (error) {
      console.error('Error removing movie from bank:', error);
      UI.showToast(error.message || 'Error al eliminar la película', 'error');
    } finally {
      UI.showLoading(false);
    }
  }
  
  // Confirm delete bank
  confirmDeleteBank() {
    if (!this.currentBank) return;
    
    const confirmMessage = `¿Estás seguro de que quieres eliminar el banco "${this.currentBank.name}"? Esta acción no se puede deshacer.`;
    
    if (confirm(confirmMessage)) {
      this.deleteBank();
    }
  }
  
  // Delete bank
  async deleteBank() {
    if (!this.currentBank) return;
    
    try {
      UI.showLoading(true);
      
      const response = await API.deleteBank(this.currentBank.id);
      
      if (response.success) {
        UI.showToast(CONFIG.MESSAGES.SUCCESS.BANK_DELETED, 'success');
        
        // Go back to banks screen
        this.showBanksScreen();
        
        // Reload banks
        await this.loadUserBanks();
        
      } else {
        throw new Error(response.message || 'Error al eliminar el banco');
      }
      
    } catch (error) {
      console.error('Error deleting bank:', error);
      UI.showToast(error.message || 'Error al eliminar el banco', 'error');
    } finally {
      UI.showLoading(false);
    }
  }
  
  // Show empty banks state
  showEmptyBanksState() {
    const banksGrid = document.getElementById('banks-grid');
    if (!banksGrid) return;
    
    banksGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏦</div>
        <h3 class="empty-state-title">No tienes bancos creados</h3>
        <p class="empty-state-description">Crea tu primer banco de películas para empezar a organizarlas</p>
        <button class="btn-primary" onclick="Banks.showCreateBankModal()">Crear Primer Banco</button>
      </div>
    `;
  }
  
  // Create empty movies state
  createEmptyMoviesState(message) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🎬</div>
        <p class="empty-state-description">${message}</p>
      </div>
    `;
  }
}

// Initialize banks manager
const Banks = new BanksManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Banks.init();
});

// Export for use in other modules
window.Banks = Banks;