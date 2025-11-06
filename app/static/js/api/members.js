// member_management.js - 成员管理、邀请、角色设置
import { requireAdmin, isValidEmail } from '../ui/utils.js';
// --- 全局状态 ---

// 成员管理状态
let memberToRemove = null;
let memberToUpdateRole = null;

/* export function renderMemberList() {
    const container = document.getElementById('member-list-container');
    const activeMemberCount = document.getElementById('active-member-count');
    const memberCount = document.getElementById('member-count');

    if (!container) return;

    container.innerHTML = '';

    if (activeMemberCount) activeMemberCount.textContent = window.groupMembers.length;
    if (memberCount) memberCount.textContent = window.groupMembers.length;

    window.groupMembers.forEach(member => {
        const isAdmin = member.role === 'admin';
        const isSelf = member.id === window.CURRENT_USER_ID;
        const displayName = member.username.replace(/\s*\(.*\)/, '').trim();

        let balanceText;
        let balanceColorClass;

        if (member.balance > 0.01) {
            balanceText = `应收 ¥${member.balance.toFixed(2)}`;
            balanceColorClass = 'text-success font-semibold';
        } else if (member.balance < -0.01) {
            balanceText = `欠款 ¥${Math.abs(member.balance).toFixed(2)}`;
            balanceColorClass = 'text-danger font-semibold';
        } else {
            balanceText = '已结算';
            balanceColorClass = 'text-gray-500';
        }

        const memberCard = document.createElement('div');
        memberCard.className = 'flex items-center justify-between p-4 bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition duration-150';
        memberCard.innerHTML = `
            <div class="flex items-center space-x-4 flex-1 min-w-0">
                <div class="w-10 h-10 flex items-center justify-center bg-primary/10 text-primary rounded-full font-bold text-lg flex-shrink-0">
                    ${displayName[0]}
                </div>
                <div class="min-w-0">
                    <p class="text-base font-semibold text-gray-900 truncate flex items-center">
                        ${displayName}
                        ${isAdmin ? '<span class="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full font-medium">管理员</span>' : ''}
                        ${isSelf ? '<span class="ml-2 text-xs bg-gray-400 text-white px-2 py-0.5 rounded-full font-medium">您</span>' : ''}
                    </p>
                    <p class="text-sm text-gray-500 truncate">${member.email}</p>
                </div>
            </div>
            
            <div class="flex items-center space-x-4 flex-shrink-0">
                <span class="text-right text-sm w-28 ${balanceColorClass}">
                    ${balanceText}
                </span>
                
                ${window.IS_CURRENT_USER_ADMIN && parseInt(member.id) !== parseInt(window.CURRENT_USER_ID) ? `
                    <div class="relative">
                        <button onclick="toggleMemberManagementMenu(event, ${member.id})" 
                            class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition duration-150">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                            </svg>
                        </button>
                        
                        <div id="member-menu-${member.id}" 
                            class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 hidden">
                            <button onclick="handleUpdateRole(${member.id}, '${displayName}')" 
                                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition duration-150">
                                ${isAdmin ? '取消管理员' : '设为管理员'}
                            </button>
                            <button onclick="handleRemoveMember(${member.id}, '${displayName}')" 
                                class="w-full text-left px-4 py-2 text-sm text-danger hover:bg-red-50 transition duration-150">
                                移除成员
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        container.appendChild(memberCard);
    });

    // 如果没有成员，显示空状态
    if (window.groupMembers.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>暂无成员</p>
            </div>
        `;
    }
} */

// /static/js/api/members.js

