// 文件: app/static/home.js
// (这是完整的新文件内容，请替换原有全部内容)

/**
 * 全局变量，用于存储当前登录的用户信息
 * @type { {id: number, email: string, username: string} | null }
 */
let currentUser = null;
let isMenuOpen = false;

// ----------------------------------------
// 1. 认证和辅助函数
// ----------------------------------------

/**
 * 从 localStorage 获取 Token
 * @returns {string | null}
 */
function getAuthToken() {
    return localStorage.getItem('access_token');
}

/**
 * (NFR 修复) 将 "10.50" 转换为 1050 (美分)
 * @param {string | number} amountString - 用户输入的金额字符串
 * @returns {number} - 以美分为单位的整数
 */
function amountToCents(amountString) {
    if (!amountString) return 0;
    const amount = parseFloat(amountString);
    if (isNaN(amount)) return 0;
    return Math.round(amount * 100);
}

/**
 * (NFR 修复) 将 1050 (美分) 转换为 "10.50"
 * @param {number} centsInt - 以美分为单位的整数
 * @returns {string} - 格式化后的金额字符串
 */
function centsToAmountString(centsInt) {
    if (centsInt === undefined || centsInt === null || isNaN(centsInt)) {
        centsInt = 0;
    }
    const amount = (centsInt / 100).toFixed(2);
    return amount;
}

/**
 * API 调用：获取当前登录的用户信息
 * @returns {Promise< {id: number, email: string, username: string} | null >}
 */
async function getCurrentUser() {
    const token = getAuthToken();
    if (!token) {
        console.log('未找到 token，用户可能未登录');
        return null;
    }

    try {
        const response = await fetch('/me', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const userData = await response.json();
            // 存储到全局变量
            currentUser = userData; 
            return userData;
        } else {
            console.log('/me 请求失败，状态码:', response.status);
            // Token 过期或无效，清除并重定向
            clearAuthData();
            window.location.href = '/login';
            return null;
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
        return null;
    }
}

/**
 * 清除本地存储的认证数据
 */
function clearAuthData() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
}

// ----------------------------------------
// 2. Home 页面 (home.html) 的 API 调用
// ----------------------------------------

/**
 * API 调用：加载当前用户的所有群组
 */
