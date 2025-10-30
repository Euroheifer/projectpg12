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


//************************************************************** */
let demoInvitations = [];
let demoGroups = [];
let isMenuOpen = false;
// 初始化演示数据
// 初始化演示数据
function initializeDemoData() {
    demoInvitations = [
        {
            id: '1',
            groupId: 'trip-europe-2024',
            groupName: '欧洲毕业旅行 2024',
            inviterName: '李四',
            timestamp: Date.now() - 86400000
        },
        {
            id: '2',
            groupId: 'basketball-weekend',
            groupName: '周末篮球俱乐部',
            inviterName: '王五',
            timestamp: Date.now() - 172800000
        }
    ];

    demoGroups = [
        {
            id: '1',
            groupId: 'family-dinner',
            groupName: '家庭聚餐',
            balance: 125.50,
            memberCount: 4,
            isAdmin: true,
            createdBy: '张三'
        },
        {
            id: '2',
            groupId: 'office-lunch',
            groupName: '办公室午餐',
            balance: -45.00,
            memberCount: 8,
            isAdmin: false,
            createdBy: '李四'
        },
        {
            id: '3',
            groupId: 'project-team',
            groupName: '项目团队',
            balance: 0,
            memberCount: 6,
            isAdmin: true,
            createdBy: '张三'
        }
    ];
}

// 初始化函数
function initializeApp() {
    renderInvitations();
    renderGroups();
    bindEvents();
}

// 绑定事件
function bindEvents() {
    // 设置模拟邀请按钮事件
    const simulateBtn = document.getElementById('simulate-invite-btn');
    if (simulateBtn) {
        simulateBtn.onclick = seedMockInvitations;
    }

    // 设置创建群组按钮事件
    const createGroupBtn = document.querySelector('button[onclick="handleCreateGroup()"]');
    if (createGroupBtn) {
        createGroupBtn.onclick = handleCreateGroup;
    }

    // 设置弹窗关闭按钮事件
    const closeAlertBtn = document.querySelector('button[onclick="closeCustomAlert()"]');
    if (closeAlertBtn) {
        closeAlertBtn.onclick = closeCustomAlert;
    }

    // 设置退出登录确认按钮事件
    const logoutConfirmBtn = document.querySelector('button[onclick="confirmLogout()"]');
    if (logoutConfirmBtn) {
        logoutConfirmBtn.onclick = confirmLogout;
    }

    // 设置退出登录取消按钮事件
    const logoutCancelBtn = document.querySelector('button[onclick="closeLogoutConfirm()"]');
    if (logoutCancelBtn) {
        logoutCancelBtn.onclick = closeLogoutConfirm;
    }

    // 设置创建群组弹窗按钮事件
    const createGroupModalBtn = document.querySelector('button[onclick="createNewGroup()"]');
    if (createGroupModalBtn) {
        createGroupModalBtn.onclick = createNewGroup;
    }

    const cancelGroupModalBtn = document.querySelector('button[onclick="closeCreateGroupModal()"]');
    if (cancelGroupModalBtn) {
        cancelGroupModalBtn.onclick = closeCreateGroupModal;
    }
}

