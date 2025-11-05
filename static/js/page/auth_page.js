/**
 * 认证页面模块
 * 处理登录和注册页面的交互逻辑
 */

import { handleLogin, handleSignup, validateAuthForm, validatePasswordStrength, validateEmail } from '../api/auth.js';
import { Utils, notifications } from '../ui/utils.js';

// 页面初始化
export async function initializeAuthPage() {
  console.log('初始化认证页面...');
  
  // 检查是否已登录
  if (isAuthenticated()) {
    window.location.href = '/';
    return;
  }
  
  // 绑定事件监听器
  bindEventListeners();
  
  // 初始化表单验证
  initializeFormValidation();
  
  console.log('认证页面初始化完成');
}

// 检查认证状态
function isAuthenticated() {
  const token = localStorage.getItem('access_token');
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    return !payload.exp || payload.exp > now;
  } catch {
    return false;
  }
}

// 绑定事件监听器
function bindEventListeners() {
  // 登录表单
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }
  
  // 注册表单
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignupSubmit);
  }
  
  // 密码可见性切换
  bindPasswordToggle();
  
  // 实时表单验证
  bindRealTimeValidation();
  
  // 忘记密码链接
  bindForgotPasswordLink();
  
  // 键盘快捷键
  bindKeyboardShortcuts();
}

// 处理登录提交
async function handleLoginSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  // 验证表单
  const validation = validateAuthForm({
    email: formData.get('email'),
    password: formData.get('password')
  }, 'login');
  
  if (!validation.isValid) {
    showFormErrors(validation.errors);
    return;
  }
  
  // 显示加载状态
  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = '登录中...';
  
  try {
    const result = await handleLogin({
      email: formData.get('email'),
      password: formData.get('password')
    });
    
    if (result.success) {
      // 登录成功，已在API中处理跳转
      console.log('登录成功');
    } else {
      showFormErrors([result.error]);
    }
  } catch (error) {
    console.error('登录处理失败:', error);
    showFormErrors(['登录过程中发生错误，请重试']);
  } finally {
    // 恢复按钮状态
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
}

// 处理注册提交
async function handleSignupSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  // 验证表单
  const validation = validateAuthForm({
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    password_confirm: formData.get('password_confirm')
  }, 'signup');
  
  if (!validation.isValid) {
    showFormErrors(validation.errors);
    return;
  }
  
  // 显示加载状态
  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = '注册中...';
  
  try {
    const result = await handleSignup({
      username: formData.get('username'),
      email: formData.get('email'),
      password: formData.get('password'),
      password_confirm: formData.get('password_confirm')
    });
    
    if (result.success) {
      // 注册成功，已在API中处理跳转
      console.log('注册成功');
    } else {
      showFormErrors([result.error]);
    }
  } catch (error) {
    console.error('注册处理失败:', error);
    showFormErrors(['注册过程中发生错误，请重试']);
  } finally {
    // 恢复按钮状态
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
}

