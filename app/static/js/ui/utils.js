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
 * 帮助函数：显示自定义弹窗
 * (来自 home.js)
 */
export function showCustomAlert(title, message) {
    const modal = document.getElementById('custom-alert-modal');
    const msgElement = document.getElementById('alert-message');
    if (modal && msgElement) {
        msgElement.innerHTML = `<strong>${title}</strong><br>${String(message)}`;
        modal.classList.remove('hidden');
    }
}

/**
 * 帮助函数：关闭自定义弹窗
 * (来自 home.js)
 */
export function closeCustomAlert() {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 权限检查装饰器
export function requireAdmin(action) {
    return function (...args) {
        if (!window.IS_CURRENT_USER_ADMIN) {
            showCustomAlert('权限不足', '此操作需要管理员权限');
            return;
        }
        return action.apply(this, args);
    };
}

// 模态框管理
export function setupModalCloseHandlers() {
    const modals = document.querySelectorAll('[id$="-modal"]');
    modals.forEach(modal => {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.add('hidden');
            }
        });
    });
}

// 日期工具
export function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

export function clearAuthData() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
}

window.getAuthToken = getAuthToken;
window.amountToCents = amountToCents;
window.centsToAmountString = centsToAmountString;
window.showCustomAlert = showCustomAlert;
window.closeCustomAlert = closeCustomAlert;
window.isValidEmail = isValidEmail;
window.requireAdmin = requireAdmin;
window.setupModalCloseHandlers = setupModalCloseHandlers;
window.getTodayDate = getTodayDate;
window.clearAuthData = clearAuthData;

// 确保这些函数在全局可用
console.log('工具函数已加载并暴露到全局');