async function loadUserGroups() {
    const token = getAuthToken();
    const container = document.getElementById('my-groups-list');
    const emptyState = document.getElementById('groups-empty-state');
    if (!container || !emptyState) return;

    try {
        const response = await fetch('/groups/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('获取群组失败');
        
        const groups = await response.json();
        renderGroups(groups); // 调用渲染函数

    } catch (error) {
        console.error(error);
        emptyState.textContent = '无法加载群组列表。';
        emptyState.classList.remove('hidden');
    }
}

/**
 * 渲染 (Home): 将群组数据显示在页面上
 * @param {Array} groups - 从 /groups/ API 返回的群组列表
 */
function renderGroups(groups) {
    const container = document.getElementById('my-groups-list');
    const emptyState = document.getElementById('groups-empty-state');
    
    container.innerHTML = ''; // 清空

    if (!groups || groups.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');

    groups.forEach(group => {
        if (!currentUser) return; // 确保 currentUser 已加载

        // TODO: 您需要一个 API 端点来计算每个群组的总余额。
        // 目前，我们将余额硬编码为 0。
        const balanceCents = 0; 
        const balanceText = `结余: ¥${centsToAmountString(balanceCents)}`;
        const balanceColor = 'text-gray-500'; // 余额为0时显示灰色

        const groupElement = document.createElement('div');
        groupElement.className = 'group-card bg-white p-5 rounded-xl border border-gray-200 shadow-md hover:bg-gray-50 fade-in';
        
        // 关键：点击时跳转到详情页，并附带 group ID
        groupElement.onclick = () => {
            // 检查当前用户是否为该群组的管理员
            const isAdmin = (group.admin_id === currentUser.id);
            if (isAdmin) {
                window.location.href = `/group_admin?id=${group.id}`;
            } else {
                window.location.href = `/group_member?id=${group.id}`;
            }
        };
        
        const isAdmin = (group.admin_id === currentUser.id);

        groupElement.innerHTML = `
            <div class="mb-3">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-bold text-gray-900 truncate">${group.name}</h3>
                    ${isAdmin ? '<span class="admin-badge">管理员</span>' : ''}
                </div>
            </div>
            <p class="text-sm text-gray-500 mb-2">描述: ${group.description || '无'}</p>
            <div class="flex items-center space-x-2 pt-2 border-t border-gray-100">
                <span class="${balanceColor} font-bold text-base">${balanceText}</span>
            </div>
        `;
        
        container.appendChild(groupElement);
    });
}

/**
 * API 调用：加载待处理的邀请
 */
async function loadUserInvitations() {
    const token = getAuthToken();
    const container = document.getElementById('invitation-list-container');
    const emptyState = document.getElementById('empty-state');
    if (!container || !emptyState) return;

    try {
        const response = await fetch('/invitations/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('获取邀请失败');

        const invitations = await response.json();
        renderInvitations(invitations); // 调用渲染函数

    } catch (error) {
        console.error(error);
        emptyState.textContent = '无法加载邀请列表。';
        emptyState.classList.remove('hidden');
    }
}

/**
 * 渲染 (Home): 将邀请数据显示在页面上
 * @param {Array} invitations - 从 /invitations/me API 返回的邀请列表
 */
function renderInvitations(invitations) {
    const container = document.getElementById('invitation-list-container');
    const emptyState = document.getElementById('empty-state');

    container.innerHTML = ''; // 清空

    if (!invitations || invitations.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');

    invitations.forEach((invite, index) => {
        const borderClass = index > 0 ? 'border-t border-gray-200' : '';
        const dateString = new Date(invite.created_at).toLocaleDateString();

        const inviteElement = document.createElement('div');
        inviteElement.className = `invitation-item flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 ${borderClass} fade-in`;
        inviteElement.innerHTML = `
            <div class="mb-4 sm:mb-0">
                <h3 class="text-base font-semibold text-gray-800 flex items-center">
                    <i class="fa-solid fa-users text-indigo-500 mr-2"></i>
                    ${invite.group.name}
                </h3>
                <p class="text-xs text-gray-500 mt-1 ml-6">
                    邀请人: <span class="font-medium text-gray-600">${invite.inviter.username}</span>
                    <span class="text-xs ml-2 text-gray-400">(${dateString})</span>
                </p>
            </div>
            <div class="flex space-x-3 w-full sm:w-auto">
                <button class="accept-btn flex-1 sm:flex-none px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-md hover:bg-emerald-600 transition transform hover:scale-[1.02]">
                    <i class="fa-solid fa-check mr-1"></i> 接受
                </button>
                <button class="decline-btn flex-1 sm:flex-none px-3 py-1.5 bg-red-400 text-white text-sm font-medium rounded-lg shadow-md hover:bg-red-500 transition transform hover:scale-[1.02]">
                    <i class="fa-solid fa-xmark mr-1"></i> 拒绝
                </button>
            </div>
        `;

        // 添加真实的 API 事件监听器
        inviteElement.querySelector('.accept-btn').onclick = () => handleInviteResponse(invite.id, 'accept');
        inviteElement.querySelector('.decline-btn').onclick = () => handleInviteResponse(invite.id, 'reject');

        container.appendChild(inviteElement);
    });
}

/**
 * API 调用：响应邀请 (US24)
 * @param {number} invitationId - 邀请 ID
 * @param {string} action - "accept" 或 "reject"
 */
async function handleInviteResponse(invitationId, action) {
    const token = getAuthToken();
    try {
        const response = await fetch(`/invitations/${invitationId}/respond`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ "action": action })
        });

        if (response.ok) {
            customAlert('成功', `邀请已${action === 'accept' ? '接受' : '拒绝'}！`);
            loadUserInvitations(); // 重新加载邀请列表
            if (action === 'accept') {
                loadUserGroups(); // 如果接受了，重新加载群组列表
            }
        } else {
            const error = await response.json();
            throw new Error(error.detail || '操作失败');
        }
    } catch (error) {
        customAlert('失败', error.message);
    }
}

/**
 * API 调用：创建群组
 */
async function createNewGroup() {
    const groupNameInput = document.getElementById('group-name');
    if (!groupNameInput) return;
    const groupName = groupNameInput.value.trim();

    if (!groupName) {
        customAlert('错误', '请输入群组名称');
        return;
    }

    const token = getAuthToken();
    try {
        const response = await fetch('/groups/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                "name": groupName,
                "description": "由 Web 界面创建"
            })
        });

        if (response.ok) {
            const newGroup = await response.json();
            customAlert('成功', `群组 "${newGroup.name}" 创建成功！`);
            loadUserGroups(); // 重新加载群组列表
            closeCreateGroupModal();
        } else {
            const error = await response.json();
            throw new Error(error.detail || '创建失败');
        }
    } catch (error) {
        customAlert('创建群组失败', error.message);
    }
}

// ----------------------------------------
// 3. 群组详情页 (group_details_*.html) 的 API 调用
// ----------------------------------------

/**
 * API 调用：加载群组详情页的所有数据
 * @param {string} groupId - 从 URL 中获取的群组 ID
 */
