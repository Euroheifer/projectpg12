// 文件: app/static/js/page/group_page.js
// (完整的新内容)

// 导入辅助函数
import { getAuthToken, centsToAmountString, customAlert, closeCustomAlert } from '../ui/utils.js';
import { getCurrentUser, handleLogout, clearAuthData } from '../api/auth.js';

// --- 全局状态和数据 (来自 Demo) ---
const CURRENT_USER_ID = 'user_self';
const CURRENT_USER_NAME = '张三 (管理员)';
const IS_CURRENT_USER_ADMIN = true;

let memberToRemove = null;
let memberToUpdateRole = null;

// Mock 成员列表
let groupMembers = [
    { id: 'user_self', name: CURRENT_USER_NAME, email: 'admin@example.com', isAdmin: true, balance: 0.00 },
    { id: 'user_2', name: '小明', email: 'xiaoming@example.com', isAdmin: false, balance: -15.50 },
    { id: 'user_3', name: '小红', email: 'xiaohong@example.com', isAdmin: true, balance: 30.00 },
    { id: 'user_4', name: '老王', email: 'laowang@example.com', isAdmin: false, balance: 0.00 }
];

// Mock 费用列表
let expensesList = [
    { 
        id: 'expense_1', 
        description: '周末聚餐费用', 
        amount: 225.00, 
        date: '2025-10-27', 
        payer: 'user_self',
        participants: ['user_self', 'user_2', 'user_3'],
        splitMethod: 'equal',
        splits: [
            { id: 'user_self', name: '您 (张三)', amount: '75.00' },
            { id: 'user_2', name: '小明', amount: '75.00' },
            { id: 'user_3', name: '小红', amount: '75.00' }
        ]
    },
    { 
        id: 'expense_2', 
        description: '机场交通费', 
        amount: 60.00, 
        date: '2025-10-26', 
        payer: 'user_2',
        participants: ['user_self', 'user_2', 'user_3'],
        splitMethod: 'equal',
        splits: [
            { id: 'user_self', name: '您 (张三)', amount: '20.00' },
            { id: 'user_2', name: '小明', amount: '20.00' },
            { id: 'user_3', name: '小红', amount: '20.00' }
        ]
    }
];

// Mock 支付列表
let paymentsList = [
    { 
        id: 'payment_1', 
        description: '还款给小明', 
        amount: 75.00, 
        date: '2025-10-28', 
        payer: 'user_self',
        payee: 'user_2',
        expenseId: 'expense_1',
        receipt: null
    },
    { 
        id: 'payment_2', 
        description: '结算交通费', 
        amount: 20.00, 
        date: '2025-10-27', 
        payer: 'user_self',
        payee: 'user_3',
        expenseId: 'expense_2',
        receipt: null
    }
];

// Mock 定期费用列表
let recurringExpensesList = [
    { 
        id: 'recurring_1', 
        description: '每月房租', 
        amount: 1500.00, 
        startDate: '2025-10-01',
        frequency: 'monthly',
        payer: 'user_self',
        participants: ['user_self', 'user_2', 'user_3'],
        splitMethod: 'equal',
        splits: [
            { id: 'user_self', name: '您 (张三)', amount: '500.00' },
            { id: 'user_2', name: '小明', amount: '500.00' },
            { id: 'user_3', name: '小红', amount: '500.00' }
        ],
        isActive: true
    },
   
];

// 费用相关状态
let selectedParticipants = new Set([CURRENT_USER_ID]);
let currentSplitMethod = 'equal';
let memberSplits = [];
let currentEditingExpense = null;
let detailSelectedParticipants = new Set();
let detailMemberSplits = [];
let detailSplitMethod = 'equal';

// 支付相关状态
let currentEditingPayment = null;

// 定期费用相关状态
let recurringExpenseState = {
    isRecurring: false,
    frequency: 'daily',
    startDate: '',
    endDate: '',
};
let recurringSelectedParticipants = new Set([CURRENT_USER_ID]);
let recurringSplitMethod = 'equal';
let recurringMemberSplits = [];
let currentEditingRecurringExpense = null;

// --- 工具函数 ---
function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// --- Tab 切换逻辑 ---
let activeTab = 'expenses';

function setActiveTab(tabName) {
    if (activeTab === tabName) return;

    const allTabs = ['expenses', 'recurring', 'payments', 'members', 'invite', 'manage', 'audit'];
    allTabs.forEach(tab => {
        const tabElement = document.getElementById(`tab-${tab}`);
        const contentElement = document.getElementById(`tab-content-${tab}`);
        
        if (tabElement) tabElement.classList.remove('active');
        if (contentElement) contentElement.classList.add('hidden');
    });

    const currentTab = document.getElementById(`tab-${tabName}`);
    const currentContent = document.getElementById(`tab-content-${tabName}`);
    
    if (currentTab) currentTab.classList.add('active');
    if (currentContent) currentContent.classList.remove('hidden');
    
    if (tabName === 'members') {
        renderMemberList();
    }
    else if (tabName === 'payments') {
        refreshPaymentsList();
    }
    else if (tabName === 'expenses') {
        refreshExpensesList();
    }
    else if (tabName === 'recurring') {
        refreshRecurringList();
    }
    else if (tabName === 'manage') {
        loadGroupSettings(); // 切换到管理标签时加载设置
    }
    
    activeTab = tabName;
}

// --- 群组管理逻辑 ---
function loadGroupSettings() {
    // 从全局状态或API获取当前群组信息
    const currentGroupName = document.getElementById('group-name-display').textContent.split(' (ID:')[0].trim();
    const currentDescription = "用于记录周末旅行相关费用"; // 这里可以从数据中获取
    
    document.getElementById('group-name-input').value = currentGroupName;
    document.getElementById('group-description-input').value = currentDescription;
}

function saveGroupSettings() {
    const newName = document.getElementById('group-name-input').value.trim();
    const newDescription = document.getElementById('group-description-input').value.trim();
    
    if (!newName) {
        customAlert('错误', '群组名称不能为空');
        return;
    }
    
    // 更新群组名称显示
    const groupNameDisplay = document.getElementById('group-name-display');
    const groupIdText = groupNameDisplay.innerHTML.match(/\(ID:.*\)/)?.[0] || '(ID: 1)';
    groupNameDisplay.innerHTML = `${newName} <span class="text-sm font-normal text-gray-500">${groupIdText}</span>`;
    
    // 这里可以添加API调用保存到后端
    
    customAlert('保存成功', '群组设置已更新');
}

function resetGroupSettings() {
    loadGroupSettings();
    customAlert('已重置', '设置已恢复为原始值');
}

// --- 成员管理逻辑 ---
function toggleMemberManagementMenu(event, memberId) {
    event.stopPropagation();
    document.querySelectorAll('.management-menu-active').forEach(menu => {
        if (menu.id !== `menu-${memberId}`) {
            menu.classList.remove('management-menu-active');
            menu.classList.add('hidden');
        }
    });

    const menu = document.getElementById(`menu-${memberId}`);
    if (menu) {
        menu.classList.toggle('hidden');
        menu.classList.toggle('management-menu-active');
    }
}

function renderMemberList() {
    const container = document.getElementById('member-list-container');
    const activeMemberCount = document.getElementById('active-member-count');
    const memberCount = document.getElementById('member-count');
    
    if (container) container.innerHTML = '';
    
    if (activeMemberCount) activeMemberCount.textContent = groupMembers.length;
    if (memberCount) memberCount.textContent = groupMembers.length;

    groupMembers.forEach(member => {
        const isAdmin = member.isAdmin;
        const isSelf = member.id === CURRENT_USER_ID;
        const displayName = member.name.replace(/\s*\(.*\)/, '').trim();

        let balanceText;
        let balanceColorClass;

        if (member.balance > 0.01) {
            balanceText = `应收 ¥${member.balance.toFixed(2)}`;
            balanceColorClass = 'text-success font-semibold';
        } else if (member.balance < -0.01) {
            balanceText = `欠款 ¥${Math.abs(member.balance).toFixed(2)}`;
            balanceColorClass = 'text-danger font-semibold';
        } else {
            balanceText = '已结算';
            balanceColorClass = 'text-gray-500';
        }

        const memberCard = document.createElement('div');
        memberCard.className = 'flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition duration-150';
        memberCard.innerHTML = `
            <div class="flex-shrink-0 w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center text-lg font-bold mr-4">
                ${displayName.charAt(0)}
            </div>
            <div class="flex-grow">
                <div class="flex items-center">
                    <p class="font-medium text-gray-800">${member.name}</p>
                    ${isAdmin ? '<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">管理员</span>' : ''}
                </div>
                <p class="text-xs text-gray-500">${member.email}</p>
            </div>
            <div class="text-right mr-4">
                <p class="text-sm ${balanceColorClass}">${balanceText}</p>
            </div>
            ${!isSelf ? `
            <div class="relative">
                <button data-member-id="${member.id}" class="member-menu-button p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition duration-150">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                </button>
                <div id="menu-${member.id}" class="hidden absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl py-1 z-10 border border-gray-100">
                    <button data-member-id="${member.id}" class="update-role-button w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition duration-150 flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        <span>${isAdmin ? '移除管理员' : '设为管理员'}</span>
                    </button>
                    <button data-member-id="${member.id}" class="remove-member-button w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition duration-150 flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        <span>移除成员</span>
                    </button>
                </div>
            </div>
            ` : ''}
        `;
        
        if (container) container.appendChild(memberCard);
    });

    // 重新绑定动态生成的按钮的事件
    document.querySelectorAll('.member-menu-button').forEach(button => {
        button.addEventListener('click', (e) => toggleMemberManagementMenu(e, button.dataset.memberId));
    });
    document.querySelectorAll('.update-role-button').forEach(button => {
        button.addEventListener('click', (e) => {
            handleUpdateRole(button.dataset.memberId);
            toggleMemberManagementMenu(e, button.dataset.memberId);
        });
    });
    document.querySelectorAll('.remove-member-button').forEach(button => {
        button.addEventListener('click', (e) => {
            handleRemoveMember(button.dataset.memberId);
            toggleMemberManagementMenu(e, button.dataset.memberId);
        });
    });
}

