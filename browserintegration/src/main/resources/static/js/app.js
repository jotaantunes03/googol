class GoogolUI {
    /**
     * Initializes the GoogolUI application
     * Creates pagination state for different modes, sets up connections and event listeners
     * @constructor
     */
    constructor() {
        // State for each mode
        this.paginationState = {
            search: {
                currentPage: 0,
                totalPages: 0
            },
            backlinks: {
                currentPage: 0,
                totalPages: 0
            }
        };
        this.initializeSelectors();
        this.initializeWebSocket();
        this.registerEventListeners();
        this.init();
        this.currentQuery = '';
    }

    /**
     * Initializes all DOM element selectors needed for the application
     * Stores references to DOM elements as class properties
     */
    initializeSelectors() {
        this.searchModeBtn = document.getElementById('searchModeBtn');
        this.indexModeBtn = document.getElementById('indexModeBtn');
        this.searchInput = document.getElementById('searchInput');
        this.indexBtn = document.getElementById('indexBtn');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.searchBar = document.querySelector('.search-bar');
        this.searchBarIcon = document.getElementById('searchBarIcon');
        this.searchBtn = document.getElementById('searchBtn');
        this.luckyBtn = document.getElementById('luckyBtn');
        this.searchActionBtn = document.getElementById('searchActionBtn');
        this.backlinkModeBtn = document.getElementById('backlinkModeBtn');
        this.backlinkBtn = document.getElementById('backlinkBtn');

        this.hackernewsToggle = document.getElementById('hackernewsToggle');
        this.hackernewsToggleContainer = document.querySelector('.hackernews-toggle-container');
        this.isHackerNewsActive = false;
    }

    /**
     * Initializes WebSocket connection for real-time updates
     * Sets up STOMP client and subscribes to system stats topic
     */
    initializeWebSocket() {
        this.socket = new SockJS('/ws');
        this.stompClient = Stomp.over(this.socket);

        // Add explicit headers
        this.stompClient.connect({}, (frame) => {
            console.log('Conectado ao WebSocket:', frame);
            this.stompClient.subscribe('/topic/system-stats', (message) => {
                const parsedStats = this.parseSystemStatsString(message.body);
                this.updateSystemStatsDisplay(parsedStats);});
            this.stompClient.send('/app/stats', {}, {});
        }, (error) => {
            console.error('Erro no WebSocket:', error);
        });
    }

    /**
     * Registers all event listeners for UI elements
     * Sets up click and keypress handlers for search, index, and backlink operations
     */
    registerEventListeners() {
        this.searchModeBtn.addEventListener('click', () => this.setSearchMode());
        this.indexModeBtn.addEventListener('click', () => this.setIndexMode());
        this.indexBtn.addEventListener('click', () => this.handleIndexRequest());
        this.searchInput.addEventListener('keypress', (e) => this.handleKeyPress(e));
        this.searchBtn.addEventListener('click', () => this.performSearch());
        this.luckyBtn.addEventListener('click', () => this.performLuckySearch());
        this.searchActionBtn.addEventListener('click', () => this.performSearch());
        this.backlinkModeBtn.addEventListener('click', () => this.setBacklinkMode());
        this.backlinkBtn.addEventListener('click', () => this.handleBacklinks());
        this.hackernewsToggle.addEventListener('click', () => this.toggleHackerNews());
    }

    /**
     * Handles keypress events in the search input
     * Triggers appropriate action based on active mode when Enter key is pressed
     * @param {KeyboardEvent} e - The keypress event
     */
    handleKeyPress(e) {
        if (e.key === 'Enter') {
            const activeMode = document.querySelector('.mode-btn.active').id;

            if (activeMode === 'searchModeBtn') this.performSearch();
            if (activeMode === 'indexModeBtn') this.handleIndexRequest();
            if (activeMode === 'backlinkModeBtn') this.handleBacklinks(); // New
        }
    }

    /**
     * Activates search mode in the UI
     * Resets pagination state, updates UI elements for search functionality
     */
    setSearchMode() {
        this.resetPaginationState('search');
        this.searchInput.value = '';
        this.searchModeBtn.classList.add('active');
        this.indexModeBtn.classList.remove('active');
        this.backlinkModeBtn.classList.remove('active');

        this.searchInput.placeholder = "Search the web with Googol";
        this.searchInput.type = "text";
        this.searchBar.classList.remove('index-mode', 'backlink-mode');
        this.searchBarIcon.className = "fas fa-search search-icon";
        this.searchBtn.style.display = "none";
        this.luckyBtn.style.display = "none";
        this.indexBtn.style.display = "none";
        this.backlinkBtn.style.display = "none";
        this.searchActionBtn.style.display = "block"; // Show the new button


        this.searchBar.classList.remove('success', 'error', 'transitioning');
        const messages = document.querySelectorAll('.status-message');
        messages.forEach(msg => msg.remove());

        // Remove the AI explanation box
        const aiExplanation = document.querySelector('.ai-explanation-box');
        if (aiExplanation) aiExplanation.remove();

        this.resultsContainer.innerHTML = '';
        this.resultsContainer.style.display = 'none';
        const pagination = document.querySelector('.pagination');
        if (pagination) pagination.innerHTML = '';
        this.hackernewsToggleContainer.style.display = 'flex';
    }


    /**
     * Toggles Hacker News integration on/off
     * Updates UI and shows notification of the current state
     */
    toggleHackerNews() {
        this.isHackerNewsActive = !this.isHackerNewsActive;
        this.hackernewsToggle.classList.toggle('active');

        const message = this.isHackerNewsActive
            ? "Hacker News integration activated"
            : "Hacker News integration deactivated";

        this.showNotification(message, this.isHackerNewsActive ? 'success' : 'info');

        // Store state (optional)
        localStorage.setItem('hackernewsToggle', this.isHackerNewsActive);
    }

    /**
     * Activates index mode in the UI
     * Updates UI elements for URL indexing functionality
     */
    setIndexMode() {
        this.searchInput.value = '';
        this.searchModeBtn.classList.remove('active');
        this.indexModeBtn.classList.add('active');
        this.backlinkModeBtn.classList.remove('active');
        this.searchBar.classList.remove('backlink-mode');
        this.searchInput.placeholder = "Enter URL to index (e.g., https://example.com)";
        this.searchInput.type = "url";
        this.searchBar.classList.add('index-mode');
        this.searchBarIcon.className = "fas fa-link search-icon index-icon";
        this.searchBtn.style.display = "none";
        this.luckyBtn.style.display = "none";
        this.backlinkBtn.style.display = "none";
        this.indexBtn.style.display = "block";
        this.searchActionBtn.style.display = "none"; // Hide the new button
        this.searchBar.classList.remove('success', 'error', 'transitioning');
        const messages = document.querySelectorAll('.status-message');
        messages.forEach(msg => msg.remove());

        // Remove the AI explanation box
        const aiExplanation = document.querySelector('.ai-explanation-box');
        if (aiExplanation) aiExplanation.remove();

        this.resultsContainer.innerHTML = '';
        this.resultsContainer.style.display = 'none';
        const pagination = document.querySelector('.pagination');
        if (pagination) pagination.innerHTML = '';
        this.hackernewsToggleContainer.style.display = 'none';

    }

    /**
     * Activates backlink mode in the UI
     * Resets pagination state, updates UI elements for backlink search functionality
     */
    setBacklinkMode() {
        this.resetPaginationState('backlinks');
        this.searchInput.value = '';
        // Reset all
        this.searchModeBtn.classList.remove('active');
        this.indexModeBtn.classList.remove('active');
        this.backlinkModeBtn.classList.add('active');

        this.searchBar.classList.remove('index-mode');
        this.searchBar.classList.add('backlink-mode');

        this.searchBarIcon.className = "fas fa-link search-icon backlink-icon";

        this.searchBtn.style.display = "none";
        this.luckyBtn.style.display = "none";
        this.indexBtn.style.display = "none";
        this.searchActionBtn.style.display = "none";
        this.backlinkBtn.style.display = "block";

        this.searchInput.placeholder = "Enter URL to find backlinks (e.g., https://example.com)";
        this.resultsContainer.style.display = "none";

        this.resultsContainer.innerHTML = '';
        const pagination = document.querySelector('.pagination');
        if (pagination) pagination.innerHTML = '';

        // Reset visual states
        this.searchBar.classList.remove('success', 'error', 'transitioning');
        const messages = document.querySelectorAll('.status-message');
        messages.forEach(msg => msg.remove());

        // Remove the AI explanation box
        const aiExplanation = document.querySelector('.ai-explanation-box');
        if (aiExplanation) aiExplanation.remove();
        this.hackernewsToggleContainer.style.display = 'none';

    }

    /**
     * Handles URL indexing requests
     * Validates URL, sends indexing request to backend API, and updates UI with status
     * @async
     */
    async handleIndexRequest() {
        const url = this.searchInput.value.trim();
        if (!this.validateUrl(url)) return;

        // Create message element
        const statusMessage = document.createElement('div');
        statusMessage.className = 'status-message';
        this.searchBar.parentNode.appendChild(statusMessage);

        try {
            // Reset and UI preparation
            this.searchInput.value = '';
            this.searchBar.classList.add('transitioning', 'success');
            statusMessage.textContent = 'Indexing URL...';
            statusMessage.style.color = 'var(--secondary-color)';

            this.toggleLoadingState(true);

            const response = await fetch('/api/index', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (!response.ok) throw new Error('Indexing failed');

            // Update message
            statusMessage.textContent = 'URL added to queue!';
            this.showNotification('URL added to indexing queue!', 'success');

        } catch (error) {
            // Error handling
            this.searchBar.classList.remove('success');
            this.searchBar.classList.add('error');
            statusMessage.textContent = error.message;
            statusMessage.style.color = 'var(--accent-color)';
            this.showNotification(error.message, 'error');
        } finally {
            // Fade animation
            setTimeout(() => {
                statusMessage.classList.add('fade-out');
                this.searchBar.classList.remove('success', 'error');

                // Final cleanup
                setTimeout(() => {
                    statusMessage.remove();
                    this.toggleLoadingState(false);
                }, 1000);
            }, 2000);
        }
    }

    /**
     * Performs a web search based on the current input
     * Fetches search results from backend API and displays them
     * @async
     */
    async performSearch() {
        const query = this.searchInput.value.trim();
        if (!query) return;

        try {
            const state = this.paginationState.search;
            const response = await fetch(`/api/web-search?q=${encodeURIComponent(query)}&page=${state.currentPage}&hn=${this.isHackerNewsActive}`);

            // Additional HTTP status check
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Search failed');
            }

            const data = await response.json();
            console.log("Data received from backend:", data);

            // Check response structure
            if (!data.results || !Array.isArray(data.results)) {
                throw new Error('Invalid response format');
            }

            // Display AI explanation before results
            this.displayAIExplanation(data.aiExplanation, query);

            this.displayResults(data.results);
            state.currentPage = data.currentPage;
            state.totalPages = data.totalPages;
            this.updatePagination(state.currentPage, state.totalPages);

        } catch (error) {
            // Show error only if there are no results
            if (this.resultsContainer.children.length === 0) {
                this.showNotification(error.message, 'error');
            }
        }
    }

    /**
     * Handles backlink search requests
     * Fetches backlinks for the provided URL and displays them
     * @async
     */
    async handleBacklinks() {
        const url = this.searchInput.value.trim();
        if (!this.validateUrl(url)) return;

        try {
            const state = this.paginationState.backlinks;
            state.currentPage = 0; // Reset when making a new search
            const response = await fetch(`/api/backlinks?url=${encodeURIComponent(url)}&page=${state.currentPage}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch backlinks');
            }

            const data = await response.json();
            this.displayBacklinks(data.results, data.query);
            state.currentPage = data.currentPage;
            state.totalPages = data.totalPages;
            this.updatePagination(state.currentPage, state.totalPages);

        } catch (error) {
            this.showNotification(error.message, 'error');
            this.resultsContainer.innerHTML = '';
            this.resultsContainer.style.display = 'none';
        }
    }

    /**
     * Displays backlink results in the UI
     * @param {Array<string>} backlinks - Array of backlink URLs
     * @param {string} originalUrl - The URL for which backlinks were searched
     */
    displayBacklinks(backlinks, originalUrl) {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '';

        if (backlinks.length === 0) {
            const noResultsHtml = `
                <div class="no-results">
                    <i class="fas fa-unlink"></i>
                    <p>No backlinks found for "${originalUrl}"</p>
                </div>
            `;
            resultsContainer.innerHTML = noResultsHtml;
        } else {
            const listHtml = `
                <div class="result-item">
                    <h3>Backlinks for: ${originalUrl}</h3>
                    <ul class="backlinks-list">
                        ${backlinks.map(link => `
                            <li class="backlink-item">
                                <a href="${link}" class="result-url">${link}</a>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
            resultsContainer.innerHTML = listHtml;
        }
        resultsContainer.style.display = 'block';
    }

    /**
     * Displays AI explanation box above search results
     * @param {string} explanation - HTML content for AI explanation
     * @param {string} query - The search query
     */
    displayAIExplanation(explanation, query) {
        // Remove any previous explanation
        const existingExplanation = document.querySelector('.ai-explanation-box');
        if (existingExplanation) {
            existingExplanation.remove();
        }

        // If no explanation, don't display anything
        if (!explanation || explanation.trim() === '') {
            return;
        }

        const explanationBox = document.createElement('div');
        explanationBox.className = 'ai-explanation-box';
        explanationBox.innerHTML = `
            <h3><i class="fas fa-robot"></i> Sobre "${query}"</h3>
            <div class="ai-explanation-content">${explanation}</div>
        `;

        // Insert before results container
        this.resultsContainer.parentNode.insertBefore(explanationBox, this.resultsContainer);
    }

    /**
     * Updates pagination controls based on current page and total pages
     * @param {number} currentPage - Current page index (zero-based)
     * @param {number} totalPages - Total number of pages
     */
    updatePagination(currentPage, totalPages) {
        const paginationDiv = document.querySelector('.pagination');

        if (!paginationDiv) {
            console.error('Pagination element not found');
            return;
        }

        paginationDiv.innerHTML = '';

        // Numeric buttons (maximum of 10 visible pages)
        const startPage = Math.max(0, currentPage - 5);
        const endPage = Math.min(totalPages, startPage + 10);

        for (let i = startPage; i < endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i + 1;
            pageBtn.addEventListener('click', () => {
                this.loadPage(i);
            });
            paginationDiv.appendChild(pageBtn);
        }

        // Advanced navigation buttons
        if (totalPages > 10) {
            if (currentPage > 0) {
                const firstBtn = this.createNavButton('«', 0);
                paginationDiv.insertBefore(firstBtn, paginationDiv.firstChild);
            }

            if (currentPage < totalPages - 1) {
                const nextBtn = this.createNavButton('»', currentPage + 1);
                paginationDiv.appendChild(nextBtn);
            }
        }
    }

    /**
     * Resets pagination state for the specified mode
     * @param {string} mode - Either 'search' or 'backlinks'
     */
    resetPaginationState(mode) {
        if (mode === 'search') {
            this.paginationState.search.currentPage = 0;
            this.paginationState.search.totalPages = 0;
        } else if (mode === 'backlinks') {
            this.paginationState.backlinks.currentPage = 0;
            this.paginationState.backlinks.totalPages = 0;
        }

        document.querySelector('.pagination').innerHTML = '';
    }

    /**
     * Creates a navigation button for pagination
     * @param {string} symbol - The symbol to display on the button
     * @param {number} targetPage - The page to navigate to when clicked
     * @returns {HTMLButtonElement} - The created button element
     */
    createNavButton(symbol, targetPage) {
        const btn = document.createElement('button');
        btn.className = 'page-btn';
        btn.textContent = symbol;
        btn.addEventListener('click', () => {
            this.loadPage(targetPage);
        });
        return btn;
    }


    /**
     * Displays search results in the UI
     * @param {Array<Object>} results - Array of search result objects
     */
    displayResults(results) {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            const noResultsHtml = `
                <div class="no-results">
                    <i class="fas fa-search-minus"></i>
                    <p>No results found for "${this.searchInput.value.trim()}"</p>
                </div>
            `;
            resultsContainer.innerHTML = noResultsHtml;
        } else {
            results.forEach(result => {
                const resultHtml = `
                    <div class="result-item">
                        <a href="${result.url}" class="result-title">${result.title}</a>
                        <span class="result-url">${result.url}</span>
                        <p class="result-snippet">${result.snippet}</p>
                    </div>
                `;
                resultsContainer.insertAdjacentHTML('beforeend', resultHtml);
            });
        }
        resultsContainer.style.display = 'block';
    }

    /**
     * Displays backlink results in the UI
     * @param {Array<string>} backlinks - Array of backlink URLs
     * @param {string} originalUrl - The URL for which backlinks were searched
     */
    displayBacklinks(backlinks, originalUrl) {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '';

        if (backlinks.length === 0) {
            const noResultsHtml = `
                <div class="no-results">
                    <i class="fas fa-unlink"></i>
                    <p>No backlinks found for "${originalUrl}"</p>
                </div>
            `;
            resultsContainer.innerHTML = noResultsHtml;
        } else {
            const listHtml = `
                <div class="result-item">
                    <h3>Backlinks for: ${originalUrl}</h3>
                    <ul class="backlinks-list">
                        ${backlinks.map(link => `
                            <li class="backlink-item">
                                <a href="${link}" class="result-url">${link}</a>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
            resultsContainer.innerHTML = listHtml;
        }
        resultsContainer.style.display = 'block';
    }

    /**
     * Loads a specific page of search results or backlinks
     * @param {number} page - The page number to load (zero-based)
     * @async
     */
    async loadPage(page) {
        try {
            const activeMode = document.querySelector('.mode-btn.active').id;
            const query = this.searchInput.value.trim();

            let endpoint;
            let state;
            if (activeMode === 'backlinkModeBtn') {
                state = this.paginationState.backlinks;
                endpoint = `/api/backlinks?url=${encodeURIComponent(query)}&page=${page}`;
            } else {
                state = this.paginationState.search;
                endpoint = `/api/web-search?q=${encodeURIComponent(query)}&page=${page}`;
            }

            // Update state before request
            state.currentPage = page;
            const response = await fetch(endpoint);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to load page');
            }

            const data = await response.json();

            // Correct call for each result type
            if (activeMode === 'backlinkModeBtn') {
                this.displayBacklinks(data.results, data.query);
            } else {
                // For search, check if we have AI explanation
                if (data.aiExplanation) {
                    this.displayAIExplanation(data.aiExplanation, query);
                }
                this.displayResults(data.results);
            }

            state.currentPage = data.currentPage;
            state.totalPages = data.totalPages;
            this.updatePagination(state.currentPage, state.totalPages);

            window.scrollTo({
                top: document.querySelector('.ai-explanation-box')?.offsetTop || this.resultsContainer.offsetTop - 100,
                behavior: 'smooth'
            });

        } catch (error) {
            this.showNotification(error.message, 'error');
            this.resultsContainer.innerHTML = '';
            this.resultsContainer.style.display = 'none';
            document.querySelector('.pagination').innerHTML = '';
        }
    }


    /**
     * Performs "I'm Feeling Lucky" search functionality
     * Currently shows an alert with the search query
     */
    performLuckySearch() {
        if (this.searchInput.value.trim() === '') return;
        alert('"I\'m Feeling Lucky" would redirect to the top result for: ' + this.searchInput.value);
    }

    /**
     * Validates a URL string
     * @param {string} url - The URL to validate
     * @returns {boolean} - True if URL is valid, false otherwise
     */
    validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            this.showNotification('Invalid URL format', 'error');
            return false;
        }
    }

    /**
     * Toggles loading state of index button
     * @param {boolean} isLoading - Whether to show loading state
     */
    toggleLoadingState(isLoading) {
        this.indexBtn.innerHTML = isLoading
            ? '<i class="fas fa-spinner fa-spin"></i> Indexing...'
            : 'Index This URL';
        this.indexBtn.disabled = isLoading;
    }

    /**
     * Shows a notification message with specified type
     * @param {string} message - The message to display
     * @param {string} type - The type of notification ('success', 'error', 'info')
     */
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
            ${message}
        `;

        const notifications = document.querySelectorAll('.notification');
        const index = notifications.length;
        notification.style.setProperty('--notification-index', index);

        document.getElementById('notification-area').appendChild(notification);

        setTimeout(() => {
            notification.remove();
            // Update positions of remaining notifications
            document.querySelectorAll('.notification').forEach((notif, idx) => {
                notif.style.setProperty('--notification-index', idx);
            });
        }, 5000);
    }

    /**
     * Initializes the application
     * Sets search mode as default and initializes WebSocket connection
     */
    init() {
        this.setSearchMode();
        this.initializeWebSocket();
    }


    /**
     * Parses system statistics string into structured object
     * @param {string} rawString - Raw statistics string from server
     * @returns {Object} - Parsed statistics object with topSearches, barrels, and responseTimes
     */
    parseSystemStatsString(rawString) {
        const lines = rawString.split('\n');

        const stats = {
            topSearches: [],
            barrels: {},
            responseTimes: {}
        };

        let mode = null;
        let currentBarrelId = null;

        for (let line of lines) {
            line = line.trim();

            // Section detection
            if (line.startsWith("Top 10 Search Terms")) {
                mode = 'topSearches';
                continue;
            }
            if (line.startsWith("Barrel Statistics")) {
                mode = 'barrels';
                continue;
            }
            if (line.startsWith("Average Response Time")) {
                mode = 'responseTimes';
                continue;
            }

            // Top searches
            if (mode === 'topSearches' && line && line.includes(':')) {
                const [term, countPart] = line.split(':');
                const count = parseInt(countPart.replace(/\D/g, ''), 10);
                stats.topSearches.push({ term: term.trim(), count });
            }

            // Barrel stats
            if (mode === 'barrels') {
                // On "Barrel [ID]:", start a new object
                const barrelMatch = line.match(/^Barrel \[(.*?)\]:?$/);
                if (barrelMatch) {
                    currentBarrelId = barrelMatch[1];
                    stats.barrels[currentBarrelId] = {};
                    continue;
                }
                // For any "  key: value" line, capture it
                if (currentBarrelId && line.includes(':')) {
                    const [key, val] = line.split(':').map(s => s.trim());
                    // try to parse number, otherwise keep string
                    const num = Number(val.replace(/\D/g, ''));
                    stats.barrels[currentBarrelId][key] = isNaN(num) ? val : num;
                }
            }


            // Response times
            if (mode === 'responseTimes') {
                const match = line.match(/Barrel \[(.*?)\] -> ([\d.]+)/);
                if (match) {
                    const [, barrelId, time] = match;
                    // store as a number (no trailing "s")
                    stats.responseTimes[barrelId] = parseFloat(time);
                }
            }
        }

        return stats;
    }

    /**
     * Updates the system statistics display in the UI
     * @param {Object} stats - Parsed system statistics
     * @param {Array} stats.topSearches - Array of top search terms and counts
     * @param {Object} stats.barrels - Object containing barrel statistics
     * @param {Object} stats.responseTimes - Object containing response times for each barrel
     */
    updateSystemStatsDisplay(stats) {
    // Top searches (now show counts)
    const topSearchesList = document.getElementById('topSearchesList');
    if (topSearchesList && stats.topSearches) {
        topSearchesList.innerHTML = stats.topSearches
            .map(({term, count}) => `<li>${term}: ${count}</li>`)
            .join('');
    }

    // Barrels (show all captured fields except db_size_mb and status)
    const barrelsList = document.getElementById('barrelsList');
    if (barrelsList && stats.barrels) {
        barrelsList.innerHTML = Object.entries(stats.barrels)
            .map(([id, fields]) => {
                // filter out unwanted keys
                const allowedEntries = Object.entries(fields)
                    .filter(([key]) => key !== 'db_size_mb' && key !== 'status');

                const details = allowedEntries
                    .map(([k, v]) => `${k}=${v}`)
                    .join(', ');

                return `<li>${id}: ${details}</li>`;
            })
            .join('');
    }

    // Response times (no "s" suffix; numeric only)
    const responseTimeList = document.getElementById('responseTimeList');
    if (responseTimeList && stats.responseTimes) {
        responseTimeList.innerHTML = Object.entries(stats.responseTimes)
            .map(([id, time]) => `<li>${id}: ${time.toFixed(1)}</li>`).join('');
    }

    const now = new Date();
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        lastUpdated.textContent = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
}

    handleWebSocketNotification(notification) {
            console.log('Notificação recebida:', notification);

            // Atualize a interface conforme o tipo de notificação
            switch(notification.type) {
                case 'INDEXING':
                    this.showNotification(`URL ${notification.url} na fila de indexação`, 'success');
                    break;

                case 'INDEXED':
                    this.showNotification(`URL ${notification.url} indexada com sucesso`, 'success');
                    break;

                case 'ERROR':
                    this.showNotification(`Erro ao indexar ${notification.url}: ${notification.message}`, 'error');
                    break;

                default:
                    console.warn('Tipo de notificação desconhecido:', notification.type);
            }
        }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => new GoogolUI());