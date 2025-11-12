// file: app/static/js/page/home_page.js
import { createNewGroup, handleCreateGroup, closeCreateGroupModal, getUserGroups } from '../api/groups.js';
import { acceptInvitation, declineInvitation, getPendingInvitations } from '../api/invitations.js';
import { getAuthToken } from '../ui/utils.js';

// 当前用户信息
let currentUser = null;

// 页面初始化 - 获取并渲染数据
async function initializeHomePage() {
    console.log('Starting home page initialization...'); // Translated

    // 获取当前用户信息
    await getCurrentUserInfo();

    // 获取并渲染数据
    await loadAndRenderData();

    // 绑定事件监听器
    bindEventListeners();

    console.log('Home page initialization complete'); // Translated
}

// 获取当前用户信息 - 使用正确的API端点
async function getCurrentUserInfo() {
    try {
        const token = getAuthToken();
        if (!token) {
            console.warn('Authentication token not found'); // Translated
            return;
        }

        console.log('Fetching user info from API...'); // Translated
        const response = await fetch('/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            currentUser = await response.json();
            console.log('User info from API:', currentUser); // Translated

        } else {
            console.error('Failed to fetch user info, status code:', response.status); // Translated
            const errorText = await response.text();
            console.error('Error message:', errorText); // Translated
        }
    } catch (error) {
        console.error('Failed to fetch user info:', error); // Translated
    }
}

// 获取并渲染数据
async function loadAndRenderData() {
    try {
        console.log('Starting to load data...'); // Translated
        
        // 并行获取群组和邀请数据
        const [groups, invitations] = await Promise.all([
            getUserGroups().catch(error => {
                console.error('Failed to get group data:', error); // Translated
                return [];
            }),
            getPendingInvitations().catch(error => {
                console.error('Failed to get invitation data:', error); // Translated
                return [];
            })
        ]);

        console.log('Fetched data:', { groups, invitations }); // Translated
        console.log('Current user info:', currentUser); // Translated
        
        // 确保数据是数组
        const groupsArray = Array.isArray(groups) ? groups : [];
        const invitationsArray = Array.isArray(invitations) ? invitations : [];
        
        console.log('Processed data:', { // Translated
            groupsCount: groupsArray.length, 
            invitationsCount: invitationsArray.length 
        });

        // 检查群组数据结构
        if (groupsArray.length > 0) {
            console.log('First group full data structure:', groupsArray[0]); // Translated
        }
        
        // 检查邀请数据结构
        if (invitationsArray.length > 0) {
            console.log('First invitation full data structure:', invitationsArray[0]); // Translated
        }

        // 渲染数据到页面
        renderGroups(groupsArray);
        renderInvitations(invitationsArray);

    } catch (error) {
        console.error('Failed to load data:', error); // Translated
        showErrorStates();
    }
}

