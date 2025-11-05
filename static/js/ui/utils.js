/**
 * 工具函数模块
 * 提供通用的工具函数和API封装
 */

// API配置
export const API_CONFIG = {
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// 获取认证token
export function getAuthToken() {
  return localStorage.getItem('access_token') || '';
}

// 设置认证token
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
}

// 清除认证token
export function clearAuthToken() {
  localStorage.removeItem('access_token');
}

// HTTP请求封装
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  const token = getAuthToken();
  
  const config = {
    timeout: API_CONFIG.timeout,
    headers: {
      ...API_CONFIG.headers,
      ...options.headers
    },
    ...options
  };

  // 添加认证头
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);
    
    if (response.status === 401) {
      // Token过期，清除token并跳转到登录页
      clearAuthToken();
      window.location.href = '/login/';
      throw new Error('认证已过期，请重新登录');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `请求失败: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error('API请求错误:', error);
    throw error;
  }
}

// GET请求
export async function apiGet(endpoint, params = {}) {
  const url = new URL(`${API_CONFIG.baseURL}${endpoint}`);
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
    }
  });
  
  return apiRequest(url.toString(), {
    method: 'GET'
  });
}

// POST请求
export async function apiPost(endpoint, data = {}) {
  return apiRequest(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}

// PUT请求
export async function apiPut(endpoint, data = {}) {
  return apiRequest(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}

// DELETE请求
export async function apiDelete(endpoint) {
  return apiRequest(endpoint, {
    method: 'DELETE'
  });
}

// 文件上传
export async function apiUpload(endpoint, file, additionalData = {}) {
  const formData = new FormData();
  formData.append('file', file);
  
  Object.keys(additionalData).forEach(key => {
    formData.append(key, additionalData[key]);
  });
  
  return apiRequest(endpoint, {
    method: 'POST',
    body: formData,
    headers: {} // 让浏览器自动设置Content-Type
  });
}

// 工具函数
export const Utils = {
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
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // 格式化日期
  formatDate(date, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Intl.DateTimeFormat('zh-CN', { ...defaultOptions, ...options })
      .format(new Date(date));
  },

  // 格式化货币
  formatCurrency(amount, currency = 'CNY') {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  // 数字格式化
  formatNumber(num, decimals = 2) {
    return parseFloat(num).toFixed(decimals);
  },

  // 数组去重
  uniqueArray(arr, key) {
    if (!key) {
      return [...new Set(arr)];
    }
    const seen = new Set();
    return arr.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  },

  // 深拷贝
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }
    
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  },

  // 生成随机ID
  generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // 验证邮箱
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // 验证密码强度
  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const score = [
      password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    ].filter(Boolean).length;

    let strength = 'weak';
    if (score >= 4) strength = 'strong';
    else if (score >= 3) strength = 'medium';

    return {
      strength,
      score,
      requirements: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
  },

  // 本地存储封装
  storage: {
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('本地存储设置失败:', error);
        return false;
      }
    },

    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.error('本地存储读取失败:', error);
        return defaultValue;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('本地存储删除失败:', error);
        return false;
      }
    },

    clear() {
      try {
        localStorage.clear();
        return true;
      } catch (error) {
        console.error('本地存储清空失败:', error);
        return false;
      }
    }
  },

  // DOM操作
  dom: {
    // 选择器
    $(selector) {
      return document.querySelector(selector);
    },

    $$(selector) {
      return document.querySelectorAll(selector);
    },

    // 创建元素
    create(tag, attributes = {}, content = '') {
      const element = document.createElement(tag);
      Object.keys(attributes).forEach(key => {
        if (key === 'className') {
          element.className = attributes[key];
        } else if (key === 'dataset') {
          Object.keys(attributes[key]).forEach(dataKey => {
            element.dataset[dataKey] = attributes[key][dataKey];
          });
        } else {
          element.setAttribute(key, attributes[key]);
        }
      });
      
      if (content) {
        element.innerHTML = content;
      }
      
      return element;
    },

    // 事件委托
    delegate(parent, selector, event, handler) {
      parent.addEventListener(event, function(e) {
        const target = e.target.closest(selector);
        if (target && parent.contains(target)) {
          handler.call(target, e);
        }
      });
    },

    // 动画
    animate(element, keyframes, options = {}) {
      const defaultOptions = {
        duration: 300,
        easing: 'ease-in-out',
        fill: 'both'
      };
      return element.animate(keyframes, { ...defaultOptions, ...options });
    }
  }
};

// 通知系统
export class NotificationSystem {
  constructor() {
    this.container = this.createContainer();
  }

  createContainer() {
    let container = document.getElementById('notification-container');
    if (!container) {
      container = Utils.dom.create('div', {
        id: 'notification-container',
        className: 'fixed top-4 right-4 z-50 space-y-2'
      });
      document.body.appendChild(container);
    }
    return container;
  }

  show(message, type = 'info', duration = 5000, actions = []) {
    const notification = Utils.dom.create('div', {
      className: `bg-white rounded-lg shadow-lg border-l-4 p-4 max-w-sm transform transition-all duration-300 translate-x-full`
    });

    const colors = {
      success: 'border-green-500',
      error: 'border-red-500',
      warning: 'border-yellow-500',
      info: 'border-blue-500'
    };

    const icons = {
      success: 'fas fa-check-circle text-green-500',
      error: 'fas fa-exclamation-circle text-red-500',
      warning: 'fas fa-exclamation-triangle text-yellow-500',
      info: 'fas fa-info-circle text-blue-500'
    };

    notification.className += ` ${colors[type]}`;
    
    const actionButtons = actions.map(action => 
      `<button onclick="${action.handler}" class="ml-2 text-sm font-medium ${colors[type].replace('border-', 'text-')} hover:underline">${action.label}</button>`
    ).join('');

    notification.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <i class="${icons[type]}"></i>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium text-gray-900">${message}</p>
          ${actionButtons ? `<div class="mt-2">${actionButtons}</div>` : ''}
        </div>
        <div class="ml-auto">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(notification);
    
    // 动画显示
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);

    // 自动隐藏
    if (duration > 0) {
      setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }, duration);
    }

    return notification;
  }

  success(message, duration = 5000) {
    return this.show(message, 'success', duration);
  }

  error(message, duration = 8000) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration = 6000) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration = 5000) {
    return this.show(message, 'info', duration);
  }
}

// 创建全局通知实例
export const notifications = new NotificationSystem();