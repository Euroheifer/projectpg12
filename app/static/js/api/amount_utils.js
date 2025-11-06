// amount_utils.js - 金额转换工具函数
// 防止缓存版本: 2025.11.06
const JS_CACHE_VERSION = '2025.11.06.001';

/**
 * 将金额字符串转换为分（cents）
 * 例如: "10.50" -> 1050
 */
export function amountToCents(amountString) {
    if (!amountString) return 0;
    const amount = parseFloat(amountString);
    if (isNaN(amount)) return 0;
    return Math.round(amount * 100);
}

/**
 * 将分（cents）转换为金额字符串
 * 例如: 1050 -> "10.50"
 */
export function centsToAmountString(centsInt) {
    if (centsInt === undefined || centsInt === null || isNaN(centsInt)) {
        centsInt = 0;
    }
    const amount = (centsInt / 100).toFixed(2);
    return amount;
}

/**
 * 格式化金额显示
 * 添加货币符号和千分位分隔符
 */
export function formatCurrency(centsInt, currency = '$') {
    const amount = centsToAmountString(centsInt);
    const [integer, decimal] = amount.split('.');
    const formattedInteger = parseInt(integer).toLocaleString();
    return `${currency}${formattedInteger}.${decimal}`;
}

/**
 * 验证金额字符串是否有效
 */
export function isValidAmount(amountString) {
    const amount = parseFloat(amountString);
    return !isNaN(amount) && amount >= 0;
}

// 暴露到全局
window.amountToCents = amountToCents;
window.centsToAmountString = centsToAmountString;
window.formatCurrency = formatCurrency;
window.isValidAmount = isValidAmount;

console.log('amount_utils.js 已加载，金额转换函数已暴露到全局');