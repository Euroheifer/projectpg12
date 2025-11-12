/**
 * 帮助函数：从 localStorage 获取 Token
 * (来自 user.js / home.js)
 */
export function getAuthToken() {
    return localStorage.getItem('access_token');
}

/**
 * (NFR 修复) 将 "10.50" 转换为 1050 (美分)
 */
export function amountToCents(amountString) {
    if (!amountString) return 0;
    const amount = parseFloat(amountString);
    if (isNaN(amount)) return 0;
    return Math.round(amount * 100);
}

/**
 * (NFR 修复) 将 1050 (美分) 转换为 "10.50"
 */
export function centsToAmountString(centsInt) {
    if (centsInt === undefined || centsInt === null || isNaN(centsInt)) {
        centsInt = 0;
    }
    const amount = (centsInt / 100).toFixed(2);
    return amount;
}

/**
 * 显示自定义弹窗 - 支持不同类型消息
 * @param {string} title - 标题
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型：success, warning, error, info
 * @param {number} duration - 自动关闭时间（毫秒），0表示不自动关闭
 */
export function showCustomAlert(title, message, type = 'info', duration = 0) {
    const modal = document.getElementById('custom-alert-modal');
    const msgElement = document.getElementById('alert-message');
    const iconElement = document.getElementById('alert-icon');
    const closeBtn = document.getElementById('alert-close-btn');
    
    if (modal && msgElement) {
        // 设置消息类型样式
        modal.className = modal.className.replace(/alert-\w+/g, '').trim();
        modal.classList.add('alert-modal', `alert-${type}`);
        
        // 设置图标
        if (iconElement) {
            iconElement.className = `alert-icon ${getIconClass(type)}`;
        }
        
        // 设置消息内容
        msgElement.innerHTML = `
            <div class="alert-content">
                <strong class="alert-title">${escapeHtml(title)}</strong>
                <div class="alert-message-text">${escapeHtml(String(message))}</div>
            </div>
        `;
        
        // 显示弹窗
        modal.classList.remove('hidden');
        modal.setAttribute('data-type', type);
        
        // 添加关闭按钮事件
        if (closeBtn) {
            closeBtn.onclick = closeCustomAlert;
        }
        
        // 自动关闭
        if (duration > 0) {
            setTimeout(() => {
                if (!modal.classList.contains('hidden')) {
                    closeCustomAlert();
                }
            }, duration);
        }
        
        // 添加键盘事件监听
        document.addEventListener('keydown', handleAlertKeydown);
        
        // 优化用户交互反馈
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.9)';
        requestAnimationFrame(() => {
            modal.style.transition = 'all 0.3s ease';
            modal.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        });
    }
}

/**
 * 根据消息类型获取对应的CSS类
 */
function getIconClass(type) {
    const iconMap = {
        success: 'fas fa-check-circle text-green-500',
        warning: 'fas fa-exclamation-triangle text-yellow-500',
        error: 'fas fa-times-circle text-red-500',
        info: 'fas fa-info-circle text-blue-500'
    };
    return iconMap[type] || iconMap.info;
}

/**
 * 转义HTML字符
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 处理弹窗键盘事件
 */
function handleAlertKeydown(e) {
    if (e.key === 'Escape') {
        closeCustomAlert();
    }
}

/**
 * 关闭自定义弹窗
 */
export function closeCustomAlert() {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) {
        // 添加关闭动画
        modal.style.transition = 'all 0.3s ease';
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.style.opacity = '';
            modal.style.transform = '';
            modal.style.transition = '';
        }, 300);
        
        // 移除键盘事件监听
        document.removeEventListener('keydown', handleAlertKeydown);
    }
}

/**
 * 表单验证相关函数
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 验证手机号
 */
export function isValidPhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
}

/**
 * 验证密码强度
 */