// --- 角色更新逻辑 ---
function handleUpdateRole(memberId) {
    memberToUpdateRole = groupMembers.find(m => m.id === memberId);
    if (!memberToUpdateRole) return;
    
    const modal = document.getElementById('role-update-modal');
    const messageElement = document.getElementById('role-update-message');
    
    if (messageElement) {
        const action = memberToUpdateRole.isAdmin ? '移除管理员' : '设为管理员';
        messageElement.textContent = `确定要将成员 "${memberToUpdateRole.name}" ${action} 吗？`;
    }
    
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function confirmUpdateRole() {
    if (!memberToUpdateRole) return;
    
    memberToUpdateRole.isAdmin = !memberToUpdateRole.isAdmin;
    
    renderMemberList();
    
    document.getElementById('role-update-modal').classList.add('hidden');
    
    const action = memberToUpdateRole.isAdmin ? '设为管理员' : '移除管理员';
    customAlert('成功', `已成功将 "${memberToUpdateRole.name}" ${action}`);
    
    memberToUpdateRole = null;
}

function cancelUpdateRole() {
    document.getElementById('role-update-modal').classList.add('hidden');
    memberToUpdateRole = null;
}

// --- 移除成员逻辑 ---
function handleRemoveMember(memberId) {
    memberToRemove = groupMembers.find(m => m.id === memberId);
    if (!memberToRemove) return;
    
    const modal = document.getElementById('remove-modal');
    const messageElement = document.getElementById('remove-message');
    
    if (messageElement) {
        messageElement.textContent = `确定要将成员 "${memberToRemove.name}" 从群组中移除吗？`;
    }
    
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function confirmRemoveMember() {
    if (!memberToRemove) return;
    
    groupMembers = groupMembers.filter(m => m.id !== memberToRemove.id);
    
    document.getElementById('member-count').textContent = groupMembers.length;
    
    renderMemberList();
    
    document.getElementById('remove-modal').classList.add('hidden');
    
    customAlert('成功', `已成功将 "${memberToRemove.name}" 从群组中移除`);
    
    memberToRemove = null;
}

function cancelRemoveMember() {
    document.getElementById('remove-modal').classList.add('hidden');
    memberToRemove = null;
}

// --- 邀请成员逻辑 ---
function inviteNewMember() {
    const emailInput = document.getElementById('invite-user-email-input');
    const loadingMessage = document.getElementById('invite-loading-message');
    const submitButton = document.getElementById('invite-submit-button');
    
    const email = emailInput.value.trim();
    
    if (!email) {
        customAlert('错误', '请输入要邀请的邮箱地址');
        return;
    }
    
    if (!isValidEmail(email)) {
        customAlert('错误', '请输入有效的邮箱地址');
        return;
    }
    
    const isAlreadyMember = groupMembers.some(member => member.email.toLowerCase() === email.toLowerCase());
    if (isAlreadyMember) {
        customAlert('错误', '该邮箱地址已经是群组成员');
        return;
    }
    
    loadingMessage.classList.remove('hidden');
    submitButton.disabled = true;
    
    setTimeout(() => {
        loadingMessage.classList.add('hidden');
        submitButton.disabled = false;
        
        customAlert('成功', `邀请已发送至 ${email}`);
        
        emailInput.value = '';
    }, 1500);
}

function clearInviteForm() {
    document.getElementById('invite-user-email-input').value = '';
}

// --- 费用列表功能 ---
function refreshExpensesList() {
    const expensesListContainer = document.getElementById('expenses-list');
    const expenseCountElement = document.getElementById('expense-count');
    
    if (!expensesListContainer) return;
    
    if (expenseCountElement) {
        expenseCountElement.textContent = expensesList.length;
    }
    
    expensesListContainer.innerHTML = '';
    
    expensesList.forEach(expense => {
        const isOwnExpense = expense.payer === CURRENT_USER_ID;
        
        const expenseItem = document.createElement('div');
        expenseItem.className = `expense-item flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition duration-150 cursor-pointer ${isOwnExpense ? 'border-l-4 border-l-primary' : ''}`;
        expenseItem.setAttribute('data-expense-id', expense.id); // 绑定ID
        
        const payerName = groupMembers.find(m => m.id === expense.payer)?.name || expense.payer;
        
        expenseItem.innerHTML = `
            <div class="flex-shrink-0 w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center text-lg font-bold mr-4">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5h6"></path>
                </svg>
            </div>
            <div class="flex-grow">
                <p class="font-medium text-gray-800 truncate">${expense.description}</p>
                <p class="text-xs text-gray-500">日期: ${expense.date} | 付款人: ${payerName}</p>
            </div>
            <div class="text-right">
                <p class="text-sm font-semibold text-danger">$${expense.amount.toFixed(2)}</p>
                <p class="text-xs text-gray-500">${isOwnExpense ? '您创建的' : '其他成员创建'}</p>
            </div>
        `;
        
        expensesListContainer.appendChild(expenseItem);
    });

    // 动态绑定点击事件
    document.querySelectorAll('.expense-item[data-expense-id]').forEach(item => {
        item.addEventListener('click', () => viewExpenseDetail(item.dataset.expenseId));
    });
}

// --- 定期费用列表功能 ---
function refreshRecurringList() {
    const recurringListContainer = document.getElementById('recurring-list');
    const recurringCountElement = document.getElementById('recurring-count');
    
    if (!recurringListContainer) return;
    
    if (recurringCountElement) {
        recurringCountElement.textContent = recurringExpensesList.length;
    }
    
    recurringListContainer.innerHTML = '';
    
    recurringExpensesList.forEach(expense => {
        const isOwnExpense = expense.payer === CURRENT_USER_ID;
        const frequencyText = getFrequencyDisplayName(expense.frequency);
        const statusText = expense.isActive ? '启用' : '禁用';
        const statusClass = expense.isActive ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-800';
        
        const expenseItem = document.createElement('div');
        expenseItem.className = `expense-item flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition duration-150 cursor-pointer ${isOwnExpense ? 'border-l-4 border-l-warning' : ''}`;
        expenseItem.setAttribute('data-recurring-id', expense.id); // 绑定ID
        
        const payerName = groupMembers.find(m => m.id === expense.payer)?.name || expense.payer;
        
        expenseItem.innerHTML = `
            <div class="flex-shrink-0 w-10 h-10 bg-warning/10 text-warning rounded-full flex items-center justify-center text-lg font-bold mr-4">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </div>
            <div class="flex-grow">
                <p class="font-medium text-gray-800 truncate">${expense.description}</p>
                <p class="text-xs text-gray-500">频率: ${frequencyText} | 付款人: ${payerName}</p>
                <div class="mt-2 flex items-center space-x-2">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                        ${statusText}
                    </span>
                </div>
            </div>
            <div class="text-right">
                <p class="text-sm font-semibold text-warning">$${expense.amount.toFixed(2)}</p>
                <p class="text-xs text-gray-500">${isOwnExpense ? '您创建的' : '其他成员创建'}</p>
            </div>
        `;
        
        recurringListContainer.appendChild(expenseItem);
    });

    // 动态绑定点击事件
    document.querySelectorAll('.expense-item[data-recurring-id]').forEach(item => {
        item.addEventListener('click', () => viewRecurringDetail(item.dataset.recurringId));
    });
}

function viewRecurringDetail(expenseId) {
    const expense = recurringExpensesList.find(e => e.id === expenseId);
    if (!expense) {
        customAlert('错误', '未找到定期费用信息');
        return;
    }
    
    currentEditingRecurringExpense = expense;
    
    const modal = document.getElementById('recurring-detail-modal');
    if (modal) {
        modal.classList.remove('hidden');
        initializeRecurringDetailForm(expense);
    }
}

function initializeRecurringDetailForm(expense) {
    document.getElementById('recurring-detail-description').textContent = expense.description;
    document.getElementById('recurring-detail-amount').textContent = `$${expense.amount.toFixed(2)}`;
    document.getElementById('recurring-detail-payer').textContent = groupMembers.find(m => m.id === expense.payer)?.name || expense.payer;
    document.getElementById('recurring-detail-frequency').textContent = getFrequencyDisplayName(expense.frequency);
    document.getElementById('recurring-detail-start-date').textContent = expense.startDate;
    
    if (expense.endDate) {
        document.getElementById('recurring-detail-end-date').textContent = expense.endDate;
        document.getElementById('recurring-detail-end-date-container').classList.remove('hidden');
    } else {
        document.getElementById('recurring-detail-end-date-container').classList.add('hidden');
    }
    
    // 设置状态
    const statusElement = document.getElementById('recurring-detail-status');
    const disableBtn = document.getElementById('disable-recurring-btn');
    const enableBtn = document.getElementById('enable-recurring-btn');
    
    if (expense.isActive) {
        statusElement.textContent = '启用';
        statusElement.className = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success';
        disableBtn.classList.remove('hidden');
        enableBtn.classList.add('hidden');
    } else {
        statusElement.textContent = '禁用';
        statusElement.className = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
        disableBtn.classList.add('hidden');
        enableBtn.classList.remove('hidden');
    }
    
    // 设置参与者
    const participantsContainer = document.getElementById('recurring-detail-participants-container');
    participantsContainer.innerHTML = '';
    
    groupMembers.forEach(member => {
        const isParticipant = expense.participants.includes(member.id);
        if (isParticipant) {
            const participantElement = document.createElement('div');
            participantElement.className = 'flex items-center space-x-3 p-2 bg-white rounded border border-gray-200';
            participantElement.innerHTML = `
                <div class="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full font-bold text-sm">
                    ${member.name[0]}
                </div>
                <span class="text-sm font-medium text-gray-700">
                    ${member.name}
                    ${member.id === CURRENT_USER_ID ? ' (您)' : ''}
                </span>
            `;
            participantsContainer.appendChild(participantElement);
        }
    });
    
    // 设置分摊方式
    document.getElementById('recurring-detail-split-method').textContent = getSplitMethodName(expense.splitMethod);
    
    // 设置分摊详情
    const splitList = document.getElementById('recurring-detail-split-list');
    splitList.innerHTML = '';
    
    expense.splits.forEach(split => {
        const listItem = document.createElement('div');
        listItem.className = 'flex justify-between items-center py-1';
        listItem.innerHTML = `
            <span>${split.name}</span>
            <span class="font-medium text-gray-900">$ ${split.amount}</span>
        `;
        splitList.appendChild(listItem);
    });
}

function handleDisableRecurringExpense() {
    if (!currentEditingRecurringExpense) return;
    
    currentEditingRecurringExpense.isActive = false;
    refreshRecurringList();
    initializeRecurringDetailForm(currentEditingRecurringExpense);
    customAlert('成功', `定期费用 "${currentEditingRecurringExpense.description}" 已禁用`);
}

function handleEnableRecurringExpense() {
    if (!currentEditingRecurringExpense) return;
    
    currentEditingRecurringExpense.isActive = true;
    refreshRecurringList();
    initializeRecurringDetailForm(currentEditingRecurringExpense);
    customAlert('成功', `定期费用 "${currentEditingRecurringExpense.description}" 已启用`);
}

function handleDeleteRecurringExpense() {
    if (!currentEditingRecurringExpense) {
        customAlert('错误', '未找到要删除的定期费用');
        return;
    }
    
    showDeleteRecurringConfirm(currentEditingRecurringExpense.description);
}

function handleEditRecurringExpense() {
    if (!currentEditingRecurringExpense) {
        customAlert('错误', '未找到要编辑的定期费用');
        return;
    }
    
    // 这里可以添加编辑定期费用的逻辑
    customAlert('提示', '定期费用编辑功能待实现');
}

function handleRecurringDetailCancel() {
    const modal = document.getElementById('recurring-detail-modal');
    if (modal) modal.classList.add('hidden');
    currentEditingRecurringExpense = null;
}

function getFrequencyDisplayName(frequency) {
    const names = {
        'daily': '每日',
        'weekly': '每周',
        'monthly': '每月',
        'yearly': '每年'
    };
    return names[frequency] || frequency;
}

// --- 支付列表功能 ---
function refreshPaymentsList() {
    const paymentsListContainer = document.getElementById('payments-list');
    const paymentCountElement = document.getElementById('payment-count');
    
    if (!paymentsListContainer) return;
    
    if (paymentCountElement) {
        paymentCountElement.textContent = paymentsList.length;
    }
    
    paymentsListContainer.innerHTML = '';
    
    paymentsList.forEach(payment => {
        const isOwnPayment = payment.payer === CURRENT_USER_ID;
        
        const paymentItem = document.createElement('div');
        paymentItem.className = `expense-item flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition duration-150 cursor-pointer ${isOwnPayment ? 'border-l-4 border-l-success' : ''}`;
        paymentItem.setAttribute('data-payment-id', payment.id); // 绑定ID
        
        const payerName = groupMembers.find(m => m.id === payment.payer)?.name || payment.payer;
        const payeeName = groupMembers.find(m => m.id === payment.payee)?.name || payment.payee;
        const expenseDescription = expensesList.find(e => e.id === payment.expenseId)?.description || '未知费用';
        
        paymentItem.innerHTML = `
            <div class="flex-shrink-0 w-10 h-10 bg-success/10 text-success rounded-full flex items-center justify-center text-lg font-bold mr-4">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
            </div>
            <div class="flex-grow">
                <p class="font-medium text-gray-800 truncate">${payment.description}</p>
                <p class="text-xs text-gray-500">日期: ${payment.date} | 付款人: ${payerName} → 收款人: ${payeeName}</p>
                <p class="text-xs text-gray-500">费用: ${expenseDescription}</p>
            </div>
            <div class="text-right">
                <p class="text-sm font-semibold text-success">$${payment.amount.toFixed(2)}</p>
                <p class="text-xs text-gray-500">${isOwnPayment ? '您创建的' : '其他成员创建'}</p>
            </div>
        `;
        
        paymentsListContainer.appendChild(paymentItem);
    });

    // 动态绑定点击事件
    document.querySelectorAll('.expense-item[data-payment-id]').forEach(item => {
        item.addEventListener('click', () => viewPaymentDetail(item.dataset.paymentId));
    });
}
// --- 定期费用表单功能 ---
function handleAddNewRecurringExpense() {
    const modal = document.getElementById('add-recurring-expense-modal');
    if (modal) {
        modal.classList.remove('hidden');
        initializeRecurringExpenseForm();
    }
}

function initializeRecurringExpenseForm() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('repeat-start');
    const amountInput = document.getElementById('recurring-amount');
    
    if (dateInput) dateInput.value = today;
    if (amountInput) amountInput.value = '';
    
    const payerSelect = document.getElementById('recurring-payer');
    if (payerSelect) {
        payerSelect.innerHTML = '<option value="">请选择付款人</option>';
        groupMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            payerSelect.appendChild(option);
        });
    }
    
    recurringSelectedParticipants = new Set([CURRENT_USER_ID]);
    renderRecurringParticipantSelection();
    
    setRecurringSplitMethod('equal', false);
    initializeRecurringSplits(0);
    updateRecurringSplitDetails();
    
    // 初始化定期费用设置
    initializeRecurringSettings();
}

