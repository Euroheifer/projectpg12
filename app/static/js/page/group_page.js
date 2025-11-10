// /static/js/page/groups.js
// 防止缓存版本: 2025.11.10.005 - 修复审计日志 (Audit Log)
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

        // 7. Initialize settlement module - 启用结算功能
        if (window.currentGroupId) {
            window.CURRENT_GROUP_ID = window.currentGroupId; // 统一变量名为大写
            initializeSettlementModule(); // 启用结算模块
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
        
        // 如果定期费用表单已初始化，更新其成员列表
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
        owedAmountEl.textContent = `¥${Number(balanceOwed).toFixed(2)}`;
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
        owingAmountEl.textContent = `¥${Number(balanceOwing).toFixed(2)}`;
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

    // 1. Render group name (ID and Name) - 修复版本
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

    // Try different name attributes - 修复版本
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

    // 安全地更新群组名称显示
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
                // 🔴 修复：调用 loadAuditLogs
                window.loadAuditLogs();
            }
            break;
    }

    activeTab = tabName;
    console.log('Successfully switched to tab:', tabName);
}

/**
 * 填充群组管理页面字段 - 新增函数
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
	
		// --- 修复重复绑定：在绑定之前先移除 ---
    const addExpenseForm = document.getElementById('expense-form'); 
    if (addExpenseForm) {
        // 1. 在绑定新事件之前，先移除可能存在的旧事件
        addExpenseForm.removeEventListener('submit', handleSaveExpense); 
        
        // 2. 绑定新的事件
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
    console.log('刷新定期费用列表');
    // 🔴 修复：调用 window 上的函数
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

// 🔴 [START] 修复
window.handleAddNewPayment = function () {
    console.log('Show add payment modal');
    
    // 🔴 修复 Bug 1: 调用初始化函数
    // 此函数在 payment.js 中定义
    if (window.initializePaymentForm) {
        window.initializePaymentForm();
    } else {
        console.error('initializePaymentForm() 函数未找到！');
        showCustomAlert('Error', '支付表单加载失败，请刷新页面。');
    }
    
    const modal = document.getElementById('add-payment-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};
// 🔴 [END] 修复

window.handleAddNewRecurringExpense = function () {
    console.log('Show add recurring expense modal');
    
    // 修复：确保初始化定期费用表单
    if (window.initializeRecurringExpenseForm) {
        window.initializeRecurringExpenseForm();
    }
    
    const modal = document.getElementById('add-recurring-expense-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.handleSettleUp = function () {
    console.log('Settle all debts - 调用真正的结算功能');
    // 调用结算模块中的真正结算功能
    if (window.handleSettleUpFromSettlement) {
        window.handleSettleUpFromSettlement();
    } else {
        // 如果结算模块未加载，显示友好的错误信息
        showCustomAlert('结算功能', '结算功能加载中，请稍后再试');
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
    // 修复：实际保存群组设置
    if (!window.IS_CURRENT_USER_ADMIN) {
        showCustomAlert('Error', '只有管理员可以修改群组设置');
        return;
    }

    const groupNameInput = document.getElementById('group-name-input');
    const groupDescriptionInput = document.getElementById('group-description-input');

    if (!groupNameInput || !groupDescriptionInput) {
        showCustomAlert('Error', '找不到群组设置表单元素');
        return;
    }

    const groupName = groupNameInput.value.trim();
    const groupDescription = groupDescriptionInput.value.trim();

    if (!groupName) {
        showCustomAlert('Error', '群组名称不能为空');
        return;
    }

    // 实际API调用保存设置
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

// confirmDeleteExpense函数已从expense.js正确暴露到全局，无需重复定义

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

// handleDeleteExpense函数已从expense.js正确暴露到全局，无需重复定义

window.handleDetailCancel = function() {
    const modal = document.getElementById('expense-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

// 定期费用保存事件的包装器 - 避免与recurring_expense.js中的函数冲突
window.saveRecurringExpenseHandler = function(event) {
    event.preventDefault();
    // 调用recurring_expense.js中导出的handleSaveRecurringExpense函数
    if (window.handleSaveRecurringExpense) {
        window.handleSaveRecurringExpense(event);
    } else {
        console.error('定期费用保存函数未加载');
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
    // 调用真正暴露的函数，避免无限递归
    if (typeof window.handleRecurringAmountChange === 'function') {
        // 如果recurring_expense.js已加载，直接调用其暴露的函数
        // 暂时使用console.log代替实际调用，避免无限递归
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

// 🔴 [START] 修复
// 修复“保存支付”按钮
window.savePaymentHandler = function(event) {
    event.preventDefault();
    // 调用 payment.js 中导入的真正的 handleSavePayment
    if (window.handleSavePayment) {
        window.handleSavePayment(event);
    } else {
        console.error('支付保存函数(handleSavePayment)未加载');
        showCustomAlert('Error', '支付功能暂未就绪');
    }
};
// 🔴 [END] 修复

// 费用更新事件的包装器 - 避免与expense.js中的函数冲突
window.updateExpenseHandler = function(event) {
    event.preventDefault();
    // 调用expense.js中导出的handleUpdateExpense函数
    if (window.handleUpdateExpense) {
        window.handleUpdateExpense(event);
    } else {
        console.error('费用更新函数未加载');
        showCustomAlert('Error', '费用更新功能暂未就绪');
    }
};

// 🔴 [START] 修复
// 修复“更新支付”按钮
window.updatePaymentHandler = function(event) {
    event.preventDefault();
    // 调用 payment.js 中导入的真正的 handleUpdatePayment
    if (window.handleUpdatePayment) {
        window.handleUpdatePayment(event);
    } else {
        console.error('支付更新函数(handleUpdatePayment)未加载');
        showCustomAlert('Error', '支付功能暂未就绪');
    }
};
// 🔴 [END] 修复

/**
 * 保存群组设置API - 新增函数
 */
