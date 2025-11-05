// ==============================================
// 导航和页面管理模块
// 版本: 1.0.0
// 描述: 实现顶部导航栏、面包屑导航、移动端菜单和页面管理
// ==============================================

/**
 * 导航和页面管理模块
 * 提供完整的页面导航和用户界面管理功能
 */
const Navigation = (() => {
    // 配置常量
    const CONFIG = {
        MOBILE_BREAKPOINT: 768, // 移动端断点
        SIDEBAR_WIDTH: 250, // 侧边栏宽度
        NAVIGATION_ANIMATION_DURATION: 300,
        TOOLTIP_DELAY: 1000,
        BREADCRUMB_MAX_ITEMS: 5,
        DEFAULT_PAGE_TITLE: '共享费用管理',
        
        // 导航项配置
        NAV_ITEMS: [
            { name: '首页', path: '/', icon: 'home', requireAuth: false },
            { name: '仪表板', path: '/dashboard', icon: 'dashboard', requireAuth: true },
            { name: '群组', path: '/groups', icon: 'group', requireAuth: true },
            { name: '费用', path: '/expenses', icon: 'expense', requireAuth: true },
            { name: '支付', path: '/payments', icon: 'payment', requireAuth: true },
            { name: '统计', path: '/statistics', icon: 'chart', requireAuth: true },
            { name: '设置', path: '/settings', icon: 'settings', requireAuth: true }
        ]
    };

    // DOM元素引用
    const DOM = {
        navbar: null,
        sidebar: null,
        mobileMenu: null,
        breadcrumb: null,
        userMenu: null,
        currentPageContent: null,
        loadingOverlay: null
    };

    // 状态管理
    const State = {
        isMobile: false,
        sidebarCollapsed: false,
        currentPage: '',
        userInfo: null,
        notifications: [],
        isLoading: false
    };

    // 事件监听器
    const EventListeners = {
        listeners: new Map(),
        
        add(type, handler, options = {}) {
            const listener = (event) => handler(event);
            if (options.once) {
                handler.__once = true;
            }
            this.listeners.set(handler, { type, listener, options });
            document.addEventListener(type, listener, options);
        },
        
        remove(handler) {
            const info = this.listeners.get(handler);
            if (info) {
                document.removeEventListener(info.type, info.listener, info.options);
                this.listeners.delete(handler);
            }
        },
        
        clear() {
            this.listeners.forEach(({ type, listener, options }, handler) => {
                document.removeEventListener(type, listener, options);
            });
            this.listeners.clear();
        }
    };

    // 工具函数
    const Utils = {
        // 检查是否为移动设备
        isMobile() {
            return window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
        },

        // 防抖函数
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // 节流函数
        throttle(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        // 获取用户头像URL
        getAvatarUrl(user) {
            if (user?.avatar) {
                return user.avatar;
            }
            return `data:image/svg+xml;base64,${btoa(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="20" fill="#3b82f6"/>
                    <text x="20" y="26" font-family="Arial, sans-serif" font-size="14" fill="white" text-anchor="middle">
                        ${user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </text>
                </svg>
            `)}`;
        },

        // 格式化时间
        formatTime(date) {
            const now = new Date();
            const target = new Date(date);
            const diff = now - target;
            
            if (diff < 60000) return '刚刚';
            if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
            if (diff < 2592000000) return `${Math.floor(diff / 86400000)}天前`;
            
            return target.toLocaleDateString();
        }
    };

    // DOM操作
    const DOMOperations = {
        // 初始化DOM引用
        init() {
            DOM.navbar = document.querySelector('.navbar');
            DOM.sidebar = document.querySelector('.sidebar');
            DOM.mobileMenu = document.querySelector('.mobile-menu');
            DOM.breadcrumb = document.querySelector('.breadcrumb');
            DOM.userMenu = document.querySelector('.user-menu');
            DOM.currentPageContent = document.querySelector('.current-page');
        },

        // 创建导航栏
        createNavbar() {
            const navbar = document.createElement('nav');
            navbar.className = 'navbar';
            navbar.innerHTML = `
                <div class="navbar-brand">
                    <button class="sidebar-toggle" id="sidebarToggle">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                    <div class="navbar-logo">
                        <img src="/images/logo.png" alt="Logo" class="logo">
                        <span class="brand-text">共享费用管理</span>
                    </div>
                </div>
                
                <div class="navbar-nav">
                    <div class="nav-search">
                        <input type="text" placeholder="搜索..." class="search-input">
                        <button class="search-btn">🔍</button>
                    </div>
                </div>
                
                <div class="navbar-actions">
                    <div class="nav-notifications" id="notifications">
                        <button class="notification-btn">
                            🔔
                            <span class="notification-badge" id="notificationBadge">0</span>
                        </button>
                        <div class="notification-dropdown">
                            <div class="notification-header">
                                <h3>通知</h3>
                                <button class="mark-all-read">全部已读</button>
                            </div>
                            <div class="notification-list" id="notificationList">
                                <!-- 通知列表 -->
                            </div>
                        </div>
                    </div>
                    
                    <div class="user-menu" id="userMenu">
                        <button class="user-menu-btn">
                            <img src="${Utils.getAvatarUrl(State.userInfo)}" alt="用户头像" class="user-avatar">
                            <span class="user-name">${State.userInfo?.full_name || '用户'}</span>
                            <span class="dropdown-arrow">▼</span>
                        </button>
                        <div class="user-dropdown">
                            <a href="/profile" class="dropdown-item">
                                <span class="icon">👤</span>
                                个人资料
                            </a>
                            <a href="/settings" class="dropdown-item">
                                <span class="icon">⚙️</span>
                                设置
                            </a>
                            <div class="dropdown-divider"></div>
                            <button class="dropdown-item logout-btn" id="logoutBtn">
                                <span class="icon">🚪</span>
                                退出登录
                            </button>
                        </div>
                    </div>
                    
                    <button class="mobile-menu-toggle" id="mobileMenuToggle">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            `;
            
            document.body.insertBefore(navbar, document.body.firstChild);
            DOM.navbar = navbar;
        },

        // 创建侧边栏
        createSidebar() {
            const sidebar = document.createElement('aside');
            sidebar.className = 'sidebar';
            sidebar.innerHTML = `
                <div class="sidebar-header">
                    <div class="sidebar-logo">
                        <img src="/images/logo-white.png" alt="Logo" class="logo">
                        <span class="logo-text">共享费用</span>
                    </div>
                    <button class="sidebar-collapse" id="sidebarCollapse">
                        <span>❌</span>
                    </button>
                </div>
                
                <nav class="sidebar-nav">
                    <ul class="nav-list" id="navList">
                        ${this.generateNavItems()}
                    </ul>
                </nav>
                
                <div class="sidebar-footer">
                    <div class="user-info">
                        <img src="${Utils.getAvatarUrl(State.userInfo)}" alt="用户头像" class="user-avatar">
                        <div class="user-details">
                            <span class="user-name">${State.userInfo?.full_name || '用户'}</span>
                            <span class="user-email">${State.userInfo?.email || ''}</span>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(sidebar);
            DOM.sidebar = sidebar;
        },

        // 生成导航项
        generateNavItems() {
            return CONFIG.NAV_ITEMS.map(item => {
                const visible = !item.requireAuth || Auth.isAuthenticated();
                if (!visible) return '';
                
                return `
                    <li class="nav-item">
                        <a href="${item.path}" data-route="${item.path}" class="nav-link">
                            <span class="nav-icon">${this.getIconSymbol(item.icon)}</span>
                            <span class="nav-text">${item.name}</span>
                            <span class="nav-badge" style="display: none;"></span>
                        </a>
                    </li>
                `;
            }).join('');
        },

        // 获取图标符号
        getIconSymbol(icon) {
            const icons = {
                home: '🏠',
                dashboard: '📊',
                group: '👥',
                expense: '💰',
                payment: '💳',
                chart: '📈',
                settings: '⚙️'
            };
            return icons[icon] || '📄';
        },

        // 创建面包屑导航
        createBreadcrumb() {
            const breadcrumb = document.createElement('div');
            breadcrumb.className = 'breadcrumb';
            breadcrumb.innerHTML = `
                <nav class="breadcrumb-nav">
                    <ol class="breadcrumb-list" id="breadcrumbList">
                        <li class="breadcrumb-item">
                            <a href="/" data-route="/" class="breadcrumb-link">首页</a>
                        </li>
                    </ol>
                </nav>
            `;
            
            const container = document.querySelector('.page-container') || document.body;
            container.insertBefore(breadcrumb, container.firstChild);
            DOM.breadcrumb = breadcrumb;
        },

        // 更新面包屑导航
        updateBreadcrumb(path, params = {}) {
            const breadcrumbList = document.getElementById('breadcrumbList');
            const crumbs = [];
            
            // 首页
            crumbs.push({
                name: '首页',
                path: '/',
                isActive: path === '/'
            });
            
            // 根据路径生成面包屑项
            const pathParts = path.split('/').filter(Boolean);
            let currentPath = '';
            
            pathParts.forEach((part, index) => {
                currentPath += '/' + part;
                const isLast = index === pathParts.length - 1;
                
                if (isLast) {
                    // 最后一项通常需要特殊处理
                    let name = part;
                    if (params[part]) {
                        name = params[part];
                    } else {
                        // 根据路由映射名称
                        name = Navigation.getRouteDisplayName(part) || part;
                    }
                    
                    crumbs.push({
                        name,
                        path: currentPath,
                        isActive: true
                    });
                } else {
                    crumbs.push({
                        name: Navigation.getRouteDisplayName(part) || part,
                        path: currentPath,
                        isActive: false
                    });
                }
            });
            
            // 生成HTML
            breadcrumbList.innerHTML = crumbs.map(crumb => `
                <li class="breadcrumb-item ${crumb.isActive ? 'active' : ''}">
                    ${crumb.isActive ? 
                        `<span class="breadcrumb-current">${crumb.name}</span>` :
                        `<a href="${crumb.path}" data-route="${crumb.path}" class="breadcrumb-link">${crumb.name}</a>`
                    }
                </li>
            `).join('');
        },

        // 获取路由显示名称
        getRouteDisplayName(route) {
            const routeNames = {
                'dashboard': '仪表板',
                'groups': '群组管理',
                'group-detail': '群组详情',
                'expenses': '费用管理',
                'expense-detail': '费用详情',
                'payments': '支付管理',
                'payment-detail': '支付详情',
                'statistics': '统计分析',
                'settings': '设置',
                'profile': '个人资料'
            };
            return routeNames[route];
        }
    };

    // 导航控制
    const NavigationControls = {
        // 切换侧边栏
        toggleSidebar() {
            const sidebar = DOM.sidebar;
            const navbar = DOM.navbar;
            
            if (Utils.isMobile()) {
                // 移动端：侧滑菜单
                if (sidebar.classList.contains('show')) {
                    sidebar.classList.remove('show');
                    navbar?.classList.remove('sidebar-open');
                } else {
                    sidebar.classList.add('show');
                    navbar?.classList.add('sidebar-open');
                }
            } else {
                // 桌面端：折叠菜单
                if (sidebar.classList.contains('collapsed')) {
                    sidebar.classList.remove('collapsed');
                    State.sidebarCollapsed = false;
                } else {
                    sidebar.classList.add('collapsed');
                    State.sidebarCollapsed = true;
                }
            }
        },

        // 关闭侧边栏
        closeSidebar() {
            const sidebar = DOM.sidebar;
            const navbar = DOM.navbar;
            
            if (Utils.isMobile()) {
                sidebar.classList.remove('show');
                navbar?.classList.remove('sidebar-open');
            }
        },

        // 切换移动端菜单
        toggleMobileMenu() {
            const mobileMenu = document.querySelector('.mobile-menu-dropdown');
            if (mobileMenu) {
                mobileMenu.classList.toggle('show');
            }
        },

        // 更新用户菜单
        updateUserMenu(user) {
            State.userInfo = user;
            
            // 更新头像
            const avatars = document.querySelectorAll('.user-avatar');
            avatars.forEach(avatar => {
                avatar.src = Utils.getAvatarUrl(user);
            });
            
            // 更新用户名
            const userNames = document.querySelectorAll('.user-name');
            userNames.forEach(name => {
                name.textContent = user?.full_name || '用户';
            });
            
            // 更新用户邮箱
            const userEmails = document.querySelectorAll('.user-email');
            userEmails.forEach(email => {
                email.textContent = user?.email || '';
            });
        },

        // 更新导航项状态
        updateNavItems() {
            const navList = document.getElementById('navList');
            if (navList) {
                navList.innerHTML = DOMOperations.generateNavItems();
            }
        }
    };

    // 页面管理
    const PageManager = {
        // 加载页面
        async loadPage(path, params = {}) {
            State.isLoading = true;
            Navigation.showLoading();
            
            try {
                State.currentPage = path;
                
                // 更新面包屑
                DOMOperations.updateBreadcrumb(path, params);
                
                // 通知路由变化
                window.dispatchEvent(new CustomEvent('navigation:pageChanged', {
                    detail: { path, params }
                }));
                
            } catch (error) {
                console.error('Page loading error:', error);
                Navigation.showError(error.message);
            } finally {
                State.isLoading = false;
                Navigation.hideLoading();
            }
        },

        // 显示错误页面
        showError(message) {
            const container = document.querySelector('.page-container') || document.body;
            container.innerHTML = `
                <div class="error-page">
                    <div class="error-content">
                        <div class="error-icon">❌</div>
                        <h2>出现错误</h2>
                        <p>${message}</p>
                        <button class="btn btn-primary" onclick="Navigation.reload()">重新加载</button>
                    </div>
                </div>
            `;
        },

        // 重新加载当前页
        reload() {
            if (State.currentPage) {
                Router.reload();
            }
        },

        // 返回上一页
        goBack() {
            Router.back();
        }
    };

    // 通知系统
    const NotificationSystem = {
        // 显示通知
        show(message, type = 'info', duration = 3000) {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <div class="notification-content">
                    <span class="notification-icon">${this.getIcon(type)}</span>
                    <span class="notification-message">${message}</span>
                </div>
                <button class="notification-close" onclick="this.parentElement.remove()">×</button>
            `;
            
            // 添加到容器
            let container = document.getElementById('notification-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'notification-container';
                container.className = 'notification-container';
                document.body.appendChild(container);
            }
            
            container.appendChild(notification);
            
            // 自动移除
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
            
            // 显示动画
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
        },

        // 获取通知图标
        getIcon(type) {
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };
            return icons[type] || icons.info;
        },

        // 更新通知徽章
        updateBadge(count) {
            const badge = document.getElementById('notificationBadge');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline' : 'none';
            }
        }
    };

    // 公共API
    const NavigationAPI = {
        // 初始化导航系统
        init() {
            DOMOperations.init();
            
            // 检查移动设备
            State.isMobile = Utils.isMobile();
            
            // 创建导航元素
            DOMOperations.createNavbar();
            DOMOperations.createSidebar();
            DOMOperations.createBreadcrumb();
            
            // 绑定事件
            NavigationAPI.bindEvents();
            
            // 监听认证状态变化
            Auth.onAuthStateChange((isAuthenticated, user) => {
                NavigationControls.updateUserMenu(user);
                NavigationControls.updateNavItems();
            });
            
            // 监听路由变化
            window.addEventListener('route:changed', (e) => {
                PageManager.loadPage(e.detail.route.path, e.detail.route.params);
            });
            
            console.log('✅ Navigation system initialized');
        },

        // 绑定事件
        bindEvents() {
            // 侧边栏切换
            const sidebarToggle = document.getElementById('sidebarToggle');
            if (sidebarToggle) {
                sidebarToggle.addEventListener('click', NavigationControls.toggleSidebar);
            }
            
            // 侧边栏折叠
            const sidebarCollapse = document.getElementById('sidebarCollapse');
            if (sidebarCollapse) {
                sidebarCollapse.addEventListener('click', NavigationControls.toggleSidebar);
            }
            
            // 移动端菜单切换
            const mobileMenuToggle = document.getElementById('mobileMenuToggle');
            if (mobileMenuToggle) {
                mobileMenuToggle.addEventListener('click', NavigationControls.toggleMobileMenu);
            }
            
            // 点击外部关闭侧边栏
            document.addEventListener('click', (e) => {
                if (Utils.isMobile() && 
                    DOM.sidebar?.classList.contains('show') &&
                    !e.target.closest('.sidebar') &&
                    !e.target.closest('.sidebar-toggle')) {
                    NavigationControls.closeSidebar();
                }
            });
            
            // 窗口大小变化
            window.addEventListener('resize', Utils.debounce(() => {
                const wasMobile = State.isMobile;
                State.isMobile = Utils.isMobile();
                
                // 如果从移动端切换到桌面端，关闭侧边栏
                if (wasMobile && !State.isMobile) {
                    NavigationControls.closeSidebar();
                }
            }, 250));
            
            // 用户菜单
            const userMenuBtn = document.querySelector('.user-menu-btn');
            if (userMenuBtn) {
                userMenuBtn.addEventListener('click', () => {
                    const dropdown = userMenuBtn.parentNode.querySelector('.user-dropdown');
                    dropdown?.classList.toggle('show');
                });
            }
            
            // 登出按钮
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    Auth.logout();
                });
            }
            
            // 搜索功能
            const searchInput = document.querySelector('.search-input');
            const searchBtn = document.querySelector('.search-btn');
            
            if (searchInput && searchBtn) {
                const handleSearch = () => {
                    const query = searchInput.value.trim();
                    if (query) {
                        Router.goTo('/search', { query: { q: query } });
                    }
                };
                
                searchBtn.addEventListener('click', handleSearch);
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        handleSearch();
                    }
                });
            }
        },

        // 显示加载状态
        showLoading() {
            if (State.isLoading) return;
            
            State.isLoading = true;
            let loading = document.getElementById('page-loading');
            
            if (!loading) {
                loading = document.createElement('div');
                loading.id = 'page-loading';
                loading.className = 'page-loading';
                loading.innerHTML = `
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <div class="loading-text">加载中...</div>
                    </div>
                `;
                document.body.appendChild(loading);
            }
            
            loading.style.display = 'flex';
        },

        // 隐藏加载状态
        hideLoading() {
            State.isLoading = false;
            const loading = document.getElementById('page-loading');
            if (loading) {
                loading.style.display = 'none';
            }
        },

        // 显示通知
        notify: NotificationSystem.show,

        // 错误提示
        error(message) {
            NotificationSystem.show(message, 'error', 5000);
        },

        // 成功提示
        success(message) {
            NotificationSystem.show(message, 'success', 3000);
        },

        // 警告提示
        warning(message) {
            NotificationSystem.show(message, 'warning', 4000);
        },

        // 信息提示
        info(message) {
            NotificationSystem.show(message, 'info', 3000);
        },

        // 更新页面标题
        setPageTitle(title) {
            document.title = title ? `${title} - ${CONFIG.DEFAULT_PAGE_TITLE}` : CONFIG.DEFAULT_PAGE_TITLE;
        },

        // 获取当前页面信息
        getCurrentPage() {
            return {
                path: State.currentPage,
                title: document.title
            };
        },

        // 切换主题
        toggleTheme(theme) {
            document.body.className = document.body.className.replace(/theme-\w+/, '');
            document.body.classList.add(`theme-${theme}`);
            localStorage.setItem('theme', theme);
        }
    };

    // 工具方法初始化
    DOMOperations.generateNavItems = DOMOperations.generateNavItems.bind(DOMOperations);
    DOMOperations.getIconSymbol = DOMOperations.getIconSymbol.bind(DOMOperations);
    DOMOperations.updateBreadcrumb = DOMOperations.updateBreadcrumb.bind(DOMOperations);
    DOMOperations.getRouteDisplayName = DOMOperations.getRouteDisplayName.bind(DOMOperations);

    return NavigationAPI;
})();

// ==============================================
// 全局样式注入
// ==============================================

(function injectStyles() {
    const styles = `
        <style>
            /* 导航栏样式 */
            .navbar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 60px;
                background: white;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                align-items: center;
                padding: 0 1rem;
                z-index: 1000;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            
            .navbar-brand {
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .sidebar-toggle {
                display: none;
                background: none;
                border: none;
                cursor: pointer;
                flex-direction: column;
                gap: 3px;
                padding: 5px;
            }
            
            .sidebar-toggle span {
                width: 20px;
                height: 2px;
                background: #374151;
                transition: all 0.3s;
            }
            
            .navbar-logo {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .logo {
                height: 32px;
                width: 32px;
            }
            
            .brand-text {
                font-size: 1.25rem;
                font-weight: 600;
                color: #1f2937;
            }
            
            .navbar-nav {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 2rem;
            }
            
            .nav-search {
                position: relative;
                width: 100%;
                max-width: 400px;
            }
            
            .search-input {
                width: 100%;
                padding: 0.5rem 1rem 0.5rem 2.5rem;
                border: 1px solid #d1d5db;
                border-radius: 20px;
                outline: none;
                transition: border-color 0.2s;
            }
            
            .search-input:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            
            .search-btn {
                position: absolute;
                left: 0.5rem;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                cursor: pointer;
                font-size: 1rem;
            }
            
            .navbar-actions {
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .nav-notifications {
                position: relative;
            }
            
            .notification-btn {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 1.25rem;
                padding: 0.5rem;
                position: relative;
            }
            
            .notification-badge {
                position: absolute;
                top: 0;
                right: 0;
                background: #ef4444;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 0.75rem;
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 18px;
            }
            
            .notification-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                width: 320px;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                display: none;
                z-index: 1001;
            }
            
            .notification-dropdown.show {
                display: block;
            }
            
            .user-menu {
                position: relative;
            }
            
            .user-menu-btn {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 8px;
                transition: background-color 0.2s;
            }
            
            .user-menu-btn:hover {
                background-color: #f3f4f6;
            }
            
            .user-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                object-fit: cover;
            }
            
            .user-name {
                font-weight: 500;
                color: #374151;
            }
            
            .dropdown-arrow {
                font-size: 0.75rem;
                color: #6b7280;
            }
            
            .user-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                width: 200px;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                display: none;
                z-index: 1001;
            }
            
            .user-dropdown.show {
                display: block;
            }
            
            .dropdown-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1rem;
                text-decoration: none;
                color: #374151;
                border: none;
                background: none;
                width: 100%;
                text-align: left;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .dropdown-item:hover {
                background-color: #f3f4f6;
            }
            
            .dropdown-divider {
                height: 1px;
                background: #e5e7eb;
                margin: 0.25rem 0;
            }
            
            .mobile-menu-toggle {
                display: none;
                background: none;
                border: none;
                cursor: pointer;
                flex-direction: column;
                gap: 3px;
                padding: 5px;
            }
            
            .mobile-menu-toggle span {
                width: 20px;
                height: 2px;
                background: #374151;
                transition: all 0.3s;
            }
            
            /* 侧边栏样式 */
            .sidebar {
                position: fixed;
                top: 60px;
                left: 0;
                width: ${CONFIG.SIDEBAR_WIDTH}px;
                height: calc(100vh - 60px);
                background: #1f2937;
                color: white;
                z-index: 999;
                transition: all ${CONFIG.NAVIGATION_ANIMATION_DURATION}ms ease;
                overflow-y: auto;
            }
            
            .sidebar.collapsed {
                width: 60px;
            }
            
            .sidebar-header {
                padding: 1rem;
                border-bottom: 1px solid #374151;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .sidebar-logo {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .sidebar-logo .logo {
                height: 24px;
                width: 24px;
            }
            
            .logo-text {
                font-weight: 600;
                font-size: 1.125rem;
            }
            
            .sidebar.collapsed .logo-text {
                display: none;
            }
            
            .sidebar-collapse {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 0.25rem;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            
            .sidebar-collapse:hover {
                opacity: 1;
            }
            
            .sidebar-nav {
                flex: 1;
                padding: 1rem 0;
            }
            
            .nav-list {
                list-style: none;
                margin: 0;
                padding: 0;
            }
            
            .nav-item {
                margin: 0.25rem 0;
            }
            
            .nav-link {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                color: #d1d5db;
                text-decoration: none;
                transition: all 0.2s;
                position: relative;
            }
            
            .nav-link:hover {
                background-color: #374151;
                color: white;
            }
            
            .nav-link.active {
                background-color: #3b82f6;
                color: white;
            }
            
            .nav-icon {
                font-size: 1.125rem;
                width: 20px;
                text-align: center;
            }
            
            .nav-text {
                font-weight: 500;
            }
            
            .sidebar.collapsed .nav-text {
                display: none;
            }
            
            .sidebar-footer {
                padding: 1rem;
                border-top: 1px solid #374151;
            }
            
            .user-info {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            
            .user-details {
                flex: 1;
            }
            
            .sidebar.collapsed .user-details {
                display: none;
            }
            
            /* 面包屑导航 */
            .breadcrumb {
                padding: 1rem 0;
                background: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .breadcrumb-nav {
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 1rem;
            }
            
            .breadcrumb-list {
                display: flex;
                align-items: center;
                list-style: none;
                margin: 0;
                padding: 0;
                gap: 0.5rem;
            }
            
            .breadcrumb-item {
                display: flex;
                align-items: center;
            }
            
            .breadcrumb-item:not(:last-child)::after {
                content: '>';
                color: #6b7280;
                margin: 0 0.5rem;
            }
            
            .breadcrumb-link {
                color: #3b82f6;
                text-decoration: none;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            
            .breadcrumb-link:hover {
                background-color: #eff6ff;
            }
            
            .breadcrumb-current {
                color: #374151;
                font-weight: 500;
            }
            
            /* 通知系统 */
            .notification-container {
                position: fixed;
                top: 80px;
                right: 1rem;
                z-index: 1002;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                max-width: 400px;
            }
            
            .notification {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                padding: 1rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                opacity: 0;
            }
            
            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .notification-success {
                border-left: 4px solid #10b981;
            }
            
            .notification-error {
                border-left: 4px solid #ef4444;
            }
            
            .notification-warning {
                border-left: 4px solid #f59e0b;
            }
            
            .notification-info {
                border-left: 4px solid #3b82f6;
            }
            
            .notification-icon {
                font-size: 1.25rem;
            }
            
            .notification-content {
                flex: 1;
            }
            
            .notification-message {
                color: #374151;
                font-size: 0.875rem;
                line-height: 1.4;
            }
            
            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                color: #6b7280;
                font-size: 1.25rem;
                padding: 0.25rem;
            }
            
            .notification-close:hover {
                color: #374151;
            }
            
            /* 加载状态 */
            .page-loading {
                position: fixed;
                top: 60px;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1001;
            }
            
            .loading-spinner {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            }
            
            .spinner {
                width: 32px;
                height: 32px;
                border: 3px solid #e5e7eb;
                border-top: 3px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .loading-text {
                color: #6b7280;
                font-size: 0.875rem;
            }
            
            /* 错误页面 */
            .error-page {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 60vh;
                padding: 2rem;
            }
            
            .error-content {
                text-align: center;
                max-width: 400px;
            }
            
            .error-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
            }
            
            .error-content h1 {
                font-size: 3rem;
                color: #ef4444;
                margin-bottom: 0.5rem;
            }
            
            .error-content h2 {
                font-size: 1.5rem;
                color: #374151;
                margin-bottom: 1rem;
            }
            
            .error-content p {
                color: #6b7280;
                margin-bottom: 2rem;
            }
            
            /* 响应式设计 */
            @media (max-width: 768px) {
                .sidebar-toggle {
                    display: flex;
                }
                
                .navbar-nav {
                    display: none;
                }
                
                .mobile-menu-toggle {
                    display: flex;
                }
                
                .sidebar {
                    transform: translateX(-100%);
                    width: 280px;
                }
                
                .sidebar.show {
                    transform: translateX(0);
                }
                
                .navbar.sidebar-open::after {
                    content: '';
                    position: fixed;
                    top: 60px;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 998;
                }
                
                .notification-container {
                    left: 1rem;
                    right: 1rem;
                    max-width: none;
                }
            }
            
            /* 主题切换 */
            .theme-dark {
                color-scheme: dark;
            }
            
            .theme-dark .navbar {
                background: #1f2937;
                border-bottom-color: #374151;
            }
            
            .theme-dark .brand-text,
            .theme-dark .user-name {
                color: #f9fafb;
            }
            
            .theme-dark .search-input {
                background: #374151;
                border-color: #4b5563;
                color: #f9fafb;
            }
            
            .theme-dark .search-input:focus {
                border-color: #60a5fa;
            }
            
            .theme-dark .user-menu-btn:hover {
                background-color: #374151;
            }
            
            .theme-dark .breadcrumb {
                background: #1f2937;
                border-bottom-color: #374151;
            }
            
            .theme-dark .breadcrumb-link:hover {
                background-color: #374151;
            }
            
            .theme-dark .breadcrumb-current {
                color: #f9fafb;
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
})();

// ==============================================
// 页面结构调整
// ==============================================

(function adjustPageStructure() {
    // 确保页面有正确的容器结构
    document.addEventListener('DOMContentLoaded', () => {
        const main = document.querySelector('main') || document.body;
        const currentPage = document.querySelector('.current-page');
        
        if (!currentPage) {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'current-page page-container';
            
            if (main.children.length > 0) {
                // 移动现有内容到页面容器
                Array.from(main.children).forEach(child => {
                    pageDiv.appendChild(child);
                });
            }
            
            main.appendChild(pageDiv);
        } else {
            currentPage.classList.add('page-container');
        }
    });
})();

// ==============================================
// 全局导出
// ==============================================

window.Navigation = Navigation;