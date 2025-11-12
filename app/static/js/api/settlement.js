// settlement.js - Settlement functions
// Cache buster: 2025.11.10
const JS_CACHE_VERSION = '2025.11.10.001';

import { getAuthToken, centsToAmountString, showCustomAlert, closeCustomAlert } from '../ui/utils.js';

// --- Global State ---
let currentSettlementData = null;

/**
 * Get settlement info for the group - Fixed Version
 * @param {number} groupId - Group ID
 * @returns {Promise<Object>} Settlement info
 */
export async function getSettlementInfo(groupId) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication token not found');
        }

        console.log('Getting group settlement info:', groupId);
        
        // Use the correct API endpoint
        const endpoint = `/groups/${groupId}/settlement`;
        console.log('Calling API endpoint:', endpoint);
        
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Settlement info:', data);
            return data;
        } else {
            const errorText = await response.text();
            console.error('API call failed:', response.status, errorText);
            
            // Return different error messages based on status code
            if (response.status === 404) {
                return {
                    balances: [],
                    group_id: groupId,
                    message: 'No settlement data for this group yet'
                };
            } else if (response.status === 401) {
                return {
                    balances: [],
                    group_id: groupId,
                    error: 'Authentication failed, please log in again',
                    message: 'Authentication failed, please log in again'
                };
            } else {
                return {
                    balances: [],
                    group_id: groupId,
                    error: `Server error (${response.status})`,
                    message: 'Failed to get settlement info, please try again later'
                };
            }
        }
        
    } catch (error) {
        console.error('Error getting settlement info:', error);
        
        // Network errors or other exceptions
        return {
            balances: [],
            group_id: groupId,
            error: error.message,
            message: 'Network connection failed, please check your connection and try again'
        };
    }
}

/**
 * Calculate settlement amounts
 * @param {Object} settlementData - Settlement data
 * @returns {Object} Calculated settlement info
 */
export function calculateSettlementAmounts(settlementData) {
    if (!settlementData) {
        return {
            totalOwedByMe: 0,
            totalOwedToMe: 0,
            settlementCount: 0,
            details: [],
            error: 'No settlement data',
            message: 'No settlement data available'
        };
    }

    // Handle error cases
    if (settlementData.error) {
        return {
            totalOwedByMe: 0,
            totalOwedToMe: 0,
            settlementCount: 0,
            details: [],
            error: settlementData.error,
            message: settlementData.message || 'Failed to get settlement info'
        };
    }

    // Get balance data, support different formats
    let balances = [];
    
    if (settlementData.balances && Array.isArray(settlementData.balances)) {
        // Standard format: { balances: [...] }
        balances = settlementData.balances;
    } else if (settlementData.settlements && Array.isArray(settlementData.settlements)) {
        // Alternative format: { settlements: [...] }
        balances = settlementData.settlements;
    } else {
        // Return empty result
        return {
            totalOwedByMe: 0,
            totalOwedToMe: 0,
            settlementCount: 0,
            details: [],
            error: null,
            message: settlementData.message || 'No settlement data available'
        };
    }

    let totalOwedByMe = 0; // Total amount I owe others
    let totalOwedToMe = 0; // Total amount others owe me
    let settlementCount = 0; // Number of items to settle
    const details = [];

    for (const balance of balances) {
        // Ensure balance is a valid object
        if (!balance || typeof balance !== 'object') {
            console.warn('Skipping invalid balance record:', balance);
            continue;
        }

        // Get amount, handling different field names
        const amount = balance.amount || balance.balance || balance.total || 0;
        const memberId = balance.member_id || balance.user_id || balance.id;
        const memberName = balance.member_name || balance.user_name || balance.name || getMemberNameById(memberId);

        if (amount > 0) {
            // Others owe me money
            totalOwedToMe += amount;
            details.push({
                type: 'owed_to_me',
                memberId: memberId,
                memberName: memberName,
                amount: amount,
                description: `${memberName} owes me ¥${centsToAmountString(amount)}`
            });
        } else if (amount < 0) {
            // I owe others money
            const owedAmount = Math.abs(amount);
            totalOwedByMe += owedAmount;
            settlementCount++;
            details.push({
                type: 'owed_by_me',
                memberId: memberId,
                memberName: memberName,
                amount: owedAmount,
                description: `I owe ${memberName} ¥${centsToAmountString(owedAmount)}`
            });
        }
    }

    return {
        totalOwedByMe,
        totalOwedToMe,
        settlementCount,
        details,
        netBalance: totalOwedToMe - totalOwedByMe,
        error: null,
        message: null
    };
}

/**
 * Get member name by ID
 * @param {number} memberId - Member ID
 * @returns {string} Member name
 */
function getMemberNameById(memberId) {
    const members = window.groupMembers || [];
    const member = members.find(m => {
        return m.user_id === memberId || 
               m.id === memberId || 
               (m.user && m.user.id === memberId);
    });
    
    if (member) {
        return member.user?.username || 
               member.username || 
               member.nickname || 
               member.name || 
               `User ${memberId}`;
    }
    
    return `User ${memberId}`;
}

