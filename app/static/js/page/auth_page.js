// 文件: app/static/js/page/auth_page.js
// (完整的新内容)

import { handleSignup, handleLogin } from '../api/auth.js';
// 注意：我们没有导入 customAlert，因为这个页面有自己的 showMessage 助手

/**
 * 帮助函数：在表单上显示消息
 * @param {string} formId - 'login-form' 或 'signup-form'
 * @param {string} message - 要显示的消息
 * @param {string} type - 'error' (红色) 或 'success' (绿色)
 */
function showMessage(formId, message, type = 'error') {
    // 寻找特定表单内的 message-box
    const messageBox = document.querySelector(`#${formId} #message-box`);
    if (!messageBox) return;

    messageBox.textContent = message;
    messageBox.className = `p-3 mb-4 rounded-lg text-sm text-center ${
        type === 'error' 
            ? 'bg-red-100 text-red-700' 
            : 'bg-green-100 text-green-700'
    }`;
    messageBox.classList.remove('hidden');
}

/**
 * 包装器：确保 DOM 加载完毕后再执行
 */
document.addEventListener('DOMContentLoaded', () => {

    // === 1. 注册页面逻辑 ===
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        // 监听 "立即注册" 按钮的提交
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // 阻止表单的默认 POST 行为
            
            const signupButton = document.getElementById('signup-button');
            signupButton.disabled = true;
            signupButton.textContent = '注册中...';

            // 从表单获取数据
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // 客户端验证
            if (!username || !email || !password || !confirmPassword) {
                showMessage('signup-form', '所有字段都是必填项', 'error');
                signupButton.disabled = false;
                signupButton.textContent = '立即注册';
                return;
            }
            if (password !== confirmPassword) {
                showMessage('signup-form', '两次输入的密码不一致', 'error');
                signupButton.disabled = false;
                signupButton.textContent = '立即注册';
                return;
            }

            try {
                // 调用 API (来自 api/auth.js)
                // 确保 API 路由是 /users/signup
                await handleSignup(username, email, password);
                showMessage('signup-form', '账户注册成功！正在跳转到登录页面...', 'success');
                setTimeout(() => {
                    window.location.href = '/login'; // 注册成功，跳转到登录
                }, 2000);
            } catch (error) {
                showMessage('signup-form', error.message, 'error');
                signupButton.disabled = false;
                signupButton.textContent = '立即注册';
            }
        });

        // 监听 "去登录" 链接 (使用我们添加的 ID)
        const loginLink = document.getElementById('login-redirect-link');
        if (loginLink) {
            loginLink.addEventListener('click', (event) => {
                event.preventDefault(); // 阻止 <a> 标签的默认跳转
                window.location.href = '/login';
            });
        }
    }

    // === 2. 登录页面逻辑 ===
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        // 监听 "立即登录" 按钮的提交
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // 阻止表单的默认 POST 行为
            
            const loginButton = document.getElementById('login-button');
            loginButton.disabled = true;
            loginButton.textContent = '登录中...';

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                // 调用 API (来自 api/auth.js)
                // 确保 API 路由是 /token
                await handleLogin(email, password);
                showMessage('login-form', '登录成功！正在跳转...', 'success');
                window.location.href = '/home'; // 登录成功，跳转到主页
            } catch (error) {
                showMessage('login-form', error.message, 'error');
                loginButton.disabled = false;
                loginButton.textContent = '立即登录';
            }
        });

        // 监听 "去注册" 链接 (使用我们添加的 ID)
        const signupLink = document.getElementById('signup-redirect-link');
        if (signupLink) {
            signupLink.addEventListener('click', (event) => {
                event.preventDefault(); // 阻止 <a> 标签的默认跳转
                window.location.href = '/signup';
            });
        }
    }
});