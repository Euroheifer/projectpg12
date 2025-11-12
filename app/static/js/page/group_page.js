// /static/js/page/groups.js
// Prevent caching version: 2025.11.10.005 - Fix Audit Log
const JS_CACHE_VERSION = '2025.11.10.005';

import {
//   getCurrentUser, // changed by sunzhe
    getGroupData,
    getGroupMembers,
    getGroupExpenses,
    getGroupPayments,
    getGroupRecurringExpenses
} from '../api/auth.js';

import {
    setupModalCloseHandlers,
    showCustomAlert,
    requireAdmin,
    getAuthToken //changed by sunzhe
} from '../ui/utils.js';

import {
    initializeExpenseForm,
    handleSaveExpense,
    refreshExpensesList,
    openExpenseDetail
} from '../api/expense.js';

import {
    initializePaymentForm,
    handleSavePayment,
    refreshPaymentsList,
    openPaymentDetail
} from '../api/payment.js';

import {
    renderMemberList,
    handleUpdateRole,
    handleRemoveMember,
    confirmUpdateRole,
    confirmRemoveMember,
    cancelUpdateRole,
    cancelRemoveMember,
    clearInviteForm,
    inviteNewMember
} from '../api/members.js';

import {
    initializeSettlementModule
} from '../api/settlement.js';

// --- Added: Function to get user info, adapted from home_page.js edit by sunzhe ---
async function fetchCurrentUser() {
    try {
        const token = getAuthToken(); // Ensure getAuthToken is imported from utils
        if (!token) {
            console.warn('Authentication token not found, cannot fetch user');
            return null;
        }

        console.log('Fetching user info from API (/me)...');
        const response = await fetch('/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const user = await response.json();
            console.log('User info from API (/me):', user);
            return user;
        } else {
            console.error('Failed to fetch user info, status code:', response.status);
            const errorText = await response.text();
            console.error('Error message:', errorText);
            return null;
        }
    } catch (error) {
        console.error('Failed to fetch user info:', error);
        return null;
    }
}

// --- Global State and Data ---
window.CURRENT_USER_ID = '';
window.CURRENT_USER_NAME = '';
window.IS_CURRENT_USER_ADMIN = false;
window.currentGroupId = null;
window.currentGroup = null;

// Data Lists
window.groupMembers = [];
window.expensesList = [];
window.paymentsList = [];
window.recurringExpensesList = [];

// Page State
let activeTab = 'expenses';



//--- Page Initialization ---
async function initializePage() {
    console.log('Starting group page initialization...');

    try {
        // 1. Verify user identity
        const user = await fetchCurrentUser(); //edit by sunzhe
        if (!user) {
            window.location.href = '/login';
            return;
        }

        window.CURRENT_USER_ID = user.id;
        window.CURRENT_USER_NAME = user.username;
       // document.getElementById('user-display').textContent = window.CURRENT_USER_NAME; // edit by sunzhe

        // 2. Get Group ID from URL path
        const pathParts = window.location.pathname.split('/');
        window.currentGroupId = pathParts[pathParts.length - 1];

        console.log('Group ID from URL:', window.currentGroupId);

        if (!window.currentGroupId || window.currentGroupId === 'groups') {
            showCustomAlert('Error', 'Group ID not found');
            setTimeout(() => window.location.href = '/home', 1500);
            return;
        }

        // 3. Load group data and permissions
        await loadGroupData();

        // --- Added: Immediately update group name display ---
        updateGroupNameDisplay();

        // 4. Render UI based on permissions
        renderUIByPermission();

        // 5. Bind events and initialize
        setupModalCloseHandlers();
        bindEvents();

        // 6. Load data lists
        await loadDataLists();

        // 7. Initialize settlement module - Enable settlement feature
        if (window.currentGroupId) {
            window.CURRENT_GROUP_ID = window.currentGroupId; // Unify variable name to uppercase
            initializeSettlementModule(); // Enable settlement module
        }

        console.log(`Group page initialization complete - Group: ${window.currentGroupId}, User: ${window.CURRENT_USER_NAME}, Permission: ${window.IS_CURRENT_USER_ADMIN ? 'Admin' : 'Member'}`);

    } catch (error) {
        console.error('Page initialization failed:', error);
        showCustomAlert('Error', 'Page initialization failed');
    }
}


