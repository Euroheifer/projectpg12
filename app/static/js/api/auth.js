import { customAlert } from '../ui/utils.js';

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