// ==============================================
// 用户认证功能模块
// 版本: 1.0.0
// 描述: 实现用户注册、登录、登出、JWT管理和认证状态检查
// ==============================================

/**
 * 认证管理模块
 * 提供完整的用户认证功能，包括JWT令牌管理、自动刷新和页面保护
 */
const Auth = (() => {
    // 配置常量
    const CONFIG = {
        API_BASE_URL: 'https://your-domain.com/api/v1',
        JWT_STORAGE_KEY: 'auth_token',
        REFRESH_TOKEN_KEY: 'refresh_token',
        USER_INFO_KEY: 'user_info',
        TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5分钟
        TOKEN_CHECK_INTERVAL: 60000, // 每分钟检查一次
        LOGIN_REDIRECT_URL: '/login',
        HOME_REDIRECT_URL: '/dashboard'
    };

    // 状态管理
    let isRefreshing = false;
    let refreshPromise = null;

    /**
     * 工具函数
     */
    const Utils = {
        // 解析JWT token
        parseToken: (token) => {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload;
            } catch (error) {
                console.error('Failed to parse JWT token:', error);
                return null;
            }
        },

        // 检查token是否过期
        isTokenExpired: (token) => {
            if (!token) return true;
            const payload = Utils.parseToken(token);
            if (!payload) return true;
            return Date.now() / 1000 >= payload.exp;
        },

        // 检查是否需要刷新token
        shouldRefreshToken: (token) => {
            if (!token) return false;
            const payload = Utils.parseToken(token);
            if (!payload) return true;
            const now = Date.now() / 1000;
            const refreshTime = payload.exp - (CONFIG.TOKEN_REFRESH_THRESHOLD / 1000);
            return now >= refreshTime;
        },

        // 延迟函数
        delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
    };

    /**
     * 本地存储管理
     */
    const Storage = {
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

    /**
     * API客户端
     */
    const API = {
        baseURL: CONFIG.API_BASE_URL,
        defaultHeaders: {
            'Content-Type': 'application/json'
        },

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
        },

        async get(url, params = {}) {
            const queryString = new URLSearchParams(params).toString();
            const fullUrl = queryString ? `${url}?${queryString}` : url;
            return this.request({ url: fullUrl, method: 'GET' });
        },

        async post(url, data = {}) {
            return this.request({
                url,
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async put(url, data = {}) {
            return this.request({
                url,
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },

        async patch(url, data = {}) {
            return this.request({
                url,
                method: 'PATCH',
                body: JSON.stringify(data)
            });
        },

        async delete(url) {
            return this.request({ url, method: 'DELETE' });
        },

        setAuthHeader(token) {
            this.defaultHeaders.Authorization = `Bearer ${token}`;
        },

        removeAuthHeader() {
            delete this.defaultHeaders.Authorization;
        }
    };

    /**
     * 认证状态管理
     */
    const AuthState = {
        // 状态变更监听器
        listeners: new Set(),

        // 添加监听器
        addListener(callback) {
            this.listeners.add(callback);
        },

        // 移除监听器
        removeListener(callback) {
            this.listeners.delete(callback);
        },

        // 触发状态变更
        notify(isAuthenticated, user = null) {
            this.listeners.forEach(callback => {
                try {
                    callback(isAuthenticated, user);
                } catch (error) {
                    console.error('Auth state listener error:', error);
                }
            });

            // 触发自定义事件
            window.dispatchEvent(new CustomEvent('auth:stateChanged', {
                detail: { isAuthenticated, user }
            }));
        },

        // 检查认证状态
        checkAuthStatus: () => {
            const token = Auth.getToken();
            const isAuthenticated = token && !Utils.isTokenExpired(token);
            const user = isAuthenticated ? Storage.get(CONFIG.USER_INFO_KEY) : null;
            
            AuthState.notify(isAuthenticated, user);
            return isAuthenticated;
        }
    };

    /**
     * 公共API - 对外暴露的方法
     */
    const AuthAPI = {
        // 初始化认证系统
        init: () => {
            // 启动定时检查
            AuthAPI.setupTokenCheck();
            
            // 监听页面可见性变化
            AuthAPI.setupVisibilityChange();
            
            // 初始检查认证状态
            return AuthState.checkAuthStatus();
        },

        // 设置Token检查
        setupTokenCheck: () => {
            setInterval(async () => {
                if (Auth.isAuthenticated() && Utils.shouldRefreshToken(Auth.getToken())) {
                    try {
                        await Auth.refreshToken();
                    } catch (error) {
                        console.error('Token refresh failed:', error);
                        Auth.logout();
                    }
                }
            }, CONFIG.TOKEN_CHECK_INTERVAL);
        },

        // 设置页面可见性变化处理
        setupVisibilityChange: () => {
            document.addEventListener('visibilitychange', async () => {
                if (document.visibilityState === 'visible') {
                    // 页面变为可见时检查认证状态
                    AuthState.checkAuthStatus();
                    
                    // 如果需要刷新token
                    if (Auth.isAuthenticated() && Utils.shouldRefreshToken(Auth.getToken())) {
                        try {
                            await Auth.refreshToken();
                        } catch (error) {
                            console.error('Token refresh on visibility change failed:', error);
                            Auth.logout();
                        }
                    }
                }
            });
        },

        // 用户注册
        register: async (userData) => {
            try {
                const response = await API.post('/users/signup', {
                    email: userData.email,
                    password: userData.password,
                    full_name: userData.fullName
                });

                if (response.access_token) {
                    Auth.setTokens(response.access_token, response.refresh_token);
                    await Auth.getCurrentUser();
                }

                return response;
            } catch (error) {
                throw error;
            }
        },

        // 用户登录
        login: async (email, password) => {
            try {
                const response = await API.post('/token', {
                    email,
                    password
                });

                if (response.access_token) {
                    Auth.setTokens(response.access_token, response.refresh_token);
                    await Auth.getCurrentUser();
                }

                return response;
            } catch (error) {
                throw error;
            }
        },

        // 用户登出
        logout: async () => {
            try {
                // 通知服务器登出（可选）
                if (Auth.isAuthenticated()) {
                    try {
                        await API.post('/auth/logout');
                    } catch (error) {
                        console.warn('Server logout failed:', error);
                    }
                }
            } finally {
                // 清除本地认证信息
                Auth.clearTokens();
                AuthState.notify(false, null);
            }
        },

        // 刷新token
        refreshToken: async () => {
            // 防止重复刷新
            if (isRefreshing) {
                return refreshPromise;
            }

            isRefreshing = true;
            
            try {
                const refreshToken = Storage.get(CONFIG.REFRESH_TOKEN_KEY);
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                refreshPromise = API.post('/auth/refresh', {
                    refresh_token: refreshToken
                });

                const response = await refreshPromise;

                if (response.access_token) {
                    Auth.setTokens(response.access_token, response.refresh_token || refreshToken);
                } else {
                    throw new Error('No access token in refresh response');
                }

                return response;
            } catch (error) {
                // 刷新失败，清除token并登出
                Auth.clearTokens();
                throw error;
            } finally {
                isRefreshing = false;
                refreshPromise = null;
            }
        },

        // 获取当前用户信息
        getCurrentUser: async () => {
            try {
                const response = await API.get('/me');
                Storage.set(CONFIG.USER_INFO_KEY, response);
                AuthState.notify(true, response);
                return response;
            } catch (error) {
                throw error;
            }
        },

        // 更新用户信息
        updateProfile: async (userData) => {
            try {
                const response = await API.patch('/auth/profile', userData);
                Storage.set(CONFIG.USER_INFO_KEY, response);
                AuthState.notify(true, response);
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
            return token && !Utils.isTokenExpired(token);
        },

        // 保护页面（未认证重定向到登录页）
        protectRoute: () => {
            if (!Auth.isAuthenticated()) {
                window.location.href = `${CONFIG.LOGIN_REDIRECT_URL}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
                return false;
            }
            return true;
        },

        // 保护页面（仅认证用户访问）
        protectAuthenticatedRoute: () => {
            if (Auth.isAuthenticated()) {
                window.location.href = CONFIG.HOME_REDIRECT_URL;
                return false;
            }
            return true;
        },

        // 获取用户信息
        getUserInfo: () => {
            return Storage.get(CONFIG.USER_INFO_KEY);
        },

        // 监听认证状态变化
        onAuthStateChange: (callback) => {
            AuthState.addListener(callback);
            return () => AuthState.removeListener(callback);
        }
    };

    // 私有方法 - 不对外暴露
    const AuthPrivate = {
        // 设置token
        setTokens: (accessToken, refreshToken) => {
            Storage.set(CONFIG.JWT_STORAGE_KEY, accessToken);
            if (refreshToken) {
                Storage.set(CONFIG.REFRESH_TOKEN_KEY, refreshToken);
            }
            API.setAuthHeader(accessToken);
        },

        // 清除token
        clearTokens: () => {
            Storage.remove(CONFIG.JWT_STORAGE_KEY);
            Storage.remove(CONFIG.REFRESH_TOKEN_KEY);
            Storage.remove(CONFIG.USER_INFO_KEY);
            API.removeAuthHeader();
        },

        // 获取存储的token
        getToken: () => {
            return Storage.get(CONFIG.JWT_STORAGE_KEY);
        },

        // 获取刷新token
        getRefreshToken: () => {
            return Storage.get(CONFIG.REFRESH_TOKEN_KEY);
        }
    };

    // 合并公共API和私有方法
    return Object.assign(AuthPrivate, AuthAPI);
})();

// ==============================================
// 全局配置和事件处理
// ==============================================

// 全局错误处理
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.response?.status === 401) {
        // Token过期，自动重定向到登录页
        Auth.logout();
    }
});

// 页面加载完成后初始化认证系统
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Auth.init);
} else {
    Auth.init();
}

// 全局导出
window.Auth = Auth;