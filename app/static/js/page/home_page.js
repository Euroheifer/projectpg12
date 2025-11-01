// 文件: app/static/js/pages/home_page.js
// (完整的新内容)

// --- 1. 导入功能 ---
// 从 ui/utils.js 导入辅助函数
import {
    getAuthToken,
    centsToAmountString, // 用于修复 NFR（金额转整数）
    customAlert,
    closeCustomAlert
} from '../ui/utils.js';

// 从 api/auth.js 导入认证功能
import {
    getCurrentUser,
    handleLogout,
    clearAuthData
} from '../api/auth.js';

// 从 api/invitations.js 导入邀请功能
import {
    getPendingInvitations,
    respondToInvitation
} from '../api/invitations.js';

// 从 api/groups.js 导入群组功能
import {
    getUserGroups,
    createGroup
} from '../api/groups.js';

/**
 * 全局变量，用于存储当前登录的用户信息
 * @type { {id: number, email: string, username: string} | null }
 */
let currentUser = null;
let isMenuOpen = false;

// --- 2. 渲染函数 (将数据转换为 HTML) ---

/**
 * 渲染: 将邀请数据显示在页面上
 * @param {Array<object>} invitations - 从 API 返回的邀请列表
 */
function renderInvitations(invitations) {
    const container = document.getElementById('invitation-list-container');
    const emptyState = document.getElementById('empty-state');

    container.innerHTML = ''; // 清空

    if (!invitations || invitations.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');

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
                <button id="accept-${invite.id}" class="accept-btn flex-1 sm:flex-none px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-md hover:bg-emerald-600 transition transform hover:scale-[1.02]">
                    <i class="fa-solid fa-check mr-1"></i> 接受
                </button>
                <button id="decline-${invite.id}" class="decline-btn flex-1 sm:flex-none px-3 py-1.5 bg-red-400 text-white text-sm font-medium rounded-lg shadow-md hover:bg-red-500 transition transform hover:scale-[1.02]">
                    <i class="fa-solid fa-xmark mr-1"></i> 拒绝
                </button>
            </div>
        `;
        container.appendChild(inviteElement);

        // 关键: 为新按钮动态添加事件监听器
        document.getElementById(`accept-${invite.id}`).addEventListener('click', () => handleInviteResponseClick(invite.id, 'accept'));
        document.getElementById(`decline-${invite.id}`).addEventListener('click', () => handleInviteResponseClick(invite.id, 'reject'));
    });
}

/**
 * 渲染: 将群组数据显示在页面上
 * @param {Array<object>} groups - 从 API 返回的群组列表
 */
function renderGroups(groups) {
    const container = document.getElementById('my-groups-list');
    const emptyState = document.getElementById('groups-empty-state');
    
    container.innerHTML = ''; // 清空

    if (!groups || groups.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');

    groups.forEach(group => {
        // 确保 currentUser 可用
        if (!currentUser) {
            console.error("currentUser 尚未加载，无法渲染群组");
            return;
        }

        // TODO: 余额 API 待实现。目前硬编码为 0。
        const balanceCents = 0; 
        const balanceText = `结余: ¥${centsToAmountString(balanceCents)}`;
        const balanceColor = 'text-gray-500'; 
        
        // 检查当前用户是否为该群组的管理员
        const isAdmin = (group.admin_id === currentUser.id);

        const groupElement = document.createElement('div');
        groupElement.className = 'group-card bg-white p-5 rounded-xl border border-gray-200 shadow-md hover:bg-gray-50 fade-in';
        groupElement.style.cursor = 'pointer'; // 明确鼠标指针
        
        // 动态跳转到正确的详情页
        groupElement.addEventListener('click', () => {
            if (isAdmin) {
                window.location.href = `/group_admin?id=${group.id}`;
            } else {
                window.location.href = `/group_member?id=${group.id}`;
            }
        });

        groupElement.innerHTML = `
            <div class="mb-3">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-bold text-gray-900 truncate">${group.name}</h3>
                    ${isAdmin ? '<span class="admin-badge">管理员</span>' : ''}
                </div>
            </div>
            <p class="text-sm text-gray-500 mb-2">${group.description || '无描述'}</p>
            <div class="flex items-center space-x-2 pt-2 border-t border-gray-100">
                <span class="${balanceColor} font-bold text-base">${balanceText}</span>
            </div>
        `;
        container.appendChild(groupElement);
    });
}


// --- 3. UI 事件处理器 (连接 HTML 和 API) ---

/**
 * API 处理: 响应邀请
 */
async function handleInviteResponseClick(invitationId, action) {
    try {
        await respondToInvitation(invitationId); //
        customAlert('成功', `邀请已${action === 'accept' ? '接受' : '拒绝'}！`);
        await loadUserInvitations(); // 重新加载邀请列表
        if (action === 'accept') {
            await loadUserGroups(); // 如果接受了，重新加载群组列表
        }
    } catch (error) {
        customAlert('失败', error.message);
    }
}

/**
 * API 处理: 创建群组
 */
async function handleCreateGroupClick() {
    const groupNameInput = document.getElementById('group-name');
    const groupName = groupNameInput.value.trim();
    if (!groupName) {
        customAlert('错误', '请输入群组名称');
        return;
    }

    try {
        const newGroup = await createGroup(groupName, "由 Web 界面创建"); //
        customAlert('成功', `群组 "${newGroup.name}" 创建成功！`);
        await loadUserGroups(); // 重新加载群组列表
        closeCreateGroupModal();
    } catch (error) {
        customAlert('创建群组失败', error.message);
    }
}

/**
 * UI 处理: 切换用户菜单
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

/**
 * UI 处理: 显示登出确认
 */
function showLogoutConfirmation() {
    // 确保菜单是关闭的
    if (isMenuOpen) {
        toggleUserMenu();
    }
    const modal = document.getElementById('logout-confirm-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * UI 处理: 关闭登出确认
 */
function closeLogoutConfirm() {
    const modal = document.getElementById('logout-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * API 处理: 确认登出
 */
async function confirmLogoutClick() {
    closeLogoutConfirm();
    const token = getAuthToken();

    try {
        await handleLogout(token); //
    } catch (error) {
        console.error('退出登录请求失败:', error);
    } finally {
        clearAuthData(); //
        customAlert('退出登录', '您已退出登录！正在跳转到登录页面...');
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
    }
}

/**
 * UI 处理: 显示创建群组弹窗
 */
function showCreateGroupModal() {
    document.getElementById('create-group-modal').classList.remove('hidden');
}

/**
 * UI 处理: 关闭创建群组弹窗
 */
function closeCreateGroupModal() {
    document.getElementById('create-group-modal').classList.add('hidden');
    // 重置输入框
    const groupNameInput = document.getElementById('group-name');
    if (groupNameInput) {
        groupNameInput.value = '';
    }
}

/**
 * API 调用 (READ): 加载当前用户的所有群组
 * (这是您缺少的函数)
 */
async function loadUserGroups() {
    const token = getAuthToken();
    const container = document.getElementById('my-groups-list');
    const emptyState = document.getElementById('groups-empty-state');
    if (!container || !emptyState) {
        console.warn('无法在 home.html 上找到群组列表容器。');
        return;
    }

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
 * API 调用 (READ): 加载待处理的邀请
 * (这是您缺少的函数)
 */
async function loadUserInvitations() {
    const token = getAuthToken();
    const container = document.getElementById('invitation-list-container');
    const emptyState = document.getElementById('empty-state');
    if (!container || !emptyState) {
        console.warn('无法在 home.html 上找到邀请列表容器。');
        return;
    }

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

// --- 4. 页面入口 (Page Entry Point) ---

/**
 * 页面加载时的总入口 (已修改，修复了按钮无反应的问题)
 */
async function initializePage() {
    console.log("home_page.js 初始化...");

    // --- 1. 绑定静态按钮 (立即执行) ---
    // 无论 API 是否成功，这些按钮都应该工作
    try {
        // 导航栏用户菜单
        document.getElementById('user-display-button').addEventListener('click', toggleUserMenu);
        document.getElementById('profile-button').addEventListener('click', () => {
            customAlert('提示', '“我的资料”功能待实现。');
            toggleUserMenu();
        });
        document.getElementById('dashboard-button').addEventListener('click', () => {
            window.location.href = '/home';
            toggleUserMenu();
        });
        document.getElementById('logout-button').addEventListener('click', showLogoutConfirmation);
        
        // 退出登录弹窗按钮
        document.getElementById('logout-cancel-button').addEventListener('click', closeLogoutConfirm);
        document.getElementById('logout-confirm-button').addEventListener('click', confirmLogoutClick);

        // 自定义弹窗按钮
        document.getElementById('custom-alert-close-button').addEventListener('click', closeCustomAlert);

        // 创建群组弹窗按钮
        document.getElementById('create-group-button').addEventListener('click', showCreateGroupModal);
        document.getElementById('create-group-cancel-button').addEventListener('click', closeCreateGroupModal);
        document.getElementById('create-group-confirm-button').addEventListener('click', handleCreateGroupClick);
        
        // 模拟邀请按钮
        document.getElementById('simulate-invite-btn').addEventListener('click', () => customAlert('提示', '这是一个模拟功能。真实的邀请会通过 API 自动加载。'));
        
        // 全局点击关闭菜单
        document.addEventListener('click', (event) => {
            const menuContainer = document.getElementById('user-menu-container');
            if (isMenuOpen && menuContainer && !menuContainer.contains(event.target)) {
                toggleUserMenu();
            }
        });
        console.log("静态按钮绑定完成。");
    } catch (e) {
        console.error("绑定静态按钮时出错:", e);
        // 即使绑定失败，也继续尝试加载数据
    }

    // --- 2. 验证用户身份并加载数据 ---
    try {
        currentUser = await getCurrentUser(getAuthToken()); //
        if (!currentUser) {
            window.location.href = '/login'; // 未登录，跳转
            return;
        }
        
        // 填充导航栏用户名
        document.getElementById('user-display').textContent = currentUser.username;
        console.log(`用户 ${currentUser.username} 已登录。`);

        // --- 3. 加载动态内容 (使用 try/catch) ---
        // 现在，即使一个加载失败，也不会阻止其他加载
        try {
            console.log("正在加载群组...");
            await loadUserGroups();
            console.log("群组加载完毕。");
        } catch (groupError) {
            console.error("加载群组失败:", groupError);
            customAlert('加载错误', '无法加载您的群组列表。');
        }

        try {
            console.log("正在加载邀请...");
            await loadUserInvitations();
            console.log("邀请加载完毕。");
        } catch (inviteError) {
            console.error("加载邀请失败:", inviteError);
            customAlert('加载错误', '无法加载您的邀请列表。');
        }

    } catch (authError) {
        // getCurrentUser 失败 (例如 token 过期)
        console.error("身份验证失败:", authError);
        clearAuthData();
        window.location.href = '/login';
    }
}

// 页面加载时执行
document.addEventListener('DOMContentLoaded', initializePage);