function renderRecurringParticipantSelection() {
    const container = document.querySelector('#recurring-participants-section .grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    groupMembers.forEach(member => {
        const isChecked = recurringSelectedParticipants.has(member.id);
        
        const checkbox = document.createElement('div');
        checkbox.className = 'flex items-center space-x-3 p-2 bg-white rounded border border-gray-200 hover:bg-gray-50 transition duration-150';
        checkbox.innerHTML = `
            <input type="checkbox" id="recurring-participant-${member.id}" 
                   ${isChecked ? 'checked' : ''}
                   data-member-id="${member.id}"
                   class="recurring-participant-checkbox participant-checkbox h-4 w-4 text-warning focus:ring-warning border-gray-300 rounded">
            <label for="recurring-participant-${member.id}" class="flex items-center space-x-2 flex-1 cursor-pointer">
                <div class="w-8 h-8 flex items-center justify-center bg-warning/10 text-warning rounded-full font-bold text-sm">
                    ${member.name[0]}
                </div>
                <span class="text-sm font-medium text-gray-700">
                    ${member.name}
                    ${member.id === CURRENT_USER_ID ? ' (您)' : ''}
                </span>
            </label>
        `;
        
        container.appendChild(checkbox);
    });
}

function handleRecurringParticipantChange(memberId, isChecked) {
    if (isChecked) {
        recurringSelectedParticipants.add(memberId);
    } else {
        recurringSelectedParticipants.delete(memberId);
    }
    
    const amount = parseFloat(document.getElementById('recurring-amount').value) || 0;
    initializeRecurringSplits(amount);
    updateRecurringSplitDetails();
}

function initializeRecurringSplits(amount) {
    const activeMembers = groupMembers.filter(m => recurringSelectedParticipants.has(m.id));
    const memberCount = activeMembers.length;
    
    if (memberCount === 0) {
        recurringMemberSplits = [];
        return;
    }
    
    const equalSplit = (amount / memberCount);
    let totalAllocated = 0;

    const existingSplitsValid = recurringSplitMethod === 'exact' && recurringMemberSplits.length === memberCount;
    
    recurringMemberSplits = activeMembers.map((member, index) => {
        let splitAmount;

        if (existingSplitsValid) {
            const oldSplit = recurringMemberSplits.find(s => s.id === member.id);
            splitAmount = parseFloat(oldSplit?.amount || '0.00');
        } else {
            let calculatedSplit = Math.floor(equalSplit * 100) / 100;
            
            if (index === memberCount - 1) {
                calculatedSplit = amount - totalAllocated;
            } else {
                totalAllocated += calculatedSplit;
            }
            splitAmount = calculatedSplit;
        }

        const displayName = member.name.replace(/\s*\(.*\)/, '').trim();

        return {
            id: member.id,
            name: member.id === CURRENT_USER_ID ? `您 (${displayName})` : displayName,
            amount: splitAmount.toFixed(2),
        };
    });
}

