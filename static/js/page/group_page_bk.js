// 文件: app/static/js/page/group_page_bk.js
// 优化版本 - 包含性能、安全性和用户体验增强

import {
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
    getAuthToken,
    debounce,
    throttle
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

// ==========================================
// 性能优化：DOM缓存和工具函数
// ==========================================

// DOM元素缓存
const DOMCache = new Map();

/**
 * 获取DOM元素（带缓存）
 * @param {string} selector - 选择器
 * @returns {HTMLElement|null} DOM元素
 */
function getCachedElement(selector) {
    if (DOMCache.has(selector)) {
        return DOMCache.get(selector);
    }
    const element = document.querySelector(selector);
    DOMCache.set(selector, element);
    return element;
}

/**
 * 批量获取DOM元素（带缓存）
 * @param {string} selector - 选择器
 * @returns {NodeList} 元素列表
 */
function getCachedElements(selector) {
    const cacheKey = `all_${selector}`;
    if (DOMCache.has(cacheKey)) {
        return DOMCache.get(cacheKey);
    }
    const elements = document.querySelectorAll(selector);
    DOMCache.set(cacheKey, elements);
    return elements;
}

/**
 * 清空DOM缓存（页面重新加载时调用）
 */
function clearDOMCache() {
    DOMCache.clear();
}

/**
 * XSS防护：对文本内容进行转义
 * @param {string} text - 文本内容
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 安全的内容设置（防止XSS）
 * @param {HTMLElement} element - 目标元素
 * @param {string} content - 内容
 */
function safeSetContent(element, content) {
    if (element && content !== null && content !== undefined) {
        element.textContent = escapeHtml(String(content));
    }
}

/**
 * 显示加载状态
 * @param {string} message - 加载消息
 */
function showLoadingState(message = '加载中...') {
    const existingLoader = document.getElementById('global-loading');
    if (existingLoader) return;
    
    const loader = document.createElement('div');
    loader.id = 'global-loading';
    loader.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
    loader.innerHTML = `
        <div class="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-gray-700">${escapeHtml(message)}</span>
        </div>
    `;
    
    document.body.appendChild(loader);
}

/**
 * 隐藏加载状态
 */
function hideLoadingState() {
    const loader = document.getElementById('global-loading');
    if (loader) {
        loader.remove();
    }
}

/**
 * 显示确认对话框
 * @param {string} title - 标题
 * @param {string} message - 消息
 * @param {Function} onConfirm - 确认回调
 * @param {Function} onCancel - 取消回调
 */
function showConfirmDialog(title, message, onConfirm, onCancel = null) {
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
    dialog.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 transform transition-all duration-200 scale-95">
            <h3 class="text-lg font-semibold text-gray-900 mb-3">${escapeHtml(title)}</h3>
            <p class="text-sm text-gray-600 mb-6">${escapeHtml(message)}</p>
            <div class="flex space-x-3">
                <button class="confirm-btn flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition duration-150 font-medium">
                    确认
                </button>
                <button class="cancel-btn flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition duration-150">
                    取消
                </button>
            </div>
        </div>
    `;
    
    // 添加事件监听器
    const confirmBtn = dialog.querySelector('.confirm-btn');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    
    const handleConfirm = () => {
        document.body.removeChild(dialog);
        if (onConfirm) onConfirm();
    };
    
    const handleCancel = () => {
        document.body.removeChild(dialog);
        if (onCancel) onCancel();
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    
    // 点击外部关闭
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            handleCancel();
        }
    });
    
    // ESC键关闭
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            handleCancel();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
    
    document.body.appendChild(dialog);
    
    // 动画效果
    setTimeout(() => {
        dialog.querySelector('.bg-white').classList.remove('scale-95');
    }, 10);
}

// ==========================================
// 全局状态管理（优化版本）
// ==========================================

// 全局状态（使用Map优化性能）
const GlobalState = {
    // 用户状态
    CURRENT_USER_ID: '',
    CURRENT_USER_NAME: '',
    IS_CURRENT_USER_ADMIN: false,
    
    // 群组状态
    currentGroupId: null,
    currentGroup: null,
    
    // 数据列表
    groupMembers: [],
    expensesList: [],
    paymentsList: [],
    recurringExpensesList: [],
    
    // 页面状态
    activeTab: 'expenses',
    isLoading: false,
    
    // 事件监听器管理
    listeners: new Map(),
    
    // 缓存管理
    cache: new Map()
};

/**
 * 安全的状态更新
 * @param {string} key - 状态键
 * @param {any} value - 值
 */
function setState(key, value) {
    if (key in GlobalState) {
        GlobalState[key] = value;
        
        // 触发状态变化监听器
        const listeners = GlobalState.listeners.get(key);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(value);
                } catch (error) {
                    console.error('状态监听器执行错误:', error);
                }
            });
        }
    }
}

/**
 * 添加状态监听器
 * @param {string} key - 状态键
 * @param {Function} callback - 回调函数
 */
function addStateListener(key, callback) {
    if (!GlobalState.listeners.has(key)) {
        GlobalState.listeners.set(key, []);
    }
    GlobalState.listeners.get(key).push(callback);
}

// ==========================================
// 数据获取和缓存（优化版本）
// ==========================================

/**
 * 带缓存的数据获取
 * @param {string} cacheKey - 缓存键
 * @param {Function} fetcher - 数据获取函数
 * @param {number} cacheTime - 缓存时间（毫秒）
 * @returns {Promise} 数据Promise
 */
async function getCachedData(cacheKey, fetcher, cacheTime = 300000) { // 默认5分钟缓存
    const cached = GlobalState.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < cacheTime) {
        console.log(`使用缓存数据: ${cacheKey}`);
        return cached.data;
    }
    
    console.log(`重新获取数据: ${cacheKey}`);
    const data = await fetcher();
    
    GlobalState.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
    });
    
    return data;
}

/**
 * 清空指定缓存
 * @param {string} pattern - 缓存键模式
 */
function clearCache(pattern = null) {
    if (pattern) {
        const regex = new RegExp(pattern);
        for (const key of GlobalState.cache.keys()) {
            if (regex.test(key)) {
                GlobalState.cache.delete(key);
            }
        }
    } else {
        GlobalState.cache.clear();
    }
}

// ==========================================
// 用户信息获取（优化版本）
// ==========================================

/**
 * 获取当前用户信息（优化版本 - 带缓存和错误处理）
 */
async function fetchCurrentUser() {
    try {
        const token = getAuthToken();
        if (!token) {
            console.warn('未找到认证token，无法获取用户信息');
            redirectToLogin();
            return null;
        }

        console.log('正在从API获取用户信息...');
        
        // 使用缓存避免重复请求
        const user = await getCachedData('current_user', async () => {
            const response = await fetch('/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`获取用户信息失败: ${response.status}`);
            }

            return response.json();
        }, 60000); // 1分钟缓存

        console.log('成功获取用户信息:', user);
        return user;
        
    } catch (error) {
        console.error('获取用户信息失败:', error);
        showErrorNotification('获取用户信息失败，请刷新页面重试');
        
        // 认证失败时重定向到登录页
        if (error.message.includes('401') || error.message.includes('未授权')) {
            redirectToLogin();
        }
        
        return null;
    }
}

/**
 * 重定向到登录页面
 */
function redirectToLogin() {
    clearAuthData();
    window.location.href = '/login';
}

/**
 * 清除认证数据
 */
function clearAuthData() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('csrf_token');
    sessionStorage.clear();
}

// ==========================================
// 页面初始化（优化版本）
// ==========================================

/**
 * 初始化页面（性能优化版本）
 */
async function initializePage() {
    console.log('开始初始化群组页面...');
    
    showLoadingState('正在初始化页面...');
    
    try {
        // 1. 验证用户身份
        const user = await fetchCurrentUser();
        if (!user) {
            return; // fetchCurrentUser已经处理了重定向
        }

        setState('CURRENT_USER_ID', user.id);
        setState('CURRENT_USER_NAME', user.username);

        // 2. 获取群组ID
        const groupId = extractGroupIdFromUrl();
        if (!groupId) {
            showErrorNotification('未找到群组ID');
            setTimeout(() => window.location.href = '/home', 1500);
            return;
        }
        setState('currentGroupId', groupId);

        // 3. 加载群组数据和权限
        await loadGroupData();

        // 4. 立即更新群组名称显示
        updateGroupNameDisplay();

        // 5. 根据权限渲染界面
        renderUIByPermission();

        // 6. 绑定事件和初始化
        setupModalCloseHandlers();
        bindEvents();

        // 7. 加载数据列表
        await loadDataLists();

        console.log(`群组页面初始化完成 - 群组: ${groupId}, 用户: ${user.username}, 权限: ${GlobalState.IS_CURRENT_USER_ADMIN ? '管理员' : '成员'}`);

        // 8. 启动定期数据刷新
        startPeriodicRefresh();

    } catch (error) {
        console.error('页面初始化失败:', error);
        showErrorNotification('页面初始化失败，请刷新页面重试');
    } finally {
        hideLoadingState();
    }
}

/**
 * 从URL提取群组ID
 * @returns {string|null} 群组ID
 */
function extractGroupIdFromUrl() {
    const pathParts = window.location.pathname.split('/');
    const groupId = pathParts[pathParts.length - 1];
    
    if (!groupId || groupId === 'groups' || groupId === '') {
        return null;
    }
    
    return groupId;
}

/**
 * 启动定期数据刷新
 */
function startPeriodicRefresh() {
    // 每5分钟刷新一次数据
    setInterval(() => {
        if (!GlobalState.isLoading) {
            console.log('执行定期数据刷新...');
            refreshAllData();
        }
    }, 300000);
}

/**
 * 刷新所有数据
 */
async function refreshAllData() {
    try {
        setState('isLoading', true);
        
        // 清空相关缓存
        clearCache('group_data|expenses|payments|members');
        
        // 重新加载数据
        await loadDataLists();
        
        console.log('定期数据刷新完成');
        
    } catch (error) {
        console.error('定期数据刷新失败:', error);
    } finally {
        setState('isLoading', false);
    }
}

// ==========================================
// 数据加载函数（优化版本）
// ==========================================

/**
 * 加载群组数据（优化版本）
 */
async function loadGroupData() {
    try {
        console.log('开始加载群组数据，群组ID:', GlobalState.currentGroupId);

        // 使用缓存获取群组数据
        const groupData = await getCachedData(
            `group_data_${GlobalState.currentGroupId}`, 
            () => getGroupData(GlobalState.currentGroupId),
            120000 // 2分钟缓存
        );
        
        setState('currentGroup', groupData);

        // 设置管理员权限
        const isAdmin = groupData.admin_id === GlobalState.CURRENT_USER_ID;
        setState('IS_CURRENT_USER_ADMIN', isAdmin);

        console.log('权限检查结果:', {
            userId: GlobalState.CURRENT_USER_ID,
            groupAdminId: groupData.admin_id,
            isAdmin: isAdmin
        });

    } catch (error) {
        console.error('加载群组数据失败:', error);
        
        // 使用安全的回退数据
        setState('currentGroup', {
            id: GlobalState.currentGroupId,
            name: '加载失败',
            description: error.message || '无法加载群组信息',
            admin_id: null
        });
        setState('IS_CURRENT_USER_ADMIN', false);
        
        showErrorNotification('无法加载群组数据，请检查网络连接');
    }
}

/**
 * 并行加载数据列表（优化版本）
 */
async function loadDataLists() {
    try {
        setState('isLoading', true);
        
        // 并行加载所有数据，提高性能
        const [expenses, payments, members, recurring] = await Promise.all([
            loadExpensesList(),
            loadPaymentsList(),
            loadMembersList(),
            loadRecurringExpensesList()
        ]);
        
        // 更新标签页计数
        updateTabCounts();
        
        console.log('数据列表加载完成');
        
    } catch (error) {
        console.error('加载数据列表失败:', error);
        showErrorNotification('加载数据失败，请刷新页面重试');
    } finally {
        setState('isLoading', false);
    }
}

async function loadExpensesList() {
    const expenses = await getCachedData(
        `expenses_${GlobalState.currentGroupId}`,
        () => getGroupExpenses(GlobalState.currentGroupId),
        60000 // 1分钟缓存
    );
    
    setState('expensesList', expenses);
    refreshExpensesList();
}

async function loadPaymentsList() {
    const payments = await getCachedData(
        `payments_${GlobalState.currentGroupId}`,
        () => getGroupPayments(GlobalState.currentGroupId),
        60000 // 1分钟缓存
    );
    
    setState('paymentsList', payments);
    refreshPaymentsList();
}

async function loadMembersList() {
    const members = await getCachedData(
        `members_${GlobalState.currentGroupId}`,
        () => getGroupMembers(GlobalState.currentGroupId),
        120000 // 2分钟缓存（成员数据变化较少）
    );
    
    setState('groupMembers', members);
    
    try {
        renderMemberList();
    } catch (error) {
        console.error('渲染成员列表失败:', error);
        const container = getCachedElement('#member-list-container');
        if (container) {
            container.innerHTML = '<p class="text-red-500 text-center">加载成员列表失败</p>';
        }
    }
}

async function loadRecurringExpensesList() {
    const recurring = await getCachedData(
        `recurring_${GlobalState.currentGroupId}`,
        () => getGroupRecurringExpenses(GlobalState.currentGroupId),
        180000 // 3分钟缓存（定期费用变化更少）
    );
    
    setState('recurringExpensesList', recurring);
    refreshRecurringList();
}

// ==========================================
// UI渲染函数（优化版本）
// ==========================================

/**
 * 渲染群组摘要信息（安全版本）
 */
function renderGroupSummary() {
    if (!GlobalState.currentGroup) {
        console.warn('renderGroupSummary: 当前群组数据为空，跳过渲染');
        return;
    }

    console.log('正在渲染群组摘要信息...', GlobalState.currentGroup);

    // 获取DOM元素
    const owedAmountEl = getCachedElement('#balance-owed');
    const owedContextEl = getCachedElement('#balance-owed-context');
    const owingAmountEl = getCachedElement('#balance-owing-me');
    const owingContextEl = getCachedElement('#balance-owing-me-context');
    const settlementSummaryEl = getCachedElement('#settlement-summary-text');

    // 渲染"您欠款"卡片
    const balanceOwed = GlobalState.currentGroup.user_balance_owed || 0;
    const owedContext = GlobalState.currentGroup.user_balance_owed_context || '';

    if (owedAmountEl) safeSetContent(owedAmountEl, `¥${Number(balanceOwed).toFixed(2)}`);
    if (owedContextEl) safeSetContent(owedContextEl, owedContext);

    // 渲染"被欠款"卡片
    const balanceOwing = GlobalState.currentGroup.user_balance_owing || 0;
    const owingContext = GlobalState.currentGroup.user_balance_owing_context || '';

    if (owingAmountEl) safeSetContent(owingAmountEl, `¥${Number(balanceOwing).toFixed(2)}`);
    if (owingContextEl) safeSetContent(owingContextEl, owingContext);

    // 渲染"建议结算"卡片
    const summary = GlobalState.currentGroup.settlement_summary || '暂无待清算';
    if (settlementSummaryEl) safeSetContent(settlementSummaryEl, summary);
}

/**
 * 根据权限渲染界面（优化版本）
 */
function renderUIByPermission() {
    console.log('渲染界面 - 用户权限:', GlobalState.IS_CURRENT_USER_ADMIN ? '管理员' : '成员');

    // 1. 渲染群组名称
    updateGroupNameDisplay();

    // 2. 渲染群组摘要
    renderGroupSummary();

    // 3. 设置管理员徽章
    setupAdminBadge();

    // 4. 切换管理员元素
    toggleAdminElements();

    // 5. 设置功能限制
    setupFeatureRestrictions();

    // 6. 设置初始标签页
    const initialTab = GlobalState.IS_CURRENT_USER_ADMIN ? 'expenses' : 'expenses';
    setActiveTab(initialTab);
}

/**
 * 设置管理员徽章（优化版本）
 */
function setupAdminBadge() {
    if (GlobalState.IS_CURRENT_USER_ADMIN) {
        const groupNameDisplay = getCachedElement('#group-name-display');
        if (groupNameDisplay) {
            // 清除现有徽章
            const existingBadge = groupNameDisplay.querySelector('.admin-badge');
            if (existingBadge) {
                existingBadge.remove();
            }

            // 添加新徽章
            const adminBadge = document.createElement('span');
            adminBadge.className = 'admin-badge ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
            safeSetContent(adminBadge, '管理员');
            groupNameDisplay.appendChild(adminBadge);
            
            console.log('管理员徽章已添加');
        }
    } else {
        // 移除徽章
        const adminBadge = document.querySelector('.admin-badge');
        if (adminBadge) {
            adminBadge.remove();
        }
    }
}

/**
 * 切换管理员元素显示（优化版本）
 */
function toggleAdminElements() {
    const adminTabs = ['manage', 'audit'];

    console.log('切换管理员元素 - 当前权限:', GlobalState.IS_CURRENT_USER_ADMIN);

    if (GlobalState.IS_CURRENT_USER_ADMIN) {
        // 添加管理员类到body
        document.body.classList.add('is-admin');

        // 显示管理员标签页
        adminTabs.forEach(tab => {
            const tabElement = getCachedElement(`#tab-${tab}`);
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
            const tabElement = getCachedElement(`#tab-${tab}`);
            const contentElement = getCachedElement(`#tab-content-${tab}`);

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

/**
 * 更新群组名称显示（安全版本）
 */
function updateGroupNameDisplay() {
    const groupNameDisplay = getCachedElement('#group-name-display');
    if (!groupNameDisplay) {
        console.error('无法找到群组名称显示元素');
        return;
    }

    if (!GlobalState.currentGroup) {
        safeSetContent(groupNameDisplay, '正在加载群组数据...');
        return;
    }

    // 获取群组名称和ID（安全处理）
    const groupName = GlobalState.currentGroup.name || '未命名群组';
    const groupId = GlobalState.currentGroup.id || GlobalState.currentGroupId || '未知';

    groupNameDisplay.innerHTML = `${escapeHtml(groupName)} <span class="text-sm font-normal text-gray-500">(ID: ${escapeHtml(String(groupId))})</span>`;

    console.log('成功更新群组名称显示:', {
        name: groupName,
        id: groupId
    });
}

/**
 * 更新标签页计数（优化版本）
 */
function updateTabCounts() {
    const updateCount = (elementId, count) => {
        const element = getCachedElement(elementId);
        if (element) {
            safeSetContent(element, count);
        }
    };

    updateCount('#expense-count', GlobalState.expensesList.length);
    updateCount('#recurring-count', GlobalState.recurringExpensesList.length);
    updateCount('#payment-count', GlobalState.paymentsList.length);
    updateCount('#member-count', GlobalState.groupMembers.length);
    updateCount('#active-member-count', GlobalState.groupMembers.length);
}

/**
 * 设置功能限制（安全版本）
 */
function setupFeatureRestrictions() {
    if (!GlobalState.IS_CURRENT_USER_ADMIN) {
        console.log('限制成员功能 - 当前用户不是管理员');

        // 限制费用详情编辑
        const detailInputs = getCachedElements('#expense-detail-modal input, #expense-detail-modal select');
        detailInputs.forEach(input => {
            if (input.type !== 'submit') {
                input.classList.add('readonly-field');
                input.readOnly = true;
                input.disabled = true;
            }
        });

        // 限制支付详情编辑
        const paymentInputs = getCachedElements('#payment-detail-modal input, #payment-detail-modal select');
        paymentInputs.forEach(input => {
            if (input.type !== 'submit') {
                input.classList.add('readonly-field');
                input.readOnly = true;
                input.disabled = true;
            }
        });
    }
}

// ==========================================
// 标签页切换逻辑（优化版本）
// ==========================================

/**
 * 设置活动标签页（优化版本）
 * @param {string} tabName - 标签页名称
 */
function setActiveTab(tabName) {
    console.log('切换到标签:', tabName, '权限:', GlobalState.IS_CURRENT_USER_ADMIN ? '管理员' : '成员');

    // 权限检查
    const adminOnlyTabs = ['manage', 'audit'];
    if (adminOnlyTabs.includes(tabName) && !GlobalState.IS_CURRENT_USER_ADMIN) {
        showConfirmDialog('权限不足', '您没有权限访问此页面', null);
        return;
    }

    // 如果已经是当前标签，不执行任何操作
    if (GlobalState.activeTab === tabName) return;

    // 移除所有标签的active状态
    const allTabs = getCachedElements('[id^="tab-"]');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // 隐藏所有内容
    const allContents = getCachedElements('[id^="tab-content-"]');
    allContents.forEach(content => {
        content.classList.add('hidden');
    });

    // 显示当前内容并设置active状态
    const currentTab = getCachedElement(`#tab-${tabName}`);
    const currentContent = getCachedElement(`#tab-content-${tabName}`);

    if (currentTab) currentTab.classList.add('active');
    if (currentContent) currentContent.classList.remove('hidden');

    // 根据标签页刷新数据
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

    setState('activeTab', tabName);
    console.log('成功切换到标签:', tabName);
}

// ==========================================
// 事件绑定（优化版本）
// ==========================================

/**
 * 绑定事件监听器（优化版本）
 */
function bindEvents() {
    // 用户显示按钮
    const userDisplayButton = getCachedElement('#user-display-button');
    if (userDisplayButton) {
        userDisplayButton.addEventListener('click', throttle(toggleUserMenu, 200));
    }

    // 费用表单事件（防重复绑定）
    const addExpenseForm = getCachedElement('#expense-form');
    if (addExpenseForm) {
        // 移除可能存在的旧事件监听器
        addExpenseForm.removeEventListener('submit', handleSaveExpense);
        // 添加新的事件监听器
        addExpenseForm.addEventListener('submit', handleSaveExpense);
        console.log('已绑定费用表单提交事件');
    } else {
        console.error('找不到费用表单，无法绑定事件');
    }

    // 成员菜单关闭事件（事件委托优化）
    document.addEventListener('click', throttle(function (event) {
        if (!event.target.closest('[id^="member-menu-"]')) {
            const allMenus = getCachedElements('[id^="member-menu-"]');
            allMenus.forEach(menu => {
                menu.classList.add('hidden');
            });
        }
    }, 100));

    // 键盘快捷键支持
    document.addEventListener('keydown', handleKeyboardShortcuts);

    console.log('事件绑定完成');
}

/**
 * 处理键盘快捷键
 * @param {KeyboardEvent} event - 键盘事件
 */
function handleKeyboardShortcuts(event) {
    // ESC键关闭模态框
    if (event.key === 'Escape') {
        closeAllModals();
    }
    
    // Ctrl/Cmd + 数字键切换标签页
    if ((event.ctrlKey || event.metaKey) && event.key >= '1' && event.key <= '7') {
        event.preventDefault();
        const tabIndex = parseInt(event.key) - 1;
        const tabMap = ['expenses', 'payments', 'recurring', 'members', 'invite', 'manage', 'audit'];
        if (tabMap[tabIndex]) {
            setActiveTab(tabMap[tabIndex]);
        }
    }
}

/**
 * 关闭所有模态框
 */
function closeAllModals() {
    const modals = getCachedElements('[id$="-modal"]');
    modals.forEach(modal => {
        modal.classList.add('hidden');
    });
}

// ==========================================
// 用户菜单逻辑（优化版本）
// ==========================================

/**
 * 切换用户菜单（优化版本）
 */
function toggleUserMenu() {
    const dropdown = getCachedElement('#logout-dropdown');
    const caret = getCachedElement('#caret-icon');

    if (!dropdown || !caret) return;

    const isHidden = dropdown.classList.contains('hidden');
    
    if (isHidden) {
        dropdown.classList.remove('hidden');
        caret.classList.add('rotate-180');
    } else {
        dropdown.classList.add('hidden');
        caret.classList.remove('rotate-180');
    }
}

// ==========================================
// 页面导航逻辑（优化版本）
// ==========================================

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
    showConfirmDialog('退出登录', '确定要退出登录吗？', () => {
        console.log('正在退出登录...');
        clearAuthData();
        window.location.href = '/login';
    });
}

// ==========================================
// 其他功能函数（优化版本）
// ==========================================

function refreshRecurringList() {
    // TODO: 实现定期费用列表刷新
}

/**
 * 显示错误通知
 * @param {string} message - 错误消息
 */
function showErrorNotification(message) {
    showCustomAlert('错误', message);
}

/**
 * 显示成功通知
 * @param {string} message - 成功消息
 */
function showSuccessNotification(message) {
    showCustomAlert('成功', message);
}

// ==========================================
// 模态框处理函数（优化版本）
// ==========================================

function handleSettleUp() {
    showCustomAlert('结算功能', '结算所有欠款功能开发中');
}

window.handleAddNewExpense = function () {
    console.log('显示添加费用弹窗');
    initializeExpenseForm();
    const modal = getCachedElement('#add-expense-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.handleAddNewPayment = function () {
    console.log('显示添加支付弹窗');
    const modal = getCachedElement('#add-payment-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.handleAddNewRecurringExpense = function () {
    console.log('显示添加定期费用弹窗');
    const modal = getCachedElement('#add-recurring-expense-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.handleSettleUp = function () {
    console.log('结算所有欠款');
    showCustomAlert('结算功能', '结算所有欠款功能开发中');
};

// 关闭模态框的函数
window.handleRecurringCancel = function () {
    console.log('关闭定期费用弹窗');
    const modal = getCachedElement('#add-recurring-expense-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.handleCancel = function () {
    console.log('关闭费用弹窗');
    const modal = getCachedElement('#add-expense-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.handlePaymentCancel = function () {
    console.log('关闭支付弹窗');
    const modal = getCachedElement('#add-payment-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

// ==========================================
// 全局导出（优化版本）
// ==========================================

// 导出主要函数
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
window.loadExpensesList = loadExpensesList;

// 导出数据加载函数
window.loadMembersList = loadMembersList;

// 导出其他必要函数
window.showCustomAlert = showCustomAlert;
window.showConfirmDialog = showConfirmDialog;

// 导出状态管理函数
window.setState = setState;
window.addStateListener = addStateListener;

// ==========================================
// 页面加载完成初始化
// ==========================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM 加载完成，开始初始化群组页面...');
    
    // 清空DOM缓存
    clearDOMCache();
    
    // 初始化页面
    initializePage();
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    clearDOMCache();
    clearCache();
});

// 错误处理全局监听
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
    hideLoadingState();
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
    hideLoadingState();
});