async function saveGroupSettingsAPI(groupName, groupDescription) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('未找到认证令牌');
        }

        const response = await fetch(`/groups/${window.currentGroupId}`, {
            method: 'PATCH', // 修复：使用PATCH而不是PUT
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
            console.log('群组设置保存成功:', result);
            
            // 更新本地数据
            if (window.currentGroup) {
                window.currentGroup.name = groupName;
                window.currentGroup.description = groupDescription;
            }
            
            // 刷新显示
            updateGroupNameDisplay();
            
            showCustomAlert('Success', '群组设置已保存');
        } else {
            const errorData = await response.json();
        throw new Error(errorData.detail ? (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)) : `HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('保存群组设置失败:', error);
        showCustomAlert('Error', error.message || '保存群组设置失败');
    }
}

// 确保所有全局函数都被正确定义
function ensureGlobalFunctions() {
    console.log('验证全局函数是否正确暴露...');
    
    // 检查关键函数是否存在
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
            console.error(`全局函数 ${funcName} 未定义！`);
        } else {
            console.log(`✓ ${funcName} 已正确定义`);
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM content loaded, starting group page initialization...');
    
    // 延迟初始化，确保其他模块已加载
    setTimeout(() => {
        try {
            initializePage();
            ensureGlobalFunctions();
        } catch (error) {
            console.error('初始化群组页面时发生错误:', error);
            showCustomAlert('Error', '页面初始化失败，请刷新页面重试', 'error');
        }
    }, 100);
});

// 在模块加载完成后也验证一次
setTimeout(ensureGlobalFunctions, 1000);

// 立即暴露所有函数到全局 - 解决函数未定义问题
(function exposeGlobalFunctions() {
    console.log('立即暴露全局函数到window对象...');
    
    try {
        // 核心功能函数
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
        
        // HTML调用的函数
        window.goBackToHome = function() {
            window.location.href = '/home';
        };
        
        window.resetGroupSettings = function() {
            populateGroupManagementFields();
        };
        
        console.log('✓ 所有全局函数已暴露完成');
    } catch (error) {
        console.error('暴露全局函数时发生错误:', error);
    }
})();

// ----------------------------------------------------
// 🔴 [START] 审计日志 (AUDIT LOG) 修复
// ----------------------------------------------------

/**
 * (已修复) 加载审计日志
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
            container.innerHTML = '<p class="text-center text-gray-500">用户未登录</p>';
            return;
        }
        
        const groupId = window.currentGroupId;
        if (!groupId) {
            container.innerHTML = '<p class="text-center text-gray-500">无法确定当前群组</p>';
            return;
        }
        
        // 显示加载状态
        container.innerHTML = '<div class="text-center text-gray-500">正在加载审计日志...</div>';
        
        // 🔴 修复：使用正确的 API 路由 (来自 main.py)
        const response = await fetch(`/groups/${groupId}/audit-trail`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const logs = await response.json();
            
            if (!logs || logs.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500">暂无审计日志</p>';
                return;
            }
            
            // 渲染审计日志
            renderAuditLogs(logs); // 🔴 修复：调用新的渲染函数
            
        } else {
            const errorData = await response.json();
            const errorMsg = errorData.detail || `HTTP ${response.status} 错误`;
            console.error('加载审计日志失败:', errorMsg);
            container.innerHTML = `<p class="text-center text-red-500">加载审计日志失败: ${errorMsg}</p>`;
        }
        
    } catch (error) {
        console.error('加载审计日志时发生错误:', error);
        container.innerHTML = '<p class="text-center text-red-500">加载审计日志时发生网络错误</p>';
    }
}

/**
 * (已修复) 渲染审计日志
 * @param {Array} logs - 从 API 获取的日志数组
 */
function renderAuditLogs(logs) {
    const container = document.getElementById('audit-log-content');
    if (!container) return;

    const logsHTML = logs.map(log => {
        // 🔴 修复 1: 使用 log.timestamp (来自 schemas.py)
        const timestamp = new Date(log.timestamp).toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit'
        });

        // 🔴 修复 2: 使用 log.user.username (来自 schemas.py)
        const username = log.user?.username || `用户ID: ${log.user_id}` || "未知用户";
        
        const action = log.action || '未知操作';
        
        // 🔴 修复 3: 安全地格式化 log.details
        let detailsText = '';
        if (log.details) {
            try {
                // 使用 JSON.stringify 优雅地格式化 [object Object]
                detailsText = JSON.stringify(log.details, null, 2);
            } catch (e) {
                detailsText = '无法解析的详情';
            }
        }
        
        return `
            <div class="p-3 bg-white rounded border border-gray-200 shadow-sm hover:shadow-md transition duration-150">
                <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-500">${timestamp}</p>
                        <p class="text-base font-medium text-gray-900 mt-1 truncate">
                            用户 <span class="font-bold text-primary">${username}</span> 执行了 <span class="font-bold text-amber-600">${action}</span>
                        </p>
                        ${detailsText ? `
                            <details class="mt-2 text-xs text-gray-600">
                                <summary class="cursor-pointer hover:text-primary">查看详情</summary>
                                <pre class="mt-1 p-2 bg-gray-100 rounded overflow-auto">${escapeHtml(detailsText)}</pre>
                            </details>
                        ` : ''}
                    </div>
                    <div class="text-right flex-shrink-0 ml-2">
                        <span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            审计日志
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = logsHTML;
}

/**
 * 辅助函数：转义 HTML 
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
// 🔴 [END] 审计日志 (AUDIT LOG) 修复
// ----------------------------------------------------