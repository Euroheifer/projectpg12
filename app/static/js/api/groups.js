// file: app/static/js/api/groups.js
// 防止缓存版本: 2025.11.06
const JS_CACHE_VERSION = '2025.11.06.001';

import { showCustomAlert } from '../ui/utils.js';
import { getAuthToken } from '../ui/utils.js';


// 打开创建群组模态框 (保持不变)
export function handleCreateGroup() {
    console.log('handleCreateGroup 被调用');
    const modal = document.getElementById('create-group-modal');
    const groupNameInput = document.getElementById('group-name');
    const groupDescriptionInput = document.getElementById('group-description');

    if (modal && groupNameInput) {
        groupNameInput.value = '';
        if (groupDescriptionInput) {
            groupDescriptionInput.value = '';
        }
        modal.classList.remove('hidden');
        groupNameInput.focus();
    } else {
        console.error('找不到必要的DOM元素');
    }
}

// 关闭创建群组模态框 (保持不变)
export function closeCreateGroupModal() {
    console.log('closeCreateGroupModal 被调用');
    const modal = document.getElementById('create-group-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// 创建新群组 (成功后强制刷新页面，让后端重新渲染)
export async function createNewGroup() {
    console.log('createNewGroup 被调用');
    const groupName = document.getElementById('group-name').value;
    const groupDescription = document.getElementById('group-description').value;

    if (!groupName.trim()) {
        showCustomAlert('请输入群组名称');
        return;
    }

    try {
        console.log('开始创建群组...');
        const response = await fetch('/groups/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                name: groupName,
                description: groupDescription
            })
        });

        if (response.ok) {
            console.log('群组创建成功');
            closeCreateGroupModal();
            showCustomAlert('群组创建成功');

            // 关键：强制页面刷新，触发后端重新渲染整个页面
            window.location.reload();

        } else {
            const errorData = await response.json();
            console.error('创建群组失败:', errorData);
            throw new Error(errorData.detail || '创建群组失败');
        }
    } catch (error) {
        console.error('创建群组错误:', error);
        showCustomAlert(error.message || '创建群组失败，请重试');
    }
}

// ==============
// 以下是API核心封装，不涉及UI渲染
// ==============

export async function createGroup(groupName, description = "") {
    const token = getAuthToken();
    const response = await fetch('/groups/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            "name": groupName,
            "description": description
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '创建群组失败');
    }
    return await response.json();
}

export async function getUserGroups() {
    const token = getAuthToken();
    const response = await fetch('/groups/', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        throw new Error('获取群组列表失败');
    }
    return await response.json();
}

