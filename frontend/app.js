// ==============================================
// 共享费用管理平台 - 核心JavaScript模块
// 版本: 1.0.0
// 描述: 实现用户认证、群组管理、费用追踪等核心功能
// ==============================================

// ==============================================
// 全局配置和常量
// ==============================================
const CONFIG = {
    // API配置
    API_BASE_URL: 'https://your-domain.com/api/v1',
    API_TIMEOUT: 10000,
    
    // 认证配置
    JWT_STORAGE_KEY: 'auth_token',
    REFRESH_TOKEN_KEY: 'refresh_token',
    TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5分钟
    
    // 应用配置
    APP_NAME: '共享费用管理',
    DEFAULT_CURRENCY: 'CNY',
    
    // UI配置
    TOAST_DURATION: 3000,
    MODAL_FADE_DURATION: 300,
    
    // 分页配置
    DEFAULT_PAGE_SIZE: 20,
    
    // 文件上传配置
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
};

// ==============================================
// 工具函数模块
// ==============================================
const Utils = {
    // 日期格式化
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

    // 金额格式化（从分转换为元）
    formatAmount: (amountInCents, currency = CONFIG.DEFAULT_CURRENCY) => {
        if (amountInCents === null || amountInCents === undefined) return '0.00';
        const amount = (amountInCents / 100).toFixed(2);
        const symbol = currency === 'CNY' ? '¥' : '$';
        return `${symbol}${amount}`;
    },

    // 将金额转换为分（整数）
    parseAmountToCents: (amountString) => {
        if (!amountString) return 0;
        const cleanString = amountString.replace(/[^\d.-]/g, '');
        const amount = parseFloat(cleanString);
        return Math.round(amount * 100);
    },

    // 防抖函数
    debounce: (func, wait) => {
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
    throttle: (func, limit) => {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // 生成UUID
    generateUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // 验证邮箱格式
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // 验证手机号格式（中国大陆）
    isValidPhone: (phone) => {
        const phoneRegex = /^1[3-9]\d{9}$/;
        return phoneRegex.test(phone);
    },

    // 验证金额格式
    isValidAmount: (amount) => {
        const amountRegex = /^\d+(\.\d{1,2})?$/;
        return amountRegex.test(amount) && parseFloat(amount) > 0;
    },

    // 文件大小格式化
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // URL参数解析
    parseUrlParams: () => {
        const params = {};
        const urlSearchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of urlSearchParams) {
            params[key] = value;
        }
        return params;
    },

    // 对象深拷贝
    deepClone: (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = Utils.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    },

    // 安全转义HTML
    escapeHtml: (unsafe) => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

// ==============================================
// 本地存储管理模块
// ==============================================
const Storage = {
    // 设置存储项
    set: (key, value) => {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },

    // 获取存储项
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    },

    // 删除存储项
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    },

    // 清除所有存储项
    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    },

    // 检查存储项是否存在
    has: (key) => {
        return localStorage.getItem(key) !== null;
    },

    // 获取所有存储键
    keys: () => {
        return Object.keys(localStorage);
    }
};