async function loadGroupData() {
    try {
        console.log('Starting to load group data, Group ID:', window.currentGroupId);

        window.currentGroup = await getGroupData(window.currentGroupId);
        console.log('Fetched group data:', window.currentGroup);

        // Set admin permission (we can now rely on real data returned from auth.js)
        window.IS_CURRENT_USER_ADMIN =
            window.currentGroup.admin_id === window.CURRENT_USER_ID;

        console.log('Permission check result - User:', window.CURRENT_USER_ID, 'is admin:', window.IS_CURRENT_USER_ADMIN);

    } catch (error) {
        console.error('Failed to load group data:', error);

        // --- Fix: No longer call getMockGroupData ---
        // Use a safe fallback object that doesn't depend on other functions
        window.currentGroup = {
            id: window.currentGroupId,
            name: 'Loading Failed',
            description: error.message, // Show error in description
            admin_id: null
        };
        window.IS_CURRENT_USER_ADMIN = false;

        // Notify user of loading failure
        showCustomAlert('Failed to load group', error.message);
        // --- End Fix ---
    }
}

async function loadDataLists() {
    try {
        await Promise.all([
            loadExpensesList(),
            loadPaymentsList(),
            loadMembersList(),
            loadRecurringExpensesList()
        ]);
        // --- Added ---
        // 2. After all lists are loaded, update the counts on the tabs
        updateTabCounts();
        // --- End ---
    } catch (error) {
        console.error('Failed to load data lists:', error);
        showCustomAlert('Error', 'Failed to load data');
    }
}

async function loadExpensesList() {
    window.expensesList = await getGroupExpenses(window.currentGroupId);
    refreshExpensesList();
}

async function loadPaymentsList() {
    window.paymentsList = await getGroupPayments(window.currentGroupId);
    refreshPaymentsList();
}

async function loadMembersList() {
    window.groupMembers = await getGroupMembers(window.currentGroupId);
    // --- Fix Start ---
    // Add try...catch to capture rendering errors from renderMemberList
    try {
        renderMemberList();
        
        // If the recurring expense form has been initialized, update its member list
        if (window.updateRecurringFormMembers) {
            window.updateRecurringFormMembers();
        }
    } catch (error) {
        console.error('Failed to render member list (from members.js):', error);
        // Don't let the whole page crash even if rendering fails
        const container = document.getElementById('member-list-container');
        if (container) {
            container.innerHTML = '<p class="text-red-500 text-center">Error loading member list.</p>';
        }
    }
    // --- Fix End ---
}

async function loadRecurringExpensesList() {
    window.recurringExpensesList = await getGroupRecurringExpenses(window.currentGroupId);
    refreshRecurringList();
}

// --- UI Rendering Functions ---

/**
 * Added function: Render group summary info at the top (balance, settlement, etc.)
 * It depends on data in window.currentGroup
 */
function renderGroupSummary() {
    if (!window.currentGroup) {
        console.warn('renderGroupSummary: window.currentGroup is null, skipping render');
        return;
    }

    console.log('Rendering group summary info...', window.currentGroup);


    // --- 1. Get all HTML elements ---
    const owedAmountEl = document.getElementById('balance-owed');
    const owedContextEl = document.getElementById('balance-owed-context');

    const owingAmountEl = document.getElementById('balance-owing-me');
    const owingContextEl = document.getElementById('balance-owing-me-context');

    const settlementSummaryEl = document.getElementById('settlement-summary-text');

    // --- 2. Render "You Owe" card ---
    // Default value is 0.00
    const balanceOwed = window.currentGroup.user_balance_owed || 0;
    // Default context is an empty string
    const owedContext = window.currentGroup.user_balance_owed_context || '';

    if (owedAmountEl) {
        owedAmountEl.textContent = `$${Number(balanceOwed).toFixed(2)}`;
    }
    if (owedContextEl) {
        owedContextEl.textContent = owedContext;
    }

    // --- 3. Render "You are Owed" card ---
    // Default value is 0.00
    const balanceOwing = window.currentGroup.user_balance_owing || 0;
    // Default context is an empty string
    const owingContext = window.currentGroup.user_balance_owing_context || '';

    if (owingAmountEl) {
        owingAmountEl.textContent = `$${Number(balanceOwing).toFixed(2)}`;
    }
    if (owingContextEl) {
        owingContextEl.textContent = owingContext;
    }

    // --- 4. Render "Settlement Suggestion" card ---
    // Default value is "Nothing to settle"
    const summary = window.currentGroup.settlement_summary || 'Nothing to settle';

    if (settlementSummaryEl) {
        settlementSummaryEl.textContent = summary;
    }
}