function setRecurringSplitMethod(method, triggerUpdate = true) {
    recurringSplitMethod = method;
    const methods = ['equal', 'exact'];
    
    methods.forEach(m => {
        const btn = document.getElementById(`recurring-split-${m}`);
        if (btn) {
            if (m === method) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
    
    if (triggerUpdate) {
        const amountInput = document.getElementById('recurring-amount');
        const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
        initializeRecurringSplits(amount);
        updateRecurringSplitDetails();
    }
}

function handleRecurringSplitInputChange(memberId, value) {
    const index = recurringMemberSplits.findIndex(s => s.id === memberId);
    if (index !== -1) {
        recurringMemberSplits[index].amount = parseFloat(value).toFixed(2);
    }
    updateRecurringSplitSummary();
}

function handleRecurringAmountChange() {
    const amountInput = document.getElementById('recurring-amount');
    const newAmount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    initializeRecurringSplits(newAmount);
    updateRecurringSplitDetails();
    updateRecurringPreview();
}

function updateRecurringSplitDetails() {
    const splitList = document.getElementById('recurring-split-list');
    const amountInput = document.getElementById('recurring-amount');
    const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    
    if (!splitList) return;
    
    splitList.innerHTML = '';
    
    const sectionTitle = document.querySelector('#recurring-split-details-section h4');
    if (sectionTitle) {
        sectionTitle.textContent = `分摊详情 (${getSplitMethodName(recurringSplitMethod)})`;
    }

    if (recurringSplitMethod === 'equal') {
        initializeRecurringSplits(amount);

        recurringMemberSplits.forEach(split => {
            const listItem = document.createElement('div');
            listItem.className = 'flex justify-between items-center py-1';
            listItem.innerHTML = `
                <span>${split.name}</span>
                <span class="font-medium text-gray-900">$ ${split.amount}</span>
            `;
            splitList.appendChild(listItem);
        });

    } else {
        recurringMemberSplits.forEach(split => {
            const listItem = document.createElement('div');
            listItem.className = 'flex justify-between items-center py-1';
            
            listItem.innerHTML = `
                <label for="recurring-split-${split.id}" class="w-1/3 text-gray-700">${split.name}</label>
                <div class="relative w-2/3">
                    <input type="number" id="recurring-split-${split.id}" 
                           value="${split.amount}"
                           min="0" step="0.01" required
                           data-member-id="${split.id}"
                           class="recurring-split-input block w-full pr-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-warning focus:border-warning sm:text-sm"
                           placeholder="0.00">
                    <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span class="text-gray-500 sm:text-sm">$</span>
                    </div>
                </div>
            `;
            splitList.appendChild(listItem);
        });
    }
    updateRecurringSplitSummary();
}

function updateRecurringSplitSummary() {
    const summaryDiv = document.getElementById('recurring-split-summary');
    const amountInput = document.getElementById('recurring-amount');
    const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    
    if (!summaryDiv) return;
    
    let totalSplit = 0;
    let isBalanced = true;

    totalSplit = recurringMemberSplits.reduce((sum, split) => sum + parseFloat(split.amount), 0);
    isBalanced = Math.abs(totalSplit - amount) < 0.01;
    
    const remaining = (amount - totalSplit).toFixed(2);
    
    summaryDiv.innerHTML = `
        <p class="text-sm flex justify-between">
            <span class="font-medium text-gray-700">总分摊金额:</span>
            <span class="font-bold ${isBalanced ? 'text-balance' : 'text-unbalanced'}">$ ${totalSplit.toFixed(2)}</span>
        </p>
        <p class="text-sm flex justify-between mt-1">
            <span class="font-medium text-gray-700">待分摊金额:</span>
            <span class="font-bold ${isBalanced ? 'text-balance' : 'text-unbalanced'}">$ ${remaining}</span>
        </p>
        ${!isBalanced ? `<p class="text-xs text-unbalanced mt-1">**警告:** 分摊总额 $${totalSplit.toFixed(2)} 与费用总额 $${amount.toFixed(2)} 不匹配。</p>` : ''}
    `;

    const submitButton = document.querySelector('#add-recurring-expense-modal button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = !isBalanced;
        submitButton.classList.toggle('opacity-50', !isBalanced);
        submitButton.classList.toggle('cursor-not-allowed', !isBalanced);
    }
}

function handleSaveRecurringExpense(event) {
    event.preventDefault();
    
    const amountInput = document.getElementById('recurring-amount');
    const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    
    let totalSplit = recurringMemberSplits.reduce((sum, split) => sum + parseFloat(split.amount), 0);
    if (Math.abs(totalSplit - amount) > 0.01) {
        customAlert('提交失败', '分摊总额与费用总额不匹配，请调整分摊详情。');
        return;
    }
    
    const form = document.getElementById('recurring-expense-form');
    const data = {
        'recurring-description': document.getElementById('recurring-description').value,
        'recurring-amount': document.getElementById('recurring-amount').value,
        'recurring-payer': document.getElementById('recurring-payer').value,
        'repeat-start': document.getElementById('repeat-start').value,
        'repeat-end': document.getElementById('repeat-end').value,
    };
    
    const newRecurringExpense = {
        id: 'recurring_' + Date.now(),
        description: data['recurring-description'],
        amount: parseFloat(data['recurring-amount']),
        startDate: data['repeat-start'],
        endDate: data['repeat-end'] || null,
        frequency: recurringExpenseState.frequency,
        payer: data['recurring-payer'],
        participants: Array.from(recurringSelectedParticipants),
        splitMethod: recurringSplitMethod,
        splits: [...recurringMemberSplits],
        isActive: true
    };
    
    recurringExpensesList.unshift(newRecurringExpense);
    customAlert('成功', `定期费用 "${data['recurring-description']}" 已成功创建`);

    const modal = document.getElementById('add-recurring-expense-modal');
    if (modal) modal.classList.add('hidden');
    
    refreshRecurringList();
}

function handleRecurringCancel() {
    const modal = document.getElementById('add-recurring-expense-modal');
    if (modal) modal.classList.add('hidden');
}

// --- 定期费用功能 ---
function selectFrequency(frequency) {
    recurringExpenseState.frequency = frequency;
    
    // 更新UI选中状态
    document.querySelectorAll('.frequency-option').forEach(option => {
        option.classList.remove('selected');
        if(option.dataset.frequency === frequency) {
            option.classList.add('selected');
        }
    });
    
    updateRecurringPreview();
}

function updateRecurringPreview() {
    const amount = parseFloat(document.getElementById('recurring-amount').value) || 0;
    const initialDate = document.getElementById('repeat-start').value;
    const previewList = document.getElementById('preview-list');
    const previewSummary = document.getElementById('preview-summary');
    
    if (!initialDate) {
        previewList.innerHTML = `
            <div class="preview-item p-3 rounded">
                <div class="flex justify-between items-center">
                    <span class="font-medium">初始费用</span>
                    <span class="text-sm text-gray-600">${initialDate || '选择日期'}</span>
                </div>
                <div class="text-xs text-gray-500 mt-1">金额: $${amount.toFixed(2)}</div>
            </div>
        `;
        previewSummary.textContent = '共 1 笔费用';
        return;
    }
    
    const previews = generateRecurringPreviews(initialDate, amount);
    previewList.innerHTML = previews.map(preview => `
        <div class="preview-item p-3 rounded">
            <div class="flex justify-between items-center">
                <span class="font-medium">${preview.title}</span>
                <span class="text-sm text-gray-600">${preview.date}</span>
            </div>
            <div class="text-xs text-gray-500 mt-1">金额: $${preview.amount.toFixed(2)}</div>
        </div>
    `).join('');
    
    previewSummary.textContent = `共 ${previews.length} 笔费用`;
}

function generateRecurringPreviews(startDate, amount) {
    const previews = [{
        title: '初始费用',
        date: startDate,
        amount: amount
    }];
    
    const start = new Date(startDate);
    const maxPreviews = 4; // 最多显示4个预览
    
    for (let i = 1; i <= maxPreviews; i++) {
        const nextDate = calculateNextDate(start, i);
        previews.push({
            title: `第 ${i + 1} 次`,
            date: nextDate.toISOString().split('T')[0],
            amount: amount
        });
    }
    
    return previews;
}

function calculateNextDate(startDate, interval) {
    const date = new Date(startDate);
    
    switch (recurringExpenseState.frequency) {
        case 'daily':
            date.setDate(date.getDate() + interval);
            break;
        case 'weekly':
            date.setDate(date.getDate() + (interval * 7));
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + interval);
            break;
        case 'yearly':
            date.setFullYear(date.getFullYear() + interval);
            break;
    }
    
    return date;
}

function initializeRecurringSettings() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('repeat-start').value = today;
    
    // 设置默认频率为每日
    selectFrequency('daily');
}

// --- 删除确认功能 ---
function showDeleteRecurringConfirm(expenseDescription) {
    const modal = document.getElementById('delete-confirm-modal');
    const message = document.getElementById('delete-confirm-message');
    
    if (modal && message) {
        message.textContent = `您确定要删除定期费用 "${expenseDescription}" 吗？此操作无法撤销。`;
        // 更改确认按钮的点击事件
        document.getElementById('confirm-delete-button').onclick = confirmDeleteRecurringExpense;
        modal.classList.remove('hidden');
    }
}

function confirmDeleteRecurringExpense() {
    if (!currentEditingRecurringExpense) {
        customAlert('错误', '未找到要删除的定期费用');
        closeDeleteConfirm();
        return;
    }
    
    const index = recurringExpensesList.findIndex(e => e.id === currentEditingRecurringExpense.id);
    if (index !== -1) {
        recurringExpensesList.splice(index, 1);
    }
    
    customAlert('成功', `定期费用 "${currentEditingRecurringExpense.description}" 已被删除`);
    
    closeDeleteConfirm();
    handleRecurringDetailCancel();
    refreshRecurringList();
}

// --- 费用详情功能 ---
function viewExpenseDetail(expenseId) {
    const expense = expensesList.find(e => e.id === expenseId);
    if (!expense) {
        customAlert('错误', '未找到费用信息');
        return;
    }
    
    currentEditingExpense = expense;
    
    const modal = document.getElementById('expense-detail-modal');
    if (modal) {
        modal.classList.remove('hidden');
        initializeExpenseDetailForm(expense);
    }
}

function initializeExpenseDetailForm(expense) {
    document.getElementById('detail-description').value = expense.description;
    document.getElementById('detail-amount').value = expense.amount;
    document.getElementById('detail-date').value = expense.date;
    
    const payerSelect = document.getElementById('detail-payer');
    if (payerSelect) {
        payerSelect.innerHTML = '<option value="">请选择付款人</option>';
        groupMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            if (member.id === expense.payer) {
                option.selected = true;
            }
            payerSelect.appendChild(option);
        });
    }
    
    detailSelectedParticipants = new Set(expense.participants || [CURRENT_USER_ID]);
    renderDetailParticipantSelection();
    
    detailSplitMethod = expense.splitMethod || 'equal';
    setDetailSplitMethod(detailSplitMethod, false);
    
    detailMemberSplits = expense.splits || [];
    if (detailMemberSplits.length === 0) {
        const amount = parseFloat(expense.amount) || 0;
        initializeDetailSplits(amount);
    }
    
    updateDetailSplitDetails();
}

