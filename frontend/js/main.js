// ==============================================
// 共享费用管理平台 - 主入口文件
// 版本: 1.0.0
// 描述: 应用程序初始化、模块依赖注入、全局事件管理
// ==============================================

/**
 * 应用程序主入口
 * 负责整个应用的生命周期管理和模块协调
 */
class Application {
    constructor() {
        this.modules = new Map();
        this.initialized = false;
        this.config = {
            debug: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
            version: '1.0.0',
            name: '共享费用管理平台'
        };
        
        this.init();
    }

    /**
     * 应用程序初始化
     */
    async init() {
        console.log(`🚀 启动 ${this.config.name} v${this.config.version}`);
        
        try {
            // 显示启动加载页面
            this.showStartupLoader();
            
            // 初始化核心模块
            await this.initializeCoreModules();
            
            // 注册事件监听器
            this.setupEventListeners();
            
            // 初始化路由系统
            await this.initializeRouter();
            
            // 启动应用
            await this.startApplication();
            
            this.initialized = true;
            console.log('✅ 应用启动成功');
            
        } catch (error) {
            console.error('❌ 应用启动失败:', error);
            this.handleStartupError(error);
        } finally {
            this.hideStartupLoader();
        }
    }

    /**
     * 显示启动加载页面
     */
    showStartupLoader() {
        const loader = document.createElement('div');
        loader.id = 'startup-loader';
        loader.className = 'startup-loader';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="logo">
                    <h1>💰 ${this.config.name}</h1>
                </div>
                <div class="spinner"></div>
                <div class="loading-text">正在初始化...</div>
            </div>
        `;
        
        // 添加启动加载样式
        const style = document.createElement('style');
        style.textContent = `
            .startup-loader {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .loader-content {
                text-align: center;
                color: white;
            }
            
            .logo h1 {
                margin: 0 0 2rem 0;
                font-size: 2.5rem;
                font-weight: 300;
                letter-spacing: 2px;
            }
            
            .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-top: 3px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
            }
            
            .loading-text {
                font-size: 1rem;
                opacity: 0.8;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(loader);
    }

    /**
     * 隐藏启动加载页面
     */
    hideStartupLoader() {
        const loader = document.getElementById('startup-loader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.5s ease-out';
            setTimeout(() => {
                loader.remove();
            }, 500);
        }
    }

    /**
     * 初始化核心模块
     */
    async initializeCoreModules() {
        console.log('🔧 初始化核心模块...');
        
        // 按依赖顺序初始化模块
        const moduleOrder = [
            'Config',
            'Logger',
            'Storage',
            'Utils',
            'APIClient',
            'Auth',
            'Router',
            'Forms',
            'Modals',
            'Notifications',
            'Loading'
        ];
        
        for (const moduleName of moduleOrder) {
            try {
                await this.initializeModule(moduleName);
                console.log(`✅ ${moduleName} 模块初始化完成`);
            } catch (error) {
                console.error(`❌ ${moduleName} 模块初始化失败:`, error);
                throw error;
            }
        }
        
        // 初始化业务模块
        await this.initializeBusinessModules();
    }

    /**
     * 初始化单个模块
     */
    async initializeModule(moduleName) {
        // 检查模块是否已存在全局作用域中
        if (typeof window[moduleName] !== 'undefined') {
            this.modules.set(moduleName, window[moduleName]);
            
            // 调用模块的init方法（如果存在）
            if (typeof window[moduleName].init === 'function') {
                await window[moduleName].init();
            }
            
            return;
        }

        // 如果模块不存在，创建基础实现
        switch (moduleName) {
            case 'Config':
                window.CONFIG = this.createConfig();
                this.modules.set('Config', window.CONFIG);
                break;
                
            case 'Logger':
                window.Logger = this.createLogger();
                this.modules.set('Logger', window.Logger);
                break;
                
            case 'Storage':
                window.Storage = this.createStorage();
                this.modules.set('Storage', window.Storage);
                break;
                
            case 'Utils':
                window.Utils = this.createUtils();
                this.modules.set('Utils', window.Utils);
                break;
                
            case 'APIClient':
                window.APIClient = this.createAPIClient();
                this.modules.set('APIClient', window.APIClient);
                break;
                
            case 'Auth':
                // Auth模块在app.js中定义
                this.modules.set('Auth', window.Auth);
                break;
                
            case 'Router':
                // Router模块在router.js中定义
                this.modules.set('Router', window.Router);
                break;
                
            case 'Forms':
                window.Forms = this.createForms();
                this.modules.set('Forms', window.Forms);
                break;
                
            case 'Modals':
                window.Modals = this.createModals();
                this.modules.set('Modals', window.Modals);
                break;
                
            case 'Notifications':
                window.Notifications = this.createNotifications();
                this.modules.set('Notifications', window.Notifications);
                break;
                
            case 'Loading':
                window.Loading = this.createLoading();
                this.modules.set('Loading', window.Loading);
                break;
        }
    }

    /**
     * 初始化业务模块
     */
    async initializeBusinessModules() {
        console.log('🏢 初始化业务模块...');
        
        const businessModules = [
            'Groups',
            'Expenses', 
            'Payments',
            'Balances',
            'FileUpload'
        ];
        
        for (const moduleName of businessModules) {
            try {
                await this.initializeModule(moduleName);
                console.log(`✅ ${moduleName} 模块初始化完成`);
            } catch (error) {
                console.error(`❌ ${moduleName} 模块初始化失败:`, error);
                // 业务模块失败不阻止应用启动
            }
        }
    }

    /**
     * 设置全局事件监听器
     */
    setupEventListeners() {
        console.log('🎧 设置全局事件监听器...');

        // 全局错误处理
        this.setupGlobalErrorHandlers();
        
        // 认证状态变化监听
        this.setupAuthListeners();
        
        // 网络状态监听
        this.setupNetworkListeners();
        
        // 页面可见性变化监听
        this.setupVisibilityListeners();
        
        // 自定义事件监听器
        this.setupCustomListeners();
    }

    /**
     * 设置全局错误处理器
     */
    setupGlobalErrorHandlers() {
        // 未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise拒绝:', event.reason);
            this.logError('unhandledrejection', event.reason);
            event.preventDefault();
            
            if (this.modules.has('Notifications')) {
                this.modules.get('Notifications').error('操作失败，请重试');
            }
        });