// ----------------- until here sunzhe -----------------------//

function renderUIByPermission() {
    console.log('Rendering UI - User Permission:', window.IS_CURRENT_USER_ADMIN ? 'Admin' : 'Member');

// --- Modification Start ---

    // 1. Render group name (ID and Name) - Fixed version
    updateGroupNameDisplay();

    // 2. Render group summary (Balance and Settlement)
    renderGroupSummary();

    // 3. Set up admin badge (It will be appended to the group-name-display element)
    setupAdminBadge();

    // --- Modification End ---

    toggleAdminElements();
    // updateTabCounts();
    setupFeatureRestrictions();

    // Ensure the correct tab is displayed initially
    const initialTab = window.IS_CURRENT_USER_ADMIN ? 'expenses' : 'expenses';
    setActiveTab(initialTab);
}
// Set up admin badge - only call once when admin status is known
function setupAdminBadge() {
    if (window.IS_CURRENT_USER_ADMIN) {
        const groupNameDisplay = document.getElementById('group-name-display');
        if (groupNameDisplay) {
            // First, clear any existing badge
            const existingBadge = groupNameDisplay.querySelector('.admin-badge');
            if (existingBadge) {
                existingBadge.remove();
            }

            // Add new badge
            const adminBadge = document.createElement('span');
            adminBadge.className = 'admin-badge ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
            adminBadge.textContent = 'Admin';
            groupNameDisplay.appendChild(adminBadge);
            console.log('Admin badge added');
        }
    } else {
        // If not admin, ensure badge is removed
        const adminBadge = document.querySelector('.admin-badge');
        if (adminBadge) {
            adminBadge.remove();
        }
    }
}
function toggleAdminElements() {
    const adminTabs = ['manage', 'audit'];

    console.log('toggleAdminElements - Current permission:', window.IS_CURRENT_USER_ADMIN);

    if (window.IS_CURRENT_USER_ADMIN) {
        // Add admin class to body
        document.body.classList.add('is-admin');

        // Show admin tabs
        adminTabs.forEach(tab => {
            const tabElement = document.getElementById(`tab-${tab}`);
            if (tabElement) {
                tabElement.classList.remove('hidden');
                console.log(`Showing admin tab: ${tab}`);
            }
        });

    } else {
        // Remove admin class
        document.body.classList.remove('is-admin');

        // Hide admin tabs
        adminTabs.forEach(tab => {
            const tabElement = document.getElementById(`tab-${tab}`);
            const contentElement = document.getElementById(`tab-content-${tab}`);

            if (tabElement) {
                tabElement.classList.add('hidden');
                console.log(`Hiding admin tab: ${tab}`);
            }
            if (contentElement) {
                contentElement.classList.add('hidden');
            }
        });
    }
}


function updateGroupNameDisplay() {
    const groupNameDisplay = document.getElementById('group-name-display');
    if (!groupNameDisplay) {
        console.error('Could not find group name display element');
        return;
    }

    if (!window.currentGroup) {
        console.warn('window.currentGroup is null, cannot update group name');
        groupNameDisplay.innerHTML = 'Loading group data...';
        return;
    }

    // Try different name attributes - Fixed version
    const groupName = 
        window.currentGroup.name || 
        window.currentGroup.group_name || 
        window.currentGroup.display_name || 
        'Unnamed Group';

    const groupId = 
        window.currentGroup.id || 
        window.currentGroup.group_id || 
        window.currentGroupId || 
        'Unknown';

    // Safely update group name display
    groupNameDisplay.innerHTML = '';
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = groupName;
    
    const idSpan = document.createElement('span');
    idSpan.className = 'text-sm font-normal text-gray-500';
    idSpan.textContent = `(ID: ${groupId})`;
    
    groupNameDisplay.appendChild(nameSpan);
    groupNameDisplay.appendChild(idSpan);

    console.log('Successfully updated group name display:', {
        name: groupName,
        id: groupId,
        fullGroupData: window.currentGroup
    });
}

function updateTabCounts() {
    const expenseCount = document.getElementById('expense-count');
    const recurringCount = document.getElementById('recurring-count');
    const paymentCount = document.getElementById('payment-count');
    const memberCount = document.getElementById('member-count');
    const activeMemberCount = document.getElementById('active-member-count');

    if (expenseCount) expenseCount.textContent = window.expensesList.length;
    if (recurringCount) recurringCount.textContent = window.recurringExpensesList.length;
    if (paymentCount) paymentCount.textContent = window.paymentsList.length;
    if (memberCount) memberCount.textContent = window.groupMembers.length;
    if (activeMemberCount) activeMemberCount.textContent = window.groupMembers.length;
}

