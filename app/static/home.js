// home.js - 推荐版本（使用 /me + token）
let currentUser = null;

// 获取当前用户信息
async function getCurrentUser() {
    const token = localStorage.getItem('access_token');

    if (!token) {
        console.log('未找到 token，用户可能未登录');
        return null;
    }

    try {
        const response = await fetch('/me', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  // 显式添加 token
            },
            credentials: 'include'
        });

        if (response.ok) {
            const userData = await response.json();
            // 保存到 localStorage 缓存
            localStorage.setItem('current_user', JSON.stringify(userData));
            return userData;
        } else {
            console.log('/me 请求失败，状态码:', response.status);
            // 如果 /me 失败，回退到 token 解码
            return getUserFromToken();
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
        // 网络错误时回退到 token 解码
        return getUserFromToken();
    }
}

// 备用方案：从 token 解码用户信息
function getUserFromToken() {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.sub) {
            return {
                username: payload.sub.split('@')[0],
                email: payload.sub
            };
        }
    } catch (error) {
        console.error('解码 token 失败:', error);
    }
    return null;
}

// 退出登录确认功能
function showLogoutConfirmation() {
    toggleUserMenu();
    const modal = document.getElementById('logout-confirm-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeLogoutConfirm() {
    const modal = document.getElementById('logout-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function confirmLogout() {
    closeLogoutConfirm();

    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });

        clearAuthData();
        
        if (response.ok) {
            const result = await response.json();
            console.log('退出登录成功:', result);
            customAlert('退出登录', `${result.message} 正在跳转到登录页面...`);
        } else {
            customAlert('退出登录', '您已退出登录！正在跳转到登录页面...');
        }
        
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        
    } catch (error) {
        console.error('退出登录请求失败:', error);
        clearAuthData();
        customAlert('退出登录', '您已退出登录！正在跳转到登录页面...');
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
    }
}

function clearAuthData() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
}

// 文件: app/static/home.js
// --- 在 clearAuthData() 函数后粘贴以下所有代码 ---

//************************************************************** */
// 2. 辅助函数 (UI 和 NFR)
//************************************************************** */

let isMenuOpen = false;

/**
 * 帮助函数 (NFR)：将 "10.50" 转换为 1050 (美分)
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
 * 帮助函数 (NFR)：将 1050 (美分) 转换为 "10.50"
 * @param {number} centsInt - 以美分为单位的整数
 * @returns {string} - 格式化后的金额字符串
 */
function centsToAmountString(centsInt) {
    if (centsInt === undefined || centsInt === null || isNaN(centsInt)) {
        centsInt = 0;
    }
    // (在第 1 部分中，我们已将数据库字段改为 Integer)
    const amount = (centsInt / 100).toFixed(2);
    return amount;
}

/**
 * 帮助函数：显示自定义弹窗
 */
function customAlert(title, message) {
    const modal = document.getElementById('custom-alert-modal');
    const msgElement = document.getElementById('alert-message');
    if (modal && msgElement) {
        msgElement.innerHTML = `<strong>${title}</strong><br>${String(message)}`;
        modal.classList.remove('hidden');
    }
}

/**
 * 帮助函数：关闭自定义弹窗
 */