// ==============
// 添加缺失的群组详情API函数
// ==============
export async function getGroupDetails(groupId) {
    try {
        const token = getAuthToken();
        const response = await fetch(`/api/groups/${groupId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('获取群组详情失败:', error);
        throw error;
    }
}

export async function getGroupMembers(groupId) {
    const token = getAuthToken();
    const response = await fetch(`/groups/${groupId}/members`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '获取群组成员失败');
    }
    return await response.json();
}

export async function getGroupExpenses(groupId) {
    const token = getAuthToken();
    const response = await fetch(`/groups/${groupId}/expenses`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '获取群组费用失败');
    }
    return await response.json();
}

/**
 * 注意：此函数已被弃用
 * 支付API是基于费用的，而不是基于群组的
 * 请使用 getExpensePayments(expenseId) 替代
 * 
 * API 路由: 不存在 /groups/{group_id}/payments
 * 正确路由: /expenses/{expense_id}/payments
 */
export async function getGroupPayments(groupId) {
    console.warn('getGroupPayments 已弃用 - 请使用 getExpensePayments(expenseId)');
    const token = getAuthToken();
    
    // 返回空数组，避免前端崩溃
    return [];
}

export async function getGroupRecurringExpenses(groupId) {
    const token = getAuthToken();
    const response = await fetch(`/groups/${groupId}/recurring-expenses`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '获取群组定期费用失败');
    }
    return await response.json();
}


// ==============
// 群组设置管理功能
// ==============

// 重置群组设置
export function resetGroupSettings() {
    console.log('重置群组设置');
    
    // 重置表单字段
    const groupNameInput = document.getElementById('group-name-settings');
    const groupDescriptionInput = document.getElementById('group-description-settings');
    
    if (groupNameInput) {
        // 从当前群组数据重置
        const currentName = groupNameInput.getAttribute('data-original-name') || '';
        groupNameInput.value = currentName;
    }
    
    if (groupDescriptionInput) {
        const currentDescription = groupDescriptionInput.getAttribute('data-original-description') || '';
        groupDescriptionInput.value = currentDescription;
    }
    
    showCustomAlert('群组设置已重置');
}

// 更新群组设置
export async function updateGroupSettings(groupId, settings = null) {
    try {
        console.log(`更新群组设置，群组ID: ${groupId}`);
        
        // 如果没有传递settings，从表单获取
        if (!settings) {
            const groupNameInput = document.getElementById('group-name-settings');
            const groupDescriptionInput = document.getElementById('group-description-settings');
            
            if (!groupNameInput) {
                throw new Error('找不到群组名称输入框');
            }
            
            settings = {
                name: groupNameInput.value.trim(),
                description: groupDescriptionInput ? groupDescriptionInput.value.trim() : ''
            };
        }
        
        if (!settings.name) {
            showCustomAlert('群组名称不能为空');
            return;
        }
        
        const response = await fetch(`/groups/${groupId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            const updatedGroup = await response.json();
            console.log('群组设置更新成功:', updatedGroup);
            showCustomAlert('群组设置更新成功');
            
            // 更新表单中的原始值
            const groupNameInput = document.getElementById('group-name-settings');
            const groupDescriptionInput = document.getElementById('group-description-settings');
            
            if (groupNameInput) {
                groupNameInput.setAttribute('data-original-name', updatedGroup.name);
            }
            if (groupDescriptionInput) {
                groupDescriptionInput.setAttribute('data-original-description', updatedGroup.description || '');
            }
            
            return updatedGroup;
        } else {
            const errorData = await response.json();
            console.error('更新群组设置失败:', errorData);
            throw new Error(errorData.detail || '更新群组设置失败');
        }
    } catch (error) {
        console.error('更新群组设置错误:', error);
        showCustomAlert(error.message || '更新群组设置失败，请重试');
        throw error;
    }
}

// 删除群组
export async function deleteGroup(groupId, groupName) {
    try {
        console.log(`删除群组: ${groupName} (ID: ${groupId})`);
        
        // 确认删除
        const confirmMessage = `确定要删除群组 "${groupName}" 吗？\n\n此操作不可撤销，将删除群组的所有数据。`;
        if (!confirm(confirmMessage)) {
            return;
        }
        
        const response = await fetch(`/groups/${groupId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        if (response.ok) {
            console.log('群组删除成功');
            showCustomAlert('群组删除成功');
            
            // 跳转到群组列表页面
            setTimeout(() => {
                window.location.href = '/groups';
            }, 1000);
            
            return true;
        } else {
            const errorData = await response.json();
            console.error('删除群组失败:', errorData);
            throw new Error(errorData.detail || '删除群组失败');
        }
    } catch (error) {
        console.error('删除群组错误:', error);
        showCustomAlert(error.message || '删除群组失败，请重试');
        throw error;
    }
}

// ==============
// 审计日志管理功能
// ==============

// 获取审计日志数据
export async function loadAuditLog(groupId, page = 1, limit = 50) {
    try {
        console.log(`加载审计日志，群组ID: ${groupId}`);
        
        const response = await fetch(`/groups/${groupId}/audit-trail?page=${page}&limit=${limit}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || '获取审计日志失败');
        }
        
        const auditLogs = await response.json();
        console.log('审计日志数据获取成功:', auditLogs);
        
        // 渲染审计日志
        renderAuditLog(auditLogs);
        
        return auditLogs;
    } catch (error) {
        console.error('加载审计日志错误:', error);
        showCustomAlert(error.message || '加载审计日志失败');
        throw error;
    }
}

