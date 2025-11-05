/**
 * 认证相关API
 * 处理用户登录、注册、密码重置等认证功能
 */

import { apiRequest, apiPost, notifications } from '../ui/utils.js';

// 登录
export async function handleLogin(formData) {
  try {
    console.log('正在登录...', formData.email);
    
    notifications.showLoading('正在登录...');
    
    const response = await apiPost('/auth/login/', {
      username: formData.email, // OAuth2PasswordRequestForm需要username字段
      password: formData.password
    });
    
    if (response.access_token) {
      // 存储token
      localStorage.setItem('access_token', response.access_token);
      
      notifications.hideLoading();
      notifications.success('登录成功', 2000);
      
      // 跳转到主页
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
      return { success: true, user: response.user };
    } else {
      throw new Error('登录响应格式错误');
    }
    
  } catch (error) {
    notifications.hideLoading();
    console.error('登录失败:', error);
    
    let errorMessage = '登录失败';
    if (error.message.includes('401')) {
      errorMessage = '邮箱或密码错误';
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败，请检查网络设置';
    }
    
    notifications.error(errorMessage);
    return { success: false, error: errorMessage };
  }
}

// 注册
export async function handleSignup(formData) {
  try {
    console.log('正在注册...', formData.email);
    
    notifications.showLoading('正在注册...');
    
    const response = await apiPost('/auth/register/', {
      username: formData.username,
      email: formData.email,
      password: formData.password,
      password_confirm: formData.password_confirm
    });
    
    notifications.hideLoading();
    
    if (response.message) {
      notifications.success('注册成功，请登录', 3000);
      
      // 跳转到登录页
      setTimeout(() => {
        window.location.href = '/login/';
      }, 2000);
      
      return { success: true };
    } else {
      throw new Error('注册响应格式错误');
    }
    
  } catch (error) {
    notifications.hideLoading();
    console.error('注册失败:', error);
    
    let errorMessage = '注册失败';
    if (error.message.includes('400')) {
      errorMessage = '输入信息无效，请检查邮箱格式和密码强度';
    } else if (error.message.includes('409')) {
      errorMessage = '该邮箱或用户名已被注册';
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败，请检查网络设置';
    }
    
    notifications.error(errorMessage);
    return { success: false, error: errorMessage };
  }
}

// 密码重置请求
export async function requestPasswordReset(email) {
  try {
    console.log('正在发送密码重置邮件...', email);
    
    notifications.showLoading('正在发送密码重置邮件...');
    
    const response = await apiPost('/auth/password-reset/', {
      email: email
    });
    
    notifications.hideLoading();
    
    if (response.message) {
      notifications.success('密码重置邮件已发送，请检查您的邮箱', 5000);
      return { success: true };
    } else {
      throw new Error('密码重置响应格式错误');
    }
    
  } catch (error) {
    notifications.hideLoading();
    console.error('密码重置请求失败:', error);
    
    let errorMessage = '发送密码重置邮件失败';
    if (error.message.includes('404')) {
      errorMessage = '该邮箱地址未注册';
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败，请重试';
    }
    
    notifications.error(errorMessage);
    return { success: false, error: errorMessage };
  }
}

// 密码重置确认
export async function confirmPasswordReset(token, newPassword, confirmPassword) {
  try {
    console.log('正在重置密码...');
    
    if (newPassword !== confirmPassword) {
      notifications.error('两次输入的密码不一致');
      return { success: false, error: '密码不一致' };
    }
    
    notifications.showLoading('正在重置密码...');
    
    const response = await apiPost('/auth/password-reset/confirm/', {
      token: token,
      new_password: newPassword,
      confirm_password: confirmPassword
    });
    
    notifications.hideLoading();
    
    if (response.message) {
      notifications.success('密码重置成功，请使用新密码登录', 3000);
      
      // 跳转到登录页
      setTimeout(() => {
        window.location.href = '/login/';
      }, 2000);
      
      return { success: true };
    } else {
      throw new Error('密码重置响应格式错误');
    }
    
  } catch (error) {
    notifications.hideLoading();
    console.error('密码重置失败:', error);
    
    let errorMessage = '密码重置失败';
    if (error.message.includes('400')) {
      errorMessage = '密码重置token无效或已过期';
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败，请重试';
    }
    
    notifications.error(errorMessage);
    return { success: false, error: errorMessage };
  }
}

