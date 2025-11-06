// member_management.js - 成员管理、邀请、角色设置
// 防止缓存版本: 2025.11.06
const JS_CACHE_VERSION = '2025.11.06.001';

import { requireAdmin, isValidEmail, getAuthToken } from '../ui/utils.js';

// --- 全局状态 ---

// 成员管理状态
let memberToRemove = null;
let memberToUpdateRole = null;

// --- 辅助函数 ---

/**
 * 从URL中提取群组ID
 * @returns {number|null} 群组ID，如果无法获取则返回null
 */
function getGroupIdFromURL() {
    try {
        const path = window.location.pathname;
        // 尝试从路径中提取群组ID：/group/{group_id}/details
        const match = path.match(/\/group\/(\d+)\/details/);
        if (match) {
            return parseInt(match[1]);
        }
        
        // 尝试从查询参数中获取：?group_id={id}
        const urlParams = new URLSearchParams(window.location.search);
        const groupIdFromQuery = urlParams.get('group_id');
        if (groupIdFromQuery) {
            return parseInt(groupIdFromQuery);
        }
        
        // 尝试从页面元素中获取
        const groupIdElement = document.getElementById('current-group-id');
        if (groupIdElement) {
            return parseInt(groupIdElement.value);
        }
        
        console.warn('无法从URL中获取群组ID:', path);
        return null;
    } catch (error) {
        console.error('获取群组ID时发生错误:', error);
        return null;
    }
}

/**
 * 显示加载状态
 * @param {string} type - 操作类型 ('update-role' | 'remove-member')
 */
function showLoadingState(type) {
    const modal = type === 'update-role' ? 
        document.getElementById('role-update-modal') : 
        document.getElementById('remove-modal');
    
    if (modal) {
        const loadingElement = modal.querySelector('.loading-spinner') || 
                              modal.querySelector('[class*="loading"]');
        
        if (loadingElement) {
            loadingElement.classList.remove('hidden');
        }
        
        // 禁用按钮
        const confirmButton = modal.querySelector('button[onclick*="confirm"]');
        if (confirmButton) {
            confirmButton.disabled = true;
            confirmButton.textContent = '处理中...';
        }
    }
}

/**
 * 隐藏加载状态
 * @param {string} type - 操作类型 ('update-role' | 'remove-member')
 */
function hideLoadingState(type) {
    const modal = type === 'update-role' ? 
        document.getElementById('role-update-modal') : 
        document.getElementById('remove-modal');
    
    if (modal) {
        const loadingElement = modal.querySelector('.loading-spinner') || 
                              modal.querySelector('[class*="loading"]');
        
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
        
        // 恢复按钮
        const confirmButton = modal.querySelector('button[onclick*="confirm"]');
        if (confirmButton) {
            confirmButton.disabled = false;
            confirmButton.textContent = type === 'update-role' ? '确认更新' : '确认移除';
        }
    }
}

/**
 * 安全获取用户名 - 修复版本
 * @param {Object} member - 成员对象
 * @returns {string} 用户名
 */
function getSafeUsername(member) {
    // 尝试多种方式获取用户名
    return member.username || 
           member.user?.username || 
           member.nickname || 
           member.name || 
           `用户 ${member.user_id || member.id || '未知'}`;
}

/**
 * 安全获取邮箱 - 修复版本
 * @param {Object} member - 成员对象
 * @returns {string} 邮箱
 */
function getSafeEmail(member) {
    return member.email || 
           member.user?.email || 
           '无邮箱';
}

/**
 * 安全获取成员ID - 修复版本
 * @param {Object} member - 成员对象
 * @returns {number} 成员ID
 */
function getSafeMemberId(member) {
    return member.user_id || member.id;
}