function setupFeatureRestrictions() {
    if (!window.IS_CURRENT_USER_ADMIN) {
        console.log('Restricting member features - current user is not admin');

        const detailInputs = document.querySelectorAll('#expense-detail-modal input, #expense-detail-modal select');
        detailInputs.forEach(input => {
            if (input.type !== 'submit') {
                input.classList.add('readonly-field');
                input.readOnly = true;
                input.disabled = true;
            }
        });

        const paymentInputs = document.querySelectorAll('#payment-detail-modal input, #payment-detail-modal select');
        paymentInputs.forEach(input => {
            if (input.type !== 'submit') {
                input.classList.add('readonly-field');
                input.readOnly = true;
                input.disabled = true;
            }
        });
    }
}

// --- Tab Switching Logic ---
function setActiveTab(tabName) {
    console.log('Switching to tab:', tabName, 'Permission:', window.IS_CURRENT_USER_ADMIN ? 'Admin' : 'Member');

    // Permission check - only restrict tabs that truly require admin permission
    const adminOnlyTabs = ['manage', 'audit'];
    if (adminOnlyTabs.includes(tabName) && !window.IS_CURRENT_USER_ADMIN) {
        showCustomAlert('Permission Denied', 'You do not have permission to access this page');
        return;
    }

    // If already on the current tab, do nothing
    if (activeTab === tabName) return;

    // Remove active state from all tabs
    const allTabs = document.querySelectorAll('[id^="tab-"]');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // Hide all content
    const allContents = document.querySelectorAll('[id^="tab-content-"]');
    allContents.forEach(content => {
        content.classList.add('hidden');
    });

    // Show current content and set active state
    const currentTab = document.getElementById(`tab-${tabName}`);
    const currentContent = document.getElementById(`tab-content-${tabName}`);

    if (currentTab) {
        currentTab.classList.add('active');
    }

    if (currentContent) {
        currentContent.classList.remove('hidden');
    }

    // Refresh data when switching to the corresponding tab
    switch (tabName) {
        case 'expenses':
            refreshExpensesList();
            break;
        case 'payments':
            refreshPaymentsList();
            break;
        case 'recurring':
            if (window.refreshRecurringList) {
                window.refreshRecurringList();
            }
            break;
        case 'members':
            renderMemberList();
            break;
        case 'invite':
            // Invite page needs no special handling
            break;
        case 'manage':
            // Manage page special handling
            populateGroupManagementFields();
            break;
        case 'audit':
            // Audit page special handling - Load audit logs
            if (window.loadAuditLogs) {
                // 🔴 Fix: call loadAuditLogs
                window.loadAuditLogs();
            }
            break;
    }

    activeTab = tabName;
    console.log('Successfully switched to tab:', tabName);
}

/**
 * Populate group management page fields - New function
 */
function populateGroupManagementFields() {
    if (!window.currentGroup) return;

    const groupNameInput = document.getElementById('group-name-input');
    const groupDescriptionInput = document.getElementById('group-description-input');

    if (groupNameInput) {
        groupNameInput.value = window.currentGroup.name || '';
    }

    if (groupDescriptionInput) {
        groupDescriptionInput.value = window.currentGroup.description || '';
    }
}

// --- Event Binding ---
function bindEvents() {
    const userDisplayButton = document.getElementById('user-display-button');
    if (userDisplayButton) {
        userDisplayButton.addEventListener('click', toggleUserMenu);
    }
	
	// --- add by sunzhe 03 Nov ---
    /* // Find the form within the "add expense" modal
    const addExpenseForm = document.getElementById('expense-form'); 
    if (addExpenseForm) {
        // Note: handleSaveExpense is imported from expense.js
        addExpenseForm.addEventListener('submit', handleSaveExpense); 
        console.log('Bound submit event to expense-form');
    } else {
        console.error('Could not find expense-form to bind event');
    } */
    // --- END OF ADDED SECTION ---
	
		// --- Fix duplicate binding: remove before binding ---
    const addExpenseForm = document.getElementById('expense-form'); 
    if (addExpenseForm) {
        // 1. Before binding a new event, remove any existing old events
        addExpenseForm.removeEventListener('submit', handleSaveExpense); 
        
        // 2. Bind the new event
        addExpenseForm.addEventListener('submit', handleSaveExpense); 
        console.log('Bound submit event to expense-form');
    } else {
        console.error('Could not find expense-form to bind event');
    }
	

    // Bind member menu close event
    document.addEventListener('click', function () {
        const allMenus = document.querySelectorAll('[id^="member-menu-"]');
        allMenus.forEach(menu => {
            menu.classList.add('hidden');
        });
    });

    console.log('Event binding complete');
}