        // JavaScript运行时错误
        window.addEventListener('error', (event) => {
            console.error('JavaScript错误:', event.error);
            this.logError('javascript', event.error);
        });

        // 资源加载错误
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                console.error('资源加载错误:', event.target.src || event.target.href);
                this.logError('resource', event.target.src || event.target.href);
            }
        }, true);
    }

    /**
     * 设置认证状态监听器
     */
    setupAuthListeners() {
        if (!this.modules.has('Auth')) return;
        
        const auth = this.modules.get('Auth');
        
        // 监听认证状态变化
        document.addEventListener('auth:login', (event) => {
            console.log('用户登录:', event.detail);
            this.onUserLogin(event.detail);
        });
        
        document.addEventListener('auth:logout', (event) => {
            console.log('用户登出');
            this.onUserLogout(event.detail);
        });
        
        document.addEventListener('auth:token-expired', (event) => {
            console.log('Token过期，需要重新登录');
            this.onTokenExpired(event.detail);
        });
    }

    /**
     * 设置网络状态监听器
     */
    setupNetworkListeners() {
        // 监听网络状态变化
        window.addEventListener('online', () => {
            console.log('网络连接已恢复');
            if (this.modules.has('Notifications')) {
                this.modules.get('Notifications').success('网络连接已恢复');
            }
            this.broadcast('network:online');
        });
        
        window.addEventListener('offline', () => {
            console.log('网络连接已断开');
            if (this.modules.has('Notifications')) {
                this.modules.get('Notifications').warning('网络连接已断开，部分功能可能无法使用');
            }
            this.broadcast('network:offline');
        });
    }

    /**
     * 设置页面可见性监听器
     */
    setupVisibilityListeners() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('页面变为可见');
                this.onPageVisible();
                
                // 检查认证状态
                if (this.modules.has('Auth') && this.modules.get('Auth').shouldRefreshToken()) {
                    this.modules.get('Auth').refreshToken().catch(() => {
                        this.modules.get('Auth').logout();
                    });
                }
            } else {
                console.log('页面变为不可见');
                this.onPageHidden();
            }
        });
    }

    /**
     * 设置自定义事件监听器
     */
    setupCustomListeners() {
        // 路由变化监听
        document.addEventListener('route:changed', (event) => {
            this.onRouteChanged(event.detail);
        });
        
        // 模块加载完成事件
        document.addEventListener('module:loaded', (event) => {
            console.log(`模块 ${event.detail.module} 加载完成`);
        });
        
        // 应用就绪事件
        document.addEventListener('app:ready', (event) => {
            console.log('应用已准备就绪');
            this.onAppReady();
        });
    }

    /**
     * 初始化路由系统
     */
    async initializeRouter() {
        console.log('🧭 初始化路由系统...');
        
        if (!this.modules.has('Router')) {
            throw new Error('Router模块未初始化');
        }
        
        const router = this.modules.get('Router');
        
        // 注册默认路由
        this.registerDefaultRoutes(router);
        
        // 初始化路由
        if (typeof router.init === 'function') {
            router.init();
        }
        
        // 启动路由系统
        if (typeof router.start === 'function') {
            router.start();
        }
        
        console.log('✅ 路由系统初始化完成');
    }

    /**
     * 注册默认路由
     */
    registerDefaultRoutes(router) {
        const routes = [
            { path: '/', component: 'DashboardComponent', title: '仪表板' },
            { path: '/groups', component: 'GroupsListComponent', title: '群组管理' },
            { path: '/groups/:id', component: 'GroupDetailComponent', title: '群组详情' },
            { path: '/expenses/:groupId', component: 'ExpensesComponent', title: '费用管理' },
            { path: '/payments/:groupId', component: 'PaymentsComponent', title: '支付管理' },
            { path: '/balances/:groupId', component: 'BalancesComponent', title: '余额管理' },
            { path: '/profile', component: 'ProfileComponent', title: '个人资料' },
            { path: '/settings', component: 'SettingsComponent', title: '设置' },
            { path: '/404', component: 'NotFoundComponent', title: '页面未找到' }
        ];
        
        routes.forEach(route => {
            if (typeof router.add === 'function') {
                router.add(route.path, route.component);
            }
        });
    }

    /**
     * 启动应用程序
     */
    async startApplication() {
        console.log('🚀 启动应用程序...');
        
        // 检查认证状态
        if (this.modules.has('Auth')) {
            await this.checkAuthStatus();
        }
        
        // 启动定时任务
        this.startTimers();
        
        // 触发应用就绪事件
        document.dispatchEvent(new CustomEvent('app:ready'));
        
        console.log('✅ 应用程序启动完成');
    }

    /**
     * 检查认证状态
     */
    async checkAuthStatus() {
        const auth = this.modules.get('Auth');
        
        try {
            if (auth.isAuthenticated()) {
                // 获取用户信息
                await auth.getCurrentUser();
                console.log('用户已认证');
            } else {
                console.log('用户未认证');
                // 可以重定向到登录页面
            }
        } catch (error) {
            console.error('认证状态检查失败:', error);
            auth.logout();
        }
    }

    /**
     * 启动定时任务
     */
    startTimers() {
        // Token自动刷新
        if (this.modules.has('Auth')) {
            setInterval(() => {
                const auth = this.modules.get('Auth');
                if (auth.isAuthenticated() && auth.shouldRefreshToken()) {
                    auth.refreshToken().catch(() => {
                        auth.logout();
                    });
                }
            }, 60000); // 每分钟检查一次
        }
        
        // 自动保存草稿
        if (this.modules.has('Storage')) {
            setInterval(() => {
                this.broadcast('autosave:trigger');
            }, 30000); // 每30秒触发一次自动保存
        }
    }

    /**
     * 获取模块实例
     */
    getModule(name) {
        return this.modules.get(name);
    }

    /**
     * 注册模块
     */
    registerModule(name, module) {
        this.modules.set(name, module);
        console.log(`模块 ${name} 已注册`);
    }

    /**
     * 广播事件到所有模块
     */
    broadcast(eventName, data = {}) {
        document.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }

    /**
     * 记录错误
     */
    logError(type, error) {
        if (this.modules.has('Logger')) {
            this.modules.get('Logger').error(type, error);
        }
        
        // 可以发送到错误监控服务
        if (this.config.debug) {
            console.group('Error Report');
            console.log('Type:', type);
            console.log('Error:', error);
            console.log('Time:', new Date().toISOString());
            console.log('URL:', window.location.href);
            console.groupEnd();
        }
    }

    /**
     * 用户登录处理
     */
    onUserLogin(userData) {
        console.log('处理用户登录:', userData);
        
        // 初始化用户相关数据
        this.broadcast('user:login', userData);
    }

    /**
     * 用户登出处理
     */
    onUserLogout(data) {
        console.log('处理用户登出:', data);
        
        // 清理用户相关数据
        this.broadcast('user:logout', data);
        
        // 重定向到登录页
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }

    /**
     * Token过期处理
     */
    onTokenExpired(data) {
        console.log('处理Token过期:', data);
        
        if (this.modules.has('Notifications')) {
            this.modules.get('Notifications').warning('登录已过期，请重新登录');
        }
        
        this.modules.get('Auth').logout();
    }

    /**
     * 页面可见时处理
     */
    onPageVisible() {
        this.broadcast('page:visible');
    }

    /**
     * 页面隐藏时处理
     */
    onPageHidden() {
        this.broadcast('page:hidden');
    }

    /**
     * 路由变化处理
     */
    onRouteChanged(routeData) {
        console.log('路由变化:', routeData);
        
        // 更新页面标题
        if (routeData.title) {
            document.title = `${routeData.title} - ${this.config.name}`;
        }
        
        // 更新活动导航链接
        this.updateActiveNavigation(routeData.path);
    }

    /**
     * 更新活动导航
     */
    updateActiveNavigation(currentPath) {
        document.querySelectorAll('[data-nav-link]').forEach(link => {
            const path = link.getAttribute('href');
            if (path === currentPath) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * 应用就绪处理
     */
    onAppReady() {
        console.log('🎉 应用已准备就绪');
        
        // 隐藏加载指示器
        if (this.modules.has('Loading')) {
            this.modules.get('Loading').hide();
        }
        
        // 触发初始化完成事件
        this.broadcast('app:initialized');
    }

    /**
     * 启动错误处理
     */
    handleStartupError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'startup-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h2>🚀 启动失败</h2>
                <p>应用程序启动时发生错误：</p>
                <pre>${error.message || error}</pre>
                <button onclick="window.location.reload()">重新加载</button>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .startup-error {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: #f8f9fa;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                z-index: 9999;
            }
            
            .error-content {
                text-align: center;
                max-width: 600px;
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            
            .error-content h2 {
                color: #dc3545;
                margin-bottom: 1rem;
            }
            
            .error-content pre {
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 4px;
                text-align: left;
                overflow-x: auto;
                margin: 1rem 0;
            }
            
            .error-content button {
                background: #007bff;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 1rem;
            }
            
            .error-content button:hover {
                background: #0056b3;
            }
        `;
        
        document.head.appendChild(style);
        document.body.innerHTML = '';
        document.body.appendChild(errorDiv);
    }

    // 以下是基础模块的创建方法

    /**
     * 创建配置模块
     */
    createConfig() {
        return {
            API_BASE_URL: 'https://your-domain.com/api/v1',
            API_TIMEOUT: 10000,
            JWT_STORAGE_KEY: 'auth_token',
            REFRESH_TOKEN_KEY: 'refresh_token',
            TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000,
            APP_NAME: '共享费用管理',
            DEFAULT_CURRENCY: 'CNY',
            TOAST_DURATION: 3000,
            MODAL_FADE_DURATION: 300,
            DEFAULT_PAGE_SIZE: 20,
            MAX_FILE_SIZE: 5 * 1024 * 1024,
            ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        };
    }

    /**
     * 创建日志模块
     */
    createLogger() {
        return {
            log: (level, message, data = {}) => {
                if (this.config.debug) {
                    console[level](`[${new Date().toISOString()}] ${message}`, data);
                }
            },
            info: (message, data) => this.log('info', message, data),
            warn: (message, data) => this.log('warn', message, data),
            error: (type, error) => this.log('error', `${type}: ${error.message || error}`, { type, error })
        };
    }

    /**
     * 创建存储模块
     */
    createStorage() {
        return {
            set: (key, value) => {
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    return true;
                } catch (error) {
                    console.error('Storage set error:', error);
                    return false;
                }
            },
            get: (key, defaultValue = null) => {
                try {
                    const item = localStorage.getItem(key);
                    return item ? JSON.parse(item) : defaultValue;
                } catch (error) {
                    console.error('Storage get error:', error);
                    return defaultValue;
                }
            },
            remove: (key) => {
                try {
                    localStorage.removeItem(key);
                    return true;
                } catch (error) {
                    console.error('Storage remove error:', error);
                    return false;
                }
            },
            clear: () => {
                try {
                    localStorage.clear();
                    return true;
                } catch (error) {
                    console.error('Storage clear error:', error);
                    return false;
                }
            }
        };
    }

    /**
     * 创建工具模块
     */
    createUtils() {
        return {
            formatDate: (date, format = 'YYYY-MM-DD HH:mm:ss') => {
                if (!date) return '';
                const d = new Date(date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                const seconds = String(d.getSeconds()).padStart(2, '0');
                
                return format
                    .replace('YYYY', year)
                    .replace('MM', month)
                    .replace('DD', day)
                    .replace('HH', hours)
                    .replace('mm', minutes)
                    .replace('ss', seconds);
            },
            formatAmount: (amountInCents, currency = 'CNY') => {
                if (amountInCents === null || amountInCents === undefined) return '0.00';
                const amount = (amountInCents / 100).toFixed(2);
                const symbol = currency === 'CNY' ? '¥' : '$';
                return `${symbol}${amount}`;
            },
            generateUUID: () => {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    const r = Math.random() * 16 | 0;
                    const v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }
        };
    }

    /**
     * 创建API客户端模块
     */
    createAPIClient() {
        class APIClient {
            constructor() {
                this.baseURL = this.getConfig().API_BASE_URL;
                this.defaultHeaders = {
                    'Content-Type': 'application/json'
                };
            }

            getConfig() {
                return this.app ? this.app.getModule('Config') : window.CONFIG || {};
            }

            async request(config) {
                const url = `${this.baseURL}${config.url}`;
                
                try {
                    const response = await fetch(url, {
                        ...config,
                        headers: {
                            ...this.defaultHeaders,
                            ...config.headers
                        }
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || `HTTP ${response.status}`);
                    }

                    return await response.json();
                } catch (error) {
                    throw error;
                }
            }

            async get(url, params = {}) {
                const queryString = new URLSearchParams(params).toString();
                const fullUrl = queryString ? `${url}?${queryString}` : url;
                
                return this.request({
                    url: fullUrl,
                    method: 'GET'
                });
            }

            async post(url, data = {}) {
                return this.request({
                    url,
                    method: 'POST',
                    body: JSON.stringify(data)
                });
            }

            async put(url, data = {}) {
                return this.request({
                    url,
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
            }

            async patch(url, data = {}) {
                return this.request({
                    url,
                    method: 'PATCH',
                    body: JSON.stringify(data)
                });
            }

            async delete(url) {
                return this.request({
                    url,
                    method: 'DELETE'
                });
            }

            upload(url, file, additionalData = {}) {
                const formData = new FormData();
                formData.append('file', file);
                
                Object.keys(additionalData).forEach(key => {
                    formData.append(key, additionalData[key]);
                });

                return this.request({
                    url,
                    method: 'POST',
                    headers: {},
                    body: formData
                });
            }
        }
        
        return APIClient;
    }

    /**
     * 创建表单模块
     */
    createForms() {
        return {
            validate: (formElement) => {
                const errors = {};
                const fields = formElement.querySelectorAll('[data-validate]');
                
                fields.forEach(field => {
                    const validationRules = field.dataset.validate.split('|');
                    const fieldName = field.name || field.dataset.name || field.id;
                    const fieldValue = field.value.trim();
                    
                    for (const rule of validationRules) {
                        const [ruleName, ruleValue] = rule.split(':');
                        const error = this.validateField(fieldValue, ruleName, ruleValue);
                        
                        if (error) {
                            if (!errors[fieldName]) errors[fieldName] = [];
                            errors[fieldName].push(error);
                            break;
                        }
                    }
                });
                
                return errors;
            },

            validateField: (value, rule, ruleValue = '') => {
                switch (rule) {
                    case 'required':
                        return value ? null : '此字段为必填项';
                    case 'email':
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        return emailRegex.test(value) ? null : '请输入有效的邮箱地址';
                    case 'min':
                        const minLength = parseInt(ruleValue);
                        return value.length >= minLength ? null : `至少需要${minLength}个字符`;
                    default:
                        return null;
                }
            },

            showErrors: (formElement, errors) => {
                // 清除之前的错误
                formElement.querySelectorAll('.field-error').forEach(el => el.remove());
                formElement.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
                
                // 显示新错误
                Object.keys(errors).forEach(fieldName => {
                    const field = formElement.querySelector(`[name="${fieldName}"], [data-name="${fieldName}"], #${fieldName}`);
                    if (field) {
                        field.classList.add('error');
                        
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'field-error';
                        errorDiv.textContent = errors[fieldName][0];
                        
                        field.parentNode.insertBefore(errorDiv, field.nextSibling);
                    }
                });
            },

            clearErrors: (formElement) => {
                formElement.querySelectorAll('.field-error').forEach(el => el.remove());
                formElement.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
            }
        };
    }

    /**
     * 创建模态框模块
     */
    createModals() {
        return {
            open: (modalId, data = {}) => {
                const modal = document.getElementById(modalId);
                if (!modal) {
                    console.error(`Modal with id '${modalId}' not found`);
                    return;
                }

                modal.dataset.modalData = JSON.stringify(data);
                modal.classList.add('show');
                document.body.classList.add('modal-open');
                
                modal.dispatchEvent(new CustomEvent('modal:open', { detail: data }));
            },

            close: (modalId) => {
                const modal = document.getElementById(modalId);
                if (!modal) return;

                modal.classList.remove('show');
                document.body.classList.remove('modal-open');
                
                delete modal.dataset.modalData;
                modal.dispatchEvent(new CustomEvent('modal:close'));
            },

            closeAll: () => {
                const modals = document.querySelectorAll('.modal-overlay.show');
                modals.forEach(modal => {
                    modal.classList.remove('show');
                });
                document.body.classList.remove('modal-open');
            }
        };
    }

    /**
     * 创建通知模块
     */
    createNotifications() {
        return {
            success: (message, title = '成功') => {
                this.show(message, 'success', title);
            },

            error: (message, title = '错误') => {
                this.show(message, 'error', title);
            },

            warning: (message, title = '警告') => {
                this.show(message, 'warning', title);
            },

            info: (message, title = '信息') => {
                this.show(message, 'info', title);
            },

            show: (message, type = 'info', title = '') => {
                const notification = document.createElement('div');
                notification.className = `notification notification-${type}`;
                notification.innerHTML = `
                    <div class="notification-content">
                        ${title ? `<div class="notification-title">${title}</div>` : ''}
                        <div class="notification-message">${message}</div>
                    </div>
                    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
                `;

                let container = document.getElementById('notification-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'notification-container';
                    container.className = 'notification-container';
                    document.body.appendChild(container);
                }

                container.appendChild(notification);

                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 3000);

                setTimeout(() => {
                    notification.classList.add('show');
                }, 10);
            }
        };
    }

    /**
     * 创建加载模块
     */
    createLoading() {
        return {
            show: (message = '加载中...') => {
                let loader = document.getElementById('global-loader');
                if (!loader) {
                    loader = document.createElement('div');
                    loader.id = 'global-loader';
                    loader.className = 'global-loader';
                    loader.innerHTML = `
                        <div class="loader-content">
                            <div class="spinner"></div>
                            <div class="loader-message">${message}</div>
                        </div>
                    `;
                    document.body.appendChild(loader);
                } else {
                    loader.querySelector('.loader-message').textContent = message;
                }
                
                loader.classList.add('show');
                document.body.classList.add('loading');
            },

            hide: () => {
                const loader = document.getElementById('global-loader');
                if (loader) {
                    loader.classList.remove('show');
                    document.body.classList.remove('loading');
                }
            }
        };
    }
}

// 创建全局应用实例
window.App = new Application();

// 暴露应用实例供外部使用
window.getApp = () => window.App;

console.log('✅ 主入口文件加载完成');