/**
 * Update settlement summary display - Fixed Version
 * @param {Object} calculation - Calculation result
 */
export function updateSettlementSummary(calculation) {
    const summaryElement = document.getElementById('settlement-summary-text');
    if (!summaryElement) return;

    // Handle error case
    if (calculation.error) {
        summaryElement.textContent = 'Settlement unavailable';
        summaryElement.className = 'text-xl font-bold text-gray-500 mt-1';
        return;
    }

    // Normal case
    if (calculation.settlementCount === 0) {
        summaryElement.textContent = 'Nothing to settle';
        summaryElement.className = 'text-xl font-bold text-gray-500 mt-1';
    } else {
        summaryElement.textContent = `Total ${calculation.settlementCount} items to settle`;
        summaryElement.className = 'text-xl font-bold text-gray-900 mt-1';
    }
}

/**
 * Show settlement confirmation modal - Fixed Version
 * @param {Object} calculation - Calculation result
 */
export function showSettlementConfirmation(calculation) {
    // Handle error case
    if (calculation.error) {
        showCustomAlert('Notice', calculation.message || 'Settlement feature is temporarily unavailable, please try again later');
        return;
    }

    if (calculation.settlementCount === 0) {
        showCustomAlert('Notice', 'There are currently no items to settle');
        return;
    }

    // Create settlement details content
    let detailsHtml = '';
    calculation.details.forEach(detail => {
        if (detail.type === 'owed_by_me') {
            detailsHtml += `<li class="mb-2 text-sm">• ${detail.description}</li>`;
        }
    });

    const message = `
        <div class="text-left">
            <p class="mb-3 font-medium">You are about to settle the following items:</p>
            <ul class="mb-4">
                ${detailsHtml}
            </ul>
            <p class="text-lg font-bold text-red-600">
                Total payable: ¥${centsToAmountString(calculation.totalOwedByMe)}
            </p>
        </div>
    `;

    showCustomAlert('Confirm Settlement', message);
    
    // Add confirm button event
    const modal = document.getElementById('custom-alert-modal');
    if (modal) {
        // Remove old event listeners
        const newModal = modal.cloneNode(true);
        modal.parentNode.replaceChild(newModal, modal);
        
        // Add confirm button
        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'Confirm Settlement';
        confirmButton.className = 'mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition duration-150';
        confirmButton.onclick = () => {
            closeCustomAlert();
            executeSettlement();
        };
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'mt-4 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition duration-150 ml-2';
        cancelButton.onclick = () => closeCustomAlert();
        
        const messageElement = document.getElementById('alert-message');
        if (messageElement) {
            messageElement.innerHTML = message;
            messageElement.appendChild(confirmButton);
            messageElement.appendChild(cancelButton);
        }
    }
}

/**
 * Execute settlement operation - Fixed Version
 */
export async function executeSettlement() {
    if (!currentSettlementData || !currentSettlementData.group_id) {
        showCustomAlert('Error', 'Missing necessary parameters, cannot execute settlement');
        return;
    }

    try {
        showCustomAlert('Processing', 'Executing settlement, please wait...');
        
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication token not found');
        }

        console.log('Executing settlement operation:', currentSettlementData.group_id);
        
        // Use the correct settlement API endpoint
        const endpoint = `/groups/${currentSettlementData.group_id}/settlement`;
        console.log('Calling settlement API endpoint:', endpoint);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                group_id: currentSettlementData.group_id
            })
        });

        if (response.ok) {
            const responseData = await response.json();
            console.log('Settlement successful response:', responseData);
            showCustomAlert('Settlement Successful', 'Settlement operation completed successfully!');
            
            // Refresh page to update all data
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            return responseData;
        } else {
            let errorMessage = 'Settlement operation failed';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.detail || errorMessage;
            } catch (e) {
                errorMessage = `Server error (${response.status})`;
            }
            
            console.error('Settlement failed:', errorMessage);
            throw new Error(errorMessage);
        }
        
    } catch (error) {
        console.error('Settlement failed:', error);
        
        // Show different error messages based on error type
        if (error.message.includes('Authentication') || error.message.includes('token')) {
            showCustomAlert('Authentication Failed', 'Please log in again and retry');
        } else if (error.message.includes('Network')) {
            showCustomAlert('Network Error', 'Network connection failed, please check your connection and try again');
        } else {
            showCustomAlert('Settlement Failed', error.message || 'Settlement operation failed, please try again');
        }
    }
}

/**
 * Handle settle all debts - Main entry function
 */
export async function handleSettleUp() {
    try {
        console.log('Handling settle up all debts');
        
        // Get current group ID
        const currentGroupId = window.CURRENT_GROUP_ID || window.currentGroupId;
        if (!currentGroupId) {
            showCustomAlert('Error', 'Could not get current group info');
            return;
        }

        // Show loading state
        showCustomAlert('Processing', 'Calculating outstanding balances...');
        
        // Get settlement info
        const settlementData = await getSettlementInfo(currentGroupId);
        currentSettlementData = settlementData;
        
        // Calculate settlement amounts
        const calculation = calculateSettlementAmounts(settlementData);
        
        // Update display
        updateSettlementSummary(calculation);
        
        // Close loading modal
        closeCustomAlert();
        
        // Show confirmation modal
        showSettlementConfirmation(calculation);
        
    } catch (error) {
        console.error('Handle settle up failed:', error);
        showCustomAlert('Error', error.message || 'Failed to get settlement info');
    }
}