// 渲染群组列表 - 修复版本
function renderGroups(groups) {
    const container = document.getElementById('my-groups-list');
    if (!container) return;

    console.log('Rendering group data:', groups); // Translated

    if (!groups || groups.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center p-8 text-gray-500 bg-gray-50 rounded-lg">
                <i class="fa-solid fa-users text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-lg font-medium text-gray-600 mb-2">You haven't joined any groups yet</h3> <!-- Translated -->
                <p class="text-sm text-gray-500 mb-4">Create a group or accept an invitation to start managing expenses</p> <!-- Translated -->
                <button onclick="handleCreateGroup()"
                    class="inline-flex items-center space-x-1 py-2 px-4 rounded-lg text-white bg-emerald-500 hover:bg-emerald-600 transition duration-150">
                    <i class="fa-solid fa-plus w-4 h-4"></i>
                    <span>Create your first group</span> <!-- Translated -->
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = groups.map(group => {
        console.log('Processing group:', group); // Translated

        // 计算结余信息 - 修复版本
        const balance = group.balance || group.user_balance || 0;
        const owes = balance < 0;
        const balanceAmount = Math.abs(balance).toFixed(2);
        const balanceColor = owes ? 'text-red-400' : 'text-emerald-500';
        const balanceText = owes ? `You owe ¥${balanceAmount}` : `You are owed ¥${balanceAmount}`; // Translated

        // 判断是否是管理员 - 修复版本
        let isAdmin = false;
        if (group.is_admin !== undefined) {
            isAdmin = group.is_admin;
        } else if (group.admin_id && currentUser && currentUser.id) {
            isAdmin = group.admin_id === currentUser.id;
        } else if (group.role === 'admin') {
            isAdmin = true;
        }

        console.log(`Group ${group.name} admin status:`, { // Translated
            isAdmin,
            groupAdminId: group.admin_id,
            currentUserId: currentUser?.id,
            groupRole: group.role,
            groupIsAdmin: group.is_admin
        });

        // 获取成员数量 - 修复版本
        let memberCount = '0';
        if (group.member_count !== undefined) {
            memberCount = group.member_count.toString();
        } else if (group.members && Array.isArray(group.members)) {
            memberCount = group.members.length.toString();
        } else if (group.member_count !== undefined) {
            memberCount = group.member_count.toString();
        }

        // 获取群组描述 - 修复版本
        const description = group.description || group.group_description || 'No description provided'; // Translated

        // 安全处理群组名称
        const safeGroupName = group.name || group.group_name || 'Unnamed Group'; // Translated
        const safeGroupId = group.id || group.group_id || 'Unknown'; // Translated

        return `
        <div class="group-card bg-white p-5 rounded-xl border border-gray-200 shadow-md hover:bg-gray-50 fade-in"
             onclick="redirectToGroupDetail(${safeGroupId}, '${safeGroupName.replace(/'/g, "\\'")}')">
            <div class="mb-3">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-bold text-gray-900 truncate">${safeGroupName}</h3>
                    ${isAdmin ? '<span class="admin-badge">Admin</span>' : ''} <!-- Translated -->
                </div>
            </div>
            <!-- 添加群组描述 -->
            <p class="text-sm text-gray-500 mb-2 line-clamp-2">${description}</p>
            <p class="text-sm text-gray-500 mb-2">Members: ${memberCount}</p> <!-- Translated -->
            <div class="flex items-center space-x-2 pt-2 border-t border-gray-100">
                <span class="${balanceColor} font-bold text-base">Balance: ${balanceText}</span> <!-- Translated -->
                <svg class="w-5 h-5 ${balanceColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="${owes ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'}"></path>
                </svg>
            </div>
        </div>
        `;
    }).join('');
}

// 渲染邀请列表 - 修复版本
function renderInvitations(invitations) {
    const container = document.getElementById('invitation-list-container');
    if (!container) {
        console.error('Could not find invitation list container element: invitation-list-container'); // Translated
        return;
    }

    console.log('Start rendering invitation data:', invitations); // Translated
    console.log('Data type:', typeof invitations); // Translated
    console.log('Is Array:', Array.isArray(invitations)); // Translated
    console.log('Invitation count:', invitations ? invitations.length : 'Invitation data is empty'); // Translated

    if (!invitations || invitations.length === 0) {
        console.log('No invitation data, showing empty state'); // Translated
        container.innerHTML = `
            <div class="text-center p-6 text-gray-500">
                <i class="fa-solid fa-inbox text-5xl text-gray-300 mb-3"></i>
                <p class="mt-2">You have no pending invitations.</p> <!-- Translated -->
            </div>
        `;
        return;
    }

    console.log('Start rendering', invitations.length, 'invitations'); // Translated
    
    try {
        container.innerHTML = invitations.map((invitation, index) => {
            console.log(`Processing invitation ${index + 1}:`, invitation); // Translated
            
            // 安全获取邀请数据
            const invitationId = invitation.id || invitation.invitation_id;
            const groupName = invitation.group?.name || invitation.group_name || invitation.group?.group_name || 'Unknown Group'; // Translated
            const inviterName = invitation.inviter?.username || invitation.inviter_name || invitation.inviter?.name || 'Unknown User'; // Translated
            const groupId = invitation.group?.id || invitation.group_id;
            
            if (!invitationId) {
                console.warn('Invitation data missing ID, skipping:', invitation); // Translated
                return `
                    <div class="bg-red-50 border border-red-200 p-4 mb-3 rounded-lg">
                        <p class="text-red-600">Invitation data format error, missing ID</p> <!-- Translated -->
                        <pre class="text-xs text-red-500 mt-2">${JSON.stringify(invitation, null, 2)}</pre>
                    </div>
                `;
            }

            console.log(`Invitation ${invitationId} parsed result:`, { groupName, inviterName, groupId }); // Translated

            return `
            <div class="invitation-card bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm hover:shadow-md transition duration-200"
                data-invitation-id="${invitationId}">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-medium text-gray-800 text-lg">
                        ${groupName}
                    </h4>
                </div>
                <p class="text-sm text-gray-600 mb-3">
                    <i class="fa-solid fa-user-tag mr-1"></i>
                    Invited by: 
                    ${inviterName}
                </p> <!-- Translated -->
                <div class="flex space-x-2">
                    <button class="accept-invitation-btn flex-1 py-2 px-3 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition duration-150 flex items-center justify-center space-x-1">
                        <i class="fa-solid fa-check w-3 h-3"></i>
                        <span>Accept Invite</span> <!-- Translated -->
                    </button>
                    <button class="decline-invitation-btn flex-1 py-2 px-3 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition duration-150 flex items-center justify-center space-x-1">
                        <i class="fa-solid fa-times w-3 h-3"></i>
                        <span>Decline</span> <!-- Translated -->
                    </button>
                </div>
            </div>
            `;
        }).join('');

        console.log('Invitation rendering complete, binding events...'); // Translated
        
        // 绑定接受/拒绝邀请的事件处理
        bindInvitationEvents();
        
    } catch (error) {
        console.error('Error while rendering invitations:', error); // Translated
        container.innerHTML = `
            <div class="text-center p-6 text-red-500">
                <i class="fa-solid fa-exclamation-triangle text-3xl mb-3"></i>
                <p>An error occurred while rendering the invitation list</p> <!-- Translated -->
                <p class="text-sm text-red-400 mt-1">${error.message}</p>
                <button onclick="loadAndRenderData()" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Reload
                </button> <!-- Translated -->
            </div>
        `;
    }
}

/**
 * 绑定邀请事件处理 - 新增函数
 */
function bindInvitationEvents() {
    // 使用事件委托处理接受邀请
    document.addEventListener('click', function(event) {
        if (event.target.closest('.accept-invitation-btn')) {
            event.preventDefault();
            const invitationCard = event.target.closest('.invitation-card');
            const invitationId = invitationCard?.dataset.invitationId;
            if (invitationId) {
                console.log('Accepting invitation:', invitationId); // Translated
                handleAcceptInvitation(parseInt(invitationId), invitationCard);
            }
        }

        if (event.target.closest('.decline-invitation-btn')) {
            event.preventDefault();
            const invitationCard = event.target.closest('.invitation-card');
            const invitationId = invitationCard?.dataset.invitationId;
            if (invitationId) {
                console.log('Declining invitation:', invitationId); // Translated
                handleDeclineInvitation(parseInt(invitationId), invitationCard);
            }
        }
    });
}

/**
 * 处理接受邀请 - 新增函数
 */
async function handleAcceptInvitation(invitationId, invitationCard) {
    try {
        // 禁用按钮，防止重复点击
        const buttons = invitationCard.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);

        console.log('Starting to accept invitation:', invitationId); // Translated
        
        // 调用接受邀请API
        await acceptInvitation(invitationId);
        
        // 显示成功消息
        showNotification('Invitation accepted', 'success'); // Translated
        
        // 刷新数据
        await loadAndRenderData();
        
    } catch (error) {
        console.error('Failed to accept invitation:', error); // Translated
        showNotification(error.message || 'Failed to accept invitation, please try again', 'error'); // Translated
        
        // 恢复按钮状态
        const buttons = invitationCard.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = false);
    }
}