// ==============================================
// API客户端模块
// ==============================================
class APIClient {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        this.setupInterceptors();
    }

    // 设置拦截器
    setupInterceptors() {
        // 请求拦截器
        this.requestInterceptor = (config) => {
            // 添加认证头
            const token = Auth.getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            // 添加请求ID
            config.headers['X-Request-ID'] = Utils.generateUUID();

            // 添加时间戳
            config.headers['X-Timestamp'] = Date.now().toString();

            console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        };

        // 响应拦截器
        this.responseInterceptor = (response) => {
            console.log(`✅ API Response: ${response.status} ${response.config.url}`);
            return response;
        };

        // 错误拦截器
        this.errorInterceptor = async (error) => {
            console.error(`❌ API Error: ${error.config?.url}`, error);

            // 处理401未授权错误（Token过期）
            if (error.response?.status === 401 && !error.config._retry) {
                error.config._retry = true;
                
                try {
                    await Auth.refreshToken();
                    // 重试原始请求
                    return this.request(error.config);
                } catch (refreshError) {
                    Auth.logout();
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            }

            // 处理网络错误
            if (!error.response) {
                return Promise.reject(new Error('网络连接失败，请检查网络设置'));
            }

            return Promise.reject(error);
        };
    }

    // 发送请求
    async request(config) {
        const requestConfig = {
            method: 'GET',
            headers: { ...this.defaultHeaders },
            ...config
        };

        const url = `${this.baseURL}${config.url}`;
        
        try {
            const response = await fetch(url, {
                ...requestConfig,
                headers: {
                    ...this.defaultHeaders,
                    ...requestConfig.headers
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = new Error(errorData.message || `HTTP ${response.status}`);
                error.response = { status: response.status, data: errorData };
                throw error;
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return await response.text();
        } catch (error) {
            throw error;
        }
    }

    // GET请求
    async get(url, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;
        
        return this.request({
            url: fullUrl,
            method: 'GET'
        });
    }

    // POST请求
    async post(url, data = {}) {
        return this.request({
            url,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT请求
    async put(url, data = {}) {
        return this.request({
            url,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // PATCH请求
    async patch(url, data = {}) {
        return this.request({
            url,
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    // DELETE请求
    async delete(url) {
        return this.request({
            url,
            method: 'DELETE'
        });
    }

    // 上传文件
    async upload(url, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        return this.request({
            url,
            method: 'POST',
            headers: {}, // 让浏览器自动设置Content-Type
            body: formData
        });
    }
}

// ==============================================
// 认证管理模块
// ==============================================
const Auth = {
    // 初始化认证状态
    init: () => {
        const token = Auth.getToken();
        if (token && !Auth.isTokenExpired(token)) {
            API.setDefaultHeader('Authorization', `Bearer ${token}`);
        } else {
            Auth.clearTokens();
        }
    },

    // 获取存储的Token
    getToken: () => {
        return Storage.get(CONFIG.JWT_STORAGE_KEY);
    },

    // 获取刷新Token
    getRefreshToken: () => {
        return Storage.get(CONFIG.REFRESH_TOKEN_KEY);
    },

    // 检查Token是否过期
    isTokenExpired: (token) => {
        if (!token) return true;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            return payload.exp < now;
        } catch (error) {
            return true;
        }
    },

    // 检查是否需要刷新Token
    shouldRefreshToken: () => {
        const token = Auth.getToken();
        if (!token) return false;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            const refreshTime = payload.exp - (CONFIG.TOKEN_REFRESH_THRESHOLD / 1000);
            return now >= refreshTime;
        } catch (error) {
            return true;
        }
    },

    // 刷新Token
    refreshToken: async () => {
        const refreshToken = Auth.getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await API.post('/auth/refresh', {
                refresh_token: refreshToken
            });

            if (response.access_token) {
                Auth.setTokens(response.access_token, response.refresh_token);
                API.setDefaultHeader('Authorization', `Bearer ${response.access_token}`);
                return response;
            }
            
            throw new Error('No access token in refresh response');
        } catch (error) {
            Auth.clearTokens();
            throw error;
        }
    },

    // 设置Token
    setTokens: (accessToken, refreshToken) => {
        Storage.set(CONFIG.JWT_STORAGE_KEY, accessToken);
        Storage.set(CONFIG.REFRESH_TOKEN_KEY, refreshToken);
        API.setDefaultHeader('Authorization', `Bearer ${accessToken}`);
    },

    // 清除Token
    clearTokens: () => {
        Storage.remove(CONFIG.JWT_STORAGE_KEY);
        Storage.remove(CONFIG.REFRESH_TOKEN_KEY);
        API.removeDefaultHeader('Authorization');
    },

    // 用户注册
    register: async (userData) => {
        try {
            const response = await API.post('/auth/register', {
                email: userData.email,
                password: userData.password,
                full_name: userData.fullName
            });

            if (response.access_token) {
                Auth.setTokens(response.access_token, response.refresh_token);
            }

            return response;
        } catch (error) {
            throw error;
        }
    },

    // 用户登录
    login: async (email, password) => {
        try {
            const response = await API.post('/auth/login', {
                email,
                password
            });

            if (response.access_token) {
                Auth.setTokens(response.access_token, response.refresh_token);
            }

            return response;
        } catch (error) {
            throw error;
        }
    },

    // 用户登出
    logout: () => {
        // 清除本地存储
        Auth.clearTokens();
        
        // 清除用户信息
        Storage.remove('user_info');
        Storage.remove('user_preferences');
        
        // 跳转到登录页
        window.location.href = '/login';
    },

    // 获取当前用户信息
    getCurrentUser: async () => {
        try {
            const response = await API.get('/auth/me');
            Storage.set('user_info', response);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 更新用户信息
    updateProfile: async (userData) => {
        try {
            const response = await API.patch('/auth/profile', userData);
            Storage.set('user_info', response);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 修改密码
    changePassword: async (currentPassword, newPassword) => {
        try {
            const response = await API.post('/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword
            });
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 检查认证状态
    isAuthenticated: () => {
        const token = Auth.getToken();
        return token && !Auth.isTokenExpired(token);
    },

    // 获取用户信息（从缓存或API）
    getUserInfo: () => {
        return Storage.get('user_info');
    }
};

// ==============================================
// 通知系统模块
// ==============================================
const Notifications = {
    // 显示成功通知
    success: (message, title = '成功') => {
        Notifications.show(message, 'success', title);
    },

    // 显示错误通知
    error: (message, title = '错误') => {
        Notifications.show(message, 'error', title);
    },

    // 显示警告通知
    warning: (message, title = '警告') => {
        Notifications.show(message, 'warning', title);
    },

    // 显示信息通知
    info: (message, title = '信息') => {
        Notifications.show(message, 'info', title);
    },

    // 显示通知
    show: (message, type = 'info', title = '') => {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                ${title ? `<div class="notification-title">${title}</div>` : ''}
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        // 添加到页面
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
        }, CONFIG.TOAST_DURATION);

        // 添加进入动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
    },

    // 清除所有通知
    clear: () => {
        const container = document.getElementById('notification-container');
        if (container) {
            container.innerHTML = '';
        }
    },

    // 显示确认对话框
    confirm: (message, title = '确认', onConfirm = null, onCancel = null) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="confirm-cancel">取消</button>
                    <button class="btn btn-primary" id="confirm-ok">确认</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 绑定事件
        modal.querySelector('#confirm-ok').onclick = () => {
            modal.remove();
            if (onConfirm) onConfirm();
        };

        modal.querySelector('#confirm-cancel').onclick = () => {
            modal.remove();
            if (onCancel) onCancel();
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                if (onCancel) onCancel();
            }
        };
    }
};

// ==============================================
// 模态框管理模块
// ==============================================
const Modals = {
    // 打开模态框
    open: (modalId, data = {}) => {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal with id '${modalId}' not found`);
            return;
        }

        // 存储数据
        modal.dataset.modalData = JSON.stringify(data);

        // 显示模态框
        modal.classList.add('show');
        document.body.classList.add('modal-open');

        // 触发打开事件
        modal.dispatchEvent(new CustomEvent('modal:open', { detail: data }));
    },

    // 关闭模态框
    close: (modalId) => {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // 隐藏模态框
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');

        // 清理数据
        delete modal.dataset.modalData;

        // 触发关闭事件
        modal.dispatchEvent(new CustomEvent('modal:close'));
    },

    // 关闭所有模态框
    closeAll: () => {
        const modals = document.querySelectorAll('.modal-overlay.show');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
        document.body.classList.remove('modal-open');
    },

    // 获取模态框数据
    getData: (modalId) => {
        const modal = document.getElementById(modalId);
        if (!modal || !modal.dataset.modalData) return null;
        
        try {
            return JSON.parse(modal.dataset.modalData);
        } catch (error) {
            console.error('Error parsing modal data:', error);
            return null;
        }
    },

    // 创建动态模态框
    create: (options) => {
        const {
            title = '',
            content = '',
            size = 'medium',
            buttons = [],
            onOpen = null,
            onClose = null
        } = options;

        const modalId = `modal-${Utils.generateUUID()}`;
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = modalId;
        
        // 生成按钮HTML
        const buttonsHtml = buttons.map(btn => 
            `<button class="btn ${btn.class || 'btn-secondary'}" data-action="${btn.action}">${btn.text}</button>`
        ).join('');

        modal.innerHTML = `
            <div class="modal modal-${size}">
                ${title ? `
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="modal-close" onclick="Modals.close('${modalId}')">×</button>
                    </div>
                ` : ''}
                <div class="modal-body">
                    ${content}
                </div>
                ${buttons.length > 0 ? `
                    <div class="modal-footer">
                        ${buttonsHtml}
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(modal);

        // 绑定按钮事件
        modal.querySelectorAll('[data-action]').forEach(button => {
            button.onclick = () => {
                const action = button.dataset.action;
                const callback = buttons.find(btn => btn.action === action)?.callback;
                if (callback) callback();
                Modals.close(modalId);
            };
        });

        // 点击外部关闭
        modal.onclick = (e) => {
            if (e.target === modal) {
                Modals.close(modalId);
            }
        };

        // 绑定事件
        if (onOpen) {
            modal.addEventListener('modal:open', onOpen);
        }
        if (onClose) {
            modal.addEventListener('modal:close', onClose);
        }

        // 自动打开
        Modals.open(modalId);

        return modalId;
    }
};

// ==============================================
// 路由管理模块
// ==============================================
const Router = {
    routes: new Map(),
    currentRoute: '',
    currentParams: {},

    // 添加路由
    add: (path, handler) => {
        Router.routes.set(path, handler);
    },

    // 导航到指定路径
    navigate: (path, params = {}) => {
        if (path === Router.currentRoute) {
            Router.update(params);
            return;
        }

        // 更新URL
        const url = params ? `${path}?${new URLSearchParams(params)}` : path;
        window.history.pushState({ path, params }, '', url);

        // 处理路由
        Router.handle(path, params);
    },

    // 处理当前路由
    handle: (path, params = {}) => {
        Router.currentRoute = path;
        Router.currentParams = params;

        // 查找匹配的路由处理器
        let handler = null;
        
        // 精确匹配
        if (Router.routes.has(path)) {
            handler = Router.routes.get(path);
        } else {
            // 参数匹配
            for (const [routePath, routeHandler] of Router.routes) {
                if (Router.matchRoute(routePath, path)) {
                    handler = routeHandler;
                    break;
                }
            }
        }

        if (handler) {
            try {
                handler(params);
            } catch (error) {
                console.error('Route handler error:', error);
                Notifications.error('页面加载失败，请刷新重试');
            }
        } else {
            // 404处理
            Router.handle('/404');
        }

        // 更新页面状态
        Router.updateActiveLinks(path);
        document.dispatchEvent(new CustomEvent('route:changed', { 
            detail: { path, params } 
        }));
    },

    // 路由匹配
    matchRoute: (routePath, currentPath) => {
        const routeParts = routePath.split('/').filter(Boolean);
        const pathParts = currentPath.split('/').filter(Boolean);

        if (routeParts.length !== pathParts.length) return false;

        const params = {};
        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
                const paramName = routeParts[i].slice(1);
                params[paramName] = pathParts[i];
            } else if (routeParts[i] !== pathParts[i]) {
                return false;
            }
        }
        return true;
    },

    // 更新页面状态
    update: (params = {}) => {
        Router.currentParams = { ...Router.currentParams, ...params };
        document.dispatchEvent(new CustomEvent('route:update', { 
            detail: { params: Router.currentParams } 
        }));
    },

    // 更新活动链接
    updateActiveLinks: (currentPath) => {
        document.querySelectorAll('[data-route]').forEach(link => {
            const route = link.dataset.route;
            if (route === currentPath) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    },

    // 初始化路由
    init: () => {
        // 处理浏览器前进后退
        window.addEventListener('popstate', (e) => {
            const { path, params } = e.state || {};
            Router.handle(path, params);
        });

        // 处理初始加载
        const initialPath = window.location.pathname + window.location.search;
        const params = Utils.parseUrlParams();
        Router.handle(window.location.pathname, params);

        // 绑定导航链接
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
                
                Router.navigate(route, routeParams);
            }
        });
    },

    // 获取当前路径
    getCurrentPath: () => Router.currentRoute,

    // 获取当前参数
    getCurrentParams: () => Router.currentParams
};

// ==============================================
// 表单处理模块
// ==============================================
const Forms = {
    // 验证表单
    validate: (formElement) => {
        const errors = {};
        const fields = formElement.querySelectorAll('[data-validate]');

        fields.forEach(field => {
            const validationRules = field.dataset.validate.split('|');
            const fieldName = field.name || field.dataset.name || field.id;
            const fieldValue = field.value.trim();

            for (const rule of validationRules) {
                const [ruleName, ruleValue] = rule.split(':');
                const error = Forms.validateField(fieldValue, ruleName, ruleValue);
                
                if (error) {
                    if (!errors[fieldName]) errors[fieldName] = [];
                    errors[fieldName].push(error);
                    break; // 遇到第一个错误就停止
                }
            }
        });

        return errors;
    },

    // 验证单个字段
    validateField: (value, rule, ruleValue = '') => {
        switch (rule) {
            case 'required':
                return value ? null : '此字段为必填项';
            
            case 'email':
                return Utils.isValidEmail(value) ? null : '请输入有效的邮箱地址';
            
            case 'phone':
                return Utils.isValidPhone(value) ? null : '请输入有效的手机号码';
            
            case 'amount':
                return Utils.isValidAmount(value) ? null : '请输入有效的金额';
            
            case 'min':
                const minLength = parseInt(ruleValue);
                return value.length >= minLength ? null : `至少需要${minLength}个字符`;
            
            case 'max':
                const maxLength = parseInt(ruleValue);
                return value.length <= maxLength ? null : `最多${maxLength}个字符`;
            
            case 'pattern':
                const regex = new RegExp(ruleValue);
                return regex.test(value) ? null : '格式不正确';
            
            default:
                return null;
        }
    },

    // 显示验证错误
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

    // 清除验证错误
    clearErrors: (formElement) => {
        formElement.querySelectorAll('.field-error').forEach(el => el.remove());
        formElement.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    },

    // 序列化表单数据
    serialize: (formElement) => {
        const formData = new FormData(formElement);
        const data = {};
        
        for (const [key, value] of formData) {
            if (data[key]) {
                // 处理同名输入框
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }
        
        return data;
    },

    // 创建表单处理器
    createHandler: (options) => {
        return async (event) => {
            event.preventDefault();
            
            const form = event.target;
            const {
                validate: validationFn,
                submit: submitFn,
                beforeSubmit = null,
                showSuccess = true,
                resetAfterSuccess = true
            } = options;

            // 清除之前的错误
            Forms.clearErrors(form);

            // 验证表单
            const errors = Forms.validate(form);
            if (Object.keys(errors).length > 0) {
                Forms.showErrors(form, errors);
                return;
            }

            // 执行提交前回调
            if (beforeSubmit) {
                const shouldContinue = await beforeSubmit();
                if (shouldContinue === false) return;
            }

            // 显示加载状态
            const submitButton = form.querySelector('[type="submit"]');
            const originalText = submitButton?.textContent;
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = '处理中...';
            }

            try {
                // 执行提交
                const formData = Forms.serialize(form);
                const result = await submitFn(formData);

                if (result.success !== false) {
                    if (showSuccess) {
                        Notifications.success(result.message || '操作成功');
                    }
                    
                    if (resetAfterSuccess) {
                        form.reset();
                        Forms.clearErrors(form);
                    }
                    
                    return result;
                } else {
                    Notifications.error(result.message || '操作失败');
                    return result;
                }
            } catch (error) {
                console.error('Form submission error:', error);
                Notifications.error(error.message || '操作失败，请重试');
            } finally {
                // 恢复按钮状态
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                }
            }
        };
    }
};

// ==============================================
// 群组管理模块
// ==============================================
const Groups = {
    // 获取群组列表
    getGroups: async (params = {}) => {
        try {
            const response = await API.get('/groups', params);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 获取单个群组信息
    getGroup: async (groupId) => {
        try {
            const response = await API.get(`/groups/${groupId}`);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 创建群组
    create: async (groupData) => {
        try {
            const response = await API.post('/groups', {
                name: groupData.name,
                description: groupData.description,
                currency: groupData.currency || CONFIG.DEFAULT_CURRENCY
            });
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 更新群组
    update: async (groupId, groupData) => {
        try {
            const response = await API.patch(`/groups/${groupId}`, {
                name: groupData.name,
                description: groupData.description,
                currency: groupData.currency
            });
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 删除群组
    delete: async (groupId) => {
        try {
            const response = await API.delete(`/groups/${groupId}`);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 获取群组成员
    getMembers: async (groupId) => {
        try {
            const response = await API.get(`/groups/${groupId}/members`);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 添加群组成员（管理员）
    addMember: async (groupId, memberData) => {
        try {
            const response = await API.post(`/groups/${groupId}/members`, {
                user_email: memberData.email,
                role: memberData.role || 'member'
            });
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 移除群组成员（管理员）
    removeMember: async (groupId, memberId) => {
        try {
            const response = await API.delete(`/groups/${groupId}/members/${memberId}`);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 更新成员角色（管理员）
    updateMemberRole: async (groupId, memberId, role) => {
        try {
            const response = await API.patch(`/groups/${groupId}/members/${memberId}`, {
                role: role
            });
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 邀请新成员
    inviteMember: async (groupId, email) => {
        try {
            const response = await API.post(`/groups/${groupId}/invitations`, {
                email: email
            });
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 接受群组邀请
    acceptInvitation: async (invitationId) => {
        try {
            const response = await API.post(`/invitations/${invitationId}/accept`);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 拒绝群组邀请
    declineInvitation: async (invitationId) => {
        try {
            const response = await API.post(`/invitations/${invitationId}/decline`);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 获取待处理的邀请
    getInvitations: async () => {
        try {
            const response = await API.get('/invitations');
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 获取群组审计日志（管理员）
    getAuditLog: async (groupId, params = {}) => {
        try {
            const response = await API.get(`/groups/${groupId}/audit-log`, params);
            return response;
        } catch (error) {
            throw error;
        }
    }
};

// ==============================================
// 费用管理模块
// ==============================================
const Expenses = {
    // 获取群组费用列表
    getExpenses: async (groupId, params = {}) => {
        try {
            const response = await API.get(`/groups/${groupId}/expenses`, params);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 获取单个费用详情
    getExpense: async (groupId, expenseId) => {
        try {
            const response = await API.get(`/groups/${groupId}/expenses/${expenseId}`);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 创建费用
    create: async (groupId, expenseData) => {
        try {
            const response = await API.post(`/groups/${groupId}/expenses`, {
                amount: Utils.parseAmountToCents(expenseData.amount),
                currency: expenseData.currency || CONFIG.DEFAULT_CURRENCY,
                description: expenseData.description,
                expense_date: expenseData.date,
                payer_id: expenseData.payerId,
                splits: expenseData.splits || [],
                category: expenseData.category,
                receipt_image: expenseData.receiptImage
            });
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 更新费用
    update: async (groupId, expenseId, expenseData) => {
        try {
            const response = await API.patch(`/groups/${groupId}/expenses/${expenseId}`, {
                amount: Utils.parseAmountToCents(expenseData.amount),
                currency: expenseData.currency,
                description: expenseData.description,
                expense_date: expenseData.date,
                payer_id: expenseData.payerId,
                splits: expenseData.splits,
                category: expenseData.category,
                receipt_image: expenseData.receiptImage
            });
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 删除费用
    delete: async (groupId, expenseId) => {
        try {
            const response = await API.delete(`/groups/${groupId}/expenses/${expenseId}`);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 上传收据图片
    uploadReceipt: async (groupId, expenseId, file) => {
        try {
            const response = await API.upload(`/groups/${groupId}/expenses/${expenseId}/receipt`, file);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 获取定期费用
    getRecurringExpenses: async (groupId) => {
        try {
            const response = await API.get(`/groups/${groupId}/recurring-expenses`);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 创建定期费用
    createRecurringExpense: async (groupId, recurringData) => {
        try {
            const response = await API.post(`/groups/${groupId}/recurring-expenses`, {
                amount: Utils.parseAmountToCents(recurringData.amount),
                currency: recurringData.currency || CONFIG.DEFAULT_CURRENCY,
                description: recurringData.description,
                payer_id: recurringData.payerId,
                splits: recurringData.splits,
                category: recurringData.category,
                frequency: recurringData.frequency, // daily, weekly, monthly, yearly
                start_date: recurringData.startDate,
                end_date: recurringData.endDate
            });
            return response;
        } catch (error) {
            throw error;
        }
    }
};

// ==============================================
// 支付管理模块
// ==============================================
const Payments = {
    // 获取群组支付列表
    getPayments: async (groupId, params = {}) => {
        try {
            const response = await API.get(`/groups/${groupId}/payments`, params);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 获取单个支付详情
    getPayment: async (groupId, paymentId) => {
        try {
            const response = await API.get(`/groups/${groupId}/payments/${paymentId}`);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 创建支付
    create: async (groupId, paymentData) => {
        try {
            const response = await API.post(`/groups/${groupId}/payments`, {
                amount: Utils.parseAmountToCents(paymentData.amount),
                currency: paymentData.currency || CONFIG.DEFAULT_CURRENCY,
                payer_id: paymentData.payerId,
                payee_id: paymentData.payeeId,
                payment_date: paymentData.date,
                description: paymentData.description,
                proof_image: paymentData.proofImage
            });
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 更新支付
    update: async (groupId, paymentId, paymentData) => {
        try {
            const response = await API.patch(`/groups/${groupId}/payments/${paymentId}`, {
                amount: Utils.parseAmountToCents(paymentData.amount),
                currency: paymentData.currency,
                payer_id: paymentData.payerId,
                payee_id: paymentData.payeeId,
                payment_date: paymentData.date,
                description: paymentData.description,
                proof_image: paymentData.proofImage
            });
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 删除支付
    delete: async (groupId, paymentId) => {
        try {
            const response = await API.delete(`/groups/${groupId}/payments/${paymentId}`);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 上传支付凭证图片
    uploadProof: async (groupId, paymentId, file) => {
        try {
            const response = await API.upload(`/groups/${groupId}/payments/${paymentId}/proof`, file);
            return response;
        } catch (error) {
            throw error;
        }
    }
};

// ==============================================
// 余额计算模块
// ==============================================
const Balances = {
    // 获取群组余额
    getGroupBalances: async (groupId) => {
        try {
            const response = await API.get(`/groups/${groupId}/balances`);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 获取用户所有群组余额概览
    getUserBalances: async () => {
        try {
            const response = await API.get('/balances');
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 计算最优结算方案
    calculateSettlement: async (groupId) => {
        try {
            const response = await API.post(`/groups/${groupId}/balances/calculate`);
            return response;
        } catch (error) {
            throw error;
        }
    }
};

// ==============================================
// 文件上传模块
// ==============================================
const FileUpload = {
    // 验证文件
    validate: (file) => {
        const errors = [];

        // 检查文件大小
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            errors.push(`文件大小不能超过 ${Utils.formatFileSize(CONFIG.MAX_FILE_SIZE)}`);
        }

        // 检查文件类型
        if (CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type)) {
            errors.push('不支持的文件类型，仅支持 JPEG、PNG、GIF、WebP 格式');
        }

        // 检查文件扩展名
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!validExtensions.includes(fileExtension)) {
            errors.push('不支持的文件扩展名');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    // 上传文件
    upload: async (file, endpoint, additionalData = {}) => {
        // 验证文件
        const validation = FileUpload.validate(file);
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        try {
            const response = await API.upload(endpoint, file, additionalData);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // 压缩图片
    compressImage: (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // 计算新的尺寸
                let { width, height } = img;
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // 绘制压缩后的图片
                ctx.drawImage(img, 0, 0, width, height);

                // 转换为Blob
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, {
                        type: file.type,
                        lastModified: Date.now()
                    }));
                }, file.type, quality);
            };

            img.src = URL.createObjectURL(file);
        });
    }
};

// ==============================================
// 全局加载状态管理
// ==============================================
const Loading = {
    // 显示全局加载
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

    // 隐藏全局加载
    hide: () => {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.classList.remove('show');
            document.body.classList.remove('loading');
        }
    },

    // 显示按钮加载
    showButton: (button, message = '处理中...') => {
        const originalContent = button.innerHTML;
        button.dataset.originalContent = originalContent;
        button.disabled = true;
        button.innerHTML = `
            <span class="spinner-small"></span>
            ${message}
        `;
    },

    // 隐藏按钮加载
    hideButton: (button) => {
        if (button.dataset.originalContent) {
            button.innerHTML = button.dataset.originalContent;
            button.disabled = false;
            delete button.dataset.originalContent;
        }
    }
};

// ==============================================
// 初始化应用
// ==============================================
const App = {
    // 初始化
    init: async () => {
        console.log('🚀 初始化共享费用管理平台...');

        try {
            // 初始化API客户端
            window.API = new APIClient();

            // 初始化认证
            Auth.init();

            // 初始化路由
            Router.init();

            // 设置全局错误处理
            App.setupGlobalErrorHandling();

            // 设置定期Token刷新
            App.setupTokenRefresh();

            // 设置页面可见性变化处理
            App.setupVisibilityChange();

            console.log('✅ 应用初始化完成');
        } catch (error) {
            console.error('❌ 应用初始化失败:', error);
            Notifications.error('应用初始化失败，请刷新页面重试');
        }
    },

    // 设置全局错误处理
    setupGlobalErrorHandling: () => {
        // 捕获未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise拒绝:', event.reason);
            event.preventDefault();
            
            const message = event.reason?.message || '发生未知错误';
            Notifications.error(message);
        });

        // 捕获JavaScript错误
        window.addEventListener('error', (event) => {
            console.error('JavaScript错误:', event.error);
        });
    },

    // 设置定期Token刷新
    setupTokenRefresh: () => {
        // 每分钟检查一次Token
        setInterval(() => {
            if (Auth.shouldRefreshToken() && Auth.isAuthenticated()) {
                Auth.refreshToken().catch(() => {
                    Auth.logout();
                });
            }
        }, 60000);
    },

    // 设置页面可见性变化处理
    setupVisibilityChange: () => {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // 页面变为可见时检查Token
                if (Auth.isAuthenticated() && Auth.shouldRefreshToken()) {
                    Auth.refreshToken().catch(() => {
                        Auth.logout();
                    });
                }
            }
        });
    }
};

// ==============================================
// DOM内容加载完成后初始化
// ==============================================
document.addEventListener('DOMContentLoaded', App.init);

// ==============================================
// 全局导出
// ==============================================
window.App = App;
window.Auth = Auth;
window.API = APIClient;
window.Router = Router;
window.Forms = Forms;
window.Modals = Modals;
window.Notifications = Notifications;
window.Groups = Groups;
window.Expenses = Expenses;
window.Payments = Payments;
window.Balances = Balances;
window.FileUpload = FileUpload;
window.Loading = Loading;
window.Utils = Utils;
window.Storage = Storage;
window.CONFIG = CONFIG;