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
//！！mock！！
export async function getGroupData(groupId) {
    try {
        await new Promise(resolve => setTimeout(resolve, 500));

        const groupIdNum = parseInt(groupId);

        // 模拟数据
        if (groupIdNum === 12) {
            return {
                id: 12,
                name: '周末旅行基金',
                description: '用于记录周末旅行相关费用',
                current_user_role: 'admin'
            };
        } else if (groupIdNum === 13) {
            return {
                id: 13,
                name: '项目开发小组',
                description: '项目PG12开发费用管理',
                current_user_role: 'member'
            };
        } else {
            return {
                id: groupIdNum,
                name: `群组 ${groupIdNum}`,
                description: '群组描述',
                current_user_role: 'member'
            };
        }
    } catch (error) {
        console.error('获取群组数据失败:', error);
        throw error;
    }
}




// /static/js/api/auth.js

// 模拟数据生成
function createMockData(groupId) {
    return {
        members: [
            { id: 1, username: 'tom', email: 'tom@example.com', role: 'admin' },
            { id: 2, username: 'jerry', email: 'jerry@example.com', role: 'member' },
            { id: 3, username: 'alice', email: 'alice@example.com', role: 'member' },
            { id: 4, username: 'bob', email: 'bob@example.com', role: 'member' }
        ],
        expenses: [
            { id: 1, description: '周末聚餐', amount: '150.00', payer_name: 'tom', date: '2024-01-15', participants_count: 4 },
            { id: 2, description: '交通费', amount: '80.50', payer_name: 'jerry', date: '2024-01-14', participants_count: 3 },
            { id: 3, description: '住宿费', amount: '300.00', payer_name: 'alice', date: '2024-01-13', participants_count: 2 }
        ],
        payments: [
            { id: 1, description: '还款给tom', amount: '50.00', payer_name: 'jerry', receiver_name: 'tom', date: '2024-01-16' },
            { id: 2, description: '结算交通费', amount: '30.25', payer_name: 'alice', receiver_name: 'jerry', date: '2024-01-15' }
        ],
        recurringExpenses: [
            { id: 1, description: '每月房租', amount: '1200.00', payer_name: 'tom', frequency: 'monthly', start_date: '2024-01-01', end_date: '2024-12-31', status: 'active' },
            { id: 2, description: '每周清洁费', amount: '50.00', payer_name: 'jerry', frequency: 'weekly', start_date: '2024-01-01', status: 'active' }
        ]
    };
}

// 数据列表API
export async function getGroupMembers(groupId) {
    console.log('获取群组成员数据');
    return createMockData(groupId).members;
}

export async function getGroupExpenses(groupId) {
    console.log('获取群组费用数据');
    return createMockData(groupId).expenses;
}

export async function getGroupPayments(groupId) {
    console.log('获取群组支付数据');
    return createMockData(groupId).payments;
}

export async function getGroupRecurringExpenses(groupId) {
    console.log('获取群组定期费用数据');
    return createMockData(groupId).recurringExpenses;
}

// 暴露函数到全局
window.handleSignup = handleSignup;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
