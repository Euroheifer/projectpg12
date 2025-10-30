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
export function customAlert(title, message) {
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