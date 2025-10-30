// --- 1. 导入功能 ---
import { getAuthToken, centsToAmountString, customAlert, closeCustomAlert } from '../ui/utils.js';
import { getCurrentUser, handleLogout, clearAuthData } from '../api/auth.js';
import { getPendingInvitations, respondToInvitation } from '../api/invitations.js';
import { getUserGroups, createGroup } from '../api/groups.js';

let currentUser = null;

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
                <button id="accept-${invite.id}" class="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-md hover:bg-emerald-600 transition transform hover:scale-[1.02]">
                    <i class="fa-solid fa-check mr-1"></i> 接受
                </button>
                <button id="decline-${invite.id}" class="flex-1 sm:flex-none px-3 py-1.5 bg-red-400 text-white text-sm font-medium rounded-lg shadow-md hover:bg-red-500 transition transform hover:scale-[1.02]">
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
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    groups.forEach(group => {
        const balanceCents = 0; // TODO: 余额 API 待实现
        const balanceText = `结余: ¥${centsToAmountString(balanceCents)}`;
        const balanceColor = 'text-gray-500'; 
        const isAdmin = (currentUser && group.admin_id === currentUser.id);

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

async function handleInviteResponseClick(invitationId, action) {
    try {
        await respondToInvitation(invitationId, action);
        customAlert('成功', `邀请已${action === 'accept' ? '接受' : '拒绝'}！`);
        await loadUserInvitations(); // 重新加载邀请列表
        if (action === 'accept') {
            await loadUserGroups(); // 如果接受了，重新加载群组列表
        }
    } catch (error) {
        customAlert('失败', error.message);
    }
}

async function handleCreateGroupClick() {
    const groupNameInput = document.getElementById('group-name');
    const groupName = groupNameInput.value.trim();
    if (!groupName) {
        customAlert('错误', '请输入群组名称');
        return;
    }

    try {
        const newGroup = await createGroup(groupName, "由 Web 界面创建");
        customAlert('成功', `群组 "${newGroup.name}" 创建成功！`);
        await loadUserGroups(); // 重新加载群组列表
        closeCreateGroupModal();
    } catch (error) {
        customAlert('创建群组失败', error.message);
    }
}

// --- 4. 页面入口 (Page Entry Point) ---

/**
 * 页面加载时的总入口
 */
// ... (文件顶部的所有 render 和 api 函数保持不变) ...

/**
 * 页面加载时的总入口 (已修改)
 */
async function initializePage() {
    // --- 1. 绑定静态按钮 (立即执行) ---
    // 无论 API 是否成功，这些按钮都应该工作
    try {
        // 菜单按钮
        document.getElementById('user-display-button').addEventListener('click', toggleUserMenu);
        document.querySelector('button[onclick="handleMyProfile(); toggleUserMenu();"]').addEventListener('click', () => customAlert('提示', '“我的资料”功能待实现。'));
        document.querySelector('button[onclick="handleBackToDashboard(); toggleUserMenu();"]').addEventListener('click', () => window.location.href = '/home');
        document.querySelector('button[onclick="showLogoutConfirmation()"]').addEventListener('click', showLogoutConfirmation);

        // 退出登录弹窗按钮
        document.querySelector('button[onclick="closeLogoutConfirm()"]').addEventListener('click', closeLogoutConfirm);
        document.querySelector('button[onclick="confirmLogout()"]').addEventListener('click', confirmLogout);

        // 自定义弹窗按钮
        document.querySelector('button[onclick="closeCustomAlert()"]').addEventListener('click', closeCustomAlert);

        // 创建群组弹窗按钮
        document.querySelector('button[onclick="handleCreateGroup()"]').addEventListener('click', () => document.getElementById('create-group-modal').classList.remove('hidden'));
        document.querySelector('button[onclick="closeCreateGroupModal()"]').addEventListener('click', closeCreateGroupModal);
        document.querySelector('button[onclick="createNewGroup()"]').addEventListener('click', handleCreateGroupClick);

        // 模拟邀请按钮
        document.getElementById('simulate-invite-btn').addEventListener('click', () => customAlert('提示', '这是一个模拟功能。真实的邀请会通过 API 自动加载。'));

        // 全局点击关闭菜单
        document.addEventListener('click', (event) => {
            const menuContainer = document.getElementById('user-menu-container');
            if (isMenuOpen && menuContainer && !menuContainer.contains(event.target)) {
                toggleUserMenu();
            }
        });
    } catch (e) {
        console.error("绑定静态按钮时出错:", e);
        // 即使绑定失败，也继续尝试加载数据
    }

    // --- 2. 验证用户身份并加载数据 ---
    try {
        currentUser = await getCurrentUser(getAuthToken());
        if (!currentUser) {
            window.location.href = '/login'; // 未登录，跳转
            return;
        }

        // 填充导航栏用户名
        document.getElementById('user-display').textContent = currentUser.username;

        // --- 3. 加载动态内容 (使用 try/catch) ---
        // 现在，即使一个加载失败，也不会阻止其他加载
        try {
            await loadUserGroups();
        } catch (groupError) {
            console.error("加载群组失败:", groupError);
            customAlert('加载错误', '无法加载您的群组列表。');
        }

        try {
            await loadUserInvitations();
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