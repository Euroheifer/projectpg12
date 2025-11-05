/**
 * 成员管理模块
 * 提供群组成员列表、角色管理、成员移除、邀请等功能
 * 基于统一的API基础模块
 */

import { api, Validator, handleAPIError } from './base-api.js';

/**
 * 获取群组成员列表
 * @param {number} groupId - 群组ID
 * @returns {Promise<Array>} 成员列表
 */
export async function getGroupMembers(groupId) {
    try {
        const cleanGroupId = Validator.id(groupId, '群组ID');

        const members = await api.get(`/groups/${cleanGroupId}/members`);
        console.log('获取群组成员列表成功:', members);
        return members;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 更新成员角色
 * @param {number} groupId - 群组ID
 * @param {number} userId - 用户ID
 * @param {string} role - 新角色 (admin/member)
 * @returns {Promise<Object>} 更新结果
 */
export async function updateMemberRole(groupId, userId, role) {
    try {
        const cleanGroupId = Validator.id(groupId, '群组ID');
        const cleanUserId = Validator.id(userId, '用户ID');
        const cleanRole = Validator.string(role, '角色', 10);
        
        if (!['admin', 'member'].includes(cleanRole)) {
            throw new ValidationError('角色必须是admin或member');
        }

        const result = await api.patch(`/groups/${cleanGroupId}/members/${cleanUserId}`, {
            role: cleanRole
        });
        
        console.log('成员角色更新成功:', result);
        return result;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 移除群组成员
 * @param {number} groupId - 群组ID
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 移除结果
 */
export async function removeMember(groupId, userId) {
    try {
        const cleanGroupId = Validator.id(groupId, '群组ID');
        const cleanUserId = Validator.id(userId, '用户ID');

        const result = await api.delete(`/groups/${cleanGroupId}/members/${cleanUserId}`);
        console.log('成员移除成功:', result);
        return result;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 邀请成员加入群组
 * @param {number} groupId - 群组ID
 * @param {string} email - 被邀请人邮箱
 * @param {string} message - 邀请消息
 * @returns {Promise<Object>} 邀请结果
 */
export async function inviteMember(groupId, email, message = '') {
    try {
        const cleanGroupId = Validator.id(groupId, '群组ID');
        const cleanEmail = Validator.email(email, '邮箱地址');
        const cleanMessage = Validator.string(message, '邀请消息', 500);

        const result = await api.post(`/groups/${cleanGroupId}/invite`, {
            invitee_email: cleanEmail,
            message: cleanMessage
        });
        
        console.log('邀请发送成功:', result);
        return result;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 获取群组邀请列表
 * @param {number} groupId - 群组ID
 * @returns {Promise<Array>} 邀请列表
 */
export async function getGroupInvitations(groupId) {
    try {
        const cleanGroupId = Validator.id(groupId, '群组ID');

        const invitations = await api.get(`/groups/${cleanGroupId}/invitations`);
        console.log('获取群组邀请列表成功:', invitations);
        return invitations;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 取消邀请
 * @param {number} groupId - 群组ID
 * @param {number} invitationId - 邀请ID
 * @returns {Promise<Object>} 取消结果
 */
export async function cancelInvitation(groupId, invitationId) {
    try {
        const cleanGroupId = Validator.id(groupId, '群组ID');
        const cleanInvitationId = Validator.id(invitationId, '邀请ID');

        const result = await api.delete(`/groups/${cleanGroupId}/invitations/${cleanInvitationId}`);
        console.log('邀请取消成功:', result);
        return result;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 获取待处理的邀请
 * @returns {Promise<Array>} 待处理邀请列表
 */
export async function getPendingInvitations() {
    try {
        const invitations = await api.get('/invitations/me');
        console.log('获取待处理邀请成功:', invitations);
        return invitations;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 响应邀请
 * @param {number} invitationId - 邀请ID
 * @param {string} action - 动作 (accept/reject)
 * @returns {Promise<Object>} 响应结果
 */
export async function respondToInvitation(invitationId, action) {
    try {
        const cleanInvitationId = Validator.id(invitationId, '邀请ID');
        const cleanAction = Validator.string(action, '动作', 10);
        
        if (!['accept', 'reject'].includes(cleanAction)) {
            throw new ValidationError('动作必须是accept或reject');
        }

        const result = await api.post(`/invitations/${cleanInvitationId}/respond`, {
            action: cleanAction
        });
        
        console.log(`邀请${cleanAction === 'accept' ? '接受' : '拒绝'}成功:`, result);
        return result;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

// UI相关函数

/**
 * 渲染成员列表
 * @param {Array} members - 成员列表数据
 */
export function renderMemberList(members = []) {
    const container = document.getElementById('member-list-container');
    const activeMemberCount = document.getElementById('active-member-count');
    const memberCount = document.getElementById('member-count');

    if (!container) return;

    // 更新计数
    if (activeMemberCount) activeMemberCount.textContent = members.length;
    if (memberCount) memberCount.textContent = members.length;

    // 清空容器
    container.innerHTML = '';

    if (members.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>暂无成员</p>
            </div>
        `;
        return;
    }

    members.forEach(member => {
        try {
            const memberCard = createMemberCard(member);
            container.appendChild(memberCard);
        } catch (error) {
            console.error('渲染成员卡片失败:', error, member);
        }
    });
}

/**
 * 创建成员卡片DOM元素
 * @param {Object} member - 成员数据
 * @returns {HTMLElement} 成员卡片元素
 */
function createMemberCard(member) {
    // 安全的数据处理
    const safeUsername = member.username || member.user?.username || '未知用户';
    const safeEmail = member.email || member.user?.email || '无邮箱';
    const memberId = member.id || member.user_id || member.user?.id;
    
    if (!memberId) {
        throw new Error('成员数据缺少ID信息');
    }

    const isAdmin = member.role === 'admin' || member.is_admin === true;
    const isSelf = parseInt(memberId) === parseInt(window.CURRENT_USER_ID);
    const displayName = safeUsername.replace(/\s*\(.*\)/, '').trim();
    const displayInitial = displayName[0]?.toUpperCase() || '?';
    const balance = member.balance || 0;
    
    // 余额显示逻辑
    let balanceText, balanceColorClass;
    if (balance > 0.01) {
        balanceText = `应收 ¥${balance.toFixed(2)}`;
        balanceColorClass = 'text-success font-semibold';
    } else if (balance < -0.01) {
        balanceText = `欠款 ¥${Math.abs(balance).toFixed(2)}`;
        balanceColorClass = 'text-danger font-semibold';
    } else {
        balanceText = '已结算';
        balanceColorClass = 'text-gray-500';
    }

    const card = document.createElement('div');
    card.className = 'flex items-center justify-between p-4 bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition duration-150';
    
    card.innerHTML = `
        <div class="flex items-center space-x-4 flex-1 min-w-0">
            <div class="w-10 h-10 flex items-center justify-center bg-primary/10 text-primary rounded-full font-bold text-lg flex-shrink-0">
                ${displayInitial}
            </div>
            <div class="min-w-0">
                <p class="text-base font-semibold text-gray-900 truncate flex items-center">
                    ${displayName}
                    ${isAdmin ? '<span class="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full font-medium">管理员</span>' : ''}
                    ${isSelf ? '<span class="ml-2 text-xs bg-gray-400 text-white px-2 py-0.5 rounded-full font-medium">您</span>' : ''}
                </p>
                <p class="text-sm text-gray-500 truncate">${safeEmail}</p>
            </div>
        </div>
        
        <div class="flex items-center space-x-4 flex-shrink-0">
            <span class="text-right text-sm w-28 ${balanceColorClass}">
                ${balanceText}
            </span>
            
            ${window.IS_CURRENT_USER_ADMIN && !isSelf ? `
                <div class="relative">
                    <button onclick="toggleMemberManagementMenu(event, ${memberId})" 
                        class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition duration-150">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                        </svg>
                    </button>
                    
                    <div id="member-menu-${memberId}" 
                        class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 hidden">
                        <button onclick="handleUpdateRole(${memberId}, '${displayName}')" 
                            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition duration-150">
                            ${isAdmin ? '取消管理员' : '设为管理员'}
                        </button>
                        <button onclick="handleRemoveMember(${memberId}, '${displayName}')" 
                            class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition duration-150">
                            移除成员
                        </button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    return card;
}

/**
 * 切换成员管理菜单显示
 * @param {Event} event - 点击事件
 * @param {number} memberId - 成员ID
 */
export function toggleMemberManagementMenu(event, memberId) {
    event.stopPropagation();

    // 关闭所有其他菜单
    document.querySelectorAll('[id^="member-menu-"]').forEach(menu => {
        if (menu.id !== `member-menu-${memberId}`) {
            menu.classList.add('hidden');
        }
    });

    // 切换当前菜单
    const currentMenu = document.getElementById(`member-menu-${memberId}`);
    if (currentMenu) {
        currentMenu.classList.toggle('hidden');
    }
}

/**
 * 处理成员角色更新
 * @param {number} memberId - 成员ID
 * @param {string} memberName - 成员名称
 */
export async function handleUpdateRole(memberId, memberName) {
    // 检查管理员权限
    if (!window.IS_CURRENT_USER_ADMIN) {
        console.error('只有管理员可以更新成员角色');
        return;
    }

    try {
        const members = window.groupMembers || [];
        const member = members.find(m => (m.id || m.user_id) == memberId);
        
        if (!member) {
            console.error('未找到成员信息');
            return;
        }

        const currentRole = member.role === 'admin' ? 'admin' : 'member';
        const newRole = currentRole === 'admin' ? 'member' : 'admin';
        const action = newRole === 'admin' ? '设为管理员' : '取消管理员';

        // 显示确认对话框
        if (typeof window.showCustomAlert === 'function') {
            const confirmed = confirm(`确定要将成员 "${memberName}" ${action}吗？`);
            if (!confirmed) return;
        }

        // 执行角色更新
        await updateMemberRole(window.currentGroupId, memberId, newRole);
        
        // 显示成功消息
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('成功', '成员角色已更新');
        }
        
        // 重新加载成员列表
        if (typeof window.loadMembersList === 'function') {
            await window.loadMembersList();
        }
        
    } catch (error) {
        console.error('更新成员角色失败:', error);
    }
}

/**
 * 处理成员移除
 * @param {number} memberId - 成员ID
 * @param {string} memberName - 成员名称
 */
export async function handleRemoveMember(memberId, memberName) {
    // 检查管理员权限
    if (!window.IS_CURRENT_USER_ADMIN) {
        console.error('只有管理员可以移除成员');
        return;
    }

    try {
        // 显示确认对话框
        if (typeof window.showCustomAlert === 'function') {
            const confirmed = confirm(`确定要将成员 "${memberName}" 从群组中移除吗？`);
            if (!confirmed) return;
        }

        // 执行成员移除
        await removeMember(window.currentGroupId, memberId);
        
        // 显示成功消息
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('成功', '成员已移除');
        }
        
        // 重新加载成员列表
        if (typeof window.loadMembersList === 'function') {
            await window.loadMembersList();
        }
        
    } catch (error) {
        console.error('移除成员失败:', error);
    }
}

/**
 * 清空邀请表单
 */
export function clearInviteForm() {
    const emailInput = document.getElementById('invite-user-email-input');
    if (emailInput) {
        emailInput.value = '';
    }
}

/**
 * 处理邀请新成员
 * @param {Event} event - 表单提交事件
 */
export async function handleInviteMember(event) {
    event.preventDefault();
    
    const emailInput = document.getElementById('invite-user-email-input');
    if (!emailInput) {
        console.error('未找到邮箱输入框');
        return;
    }
    
    const email = emailInput.value.trim();
    
    if (!email) {
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('错误', '请输入邮箱地址');
        }
        return;
    }
    
    try {
        await inviteMember(window.currentGroupId, email);
        
        // 清空表单
        clearInviteForm();
        
        // 显示成功消息
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('成功', '邀请已发送');
        }
        
    } catch (error) {
        console.error('邀请成员失败:', error);
    }
}

/**
 * 处理接受邀请
 * @param {number} invitationId - 邀请ID
 */
export async function handleAcceptInvitation(invitationId) {
    try {
        await respondToInvitation(invitationId, 'accept');
        
        // 显示成功消息并刷新页面
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('成功', '已成功加入群组！');
        }
        
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('接受邀请失败:', error);
    }
}

/**
 * 处理拒绝邀请
 * @param {number} invitationId - 邀请ID
 */
export async function handleDeclineInvitation(invitationId) {
    try {
        await respondToInvitation(invitationId, 'reject');
        
        // 显示成功消息并刷新页面
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('成功', '已拒绝邀请');
        }
        
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('拒绝邀请失败:', error);
    }
}

// 全局函数暴露
if (typeof window !== 'undefined') {
    // 核心API函数
    window.getGroupMembers = getGroupMembers;
    window.updateMemberRole = updateMemberRole;
    window.removeMember = removeMember;
    window.inviteMember = inviteMember;
    window.getPendingInvitations = getPendingInvitations;
    window.respondToInvitation = respondToInvitation;
    
    // UI函数
    window.renderMemberList = renderMemberList;
    window.toggleMemberManagementMenu = toggleMemberManagementMenu;
    window.handleUpdateRole = handleUpdateRole;
    window.handleRemoveMember = handleRemoveMember;
    window.clearInviteForm = clearInviteForm;
    window.handleInviteMember = handleInviteMember;
    window.handleAcceptInvitation = handleAcceptInvitation;
    window.handleDeclineInvitation = handleDeclineInvitation;
    
    console.log('成员管理模块已加载，所有函数已暴露到全局');
}

export default {
    getGroupMembers,
    updateMemberRole,
    removeMember,
    inviteMember,
    getGroupInvitations,
    cancelInvitation,
    getPendingInvitations,
    respondToInvitation,
    renderMemberList,
    toggleMemberManagementMenu,
    handleUpdateRole,
    handleRemoveMember,
    clearInviteForm,
    handleInviteMember,
    handleAcceptInvitation,
    handleDeclineInvitation
};
