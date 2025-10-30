// 获取DOM元素
const messageBox = document.getElementById('message-box');
const signupButton = document.getElementById('signup-button');
const loginButton = document.getElementById('login-button');

/**
 * 显示消息
 */
function showMessage(message, type = 'info') {
    if (!messageBox) return;

    messageBox.textContent = message;
    messageBox.className = `p-3 mb-4 rounded-lg text-sm text-center ${type === 'error' ? 'bg-red-100 text-red-700' :
            type === 'success' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
        }`;
    messageBox.classList.remove('hidden');
}

/**********************************
 * 处理注册表单提交
 *********************************/
async function handleSignup(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // 验证
    if (!username || !email || !password || !confirmPassword) {
        showMessage('所有字段都是必填项', 'error');
        return false;
    }
    if (password.length < 6) {
        showMessage('密码长度不能少于6位', 'error');
        return false;
    }
    if (password !== confirmPassword) {
        showMessage('两次输入的密码不一致', 'error');
        return false;
    }

    // 加载状态
    signupButton.disabled = true;
    signupButton.textContent = '注册中...';
    showMessage('正在提交注册信息...', 'info');

    // 调用后端API
    try {
        const response = await fetch('/users/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, username })
        });

        if (response.ok) {
            document.getElementById('signup-form').reset();
            showMessage('账户注册成功！', 'success');
        } else {
            const errorData = await response.json();
            showMessage(errorData.detail || '注册失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请稍后重试', 'error');
    } finally {
        signupButton.disabled = false;
        signupButton.textContent = '立即注册';
    }

    return false;
}

/**********************************
 * 处理登录表单提交
 *********************************/
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // 客户端基本验证
    if (!email || !password) {
        showMessage('电子邮箱和密码都是必填项', 'error');
        return false;
    }

    // 禁用按钮并显示加载状态
    loginButton.disabled = true;
    loginButton.textContent = '登录中...';
    showMessage('正在验证凭证...', 'info');

    // 构造 OAuth2 预期的 'application/x-www-form-urlencoded' 格式数据
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
        // 调用 FastAPI 后端 API (/token)
        const response = await fetch('/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        });

        if (response.ok) {
            // HTTP 200 OK 成功
            const tokenData = await response.json();

            // 存储 Token
            localStorage.setItem('access_token', tokenData.access_token);
            localStorage.setItem('token_type', tokenData.token_type);

            showMessage('登录成功！正在跳转', 'success');
            window.location.href = '/home';
        } else {
            // 处理非成功状态码
            const errorData = await response.json();
            let errorMessage = '登录失败，请检查邮箱和密码是否正确。';

            if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                }
            }

            if (errorMessage.includes("Incorrect username or password")) {
                errorMessage = '邮箱或密码不正确，请重试。';
            } else if (errorMessage.includes("Not enough values to unpack")) {
                errorMessage = '凭证格式错误或不完整。';
            }

            showMessage(`错误: ${errorMessage}`, 'error');
        }

    } catch (error) {
        console.error('登录 API 调用失败:', error);
        showMessage('网络连接或服务器错误，请稍后重试。', 'error');
    } finally {
        // 恢复按钮状态
        loginButton.disabled = false;
        loginButton.textContent = '立即登录';
    }

    return false;
}

// login.js - 登录成功后的处理
async function handleLoginSuccess(response) {
    const data = await response.json();

    // 保存 token 和用户信息
    if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
    }
    if (data.user) {
        localStorage.setItem('current_user', JSON.stringify(data.user));
    }

    // 跳转到首页
    window.location.href = '/home';
}
/**
 * 跳转到登录页面
 */
function handleLoginRedirect(event) {
    event.preventDefault();
    window.location.href = '/login';
}

/**
 * 跳转到注册页面
 */
function handleSignupRedirect(event) {
    event.preventDefault();
    window.location.href = '/signup';
}