/**
 * 处理拒绝邀请 - 新增函数
 */
async function handleDeclineInvitation(invitationId, invitationCard) {
    try {
        // 禁用按钮，防止重复点击
        const buttons = invitationCard.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);

        console.log('Starting to decline invitation:', invitationId); // Translated
        
        // 调用拒绝邀请API
        await declineInvitation(invitationId);
        
        // 显示成功消息
        showNotification('Invitation declined', 'info'); // Translated
        
        // 刷新数据
        await loadAndRenderData();
        
    } catch (error) {
        console.error('Failed to decline invitation:', error); // Translated
        showNotification(error.message || 'Failed to decline invitation, please try again', 'error'); // Translated
        
        // 恢复按钮状态
        const buttons = invitationCard.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = false);
    }
}

/**
 * 显示通知 - 新增函数
 */
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// 显示错误状态（可移除）
function showErrorStates() {
    const groupsContainer = document.getElementById('my-groups-list');
    const invitesContainer = document.getElementById('invitation-list-container');

    if (groupsContainer) {
        groupsContainer.innerHTML = `
            <div class="col-span-full text-center p-6 text-red-500">
                <i class="fa-solid fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load groups, please refresh the page and try again</p> <!-- Translated -->
                <button onclick="loadAndRenderData()" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Reload
                </button> <!-- Translated -->
            </div>
        `;
    }

    if (invitesContainer) {
        invitesContainer.innerHTML = `
            <div class="text-center p-6 text-red-500">
                <i class="fa-solid fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load invitations, please refresh the page and try again</p> <!-- Translated -->
                <button onclick="loadAndRenderData()" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Reload
                </button> <!-- Translated -->
            </div>
        `;
    }
}

// 绑定事件监听器
function bindEventListeners() {
    console.log('Binding event listeners...'); // Translated

    // 模态框相关事件
    const createGroupModal = document.getElementById('create-group-modal');
    const groupNameInput = document.getElementById('group-name');

    if (createGroupModal) {
        createGroupModal.addEventListener('click', function (event) {
            if (event.target === createGroupModal) {
                closeCreateGroupModal();
            }
        });

        if (groupNameInput) {
            groupNameInput.addEventListener('keypress', function (event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    createNewGroup();
                }
            });
        }

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !createGroupModal.classList.contains('hidden')) {
                closeCreateGroupModal();
            }
        });
    }

    // 自动刷新数据（可选）
    setInterval(async () => {
        // 只在用户活跃时刷新
        if (document.visibilityState === 'visible') {
            console.log('Periodically refreshing home page data...'); // Translated
            await loadAndRenderData();
        }
    }, 30000); // 每30秒刷新一次

    console.log('Event listeners bound'); // Translated
}

// 重定向到群组详情页
function redirectToGroupDetail(groupId, groupName) {
    console.log(`Redirecting to group detail page: ${groupName} (ID: ${groupId})`); // Translated
    window.location.href = `/groups/${groupId}`;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function () {
    initializeHomePage();
});

// 暴露函数到全局，供onclick使用
window.redirectToGroupDetail = redirectToGroupDetail;

// 暴露数据加载函数
window.loadAndRenderData = loadAndRenderData;

console.log('Home page module loaded, all functions exposed to global scope'); // Translated