// --- User Menu Logic ---
function toggleUserMenu() {
    const dropdown = document.getElementById('logout-dropdown');
    const caret = document.getElementById('caret-icon');

    if (!dropdown || !caret) return;

    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        caret.classList.add('rotate-180');
    } else {
        dropdown.classList.add('hidden');
        caret.classList.remove('rotate-180');
    }
}

// --- Page Navigation Logic ---
function handleBackToPreviousPage() {
    window.history.back();
}

function handleBackToDashboard() {
    window.location.href = '/home';
}

function handleMyProfile() {
    console.log('Navigate to My Profile');
    // TODO: Implement navigation logic to My Profile page
}

function handleLogoutUser() {
    console.log('Logging out');
    window.handleLogout();
    window.location.href = '/login';
}

// --- Other Functions ---
function refreshRecurringList() {
    // TODO: Implement recurring expense list refresh
    console.log('Refreshing recurring expense list');
    // 🔴 Fix: call function on window
    if (window.refreshRecurringList) {
        window.refreshRecurringList();
    }
}

// --- Modal Functions ---
window.handleAddNewExpense = function () {
    console.log('Show add expense modal');
	
	initializeExpenseForm(); // add by sunzhe 03 Nov
    const modal = document.getElementById('add-expense-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

// 🔴 [START] Fix
window.handleAddNewPayment = function () {
    console.log('Show add payment modal');
    
    // 🔴 Fix Bug 1: call initialization function
    // This function is defined in payment.js
    if (window.initializePaymentForm) {
        window.initializePaymentForm();
    } else {
        console.error('initializePaymentForm() function not found!');
        showCustomAlert('Error', 'Payment form failed to load, please refresh the page.');
    }
    
    const modal = document.getElementById('add-payment-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};
// 🔴 [END] Fix

window.handleAddNewRecurringExpense = function () {
    console.log('Show add recurring expense modal');
    
    // Fix: ensure recurring expense form is initialized
    if (window.initializeRecurringExpenseForm) {
        window.initializeRecurringExpenseForm();
    }
    
    const modal = document.getElementById('add-recurring-expense-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.handleSettleUp = function () {
    console.log('Settle all debts - calling real settlement function');
    // Call the real settlement function in the settlement module
    if (window.handleSettleUpFromSettlement) {
        window.handleSettleUpFromSettlement();
    } else {
        // If the settlement module is not loaded, display a friendly error message
        showCustomAlert('Settlement Feature', 'Settlement feature is loading, please try again later');
    }
};
// Add functions to close modals
window.handleRecurringCancel = function () {
    console.log('Close recurring expense modal');
    const modal = document.getElementById('add-recurring-expense-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.handleCancel = function () {
    console.log('Close expense modal');
    const modal = document.getElementById('add-expense-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.handlePaymentCancel = function () {
    console.log('Close payment modal');
    const modal = document.getElementById('add-payment-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};


// --- Global Exports ---
window.initializePage = initializePage;
window.setActiveTab = setActiveTab;
window.toggleUserMenu = toggleUserMenu;
window.handleBackToPreviousPage = handleBackToPreviousPage;
window.handleBackToDashboard = handleBackToDashboard;
window.handleMyProfile = handleMyProfile;
window.handleLogoutUser = handleLogoutUser;
window.loadExpensesList = loadExpensesList;

// Export data loading functions
window.loadMembersList = loadMembersList;

// Export other necessary functions
window.showCustomAlert = showCustomAlert;

// Export missing functions that are called in HTML
window.goBackToHome = function() {
    window.location.href = '/home';
};

window.resetGroupSettings = function() {
    populateGroupManagementFields();
};

window.saveGroupSettings = function() {
    // Fix: actually save group settings
    if (!window.IS_CURRENT_USER_ADMIN) {
        showCustomAlert('Error', 'Only administrators can modify group settings');
        return;
    }

    const groupNameInput = document.getElementById('group-name-input');
    const groupDescriptionInput = document.getElementById('group-description-input');

    if (!groupNameInput || !groupDescriptionInput) {
        showCustomAlert('Error', 'Could not find group settings form elements');
        return;
    }

    const groupName = groupNameInput.value.trim();
    const groupDescription = groupDescriptionInput.value.trim();

    if (!groupName) {
        showCustomAlert('Error', 'Group name cannot be empty');
        return;
    }

    // Actual API call to save settings
    saveGroupSettingsAPI(groupName, groupDescription);
};

window.closeCustomAlert = function() {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.closeDeleteConfirm = function() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

// confirmDeleteExpense function is correctly exposed globally from expense.js, no need to redefine

window.handleAmountChange = function() {
    // This function should be implemented in expense.js
    if (window.updateSplitDetails) {
        window.updateSplitDetails();
    }
};

window.updateFileNameDisplay = function(input) {
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileNameDisplay && input.files && input.files.length > 0) {
        fileNameDisplay.textContent = input.files[0].name;
    }
};

window.setSplitMethod = function(method) {
    // This function should be implemented in expense.js
    console.log('Setting split method to:', method);
    if (window.updateSplitMethod) {
        window.updateSplitMethod(method);
    }
};

window.updatePaymentFileNameDisplay = function(input) {
    const fileNameDisplay = document.getElementById('payment-file-name-display');
    if (fileNameDisplay && input.files && input.files.length > 0) {
        fileNameDisplay.textContent = input.files[0].name;
    }
};

window.handleDetailAmountChange = function() {
    // This function should be implemented in expense.js
    if (window.updateDetailSplitDetails) {
        window.updateDetailSplitDetails();
    }
};

window.setDetailSplitMethod = function(method) {
    // This function should be implemented in expense.js
    console.log('Setting detail split method to:', method);
    if (window.updateDetailSplitMethod) {
        window.updateDetailSplitMethod(method);
    }
};

// handleDeleteExpense function is correctly exposed globally from expense.js, no need to redefine

window.handleDetailCancel = function() {
    const modal = document.getElementById('expense-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

// Wrapper for recurring expense save event - avoid conflict with function in recurring_expense.js
window.saveRecurringExpenseHandler = function(event) {
    event.preventDefault();
    // Call the handleSaveRecurringExpense function exported from recurring_expense.js
    if (window.handleSaveRecurringExpense) {
        window.handleSaveRecurringExpense(event);
    } else {
        console.error('Recurring expense save function not loaded');
        showCustomAlert('Info', 'Recurring expense save feature is under development');
    }
};

// Placeholder for handleRecurringAmountChange - actual implementation is in recurring_expense.js
// This prevents errors if called before the module loads

// Placeholder for selectFrequency - actual implementation is in recurring_expense.js  
// This prevents errors if called before the module loads

// Placeholder functions - actual implementations are in recurring_expense.js
// These prevent errors if called before the module loads

window.setRecurringSplitMethod = function(method) {
    console.log('Setting recurring split method to:', method);
    // Call the truly exposed function to avoid infinite recursion
    if (typeof window.handleRecurringAmountChange === 'function') {
        // If recurring_expense.js is loaded, call its exposed function directly
        // Temporarily use console.log instead of the actual call to avoid infinite recursion
        console.log('Recurring split method would be called with:', method);
    } else {
        console.warn('setRecurringSplitMethod function not found');
    }
};

window.handleEnableRecurringExpense = function() {
    console.log('handleEnableRecurringExpense called');
    showCustomAlert('Info', 'Enable recurring expense feature is available in the module');
};

window.handleDeleteRecurringExpense = function() {
    console.log('handleDeleteRecurringExpense called');
    showCustomAlert('Info', 'Delete recurring expense feature is available in the module');
};

window.handleRecurringDetailCancel = function() {
    const modal = document.getElementById('recurring-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.handleEditRecurringExpense = function() {
    if (window.handleEditRecurringExpense) {
        window.handleEditRecurringExpense();
    } else {
        showCustomAlert('Info', 'Edit recurring expense feature is under development');
    }
};

window.updatePaymentDetailFileNameDisplay = function(input) {
    const fileNameDisplay = document.getElementById('payment-detail-file-name-display');
    if (fileNameDisplay && input.files && input.files.length > 0) {
        fileNameDisplay.textContent = input.files[0].name;
    }
};

window.handleDeletePayment = function() {
    // This function should be implemented in payment.js
    if (window.showDeletePaymentConfirm) {
        window.showDeletePaymentConfirm();
    }
};

window.handlePaymentDetailCancel = function() {
    const modal = document.getElementById('payment-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

// Additional missing functions
window.clearInviteForm = function() {
    if (window.clearInviteForm) {
        window.clearInviteForm();
    }
};

window.closeDeletePaymentConfirm = function() {
    if (window.closeDeletePaymentConfirm) {
        window.closeDeletePaymentConfirm();
    }
};

window.confirmDeletePayment = function() {
    // This function should be implemented in payment.js
    if (window.confirmDeletePaymentFromDetail) {
        window.confirmDeletePaymentFromDetail();
    }
};

window.handleDisableRecurringExpense = function() {
    if (window.handleDisableRecurringExpense) {
        window.handleDisableRecurringExpense();
    } else {
        showCustomAlert('Info', 'Disable recurring expense feature is under development');
    }
};

// 🔴 [START] Fix
// Fix "Save Payment" button
window.savePaymentHandler = function(event) {
    event.preventDefault();
    // Call the real handleSavePayment imported from payment.js
    if (window.handleSavePayment) {
        window.handleSavePayment(event);
    } else {
        console.error('Payment save function (handleSavePayment) not loaded');
        showCustomAlert('Error', 'Payment feature is not ready yet');
    }
};
// 🔴 [END] Fix

// Wrapper for expense update event - avoid conflict with function in expense.js
window.updateExpenseHandler = function(event) {
    event.preventDefault();
    // Call the handleUpdateExpense function exported from expense.js
    if (window.handleUpdateExpense) {
        window.handleUpdateExpense(event);
    } else {
        console.error('Expense update function not loaded');
        showCustomAlert('Error', 'Expense update feature is not ready yet');
    }
};

// 🔴 [START] Fix
// Fix "Update Payment" button
window.updatePaymentHandler = function(event) {
    event.preventDefault();
    // Call the real handleUpdatePayment imported from payment.js
    if (window.handleUpdatePayment) {
        window.handleUpdatePayment(event);
    } else {
        console.error('Payment update function (handleUpdatePayment) not loaded');
        showCustomAlert('Error', 'Payment feature is not ready yet');
    }
};
// 🔴 [END] Fix

/**
 * Save group settings API - New function
 */
async function saveGroupSettingsAPI(groupName, groupDescription) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication token not found');
        }

        const response = await fetch(`/groups/${window.currentGroupId}`, {
            method: 'PATCH', // Fix: use PATCH instead of PUT
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: groupName,
                description: groupDescription
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Group settings saved successfully:', result);
            
            // Update local data
            if (window.currentGroup) {
                window.currentGroup.name = groupName;
                window.currentGroup.description = groupDescription;
            }
            
            // Refresh display
            updateGroupNameDisplay();
            
            showCustomAlert('Success', 'Group settings have been saved');
        } else {
            const errorData = await response.json();
        throw new Error(errorData.detail ? (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)) : `HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Failed to save group settings:', error);
        showCustomAlert('Error', error.message || 'Failed to save group settings');
    }
}

// Ensure all global functions are correctly defined
function ensureGlobalFunctions() {
    console.log('Verifying that global functions are correctly exposed...');
    
    // Check for the existence of key functions
    const requiredFunctions = [
        'setActiveTab',
        'goBackToHome', 
        'initializePage',
        'showCustomAlert',
        'loadExpensesList',
        'loadMembersList'
    ];
    
    requiredFunctions.forEach(funcName => {
        if (typeof window[funcName] !== 'function') {
            console.error(`Global function ${funcName} is not defined!`);
        } else {
            console.log(`✓ ${funcName} is correctly defined`);
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM content loaded, starting group page initialization...');
    
    // Delay initialization to ensure other modules have loaded
    setTimeout(() => {
        try {
            initializePage();
            ensureGlobalFunctions();
        } catch (error) {
            console.error('An error occurred while initializing the group page:', error);
            showCustomAlert('Error', 'Page initialization failed, please refresh the page and try again', 'error');
        }
    }, 100);
});

// Also verify after the module has loaded
setTimeout(ensureGlobalFunctions, 1000);

// Immediately expose all functions to global - solve function not defined problem
(function exposeGlobalFunctions() {
    console.log('Immediately exposing global functions to the window object...');
    
    try {
        // Core feature functions
        window.initializePage = initializePage;
        window.setActiveTab = setActiveTab;
        window.toggleUserMenu = toggleUserMenu;
        window.handleBackToPreviousPage = handleBackToPreviousPage;
        window.handleBackToDashboard = handleBackToDashboard;
        window.handleMyProfile = handleMyProfile;
        window.handleLogoutUser = handleLogoutUser;
        window.loadExpensesList = loadExpensesList;
        window.loadMembersList = loadMembersList;
        window.showCustomAlert = showCustomAlert;
        
        // Functions called by HTML
        window.goBackToHome = function() {
            window.location.href = '/home';
        };
        
        window.resetGroupSettings = function() {
            populateGroupManagementFields();
        };
        
        console.log('✓ All global functions have been exposed');
    } catch (error) {
        console.error('An error occurred while exposing global functions:', error);
    }
})();

// ----------------------------------------------------
// 🔴 [START] Audit Log Fix
// ----------------------------------------------------

/**
 * (Fixed) Load audit logs
 */
window.loadAuditLogs = async function() {
    const container = document.getElementById('audit-log-content');
    if (!container) {
        console.error('Audit log container not found');
        return;
    }
    
    try {
        const token = getAuthToken();
        if (!token) {
            container.innerHTML = '<p class="text-center text-gray-500">User not logged in</p>';
            return;
        }
        
        const groupId = window.currentGroupId;
        if (!groupId) {
            container.innerHTML = '<p class="text-center text-gray-500">Could not determine the current group</p>';
            return;
        }
        
        // Show loading status
        container.innerHTML = '<div class="text-center text-gray-500">Loading audit logs...</div>';
        
        // 🔴 Fix: use the correct API route (from main.py)
        const response = await fetch(`/groups/${groupId}/audit-trail`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const logs = await response.json();
            
            if (!logs || logs.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500">No audit logs yet</p>';
                return;
            }
            
            // Render audit logs
            renderAuditLogs(logs); // 🔴 Fix: call the new rendering function
            
        } else {
            const errorData = await response.json();
            const errorMsg = errorData.detail || `HTTP ${response.status} error`;
            console.error('Failed to load audit logs:', errorMsg);
            container.innerHTML = `<p class="text-center text-red-500">Failed to load audit logs: ${errorMsg}</p>`;
        }
        
    } catch (error) {
        console.error('An error occurred while loading audit logs:', error);
        container.innerHTML = '<p class="text-center text-red-500">A network error occurred while loading audit logs</p>';
    }
}

/**
 * (Fixed) Render audit logs
 * @param {Array} logs - Array of logs obtained from the API
 */
function renderAuditLogs(logs) {
    const container = document.getElementById('audit-log-content');
    if (!container) return;

    const logsHTML = logs.map(log => {
        // 🔴 Fix 1: use log.timestamp (from schemas.py)
        const timestamp = new Date(log.timestamp).toLocaleString('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit'
        });

        // 🔴 Fix 2: use log.user.username (from schemas.py)
        const username = log.user?.username || `User ID: ${log.user_id}` || "Unknown user";
        
        const action = log.action || 'Unknown action';
        
        // 🔴 Fix 3: safely format log.details
        let detailsText = '';
        if (log.details) {
            try {
                // Use JSON.stringify to gracefully format [object Object]
                detailsText = JSON.stringify(log.details, null, 2);
            } catch (e) {
                detailsText = 'Unparseable details';
            }
        }
        
        return `
            <div class="p-3 bg-white rounded border border-gray-200 shadow-sm hover:shadow-md transition duration-150">
                <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-500">${timestamp}</p>
                        <p class="text-base font-medium text-gray-900 mt-1 truncate">
                            User <span class="font-bold text-primary">${username}</span> performed <span class="font-bold text-amber-600">${action}</span>
                        </p>
                        ${detailsText ? `
                            <details class="mt-2 text-xs text-gray-600">
                                <summary class="cursor-pointer hover:text-primary">View details</summary>
                                <pre class="mt-1 p-2 bg-gray-100 rounded overflow-auto">${escapeHtml(detailsText)}</pre>
                            </details>
                        ` : ''}
                    </div>
                    <div class="text-right flex-shrink-0 ml-2">
                        <span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            Audit Log
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = logsHTML;
}

/**
 * Helper function: escape HTML 
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    return text
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// ----------------------------------------------------
// 🔴 [END] Audit Log Fix
// ----------------------------------------------------