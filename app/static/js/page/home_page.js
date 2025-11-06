// file: app/static/js/page/home_page.js
import { createNewGroup, handleCreateGroup, closeCreateGroupModal, getUserGroups } from '../api/groups.js';
import { acceptInvitation, declineInvitation, getPendingInvitations } from '../api/invitations.js';
import { getAuthToken } from '../ui/utils.js';

// 当前用户信息
let currentUser = null;

// 页面初始化 - 获取并渲染数据
async function initializeHomePage() {
    console.log('开始初始化主页...');

    // 获取当前用户信息
    await getCurrentUserInfo();

    // 获取并渲染数据
    await loadAndRenderData();

    // 绑定事件监听器
    bindEventListeners();

    console.log('主页初始化完成');
}

// 获取当前用户信息 - 使用正确的API端点
async function getCurrentUserInfo() {
    try {
        const token = getAuthToken();
        if (!token) {
            console.warn('未找到认证token');
            return;
        }

        console.log('正在从API获取用户信息...');
        const response = await fetch('/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            currentUser = await response.json();
            console.log('从API获取的用户信息:', currentUser);

        } else {
            console.error('获取用户信息失败，状态码:', response.status);
            const errorText = await response.text();
            console.error('错误信息:', errorText);
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
    }
}

// 获取并渲染数据
async function loadAndRenderData() {
    try {
        console.log('开始加载数据...');
        
        // 并行获取群组和邀请数据
        const [groups, invitations] = await Promise.all([
            getUserGroups().catch(error => {
                console.error('获取群组数据失败:', error);
                return [];
            }),
            getPendingInvitations().catch(error => {
                console.error('获取邀请数据失败:', error);
                return [];
            })
        ]);

        console.log('获取到的数据:', { groups, invitations });
        console.log('当前用户信息:', currentUser);
        
        // 确保数据是数组
        const groupsArray = Array.isArray(groups) ? groups : [];
        const invitationsArray = Array.isArray(invitations) ? invitations : [];
        
        console.log('处理后的数据:', { 
            groupsCount: groupsArray.length, 
            invitationsCount: invitationsArray.length 
        });

        // 检查群组数据结构
        if (groupsArray.length > 0) {
            console.log('第一个群组的完整数据结构:', groupsArray[0]);
        }
        
        // 检查邀请数据结构
        if (invitationsArray.length > 0) {
            console.log('第一个邀请的完整数据结构:', invitationsArray[0]);
        }

        // 渲染数据到页面
        renderGroups(groupsArray);
        renderInvitations(invitationsArray);

    } catch (error) {
        console.error('加载数据失败:', error);
        showErrorStates();
    }
}

// 渲染群组列表 - 修复版本
function renderGroups(groups) {
    const container = document.getElementById('my-groups-list');
    if (!container) return;

    console.log('渲染群组数据:', groups);

    if (!groups || groups.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center p-8 text-gray-500 bg-gray-50 rounded-lg">
                <i class="fa-solid fa-users text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-lg font-medium text-gray-600 mb-2">还没有加入任何群组</h3>
                <p class="text-sm text-gray-500 mb-4">创建或接受邀请来开始管理群组费用</p>
                <button onclick="handleCreateGroup()"
                    class="inline-flex items-center space-x-1 py-2 px-4 rounded-lg text-white bg-emerald-500 hover:bg-emerald-600 transition duration-150">
                    <i class="fa-solid fa-plus w-4 h-4"></i>
                    <span>创建第一个群组</span>
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = groups.map(group => {
        console.log('处理群组:', group);

        // 计算结余信息 - 修复版本
        const balance = group.balance || group.user_balance || 0;
        const owes = balance < 0;
        const balanceAmount = Math.abs(balance).toFixed(2);
        const balanceColor = owes ? 'text-red-400' : 'text-emerald-500';
        const balanceText = owes ? `您欠 ¥${balanceAmount}` : `您被欠 ¥${balanceAmount}`;

        // 判断是否是管理员 - 修复版本
        let isAdmin = false;
        if (group.is_admin !== undefined) {
            isAdmin = group.is_admin;
        } else if (group.admin_id && currentUser && currentUser.id) {
            isAdmin = group.admin_id === currentUser.id;
        } else if (group.role === 'admin') {
            isAdmin = true;
        }

        console.log(`群组 ${group.name} 的管理员状态:`, {
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
        const description = group.description || group.group_description || '暂无描述';

        // 安全处理群组名称
        const safeGroupName = group.name || group.group_name || '未命名群组';
        const safeGroupId = group.id || group.group_id || '未知';

        return `
        <div class="group-card bg-white p-5 rounded-xl border border-gray-200 shadow-md hover:bg-gray-50 fade-in"
             onclick="redirectToGroupDetail(${safeGroupId}, '${safeGroupName.replace(/'/g, "\\'")}')">
            <div class="mb-3">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-bold text-gray-900 truncate">${safeGroupName}</h3>
                    ${isAdmin ? '<span class="admin-badge">管理员</span>' : ''}
                </div>
            </div>
            <!-- 添加群组描述 -->
            <p class="text-sm text-gray-500 mb-2 line-clamp-2">${description}</p>
            <p class="text-sm text-gray-500 mb-2">成员: ${memberCount} 人</p>
            <div class="flex items-center space-x-2 pt-2 border-t border-gray-100">
                <span class="${balanceColor} font-bold text-base">结余: ${balanceText}</span>
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
        console.error('找不到邀请列表容器元素: invitation-list-container');
        return;
    }

    console.log('开始渲染邀请数据:', invitations);
    console.log('数据类型:', typeof invitations);
    console.log('是否为数组:', Array.isArray(invitations));
    console.log('邀请数量:', invitations ? invitations.length : '邀请数据为空');

    if (!invitations || invitations.length === 0) {
        console.log('没有邀请数据，显示空状态');
        container.innerHTML = `
            <div class="text-center p-6 text-gray-500">
                <i class="fa-solid fa-inbox text-5xl text-gray-300 mb-3"></i>
                <p class="mt-2">您当前没有待处理的邀请。</p>
            </div>
        `;
        return;
    }

    console.log('开始渲染', invitations.length, '个邀请');
    
    try {
        container.innerHTML = invitations.map((invitation, index) => {
            console.log(`处理第 ${index + 1} 个邀请:`, invitation);
            
            // 安全获取邀请数据
            const invitationId = invitation.id || invitation.invitation_id;
            const groupName = invitation.group?.name || invitation.group_name || invitation.group?.group_name || '未知群组';
            const inviterName = invitation.inviter?.username || invitation.inviter_name || invitation.inviter?.name || '未知用户';
            const groupId = invitation.group?.id || invitation.group_id;
            
            if (!invitationId) {
                console.warn('邀请数据缺少ID，跳过:', invitation);
                return `
                    <div class="bg-red-50 border border-red-200 p-4 mb-3 rounded-lg">
                        <p class="text-red-600">邀请数据格式错误，缺少ID</p>
                        <pre class="text-xs text-red-500 mt-2">${JSON.stringify(invitation, null, 2)}</pre>
                    </div>
                `;
            }

            console.log(`邀请 ${invitationId} 解析结果:`, { groupName, inviterName, groupId });

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
                    邀请人: 
                    ${inviterName}
                </p>
                <div class="flex space-x-2">
                    <button class="accept-invitation-btn flex-1 py-2 px-3 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition duration-150 flex items-center justify-center space-x-1">
                        <i class="fa-solid fa-check w-3 h-3"></i>
                        <span>接受邀请</span>
                    </button>
                    <button class="decline-invitation-btn flex-1 py-2 px-3 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition duration-150 flex items-center justify-center space-x-1">
                        <i class="fa-solid fa-times w-3 h-3"></i>
                        <span>拒绝</span>
                    </button>
                </div>
            </div>
            `;
        }).join('');

        console.log('邀请渲染完成，绑定事件处理...');
        
        // 绑定接受/拒绝邀请的事件处理
        bindInvitationEvents();
        
    } catch (error) {
        console.error('渲染邀请时发生错误:', error);
        container.innerHTML = `
            <div class="text-center p-6 text-red-500">
                <i class="fa-solid fa-exclamation-triangle text-3xl mb-3"></i>
                <p>渲染邀请列表时发生错误</p>
                <p class="text-sm text-red-400 mt-1">${error.message}</p>
                <button onclick="loadAndRenderData()" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    重新加载
                </button>
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
                console.log('接受邀请:', invitationId);
                handleAcceptInvitation(parseInt(invitationId), invitationCard);
            }
        }

        if (event.target.closest('.decline-invitation-btn')) {
            event.preventDefault();
            const invitationCard = event.target.closest('.invitation-card');
            const invitationId = invitationCard?.dataset.invitationId;
            if (invitationId) {
                console.log('拒绝邀请:', invitationId);
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

        console.log('开始接受邀请:', invitationId);
        
        // 调用接受邀请API
        await acceptInvitation(invitationId);
        
        // 显示成功消息
        showNotification('邀请已接受', 'success');
        
        // 刷新数据
        await loadAndRenderData();
        
    } catch (error) {
        console.error('接受邀请失败:', error);
        showNotification(error.message || '接受邀请失败，请重试', 'error');
        
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

        console.log('开始拒绝邀请:', invitationId);
        
        // 调用拒绝邀请API
        await declineInvitation(invitationId);
        
        // 显示成功消息
        showNotification('已拒绝邀请', 'info');
        
        // 刷新数据
        await loadAndRenderData();
        
    } catch (error) {
        console.error('拒绝邀请失败:', error);
        showNotification(error.message || '拒绝邀请失败，请重试', 'error');
        
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
                <p>加载群组失败，请刷新页面重试</p>
                <button onclick="loadAndRenderData()" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    重新加载
                </button>
            </div>
        `;
    }

    if (invitesContainer) {
        invitesContainer.innerHTML = `
            <div class="text-center p-6 text-red-500">
                <i class="fa-solid fa-exclamation-triangle text-3xl mb-3"></i>
                <p>加载邀请失败，请刷新页面重试</p>
                <button onclick="loadAndRenderData()" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    重新加载
                </button>
            </div>
        `;
    }
}

// 绑定事件监听器
function bindEventListeners() {
    console.log('绑定事件监听器...');

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
            console.log('定期刷新主页数据...');
            await loadAndRenderData();
        }
    }, 30000); // 每30秒刷新一次

    console.log('事件监听器绑定完成');
}

// 重定向到群组详情页
function redirectToGroupDetail(groupId, groupName) {
    console.log(`重定向到群组详情页: ${groupName} (ID: ${groupId})`);
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

console.log('主页模块已加载，所有函数已暴露到全局');