function renderDetailParticipantSelection() {
    const container = document.getElementById('detail-participants-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    groupMembers.forEach(member => {
        const isChecked = detailSelectedParticipants.has(member.id);
        
        const checkbox = document.createElement('div');
        checkbox.className = 'flex items-center space-x-3 p-2 bg-white rounded border border-gray-200 hover:bg-gray-50 transition duration-150';
        checkbox.innerHTML = `
            <input type="checkbox" id="detail-participant-${member.id}" 
                   ${isChecked ? 'checked' : ''}
                   data-member-id="${member.id}"
                   class="detail-participant-checkbox participant-checkbox h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded">
            <label for="detail-participant-${member.id}" class="flex items-center space-x-2 flex-1 cursor-pointer">
                <div class="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full font-bold text-sm">
                    ${member.name[0]}
                </div>
                <span class="text-sm font-medium text-gray-700">
                    ${member.name}
                    ${member.id === CURRENT_USER_ID ? ' (您)' : ''}
                </span>
            </label>
        `;
        
        container.appendChild(checkbox);
    });
}

function handleDetailParticipantChange(memberId, isChecked) {
    if (isChecked) {
        detailSelectedParticipants.add(memberId);
    } else {
        detailSelectedParticipants.delete(memberId);
    }
    
    const amount = parseFloat(document.getElementById('detail-amount').value) || 0;
    initializeDetailSplits(amount);
    updateDetailSplitDetails();
}

function initializeDetailSplits(amount) {
    const activeMembers = groupMembers.filter(m => detailSelectedParticipants.has(m.id));
    const memberCount = activeMembers.length;
    
    if (memberCount === 0) {
        detailMemberSplits = [];
        return;
    }
    
    const equalSplit = (amount / memberCount);
    let totalAllocated = 0;

    const existingSplitsValid = detailSplitMethod === 'exact' && detailMemberSplits.length === memberCount;
    
    detailMemberSplits = activeMembers.map((member, index) => {
        let splitAmount;

        if (existingSplitsValid) {
            const oldSplit = detailMemberSplits.find(s => s.id === member.id);
            splitAmount = parseFloat(oldSplit?.amount || '0.00');
        } else {
            let calculatedSplit = Math.floor(equalSplit * 100) / 100;
            
            if (index === memberCount - 1) {
                calculatedSplit = amount - totalAllocated;
            } else {
                totalAllocated += calculatedSplit;
            }
            splitAmount = calculatedSplit;
        }

        const displayName = member.name.replace(/\s*\(.*\)/, '').trim();

        return {
            id: member.id,
            name: member.id === CURRENT_USER_ID ? `您 (${displayName})` : displayName,
            amount: splitAmount.toFixed(2),
        };
    });
}

function setDetailSplitMethod(method, triggerUpdate = true) {
    detailSplitMethod = method;
    const methods = ['equal', 'exact'];
    
    methods.forEach(m => {
        const btn = document.getElementById(`detail-split-${m}`);
        if (btn) {
            if (m === method) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
    
    if (triggerUpdate) {
        const amountInput = document.getElementById('detail-amount');
        const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
        initializeDetailSplits(amount);
        updateDetailSplitDetails();
    }
}

function handleDetailSplitInputChange(memberId, value) {
    const index = detailMemberSplits.findIndex(s => s.id === memberId);
    if (index !== -1) {
        detailMemberSplits[index].amount = parseFloat(value).toFixed(2);
    }
    updateDetailSplitSummary();
}

function handleDetailAmountChange() {
    const amountInput = document.getElementById('detail-amount');
    const newAmount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    initializeDetailSplits(newAmount);
    updateDetailSplitDetails();
}

function updateDetailSplitDetails() {
    const splitList = document.getElementById('detail-split-list');
    const amountInput = document.getElementById('detail-amount');
    const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    
    if (!splitList) return;
    
    splitList.innerHTML = '';
    
    const sectionTitle = document.querySelector('#detail-split-details-section h4');
    if (sectionTitle) {
        sectionTitle.textContent = `分摊详情 (${getSplitMethodName(detailSplitMethod)})`;
    }

    if (detailSplitMethod === 'equal') {
        initializeDetailSplits(amount);

        detailMemberSplits.forEach(split => {
            const listItem = document.createElement('div');
            listItem.className = 'flex justify-between items-center py-1';
            listItem.innerHTML = `
                <span>${split.name}</span>
                <span class="font-medium text-gray-900">$ ${split.amount}</span>
            `;
            splitList.appendChild(listItem);
        });

    } else {
        detailMemberSplits.forEach(split => {
            const listItem = document.createElement('div');
            listItem.className = 'flex justify-between items-center py-1';
            
            listItem.innerHTML = `
                <label for="detail-split-${split.id}" class="w-1/3 text-gray-700">${split.name}</label>
                <div class="relative w-2/3">
                    <input type="number" id="detail-split-${split.id}" 
                           value="${split.amount}"
                           min="0" step="0.01" required
                           data-member-id="${split.id}"
                           class="detail-split-input block w-full pr-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                           placeholder="0.00">
                    <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span class="text-gray-500 sm:text-sm">$</span>
                    </div>
                </div>
            `;
            splitList.appendChild(listItem);
        });
    }
    updateDetailSplitSummary();
}

function updateDetailSplitSummary() {
    const summaryDiv = document.getElementById('detail-split-summary');
    const amountInput = document.getElementById('detail-amount');
    const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    
    if (!summaryDiv) return;
    
    let totalSplit = 0;
    let isBalanced = true;

    totalSplit = detailMemberSplits.reduce((sum, split) => sum + parseFloat(split.amount), 0);
    isBalanced = Math.abs(totalSplit - amount) < 0.01;
    
    const remaining = (amount - totalSplit).toFixed(2);
    
    summaryDiv.innerHTML = `
        <p class="text-sm flex justify-between">
            <span class="font-medium text-gray-700">总分摊金额:</span>
            <span class="font-bold ${isBalanced ? 'text-balance' : 'text-unbalanced'}">$ ${totalSplit.toFixed(2)}</span>
        </p>
        <p class="text-sm flex justify-between mt-1">
            <span class="font-medium text-gray-700">待分摊金额:</span>
            <span class="font-bold ${isBalanced ? 'text-balance' : 'text-unbalanced'}">$ ${remaining}</span>
        </p>
        ${!isBalanced ? `<p class="text-xs text-unbalanced mt-1">**警告:** 分摊总额 $${totalSplit.toFixed(2)} 与费用总额 $${amount.toFixed(2)} 不匹配。</p>` : ''}
    `;

    const submitButton = document.querySelector('#expense-detail-modal button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = !isBalanced;
        submitButton.classList.toggle('opacity-50', !isBalanced);
        submitButton.classList.toggle('cursor-not-allowed', !isBalanced);
    }
}

function handleUpdateExpense(event) {
    event.preventDefault();
    
    const amountInput = document.getElementById('detail-amount');
    const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    
    let totalSplit = detailMemberSplits.reduce((sum, split) => sum + parseFloat(split.amount), 0);
    if (Math.abs(totalSplit - amount) > 0.01) {
        customAlert('提交失败', '分摊总额与费用总额不匹配，请调整分摊详情。');
        return;
    }
    
    if (!currentEditingExpense) {
        customAlert('错误', '未找到要更新的费用');
        return;
    }
    
    const form = document.getElementById('expense-detail-form');
    const data = {
        'detail-description': document.getElementById('detail-description').value,
        'detail-amount': document.getElementById('detail-amount').value,
        'detail-date': document.getElementById('detail-date').value,
        'detail-payer': document.getElementById('detail-payer').value,
    };

    currentEditingExpense.description = data['detail-description'];
    currentEditingExpense.amount = parseFloat(data['detail-amount']);
    currentEditingExpense.date = data['detail-date'];
    currentEditingExpense.payer = data['detail-payer'];
    currentEditingExpense.participants = Array.from(detailSelectedParticipants);
    currentEditingExpense.splitMethod = detailSplitMethod;
    currentEditingExpense.splits = [...detailMemberSplits];

    customAlert('成功', `费用 "${data['detail-description']}" 已成功更新`);

    handleDetailCancel();
    refreshExpensesList();
}

function handleDeleteExpense() {
    if (!currentEditingExpense) {
        customAlert('错误', '未找到要删除的费用');
        return;
    }
    
    showDeleteConfirm(currentEditingExpense.description);
}

function handleDetailCancel() {
    const modal = document.getElementById('expense-detail-modal');
    if (modal) modal.classList.add('hidden');
    currentEditingExpense = null;
}

// --- 支付详情功能 ---
function viewPaymentDetail(paymentId) {
    const payment = paymentsList.find(p => p.id === paymentId);
    if (!payment) {
        customAlert('错误', '未找到支付信息');
        return;
    }
    
    currentEditingPayment = payment;
    
    const modal = document.getElementById('payment-detail-modal');
    if (modal) {
        modal.classList.remove('hidden');
        initializePaymentDetailForm(payment);
    }
}

function initializePaymentDetailForm(payment) {
    document.getElementById('payment-detail-description').value = payment.description;
    document.getElementById('payment-detail-amount').value = payment.amount;
    document.getElementById('payment-detail-date').value = payment.date;
    
    const payeeSelect = document.getElementById('payment-detail-to');
    if (payeeSelect) {
        payeeSelect.innerHTML = '<option value="">请选择收款人</option>';
        groupMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            if (member.id === payment.payee) {
                option.selected = true;
            }
            payeeSelect.appendChild(option);
        });
    }
    
    const expenseSelect = document.getElementById('payment-detail-for-expense');
    if (expenseSelect) {
        expenseSelect.innerHTML = '<option value="">请选择费用</option>';
        expensesList.forEach(expense => {
            const option = document.createElement('option');
            option.value = expense.id;
            option.textContent = `${expense.description} - $${expense.amount} (${expense.date})`;
            if (expense.id === payment.expenseId) {
                option.selected = true;
            }
            expenseSelect.appendChild(option);
        });
    }
    
    const payerSelect = document.getElementById('payment-detail-payer');
    if (payerSelect) {
        payerSelect.innerHTML = '<option value="">请选择付款人</option>';
        groupMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            if (member.id === payment.payer) {
                option.selected = true;
            }
            payerSelect.appendChild(option);
        });
    }
}

