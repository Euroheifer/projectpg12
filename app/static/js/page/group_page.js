// --- 导入 ---
import { getAuthToken, centsToAmountString, amountToCents, customAlert, closeCustomAlert } from '../ui/utils.js';
import { getCurrentUser } from '../api/auth.js';

// --- 全局状态 ---
let currentUser = null;
let currentGroupId = null;
let groupMembers = [];
let expensesList = [];
let paymentsList = []; // 注意：后端API目前不支持获取所有支付
let recurringExpensesList = [];
let token = null;

// --- 费用表单状态 ---
let selectedParticipants = new Set();
let currentSplitMethod = 'equal';
let memberSplits = [];

// --- 支付表单状态 ---
// (你可以在此添加)

// --- 详情模态框状态 ---
let currentEditingExpense = null;
let detailSelectedParticipants = new Set();
let detailMemberSplits = [];
let detailSplitMethod = 'equal';

// --- 定期费用状态 ---
let recurringExpenseState = {
    isRecurring: false,
    frequency: 'daily',
    startDate: '',
    endDate: '',
};
let recurringSelectedParticipants = new Set();
let recurringSplitMethod = 'equal';
let recurringMemberSplits = [];
let currentEditingRecurringExpense = null;


// --- 页面初始化 ---
document.addEventListener('DOMContentLoaded', async () => {
    token = getAuthToken();
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // 1. 获取当前用户
    try {
        currentUser = await getCurrentUser(token);
        document.getElementById('user-display').textContent = currentUser.username;
    } catch (e) {
        console.error("无法获取用户", e);
        window.location.href = '/login';
        return;
    }

    // 2. 获取 Group ID
    const params = new URLSearchParams(window.location.search);
    currentGroupId = params.get('id');
    if (!currentGroupId) {
        customAlert('错误', '未找到群组 ID');
        return;
    }

    // 3. 绑定所有事件
    // (这是替代 onclick="" 的现代方法)
    bindNavEvents();
    bindTabEvents();
    bindButtonEvents();
    bindModalEvents();

    // 4. 加载数据
    await loadAllGroupData();

    // 5. 默认激活第一个标签页
    setActiveTab('expenses');
});

/**
 * 绑定所有导航栏和顶部按钮事件
 */
function bindNavEvents() {
    // 导航栏
    document.getElementById('user-display-button').addEventListener('click', toggleUserMenu);
    // (为 '我的资料', '主页', '退出登录' 添加事件)
    // ...

    // 顶部按钮
    document.getElementById('add-expense-button').addEventListener('click', handleAddNewExpense);
    document.getElementById('add-payment-button').addEventListener('click', handleAddNewPayment);
    // ...
}

/**
 * 绑定标签页切换事件
 */
function bindTabEvents() {
    document.getElementById('tab-expenses').addEventListener('click', () => setActiveTab('expenses'));
    document.getElementById('tab-recurring').addEventListener('click', () => setActiveTab('recurring'));
    document.getElementById('tab-payments').addEventListener('click', () => setActiveTab('payments'));
    document.getElementById('tab-members').addEventListener('click', () => setActiveTab('members'));
    document.getElementById('tab-invite').addEventListener('click', () => setActiveTab('invite'));
    document.getElementById('tab-manage').addEventListener('click', () => setActiveTab('manage'));
    document.getElementById('tab-audit').addEventListener('click', () => setActiveTab('audit'));
}

/**
 * 绑定所有群组操作按钮事件
 */
function bindButtonEvents() {
    // 邀请成员
    document.getElementById('invite-submit-button').addEventListener('click', inviteNewMember);
    // 群组管理
    document.getElementById('save-settings-button').addEventListener('click', saveGroupSettings);
    // ... (添加其他按钮)
}

/**
 * 绑定所有模态框（弹窗）的关闭和提交事件
 */
function bindModalEvents() {
    // 自定义弹窗
    document.getElementById('custom-alert-close-button').addEventListener('click', closeCustomAlert);

    // 添加费用
    document.getElementById('expense-form').addEventListener('submit', handleSaveExpense);
    document.getElementById('expense-cancel-button').addEventListener('click', handleCancel);

    // 添加支付
    document.getElementById('payment-form').addEventListener('submit', handleSavePayment);
    document.getElementById('payment-cancel-button').addEventListener('click', handlePaymentCancel);
    
    // ... (为其他所有模态框添加事件)
}


// --- 数据加载函数 ---
async function loadAllGroupData() {
    console.log(`正在为群组 ${currentGroupId} 加载数据...`);
    
    // 并行获取所有数据
    await Promise.all([
        loadGroupDetails(),
        loadMembers(),
        loadExpenses(),
        loadRecurringExpenses()
        // loadPayments() // API 不支持
    ]);

    console.log("数据加载完毕");
    
    // 初始渲染
    renderMemberList();
    refreshExpensesList();
    refreshRecurringList();
    refreshPaymentsList();
}

