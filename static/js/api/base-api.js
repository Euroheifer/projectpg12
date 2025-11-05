/**
 * API基础模块 - 提供统一的API调用机制
 * 包含认证、错误处理、输入验证等核心功能
 */

// API配置常量
const API_CONFIG = {
    TIMEOUT: 30000, // 30秒超时
    RETRY_ATTEMPTS: 3,
    BASE_URL: '',
    DEFAULT_HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// 错误类型定义
export class APIError extends Error {
    constructor(message, status, code, details = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

// 网络错误
export class NetworkError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NetworkError';
    }
}

// 认证错误
export class AuthError extends Error {
    constructor(message = '认证失败，请重新登录') {
        super(message);
        this.name = 'AuthError';
    }
}

// 验证错误
export class ValidationError extends Error {
    constructor(message, errors = []) {
        super(message);
        this.name = 'ValidationError';
        this.errors = errors;
    }
}

// 统一参数验证工具
export class Validator {
    static required(value, fieldName) {
        if (value === null || value === undefined || value === '') {
            throw new ValidationError(`${fieldName}是必填字段`);
        }
        return value;
    }

    static string(value, fieldName, maxLength = null) {
        if (typeof value !== 'string') {
            throw new ValidationError(`${fieldName}必须是字符串`);
        }
        if (maxLength && value.length > maxLength) {
            throw new ValidationError(`${fieldName}长度不能超过${maxLength}个字符`);
        }
        return value.trim();
    }

    static email(value, fieldName) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            throw new ValidationError(`${fieldName}格式不正确`);
        }
        return value.toLowerCase();
    }

    static number(value, fieldName, min = null, max = null) {
        const num = Number(value);
        if (isNaN(num)) {
            throw new ValidationError(`${fieldName}必须是有效数字`);
        }
        if (min !== null && num < min) {
            throw new ValidationError(`${fieldName}不能小于${min}`);
        }
        if (max !== null && num > max) {
            throw new ValidationError(`${fieldName}不能大于${max}`);
        }
        return num;
    }

    static id(value, fieldName) {
        const id = Number(value);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ValidationError(`${fieldName}必须是正整数`);
        }
        return id;
    }

    static positiveAmount(value, fieldName) {
        const amount = Number(value);
        if (isNaN(amount) || amount <= 0) {
            throw new ValidationError(`${fieldName}必须是正数`);
        }
        return amount;
    }

    static date(value, fieldName) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
            throw new ValidationError(`${fieldName}格式必须为YYYY-MM-DD`);
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            throw new ValidationError(`${fieldName}必须是有效日期`);
        }
        return value;
    }
}

// 统一认证管理器
export class AuthManager {
    static getToken() {
        return localStorage.getItem('access_token');
    }

    static setToken(token) {
        if (token) {
            localStorage.setItem('access_token', token);
        }
    }

    static clearToken() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('current_user');
    }

    static isAuthenticated() {
        return !!this.getToken();
    }

    static getAuthHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
}

// 统一HTTP客户端
export class APIClient {
    constructor(config = {}) {
        this.config = { ...API_CONFIG, ...config };
    }

    // 统一的请求方法
    async request(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.TIMEOUT);

