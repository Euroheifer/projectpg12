/**
 * 搜索和过滤功能 - 全局搜索、实时过滤和高级筛选器
 * 支持搜索结果高亮、搜索历史和收藏功能
 */

class SearchManager {
    constructor(options = {}) {
        this.options = {
            minSearchLength: 2,
            debounceTime: 300,
            maxResults: 50,
            enableHistory: true,
            enableFavorites: true,
            highlightMatches: true,
            fuzzySearch: false,
            ...options
        };
        
        this.searchHistory = new SearchHistory();
        this.searchFavorites = new SearchFavorites();
        this.activeSearches = new Map();
        this.searchIndex = null;
        this.filters = {};
        
        this.init();
    }

    // 初始化搜索管理器
    init() {
        this.createSearchInterface();
        this.setupEventListeners();
        this.loadSearchIndex();
    }

    // 创建搜索界面
    createSearchInterface() {
        // 创建搜索容器
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <div class="search-box">
                <div class="search-input-wrapper">
                    <input 
                        type="text" 
                        class="search-input" 
                        placeholder="搜索内容..."
                        aria-label="搜索"
                        autocomplete="off"
                    >
                    <button class="search-clear" aria-label="清空搜索">×</button>
                </div>
                <div class="search-filters">
                    <button class="filter-toggle" aria-expanded="false">
                        <span>筛选器</span>
                        <span class="filter-count">0</span>
                    </button>
                </div>
            </div>
            <div class="search-results-container" style="display: none;">
                <div class="search-results-header">
                    <span class="results-count">0 个结果</span>
                    <button class="search-close">关闭</button>
                </div>
                <div class="search-results"></div>
                <div class="search-suggestions" style="display: none;">
                    <h4>搜索建议</h4>
                    <div class="suggestions-list"></div>
                </div>
                <div class="search-history-panel" style="display: none;">
                    <h4>搜索历史</h4>
                    <div class="history-list"></div>
                    <button class="clear-history">清空历史</button>
                </div>
                <div class="search-favorites-panel" style="display: none;">
                    <h4>收藏的搜索</h4>
                    <div class="favorites-list"></div>
                </div>
            </div>
            <div class="search-filters-panel" style="display: none;">
                <div class="filters-content"></div>
                <div class="filters-actions">
                    <button class="apply-filters">应用筛选</button>
                    <button class="clear-filters">清空筛选</button>
                </div>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(searchContainer);
        
        // 保存引用
        this.searchContainer = searchContainer;
        this.searchInput = searchContainer.querySelector('.search-input');
        this.searchClear = searchContainer.querySelector('.search-clear');
        this.searchResults = searchContainer.querySelector('.search-results');
        this.resultsCount = searchContainer.querySelector('.results-count');
        this.filterToggle = searchContainer.querySelector('.filter-toggle');
        this.filterCount = searchContainer.querySelector('.filter-count');
        this.searchSuggestions = searchContainer.querySelector('.search-suggestions');
        this.suggestionsList = searchContainer.querySelector('.suggestions-list');
        this.searchHistoryPanel = searchContainer.querySelector('.search-history-panel');
        this.historyList = searchContainer.querySelector('.history-list');
        this.searchFavoritesPanel = searchContainer.querySelector('.search-favorites-panel');
        this.favoritesList = searchContainer.querySelector('.favorites-list');
        this.searchFiltersPanel = searchContainer.querySelector('.search-filters-panel');
        this.filtersContent = searchContainer.querySelector('.filters-content');
    }