// 验证邮箱
export async function verifyEmail(token) {
  try {
    console.log('正在验证邮箱...');
    
    notifications.showLoading('正在验证邮箱...');
    
    const response = await apiRequest(`/auth/verify-email/${token}/`, {
      method: 'POST'
    });
    
    notifications.hideLoading();
    
    if (response.message) {
      notifications.success('邮箱验证成功', 3000);
      return { success: true };
    } else {
      throw new Error('邮箱验证响应格式错误');
    }
    
  } catch (error) {
    notifications.hideLoading();
    console.error('邮箱验证失败:', error);
    
    let errorMessage = '邮箱验证失败';
    if (error.message.includes('404')) {
      errorMessage = '验证链接无效或已过期';
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败，请重试';
    }
    
    notifications.error(errorMessage);
    return { success: false, error: errorMessage };
  }
}

// 刷新token
export async function refreshToken() {
  try {
    const currentToken = localStorage.getItem('access_token');
    if (!currentToken) {
      throw new Error('没有可刷新的token');
    }
    
    const response = await apiPost('/auth/refresh/', {
      refresh_token: currentToken
    });
    
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token);
      return { success: true, token: response.access_token };
    } else {
      throw new Error('刷新token响应格式错误');
    }
    
  } catch (error) {
    console.error('刷新token失败:', error);
    
    // 如果刷新失败，清除token并跳转到登录页
    if (error.message.includes('401') || error.message.includes('token')) {
      localStorage.removeItem('access_token');
      window.location.href = '/login/';
    }
    
    return { success: false, error: error.message };
  }
}

// 检查登录状态
export function isAuthenticated() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return false;
  }
  
  try {
    // 检查token是否过期（简单检查）
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    
    if (payload.exp && payload.exp < now) {
      console.log('Token已过期');
      localStorage.removeItem('access_token');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Token解析错误:', error);
    localStorage.removeItem('access_token');
    return false;
  }
}

// 获取当前用户信息
export async function getCurrentUser() {
  try {
    if (!isAuthenticated()) {
      throw new Error('用户未登录');
    }
    
    const response = await apiRequest('/me/', {
      method: 'GET'
    });
    
    return response;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
}

// 登出
export async function logout() {
  try {
    // 调用登出API（可选）
    await apiRequest('/logout/', {
      method: 'POST'
    }).catch(() => {
      // 即使API调用失败，也清除本地状态
      console.warn('登出API调用失败，但继续清除本地状态');
    });
    
    // 清除本地token和用户信息
    localStorage.removeItem('access_token');
    
    notifications.success('已成功退出登录');
    
    // 跳转到登录页
    setTimeout(() => {
      window.location.href = '/login/';
    }, 1000);
    
    return { success: true };
  } catch (error) {
    console.error('登出失败:', error);
    
    // 即使出错也清除本地状态
    localStorage.removeItem('access_token');
    
    notifications.error('登出过程中发生错误');
    return { success: false, error: error.message };
  }
}

// 密码强度验证
export function validatePasswordStrength(password) {
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const score = Object.values(requirements).filter(Boolean).length;
  
  let strength = 'weak';
  if (score >= 4) {
    strength = 'strong';
  } else if (score >= 3) {
    strength = 'medium';
  }
  
  return {
    strength,
    score,
    requirements,
    isValid: score >= 3
  };
}

// 邮箱格式验证
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 表单验证
export function validateAuthForm(formData, type = 'login') {
  const errors = [];
  
  if (type === 'signup') {
    if (!formData.username || formData.username.length < 3) {
      errors.push('用户名至少需要3个字符');
    }
    
    if (!validateEmail(formData.email)) {
      errors.push('请输入有效的邮箱地址');
    }
    
    if (formData.password.length < 6) {
      errors.push('密码至少需要6个字符');
    }
    
    if (formData.password !== formData.password_confirm) {
      errors.push('两次输入的密码不一致');
    }
    
    const passwordValidation = validatePasswordStrength(formData.password);
    if (!passwordValidation.isValid) {
      errors.push('密码强度不够，请使用更复杂的密码');
    }
  } else if (type === 'login') {
    if (!validateEmail(formData.email)) {
      errors.push('请输入有效的邮箱地址');
    }
    
    if (!formData.password) {
      errors.push('请输入密码');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}