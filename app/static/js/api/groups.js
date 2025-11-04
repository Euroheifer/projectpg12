// file: app/static/js/api/groups.js
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

export async function getGroupPayments(groupId) {
    const token = getAuthToken();
    const response = await fetch(`/groups/${groupId}/payments`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '获取群组支付失败');
    }
    return await response.json();
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


// HTML中调用的其他函数：
export function resetGroupSettings() {
    console.log('重置群组设置');
}

export function saveGroupSettings() {
    console.log('保存群组设置');
}

// API基础URL
const API_BASE_URL = '/api';

// 获取群组活动日志
async function getGroupActivityLog(groupId) {
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/groups/${groupId}/activity-log`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // 如果API不存在，使用空数组而不是假数据
            console.warn('活动日志API不可用，使用空数据');
            return [];
        }

        return await response.json();
    } catch (error) {
        console.error('获取活动日志错误:', error);
        // 使用空数组而不是假数据
        return [];
    }
}

// 渲染活动日志
function renderActivityLog(activities) {
    const container = document.getElementById('activity-log');
    if (!container) return;
    
    if (!activities || activities.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="text-gray-400 text-4xl mb-4">📝</div>
                <p class="text-gray-500">暂无活动记录</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activities.map(activity => {
        const user = window.groupMembers?.find(m => m.id === activity.user_id);
        const timeAgo = getTimeAgo(activity.created_at);
        const actionIcon = getActivityIcon(activity.action);
        const actionColor = getActivityColor(activity.action);
        
        return `
            <div class="activity-item border-l-4 ${actionColor} pl-4 py-3 mb-3 bg-white rounded-r">
                <div class="flex items-start space-x-3">
                    <div class="text-2xl">${actionIcon}</div>
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-1">
                            <span class="font-semibold text-gray-800">${user?.name || '未知用户'}</span>
                            <span class="text-gray-600">${getActivityDescription(activity)}</span>
                        </div>
                        <div class="flex items-center space-x-2 text-sm text-gray-500">
                            <span>${timeAgo}</span>
                            ${activity.details ? `<span>•</span><span class="text-xs">${formatActivityDetails(activity.details)}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 获取活动图标
function getActivityIcon(action) {
    const icons = {
        'create_group': '🏗️',
        'join_group': '👋',
        'create_expense': '💰',
        'update_expense': '✏️',
        'delete_expense': '🗑️',
        'create_payment': '💳',
        'update_payment': '💳',
        'delete_payment': '🗑️',
        'invite_member': '📧',
        'accept_invitation': '✅',
        'decline_invitation': '❌',
        'update_member_role': '👤',
        'remove_member': '👋',
        'create_recurring_expense': '🔄',
        'update_recurring_expense': '🔄',
        'delete_recurring_expense': '🗑️'
    };
    return icons[action] || '📋';
}

// 获取活动颜色
function getActivityColor(action) {
    const colors = {
        'create_group': 'border-green-400 bg-green-50',
        'join_group': 'border-blue-400 bg-blue-50',
        'create_expense': 'border-yellow-400 bg-yellow-50',
        'update_expense': 'border-yellow-400 bg-yellow-50',
        'delete_expense': 'border-red-400 bg-red-50',
        'create_payment': 'border-purple-400 bg-purple-50',
        'update_payment': 'border-purple-400 bg-purple-50',
        'delete_payment': 'border-red-400 bg-red-50',
        'invite_member': 'border-indigo-400 bg-indigo-50',
        'accept_invitation': 'border-green-400 bg-green-50',
        'decline_invitation': 'border-gray-400 bg-gray-50',
        'update_member_role': 'border-orange-400 bg-orange-50',
        'remove_member': 'border-red-400 bg-red-50',
        'create_recurring_expense': 'border-cyan-400 bg-cyan-50',
        'update_recurring_expense': 'border-cyan-400 bg-cyan-50',
        'delete_recurring_expense': 'border-red-400 bg-red-50'
    };
    return colors[action] || 'border-gray-400 bg-gray-50';
}

// 获取活动描述
function getActivityDescription(activity) {
    const action = activity.action;
    const details = activity.details;
    
    const descriptions = {
        'create_group': '创建了群组',
        'join_group': '加入了群组',
        'create_expense': `创建了费用 "${details?.title || ''}"`,
        'update_expense': `更新了费用 "${details?.title || ''}"`,
        'delete_expense': `删除了费用 "${details?.title || ''}"`,
        'create_payment': `记录了支付 $${(details?.amount_cents / 100).toFixed(2)}`,
        'update_payment': `更新了支付 $${(details?.amount_cents / 100).toFixed(2)}`,
        'delete_payment': `删除了支付记录`,
        'invite_member': `邀请了 ${details?.email || ''}`,
        'accept_invitation': '接受了邀请',
        'decline_invitation': '拒绝了邀请',
        'update_member_role': `更新了成员角色为 ${details?.new_role || ''}`,
        'remove_member': '被移除了群组',
        'create_recurring_expense': `创建了定期费用 "${details?.title || ''}"`,
        'update_recurring_expense': `更新了定期费用 "${details?.title || ''}"`,
        'delete_recurring_expense': `删除了定期费用 "${details?.title || ''}"`
    };
    
    return descriptions[action] || action;
}

// 格式化活动详情
function formatActivityDetails(details) {
    if (typeof details === 'object' && details !== null) {
        if (details.title) return `"${details.title}"`;
        if (details.amount_cents) return `$${(details.amount_cents / 100).toFixed(2)}`;
        if (details.email) return details.email;
        if (details.new_role) return details.new_role;
        return JSON.stringify(details);
    }
    return String(details);
}

// 计算时间差
function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) {
        return '刚刚';
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes}分钟前`;
    } else if (diffInHours < 24) {
        return `${diffInHours}小时前`;
    } else if (diffInDays < 7) {
        return `${diffInDays}天前`;
    } else {
        return date.toLocaleDateString();
    }
}

export async function loadAuditLogs() {
    console.log('加载审计日志 - 修复版本');
    
    try {
        const activities = await getGroupActivityLog(window.currentGroupId);
        renderActivityLog(activities);
    } catch (error) {
        console.error('加载活动日志失败:', error);
        // 显示错误状态
        const container = document.getElementById('activity-log');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-red-400 text-4xl mb-4">⚠️</div>
                    <p class="text-red-500">加载活动记录失败</p>
                    <button onclick="loadAuditLogs()" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        重试
                    </button>
                </div>
            `;
        }
    }
}

export function renderAuditLogList() {
    console.log('渲染审计日志列表 - 调用 renderActivityLog');
    // 这个函数现在已经由 loadAuditLogs 内部调用 renderActivityLog 处理
    // 保留为空函数以兼容现有的调用方式
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

    // ... (其他函数)
    console.log('groups.js: 全局暴露完成');
} catch (error) {
    console.warn('groups.js: 全局暴露失败，可能是模块环境:', error);
}