        try {
            const defaultOptions = {
                ...this.config.DEFAULT_HEADERS,
                ...AuthManager.getAuthHeaders(),
                signal: controller.signal
            };

            const finalOptions = {
                method: 'GET',
                ...options,
                headers: {
                    ...defaultOptions,
                    ...options.headers
                }
            };

            const response = await fetch(url, finalOptions);
            clearTimeout(timeoutId);

            return await this.handleResponse(response);
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new NetworkError('请求超时，请检查网络连接');
            }
            throw error;
        }
    }

    // 统一的响应处理
    async handleResponse(response) {
        const contentType = response.headers.get('content-type');
        const isJSON = contentType && contentType.includes('application/json');

        // 处理204 No Content
        if (response.status === 204) {
            return { success: true };
        }

        const data = isJSON ? await response.json() : await response.text();

        if (!response.ok) {
            await this.handleError(response, data);
        }

        return data;
    }

    // 统一的错误处理
    async handleError(response, data) {
        console.error(`API错误 [${response.status}]:`, data);

        switch (response.status) {
            case 401:
                AuthManager.clearToken();
                throw new AuthError('认证失败，请重新登录');
            case 403:
                throw new APIError('权限不足', 403, 'FORBIDDEN');
            case 404:
                throw new APIError('资源不存在', 404, 'NOT_FOUND');
            case 422:
                // 验证错误
                const validationErrors = Array.isArray(data.detail) 
                    ? data.detail.map(err => ({
                        field: err.loc?.pop() || 'unknown',
                        message: err.msg
                    }))
                    : [data.detail];
                throw new ValidationError('数据验证失败', validationErrors);
            case 429:
                throw new APIError('请求过于频繁，请稍后再试', 429, 'RATE_LIMIT');
            case 500:
                throw new APIError('服务器内部错误', 500, 'INTERNAL_ERROR');
            default:
                const message = data?.detail || data?.message || `请求失败 (${response.status})`;
                throw new APIError(message, response.status, 'UNKNOWN_ERROR', data);
        }
    }

    // GET请求
    async get(url, params = null) {
        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    searchParams.append(key, value);
                }
            });
            url += '?' + searchParams.toString();
        }

        return this.request(url, { method: 'GET' });
    }

    // POST请求
    async post(url, data = null, isFormData = false) {
        const options = { method: 'POST' };

        if (data) {
            if (isFormData) {
                // FormData不需要设置Content-Type，让浏览器自动设置
                options.body = data;
                delete options.headers?.['Content-Type'];
            } else {
                options.body = JSON.stringify(data);
            }
        }

        return this.request(url, options);
    }

    // PUT请求
    async put(url, data = null) {
        return this.request(url, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined
        });
    }

    // PATCH请求
    async patch(url, data = null) {
        return this.request(url, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined
        });
    }

    // DELETE请求
    async delete(url) {
        return this.request(url, { method: 'DELETE' });
    }
}

// 创建默认API客户端实例
export const apiClient = new APIClient();

// 便利方法
export const api = {
    get: (url, params) => apiClient.get(url, params),
    post: (url, data, isFormData) => apiClient.post(url, data, isFormData),
    put: (url, data) => apiClient.put(url, data),
    patch: (url, data) => apiClient.patch(url, data),
    delete: (url) => apiClient.delete(url)
};

// 用户提示工具
export const showAlert = (type, message, details = null) => {
    // 尝试使用自定义alert
    if (typeof window.showCustomAlert === 'function') {
        window.showCustomAlert(
            type === 'error' ? '错误' : type === 'warning' ? '警告' : '提示',
            message
        );
    } else {
        // 降级到原生alert
        alert(`${type.toUpperCase()}: ${message}`);
    }

    // 控制台记录详细信息
    if (details && process.env.NODE_ENV === 'development') {
        console.error('详细信息:', details);
    }
};

// 全局错误处理
export const handleAPIError = (error) => {
    console.error('API错误:', error);

    if (error instanceof AuthError) {
        showAlert('error', error.message);
        // 可以在这里添加重定向到登录页的逻辑
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        return;
    }

    if (error instanceof ValidationError) {
        const message = error.errors.length > 0 
            ? error.errors.map(e => `${e.field}: ${e.message}`).join('; ')
            : error.message;
        showAlert('error', message);
        return;
    }

    if (error instanceof NetworkError) {
        showAlert('error', '网络连接失败，请检查网络设置');
        return;
    }

    if (error instanceof APIError) {
        showAlert('error', error.message);
        return;
    }

    // 未知错误
    showAlert('error', '发生未知错误，请稍后重试');
};

export default {
    APIError,
    NetworkError,
    AuthError,
    ValidationError,
    Validator,
    AuthManager,
    APIClient,
    apiClient,
    api,
    showAlert,
    handleAPIError
};