async function loadGroupDetails() {
    // (你需要一个 /groups/{id} 的 API 端点)
    // 暂时用群组名称填充
    document.getElementById('group-name-display').textContent = `群组 (ID: ${currentGroupId})`;
}

async function loadMembers() {
    try {
        const response = await fetch(`/groups/${currentGroupId}/members`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('无法加载成员');
        groupMembers = await response.json();
        // 确保当前用户ID是正确的
        const selfInGroup = groupMembers.find(m => m.user.email === currentUser.email);
        if (selfInGroup) {
            currentUser.id = selfInGroup.user.id; // 同步ID
        }
    } catch (e) {
        console.error(e);
        customAlert('错误', '无法加载群组');
    }
}

async function loadExpenses() {
    try {
        const response = await fetch(`/groups/${currentGroupId}/expenses`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('无法加载费用');
        expensesList = await response.json();
    } catch (e) {
        console.error(e);
        customAlert('错误', '无法加载费用列表');
    }
}

async function loadRecurringExpenses() {
    try {
        const response = await fetch(`/groups/${currentGroupId}/recurring-expenses`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('无法加载定期费用');
        recurringExpensesList = await response.json();
    } catch (e) {
        console.error(e);
        customAlert('错误', '无法加载定期费用列表');
    }
}

// ... (此处省略了渲染、表单处理、分摊计算等所有逻辑) ...
// ... (为了使页面工作，需要从 (demo) 文件中复制所有这些函数) ...
// ... (例如: setActiveTab, handleAddNewExpense, handleSaveExpense, renderMemberList, ...)


// --- 占位符函数 (你需要从 (demo) 文件中复制完整的逻辑) ---

function setActiveTab(tabName) {
    console.log(`切换到标签: ${tabName}`);
    // 移除所有 'active'
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    // 隐藏所有 'tab-content'
    document.querySelectorAll('[id^="tab-content-"]').forEach(content => content.classList.add('hidden'));

    // 激活点击的标签
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`tab-content-${tabName}`).classList.remove('hidden');

    // 特殊渲染
    if (tabName === 'members') renderMemberList();
    if (tabName === 'expenses') refreshExpensesList();
    if (tabName === 'recurring') refreshRecurringList();
    if (tabName === 'payments') refreshPaymentsList();
}

function handleAddNewExpense() {
    console.log('打开添加费用模态框');
    // TODO: 实现表单初始化
    document.getElementById('add-expense-modal').classList.remove('hidden');
}

function handleAddNewPayment() {
    console.log('打开添加支付模态框');
    document.getElementById('add-payment-modal').classList.remove('hidden');
}

function inviteNewMember() {
    console.log('邀请新成员...');
}

function saveGroupSettings() {
    console.log('保存群组设置...');
}

async function handleSaveExpense(event) {
    event.preventDefault();
    console.log('保存费用...');
    // TODO: 实现表单数据收集和 API POST
    // 记得使用 amountToCents() 转换金额
    customAlert('成功', '费用已保存 (占位符)');
    document.getElementById('add-expense-modal').classList.add('hidden');
    
    // 重新加载并渲染
    await loadExpenses();
    refreshExpensesList();
}

function handleCancel() {
    document.getElementById('add-expense-modal').classList.add('hidden');
}

async function handleSavePayment(event) {
    event.preventDefault();
    console.log('保存支付...');
    // TODO: 实现表单数据收集和 API POST
    customAlert('成功', '支付已保存 (占位符)');
    document.getElementById('add-payment-modal').classList.add('hidden');
    
    // 重新加载并渲染
    // await loadPayments(); // API 不支持
    refreshPaymentsList();
}

function handlePaymentCancel() {
    document.getElementById('add-payment-modal').classList.add('hidden');
}

function renderMemberList() {
    console.log("渲染成员列表...");
    const container = document.getElementById('member-list-container');
    container.innerHTML = '';
    groupMembers.forEach(member => {
        const el = document.createElement('div');
        el.className = 'p-2 border rounded';
        el.textContent = member.user.username;
        container.appendChild(el);
    });
}

function refreshExpensesList() {
    console.log("刷新费用列表...");
    const container = document.getElementById('expenses-list');
    container.innerHTML = '';
    expensesList.forEach(exp => {
        const el = document.createElement('div');
        el.className = 'p-2 border rounded';
        el.textContent = `${exp.description} - ${centsToAmountString(exp.amount)}`;
        container.appendChild(el);
    });
}

function refreshRecurringList() {
    console.log("刷新定期费用列表...");
    // ...
}

function refreshPaymentsList() {
    console.log("刷新支付列表...");
    // ...
}

function toggleUserMenu() {
    document.getElementById('logout-dropdown').classList.toggle('hidden');
    document.getElementById('caret-icon').classList.toggle('rotate-180');
}