function handleUpdatePayment(event) {
    event.preventDefault();
    
    if (!currentEditingPayment) {
        customAlert('错误', '未找到要更新的支付');
        return;
    }
    
    const form = document.getElementById('payment-detail-form');
    const data = {
        'payment-detail-description': document.getElementById('payment-detail-description').value,
        'payment-detail-amount': document.getElementById('payment-detail-amount').value,
        'payment-detail-date': document.getElementById('payment-detail-date').value,
        'payment-detail-to': document.getElementById('payment-detail-to').value,
        'payment-detail-for-expense': document.getElementById('payment-detail-for-expense').value,
        'payment-detail-payer': document.getElementById('payment-detail-payer').value,
    };

    currentEditingPayment.description = data['payment-detail-description'];
    currentEditingPayment.amount = parseFloat(data['payment-detail-amount']);
    currentEditingPayment.date = data['payment-detail-date'];
    currentEditingPayment.payee = data['payment-detail-to'];
    currentEditingPayment.expenseId = data['payment-detail-for-expense'];
    currentEditingPayment.payer = data['payment-detail-payer'];

    customAlert('成功', `支付 "${data['payment-detail-description']}" 已成功更新`);

    handlePaymentDetailCancel();
    refreshPaymentsList();
}

function handleDeletePayment() {
    if (!currentEditingPayment) {
        customAlert('错误', '未找到要删除的支付');
        return;
    }
    
    showDeletePaymentConfirm(currentEditingPayment.description);
}

function handlePaymentDetailCancel() {
    const modal = document.getElementById('payment-detail-modal');
    if (modal) modal.classList.add('hidden');
    currentEditingPayment = null;
}

function updatePaymentDetailFileNameDisplay(input) {
    const display = document.getElementById('payment-detail-file-name-display');
    if (display) {
        if (input.files.length > 0) {
            display.textContent = input.files[0].name;
        } else {
            display.textContent = '点击上传支付凭证图片 (最大 1MB)';
        }
    }
}

// --- 删除确认功能 ---
function showDeleteConfirm(expenseDescription) {
    const modal = document.getElementById('delete-confirm-modal');
    const message = document.getElementById('delete-confirm-message');
    
    if (modal && message) {
        message.textContent = `您确定要删除费用 "${expenseDescription}" 吗？此操作无法撤销。`;
        // 更改确认按钮的点击事件
        document.getElementById('confirm-delete-button').onclick = confirmDeleteExpense;
        modal.classList.remove('hidden');
    }
}

function closeDeleteConfirm() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) modal.classList.add('hidden');
}

function confirmDeleteExpense() {
    if (!currentEditingExpense) {
        customAlert('错误', '未找到要删除的费用');
        closeDeleteConfirm();
        return;
    }
    
    const index = expensesList.findIndex(e => e.id === currentEditingExpense.id);
    if (index !== -1) {
        expensesList.splice(index, 1);
    }
    
    customAlert('成功', `费用 "${currentEditingExpense.description}" 已被删除`);
    
    closeDeleteConfirm();
    handleDetailCancel();
    refreshExpensesList();
}

function showDeletePaymentConfirm(paymentDescription) {
    const modal = document.getElementById('delete-payment-confirm-modal');
    const message = document.getElementById('delete-payment-confirm-message');
    
    if (modal && message) {
        message.textContent = `您确定要删除支付 "${paymentDescription}" 吗？此操作无法撤销。`;
        // 更改确认按钮的点击事件
        document.getElementById('confirm-delete-payment-button').onclick = confirmDeletePayment;
        modal.classList.remove('hidden');
    }
}

function closeDeletePaymentConfirm() {
    const modal = document.getElementById('delete-payment-confirm-modal');
    if (modal) modal.classList.add('hidden');
}

function confirmDeletePayment() {
    if (!currentEditingPayment) {
        customAlert('错误', '未找到要删除的支付');
        closeDeletePaymentConfirm();
        return;
    }
    
    const index = paymentsList.findIndex(p => p.id === currentEditingPayment.id);
    if (index !== -1) {
        paymentsList.splice(index, 1);
    }
    
    customAlert('成功', `支付 "${currentEditingPayment.description}" 已被删除`);
    
    closeDeletePaymentConfirm();
    handlePaymentDetailCancel();
    refreshPaymentsList();
}

// --- 费用表单功能 ---
function initializeExpenseForm() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    const amountInput = document.getElementById('amount');
    
    if (dateInput) dateInput.value = today;
    if (amountInput) amountInput.value = '';
    
    const payerSelect = document.getElementById('payer');
    if (payerSelect) {
        payerSelect.innerHTML = '<option value="">请选择付款人</option>';
        groupMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            payerSelect.appendChild(option);
        });
    }
    
    selectedParticipants = new Set([CURRENT_USER_ID]);
    renderParticipantSelection();
    
    setSplitMethod('equal', false);
    initializeSplits(0);
    updateSplitDetails();
    
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileNameDisplay) fileNameDisplay.textContent = '点击上传收据图片 (最大 1MB)';
    
    const fileInput = document.getElementById('receipt-file');
    if(fileInput) fileInput.value = null;
}

function renderParticipantSelection() {
    const container = document.querySelector('#participants-section .grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    groupMembers.forEach(member => {
        const isChecked = selectedParticipants.has(member.id);
        
        const checkbox = document.createElement('div');
        checkbox.className = 'flex items-center space-x-3 p-2 bg-white rounded border border-gray-200 hover:bg-gray-50 transition duration-150';
        checkbox.innerHTML = `
            <input type="checkbox" id="participant-${member.id}" 
                   ${isChecked ? 'checked' : ''}
                   data-member-id="${member.id}"
                   class="participant-checkbox h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded">
            <label for="participant-${member.id}" class="flex items-center space-x-2 flex-1 cursor-pointer">
                <div class="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full font-bold text-sm">
                    ${member.name[0]}
                </div>
                <span class="text-sm font-medium text-gray-700">
                    ${member.name}
                    ${member.id === CURRENT_USER_ID ? ' (您)' : ''}
                </span>
            </label>
        `;
        
        container.appendChild(checkbox);
    });
}

function handleParticipantChange(memberId, isChecked) {
    if (isChecked) {
        selectedParticipants.add(memberId);
    } else {
        selectedParticipants.delete(memberId);
    }
    
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    initializeSplits(amount);
    updateSplitDetails();
}