function closeCustomAlert() {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * 帮助函数：切换用户菜单
 */
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

//************************************************************** */
// 3. 功能: 群组 (Groups) - US14
//************************************************************** */

/**
 * API 调用 (READ): 加载当前用户的所有群组
 */
async function loadUserGroups() {
    const token = getAuthToken(); // 使用您已有的函数
    const container = document.getElementById('my-groups-list');
    const emptyState = document.getElementById('groups-empty-state');
    if (!container || !emptyState) return;

    try {
        // API 路由: @app.get("/groups/", ...)
        const response = await fetch('/groups/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`获取群组失败: ${response.statusText}`);
        }
        
        const groups = await response.json();
        renderGroups(groups); // 调用渲染函数

    } catch (error) {
        console.error(error);
        emptyState.textContent = '无法加载群组列表。';
        emptyState.classList.remove('hidden');
    }
}

/**
 * 渲染 (Groups): 将群组数据显示在页面上
 * @param {Array<object>} groups - 从 GET /groups/ API 返回的群组列表
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
                // 管理员跳转到 admin 页面
                window.location.href = `/group_admin?id=${group.id}`;
            } else {
                // 普通成员跳转到 member 页面
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
 * API 调用 (CREATE): 创建新群组
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
        // API 路由: @app.post("/groups/", ...)
        const response = await fetch('/groups/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            // schema.GroupCreate
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

/**
 * UI：显示创建群组弹窗
 */
function handleCreateGroup() {
    const modal = document.getElementById('create-group-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * UI：关闭创建群组弹窗
 */
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

//************************************************************** */
// 4. 功能: 邀请 (Invitations) - US24
//************************************************************** */

/**
 * API 调用 (READ): 加载待处理的邀请
 */
async function loadUserInvitations() {
    const token = getAuthToken();
    const container = document.getElementById('invitation-list-container');
    const emptyState = document.getElementById('empty-state');
    if (!container || !emptyState) return;

    try {
        // API 路由: @app.get("/invitations/me", ...)
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
 * 渲染 (Invitations): 将邀请数据显示在页面上
 * @param {Array<object>} invitations - 从 /invitations/me API 返回的邀请列表 (schema.GroupInvitationResponse)
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
                    ${invite.group.name} </h3>
                <p class="text-xs text-gray-500 mt-1 ml-6">
                    邀请人: <span class="font-medium text-gray-600">${invite.inviter.username}</span> <span class="text-xs ml-2 text-gray-400">(${dateString})</span>
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
 * API 调用 (UPDATE): 响应邀请 (US24)
 * @param {number} invitationId - 邀请 ID
 * @param {string} action - "accept" 或 "reject"
 */
async function handleInviteResponse(invitationId, action) {
    const token = getAuthToken();
    try {
        // API 路由: @app.post("/invitations/{invitation_id}/respond", ...)
        const response = await fetch(`/invitations/${invitationId}/respond`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            // schema.InvitationAction
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
 * UI：模拟邀请按钮（保留占位符）
 */
function seedMockInvitations() {
    customAlert('提示', '这是一个模拟功能。真实的邀请会通过 API 自动加载。');
}


//************************************************************** */
// 5. 功能: 群组详情页 (group_details_*.html)
//************************************************************** */

/**
 * API 调用 (READ): 加载群组详情页的所有数据
 * @param {string} groupId - 从 URL 中获取的群组 ID
 */
async function loadGroupDetails(groupId) {
    const token = getAuthToken();
    if (!token || !groupId) return;

    // (1) 加载群组成员
    try {
        // API 路由: @app.get("/groups/{group_id}/members", ...)
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
        // API 路由: @app.get("/groups/{group_id}/expenses", ...)
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

    // TODO: (3) 加载定期费用 (GET /groups/{group_id}/recurring-expenses)
    // TODO: (4) 加载支付记录 (您需要一个新的 API 端点，例如 GET /groups/{group_id}/payments)
    // TODO: (5) 加载审计日志 (GET /groups/{group_id}/audit-trail) (仅限管理员)
    // TODO: (6) 计算总余额 (您需要一个新的 API 端点，例如 GET /groups/{group_id}/balance)
}


//************************************************************** */
// 6. 占位符和页面入口
//************************************************************** */

/**
 * 占位符：处理 "我的资料"
 */
function handleMyProfile() {
    customAlert('跳转提示', '正在跳转到**我的资料**页面... (功能待实现)');
}

/**
 * 占位符：处理 "主页"
 */
function handleBackToDashboard() {
    window.location.href = '/home';
}

/**
 * 修改：处理 "退出登录"
 * (此函数已在 `home.js` 中存在，现在它只调用确认框)
 */
function handleLogout() {
    showLogoutConfirmation();
}

/**
 * 页面加载时的总入口 (Entry Point)
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
        
        // 从 URL (例如 /group_admin?id=123) 中获取 group ID
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