/**
 * Refresh settlement records list - Fixed Version
 */
export function refreshSettlementRecords() {
    try {
        const currentGroupId = window.CURRENT_GROUP_ID || window.currentGroupId;
        if (!currentGroupId) {
            console.warn('Cannot get current group ID');
            return;
        }

        // Get settlement info and refresh display
        getSettlementInfo(currentGroupId).then(settlementData => {
            currentSettlementData = settlementData;
            const calculation = calculateSettlementAmounts(settlementData);
            updateSettlementSummary(calculation);
        }).catch(error => {
            console.error('Failed to refresh settlement records:', error);
            // Show friendly error state
            const summaryElement = document.getElementById('settlement-summary-text');
            if (summaryElement) {
                summaryElement.textContent = 'Settlement unavailable';
                summaryElement.className = 'text-xl font-bold text-gray-500 mt-1';
            }
        });
        
    } catch (error) {
        console.error('Failed to refresh settlement records:', error);
    }
}

/**
 * Get settlement history - Fixed Version
 * @param {number} groupId - Group ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Settlement history
 */
export async function getSettlementHistory(groupId, page = 1, limit = 10) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication token not found');
        }

        console.log('Getting settlement history:', { groupId, page, limit });
        
        // Use the correct API endpoint
        const endpoint = `/groups/${groupId}/settlement/history?page=${page}&limit=${limit}`;
        console.log('Calling settlement history API endpoint:', endpoint);
        
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Settlement history:', data);
            return data;
        } else {
            console.error('Settlement history API call failed:', response.status);
            return { 
                records: [], 
                total: 0, 
                page: 1, 
                limit: limit, 
                error: `Failed to get history records (${response.status})`
            };
        }
        
    } catch (error) {
        console.error('Error getting settlement history:', error);
        return { 
            records: [], 
            total: 0, 
            page: 1, 
            limit: limit, 
            error: error.message 
        };
    }
}

/**
 * Show settlement history - Fixed Version
 * @param {Array} history - History records
 */
export function displaySettlementHistory(history) {
    const container = document.getElementById('settlement-history-container');
    if (!container) return;

    // Handle error case
    if (history.error) {
        container.innerHTML = `
            <div class="text-center p-6 text-gray-500">
                <i class="fa-solid fa-exclamation-triangle text-5xl text-gray-300 mb-3"></i>
                <p>Settlement history feature is temporarily unavailable</p>
                <p class="text-sm text-gray-400 mt-2">${history.error}</p>
            </div>
        `;
        return;
    }

    if (!history.records || history.records.length === 0) {
        container.innerHTML = `
            <div class="text-center p-6 text-gray-500">
                <i class="fa-solid fa-history text-5xl text-gray-300 mb-3"></i>
                <p>No settlement history found</p>
            </div>
        `;
        return;
    }

    container.innerHTML = history.records.map(record => `
        <div class="bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm">
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-medium text-gray-800">Settlement Record #${record.id}</h4>
                <span class="text-sm text-gray-500">${new Date(record.created_at).toLocaleString('en-US')}</span>
            </div>
            <p class="text-sm text-gray-600 mb-2">
                Group: ${record.group_name || 'Unknown Group'}
            </p>
            <p class="text-sm text-gray-600 mb-2">
                Settled Amount: ¥${centsToAmountString(record.amount)}
            </p>
            <p class="text-sm text-gray-600">
                Status: <span class="${record.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}">
                    ${record.status === 'completed' ? 'Completed' : 'Processing'}
                </span>
            </p>
        </div>
    `).join('');
}

// Initialize settlement module - Fixed Version
export function initializeSettlementModule() {
    console.log('Settlement module initialized');
    
    // Bind settlement button event (if exists)
    const settleUpButton = document.querySelector('button[onclick="handleSettleUp()"]');
    if (settleUpButton) {
        settleUpButton.addEventListener('click', handleSettleUp);
    }
    
    // Load current settlement status
    if (window.CURRENT_GROUP_ID || window.currentGroupId) {
        refreshSettlementRecords();
    }
}

// Expose all settlement-related functions to global window object
window.handleSettleUp = handleSettleUp;
window.handleSettleUpFromSettlement = handleSettleUp; // Alias for group_page.js
window.getSettlementInfo = getSettlementInfo;
window.calculateSettlementAmounts = calculateSettlementAmounts;
window.updateSettlementSummary = updateSettlementSummary;
window.showSettlementConfirmation = showSettlementConfirmation;
window.executeSettlement = executeSettlement;
window.refreshSettlementRecords = refreshSettlementRecords;
window.getSettlementHistory = getSettlementHistory;
window.displaySettlementHistory = displaySettlementHistory;
window.initializeSettlementModule = initializeSettlementModule;

console.log('Settlement module loaded, all functions exposed to global scope');