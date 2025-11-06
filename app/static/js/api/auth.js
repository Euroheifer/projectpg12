// /static/js/api/auth.js
// 防止缓存版本: 2025.11.06
const JS_CACHE_VERSION = '2025.11.06.001';

// ----------------------------------------------------------------
// --- 这是一个完整的、已修复的文件。请复制并替换你的旧文件。---
// ----------------------------------------------------------------

// --- 导入 getAuthToken，因为所有真实的 API 调用都需要它 ---
import { getAuthToken } from '../ui/utils.js';

/**
 * API 调用: 注册 (来自 user.js)
 * API 路由: @app.post("/users/signup", ...)
 */
export async function handleSignup(username, email, password) {
    const response = await fetch('/users/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '注册失败');
    }
    return await response.json();
}

/**
 * API 调用: 登录 (来自 user.js)
 * API 路由: @app.post("/token", ...)
 */
export async function handleLogin(email, password) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '登录失败');
    }

    const tokenData = await response.json();
    // 关键: 在本地存储中保存 Token！
    localStorage.setItem('access_token', tokenData.access_token);
    return tokenData;
}

/**
 * API 调用: 退出登录 (来自 home.js)
 * API 路由: @app.post("/auth/logout", ...)
 */
export async function handleLogout(token) {
    if (token) {
        await fetch('/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }
}

/**
 * API 调用: 获取当前用户 (来自 home.js)
 * API 路由: @app.get("/me", ...)
 */
export async function getCurrentUser(token) {
    const response = await fetch('/me', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        throw new Error('无法验证用户身份');
    }
    return await response.json();
}

/**
 * 清除本地存储 (来自 home.js)
 */
export function clearAuthData() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
}

// ----------------------------------------------------------------
// --- 群组数据相关的 API 调用 (已修复 - 移除了 MOCK) ---
// ----------------------------------------------------------------

/**
 * API 调用: 获取群组数据 (真实版本)
 * API 路由: @app.get("/groups/{group_id}", ...)
 */
export async function getGroupData(groupId) {
    const token = getAuthToken();
    if (!token) throw new Error('未找到认证Token，请重新登录');

    console.log('正在请求群组数据，URL:', `/groups/${groupId}`);
    
    const response = await fetch(`/api/groups/${groupId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    console.log('API响应状态:', response.status, response.statusText);

    // 首先检查响应内容类型
    const contentType = response.headers.get('content-type');
    console.log('响应内容类型:', contentType);

    if (!response.ok) {
        let errorText;
        try {
            errorText = await response.text();
            console.error('API错误响应内容:', errorText);
        } catch (e) {
            errorText = '无法读取错误信息';
        }
        
        if (response.status === 401) throw new Error('认证失败，请重新登录');
        if (response.status === 403) throw new Error('您不是该群组的成员');
        if (response.status === 404) throw new Error('未找到该群组');
        throw new Error(`服务器错误: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    // 验证响应内容类型
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('服务器返回了非JSON响应:', text.substring(0, 200));
        
        // 关键：如果后端因为路由顺序问题返回了 HTML，抛出一个清晰的错误
        if (text.trim().startsWith('<!DOCTYPE')) {
            throw new Error('服务器返回了 HTML 页面，而不是 JSON。请检查 main.py 中的路由顺序。');
        }
        
        throw new Error('服务器返回了无效的JSON数据');
    }

    try {
        const data = await response.json();
        console.log('成功解析群组数据:', data);
        return data;
    } catch (error) {
        console.error('解析JSON失败:', error);
        throw new Error('解析群组数据失败');
    }
}


/**
 * API 调用: 获取群组成员 (真实版本)
 * API 路由: @app.get("/groups/{group_id}/members", ...)
 */
export async function getGroupMembers(groupId) {
    console.log('获取群组成员数据，群组ID:', groupId);
    const token = getAuthToken();
    if (!token) throw new Error('未认证');

    const response = await fetch(`/groups/${groupId}/members`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('获取群组成员失败，状态码:', response.status, '错误信息:', errorText);
        throw new Error('获取群组成员失败');
    }
    
    return await response.json();
}

/**
 * API 调用: 获取群组费用 (真实版本)
 * API 路由: @app.get("/groups/{group_id}/expenses", ...)
 */
export async function getGroupExpenses(groupId) {
    console.log('获取群组费用数据，群组ID:', groupId);
    const token = getAuthToken();
    if (!token) throw new Error('未认证');

    const response = await fetch(`/groups/${groupId}/expenses`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('获取群组费用失败，状态码:', response.status, '错误信息:', errorText);
        throw new Error('获取群组费用失败');
    }
    
    return await response.json();
}

/**
 * API 调用: 获取群组支付 (真实版本)
 * 注意: 你的后端没有 /groups/{id}/payments 路由。
 * 我们暂时返回空数组，这个功能需要后端支持。
 */
export async function getGroupPayments(groupId) {
    console.log('获取群组支付数据 - 注意：后端API暂未实现');
    const token = getAuthToken();
    if (!token) throw new Error('未认证');

    try {
        // 临时返回空数组，避免前端崩溃
        console.warn('支付API暂未实现，返回空数组');
        return [];
        
    } catch (error) {
        console.error('获取支付数据失败:', error);
        // 返回空数组避免前端崩溃
        return [];
    }
}

/**
 * API 调用: 获取群组定期费用 (真实版本)
 * API 路由: @app.get("/groups/{group_id}/recurring-expenses", ...)
 */
export async function getGroupRecurringExpenses(groupId) {
    console.log('获取群组定期费用数据，群组ID:', groupId);
    const token = getAuthToken();
    if (!token) throw new Error('未认证');

    const response = await fetch(`/groups/${groupId}/recurring-expenses`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('获取群组定期费用失败，状态码:', response.status, '错误信息:', errorText);
        throw new Error('获取群组定期费用失败');
    }
    
    return await response.json();
}

// ----------------------------------------------------------------
// --- 邀请相关的 API 调用 ---
// ----------------------------------------------------------------

/**
 * API 调用: 邀请成员到群组
 * API 路由: @app.post("/groups/{group_id}/invite", ...)
 */
export async function inviteMemberToGroup(groupId, inviteeEmail) {
    const token = getAuthToken();
    if (!token) throw new Error('未认证');

    const response = await fetch(`/groups/${groupId}/invite`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invitee_email: inviteeEmail })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '邀请成员失败');
    }
    
    return await response.json();
}

