import { handleSignup, handleLogin } from '../api/auth.js';
import { customAlert } from '../ui/utils.js';

// 辅助函数：显示消息
function showMessage(message, type = 'info') {
    const messageBox = document.getElementById('message-box');
    if (!messageBox) return;
    messageBox.textContent = message;
    messageBox.className = `p-3 mb-4 rounded-lg text-sm text-center ${type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
    messageBox.classList.remove('hidden');
}

// === 登录页面逻辑 ===
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const loginButton = document.getElementById('login-button');
        loginButton.disabled = true;
        loginButton.textContent = '登录中...';

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            await handleLogin(email, password);
            showMessage('登录成功！正在跳转', 'success');
            window.location.href = '/home'; // 登录成功，跳转到主页
        } catch (error) {
            showMessage(error.message, 'error');
            loginButton.disabled = false;
            loginButton.textContent = '立即登录';
        }
    });
}

// === 注册页面逻辑 ===
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const signupButton = document.getElementById('signup-button');
        signupButton.disabled = true;
        signupButton.textContent = '注册中...';

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // (省略验证) ...

        try {
            await handleSignup(username, email, password);
            showMessage('账户注册成功！正在跳转到登录页面...', 'success');
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } catch (error) {
            showMessage(error.message, 'error');
            signupButton.disabled = false;
            signupButton.textContent = '立即注册';
        }
    });
}