function initializeSplits(amount) {
    const activeMembers = groupMembers.filter(m => selectedParticipants.has(m.id));
    const memberCount = activeMembers.length;
    
    if (memberCount === 0) {
        memberSplits = [];
        return;
    }
    
    const equalSplit = (amount / memberCount);
    let totalAllocated = 0;

    const existingSplitsValid = currentSplitMethod === 'exact' && memberSplits.length === memberCount;
    
    memberSplits = activeMembers.map((member, index) => {
        let splitAmount;

        if (existingSplitsValid) {
            const oldSplit = memberSplits.find(s => s.id === member.id);
            splitAmount = parseFloat(oldSplit?.amount || '0.00');
        } else {
            let calculatedSplit = Math.floor(equalSplit * 100) / 100;
            
            if (index === memberCount - 1) {
                calculatedSplit = amount - totalAllocated;
            } else {
                totalAllocated += calculatedSplit;
            }
            splitAmount = calculatedSplit;
        }

        const displayName = member.name.replace(/\s*\(.*\)/, '').trim();

        return {
            id: member.id,
            name: member.id === CURRENT_USER_ID ? `您 (${displayName})` : displayName,
            amount: splitAmount.toFixed(2),
        };
    });
}

function setSplitMethod(method, triggerUpdate = true) {
    currentSplitMethod = method;
    const methods = ['equal', 'exact'];
    
    methods.forEach(m => {
        const btn = document.getElementById(`split-${m}`);
        if (btn) {
            if (m === method) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
    
    if (triggerUpdate) {
        const amountInput = document.getElementById('amount');
        const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
        initializeSplits(amount);
        updateSplitDetails();
    }
}

function handleSplitInputChange(memberId, value) {
    const index = memberSplits.findIndex(s => s.id === memberId);
    if (index !== -1) {
        memberSplits[index].amount = parseFloat(value).toFixed(2);
    }
    updateSplitSummary();
}

function handleAmountChange() {
    const amountInput = document.getElementById('amount');
    const newAmount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    initializeSplits(newAmount);
    updateSplitDetails();
    updateRecurringPreview();
}

function updateSplitDetails() {
    const splitList = document.getElementById('split-list');
    const amountInput = document.getElementById('amount');
    const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    
    if (!splitList) return;
    
    splitList.innerHTML = '';
    
    const sectionTitle = document.querySelector('#split-details-section h4');
    if (sectionTitle) {
        sectionTitle.textContent = `分摊详情 (${getSplitMethodName(currentSplitMethod)})`;
    }

    if (currentSplitMethod === 'equal') {
         initializeSplits(amount);

         memberSplits.forEach(split => {
            const listItem = document.createElement('div');
            listItem.className = 'flex justify-between items-center py-1';
            listItem.innerHTML = `
                <span>${split.name}</span>
                <span class="font-medium text-gray-900">$ ${split.amount}</span>
            `;
            splitList.appendChild(listItem);
        });

    } else {
        memberSplits.forEach(split => {
            const listItem = document.createElement('div');
            listItem.className = 'flex justify-between items-center py-1';
            
            listItem.innerHTML = `
                <label for="split-${split.id}" class="w-1/3 text-gray-700">${split.name}</label>
                <div class="relative w-2/3">
                    <input type="number" id="split-${split.id}" 
                           value="${split.amount}"
                           min="0" step="0.01" required
                           data-member-id="${split.id}"
                           class="split-input block w-full pr-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                           placeholder="0.00">
                    <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span class="text-gray-500 sm:text-sm">$</span>
                    </div>
                </div>
            `;
            splitList.appendChild(listItem);
        });
    }
    updateSplitSummary();
}

function updateSplitSummary() {
    const summaryDiv = document.getElementById('split-summary');
    const amountInput = document.getElementById('amount');
    const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    
    if (!summaryDiv) return;
    
    let totalSplit = 0;
    let isBalanced = true;

    totalSplit = memberSplits.reduce((sum, split) => sum + parseFloat(split.amount), 0);
    isBalanced = Math.abs(totalSplit - amount) < 0.01;
    
    const remaining = (amount - totalSplit).toFixed(2);
    
    summaryDiv.innerHTML = `
        <p class="text-sm flex justify-between">
            <span class="font-medium text-gray-700">总分摊金额:</span>
            <span class="font-bold ${isBalanced ? 'text-balance' : 'text-unbalanced'}">$ ${totalSplit.toFixed(2)}</span>
        </p>
        <p class="text-sm flex justify-between mt-1">
            <span class="font-medium text-gray-700">待分摊金额:</span>
            <span class="font-bold ${isBalanced ? 'text-balance' : 'text-unbalanced'}">$ ${remaining}</span>
        </p>
        ${!isBalanced ? `<p class="text-xs text-unbalanced mt-1">**警告:** 分摊总额 $${totalSplit.toFixed(2)} 与费用总额 $${amount.toFixed(2)} 不匹配。</p>` : ''}
    `;

    const submitButton = document.querySelector('#add-expense-modal button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = !isBalanced;
        submitButton.classList.toggle('opacity-50', !isBalanced);
        submitButton.classList.toggle('cursor-not-allowed', !isBalanced);
    }
}

function getSplitMethodName(method) {
    switch (method) {
        case 'equal': return 'Equally Split';
        case 'exact': return 'Custom Amount';
        default: return '未知分摊';
    }
}

function updateFileNameDisplay(input) {
    const display = document.getElementById('file-name-display');
    if (display) {
        if (input.files.length > 0) {
            display.textContent = input.files[0].name;
        } else {
            display.textContent = '点击上传收据图片 (最大 1MB)';
        }
    }
}

function handleAddNewExpense() {
    const modal = document.getElementById('add-expense-modal');
    if (modal) {
        modal.classList.remove('hidden');
        initializeExpenseForm();
    }
}

function handleCancel() {
    const modal = document.getElementById('add-expense-modal');
    if (modal) modal.classList.add('hidden');
}

function handleSaveExpense(event) {
    event.preventDefault();
    
    const amountInput = document.getElementById('amount');
    const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    
    let totalSplit = memberSplits.reduce((sum, split) => sum + parseFloat(split.amount), 0);
    if (Math.abs(totalSplit - amount) > 0.01) {
        customAlert('提交失败', '分摊总额与费用总额不匹配，请调整分摊详情。');
        return;
    }
    
    const form = document.getElementById('expense-form');
    const data = {
        'description': document.getElementById('description').value,
        'amount': document.getElementById('amount').value,
        'payer': document.getElementById('payer').value,
        'date': document.getElementById('date').value,
    };

    const newExpense = {
        id: 'expense_' + Date.now(),
        description: data.description,
        amount: parseFloat(data.amount),
        date: data.date,
        payer: data.payer,
        participants: Array.from(selectedParticipants),
        splitMethod: currentSplitMethod,
        splits: [...memberSplits]
    };
    
    expensesList.unshift(newExpense);
    customAlert('成功', `费用 "${data.description}" 已成功创建`);

    const modal = document.getElementById('add-expense-modal');
    if (modal) modal.classList.add('hidden');
    
    refreshExpensesList();
}

// --- 支付表单功能 ---
function initializePaymentForm() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('payment-date');
    const amountInput = document.getElementById('payment-amount');
    
    if (dateInput) dateInput.value = today;
    if (amountInput) amountInput.value = '';
    
    const paymentToSelect = document.getElementById('payment-to');
    if (paymentToSelect) {
        paymentToSelect.innerHTML = '<option value="">请选择收款人</option>';
        groupMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            paymentToSelect.appendChild(option);
        });
    }
    
    const paymentForExpenseSelect = document.getElementById('payment-for-expense');
    if (paymentForExpenseSelect) {
        paymentForExpenseSelect.innerHTML = '<option value="">请选择费用</option>';
        expensesList.forEach(expense => {
            const option = document.createElement('option');
            option.value = expense.id;
            option.textContent = `${expense.description} - $${expense.amount} (${expense.date})`;
            paymentForExpenseSelect.appendChild(option);
        });
    }
    
    const paymentPayerSelect = document.getElementById('payment-payer');
    if (paymentPayerSelect) {
        paymentPayerSelect.innerHTML = '<option value="">请选择付款人</option>';
        groupMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            paymentPayerSelect.appendChild(option);
        });
    }
    
    const fileNameDisplay = document.getElementById('payment-file-name-display');
    if (fileNameDisplay) fileNameDisplay.textContent = '点击上传支付凭证图片 (最大 1MB)';
    
    const fileInput = document.getElementById('payment-receipt-file');
    if(fileInput) fileInput.value = null;
}

function handleAddNewPayment() {
    const modal = document.getElementById('add-payment-modal');
    if (modal) {
        modal.classList.remove('hidden');
        initializePaymentForm();
    }
}

function handlePaymentCancel() {
    const modal = document.getElementById('add-payment-modal');
    if (modal) modal.classList.add('hidden');
}

function handleSavePayment(event) {
    event.preventDefault();
    
    const form = document.getElementById('payment-form');
    const data = {
        'payment-description': document.getElementById('payment-description').value,
        'payment-amount': document.getElementById('payment-amount').value,
        'payment-to': document.getElementById('payment-to').value,
        'payment-for-expense': document.getElementById('payment-for-expense').value,
        'payment-payer': document.getElementById('payment-payer').value,
        'payment-date': document.getElementById('payment-date').value,
    };

    const newPayment = {
        id: 'payment_' + Date.now(),
        description: data['payment-description'],
        amount: parseFloat(data['payment-amount']),
        date: data['payment-date'],
        payer: data['payment-payer'],
        payee: data['payment-to'],
        expenseId: data['payment-for-expense'],
        receipt: null
    };
    
    paymentsList.unshift(newPayment);

    customAlert('成功', `支付 "${data['payment-description']}" 已成功创建`);

    const modal = document.getElementById('add-payment-modal');
    if (modal) modal.classList.add('hidden');
    
    refreshPaymentsList();
}