export function renderMemberList() {
    const container = document.getElementById('member-list-container');
    const activeMemberCount = document.getElementById('active-member-count');
    const memberCount = document.getElementById('member-count');

    if (!container) {
        console.error('找不到成员列表容器');
        return;
    }

    console.log('开始渲染成员列表，数据:', window.groupMembers);

    container.innerHTML = '';

    if (activeMemberCount) activeMemberCount.textContent = window.groupMembers.length;
    if (memberCount) memberCount.textContent = window.groupMembers.length;

    if (!window.groupMembers || window.groupMembers.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>暂无成员</p>
            </div>
        `;
        return;
    }

    window.groupMembers.forEach(member => {
        try {
            // --- 修复开始 ---
            // 获取安全的用户名和邮箱
            const safeUsername = getSafeUsername(member);
            const safeEmail = getSafeEmail(member);
            // --- 修复结束 ---

            const isAdmin = member.role === 'admin' || member.is_admin === true; // 增加对 is_admin 的检查
            const isSelf = parseInt(getSafeMemberId(member)) === parseInt(window.CURRENT_USER_ID); // 使用安全获取的ID
            
            // 清理用户名，移除括号及其内容
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
            
            // --- 修复：确保使用正确的成员ID ---
            const memberId = getSafeMemberId(member);
            if (!memberId) {
                console.error('成员数据缺少有效ID', member);
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
                                <button onclick="handleUpdateRole(${memberId}, '${displayName.replace(/'/g, "\\'")}')" 
                                    class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition duration-150">
                                    ${isAdmin ? '取消管理员' : '设为管理员'}
                                </button>
                                <button onclick="handleRemoveMember(${memberId}, '${displayName.replace(/'/g, "\\'")}')" 
                                    class="w-full text-left px-4 py-2 text-sm text-danger hover:bg-red-50 transition duration-150">
                                    移除成员
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            container.appendChild(memberCard);
        } catch (error) {
            console.error('渲染成员项时出错:', error, member);
            // 继续处理其他成员，不让单个成员的错误影响整个列表
        }
    });
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
        // 查找成员，支持多种ID字段
        const member = window.groupMembers.find(m => 
            parseInt(getSafeMemberId(m)) === parseInt(memberId)
        );
        
        if (member) {
            // 检查管理员状态，支持多种字段
            const isAdmin = member.is_admin === true || member.role === 'admin';
            const action = isAdmin ? '取消管理员' : '设为管理员';
            const warningText = isAdmin ? '' : '（管理员可以管理群组所有设置）';
            
            roleMessage.innerHTML = `
                确定要将成员 "${memberName}" ${action}吗？<br>
                <small class="text-gray-500">${warningText}</small>
            `;
            
            roleModal.classList.remove('hidden');
            roleModal.dataset.memberId = memberId;
            
            console.log('打开角色更新模态框:', {
                memberId,
                memberName,
                isAdmin,
                member: member
            });
        } else {
            console.error('未找到要更新角色的成员:', memberId);
            if (window.showCustomAlert) {
                window.showCustomAlert('错误', '未找到该成员');
            }
        }
    } else {
        console.error('找不到角色更新模态框元素');
    }
});

export const handleRemoveMember = requireAdmin(function (memberId, memberName) {
    const removeModal = document.getElementById('remove-modal');
    const removeMessage = document.getElementById('remove-message');

    if (removeModal && removeMessage) {
        // 查找成员，支持多种ID字段
        const member = window.groupMembers.find(m => 
            parseInt(getSafeMemberId(m)) === parseInt(memberId)
        );
        
        if (member) {
            // 检查是否为管理员，支持多种字段
            const isAdmin = member.is_admin === true || member.role === 'admin';
            
            if (isAdmin) {
                if (window.showCustomAlert) {
                    window.showCustomAlert('错误', '不能移除群组管理员');
                }
                return;
            }
            
            // 再次确认移除操作
            removeMessage.innerHTML = `
                确定要将成员 "${memberName}" 从群组中移除吗？<br>
                <small class="text-red-500">此操作不可撤销，成员将无法再查看此群组的费用信息。</small>
            `;
            
            removeModal.classList.remove('hidden');
            removeModal.dataset.memberId = memberId;
            
            console.log('打开移除成员模态框:', {
                memberId,
                memberName,
                member: member
            });
        } else {
            console.error('未找到要移除的成员:', memberId);
            if (window.showCustomAlert) {
                window.showCustomAlert('错误', '未找到该成员');
            }
        }
    } else {
        console.error('找不到移除成员模态框元素');
    }
});

export async function confirmUpdateRole() {
    const modal = document.getElementById('role-update-modal');
    const memberId = modal?.dataset?.memberId;
    
    if (!memberId) {
        if (window.showCustomAlert) {
            window.showCustomAlert('错误', '未找到要更新的成员');
        }
        return;
    }

    // 显示加载状态
    showLoadingState('update-role');

    try {
        // 获取当前群组ID
        const groupId = window.CURRENT_GROUP_ID || window.currentGroupId || getGroupIdFromURL();
        if (!groupId) {
            throw new Error('无法获取群组ID');
        }

        // 获取成员信息
        const member = window.groupMembers.find(m => 
            parseInt(getSafeMemberId(m)) === parseInt(memberId)
        );
        
        if (!member) {
            throw new Error('未找到该成员');
        }

        // 决定新的管理员状态（取反）
        const currentIsAdmin = member.is_admin === true || member.role === 'admin';
        const newAdminStatus = !currentIsAdmin;
        
        console.log('更新成员角色:', {
            memberId,
            groupId,
            currentIsAdmin,
            newAdminStatus
        });

        const token = getAuthToken();
        if (!token) {
            throw new Error('未找到认证令牌，请重新登录');
        }

        // 调用更新管理员状态的API
        const response = await fetch(`/groups/${groupId}/members/${memberId}/admin`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                is_admin: newAdminStatus
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('角色更新成功:', result);
            
            const action = newAdminStatus ? '设置为管理员' : '取消管理员权限';
            if (window.showCustomAlert) {
                window.showCustomAlert('成功', `成员角色已${action}`);
            }
            
            cancelUpdateRole();
            
            // 重新加载成员列表
            if (window.loadMembersList) {
                await window.loadMembersList();
            } else {
                // 如果没有loadMembersList函数，刷新页面
                setTimeout(() => window.location.reload(), 1000);
            }
        } else {
            const errorData = await response.json();
            console.error('API错误响应:', errorData);
            
            let errorMessage = '更新角色失败';
            if (errorData.detail) {
                if (errorData.detail.includes('not a member')) {
                    errorMessage = '该用户不是群组成员';
                } else if (errorData.detail.includes('Only admin')) {
                    errorMessage = '只有管理员可以修改权限';
                } else {
                    errorMessage = errorData.detail;
                }
            }
            
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('更新角色错误:', error);
        if (window.showCustomAlert) {
            window.showCustomAlert('错误', error.message || '更新角色失败，请重试');
        }
    } finally {
        // 隐藏加载状态
        hideLoadingState('update-role');
    }
}

export async function confirmRemoveMember() {
    const modal = document.getElementById('remove-modal');
    const memberId = modal?.dataset?.memberId;
    
    if (!memberId) {
        if (window.showCustomAlert) {
            window.showCustomAlert('错误', '未找到要移除的成员');
        }
        return;
    }

    // 最终确认对话框
    if (!window.confirm('确定要将该成员从群组中移除吗？此操作不可撤销。')) {
        return;
    }

    // 显示加载状态
    showLoadingState('remove-member');

    try {
        // 获取当前群组ID
        const groupId = window.CURRENT_GROUP_ID || window.currentGroupId || getGroupIdFromURL();
        if (!groupId) {
            throw new Error('无法获取群组ID');
        }

        console.log('移除成员:', {
            memberId,
            groupId
        });

        const token = getAuthToken();
        if (!token) {
            throw new Error('未找到认证令牌，请重新登录');
        }

        // 调用移除成员的API
        const response = await fetch(`/groups/${groupId}/members/${memberId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            console.log('成员移除成功');
            
            if (window.showCustomAlert) {
                window.showCustomAlert('成功', '成员已从群组中移除');
            }
            
            cancelRemoveMember();
            
            // 重新加载成员列表
            if (window.loadMembersList) {
                await window.loadMembersList();
            } else {
                // 如果没有loadMembersList函数，刷新页面
                setTimeout(() => window.location.reload(), 1000);
            }
        } else {
            const errorData = await response.json();
            console.error('API错误响应:', errorData);
            
            let errorMessage = '移除成员失败';
            if (errorData.detail) {
                if (errorData.detail.includes('Cannot remove the group admin')) {
                    errorMessage = '不能移除群组管理员';
                } else if (errorData.detail.includes('not a member')) {
                    errorMessage = '该用户不是群组成员';
                } else {
                    errorMessage = errorData.detail;
                }
            }
            
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('移除成员错误:', error);
        if (window.showCustomAlert) {
            window.showCustomAlert('错误', error.message || '移除成员失败，请重试');
        }
    } finally {
        // 隐藏加载状态
        hideLoadingState('remove-member');
    }
}

export function cancelUpdateRole() {
    const modal = document.getElementById('role-update-modal');
    if (modal) {
        modal.classList.add('hidden');
        // 重置加载状态
        hideLoadingState('update-role');
        // 清理数据
        delete modal.dataset.memberId;
    }
}

export function cancelRemoveMember() {
    const modal = document.getElementById('remove-modal');
    if (modal) {
        modal.classList.add('hidden');
        // 重置加载状态
        hideLoadingState('remove-member');
        // 清理数据
        delete modal.dataset.memberId;
    }
}

// 邀请成员功能 - 修复版本
export function clearInviteForm() {
    const emailInput = document.getElementById('invite-user-email-input');
    if (emailInput) emailInput.value = '';
}

export async function inviteNewMember() {
    const emailInput = document.getElementById('invite-user-email-input');
    const loadingMessage = document.getElementById('invite-loading-message');
    const submitButton = document.getElementById('invite-submit-button');

    if (!emailInput || !loadingMessage || !submitButton) {
        console.error('找不到邀请表单元素');
        return;
    }

    const email = emailInput.value.trim();

    if (!email) {
        if (window.showCustomAlert) {
            window.showCustomAlert('错误', '请输入邮箱地址');
        }
        return;
    }

    if (!isValidEmail(email)) {
        if (window.showCustomAlert) {
            window.showCustomAlert('错误', '请输入有效的邮箱地址');
        }
        return;
    }

    loadingMessage.classList.remove('hidden');
    submitButton.disabled = true;

    try {
        // 获取当前群组ID
        const groupId = window.CURRENT_GROUP_ID || window.currentGroupId || getGroupIdFromURL();
        if (!groupId) {
            throw new Error('无法获取群组ID');
        }

        const token = getAuthToken();
        if (!token) {
            throw new Error('未找到认证令牌，请重新登录');
        }

        console.log('发送邀请:', { email, groupId });

        // 调用邀请API
        const response = await fetch(`/groups/${groupId}/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('邀请发送成功:', result);
            
            if (window.showCustomAlert) {
                window.showCustomAlert('成功', `邀请已发送到 ${email}`);
            }
            clearInviteForm();
        } else {
            const errorData = await response.json();
            let errorMessage = '发送邀请失败';
            
            if (errorData.detail) {
                errorMessage = errorData.detail;
            }
            
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('发送邀请失败:', error);
        if (window.showCustomAlert) {
            window.showCustomAlert('错误', error.message || '发送邀请失败，请重试');
        }
    } finally {
        loadingMessage.classList.add('hidden');
        submitButton.disabled = false;
    }
}

// 键盘事件处理
document.addEventListener('keydown', function(event) {
    // ESC键关闭模态框
    if (event.key === 'Escape') {
        const roleModal = document.getElementById('role-update-modal');
        const removeModal = document.getElementById('remove-modal');
        
        if (roleModal && !roleModal.classList.contains('hidden')) {
            cancelUpdateRole();
        }
        
        if (removeModal && !removeModal.classList.contains('hidden')) {
            cancelRemoveMember();
        }
    }
});

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
window.getGroupIdFromURL = getGroupIdFromURL;
window.isValidEmail = isValidEmail;

console.log('成员管理模块已加载，所有函数已暴露到全局');