async function loadGroupDetails(groupId) {
    const token = getAuthToken();
    if (!token) return;

    // (1) 加载群组成员
    try {
        const membersResponse = await fetch(`/groups/${groupId}/members`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!membersResponse.ok) throw new Error('获取成员失败');
        const members = await membersResponse.json();
        
        // TODO: 编写 renderMembers(members) 函数来更新 "成员" 选项卡
        console.log('加载的成员:', members); 
        // 示例：更新成员数量显示
        const memberCountEl = document.getElementById('member-count');
        if(memberCountEl) memberCountEl.textContent = members.length;
        const activeMemberCountEl = document.getElementById('active-member-count');
        if(activeMemberCountEl) activeMemberCountEl.textContent = members.length;
        
    } catch (error) {
        console.error(error);
        customAlert('错误', '无法加载群组成员。');
    }

    // (2) 加载群组费用
    try {
        const expensesResponse = await fetch(`/groups/${groupId}/expenses`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!expensesResponse.ok) throw new Error('获取费用失败');
        const expenses = await expensesResponse.json();

        // TODO: 编写 renderExpenses(expenses) 函数来更新 "费用" 选项卡
        console.log('加载的费用:', expenses); 
        // 示例：更新费用数量显示
        const expenseCountEl = document.getElementById('expense-count');
        if(expenseCountEl) expenseCountEl.textContent = expenses.length;

    } catch (error) {
        console.error(error);
        customAlert('错误', '无法加载费用列表。');
    }

    // (3) 加载定期费用
    // (4) 加载支付记录
    // (5) 加载审计日志 (仅限管理员)
    // (6) 计算总余额
}

// ----------------------------------------
// 4. 辅助函数和占位符
// ----------------------------------------

function handleCreateGroup() {
    const modal = document.getElementById('create-group-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeCreateGroupModal() {
    const modal = document.getElementById('create-group-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    const groupNameInput = document.getElementById('group-name');
    if (groupNameInput) {
        groupNameInput.value = '';
    }
}

function toggleUserMenu() {
    isMenuOpen = !isMenuOpen;
    const dropdown = document.getElementById('logout-dropdown');
    const caret = document.getElementById('caret-icon');

    if (dropdown && caret) {
        if (isMenuOpen) {
            dropdown.classList.remove('hidden');
            caret.classList.add('rotate-180');
        } else {
            dropdown.classList.add('hidden');
            caret.classList.remove('rotate-180');
        }
    }
}

function customAlert(title, message) {
    const modal = document.getElementById('custom-alert-modal');
    const msgElement = document.getElementById('alert-message');
    if (modal && msgElement) {
        msgElement.innerHTML = `<strong>${title}</strong><br>${String(message)}`;
        modal.classList.remove('hidden');
    }
}

function closeCustomAlert() {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function handleMyProfile() {
    customAlert('跳转提示', '正在跳转到**我的资料**页面... (功能待实现)');
}

function handleBackToDashboard() {
    window.location.href = '/home';
}

function seedMockInvitations() {
    customAlert('提示', '这是一个模拟功能。真实的邀请会通过 API 自动加载。');
}

// ----------------------------------------
// 5. 页面总入口 (Entry Point)
// ----------------------------------------

/**
 * 页面加载时的总入口
 */
async function initializePageContent() {
    console.log('开始初始化页面...');
    
    // 1. 获取用户信息
    await getCurrentUser();
    if (!currentUser) {
        // 如果 getCurrentUser 检测到 token 无效，它会自行重定向
        console.log('未找到用户，停止初始化。');
        return;
    }

    // 2. 更新通用的 UI 元素（如导航栏用户名）
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        userDisplay.textContent = currentUser.username;
    }

    // 3. 检查我们当前在哪个页面，并加载特定页面的数据
    if (document.getElementById('invitation-list-container')) {
        // 我们在 home.html 页面
        console.log('加载 Home 页面数据...');
        loadUserGroups();
        loadUserInvitations();
    } else if (document.getElementById('group-summary')) {
        // 我们在 group_details_admin.html 或 group_details_member.html 页面
        console.log('加载群组详情页面数据...');
        
        const params = new URLSearchParams(window.location.search);
        const groupId = params.get('id');
        
        if (groupId) {
            loadGroupDetails(groupId); 
        } else {
            customAlert('错误', '未在 URL 中找到群组 ID');
            window.location.href = '/home';
        }
    }

    // 4. 添加全局事件监听（例如点击外部关闭菜单）
    document.addEventListener('click', (event) => {
        const menuContainer = document.getElementById('user-menu-container');
        if (isMenuOpen && menuContainer && !menuContainer.contains(event.target)) {
            toggleUserMenu();
        }
    });

    console.log('页面初始化完成');
}

// 页面加载时执行
document.addEventListener('DOMContentLoaded', initializePageContent);