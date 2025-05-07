class GoogolUI {
    constructor() {
        this.initializeSelectors();
        this.initializeWebSocket();
        this.registerEventListeners();
        this.init();
        this.currentPage = 0;
        this.totalPages = 0;
        this.currentQuery = '';
    }

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


    }

    initializeWebSocket() {
        this.socket = new SockJS('/ws');
        this.stompClient = Stomp.over(this.socket);

        // Adicione esta função de erro
        this.stompClient.onStompError = (frame) => {
            console.error('STOMP Error:', frame.headers.message);
        };

        this.stompClient.connect({}, (frame) => {
            console.log('Connected:', frame);
            this.stompClient.subscribe('/topic/notifications', (message) => {
                this.handleWebSocketNotification(JSON.parse(message.body));
            });
        }, (error) => {
            console.error('WebSocket Error:', error);
        });
    }

    registerEventListeners() {
        this.searchModeBtn.addEventListener('click', () => this.setSearchMode());
        this.indexModeBtn.addEventListener('click', () => this.setIndexMode());
        this.indexBtn.addEventListener('click', () => this.handleIndexRequest());
        this.searchInput.addEventListener('keypress', (e) => this.handleKeyPress(e));
        this.searchBtn.addEventListener('click', () => this.performSearch());
        this.luckyBtn.addEventListener('click', () => this.performLuckySearch());
        this.searchActionBtn.addEventListener('click', () => this.performSearch());

    }

    handleKeyPress(e) {
            if (e.key === 'Enter') {
                if (this.searchModeBtn.classList.contains('active')) {
                    this.performSearch();
                } else if (this.indexModeBtn.classList.contains('active')) {
                    this.handleIndexRequest();
                }
            }
        }

    // Mode Handling
    setSearchMode() {
        this.searchModeBtn.classList.add('active');
        this.indexModeBtn.classList.remove('active');
        this.searchInput.placeholder = "Search the web with Googol";
        this.searchInput.type = "text";
        this.searchBar.classList.remove('index-mode');
        this.searchBarIcon.className = "fas fa-search search-icon";
        this.searchBtn.style.display = "none";
        this.luckyBtn.style.display = "none";
        this.indexBtn.style.display = "none";
        this.searchActionBtn.style.display = "block"; // Mostra o novo botão

        this.searchBar.classList.remove('success', 'error', 'transitioning');
        const messages = document.querySelectorAll('.status-message');
        messages.forEach(msg => msg.remove());
    }

    setIndexMode() {
        this.searchModeBtn.classList.remove('active');
        this.indexModeBtn.classList.add('active');
        this.searchInput.placeholder = "Enter URL to index (e.g., https://example.com)";
        this.searchInput.type = "url";
        this.searchBar.classList.add('index-mode');
        this.searchBarIcon.className = "fas fa-link search-icon index-icon";
        this.searchBtn.style.display = "none";
        this.luckyBtn.style.display = "none";
        this.indexBtn.style.display = "block";
        this.searchActionBtn.style.display = "none"; // Oculta o novo botão
        this.searchBar.classList.remove('success', 'error', 'transitioning');
        const messages = document.querySelectorAll('.status-message');
        messages.forEach(msg => msg.remove());
    }

    /*
    setBacklinkMode() {
        // Desativa outros modos
        this.searchModeBtn.classList.remove('active');
        this.indexModeBtn.classList.remove('active');
        this.backlinkModeBtn.classList.add('active');

        // Configura UI
        this.searchInput.placeholder = "Enter URL to find backlinks (e.g., https://example.com)";
        this.searchInput.type = "url";
        this.searchBar.classList.add('backlink-mode');
        this.searchBarIcon.className = "fas fa-link search-icon backlink-icon";

        // Mostra/Esconde botões
        this.searchBtn.style.display = "none";
        this.luckyBtn.style.display = "none";
        this.indexBtn.style.display = "none";
        this.backlinkBtn.style.display = "block";
    }
    */

    // Core Functionality
    async handleIndexRequest() {
        const url = this.searchInput.value.trim();
        if (!this.validateUrl(url)) return;

        // Cria elemento de mensagem
        const statusMessage = document.createElement('div');
        statusMessage.className = 'status-message';
        this.searchBar.parentNode.appendChild(statusMessage);

        try {
            // Reset e preparação do UI
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

            // Atualiza mensagem
            statusMessage.textContent = 'URL added to queue!';
            this.showNotification('URL added to indexing queue!', 'success');

        } catch (error) {
            // Tratamento de erro
            this.searchBar.classList.remove('success');
            this.searchBar.classList.add('error');
            statusMessage.textContent = error.message;
            statusMessage.style.color = 'var(--accent-color)';
            this.showNotification(error.message, 'error');
        } finally {
            // Animação de fade
            setTimeout(() => {
                statusMessage.classList.add('fade-out');
                this.searchBar.classList.remove('success', 'error');

                // Limpeza final
                setTimeout(() => {
                    statusMessage.remove();
                    this.toggleLoadingState(false);
                }, 1000);
            }, 2000);
        }
    }

    async performSearch() {
        const query = this.searchInput.value.trim();
        if (!query) return;

        try {
            const response = await fetch(`/api/web-search?q=${encodeURIComponent(query)}&page=${this.currentPage}`);

            // Verificação adicional do status HTTP
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Search failed');
            }

            const data = await response.json();
            console.log("Dados recebidos do backend:", data);

            // Verificação da estrutura da resposta
            if (!data.results || !Array.isArray(data.results)) {
                throw new Error('Invalid response format');
            }

            this.displayResults(data.results);
            this.updatePagination(data.currentPage, data.totalPages);

        } catch (error) {
            // Mostra erro apenas se não houver resultados
            if (this.resultsContainer.children.length === 0) {
                this.showNotification(error.message, 'error');
            }
        }
    }

    updatePagination(currentPage, totalPages) {
        const paginationDiv = document.querySelector('.pagination');

        if (!paginationDiv) {
            console.error('Elemento de paginação não encontrado');
            return;
        }

        paginationDiv.innerHTML = '';

        // Botões numéricos (máximo de 10 páginas visíveis)
        const startPage = Math.max(0, currentPage - 5);
        const endPage = Math.min(totalPages, startPage + 10);

        for (let i = startPage; i < endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i + 1;
            pageBtn.addEventListener('click', () => {
                this.currentPage = i;
                this.loadPage(i);
            });
            paginationDiv.appendChild(pageBtn);
        }

        // Botões de navegação avançada
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

    createNavButton(symbol, targetPage) {
        const btn = document.createElement('button');
        btn.className = 'page-btn';
        btn.textContent = symbol;
        btn.addEventListener('click', () => {
            this.currentPage = targetPage;
            this.loadPage(targetPage);
        });
        return btn;
    }

    displayResults(results) {
            const resultsContainer = document.getElementById('resultsContainer');

            // Verifica se o elemento existe
            if (!resultsContainer) {
                console.error('Results container not found');
                return;
            }

            // Limpa resultados anteriores
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

    async loadPage(page) {
        try {
            const query = this.searchInput.value.trim();
            const response = await fetch(`/api/web-search?q=${encodeURIComponent(query)}&page=${page}`);

            if (!response.ok) throw new Error('Failed to load page');

            const data = await response.json();
            this.displayResults(data.results);
            this.updatePagination(data.currentPage, data.totalPages);

            // Scroll suave para o topo
            window.scrollTo({
                top: this.resultsContainer.offsetTop - 100,
                behavior: 'smooth'
            });

        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

/*
    async handleBacklinkSearch() {
        const url = this.searchInput.value.trim();
        if (!this.validateUrl(url)) return;

        try {
            const response = await fetch(`/api/backlinks?url=${encodeURIComponent(url)}&page=${this.currentPage}`);

            if (!response.ok) throw new Error('Failed to fetch backlinks');

            const data = await response.json();
            this.displayBacklinkResults(data.results);
            this.updatePagination(data.currentPage, data.totalPages);

        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    displayBacklinkLinks(results) {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-unlink"></i>
                    <p>No backlinks found for this URL</p>
                </div>
            `;
            return;
        }

        results.forEach(backlink => {
            const html = `
                <div class="result-item backlink-item">
                    <div class="backlink-header">
                        <a href="${backlink.sourceUrl}" class="result-title">${backlink.sourceTitle}</a>
                        <span class="backlink-count">${backlink.anchorText}</span>
                    </div>
                    <span class="result-url">${backlink.sourceUrl}</span>
                    <p class="result-snippet">Linked using: "${backlink.anchorText}"</p>
                </div>
            `;
            resultsContainer.insertAdjacentHTML('beforeend', html);
        });
    }

*/

    performLuckySearch() {
        if (this.searchInput.value.trim() === '') return;
        alert('"I\'m Feeling Lucky" would redirect to the top result for: ' + this.searchInput.value);
    }

    // Helper Methods
    validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            this.showNotification('Invalid URL format', 'error');
            return false;
        }
    }

    toggleLoadingState(isLoading) {
        this.indexBtn.innerHTML = isLoading
            ? '<i class="fas fa-spinner fa-spin"></i> Indexing...'
            : 'Index This URL';
        this.indexBtn.disabled = isLoading;
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
            ${message}
        `;
        document.getElementById('notification-area').appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    init() {
        this.setSearchMode();
        this.simulateRealTimeUpdates();
    }

    simulateRealTimeUpdates() {
        setInterval(() => {
            document.getElementById('activeBarrels').textContent = Math.floor(Math.random() * 2) + 2;
            document.getElementById('indexSize').textContent = (42.7 + Math.random()).toFixed(1) + 'M';
            document.getElementById('lastUpdated').textContent =
                `today at ${new Date().getHours()}:${new Date().getMinutes().toString().padStart(2, '0')}`;
        }, 5000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => new GoogolUI());