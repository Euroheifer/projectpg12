// /static/js/page/groups.js

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

// --- 新增：从 home_page.js 借鉴的获取用户信息函数 edit by sunzhe ---
async function fetchCurrentUser() {
    try {
        const token = getAuthToken(); // 确保 getAuthToken 已从 utils 导入
        if (!token) {
            console.warn('未找到认证token，无法获取用户');
            return null;
        }

        console.log('正在从API (/me) 获取用户信息...');
        const response = await fetch('/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const user = await response.json();
            console.log('从API (/me) 获取的用户信息:', user);
            return user;
        } else {
            console.error('获取用户信息失败，状态码:', response.status);
            const errorText = await response.text();
            console.error('错误信息:', errorText);
            return null;
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
        return null;
    }
}

// --- 全局状态和数据 ---
window.CURRENT_USER_ID = '';
window.CURRENT_USER_NAME = '';
window.IS_CURRENT_USER_ADMIN = false;
window.currentGroupId = null;
window.currentGroup = null;

// 数据列表
window.groupMembers = [];
window.expensesList = [];
window.paymentsList = [];
window.recurringExpensesList = [];

// 页面状态
let activeTab = 'expenses';



//--- 页面初始化 ---
async function initializePage() {
    console.log('开始初始化群组页面...');

    try {
        // 1. 验证用户身份
        const user = await fetchCurrentUser(); //edit by sunzhe
        if (!user) {
            window.location.href = '/login';
            return;
        }

        window.CURRENT_USER_ID = user.id;
        window.CURRENT_USER_NAME = user.username;
       // document.getElementById('user-display').textContent = window.CURRENT_USER_NAME; // edit by sunzhe

        // 2. 从 URL 路径获取 Group ID
        const pathParts = window.location.pathname.split('/');
        window.currentGroupId = pathParts[pathParts.length - 1];

        console.log('从URL获取的群组ID:', window.currentGroupId);

        if (!window.currentGroupId || window.currentGroupId === 'groups') {
            showCustomAlert('错误', '未找到群组 ID');
            setTimeout(() => window.location.href = '/home', 1500);
            return;
        }

        // 3. 加载群组数据和权限
        await loadGroupData();
	
	// --- 新增：立即更新群组名称显示 ---
    	updateGroupNameDisplay();

        // 4. 根据权限渲染界面
        renderUIByPermission();

        // 5. 绑定事件和初始化
        setupModalCloseHandlers();
        bindEvents();

        // 6. 加载数据列表
        await loadDataLists();

        console.log(`群组页面初始化完成 - 群组: ${window.currentGroupId}, 用户: ${window.CURRENT_USER_NAME}, 权限: ${window.IS_CURRENT_USER_ADMIN ? '管理员' : '成员'}`);

    } catch (error) {
        console.error('页面初始化失败:', error);
        showCustomAlert('错误', '页面初始化失败');
    }
}

//--- 数据加载函数 ---
async function loadGroupData() {
    try {
        window.currentGroup = await getGroupData(window.currentGroupId);
	console.log('从API获取的群组数据:', window.currentGroup);
        //window.IS_CURRENT_USER_ADMIN = window.currentGroup.current_user_role === 'admin' || window.currentGroup.is_admin === true;
	window.IS_CURRENT_USER_ADMIN = window.currentGroup.admin_id === window.CURRENT_USER_ID;

        console.log('权限检查结果:', {
            groupId: window.currentGroupId,
            groupName: window.currentGroup.name,
            userRole: window.currentGroup.current_user_role,
            isAdmin: window.IS_CURRENT_USER_ADMIN
        });

    } catch (error) {
        console.error('加载群组数据失败:', error);
        window.currentGroup = {
            id: window.currentGroupId,
            name: '群组',
            description: '',
            current_user_role: 'member'
        };
        window.IS_CURRENT_USER_ADMIN = false;
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
	// --- 新增 ---
        // 2. 在所有列表加载完毕后，更新Tab上的数字
        updateTabCounts();
        // --- 结束 ---
    } catch (error) {
        console.error('加载数据列表失败:', error);
        showCustomAlert('错误', '加载数据失败');
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
    renderMemberList();
}

async function loadRecurringExpensesList() {
    window.recurringExpensesList = await getGroupRecurringExpenses(window.currentGroupId);
    refreshRecurringList();
}

// --- 界面渲染函数 ---

/**
 * 新增函数：渲染群组顶部的摘要信息（余额、结算等）
 * 它依赖 window.currentGroup 中的数据
 */
function renderGroupSummary() {
    if (!window.currentGroup) {
        console.warn('renderGroupSummary: window.currentGroup 为空，跳过渲染');
        return;
    }

    console.log('正在渲染群组摘要信息...', window.currentGroup);

    // --- 1. 渲染用户结余 ---
    // !!! 假设：你的 window.currentGroup 对象有 user_balance 字段
    // !!! 假设：你的 HTML 元素 ID 如下
    //const balanceLabelEl = document.getElementById('balance-label');
    //const balanceAmountEl = document.getElementById('balance-amount');
    //const balanceContextEl = document.getElementById('balance-context');

    // 尝试从 currentGroup 获取余额信息
    // 默认值为 0
    //const balance = window.currentGroup.user_balance || 0;
    // 默认上下文为空字符串
    //const balanceContext = window.currentGroup.user_balance_context || ''; 
    //const balanceAmount = Math.abs(balance).toFixed(2);

    //if (balance < 0) {
    //    if (balanceLabelEl) balanceLabelEl.textContent = '您欠款(应付)';
    //    if (balanceAmountEl) {
    //        balanceAmountEl.textContent = `¥${balanceAmount}`;
    //        balanceAmountEl.className = 'text-3xl font-bold text-red-500'; // 欠款为红色
    //    }
    //} else if (balance > 0) {
     //   if (balanceLabelEl) balanceLabelEl.textContent = '您被欠(应收)';
    //    if (balanceAmountEl) {
     //       balanceAmountEl.textContent = `¥${balanceAmount}`;
      //      balanceAmountEl.className = 'text-3xl font-bold text-green-500'; // 被欠为绿色
       // }
   // } else {
     //   if (balanceLabelEl) balanceLabelEl.textContent = '您已结清';
       // if (balanceAmountEl) {
         //   balanceAmountEl.textContent = '¥0.00';
          //  balanceAmountEl.className = 'text-3xl font-bold text-gray-700'; // 结清为灰色
       // }
   // }

    // 渲染结余上下文，例如 "给 2 位成员"
    //if (balanceContextEl) {
     //   balanceContextEl.textContent = balanceContext;
    //}

    // --- 2. 渲染结算建议 ---
    // !!! 假设：你的 window.currentGroup 对象有 settlement_summary 字段
    // !!! 假设：你的 HTML 元素 ID 如下
    //const settlementSummaryEl = document.getElementById('settlement-summary');

    // 默认值为 "暂无待清算"
    //const summary = window.currentGroup.settlement_summary || '暂无待清算';
    
    // --- 1. 获取所有 HTML 元素 ---
    const owedAmountEl = document.getElementById('balance-owed');
    const owedContextEl = document.getElementById('balance-owed-context');
    
    const owingAmountEl = document.getElementById('balance-owing-me');
    const owingContextEl = document.getElementById('balance-owing-me-context');
    
    const settlementSummaryEl = document.getElementById('settlement-summary-text');

    // --- 2. 渲染“您欠款”卡片 ---
    // 默认值为 0.00
    const balanceOwed = window.currentGroup.user_balance_owed || 0;
    // 默认上下文为空字符串
    const owedContext = window.currentGroup.user_balance_owed_context || ''; 
    
    if (owedAmountEl) {
        owedAmountEl.textContent = `¥${Number(balanceOwed).toFixed(2)}`;
    }
    if (owedContextEl) {
        owedContextEl.textContent = owedContext;
    }

    // --- 3. 渲染“被欠款”卡片 ---
    // 默认值为 0.00
    const balanceOwing = window.currentGroup.user_balance_owing || 0;
    // 默认上下文为空字符串
    const owingContext = window.currentGroup.user_balance_owing_context || ''; 
    
    if (owingAmountEl) {
        owingAmountEl.textContent = `¥${Number(balanceOwing).toFixed(2)}`;
    }
    if (owingContextEl) {
        owingContextEl.textContent = owingContext;
    }

    // --- 4. 渲染“建议结算”卡片 ---
    // 默认值为 "暂无待清算"
    const summary = window.currentGroup.settlement_summary || '暂无待清算';

    if (settlementSummaryEl) {
        settlementSummaryEl.textContent = summary;
    }
}


// ----------------- until here sunzhe -----------------------//

function renderUIByPermission() {
    console.log('渲染界面 - 用户权限:', window.IS_CURRENT_USER_ADMIN ? '管理员' : '成员');

// --- 修改开始 ---

    // 1. 渲染群组名称 (ID 和 名字)
    updateGroupNameDisplay();
    
    // 2. 渲染群组摘要 (余额和结算)
    renderGroupSummary();

    // 3. 设置管理员徽章 (它会附加到 group-name-display 元素上)
    setupAdminBadge();
    
    // --- 修改结束 ---

    toggleAdminElements();
    // updateTabCounts();
    setupFeatureRestrictions();

    // 确保初始显示正确的标签页
    const initialTab = window.IS_CURRENT_USER_ADMIN ? 'expenses' : 'expenses';
    setActiveTab(initialTab);
}
// 设置管理员徽章 - 只在知道是管理员时调用一次
function setupAdminBadge() {
    if (window.IS_CURRENT_USER_ADMIN) {
        const groupNameDisplay = document.getElementById('group-name-display');
        if (groupNameDisplay) {
            // 先清除可能存在的旧徽章
            const existingBadge = groupNameDisplay.querySelector('.admin-badge');
            if (existingBadge) {
                existingBadge.remove();
            }

            // 添加新徽章
            const adminBadge = document.createElement('span');
            adminBadge.className = 'admin-badge ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
            adminBadge.textContent = '管理员';
            groupNameDisplay.appendChild(adminBadge);
            console.log('已添加管理员徽章');
        }
    } else {
        // 如果不是管理员，确保移除徽章
        const adminBadge = document.querySelector('.admin-badge');
        if (adminBadge) {
            adminBadge.remove();
        }
    }
}
function toggleAdminElements() {
    const adminTabs = ['manage', 'audit'];

    console.log('toggleAdminElements - 当前权限:', window.IS_CURRENT_USER_ADMIN);

    if (window.IS_CURRENT_USER_ADMIN) {
        // 添加管理员类到body
        document.body.classList.add('is-admin');

        // 显示管理员标签页
        adminTabs.forEach(tab => {
            const tabElement = document.getElementById(`tab-${tab}`);
            if (tabElement) {
                tabElement.classList.remove('hidden');
                console.log(`显示管理员标签页: ${tab}`);
            }
        });

    } else {
        // 移除管理员类
        document.body.classList.remove('is-admin');

        // 隐藏管理员标签页
        adminTabs.forEach(tab => {
            const tabElement = document.getElementById(`tab-${tab}`);
            const contentElement = document.getElementById(`tab-content-${tab}`);

            if (tabElement) {
                tabElement.classList.add('hidden');
                console.log(`隐藏管理员标签页: ${tab}`);
            }
            if (contentElement) {
                contentElement.classList.add('hidden');
            }
        });
    }
}



//function updateGroupNameDisplay() {
//    const groupNameDisplay = document.getElementById('group-name-display');
//    if (groupNameDisplay && window.currentGroup) {
        // 只更新群组名称，徽章由 setupAdminBadge 处理
//        const nameSpan = groupNameDisplay.querySelector('span:not(.admin-badge)');
  //      if (nameSpan) {
    //        nameSpan.innerHTML = `${window.currentGroup.name} <span class="text-sm font-normal text-gray-500">(ID: ${window.currentGroup.id})</span>`;
      //  } else {
        //    groupNameDisplay.innerHTML = `${window.currentGroup.name} <span class="text-sm font-normal text-gray-500">(ID: ${window.currentGroup.id})</span>`;
        //}
    //}
//	    groupNameDisplay.innerHTML = `${window.currentGroup.name} <span class="text-sm font-normal text-gray-500">(ID: ${window.currentGroup.id})</span>`;
//    }
//}

function updateGroupNameDisplay() {
    const groupNameDisplay = document.getElementById('group-name-display');
    if (groupNameDisplay && window.currentGroup) {
        // 确保使用正确的群组名称属性
        const groupName = window.currentGroup.name || '未命名群组';
        const groupId = window.currentGroup.id || window.currentGroupId;

        groupNameDisplay.innerHTML = `${groupName} <span class="text-sm font-normal text-gray-500">(ID: ${groupId})</span>`;

        console.log('更新群组名称显示:', {
            name: groupName,
            id: groupId,
            fullGroupData: window.currentGroup
        });
    } else {
        console.warn('无法更新群组名称显示:', {
            groupNameDisplay: !!groupNameDisplay,
            currentGroup: window.currentGroup
        });
    }
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
        console.log('限制成员功能 - 当前用户不是管理员');

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

// --- Tab 切换逻辑 ---
function setActiveTab(tabName) {
    console.log('切换到标签:', tabName, '权限:', window.IS_CURRENT_USER_ADMIN ? '管理员' : '成员');

    // 权限验证 - 只限制真正需要管理员权限的标签
    const adminOnlyTabs = ['manage', 'audit'];
    if (adminOnlyTabs.includes(tabName) && !window.IS_CURRENT_USER_ADMIN) {
        showCustomAlert('权限不足', '您没有权限访问此页面');
        return;
    }

    // 如果已经是当前标签，不执行任何操作
    if (activeTab === tabName) return;

    // 移除所有tab的active状态
    const allTabs = document.querySelectorAll('[id^="tab-"]');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // 隐藏所有内容
    const allContents = document.querySelectorAll('[id^="tab-content-"]');
    allContents.forEach(content => {
        content.classList.add('hidden');
    });

    // 显示当前内容并设置active状态
    const currentTab = document.getElementById(`tab-${tabName}`);
    const currentContent = document.getElementById(`tab-content-${tabName}`);

    if (currentTab) {
        currentTab.classList.add('active');
    }

    if (currentContent) {
        currentContent.classList.remove('hidden');
    }

    // 切换到对应标签时刷新数据
    switch (tabName) {
        case 'expenses':
            refreshExpensesList();
            break;
        case 'payments':
            refreshPaymentsList();
            break;
        case 'recurring':
            refreshRecurringList();
            break;
        case 'members':
            renderMemberList();
            break;
        case 'invite':
            // 邀请页面不需要特殊处理
            break;
        case 'manage':
            // 管理页面特殊处理
            break;
        case 'audit':
            // 审计页面特殊处理
            break;
    }

    activeTab = tabName;
    console.log('成功切换到标签:', tabName);
}

// --- 事件绑定 ---
function bindEvents() {
    const userDisplayButton = document.getElementById('user-display-button');
    if (userDisplayButton) {
        userDisplayButton.addEventListener('click', toggleUserMenu);
    }

    // 绑定成员菜单关闭事件
    document.addEventListener('click', function () {
        const allMenus = document.querySelectorAll('[id^="member-menu-"]');
        allMenus.forEach(menu => {
            menu.classList.add('hidden');
        });
    });

    console.log('事件绑定完成');
}

// --- 用户菜单逻辑 ---
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

// --- 页面导航逻辑 ---
function handleBackToPreviousPage() {
    window.history.back();
}

function handleBackToDashboard() {
    window.location.href = '/home';
}

function handleMyProfile() {
    console.log('跳转到我的资料');
    // TODO: 实现跳转到我的资料页面逻辑
}

function handleLogoutUser() {
    console.log('退出登录');
    window.handleLogout();
    window.location.href = '/login';
}

// --- 其他功能 ---
function refreshRecurringList() {
    // TODO: 实现定期费用列表刷新
}

// --- 弹窗功能 ---
function handleSettleUp() {
    showCustomAlert('结算功能', '结算所有欠款功能开发中');
}
window.handleAddNewExpense = function () {
    console.log('显示添加费用弹窗');
    const modal = document.getElementById('add-expense-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.handleAddNewPayment = function () {
    console.log('显示添加支付弹窗');
    const modal = document.getElementById('add-payment-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.handleAddNewRecurringExpense = function () {
    console.log('显示添加定期费用弹窗');
    const modal = document.getElementById('add-recurring-expense-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.handleSettleUp = function () {
    console.log('结算所有欠款');
    showCustomAlert('结算功能', '结算所有欠款功能开发中');
};
// 添加关闭弹窗的函数
window.handleRecurringCancel = function () {
    console.log('关闭定期费用弹窗');
    const modal = document.getElementById('add-recurring-expense-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.handleCancel = function () {
    console.log('关闭费用弹窗');
    const modal = document.getElementById('add-expense-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.handlePaymentCancel = function () {
    console.log('关闭支付弹窗');
    const modal = document.getElementById('add-payment-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};


// --- 全局导出 ---
window.initializePage = initializePage;
window.setActiveTab = setActiveTab;
window.toggleUserMenu = toggleUserMenu;
window.handleBackToPreviousPage = handleBackToPreviousPage;
window.handleBackToDashboard = handleBackToDashboard;
window.handleMyProfile = handleMyProfile;
window.handleLogoutUser = handleLogoutUser;
window.handleSettleUp = handleSettleUp;
window.handleAddNewExpense = handleAddNewExpense;
window.handleAddNewPayment = handleAddNewPayment;
window.handleAddNewRecurringExpense = handleAddNewRecurringExpense;
window.handleRecurringCancel = handleRecurringCancel;
window.handleCancel = handleCancel;
window.handlePaymentCancel = handlePaymentCancel;

// 导出数据加载函数
window.loadMembersList = loadMembersList;

// 导出其他必要函数
window.showCustomAlert = showCustomAlert;


document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM 加载完成，开始初始化群组页面...');
    initializePage();
});