// 渲染审计日志显示
export function renderAuditLog(auditLogs) {
    try {
        console.log('渲染审计日志:', auditLogs);
        
        const auditLogContainer = document.getElementById('audit-log-container');
        if (!auditLogContainer) {
            console.warn('找不到审计日志容器元素');
            return;
        }
        
        if (!auditLogs || auditLogs.length === 0) {
            auditLogContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-history text-4xl mb-4"></i>
                    <p>暂无审计日志记录</p>
                </div>
            `;
            return;
        }
        
        // 渲染审计日志列表
        const auditLogHtml = auditLogs.map(log => {
            const timestamp = new Date(log.timestamp).toLocaleString('zh-CN');
            const action = getAuditActionText(log.action);
            const actionIcon = getAuditActionIcon(log.action);
            
            return `
                <div class="audit-log-item border-l-4 border-blue-400 bg-blue-50 p-4 mb-3">
                    <div class="flex items-start space-x-3">
                        <div class="audit-icon text-blue-600 text-lg">
                            ${actionIcon}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between">
                                <h4 class="text-sm font-medium text-gray-900">
                                    ${action}
                                </h4>
                                <time class="text-xs text-gray-500" datetime="${log.timestamp}">
                                    ${timestamp}
                                </time>
                            </div>
                            <div class="mt-1 text-sm text-gray-600">
                                <p>操作用户ID: ${log.user_id}</p>
                                <p>记录ID: ${log.id}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        auditLogContainer.innerHTML = `
            <div class="audit-logs-header mb-4">
                <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                    <i class="fas fa-shield-alt mr-2 text-blue-600"></i>
                    审计日志
                    <span class="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        ${auditLogs.length} 条记录
                    </span>
                </h3>
            </div>
            <div class="audit-logs-list">
                ${auditLogHtml}
            </div>
        `;
        
        // 添加滚动和动画效果
        auditLogContainer.classList.add('audit-log-container');
        auditLogContainer.scrollTop = 0;
        
    } catch (error) {
        console.error('渲染审计日志错误:', error);
        showCustomAlert('渲染审计日志失败');
    }
}

// 获取审计操作文本
function getAuditActionText(action) {
    const actionMap = {
        'create': '创建群组',
        'update': '更新群组',
        'delete': '删除群组',
        'add_member': '添加成员',
        'remove_member': '移除成员',
        'add_expense': '添加费用',
        'update_expense': '更新费用',
        'delete_expense': '删除费用',
        'add_payment': '添加支付',
        'delete_payment': '删除支付',
        'invite_user': '邀请用户',
        'accept_invitation': '接受邀请',
        'decline_invitation': '拒绝邀请'
    };
    
    return actionMap[action] || `未知操作: ${action}`;
}

// 获取审计操作图标
function getAuditActionIcon(action) {
    const iconMap = {
        'create': '<i class="fas fa-plus-circle"></i>',
        'update': '<i class="fas fa-edit"></i>',
        'delete': '<i class="fas fa-trash-alt"></i>',
        'add_member': '<i class="fas fa-user-plus"></i>',
        'remove_member': '<i class="fas fa-user-minus"></i>',
        'add_expense': '<i class="fas fa-receipt"></i>',
        'update_expense': '<i class="fas fa-receipt"></i>',
        'delete_expense': '<i class="fas fa-receipt"></i>',
        'add_payment': '<i class="fas fa-credit-card"></i>',
        'delete_payment': '<i class="fas fa-credit-card"></i>',
        'invite_user': '<i class="fas fa-envelope"></i>',
        'accept_invitation': '<i class="fas fa-check"></i>',
        'decline_invitation': '<i class="fas fa-times"></i>'
    };
    
    return iconMap[action] || '<i class="fas fa-info-circle"></i>';
}

// 兼容旧版函数名
export function loadAuditLogs() {
    console.log('加载审计日志');
    const groupId = getCurrentGroupId();
    if (groupId) {
        loadAuditLog(groupId);
    } else {
        showCustomAlert('无法获取当前群组ID');
    }
}

export function renderAuditLogList() {
    console.log('渲染审计日志列表');
    // 留空以兼容现有代码，实际在loadAuditLog中处理
}

// 获取当前群组ID
export function getCurrentGroupId() {
    // 从URL中提取群组ID
    const urlParts = window.location.pathname.split('/');
    if (urlParts.length >= 3 && urlParts[1] === 'groups') {
        const groupId = parseInt(urlParts[2]);
        return isNaN(groupId) ? null : groupId;
    }
    
    // 从页面元素中获取
    const groupIdElement = document.getElementById('current-group-id');
    if (groupIdElement) {
        return parseInt(groupIdElement.value);
    }
    
    return null;
}

export function redirectToGroupDetail(groupId, groupName) {
    console.log(`重定向到群组详情页: ${groupName} (ID: ${groupId})`);

    // 使用正确的URL格式跳转到群组页面
    window.location.href = `/groups/${groupId}`;
}

// 尝试暴露函数到全局
try {
    window.handleCreateGroup = handleCreateGroup;
    window.closeCreateGroupModal = closeCreateGroupModal;
    window.createNewGroup = createNewGroup;
    window.redirectToGroupDetail = redirectToGroupDetail;

    window.getGroupDetails = getGroupDetails;
    window.getGroupMembers = getGroupMembers;
    window.getGroupExpenses = getGroupExpenses;
    window.getGroupPayments = getGroupPayments;
    window.getGroupRecurringExpenses = getGroupRecurringExpenses;
    
    // 新增的群组管理功能
    window.updateGroupSettings = updateGroupSettings;
    window.deleteGroup = deleteGroup;
    window.resetGroupSettings = resetGroupSettings;
    window.saveGroupSettings = updateGroupSettings;
    
    // 审计日志功能
    window.loadAuditLog = loadAuditLog;
    window.loadAuditLogs = loadAuditLogs;
    window.renderAuditLog = renderAuditLog;
    window.renderAuditLogList = renderAuditLogList;
    window.getCurrentGroupId = getCurrentGroupId;

    console.log('groups.js: 全局暴露完成');
} catch (error) {
    console.warn('groups.js: 全局暴露失败，可能是模块环境:', error);
}

// 添加CSS样式（如果需要）
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        .audit-log-container {
            max-height: 600px;
            overflow-y: auto;
            scroll-behavior: smooth;
        }
        
        .audit-log-item {
            transition: all 0.2s ease;
        }
        
        .audit-log-item:hover {
            background-color: rgba(59, 130, 246, 0.05);
            border-left-color: #2563eb;
        }
        
        .audit-icon {
            width: 24px;
            text-align: center;
        }
        
        .audit-logs-header {
            position: sticky;
            top: 0;
            background-color: white;
            padding-bottom: 1rem;
            z-index: 10;
            border-bottom: 1px solid #e5e7eb;
        }
    `;
    document.head.appendChild(style);
}

// ==================== 群组管理功能 ====================

/**
 * 保存群组设置
 */
export async function saveGroupSettings() {
    const groupNameInput = document.getElementById('group-name-input');
    const groupDescriptionInput = document.getElementById('group-description-input');
    const messageElement = document.getElementById('save-group-settings-message');
    
    if (!groupNameInput || !groupDescriptionInput) {
        showCustomAlert('错误', '找不到群组设置表单元素');
        return;
    }
    
    const groupName = groupNameInput.value.trim();
    const groupDescription = groupDescriptionInput.value.trim();
    
    if (!groupName) {
        if (messageElement) {
            messageElement.textContent = '群组名称不能为空';
            messageElement.className = 'mt-2 p-2 text-sm rounded bg-red-100 text-red-700';
            messageElement.classList.remove('hidden');
        }
        return;
    }
    
    try {
        const token = getAuthToken();
        if (!token) {
            showCustomAlert('错误', '用户未登录，请重新登录');
            return;
        }
        
        const groupId = window.currentGroupId;
        if (!groupId) {
            showCustomAlert('错误', '无法确定当前群组ID');
            return;
        }
        
        // 显示加载状态
        if (messageElement) {
            messageElement.textContent = '正在保存...';
            messageElement.className = 'mt-2 p-2 text-sm rounded bg-blue-100 text-blue-700';
            messageElement.classList.remove('hidden');
        }
        
        const response = await fetch(`/groups/${groupId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: groupName,
                description: groupDescription
            })
        });
        
        if (response.ok) {
            const updatedGroup = await response.json();
            console.log('群组设置已更新:', updatedGroup);
            
            // 更新全局群组数据
            window.currentGroup = updatedGroup;
            
            // 更新页面显示
            if (window.currentGroup) {
                const nameDisplay = document.getElementById('group-name-display');
                const descriptionDisplay = document.getElementById('group-description-display');
                
                if (nameDisplay) nameDisplay.textContent = updatedGroup.name;
                if (descriptionDisplay) descriptionDisplay.textContent = updatedGroup.description || '无描述';
            }
            
            // 显示成功消息
            if (messageElement) {
                messageElement.textContent = '群组设置已成功保存！';
                messageElement.className = 'mt-2 p-2 text-sm rounded bg-green-100 text-green-700';
            }
            
            showCustomAlert('成功', '群组设置已成功保存！', 'success');
            
            // 3秒后隐藏消息
            setTimeout(() => {
                if (messageElement) {
                    messageElement.classList.add('hidden');
                }
            }, 3000);
            
        } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.detail || `保存失败 (状态码: ${response.status})`;
            
            console.error('保存群组设置失败:', errorMessage);
            
            if (messageElement) {
                messageElement.textContent = `保存失败: ${errorMessage}`;
                messageElement.className = 'mt-2 p-2 text-sm rounded bg-red-100 text-red-700';
            }
            
            showCustomAlert('错误', `保存失败: ${errorMessage}`);
        }
        
    } catch (error) {
        console.error('保存群组设置时发生错误:', error);
        
        if (messageElement) {
            messageElement.textContent = '保存时发生网络错误，请检查网络连接';
            messageElement.className = 'mt-2 p-2 text-sm rounded bg-red-100 text-red-700';
        }
        
        showCustomAlert('错误', '保存时发生网络错误，请检查网络连接');
    }
}

