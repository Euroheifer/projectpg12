// amount_utils.js - Amount conversion utility functions (backward compatibility)
// Version: 2025.11.06
const JS_CACHE_VERSION = '2025.11.06.002';

/**
 * Convert amount string to cents
 * Example: "10.50" -> 1050
 */
function amountToCents(amountString) {
    if (typeof amountString !== 'string') {
        amountString = String(amountString);
    }
    
    // Remove any non-numeric characters except decimal point
    const cleanAmount = amountString.replace(/[^\d.-]/g, '');
    
    if (cleanAmount === '' || cleanAmount === '.' || cleanAmount === '-') {
        return 0;
    }
    
    const amount = parseFloat(cleanAmount);
    if (isNaN(amount)) {
        return 0;
    }
    
    return Math.round(amount * 100);
}

/**
 * Convert cents to amount string
 * Example: 1050 -> "10.50"
 */
function centsToAmount(cents) {
    if (typeof cents === 'string') {
        cents = parseInt(cents, 10);
    }
    
    if (isNaN(cents)) {
        return "0.00";
    }
    
    const amount = cents / 100;
    return amount.toFixed(2);
}

/**
 * Format amount for display
 * Add currency symbol and thousand separators
 */
function formatAmount(amount, currency = '$') {
    if (typeof amount === 'string') {
        amount = parseFloat(amount);
    }
    
    if (isNaN(amount)) {
        amount = 0;
    }
    
    // Format with thousands separators
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Math.abs(amount));
    
    // Add currency symbol and sign
    const sign = amount < 0 ? '-' : '';
    return `${sign}${currency}${formatted}`;
}

/**
 * Validate amount string
 */
function isValidAmount(amountString) {
    if (typeof amountString !== 'string') {
        return false;
    }
    
    // Remove currency symbols and spaces
    const cleanAmount = amountString.replace(/[^\d.-]/g, '');
    
    // Check if it's a valid number
    const amount = parseFloat(cleanAmount);
    return !isNaN(amount) && amount >= 0;
}

// Expose to global
window.amountToCents = amountToCents;
window.centsToAmount = centsToAmount;
window.formatAmount = formatAmount;
window.isValidAmount = isValidAmount;

console.log('amount_utils.js loaded, amount conversion functions exposed to global (v2025.11.06.002)');