// 渲染邀请列表
function renderInvitations() {
    const container = document.getElementById('invitation-list-container');
    const emptyState = document.getElementById('empty-state');

    if (!container) return;

    const oldItems = container.querySelectorAll('.invitation-item');
    oldItems.forEach(el => el.remove());

    if (demoInvitations.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    demoInvitations.forEach((invite, index) => {
        const borderClass = index > 0 ? 'border-t border-gray-200' : '';
        const dateString = new Date(invite.timestamp).toLocaleDateString();

        const inviteElement = document.createElement('div');
        inviteElement.className = `invitation-item flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 ${borderClass} fade-in`;
        inviteElement.innerHTML = `
            <div class="mb-4 sm:mb-0">
                <h3 class="text-base font-semibold text-gray-800 flex items-center">
                    <i class="fa-solid fa-users text-indigo-500 mr-2"></i>
                    ${invite.groupName}
                </h3>
                <p class="text-xs text-gray-500 mt-1 ml-6">
                    邀请人: <span class="font-medium text-gray-600">${invite.inviterName}</span>
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

        // 添加事件监听器
        const acceptBtn = inviteElement.querySelector('.accept-btn');
        const declineBtn = inviteElement.querySelector('.decline-btn');
        
        acceptBtn.onclick = () => handleAccept(invite.id, invite.groupId, invite.groupName);
        declineBtn.onclick = () => handleDecline(invite.id);

        container.appendChild(inviteElement);
    });
}

// 渲染群组列表
function renderGroups() {
    const container = document.getElementById('my-groups-list');
    const emptyState = document.getElementById('groups-empty-state');

    if (!container) return;

    container.innerHTML = '';

    if (demoGroups.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    demoGroups.forEach(group => {
        const owes = group.balance < 0;
        const balance = Math.abs(group.balance).toFixed(2);
        const balanceColor = owes ? 'text-red-400' : 'text-emerald-500';
        const balanceText = owes ? `您欠 ¥${balance}` : `您被欠 ¥${balance}`;

        const groupElement = document.createElement('div');
        groupElement.className = 'group-card bg-white p-5 rounded-xl border border-gray-200 shadow-md hover:bg-gray-50 fade-in';
        groupElement.onclick = () => redirectToGroupDetail(group.id, group.groupName);

        groupElement.innerHTML = `
            <div class="mb-3">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-bold text-gray-900 truncate">${group.groupName}</h3>
                    ${group.isAdmin ? '<span class="admin-badge">管理员</span>' : ''}
                </div>
            </div>
            <p class="text-sm text-gray-500 mb-2">成员: ${group.memberCount} 人</p>
            <div class="flex items-center space-x-2 pt-2 border-t border-gray-100">
                <span class="${balanceColor} font-bold text-base">结余: ${balanceText}</span>
                <svg class="w-5 h-5 ${balanceColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="${owes ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'}"></path>
                </svg>
            </div>
        `;

        container.appendChild(groupElement);
    });
}

// 重定向到群组详情页
function redirectToGroupDetail(groupId, groupName) {
    console.log(`重定向到群组详情页: ${groupName} (ID: ${groupId})`);
    customAlert('重定向提示', `正在跳转到群组 "${groupName}" 的详情页面...\n\n实际应用中这里会重定向到群组详情页。`);
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

// 模拟新邀请
function seedMockInvitations() {
    const newInvite = {
        id: Date.now().toString(),
        groupId: 'group-' + Date.now(),
        groupName: '新群组 ' + new Date().toLocaleTimeString(),
        inviterName: '系统管理员',
        timestamp: Date.now()
    };

    demoInvitations.push(newInvite);
    renderInvitations();
    customAlert('新邀请', '您已收到一条新的群组邀请！');
}

// 接受邀请
function handleAccept(invitationId, groupId, groupName) {
    demoInvitations = demoInvitations.filter(invite => invite.id !== invitationId);

    const newGroup = {
        id: groupId,
        groupId: groupId,
        groupName: groupName,
        balance: 0,
        memberCount: 1,
        isAdmin: false,
        createdBy: '其他人'
    };

    demoGroups.push(newGroup);
    renderInvitations();
    renderGroups();
    customAlert('成功', `已成功接受邀请！您已加入群组 **${groupName}**。`);
}

// 拒绝邀请
function handleDecline(invitationId) {
    demoInvitations = demoInvitations.filter(invite => invite.id !== invitationId);
    renderInvitations();
    customAlert('成功', '已成功拒绝邀请。');
}

// 创建群组
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

function createNewGroup() {
    const groupNameInput = document.getElementById('group-name');
    if (!groupNameInput) return;

    const groupName = groupNameInput.value.trim();

    if (!groupName) {
        customAlert('错误', '请输入群组名称');
        return;
    }

    const newGroup = {
        id: 'group-' + Date.now(),
        groupId: 'group-' + Date.now(),
        groupName: groupName,
        balance: 0,
        memberCount: 1,
        isAdmin: true,
        createdBy: '张三'
    };

    demoGroups.push(newGroup);
    renderGroups();
    closeCreateGroupModal();
    customAlert('成功', `群组 "${groupName}" 创建成功！您是该群组的管理员。`);
}

// 用户菜单功能
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

// 弹窗功能
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

// 占位符处理函数
function handleMyProfile() {
    customAlert('跳转提示', '正在跳转到**我的资料**页面... (功能待实现)');
}

function handleBackToDashboard() {
    customAlert('提示', '您已经在**主页**了。');
}

function handleLogout() {
    showLogoutConfirmation();
}

// 主初始化函数
async function initializePageContent() {
    console.log('开始初始化页面...');
    
    // 1. 获取用户信息
    currentUser = await getCurrentUser();

    // 2. 更新显示
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        userDisplay.textContent = currentUser?.username || '用户';
        console.log('用户名已更新:', userDisplay.textContent);
    }

    // 3. 初始化演示数据和应用
    initializeDemoData();
    initializeApp();

    // 4. 添加点击事件监听器
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
