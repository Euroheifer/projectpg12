// apiClient.js - 统一API客户端

// 获取认证token的函数
function getAuthToken() {
    return localStorage.getItem('access_token') || '';
}

class ApiClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
    }
    
    // 获取认证头
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const token = getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }
    
    // 通用请求方法
    async request(method, endpoint, data = null) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method,
            headers: this.getAuthHeaders()
        };
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            if (data instanceof FormData) {
                // 删除Content-Type，让浏览器自动设置
                config.headers = { 'Authorization': `Bearer ${getAuthToken()}` };
                config.body = data;
            } else {
                config.body = JSON.stringify(data);
            }
        }
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: '网络错误' }));
                throw new Error(error.detail || `HTTP ${response.status}`);
            }
            
            // 处理204 No Content响应
            if (response.status === 204) {
                return { success: true };
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API请求失败 [${method} ${endpoint}]:`, error);
            throw error;
        }
    }
    
    // 便捷方法
    get(endpoint) {
        return this.request('GET', endpoint);
    }
    
    post(endpoint, data) {
        return this.request('POST', endpoint, data);
    }
    
    put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    }
    
    delete(endpoint) {
        return this.request('DELETE', endpoint);
    }
    
    // 特殊方法：上传文件
    async uploadFile(endpoint, file) {
        const formData = new FormData();
        formData.append('file', file);
        
        return this.request('POST', endpoint, formData);
    }
    
    // 错误处理
    handleError(error) {
        console.error('API客户端错误:', error);
        
        // 如果是401未认证，清除token并跳转到登录页
        if (error.message.includes('HTTP 401') || error.message.includes('Unauthorized')) {
            localStorage.removeItem('access_token');
            window.location.href = '/login';
            return;
        }
        
        // 显示用户友好的错误消息
        const errorMessage = this.getErrorMessage(error);
        this.showErrorToast(errorMessage);
        
        throw error;
    }
    
    // 获取用户友好的错误消息
    getErrorMessage(error) {
        const message = error.message || '操作失败';
        
        if (message.includes('Network Error') || message.includes('fetch')) {
            return '网络连接失败，请检查网络设置';
        }
        
        if (message.includes('timeout')) {
            return '请求超时，请稍后重试';
        }
        
        if (message.includes('HTTP 400')) {
            return '请求参数错误，请检查输入内容';
        }
        
        if (message.includes('HTTP 403')) {
            return '权限不足，无法执行此操作';
        }
        
        if (message.includes('HTTP 404')) {
            return '请求的资源不存在';
        }
        
        if (message.includes('HTTP 500')) {
            return '服务器内部错误，请稍后重试';
        }
        
        return message;
    }
    
    // 显示错误提示
    showErrorToast(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded shadow-lg z-50 max-w-sm';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
    
    // 显示成功提示
    showSuccessToast(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded shadow-lg z-50';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// 创建全局API客户端实例
window.apiClient = new ApiClient();

// 创建常用API端点常量
window.API_ENDPOINTS = {
    // 用户相关
    USERS: {
        SIGNUP: '/users/signup',
        LOGIN: '/token',
        PROFILE: '/users/me'
    },
    
    // 群组相关
    GROUPS: {
        LIST: '/groups',
        DETAIL: (id) => `/groups/${id}`,
        MEMBERS: (id) => `/groups/${id}/members`,
        ACTIVITY_LOG: (id) => `/groups/${id}/activity-log`,
        INVITATIONS: (id) => `/groups/${id}/invitations`,
        EXPENSES: (id) => `/groups/${id}/expenses`,
        PAYMENTS: (id) => `/groups/${id}/payments`,
        RECURRING_EXPENSES: (id) => `/groups/${id}/recurring-expenses`
    },
    
    // 成员相关
    MEMBERS: {
        ROLE: (groupId, memberId) => `/groups/${groupId}/members/${memberId}/role`
    },
    
    // 费用相关
    EXPENSES: {
        DETAIL: (id) => `/expenses/${id}`
    },
    
    // 支付相关
    PAYMENTS: {
        DETAIL: (id) => `/payments/${id}`
    },
    
    // 定期费用相关
    RECURRING_EXPENSES: {
        DETAIL: (id) => `/recurring-expenses/${id}`,
        TOGGLE: (id) => `/recurring-expenses/${id}/toggle`
    },
    
    // 邀请相关
    INVITATIONS: {
        LIST: '/invitations',
        RESPOND: (id) => `/invitations/${id}/respond`
    },
    
    // 文件上传
    UPLOAD: '/upload'
};

// 导出单例
export default window.apiClient;

// 使用示例：
/*
import apiClient from './apiClient.js';

// GET请求
const groups = await apiClient.get('/groups');

// POST请求
const newGroup = await apiClient.post('/groups', {
    name: '新群组',
    description: '群组描述'
});

// PUT请求
const updatedGroup = await apiClient.put('/groups/123', {
    name: '更新后的群组名'
});

// DELETE请求
await apiClient.delete('/groups/123');

// 文件上传
const uploadResult = await apiClient.uploadFile('/upload', fileInput.files[0]);

// 使用端点常量
const members = await apiClient.get(window.API_ENDPOINTS.GROUPS.MEMBERS(123));
*/

console.log('API客户端已加载 - 提供统一的API调用接口');
