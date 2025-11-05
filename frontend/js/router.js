// ==============================================
// 前端路由管理模块
// 版本: 1.0.0
// 描述: 实现单页应用(SPA)路由、参数化路由、动态路由和路由守卫
// ==============================================

/**
 * 路由管理模块
 * 提供完整的SPA路由功能，包括参数路由、历史管理和权限检查
 */
const Router = (() => {
    // 路由配置
    const CONFIG = {
        ROUTES: new Map(),
        CURRENT_ROUTE: '',
        CURRENT_PARAMS: {},
        CURRENT_QUERY: {},
        HISTORY_SIZE: 50,
        MODE: 'hash', // 'hash' 或 'history'
        BASE_PATH: '',
        NOT_FOUND_ROUTE: '/404',
        DEFAULT_ROUTE: '/'
    };

    // 路由拦截器
    const INTERCEPTORS = {
        beforeEach: [], // 全局前置拦截器
        afterEach: []   // 全局后置拦截器
    };

    // 路由守卫
    const GUARDS = {
        auth: null,    // 认证守卫
        role: null,    // 角色守卫
        custom: []     // 自定义守卫
    };

    // 历史记录管理
    const HistoryManager = {
        stack: [],
        currentIndex: -1,
        
        push(state) {
            // 限制历史记录数量
            if (this.stack.length >= CONFIG.HISTORY_SIZE) {
                this.stack.shift();
            }
            this.stack.push(state);
            this.currentIndex = this.stack.length - 1;
        },
        
        replace(state) {
            if (this.currentIndex >= 0) {
                this.stack[this.currentIndex] = state;
            }
        },
        
        back() {
            if (this.canBack()) {
                this.currentIndex--;
                return this.stack[this.currentIndex];
            }
            return null;
        },
        
        forward() {
            if (this.canForward()) {
                this.currentIndex++;
                return this.stack[this.currentIndex];
            }
            return null;
        },
        
        canBack() {
            return this.currentIndex > 0;
        },
        
        canForward() {
            return this.currentIndex < this.stack.length - 1;
        },
        
        clear() {
            this.stack = [];
            this.currentIndex = -1;
        },
        
        getCurrent() {
            return this.currentIndex >= 0 ? this.stack[this.currentIndex] : null;
        }
    };

    // 工具函数
    const Utils = {
        // 解析URL路径
        parsePath(path) {
            if (CONFIG.MODE === 'history') {
                return path.replace(CONFIG.BASE_PATH, '');
            } else {
                const hash = window.location.hash.slice(1);
                return hash || '/';
            }
        },

        // 构建完整路径
        buildPath(path, params = {}, query = {}) {
            let fullPath = CONFIG.MODE === 'history' ? CONFIG.BASE_PATH + path : '#' + path;
            
            // 添加查询参数
            if (Object.keys(query).length > 0) {
                const queryString = new URLSearchParams(query).toString();
                fullPath += (CONFIG.MODE === 'history' ? '?' : '&') + queryString;
            }
            
            return fullPath;
        },

        // 路由匹配
        matchRoute(pattern, path) {
            const patternParts = pattern.split('/').filter(Boolean);
            const pathParts = path.split('/').filter(Boolean);

            if (patternParts.length !== pathParts.length) return null;

            const params = {};
            for (let i = 0; i < patternParts.length; i++) {
                if (patternParts[i].startsWith(':')) {
                    const paramName = patternParts[i].slice(1);
                    params[paramName] = decodeURIComponent(pathParts[i]);
                } else if (patternParts[i] !== pathParts[i]) {
                    return null;
                }
            }
            return params;
        },

        // 解析查询参数
        parseQuery(search) {
            const params = {};
            const queryString = search.startsWith('?') ? search.slice(1) : search;
            
            if (queryString) {
                const urlParams = new URLSearchParams(queryString);
                for (const [key, value] of urlParams) {
                    params[key] = value;
                }
            }
            return params;
        },

        // 生成路由键
        generateRouteKey(path, params, query) {
            return `${path}:${JSON.stringify(params)}:${JSON.stringify(query)}`;
        }
    };

    // 路由定义
    const Routes = {
        // 添加路由
        add(path, config) {
            CONFIG.ROUTES.set(path, {
                ...config,
                path,
                name: config.name || path,
                meta: config.meta || {}
            });
        },

        // 批量添加路由
        addMany(routes) {
            routes.forEach(route => {
                Routes.add(route.path, route);
            });
        },

        // 获取路由配置
        get(path) {
            // 精确匹配
            if (CONFIG.ROUTES.has(path)) {
                return CONFIG.ROUTES.get(path);
            }

            // 参数匹配
            for (const [pattern, config] of CONFIG.ROUTES) {
                if (pattern.includes(':')) {
                    const params = Utils.matchRoute(pattern, path);
                    if (params) {
                        return { ...config, params };
                    }
                }
            }

            return null;
        },

        // 获取所有路由
        getAll() {
            return Array.from(CONFIG.ROUTES.entries());
        }
    };

    // 导航管理
    const Navigation = {
        // 导航到指定路径
        navigate(path, options = {}) {
            const { params = {}, query = {}, replace = false, trigger = true } = options;
            
            // 构建完整路径
            const fullPath = Utils.buildPath(path, params, query);
            
            if (CONFIG.MODE === 'history') {
                if (replace) {
                    window.history.replaceState({ path, params, query }, '', fullPath);
                    HistoryManager.replace({ path, params, query });
                } else {
                    window.history.pushState({ path, params, query }, '', fullPath);
                    HistoryManager.push({ path, params, query });
                }
            } else {
                if (replace) {
                    window.location.replace(fullPath);
                } else {
                    window.location.hash = fullPath.slice(1);
                }
            }

            if (trigger) {
                Router.handleRouteChange({ path, params, query });
            }
        },

        // 替换当前导航
        replace(path, params = {}, query = {}) {
            Navigation.navigate(path, { params, query, replace: true });
        },

        // 返回上一页
        back() {
            const historyState = HistoryManager.back();
            if (historyState) {
                if (CONFIG.MODE === 'history') {
                    window.history.back();
                } else {
                    Router.handleRouteChange(historyState);
                }
                return true;
            }
            return false;
        },

        // 前进到下一页
        forward() {
            const historyState = HistoryManager.forward();
            if (historyState) {
                if (CONFIG.MODE === 'history') {
                    window.history.forward();
                } else {
                    Router.handleRouteChange(historyState);
                }
                return true;
            }
            return false;
        },

        // 重新加载当前路由
        reload() {
            const current = HistoryManager.getCurrent();
            if (current) {
                Router.handleRouteChange(current);
            }
        }
    };

    // 路由守卫
    const Guards = {
        // 添加认证守卫
        setAuthGuard(guardFn) {
            GUARDS.auth = guardFn;
        },

        // 添加角色守卫
        setRoleGuard(guardFn) {
            GUARDS.role = guardFn;
        },

        // 添加自定义守卫
        addCustomGuard(guardFn) {
            GUARDS.custom.push(guardFn);
        },

        // 执行守卫检查
        async executeGuards(routeConfig, from, to) {
            const guards = [];
            
            // 添加认证守卫
            if (routeConfig.meta?.requiresAuth && GUARDS.auth) {
                guards.push(() => GUARDS.auth(routeConfig, from, to));
            }

            // 添加角色守卫
            if (routeConfig.meta?.requiresRole && GUARDS.role) {
                guards.push(() => GUARDS.role(routeConfig, from, to));
            }

            // 添加自定义守卫
            routeConfig.meta?.guards?.forEach(guardName => {
                const guardFn = GUARDS.custom.find(g => g.name === guardName);
                if (guardFn) {
                    guards.push(() => guardFn(routeConfig, from, to));
                }
            });

            // 执行所有守卫
            for (const guard of guards) {
                const result = await guard();
                if (result === false) {
                    return false;
                }
            }

            return true;
        }
    };

    // 拦截器管理
    const Interceptors = {
        // 添加前置拦截器
        beforeEach(interceptor) {
            INTERCEPTORS.beforeEach.push(interceptor);
        },

        // 添加后置拦截器
        afterEach(interceptor) {
            INTERCEPTORS.afterEach.push(interceptor);
        },

        // 执行前置拦截器
        async executeBeforeEach(from, to) {
            for (const interceptor of INTERCEPTORS.beforeEach) {
                const result = await interceptor(from, to);
                if (result === false) {
                    return false;
                }
            }
            return true;
        },

        // 执行后置拦截器
        async executeAfterEach(from, to) {
            for (const interceptor of INTERCEPTORS.afterEach) {
                try {
                    await interceptor(from, to);
                } catch (error) {
                    console.error('Route interceptor error:', error);
                }
            }
        }
    };

    // 路由处理
    const RouterCore = {
        // 处理路由变更
        async handleRouteChange(state) {
            const { path, params = {}, query = {} } = state;
            const from = { path: CONFIG.CURRENT_ROUTE, params: CONFIG.CURRENT_PARAMS, query: CONFIG.CURRENT_QUERY };
            const to = { path, params, query };

            // 更新当前路由状态
            CONFIG.CURRENT_ROUTE = path;
            CONFIG.CURRENT_PARAMS = params;
            CONFIG.CURRENT_QUERY = query;

            // 查找路由配置
            let routeConfig = Routes.get(path);
            if (!routeConfig) {
                // 处理404
                routeConfig = Routes.get(CONFIG.NOT_FOUND_ROUTE) || {
                    name: '404',
                    component: () => Router.show404(),
                    meta: { title: '页面未找到' }
                };
                to.path = CONFIG.NOT_FOUND_ROUTE;
            }

            try {
                // 执行前置拦截器
                const canContinue = await Interceptors.executeBeforeEach(from, to);
                if (canContinue === false) {
                    return;
                }

                // 执行路由守卫
                const guardResult = await Guards.executeGuards(routeConfig, from, to);
                if (guardResult === false) {
                    return;
                }

                // 加载路由组件
                await RouterCore.loadRouteComponent(routeConfig, to);

                // 更新活动链接
                RouterCore.updateActiveLinks(path);

                // 触发路由变更事件
                window.dispatchEvent(new CustomEvent('route:changed', {
                    detail: { route: to, from, config: routeConfig }
                }));

                // 执行后置拦截器
                await Interceptors.executeAfterEach(from, to);

            } catch (error) {
                console.error('Route handling error:', error);
                Router.showError(error);
            }
        },

        // 加载路由组件
        async loadRouteComponent(routeConfig, routeState) {
            const container = document.getElementById('app') || document.body;
            
            // 显示加载状态
            Router.showLoading();

            try {
                let component = routeConfig.component;

                // 懒加载支持
                if (typeof component === 'string') {
                    if (component.startsWith('./')) {
                        // 动态导入
                        const module = await import(component);
                        component = module.default || module;
                    } else {
                        // 函数或类
                        component = eval(component);
                    }
                }

                // 执行组件
                if (typeof component === 'function') {
                    const element = await component(routeState, routeConfig);
                    if (element) {
                        if (typeof element === 'string') {
                            container.innerHTML = element;
                        } else {
                            container.innerHTML = '';
                            container.appendChild(element);
                        }
                    }
                }

                // 更新页面标题
                document.title = routeConfig.meta?.title ? 
                    `${routeConfig.meta.title} - 共享费用管理` : 
                    '共享费用管理平台';

            } finally {
                Router.hideLoading();
            }
        },

        // 更新活动链接
        updateActiveLinks(currentPath) {
            document.querySelectorAll('[data-route]').forEach(link => {
                const route = link.dataset.route;
                if (route === currentPath) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        },

        // 显示404页面
        show404() {
            const container = document.getElementById('app') || document.body;
            container.innerHTML = `
                <div class="error-page">
                    <div class="error-content">
                        <h1>404</h1>
                        <h2>页面未找到</h2>
                        <p>抱歉，您访问的页面不存在。</p>
                        <button class="btn btn-primary" onclick="Router.goHome()">返回首页</button>
                    </div>
                </div>
            `;
        },

        // 显示错误页面
        showError(error) {
            const container = document.getElementById('app') || document.body;
            container.innerHTML = `
                <div class="error-page">
                    <div class="error-content">
                        <h1>出错了</h1>
                        <h2>页面加载失败</h2>
                        <p>${error.message || '发生了未知错误'}</p>
                        <button class="btn btn-primary" onclick="Router.reload()">重新加载</button>
                    </div>
                </div>
            `;
        }
    };

    // 公共API
    const RouterAPI = {
        // 初始化路由系统
        init(options = {}) {
            const { mode = 'hash', basePath = '', notFoundRoute = '/404' } = options;
            
            CONFIG.MODE = mode;
            CONFIG.BASE_PATH = basePath;
            CONFIG.NOT_FOUND_ROUTE = notFoundRoute;

            // 绑定浏览器历史事件
            if (CONFIG.MODE === 'history') {
                window.addEventListener('popstate', (e) => {
                    const state = e.state || Utils.parseCurrentLocation();
                    Router.handleRouteChange(state);
                });
            } else {
                window.addEventListener('hashchange', () => {
                    const state = Utils.parseCurrentLocation();
                    Router.handleRouteChange(state);
                });
            }

            // 解析当前路径
            const initialState = Utils.parseCurrentLocation();
            HistoryManager.push(initialState);
            
            return initialState;
        },

        // 添加路由
        addRoute: Routes.add,

        // 批量添加路由
        addRoutes: Routes.addMany,

        // 导航到指定路径
        goTo: Navigation.navigate,

        // 替换当前路径
        replace: Navigation.replace,

        // 返回上一页
        back: Navigation.back,

        // 前进到下一页
        forward: Navigation.forward,

        // 重新加载当前路由
        reload: Navigation.reload,

        // 设置认证守卫
        setAuthGuard: Guards.setAuthGuard,

        // 设置角色守卫
        setRoleGuard: Guards.setRoleGuard,

        // 添加自定义守卫
        addGuard: Guards.addCustomGuard,

        // 添加前置拦截器
        beforeEach: Interceptors.beforeEach,

        // 添加后置拦截器
        afterEach: Interceptors.afterEach,

        // 获取当前路由信息
        getCurrentRoute() {
            return {
                path: CONFIG.CURRENT_ROUTE,
                params: { ...CONFIG.CURRENT_PARAMS },
                query: { ...CONFIG.CURRENT_QUERY }
            };
        },

        // 获取路由配置
        getRouteConfig(path = CONFIG.CURRENT_ROUTE) {
            return Routes.get(path);
        },

        // 检查路由是否存在
        hasRoute(path) {
            return CONFIG.ROUTES.has(path) || 
                   Array.from(CONFIG.ROUTES.keys()).some(pattern => pattern.includes(':') && Utils.matchRoute(pattern, path));
        },

        // 解析当前location
        parseCurrentLocation: Utils.parseCurrentLocation,

        // 构建路径
        buildPath: Utils.buildPath,

        // 显示加载状态
        showLoading() {
            const loader = document.getElementById('route-loader');
            if (loader) {
                loader.style.display = 'flex';
            } else {
                const loadingDiv = document.createElement('div');
                loadingDiv.id = 'route-loader';
                loadingDiv.innerHTML = `
                    <div class="route-loader">
                        <div class="spinner"></div>
                        <div>加载中...</div>
                    </div>
                `;
                document.body.appendChild(loadingDiv);
            }
        },

        // 隐藏加载状态
        hideLoading() {
            const loader = document.getElementById('route-loader');
            if (loader) {
                loader.style.display = 'none';
            }
        },

        // 获取路由历史记录
        getHistory() {
            return {
                stack: [...HistoryManager.stack],
                currentIndex: HistoryManager.currentIndex,
                canGoBack: HistoryManager.canBack(),
                canGoForward: HistoryManager.canForward()
            };
        }
    };

    // 工具方法扩展
    Utils.parseCurrentLocation = function() {
        const path = Utils.parsePath(window.location.pathname + window.location.search + window.location.hash);
        const query = Utils.parseQuery(window.location.search + window.location.hash);
        
        // 从路径中提取参数
        let params = {};
        for (const [pattern, config] of Routes.getAll()) {
            if (pattern.includes(':')) {
                const matched = Utils.matchRoute(pattern, path);
                if (matched) {
                    params = matched;
                    break;
                }
            }
        }

        return { path, params, query };
    };

    // 返回公共API
    return Object.assign(RouterAPI, Routes);
})();

// ==============================================
// 全局事件绑定和初始化
// ==============================================

// 点击导航链接处理
document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-route]');
    if (link) {
        e.preventDefault();
        const route = link.dataset.route;
        const routeParams = {};
        
        // 解析链接参数
        const href = link.getAttribute('href');
        if (href && href.includes('?')) {
            const urlParams = new URLSearchParams(href.split('?')[1]);
            for (const [key, value] of urlParams) {
                routeParams[key] = value;
            }
        }
        
        Router.goTo(route, { query: routeParams });
    }
});

// 全局导出
window.Router = Router;