import { getAuthToken } from '../ui/utils.js';

/**
 * API 调用 (READ): 获取当前用户的所有群组
 * 对应: @app.get("/groups/", ...)
 */
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

/**
 * API 调用 (CREATE): 创建一个新群组
 * 对应: @app.post("/groups/", ...)
 */
export async function createGroup(groupName, description = "") {
    const token = getAuthToken();
    const response = await fetch('/groups/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        // schema.GroupCreate
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

// TODO: 在这里添加其他群组功能...
// export async function getGroupMembers(groupId) { ... }
// export async function getGroupExpenses(groupId) { ... }