    // 设置事件监听
    setupEventListeners() {
        // 搜索输入
        this.searchInput.addEventListener('input', this.debounce.bind(this, this.handleSearchInput));
        this.searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));
        this.searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
        
        // 清除搜索
        this.searchClear.addEventListener('click', this.clearSearch.bind(this));
        
        // 关闭搜索结果
        const searchClose = this.searchContainer.querySelector('.search-close');
        searchClose.addEventListener('click', this.hideSearchResults.bind(this));
        
        // 筛选器切换
        this.filterToggle.addEventListener('click', this.toggleFilters.bind(this));
        
        // 筛选器应用
        this.searchContainer.querySelector('.apply-filters').addEventListener('click', this.applyFilters.bind(this));
        this.searchContainer.querySelector('.clear-filters').addEventListener('click', this.clearFilters.bind(this));
        
        // 清空历史
        this.searchContainer.querySelector('.clear-history').addEventListener('click', this.clearHistory.bind(this));
        
        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!this.searchContainer.contains(e.target)) {
                this.hideSearchResults();
            }
        });
    }

    // 防抖处理
    debounce(func, wait) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(func, wait);
    }

    // 处理搜索输入
    handleSearchInput(event) {
        const query = event.target.value.trim();
        
        if (query.length < this.options.minSearchLength) {
            this.hideSearchResults();
            return;
        }

        this.performSearch(query);
    }

    // 处理搜索焦点
    handleSearchFocus() {
        const query = this.searchInput.value.trim();
        
        if (query.length === 0) {
            this.showHistoryAndFavorites();
        } else if (query.length >= this.options.minSearchLength) {
            this.performSearch(query);
        }
    }

    // 处理搜索键盘事件
    handleSearchKeydown(event) {
        const query = this.searchInput.value.trim();
        
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                if (query.length >= this.options.minSearchLength) {
                    this.executeSearch(query);
                }
                break;
            case 'Escape':
                this.hideSearchResults();
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.navigateResults('down');
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.navigateResults('up');
                break;
        }
    }

    // 执行搜索
    async performSearch(query) {
        try {
            this.showSearchResults();
            
            // 检查缓存
            const cacheKey = `${query}_${JSON.stringify(this.filters)}`;
            if (this.activeSearches.has(cacheKey)) {
                this.displaySearchResults(this.activeSearches.get(cacheKey), query);
                return;
            }

            // 执行搜索
            const results = await this.searchData(query, this.filters);
            
            // 缓存结果
            this.activeSearches.set(cacheKey, results);
            
            // 显示结果
            this.displaySearchResults(results, query);
            
            // 保存搜索历史
            if (this.options.enableHistory) {
                this.searchHistory.add(query);
                this.updateHistoryDisplay();
            }
            
        } catch (error) {
            console.error('搜索错误:', error);
            this.displaySearchError(error.message);
        }
    }

    // 搜索数据
    async searchData(query, filters) {
        // 这里应该根据实际数据结构实现搜索逻辑
        // 暂时使用模拟数据
        const mockData = this.getMockData();
        
        let results = mockData.filter(item => {
            return this.matchesQuery(item, query);
        });

        // 应用筛选器
        results = this.applyFiltersToResults(results, filters);

        // 限制结果数量
        return results.slice(0, this.options.maxResults);
    }

    // 检查是否匹配查询
    matchesQuery(item, query) {
        const searchFields = ['title', 'description', 'content', 'tags'];
        const queryLower = query.toLowerCase();
        
        if (this.options.fuzzySearch) {
            return searchFields.some(field => 
                item[field] && item[field].toLowerCase().includes(queryLower)
            );
        }
        
        // 精确搜索
        const words = queryLower.split(' ');
        return words.every(word => 
            searchFields.some(field => 
                item[field] && item[field].toLowerCase().includes(word)
            )
        );
    }

    // 应用筛选器
    applyFiltersToResults(results, filters) {
        return results.filter(item => {
            for (const [filterKey, filterValue] of Object.entries(filters)) {
                if (!this.matchesFilter(item, filterKey, filterValue)) {
                    return false;
                }
            }
            return true;
        });
    }

    // 匹配筛选器
    matchesFilter(item, filterKey, filterValue) {
        switch (filterKey) {
            case 'dateRange':
                const itemDate = new Date(item.date);
                return itemDate >= filterValue.start && itemDate <= filterValue.end;
            case 'amountRange':
                return item.amount >= filterValue.min && item.amount <= filterValue.max;
            case 'status':
                return item.status === filterValue;
            case 'category':
                return item.category === filterValue;
            default:
                return true;
        }
    }

    // 显示搜索结果
    displaySearchResults(results, query) {
        this.resultsCount.textContent = `${results.length} 个结果`;
        
        if (results.length === 0) {
            this.searchResults.innerHTML = '<div class="no-results">未找到匹配的结果</div>';
            return;
        }

        const resultsHTML = results.map(result => 
            this.renderSearchResult(result, query)
        ).join('');
        
        this.searchResults.innerHTML = resultsHTML;
        
        // 添加点击事件
        this.searchResults.querySelectorAll('.search-result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectResult(results[index]);
            });
        });
    }

    // 渲染搜索结果
    renderSearchResult(result, query) {
        let highlightedTitle = result.title;
        let highlightedContent = result.content;
        
        if (this.options.highlightMatches) {
            highlightedTitle = this.highlightMatches(result.title, query);
            highlightedContent = this.highlightMatches(result.content, query);
        }

        return `
            <div class="search-result-item" data-id="${result.id}">
                <div class="result-content">
                    <h4 class="result-title">${highlightedTitle}</h4>
                    <p class="result-description">${highlightedContent}</p>
                    <div class="result-meta">
                        <span class="result-date">${this.formatDate(result.date)}</span>
                        <span class="result-status status-${result.status}">${result.status}</span>
                        ${result.amount ? `<span class="result-amount">¥${result.amount}</span>` : ''}
                    </div>
                    ${result.tags ? `<div class="result-tags">${result.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
                </div>
                <div class="result-actions">
                    <button class="favorite-btn" aria-label="收藏">
                        ${this.searchFavorites.isFavorite(query) ? '★' : '☆'}
                    </button>
                </div>
            </div>
        `;
    }

    // 高亮匹配文本
    highlightMatches(text, query) {
        if (!query || !text) return text;
        
        const words = query.toLowerCase().split(' ');
        let highlightedText = text;
        
        words.forEach(word => {
            const regex = new RegExp(`(${word})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
        });
        
        return highlightedText;
    }

    // 格式化日期
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return '今天';
        if (diffDays === 2) return '昨天';
        if (diffDays <= 7) return `${diffDays}天前`;
        
        return date.toLocaleDateString('zh-CN');
    }

    // 选择搜索结果
    selectResult(result) {
        // 触发自定义事件
        document.dispatchEvent(new CustomEvent('searchResultSelected', {
            detail: { result }
        }));
        
        this.hideSearchResults();
    }

    // 显示搜索错误
    displaySearchError(message) {
        this.searchResults.innerHTML = `
            <div class="search-error">
                <p>搜索出现错误: ${message}</p>
            </div>
        `;
    }

    // 显示搜索结果面板
    showSearchResults() {
        this.searchContainer.querySelector('.search-results-container').style.display = 'block';
        this.searchSuggestions.style.display = 'none';
        this.searchHistoryPanel.style.display = 'none';
        this.searchFavoritesPanel.style.display = 'none';
    }

    // 隐藏搜索结果面板
    hideSearchResults() {
        this.searchContainer.querySelector('.search-results-container').style.display = 'none';
    }

    // 显示历史和收藏
    showHistoryAndFavorites() {
        const container = this.searchContainer.querySelector('.search-results-container');
        container.style.display = 'block';
        this.searchResults.innerHTML = '';
        
        // 显示历史
        if (this.options.enableHistory) {
            this.updateHistoryDisplay();
            this.searchHistoryPanel.style.display = 'block';
        }
        
        // 显示收藏
        if (this.options.enableFavorites) {
            this.updateFavoritesDisplay();
            this.searchFavoritesPanel.style.display = 'block';
        }
    }

    // 更新历史显示
    updateHistoryDisplay() {
        const history = this.searchHistory.getHistory();
        this.historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <span class="history-query">${item.query}</span>
                <span class="history-time">${this.formatDate(item.timestamp)}</span>
                <button class="history-favorite" data-query="${item.query}">
                    ${this.searchFavorites.isFavorite(item.query) ? '★' : '☆'}
                </button>
            </div>
        `).join('');
        
        // 添加事件监听
        this.historyList.querySelectorAll('.history-item').forEach(item => {
            const query = item.querySelector('.history-query').textContent;
            const favoriteBtn = item.querySelector('.history-favorite');
            
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('history-favorite')) {
                    this.searchInput.value = query;
                    this.performSearch(query);
                }
            });
            
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavorite(query);
                favoriteBtn.textContent = this.searchFavorites.isFavorite(query) ? '★' : '☆';
            });
        });
    }

    // 更新收藏显示
    updateFavoritesDisplay() {
        const favorites = this.searchFavorites.getFavorites();
        this.favoritesList.innerHTML = favorites.map(query => `
            <div class="favorite-item">
                <span class="favorite-query">${query}</span>
                <button class="favorite-remove" data-query="${query}">×</button>
            </div>
        `).join('');
        
        // 添加事件监听
        this.favoritesList.querySelectorAll('.favorite-item').forEach(item => {
            const query = item.querySelector('.favorite-query').textContent;
            
            item.addEventListener('click', () => {
                this.searchInput.value = query;
                this.performSearch(query);
            });
            
            item.querySelector('.favorite-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                this.searchFavorites.removeFavorite(query);
                this.updateFavoritesDisplay();
            });
        });
    }

    // 切换收藏状态
    toggleFavorite(query) {
        if (this.searchFavorites.isFavorite(query)) {
            this.searchFavorites.removeFavorite(query);
        } else {
            this.searchFavorites.addFavorite(query);
        }
    }

    // 清空搜索
    clearSearch() {
        this.searchInput.value = '';
        this.hideSearchResults();
        this.searchInput.focus();
    }

    // 导航搜索结果
    navigateResults(direction) {
        const items = this.searchResults.querySelectorAll('.search-result-item');
        if (items.length === 0) return;
        
        const activeIndex = Array.from(items).findIndex(item => 
            item.classList.contains('active')
        );
        
        let nextIndex;
        if (direction === 'down') {
            nextIndex = activeIndex < 0 ? 0 : Math.min(activeIndex + 1, items.length - 1);
        } else {
            nextIndex = activeIndex < 0 ? items.length - 1 : Math.max(activeIndex - 1, 0);
        }
        
        // 移除之前的活动状态
        items.forEach(item => item.classList.remove('active'));
        
        // 设置新的活动状态
        if (nextIndex >= 0) {
            items[nextIndex].classList.add('active');
        }
    }

    // 执行完整搜索
    executeSearch(query) {
        document.dispatchEvent(new CustomEvent('searchExecuted', {
            detail: { query, filters: this.filters }
        }));
    }

    // 切换筛选器面板
    toggleFilters() {
        const panel = this.searchFiltersPanel;
        const isExpanded = this.filterToggle.getAttribute('aria-expanded') === 'true';
        
        this.filterToggle.setAttribute('aria-expanded', !isExpanded);
        panel.style.display = isExpanded ? 'none' : 'block';
        
        if (!isExpanded && Object.keys(this.filters).length > 0) {
            this.updateFiltersDisplay();
        }
    }

    // 应用筛选器
    applyFilters() {
        const query = this.searchInput.value.trim();
        if (query.length >= this.options.minSearchLength) {
            this.performSearch(query);
        }
        this.toggleFilters();
    }

    // 清空筛选器
    clearFilters() {
        this.filters = {};
        this.filterCount.textContent = '0';
        
        const query = this.searchInput.value.trim();
        if (query.length >= this.options.minSearchLength) {
            this.performSearch(query);
        }
    }

    // 更新筛选器显示
    updateFiltersDisplay() {
        const activeFilters = Object.keys(this.filters).length;
        this.filterCount.textContent = activeFilters;
        
        // 这里应该根据实际需求动态生成筛选器UI
        this.filtersContent.innerHTML = this.generateFiltersHTML();
    }

    // 生成筛选器HTML
    generateFiltersHTML() {
        return `
            <div class="filter-group">
                <h5>日期范围</h5>
                <input type="date" class="filter-date-start" placeholder="开始日期">
                <input type="date" class="filter-date-end" placeholder="结束日期">
            </div>
            <div class="filter-group">
                <h5>金额范围</h5>
                <input type="number" class="filter-amount-min" placeholder="最小金额">
                <input type="number" class="filter-amount-max" placeholder="最大金额">
            </div>
            <div class="filter-group">
                <h5>状态</h5>
                <select class="filter-status">
                    <option value="">全部</option>
                    <option value="completed">已完成</option>
                    <option value="pending">待处理</option>
                    <option value="cancelled">已取消</option>
                </select>
            </div>
        `;
    }

    // 清空搜索历史
    clearHistory() {
        if (confirm('确定要清空搜索历史吗？')) {
            this.searchHistory.clear();
            this.updateHistoryDisplay();
        }
    }

    // 加载搜索索引
    loadSearchIndex() {
        // 这里应该从服务器或本地存储加载搜索索引
        // 暂时使用模拟数据
    }

    // 获取模拟数据
    getMockData() {
        return [
            {
                id: 1,
                title: '群组活动',
                description: '2024年春季团建活动安排',
                content: '组织团队建设活动，增进同事感情',
                date: '2024-03-15',
                status: 'completed',
                category: '活动',
                amount: 5000,
                tags: ['团建', '活动', '团队']
            },
            {
                id: 2,
                title: '费用报销',
                description: '出差费用报销申请',
                content: '北京出差三天，相关费用报销',
                date: '2024-03-10',
                status: 'pending',
                category: '费用',
                amount: 2500,
                tags: ['报销', '出差', '费用']
            }
            // 更多模拟数据...
        ];
    }

    // 销毁搜索管理器
    destroy() {
        if (this.searchContainer) {
            this.searchContainer.remove();
        }
        this.activeSearches.clear();
    }
}

// 搜索历史管理
class SearchHistory {
    constructor() {
        this.key = 'search_history';
        this.maxItems = 50;
    }

    add(query) {
        if (!query.trim()) return;
        
        const history = this.getHistory();
        
        // 移除已存在的相同查询
        const filteredHistory = history.filter(item => item.query !== query);
        
        // 添加到开头
        filteredHistory.unshift({
            query,
            timestamp: new Date().toISOString()
        });
        
        // 限制数量
        const limitedHistory = filteredHistory.slice(0, this.maxItems);
        
        localStorage.setItem(this.key, JSON.stringify(limitedHistory));
    }

    getHistory() {
        const history = localStorage.getItem(this.key);
        return history ? JSON.parse(history) : [];
    }

    clear() {
        localStorage.removeItem(this.key);
    }
}

// 搜索收藏管理
class SearchFavorites {
    constructor() {
        this.key = 'search_favorites';
        this.maxItems = 100;
    }

    addFavorite(query) {
        if (!query.trim()) return;
        
        const favorites = this.getFavorites();
        
        if (!favorites.includes(query)) {
            favorites.unshift(query);
            
            // 限制数量
            const limitedFavorites = favorites.slice(0, this.maxItems);
            localStorage.setItem(this.key, JSON.stringify(limitedFavorites));
        }
    }

    removeFavorite(query) {
        const favorites = this.getFavorites();
        const filtered = favorites.filter(fav => fav !== query);
        localStorage.setItem(this.key, JSON.stringify(filtered));
    }

    getFavorites() {
        const favorites = localStorage.getItem(this.key);
        return favorites ? JSON.parse(favorites) : [];
    }

    isFavorite(query) {
        return this.getFavorites().includes(query);
    }
}

// 创建全局搜索管理器实例
window.searchManager = new SearchManager();
window.SearchManager = SearchManager;
window.SearchHistory = SearchHistory;
window.SearchFavorites = SearchFavorites;

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    // 绑定搜索快捷键
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            window.searchManager.searchInput.focus();
        }
    });
});