/**
 * API 调用: 获取我的待处理邀请
 * API 路由: @app.get("/invitations/me", ...)
 */
export async function getMyPendingInvitations() {
    const token = getAuthToken();
    if (!token) throw new Error('未认证');

    const response = await fetch('/invitations/me', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        throw new Error('获取邀请列表失败');
    }
    
    return await response.json();
}

/**
 * API 调用: 响应邀请
 * API 路由: @app.post("/invitations/{invitation_id}/respond", ...)
 */
export async function respondToInvitation(invitationId, action) {
    const token = getAuthToken();
    if (!token) throw new Error('未认证');

    const response = await fetch(`/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: action })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '响应邀请失败');
    }
    
    return await response.json();
}

// ----------------------------------------------------------------
// --- 费用相关的 API 调用 ---
// ----------------------------------------------------------------

/**
 * API 调用: 创建费用
 * API 路由: @app.post("/groups/{group_id}/expenses", ...)
 */
export async function createExpense(groupId, expenseData) {
    const token = getAuthToken();
    if (!token) throw new Error('未认证');

    const response = await fetch(`/groups/${groupId}/expenses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(expenseData)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '创建费用失败');
    }
    
    return await response.json();
}

/**
 * API 调用: 更新费用
 * API 路由: @app.patch("/groups/{group_id}/expenses/{expense_id}", ...)
 */
export async function updateExpense(groupId, expenseId, expenseData) {
    const token = getAuthToken();
    if (!token) throw new Error('未认证');

    const response = await fetch(`/groups/${groupId}/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(expenseData)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '更新费用失败');
    }
    
    return await response.json();
}

/**
 * API 调用: 删除费用
 * API 路由: @app.delete("/groups/{group_id}/expenses/{expense_id}", ...)
 */
export async function deleteExpense(groupId, expenseId) {
    const token = getAuthToken();
    if (!token) throw new Error('未认证');

    const response = await fetch(`/groups/${groupId}/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        // 尝试解析 JSON 错误，如果失败则返回通用错误
        try {
            const errorData = await response.json();
            throw new Error(errorData.detail || '删除费用失败');
        } catch (e) {
            throw new Error(`删除费用失败 (状态: ${response.status})`);
        }
    }
    
    // DELETE 通常返回 204 No Content，没有 body
    return { success: true };
}

// ----------------------------------------------------------------
// --- 支付相关的 API 调用 ---
// ----------------------------------------------------------------

/**
 * API 调用: 创建支付
 * API 路由: @app.post("/expenses/{expense_id}/payments", ...)
 */
export async function createPayment(expenseId, paymentData) {
    const token = getAuthToken();
    if (!token) throw new Error('未认证');

    const response = await fetch(`/expenses/${expenseId}/payments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '创建支付失败');
    }
    
    return await response.json();
}

/**
 * API 调用: 获取费用支付
 * API 路由: @app.get("/expenses/{expense_id}/payments", ...)
 */
export async function getExpensePayments(expenseId) {
    const token = getAuthToken();
    if (!token) throw new Error('未认证');

    const response = await fetch(`/expenses/${expenseId}/payments`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        throw new Error('获取支付列表失败');
    }
    
    return await response.json();
}

// ----------------------------------------------------------------
// --- 暴露函数到全局 ---
// ----------------------------------------------------------------

window.handleSignup = handleSignup;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.getCurrentUser = getCurrentUser;
window.clearAuthData = clearAuthData;
window.getGroupData = getGroupData;
window.getGroupMembers = getGroupMembers;
window.getGroupExpenses = getGroupExpenses;
window.getGroupPayments = getGroupPayments;
window.getGroupRecurringExpenses = getGroupRecurringExpenses;
window.inviteMemberToGroup = inviteMemberToGroup;
window.getMyPendingInvitations = getMyPendingInvitations;
window.respondToInvitation = respondToInvitation;
window.createExpense = createExpense;
window.updateExpense = updateExpense;
window.deleteExpense = deleteExpense;
window.createPayment = createPayment;
window.getExpensePayments = getExpensePayments;

console.log('auth.js 已加载，所有 API 函数已暴露到全局');