// 显示表单错误
function showFormErrors(errors) {
  // 清除之前的错误
  clearFormErrors();
  
  // 显示新错误
  errors.forEach((error, index) => {
    const errorElement = Utils.dom.create('div', {
      className: 'mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center'
    }, `
      <i class="fas fa-exclamation-circle mr-2"></i>
      <span>${error}</span>
    `);
    
    const form = document.querySelector('form');
    if (form) {
      form.appendChild(errorElement);
      
      // 自动滚动到错误信息
      if (index === 0) {
        setTimeout(() => {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  });
}

// 清除表单错误
function clearFormErrors() {
  const errorElements = document.querySelectorAll('.bg-red-50.border-red-200');
  errorElements.forEach(element => element.remove());
}

// 绑定密码可见性切换
function bindPasswordToggle() {
  document.querySelectorAll('.password-toggle').forEach(toggle => {
    toggle.addEventListener('click', function() {
      const passwordField = this.previousElementSibling;
      const icon = this.querySelector('i');
      
      if (passwordField.type === 'password') {
        passwordField.type = 'text';
        icon.className = 'fas fa-eye-slash';
      } else {
        passwordField.type = 'password';
        icon.className = 'fas fa-eye';
      }
    });
  });
}

// 绑定实时表单验证
function bindRealTimeValidation() {
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    const inputs = form.querySelectorAll('input[required], input[type="email"], input[type="password"]');
    
    inputs.forEach(input => {
      input.addEventListener('blur', function() {
        validateField(this);
      });
      
      input.addEventListener('input', Utils.debounce(function() {
        validateField(this);
      }, 500));
    });
    
    // 密码强度实时检查
    const passwordInput = form.querySelector('input[type="password"]');
    if (passwordInput && passwordInput.name === 'password') {
      passwordInput.addEventListener('input', function() {
        showPasswordStrength(this.value);
      });
    }
  });
}

// 验证单个字段
function validateField(field) {
  const value = field.value.trim();
  const fieldName = field.name;
  let isValid = true;
  let message = '';
  
  // 清除之前的验证状态
  field.classList.remove('error', 'valid');
  
  // 必填字段验证
  if (field.hasAttribute('required') && !value) {
    isValid = false;
    message = '此字段为必填项';
  }
  
  // 邮箱格式验证
  else if (field.type === 'email' && value && !validateEmail(value)) {
    isValid = false;
    message = '请输入有效的邮箱地址';
  }
  
  // 用户名验证
  else if (fieldName === 'username' && value && value.length < 3) {
    isValid = false;
    message = '用户名至少需要3个字符';
  }
  
  // 密码验证
  else if (field.type === 'password' && fieldName === 'password') {
    if (value && value.length < 6) {
      isValid = false;
      message = '密码至少需要6个字符';
    }
  }
  
  // 确认密码验证
  else if (fieldName === 'password_confirm') {
    const password = form.querySelector('input[name="password"]').value;
    if (value && value !== password) {
      isValid = false;
      message = '两次输入的密码不一致';
    }
  }
  
  // 应用验证结果
  if (isValid && value) {
    field.classList.add('valid');
  } else if (!isValid) {
    field.classList.add('error');
    showFieldError(field, message);
  }
}

// 显示字段错误
function showFieldError(field, message) {
  // 清除之前的字段错误
  const existingError = field.parentNode.querySelector('.field-error');
  if (existingError) {
    existingError.remove();
  }
  
  // 显示新错误
  if (message) {
    const errorElement = Utils.dom.create('div', {
      className: 'field-error mt-1 text-red-600 text-sm flex items-center'
    }, `
      <i class="fas fa-exclamation-circle mr-1"></i>
      <span>${message}</span>
    `);
    
    field.parentNode.appendChild(errorElement);
  }
}

// 显示密码强度
function showPasswordStrength(password) {
  const container = document.getElementById('password-strength');
  if (!container) return;
  
  const validation = validatePasswordStrength(password);
  
  let strengthText = '';
  let strengthColor = '';
  
  switch (validation.strength) {
    case 'weak':
      strengthText = '弱';
      strengthColor = 'text-red-600';
      break;
    case 'medium':
      strengthText = '中等';
      strengthColor = 'text-yellow-600';
      break;
    case 'strong':
      strengthText = '强';
      strengthColor = 'text-green-600';
      break;
    default:
      strengthText = '';
      strengthColor = 'text-gray-400';
  }
  
  container.innerHTML = `
    <div class="mt-1">
      <div class="flex items-center text-sm ${strengthColor}">
        <i class="fas fa-shield-alt mr-1"></i>
        <span>密码强度: ${strengthText}</span>
      </div>
      <div class="mt-1 w-full bg-gray-200 rounded-full h-2">
        <div class="h-2 rounded-full transition-all duration-300 ${
          validation.strength === 'weak' ? 'bg-red-500 w-1/3' :
          validation.strength === 'medium' ? 'bg-yellow-500 w-2/3' :
          validation.strength === 'strong' ? 'bg-green-500 w-full' :
          'bg-gray-300 w-0'
        }"></div>
      </div>
      ${validation.requirements ? `
        <div class="mt-2 text-xs text-gray-500">
          <div class="grid grid-cols-2 gap-1">
            ${Object.entries(validation.requirements).map(([key, valid]) => `
              <div class="flex items-center ${valid ? 'text-green-600' : 'text-gray-400'}">
                <i class="fas fa-${valid ? 'check' : 'times'} mr-1 text-xs"></i>
                <span>${
                  key === 'minLength' ? '至少8位' :
                  key === 'hasUpperCase' ? '包含大写字母' :
                  key === 'hasLowerCase' ? '包含小写字母' :
                  key === 'hasNumbers' ? '包含数字' :
                  key === 'hasSpecialChar' ? '包含特殊字符' :
                  key
                }</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// 绑定忘记密码链接
function bindForgotPasswordLink() {
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function(event) {
      event.preventDefault();
      showForgotPasswordModal();
    });
  }
}

// 显示忘记密码模态框
function showForgotPasswordModal() {
  const modal = Utils.dom.create('div', {
    className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  }, `
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">忘记密码</h3>
      <form id="forgot-password-form">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">邮箱地址</label>
          <input type="email" name="email" required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="请输入注册时使用的邮箱">
        </div>
        <div class="flex justify-end space-x-3">
          <button type="button" onclick="this.closest('.fixed').remove()"
            class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
            取消
          </button>
          <button type="submit"
            class="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
            发送重置邮件
          </button>
        </div>
      </form>
    </div>
  `);
  
  document.body.appendChild(modal);
  
  // 处理表单提交
  const form = modal.querySelector('#forgot-password-form');
  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const formData = new FormData(form);
    const email = formData.get('email');
    
    if (!validateEmail(email)) {
      notifications.error('请输入有效的邮箱地址');
      return;
    }
    
    // 这里应该调用密码重置API
    notifications.info('密码重置功能开发中...');
    modal.remove();
  });
}

// 绑定键盘快捷键
function bindKeyboardShortcuts() {
  document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + Enter 提交表单
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === 'FORM') {
        const submitButton = activeElement.querySelector('button[type="submit"]');
        if (submitButton && !submitButton.disabled) {
          submitButton.click();
        }
      }
    }
    
    // ESC 关闭模态框
    if (event.key === 'Escape') {
      const modals = document.querySelectorAll('.fixed.inset-0');
      if (modals.length > 0) {
        modals[modals.length - 1].remove();
      }
    }
  });
}

// 初始化表单验证
function initializeFormValidation() {
  // 为所有表单添加防重复提交
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function() {
      const submitButton = this.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        setTimeout(() => {
          submitButton.disabled = false;
        }, 3000); // 3秒后恢复
      }
    });
  });
  
  // 自动聚焦第一个输入框
  const firstInput = document.querySelector('form input:not([type="hidden"])');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

// 页面特定的初始化
function initializeLoginPage() {
  console.log('初始化登录页面...');
  
  // 设置页面标题
  document.title = '登录 - 群组管理系统';
  
  // 添加登录特定的样式类
  const container = document.getElementById('login-container');
  if (container) {
    container.classList.add('fade-in');
  }
}

function initializeSignupPage() {
  console.log('初始化注册页面...');
  
  // 设置页面标题
  document.title = '注册 - 群组管理系统';
  
  // 添加注册特定的样式类
  const container = document.getElementById('signup-container');
  if (container) {
    container.classList.add('fade-in');
  }
}

// 自动检测页面类型并初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('login-form')) {
      initializeLoginPage();
    }
    if (document.getElementById('signup-form')) {
      initializeSignupPage();
    }
    initializeAuthPage();
  });
} else {
  if (document.getElementById('login-form')) {
    initializeLoginPage();
  }
  if (document.getElementById('signup-form')) {
    initializeSignupPage();
  }
  initializeAuthPage();
}