function updatePaymentFileNameDisplay(input) {
    const display = document.getElementById('payment-file-name-display');
    if (display) {
        if (input.files.length > 0) {
            display.textContent = input.files[0].name;
        } else {
            display.textContent = '点击上传支付凭证图片 (最大 1MB)';
        }
    }
}

// --- 用户菜单逻辑 ---
let isMenuOpen = false;
function toggleUserMenu() {
    const dropdown = document.getElementById('logout-dropdown');
    const caretIcon = document.getElementById('caret-icon');
    
    isMenuOpen = !isMenuOpen;
    dropdown.classList.toggle('hidden', !isMenuOpen);
    caretIcon.classList.toggle('rotate-180', isMenuOpen);
}

// --- 页面导航逻辑 ---
function handleBackToPreviousPage() {
    // 假设 home 是上一页
    window.location.href = '/home';
}

function handleMyProfile() {
    customAlert('提示', '“我的资料”功能待实现。');
    if(isMenuOpen) toggleUserMenu();
}

function handleBackToDashboard() {
    window.location.href = '/home';
    if(isMenuOpen) toggleUserMenu();
}

function handleLogout() {
    customAlert('提示', '退出登录功能待实现。');
    if(isMenuOpen) toggleUserMenu();
}

function handleSettleUp() {
    customAlert('提示', '“结算”功能待实现。');
}

// --- 页面加载初始化 ---
document.addEventListener('DOMContentLoaded', function() {
    
    // 0. 检查是否真的加载了 group_page.js (调试)
    console.log("group_page.js 初始化...");

    // 1. 填充用户名 (模拟)
    const userDisplayElement = document.getElementById('user-display');
    if (userDisplayElement) {
        userDisplayElement.textContent = CURRENT_USER_NAME.replace(/\s*\(.*\)/, '').trim();
    }
    
    // 2. 渲染初始列表
    renderMemberList();
    refreshExpensesList();
    refreshPaymentsList();
    refreshRecurringList();
    loadGroupSettings();
    
    // 3. 绑定所有静态按钮
    // 导航栏
    document.getElementById('user-display-button').addEventListener('click', toggleUserMenu);
    document.getElementById('profile-button').addEventListener('click', handleMyProfile);
    document.getElementById('dashboard-button').addEventListener('click', handleBackToDashboard);
    document.getElementById('logout-button').addEventListener('click', handleLogout);
    document.getElementById('back-button').addEventListener('click', handleBackToPreviousPage);

    // 主按钮
    document.getElementById('add-expense-button').addEventListener('click', handleAddNewExpense);
    document.getElementById('add-payment-button').addEventListener('click', handleAddNewPayment);
    document.getElementById('settle-up-button').addEventListener('click', handleSettleUp);
    
    // Tab 按钮
    document.getElementById('tab-expenses').addEventListener('click', () => setActiveTab('expenses'));
    document.getElementById('tab-recurring').addEventListener('click', () => setActiveTab('recurring'));
    document.getElementById('tab-payments').addEventListener('click', () => setActiveTab('payments'));
    document.getElementById('tab-members').addEventListener('click', () => setActiveTab('members'));
    document.getElementById('tab-invite').addEventListener('click', () => setActiveTab('invite'));
    document.getElementById('tab-manage').addEventListener('click', () => setActiveTab('manage'));
    document.getElementById('tab-audit').addEventListener('click', () => setActiveTab('audit'));

    // 邀请 Tab
    document.getElementById('invite-submit-button').addEventListener('click', inviteNewMember);
    document.getElementById('invite-cancel-button').addEventListener('click', clearInviteForm);

    // 管理 Tab
    document.getElementById('group-settings-reset-button').addEventListener('click', resetGroupSettings);
    document.getElementById('group-settings-save-button').addEventListener('click', saveGroupSettings);
    
    // 弹窗关闭按钮
    document.getElementById('custom-alert-close-button').addEventListener('click', closeCustomAlert);
    document.getElementById('delete-confirm-cancel-button').addEventListener('click', closeDeleteConfirm);
    document.getElementById('delete-payment-confirm-cancel-button').addEventListener('click', closeDeletePaymentConfirm);
    document.getElementById('role-update-cancel-button').addEventListener('click', cancelUpdateRole);
    document.getElementById('remove-member-cancel-button').addEventListener('click', cancelRemoveMember);

    // 弹窗确认按钮
    document.getElementById('confirm-delete-button').addEventListener('click', confirmDeleteExpense); // 默认绑定
    document.getElementById('confirm-delete-payment-button').addEventListener('click', confirmDeletePayment); // 默认绑定
    document.getElementById('role-update-confirm-button').addEventListener('click', confirmUpdateRole);
    document.getElementById('remove-member-confirm-button').addEventListener('click', confirmRemoveMember);

    // 添加费用弹窗
    document.getElementById('expense-form').addEventListener('submit', handleSaveExpense);
    document.getElementById('add-expense-cancel-button').addEventListener('click', handleCancel);
    document.getElementById('amount').addEventListener('input', handleAmountChange);
    document.getElementById('split-equal').addEventListener('click', () => setSplitMethod('equal'));
    document.getElementById('split-exact').addEventListener('click', () => setSplitMethod('exact'));
    document.getElementById('receipt-file').addEventListener('change', (e) => updateFileNameDisplay(e.target));
    document.getElementById('participants-section').addEventListener('change', (e) => {
        if (e.target.classList.contains('participant-checkbox')) {
            handleParticipantChange(e.target.dataset.memberId, e.target.checked);
        }
    });
    document.getElementById('split-list').addEventListener('input', (e) => {
        if (e.target.classList.contains('split-input')) {
            handleSplitInputChange(e.target.dataset.memberId, e.target.value);
        }
    });

    // 添加支付弹窗
    document.getElementById('payment-form').addEventListener('submit', handleSavePayment);
    document.getElementById('add-payment-cancel-button').addEventListener('click', handlePaymentCancel);
    document.getElementById('payment-receipt-file').addEventListener('change', (e) => updatePaymentFileNameDisplay(e.target));
    
    // 费用详情弹窗
    document.getElementById('expense-detail-form').addEventListener('submit', handleUpdateExpense);
    document.getElementById('detail-amount').addEventListener('input', handleDetailAmountChange);
    document.getElementById('detail-split-equal').addEventListener('click', () => setDetailSplitMethod('equal'));
    document.getElementById('detail-split-exact').addEventListener('click', () => setDetailSplitMethod('exact'));
    document.getElementById('detail-participants-container').addEventListener('change', (e) => {
        if (e.target.classList.contains('detail-participant-checkbox')) {
            handleDetailParticipantChange(e.target.dataset.memberId, e.target.checked);
        }
    });
    document.getElementById('detail-split-list').addEventListener('input', (e) => {
        if (e.target.classList.contains('detail-split-input')) {
            handleDetailSplitInputChange(e.target.dataset.memberId, e.target.value);
        }
    });

    // 支付详情弹窗
    document.getElementById('payment-detail-form').addEventListener('submit', handleUpdatePayment);

    // 定期费用弹窗
    document.getElementById('add-recurring-expense-button').addEventListener('click', handleAddNewRecurringExpense);
    document.getElementById('recurring-expense-form').addEventListener('submit', handleSaveRecurringExpense);
    document.getElementById('add-recurring-cancel-button').addEventListener('click', handleRecurringCancel);
    document.getElementById('recurring-amount').addEventListener('input', handleRecurringAmountChange);
    document.querySelectorAll('.frequency-option').forEach(opt => {
        opt.addEventListener('click', () => selectFrequency(opt.dataset.frequency));
    });
    document.getElementById('repeat-start').addEventListener('change', updateRecurringPreview);
    document.getElementById('recurring-participants-section').addEventListener('change', (e) => {
        if (e.target.classList.contains('recurring-participant-checkbox')) {
            handleRecurringParticipantChange(e.target.dataset.memberId, e.target.checked);
        }
    });
    document.getElementById('recurring-split-equal').addEventListener('click', () => setRecurringSplitMethod('equal'));
    document.getElementById('recurring-split-exact').addEventListener('click', () => setRecurringSplitMethod('exact'));
    document.getElementById('recurring-split-list').addEventListener('input', (e) => {
        if (e.target.classList.contains('recurring-split-input')) {
            handleRecurringSplitInputChange(e.target.dataset.memberId, e.target.value);
        }
    });

    // 定期费用详情弹窗
    document.getElementById('disable-recurring-btn').addEventListener('click', handleDisableRecurringExpense);
    document.getElementById('enable-recurring-btn').addEventListener('click', handleEnableRecurringExpense);
    document.getElementById('delete-recurring-btn').addEventListener('click', handleDeleteRecurringExpense);
    document.getElementById('edit-recurring-btn').addEventListener('click', handleEditRecurringExpense);
    document.getElementById('close-recurring-detail-btn').addEventListener('click', handleRecurringDetailCancel);
    
    // 4. 全局事件监听器
    document.addEventListener('click', (event) => {
        const menuContainer = document.getElementById('user-menu-container');
        if (isMenuOpen && menuContainer && !menuContainer.contains(event.target)) {
             toggleUserMenu(); 
        }
        
        if (!event.target.closest('.management-menu-active') && !event.target.closest('.member-menu-button')) {
            document.querySelectorAll('.management-menu-active').forEach(menu => {
                menu.classList.remove('management-menu-active');
                menu.classList.add('hidden');
            });
        }
    });

    console.log("group_page.js 绑定完成。");
});