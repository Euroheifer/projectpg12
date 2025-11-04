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

export function loadAuditLogs() {
    console.log('加载审计日志');
}

export function renderAuditLogList() {
    console.log('渲染审计日志列表');
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




