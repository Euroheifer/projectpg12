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
        // 并行获取群组和邀请数据
        const [groups, invitations] = await Promise.all([
            getUserGroups(),
            getPendingInvitations()
        ]);

        console.log('获取到的数据:', { groups, invitations });
        console.log('当前用户信息:', currentUser);

        // 检查群组数据结构
        if (groups && groups.length > 0) {
            console.log('第一个群组的完整数据结构:', groups[0]);
        }

        // 渲染数据到页面
        renderGroups(groups);
        renderInvitations(invitations);

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

        // 计算结余信息 - 暂时使用占位数据
        const balance = group.balance || 0;
        const owes = balance < 0;
        const balanceAmount = Math.abs(balance).toFixed(2);
        const balanceColor = owes ? 'text-red-400' : 'text-emerald-500';
        const balanceText = owes ? `您欠 ¥${balanceAmount}` : `您被欠 ¥${balanceAmount}`;

        // 判断是否是管理员
        let isAdmin = false;
        if (group.is_admin !== undefined) {
            isAdmin = group.is_admin;
        } else if (group.admin_id && currentUser && currentUser.id) {
            isAdmin = group.admin_id === currentUser.id;
        }

        console.log(`群组 ${group.name} 的管理员状态:`, {
            isAdmin,
            groupAdminId: group.admin_id,
            currentUserId: currentUser?.id
        });

        // 获取成员数量 - 从你的数据结构看，可能需要从其他地方获取
        let memberCount = '0';
        if (group.member_count !== undefined) {
            memberCount = group.member_count.toString();
        } else if (group.members && Array.isArray(group.members)) {
            memberCount = group.members.length.toString();
        }

        // 获取群组描述
        const description = group.description || '暂无描述';

        return `
        <div class="group-card bg-white p-5 rounded-xl border border-gray-200 shadow-md hover:bg-gray-50 fade-in"
             onclick="redirectToGroupDetail(${group.id}, '${group.name.replace(/'/g, "\\'")}')">
            <div class="mb-3">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-bold text-gray-900 truncate">${group.name}</h3>
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
// 渲染邀请列表
function renderInvitations(invitations) {
    const container = document.getElementById('invitation-list-container');
    if (!container) return;

    if (!invitations || invitations.length === 0) {
        container.innerHTML = `
            <div class="text-center p-6 text-gray-500">
                <i class="fa-solid fa-inbox text-5xl text-gray-300 mb-3"></i>
                <p class="mt-2">您当前没有待处理的邀请。</p>
            </div>
        `;
        return;
    }

    container.innerHTML = invitations.map(invitation => `
        <div class="invitation-card bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm hover:shadow-md transition duration-200"
            data-invitation-id="${invitation.id}">
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-medium text-gray-800 text-lg">
                    ${invitation.group ? invitation.group.name : invitation.group_name || '未知群组'}
                </h4>
            </div>
            <p class="text-sm text-gray-600 mb-3">
                <i class="fa-solid fa-user-tag mr-1"></i>
                邀请人: 
                ${invitation.inviter ? invitation.inviter.username : invitation.inviter_name || '未知用户'}
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
    `).join('');
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
            </div>
        `;
    }

    if (invitesContainer) {
        invitesContainer.innerHTML = `
            <div class="text-center p-6 text-red-500">
                <i class="fa-solid fa-exclamation-triangle text-3xl mb-3"></i>
                <p>加载邀请失败，请刷新页面重试</p>
            </div>
        `;
    }
}

// 绑定事件监听器
function bindEventListeners() {
    console.log('绑定事件监听器...');

    // 接受/拒绝邀请按钮 - 事件委托
    document.addEventListener('click', function (event) {
        if (event.target.closest('.accept-invitation-btn')) {
            const invitationCard = event.target.closest('.invitation-card');
            const invitationId = invitationCard?.dataset.invitationId;
            if (invitationId) {
                console.log('接受邀请:', invitationId);
                acceptInvitation(parseInt(invitationId));
            }
        }

        if (event.target.closest('.decline-invitation-btn')) {
            const invitationCard = event.target.closest('.invitation-card');
            const invitationId = invitationCard?.dataset.invitationId;
            if (invitationId) {
                console.log('拒绝邀请:', invitationId);
                declineInvitation(parseInt(invitationId));
            }
        }
    });

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