export function renderMemberList() {
    const container = document.getElementById('member-list-container');
    const activeMemberCount = document.getElementById('active-member-count');
    const memberCount = document.getElementById('member-count');

    if (!container) return;

    container.innerHTML = '';

    if (activeMemberCount) activeMemberCount.textContent = window.groupMembers.length;
    if (memberCount) memberCount.textContent = window.groupMembers.length;

    window.groupMembers.forEach(member => {
        // --- 修复开始 ---
        // 检查 member.username 是否存在，如果不存在，则提供一个备用名称
        const safeUsername = member.username || '未知用户';
        // 检查 member.email 是否存在
        const safeEmail = member.email || '无邮箱';
        // --- 修复结束 ---

        const isAdmin = member.role === 'admin' || member.is_admin === true; // 增加对 is_admin 的检查
        const isSelf = parseInt(member.id) === parseInt(window.CURRENT_USER_ID) || parseInt(member.user_id) === parseInt(window.CURRENT_USER_ID); // 增加对 user_id 的检查
        
        // --- 修复：在 safeUsername 上执行 replace ---
        const displayName = safeUsername.replace(/\s*\(.*\)/, '').trim();
        const displayInitial = displayName ? displayName[0].toUpperCase() : '?'; // 确保 displayName 不为空

        // --- 修复：检查 member.balance 是否存在 ---
        const balance = member.balance || 0;
        let balanceText;
        let balanceColorClass;

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
        
        // --- 修复：确保使用正确的 member.id 或 member.user_id ---
        const memberId = member.id || member.user_id;
        if (!memberId) {
             console.error('成员数据缺少 id 或 user_id', member);
             return; // 跳过这个畸形的成员
        }

        const memberCard = document.createElement('div');
        memberCard.className = 'flex items-center justify-between p-4 bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition duration-150';
        memberCard.innerHTML = `
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
                                class="w-full text-left px-4 py-2 text-sm text-danger hover:bg-red-50 transition duration-150">
                                移除成员
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        container.appendChild(memberCard);
    });

    // 如果没有成员，显示空状态
    if (window.groupMembers.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>暂无成员</p>
            </div>
        `;
    }
}

export function toggleMemberManagementMenu(event, memberId) {
    event.stopPropagation();

    // 关闭所有其他菜单
    const allMenus = document.querySelectorAll('[id^="member-menu-"]');
    allMenus.forEach(menu => {
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

export const handleUpdateRole = requireAdmin(function (memberId, memberName) {
    const roleModal = document.getElementById('role-update-modal');
    const roleMessage = document.getElementById('role-update-message');

    if (roleModal && roleMessage) {
        const member = window.groupMembers.find(m => parseInt(m.id) === parseInt(memberId));
        if (member) {
            const action = member.role === 'admin' ? '取消管理员' : '设为管理员';
            roleMessage.textContent = `确定要将成员 "${memberName}" ${action}吗？`;
            roleModal.classList.remove('hidden');
            roleModal.dataset.memberId = memberId;
        }
    }
});

export const handleRemoveMember = requireAdmin(function (memberId, memberName) {
    const removeModal = document.getElementById('remove-modal');
    const removeMessage = document.getElementById('remove-message');

    if (removeModal && removeMessage) {
        removeMessage.textContent = `确定要将成员 "${memberName}" 从群组中移除吗？`;
        removeModal.classList.remove('hidden');
        removeModal.dataset.memberId = memberId;
    }
});

export function confirmUpdateRole() {
    console.log('更新成员角色');
    window.showCustomAlert('成功', '成员角色已更新');
    cancelUpdateRole();
    window.loadMembersList();
}

export function confirmRemoveMember() {
    console.log('移除成员');
    window.showCustomAlert('成功', '成员已移除');
    cancelRemoveMember();
    window.loadMembersList();
}

export function cancelUpdateRole() {
    const modal = document.getElementById('role-update-modal');
    if (modal) modal.classList.add('hidden');
}

export function cancelRemoveMember() {
    const modal = document.getElementById('remove-modal');
    if (modal) modal.classList.add('hidden');
}

// 邀请成员功能
export function clearInviteForm() {
    const emailInput = document.getElementById('invite-user-email-input');
    if (emailInput) emailInput.value = '';
}

export async function inviteNewMember() {
    const emailInput = document.getElementById('invite-user-email-input');
    const loadingMessage = document.getElementById('invite-loading-message');
    const submitButton = document.getElementById('invite-submit-button');

    if (!emailInput || !loadingMessage || !submitButton) return;

    const email = emailInput.value.trim();

    if (!email) {
        window.showCustomAlert('错误', '请输入邮箱地址');
        return;
    }

    if (!isValidEmail(email)) {
        window.showCustomAlert('错误', '请输入有效的邮箱地址');
        return;
    }

    loadingMessage.classList.remove('hidden');
    submitButton.disabled = true;

    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        window.showCustomAlert('成功', `邀请已发送到 ${email}`);
        clearInviteForm();
    } catch (error) {
        window.showCustomAlert('错误', '发送邀请失败，请重试');
    } finally {
        loadingMessage.classList.add('hidden');
        submitButton.disabled = false;
    }
}


// 暴露所有成员管理相关函数到全局 window 对象

window.renderMemberList = renderMemberList;
window.toggleMemberManagementMenu = toggleMemberManagementMenu;
window.handleUpdateRole = handleUpdateRole;
window.handleRemoveMember = handleRemoveMember;
window.confirmUpdateRole = confirmUpdateRole;
window.confirmRemoveMember = confirmRemoveMember;
window.cancelUpdateRole = cancelUpdateRole;
window.cancelRemoveMember = cancelRemoveMember;
window.clearInviteForm = clearInviteForm;
window.inviteNewMember = inviteNewMember;
window.isValidEmail = isValidEmail;



console.log('成员管理模块已加载，所有函数已暴露到全局');

