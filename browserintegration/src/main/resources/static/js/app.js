class GoogolUI {
    constructor() {
        // Estado separado para cada modo
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
    }

    initializeWebSocket() {
        this.socket = new SockJS('/ws');
        this.stompClient = Stomp.over(this.socket);

        // Adicione headers explícitos
        this.stompClient.connect({}, (frame) => {
            console.log('Conectado ao WebSocket:', frame);
            this.stompClient.subscribe('/topic/notifications', (message) => {
                this.handleWebSocketNotification(JSON.parse(message.body));
            });
        }, (error) => {
            console.error('Erro no WebSocket:', error);
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
        this.backlinkModeBtn.addEventListener('click', () => this.setBacklinkMode());
        this.backlinkBtn.addEventListener('click', () => this.handleBacklinks());

    }

    handleKeyPress(e) {
        if (e.key === 'Enter') {
            const activeMode = document.querySelector('.mode-btn.active').id;

            if (activeMode === 'searchModeBtn') this.performSearch();
            if (activeMode === 'indexModeBtn') this.handleIndexRequest();
            if (activeMode === 'backlinkModeBtn') this.handleBacklinks(); // Novo
        }
    }

    // Mode Handling
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
        this.searchActionBtn.style.display = "block"; // Mostra o novo botão

        this.searchBar.classList.remove('success', 'error', 'transitioning');
        const messages = document.querySelectorAll('.status-message');
        messages.forEach(msg => msg.remove());

        // Remove a caixa de explicação da IA
        const aiExplanation = document.querySelector('.ai-explanation-box');
        if (aiExplanation) aiExplanation.remove();

        this.resultsContainer.innerHTML = '';
        this.resultsContainer.style.display = 'none';
        const pagination = document.querySelector('.pagination');
        if (pagination) pagination.innerHTML = '';
    }

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
        this.searchActionBtn.style.display = "none"; // Oculta o novo botão
        this.searchBar.classList.remove('success', 'error', 'transitioning');
        const messages = document.querySelectorAll('.status-message');
        messages.forEach(msg => msg.remove());

        // Remove a caixa de explicação da IA
        const aiExplanation = document.querySelector('.ai-explanation-box');
        if (aiExplanation) aiExplanation.remove();

        this.resultsContainer.innerHTML = '';
        this.resultsContainer.style.display = 'none';
        const pagination = document.querySelector('.pagination');
        if (pagination) pagination.innerHTML = '';
    }

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

        // Reset de estados visuais
        this.searchBar.classList.remove('success', 'error', 'transitioning');
        const messages = document.querySelectorAll('.status-message');
        messages.forEach(msg => msg.remove());

        // Remove a caixa de explicação da IA
        const aiExplanation = document.querySelector('.ai-explanation-box');
        if (aiExplanation) aiExplanation.remove();
    }

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
            const state = this.paginationState.search;
            const response = await fetch(`/api/web-search?q=${encodeURIComponent(query)}&page=${state.currentPage}`);

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

            // Exibir explicação da IA antes dos resultados
            this.displayAIExplanation(data.aiExplanation, query);

            this.displayResults(data.results);
            state.currentPage = data.currentPage;
            state.totalPages = data.totalPages;
            this.updatePagination(state.currentPage, state.totalPages);

        } catch (error) {
            // Mostra erro apenas se não houver resultados
            if (this.resultsContainer.children.length === 0) {
                this.showNotification(error.message, 'error');
            }
        }
    }

    async handleBacklinks() {
        const url = this.searchInput.value.trim();
        if (!this.validateUrl(url)) return;

        try {
            const state = this.paginationState.backlinks;
            state.currentPage = 0; // Reset ao fazer nova pesquisa
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

    // Novo método para exibir a explicação da IA
    displayAIExplanation(explanation, query) {
        // Remove qualquer explicação anterior
        const existingExplanation = document.querySelector('.ai-explanation-box');
        if (existingExplanation) {
            existingExplanation.remove();
        }

        // Se não há explicação, não exibe nada
        if (!explanation || explanation.trim() === '') {
            return;
        }

        const explanationBox = document.createElement('div');
        explanationBox.className = 'ai-explanation-box';
        explanationBox.innerHTML = `
            <h3><i class="fas fa-robot"></i> Sobre "${query}"</h3>
            <div class="ai-explanation-content">${explanation}</div>
        `;

        // Insere antes do container de resultados
        this.resultsContainer.parentNode.insertBefore(explanationBox, this.resultsContainer);
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

    createNavButton(symbol, targetPage) {
        const btn = document.createElement('button');
        btn.className = 'page-btn';
        btn.textContent = symbol;
        btn.addEventListener('click', () => {
            this.loadPage(targetPage);
        });
        return btn;
    }


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

            // Atualiza o estado antes da requisição
            state.currentPage = page;
            const response = await fetch(endpoint);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to load page');
            }

            const data = await response.json();

            // Chamada correta para cada tipo de resultado
            if (activeMode === 'backlinkModeBtn') {
                this.displayBacklinks(data.results, data.query);
            } else {
                // Para pesquisa, verificar se temos explicação da IA
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

        const notifications = document.querySelectorAll('.notification');
        const index = notifications.length;
        notification.style.setProperty('--notification-index', index);

        document.getElementById('notification-area').appendChild(notification);

        setTimeout(() => {
            notification.remove();
            // Atualiza posições das notificações restantes
            document.querySelectorAll('.notification').forEach((notif, idx) => {
                notif.style.setProperty('--notification-index', idx);
            });
        }, 5000);
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