export function validatePasswordStrength(password) {
    const criteria = {
        minLength: password.length >= 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumbers: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    const score = Object.values(criteria).filter(Boolean).length;
    
    let strength = 'weak';
    if (score >= 4) strength = 'strong';
    else if (score >= 3) strength = 'medium';
    
    return { strength, criteria, score };
}

/**
 * 显示表单验证错误
 * @param {HTMLElement} inputElement - 输入框元素
 * @param {string} message - 错误消息
 */
export function showFieldError(inputElement, message) {
    if (!inputElement) return;
    
    // 移除现有错误
    clearFieldError(inputElement);
    
    // 添加错误样式
    inputElement.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
    inputElement.classList.remove('border-gray-300', 'focus:border-blue-500', 'focus:ring-blue-500');
    
    // 创建错误提示
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error-message text-red-500 text-sm mt-1 flex items-center';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle mr-1"></i>${escapeHtml(message)}`;
    
    // 添加shake动画
    inputElement.style.animation = 'shake 0.5s ease-in-out';
    
    // 插入错误消息
    inputElement.parentNode.insertBefore(errorDiv, inputElement.nextSibling);
    
    // 设置错误标识
    inputElement.setAttribute('aria-invalid', 'true');
    inputElement.setAttribute('aria-describedby', `error-${inputElement.id || 'field'}`);
    errorDiv.id = `error-${inputElement.id || 'field'}`;
    
    // 聚焦到错误字段
    setTimeout(() => {
        inputElement.focus();
        inputElement.style.animation = '';
    }, 500);
}

/**
 * 清除字段错误
 */
export function clearFieldError(inputElement) {
    if (!inputElement) return;
    
    // 移除错误样式
    inputElement.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
    inputElement.classList.add('border-gray-300', 'focus:border-blue-500', 'focus:ring-blue-500');
    
    // 移除错误消息
    const errorMessage = inputElement.parentNode.querySelector('.field-error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
    
    // 移除错误标识
    inputElement.removeAttribute('aria-invalid');
    inputElement.removeAttribute('aria-describedby');
}

/**
 * 清除所有表单错误
 */
export function clearAllFormErrors(formElement) {
    const errorInputs = formElement.querySelectorAll('[aria-invalid="true"]');
    errorInputs.forEach(input => clearFieldError(input));
}

/**
 * 实时验证输入
 */
export function setupRealTimeValidation(inputElement, validator, errorMessage) {
    if (!inputElement) return;
    
    inputElement.addEventListener('blur', () => {
        const value = inputElement.value.trim();
        if (value && !validator(value)) {
            showFieldError(inputElement, errorMessage);
        } else {
            clearFieldError(inputElement);
        }
    });
    
    inputElement.addEventListener('input', () => {
        if (inputElement.getAttribute('aria-invalid') === 'true') {
            clearFieldError(inputElement);
        }
    });
}

// 权限检查装饰器
export function requireAdmin(action) {
    return function (...args) {
        if (!window.IS_CURRENT_USER_ADMIN) {
            showCustomAlert('Permission Denied', 'This action requires admin privileges'); // Translated
            return;
        }
        return action.apply(this, args);
    };
}

/**
 * Loading 状态管理
 */
class LoadingManager {
    constructor() {
        this.loadingCount = 0;
        this.loadingElement = null;
        this.init();
    }
    
    init() {
        // 创建loading元素
        this.loadingElement = document.createElement('div');
        this.loadingElement.id = 'global-loading';
        this.loadingElement.className = 'loading-overlay hidden';
        this.loadingElement.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="loading-text">Loading...</div>
            </div>
        `; // Translated
        document.body.appendChild(this.loadingElement);
    }
    
    show(message = 'Loading...') { // Translated
        this.loadingCount++;
        const textElement = this.loadingElement.querySelector('.loading-text');
        if (textElement) {
            textElement.textContent = message;
        }
        this.loadingElement.classList.remove('hidden');
        
        // 添加键盘ESC取消支持
        this.escHandler = (e) => {
            if (e.key === 'Escape' && this.loadingCount > 0) {
                this.hide();
            }
        };
        document.addEventListener('keydown', this.escHandler);
    }
    
    hide() {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        if (this.loadingCount === 0) {
            this.loadingElement.classList.add('hidden');
            if (this.escHandler) {
                document.removeEventListener('keydown', this.escHandler);
            }
        }
    }
    
    forceHide() {
        this.loadingCount = 0;
        this.hide();
    }
}

const globalLoading = new LoadingManager();

/**
 * 显示/隐藏全局loading
 */
export function showLoading(message = 'Loading...') { // Translated
    globalLoading.show(message);
}

export function hideLoading() {
    globalLoading.hide();
}

/**
 * 错误处理类
 */
class ErrorHandler {
    constructor() {
        this.errorLog = [];
    }
    
    /**
     * 处理网络错误
     */
    handleNetworkError(error) {
        console.error('Network Error:', error); // Translated
        let message = 'Network connection failed, please check your network settings'; // Translated
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            message = 'Network request failed, please try again later'; // Translated
        } else if (error.code === 'NETWORK_ERROR') {
            message = 'Network connection error, please check your network settings'; // Translated
        }
        
        showCustomAlert('Network Error', message, 'error', 5000); // Translated
        this.logError('network', error, message);
    }
    
    /**
     * 处理API错误
     */
    handleApiError(response, data) {
        console.error('API Error:', response.status, data); // Translated
        
        let message = 'Operation failed, please try again later'; // Translated
        let type = 'error';
        
        switch (response.status) {
            case 400:
                message = data?.message || 'Invalid request parameters'; // Translated
                type = 'warning';
                break;
            case 401:
                message = 'Login expired, please log in again'; // Translated
                this.handleUnauthorized();
                return;
            case 403:
                message = 'Permission denied, you cannot perform this action'; // Translated
                break;
            case 404:
                message = 'The requested resource was not found'; // Translated
                break;
            case 422:
                message = data?.message || 'Data validation failed'; // Translated
                type = 'warning';
                break;
            case 429:
                message = 'Request too frequent, please try again later'; // Translated
                break;
            case 500:
                message = 'Server internal error, please try again later'; // Translated
                break;
            case 503:
                message = 'Service temporarily unavailable, please try again later'; // Translated
                break;
            default:
                if (data?.message) {
                    message = data.message;
                }
        }
        
        showCustomAlert('Operation Failed', message, type, 5000); // Translated
        this.logError('api', { response, data }, message);
    }
    
    /**
     * 处理未授权错误
     */
    handleUnauthorized() {
        // 清除认证信息
        clearAuthData();
        showCustomAlert('Login Expired', 'Your session has expired, please log in again', 'warning', 3000); // Translated
        
        // 延迟跳转登录页
        setTimeout(() => {
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }, 2000);
    }
    
    /**
     * 记录错误日志
     */
    logError(type, error, message) {
        this.errorLog.push({
            type,
            message,
            error: error?.message || error,
            timestamp: new Date().toISOString(),
            url: window.location.href
        });
        
        // 保持最近50条错误记录
        if (this.errorLog.length > 50) {
            this.errorLog = this.errorLog.slice(-50);
        }
    }
    
    /**
     * 获取错误日志
     */
    getErrorLog() {
        return this.errorLog;
    }
    
    /**
     * 清除错误日志
     */
    clearErrorLog() {
        this.errorLog = [];
    }
}

const globalErrorHandler = new ErrorHandler();

/**
 * 全局错误处理函数
 */
export function handleGlobalError(error, context = 'Unknown') { // Translated
    console.error(`Global Error [${context}]:`, error); // Translated
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
        globalErrorHandler.handleNetworkError(error);
    } else if (error.response) {
        globalErrorHandler.handleApiError(error.response, error.data);
    } else {
        showCustomAlert('System Error', 'An unknown error occurred, please refresh the page and try again', 'error'); // Translated
        globalErrorHandler.logError('global', error, 'Unknown error'); // Translated
    }
}

/**
 * 安全的异步操作包装器
 */
export function safeAsync(asyncFunction, options = {}) {
    return async (...args) => {
        const { 
            loadingMessage = 'Processing...', // Translated
            successMessage, 
            errorContext = 'Operation', // Translated
            showLoading = true 
        } = options;
        
        try {
            if (showLoading) showLoading(loadingMessage);
            
            const result = await asyncFunction(...args);
            
            if (successMessage) {
                showCustomAlert('Operation Successful', successMessage, 'success', 3000); // Translated
            }
            
            return result;
        } catch (error) {
            handleGlobalError(error, errorContext);
            throw error;
        } finally {
            if (showLoading) hideLoading();
        }
    };
}

/**
 * 模态框管理增强版
 */
export function setupModalCloseHandlers() {
    const modals = document.querySelectorAll('[id$="-modal"], .modal');
    
    modals.forEach(modal => {
        // 点击外部关闭
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                closeModal(this);
            }
        });
        
        // ESC键关闭
        modal.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal(this);
            }
        });
        
        // 为模态框内容添加tab索引管理
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            // 聚焦第一个元素
            modal.addEventListener('shown', () => {
                focusableElements[0].focus();
            });
            
            // Tab循环
            modal.addEventListener('keydown', function(e) {
                if (e.key === 'Tab') {
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];
                    
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
            });
        }
    });
}

/**
 * 关闭模态框
 */
export function closeModal(modalElement) {
    if (!modalElement) return;
    
    modalElement.classList.add('hidden');
    
    // 触发关闭事件
    modalElement.dispatchEvent(new CustomEvent('modalClosed', {
        bubbles: true,
        cancelable: true
    }));
}

/**
 * 显示模态框
 */
export function showModal(modalElement) {
    if (!modalElement) return;
    
    modalElement.classList.remove('hidden');
    
    // 触发显示事件
    modalElement.dispatchEvent(new CustomEvent('modalShown', {
        bubbles: true,
        cancelable: true
    }));
}

// 日期工具
export function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

export function clearAuthData() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
}

window.getAuthToken = getAuthToken;
window.amountToCents = amountToCents;
window.centsToAmountString = centsToAmountString;
window.showCustomAlert = showCustomAlert;
window.closeCustomAlert = closeCustomAlert;
window.isValidEmail = isValidEmail;
window.isValidPhone = isValidPhone;
window.validatePasswordStrength = validatePasswordStrength;
window.showFieldError = showFieldError;
window.clearFieldError = clearFieldError;
window.clearAllFormErrors = clearAllFormErrors;
window.setupRealTimeValidation = setupRealTimeValidation;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.handleGlobalError = handleGlobalError;
window.safeAsync = safeAsync;
window.closeModal = closeModal;
window.showModal = showModal;
window.requireAdmin = requireAdmin;
window.setupModalCloseHandlers = setupModalCloseHandlers;
window.getTodayDate = getTodayDate;
window.clearAuthData = clearAuthData;

// 全局错误处理
window.addEventListener('unhandledrejection', (event) => {
    handleGlobalError(event.reason, 'Unhandled Promise Rejection'); // Translated
    event.preventDefault();
});

window.addEventListener('error', (event) => {
    handleGlobalError(event.error, 'JavaScript Error'); // Translated
});

// 确保这些函数在全局可用
console.log('Utility functions loaded and exposed to global scope'); // Translated