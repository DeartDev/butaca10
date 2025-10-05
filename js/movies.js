// Movies Manager for Butaca10
class MoviesManager {
  constructor() {
    this.currentMovies = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.currentGenre = '';
    this.currentYear = '';
    this.currentSearch = '';
    this.isLoading = false;
    this.loadingMore = false;
    
    this.debounceSearch = CONFIG.UTILS.debounce(this.performSearch.bind(this), CONFIG.UI.DEBOUNCE_DELAY);
  }
  
  // Initialize movies manager
  init() {
    this.setupEventListeners();
    this.populateFilters();
  }
  
  // Setup event listeners
  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.currentSearch = e.target.value.trim();
        this.debounceSearch();
      });
    }
    
    // Genre filter
    const genreFilter = document.getElementById('genre-filter');
    if (genreFilter) {
      genreFilter.addEventListener('change', (e) => {
        this.currentGenre = e.target.value;
        this.resetAndLoad();
      });
    }
    
    // Year filter
    const yearFilter = document.getElementById('year-filter');
    if (yearFilter) {
      yearFilter.addEventListener('change', (e) => {
        this.currentYear = e.target.value;
        this.resetAndLoad();
      });
    }
    
    // Load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        this.loadMoreMovies();
      });
    }
    
    // Infinite scroll
    this.setupInfiniteScroll();
  }
  
  // Populate filter dropdowns
  populateFilters() {
    // Populate genres
    const genreFilter = document.getElementById('genre-filter');
    if (genreFilter) {
      Object.entries(CONFIG.APP.GENRES).forEach(([id, name]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        genreFilter.appendChild(option);
      });
    }
    
    // Populate years
    const yearFilter = document.getElementById('year-filter');
    if (yearFilter) {
      CONFIG.APP.YEARS.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
      });
    }
  }
  
  // Load popular movies
  async loadPopularMovies(page = 1) {
    if (this.isLoading) return;
    
    try {
      this.isLoading = true;
      this.showMoviesLoading(page === 1);
      
      const response = await API.getPopularMovies(page);
      
      if (page === 1) {
        this.currentMovies = response.results;
      } else {
        this.currentMovies = [...this.currentMovies, ...response.results];
      }
      
      this.currentPage = page;
      this.totalPages = response.total_pages;
      
      this.renderMovies();
      this.updateLoadMoreButton();
      
    } catch (error) {
      console.error('Error loading popular movies:', error);
      UI.showToast('Error al cargar las películas', 'error');
      
      if (page === 1) {
        this.showEmptyState('Error al cargar las películas');
      }
    } finally {
      this.isLoading = false;
      this.hideMoviesLoading();
    }
  }
  
  // Perform search
  async performSearch() {
    if (!this.currentSearch && !this.currentGenre && !this.currentYear) {
      this.loadPopularMovies();
      return;
    }
    
    try {
      this.isLoading = true;
      this.showMoviesLoading(true);
      
      let response;
      
      if (this.currentSearch) {
        response = await API.searchMovies(this.currentSearch);
      } else if (this.currentGenre && this.currentYear) {
        // Custom filter combining genre and year would need backend support
        response = await API.getMoviesByGenre(this.currentGenre);
        // Filter by year client-side for now
        response.results = response.results.filter(movie => {
          const movieYear = new Date(movie.release_date).getFullYear();
          return movieYear.toString() === this.currentYear;
        });
      } else if (this.currentGenre) {
        response = await API.getMoviesByGenre(this.currentGenre);
      } else if (this.currentYear) {
        response = await API.getMoviesByYear(this.currentYear);
      }
      
      this.currentMovies = response.results || [];
      this.currentPage = 1;
      this.totalPages = response.total_pages || 1;
      
      this.renderMovies();
      this.updateLoadMoreButton();
      
    } catch (error) {
      console.error('Error searching movies:', error);
      UI.showToast('Error en la búsqueda', 'error');
      this.showEmptyState('Error en la búsqueda');
    } finally {
      this.isLoading = false;
      this.hideMoviesLoading();
    }
  }
  
  // Reset filters and load movies
  resetAndLoad() {
    this.currentPage = 1;
    this.currentMovies = [];
    
    if (this.currentSearch) {
      this.performSearch();
    } else {
      this.loadPopularMovies();
    }
  }
  
  // Load more movies
  async loadMoreMovies() {
    if (this.loadingMore || this.currentPage >= this.totalPages) return;
    
    try {
      this.loadingMore = true;
      const nextPage = this.currentPage + 1;
      
      let response;
      
      if (this.currentSearch) {
        response = await API.searchMovies(this.currentSearch, nextPage);
      } else if (this.currentGenre) {
        response = await API.getMoviesByGenre(this.currentGenre, nextPage);
      } else if (this.currentYear) {
        response = await API.getMoviesByYear(this.currentYear, nextPage);
      } else {
        response = await API.getPopularMovies(nextPage);
      }
      
      this.currentMovies = [...this.currentMovies, ...response.results];
      this.currentPage = nextPage;
      
      this.renderMovies();
      this.updateLoadMoreButton();
      
    } catch (error) {
      console.error('Error loading more movies:', error);
      UI.showToast('Error al cargar más películas', 'error');
    } finally {
      this.loadingMore = false;
    }
  }
  
  // Render movies grid
  renderMovies() {
    const moviesGrid = document.getElementById('movies-grid');
    if (!moviesGrid) return;
    
    if (this.currentMovies.length === 0) {
      this.showEmptyState('No se encontraron películas');
      return;
    }
    
    moviesGrid.innerHTML = this.currentMovies.map(movie => this.createMovieCard(movie)).join('');
    
    // Setup movie card event listeners
    this.setupMovieCardListeners();
  }
  
  // Create movie card HTML
  createMovieCard(movie) {
    const posterUrl = API.getTMDBImageUrl(movie.poster_path, CONFIG.TMDB.IMAGE_SIZES.poster);
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const genres = movie.genre_ids ? movie.genre_ids.map(id => CONFIG.APP.GENRES[id]).filter(Boolean).slice(0, 3) : [];
    
    return `
      <div class="movie-card" data-movie-id="${movie.id}">
        <div class="movie-poster">
          <img src="${posterUrl}" alt="${movie.title}" loading="lazy">
          <div class="movie-rating">
            ⭐ ${rating}
          </div>
        </div>
        <div class="movie-info">
          <h3 class="movie-title">${movie.title}</h3>
          <p class="movie-year">${year}</p>
          <div class="movie-genres">
            ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
          </div>
          <p class="movie-overview">${CONFIG.UTILS.truncateText(movie.overview, 120)}</p>
          <div class="movie-actions">
            <button class="btn-primary btn-small add-to-bank-btn" data-movie='${JSON.stringify(movie)}'>
              + Añadir a Banco
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  // Setup movie card event listeners
  setupMovieCardListeners() {
    // Add to bank buttons
    document.querySelectorAll('.add-to-bank-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if (!Auth.requireAuth()) return;
        
        try {
          const movieData = JSON.parse(button.dataset.movie);
          this.showAddToBankModal(movieData);
        } catch (error) {
          console.error('Error parsing movie data:', error);
          UI.showToast('Error al procesar la película', 'error');
        }
      });
    });
    
    // Movie card click for details
    document.querySelectorAll('.movie-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking on buttons
        if (e.target.closest('button')) return;
        
        const movieId = card.dataset.movieId;
        this.showMovieDetails(movieId);
      });
    });
  }
  
  // Show add to bank modal
  async showAddToBankModal(movie) {
    try {
      // Get user banks
      const banksResponse = await API.getBanks();
      const banks = banksResponse.banks || [];
      
      if (banks.length === 0) {
        UI.showToast('Primero debes crear un banco de películas', 'info');
        return;
      }
      
      // Store current movie
      this.currentMovieToAdd = movie;
      
      // Populate banks list
      const banksList = document.getElementById('banks-list');
      if (banksList) {
        banksList.innerHTML = banks.map(bank => `
          <div class="bank-option" data-bank-id="${bank.id}">
            <div class="bank-option-info">
              <h4 class="bank-option-name">${bank.name}</h4>
              <p class="bank-option-count">${bank.movie_count || 0} películas</p>
            </div>
            <button class="bank-option-add">Añadir</button>
          </div>
        `).join('');
        
        // Setup bank option listeners
        banksList.querySelectorAll('.bank-option-add').forEach(button => {
          button.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            const bankOption = e.target.closest('.bank-option');
            const bankId = bankOption.dataset.bankId;
            
            await this.addMovieToBank(bankId, movie);
          });
        });
      }
      
      // Show modal
      UI.showModal('add-to-bank-modal');
      
    } catch (error) {
      console.error('Error loading banks:', error);
      UI.showToast('Error al cargar los bancos', 'error');
    }
  }
  
  // Add movie to bank
  async addMovieToBank(bankId, movie) {
    try {
      UI.showLoading(true);
      
      const response = await API.addMovieToBank(bankId, {
        tmdb_id: movie.id,
        title: movie.title,
        overview: movie.overview,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        genre_ids: movie.genre_ids
      });
      
      if (response.success) {
        UI.showToast(CONFIG.MESSAGES.SUCCESS.MOVIE_ADDED, 'success');
        UI.hideModal('add-to-bank-modal');
        
        // Update banks cache
        if (window.Banks) {
          Banks.loadUserBanks();
        }
      } else {
        throw new Error(response.message || 'Error al añadir la película');
      }
      
    } catch (error) {
      console.error('Error adding movie to bank:', error);
      
      if (error.message.includes('duplicate')) {
        UI.showToast(CONFIG.MESSAGES.ERRORS.DUPLICATE_MOVIE, 'warning');
      } else {
        UI.showToast(error.message || 'Error al añadir la película', 'error');
      }
    } finally {
      UI.showLoading(false);
    }
  }
  
  // Show movie details (placeholder for future feature)
  async showMovieDetails(movieId) {
    try {
      const movie = await API.getMovieDetails(movieId);
      console.log('Movie details:', movie);
      // TODO: Implement movie details modal
    } catch (error) {
      console.error('Error loading movie details:', error);
    }
  }
  
  // Show movies loading state
  showMoviesLoading(clearContent = false) {
    const moviesGrid = document.getElementById('movies-grid');
    if (!moviesGrid) return;
    
    if (clearContent) {
      moviesGrid.innerHTML = this.createSkeletonCards(8);
    }
  }
  
  // Hide movies loading state
  hideMoviesLoading() {
    // Loading state is replaced by actual content
  }
  
  // Create skeleton loading cards
  createSkeletonCards(count) {
    return Array(count).fill(0).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-poster skeleton"></div>
        <div class="skeleton-content">
          <div class="skeleton-title skeleton"></div>
          <div class="skeleton-text skeleton short"></div>
          <div class="skeleton-text skeleton"></div>
          <div class="skeleton-text skeleton"></div>
        </div>
      </div>
    `).join('');
  }
  
  // Show empty state
  showEmptyState(message) {
    const moviesGrid = document.getElementById('movies-grid');
    if (!moviesGrid) return;
    
    moviesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎬</div>
        <h3 class="empty-state-title">No hay películas</h3>
        <p class="empty-state-description">${message}</p>
      </div>
    `;
  }
  
  // Update load more button
  updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (!loadMoreBtn) return;
    
    if (this.currentPage >= this.totalPages || this.currentMovies.length === 0) {
      loadMoreBtn.style.display = 'none';
    } else {
      loadMoreBtn.style.display = 'block';
      loadMoreBtn.textContent = this.loadingMore ? 'Cargando...' : 'Cargar más películas';
      loadMoreBtn.disabled = this.loadingMore;
    }
  }
  
  // Setup infinite scroll
  setupInfiniteScroll() {
    let isScrolling = false;
    
    window.addEventListener('scroll', CONFIG.UTILS.throttle(() => {
      if (isScrolling) return;
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      if (scrollTop + windowHeight >= documentHeight - CONFIG.UI.INFINITE_SCROLL_THRESHOLD) {
        if (!this.loadingMore && this.currentPage < this.totalPages) {
          isScrolling = true;
          this.loadMoreMovies().finally(() => {
            isScrolling = false;
          });
        }
      }
    }, 250));
  }
  
  // Clear filters
  clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('genre-filter').value = '';
    document.getElementById('year-filter').value = '';
    
    this.currentSearch = '';
    this.currentGenre = '';
    this.currentYear = '';
    
    this.loadPopularMovies();
  }
}

// Initialize movies manager
const Movies = new MoviesManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Movies.init();
});

// Export for use in other modules
window.Movies = Movies;