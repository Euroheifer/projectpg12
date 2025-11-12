// amount_utils.js - Amount conversion utility functions (backward compatible)
// Prevent caching version: 2025.11.06
const JS_CACHE_VERSION = '2025.11.06.002';

/**
 * Convert amount string to cents
 * Example: "10.50" -> 1050
 */
export function amountToCents(amountString) {
    if (!amountString) return 0;
    const amount = parseFloat(amountString);
    if (isNaN(amount)) return 0;
    return Math.round(amount * 100);
}

/**
 * Convert cents to amount string
 * Example: 1050 -> "10.50"
 */
export function centsToAmountString(centsInt) {
    if (centsInt === undefined || centsInt === null || isNaN(centsInt)) {
        centsInt = 0;
    }
    const amount = (centsInt / 100).toFixed(2);
    return amount;
}

/**
 * Format currency display
 * Add currency symbol and thousands separator
 */
export function formatCurrency(centsInt, currency = '$') {
    const amount = centsToAmountString(centsInt);
    const [integer, decimal] = amount.split('.');
    const formattedInteger = parseInt(integer).toLocaleString();
    return `${currency}${formattedInteger}.${decimal}`;
}

/**
 * Validate if the amount string is valid
 */
export function isValidAmount(amountString) {
    const amount = parseFloat(amountString);
    return !isNaN(amount) && amount >= 0;
}

// Expose to global
window.amountToCents = amountToCents;
window.centsToAmountString = centsToAmountString;
window.formatCurrency = formatCurrency;
window.isValidAmount = isValidAmount;

console.log('amount_utils.js loaded, amount conversion functions exposed to global (v2025.11.06.002)');