/**
 * 加载审计日志
 */
export async function loadAuditLogs() {
    const container = document.getElementById('audit-log-content');
    if (!container) return;
    
    try {
        const token = getAuthToken();
        if (!token) {
            container.innerHTML = '<p class="text-center text-gray-500">用户未登录</p>';
            return;
        }
        
        const groupId = window.currentGroupId;
        if (!groupId) {
            container.innerHTML = '<p class="text-center text-gray-500">无法确定当前群组</p>';
            return;
        }
        
        // 显示加载状态
        container.innerHTML = '<div class="text-center text-gray-500">正在加载审计日志...</div>';
        
        const response = await fetch(`/groups/${groupId}/audit-logs`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const logs = await response.json();
            
            if (!logs || logs.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500">暂无审计日志</p>';
                return;
            }
            
            // 渲染审计日志
            const logsHTML = logs.map(log => {
                const timestamp = new Date(log.created_at).toLocaleString('zh-CN');
                const username = log.user?.username || log.username || '未知用户';
                const action = log.action || '未知操作';
                const details = log.details || '';
                
                return `
                    <div class="p-3 bg-white rounded border border-gray-200 hover:border-gray-300 transition duration-150">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <p class="text-sm text-gray-600">${timestamp}</p>
                                <p class="text-base font-medium text-gray-900 mt-1">用户 ${username} ${action}</p>
                                ${details ? `<p class="text-sm text-gray-500 mt-1">${details}</p>` : ''}
                            </div>
                            <div class="text-right">
                                <span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                    审计日志
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = logsHTML;
            
        } else {
            console.error('获取审计日志失败:', response.status);
            container.innerHTML = '<p class="text-center text-red-500">获取审计日志失败</p>';
        }
        
    } catch (error) {
        console.error('加载审计日志时发生错误:', error);
        container.innerHTML = '<p class="text-center text-red-500">加载审计日志时发生错误</p>';
    }
}

// 暴露到全局
window.saveGroupSettings = saveGroupSettings;
window.loadAuditLogs = loadAuditLogs;


