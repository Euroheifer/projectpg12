/**
 * 菜单管理模块
 * 负责用户菜单的交互和用户状态管理
 */

import { getAuthToken, setAuthToken, clearAuthToken, apiRequest, notifications } from './utils.js';

// 全局变量
let currentUser = null;
let isMenuOpen = false;
let isInitialized = false;

// 用户菜单初始化
export function initUserMenu() {
  if (isInitialized) {
    console.warn('用户菜单已经初始化');
    return;
  }

  isInitialized = true;
  console.log('初始化用户菜单...');

  // 绑定事件监听器
  bindEventListeners();
  
  // 初始化用户信息
  initializeUser();
  
  // 返回公共API
  return {
    toggleUserMenu,
    handleLogout,
    getCurrentUser,
    refreshUserInfo
  };
}

// 绑定事件监听器
function bindEventListeners() {
  // 用户菜单按钮点击事件
  const userMenuButton = document.getElementById('user-menu-button');
  if (userMenuButton) {
    userMenuButton.addEventListener('click', toggleUserMenu);
  }

  // 点击外部关闭菜单
  document.addEventListener('click', function(event) {
    const menuContainer = document.getElementById('user-menu-container');
    const dropdown = document.getElementById('user-dropdown');
    
    if (menuContainer && dropdown && 
        !menuContainer.contains(event.target) && 
        isMenuOpen) {
      closeUserMenu();
    }
  });

  // ESC键关闭菜单
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && isMenuOpen) {
      closeUserMenu();
    }
  });

  // 窗口大小改变时关闭菜单
  window.addEventListener('resize', function() {
    if (isMenuOpen) {
      closeUserMenu();
    }
  });
}

// 初始化用户信息
async function initializeUser() {
  try {
    const token = getAuthToken();
    if (!token) {
      console.log('未找到认证token，用户未登录');
      updateUIForUnauthenticated();
      return;
    }

    console.log('正在获取用户信息...');
    currentUser = await getCurrentUserInfo();
    
    if (currentUser) {
      console.log('获取用户信息成功:', currentUser.username);
      updateUIForAuthenticated(currentUser);
    } else {
      console.warn('无法获取用户信息');
      updateUIForUnauthenticated();
    }
  } catch (error) {
    console.error('初始化用户信息失败:', error);
    // 如果获取用户信息失败，可能是token过期
    if (error.message.includes('认证') || error.message.includes('401')) {
      clearAuthToken();
      updateUIForUnauthenticated();
    }
  }
}

// 获取当前用户信息
async function getCurrentUserInfo() {
  try {
    const response = await apiRequest('/me', {
      method: 'GET'
    });
    return response;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
}

// 更新已认证用户的UI
function updateUIForAuthenticated(user) {
  const userDisplay = document.getElementById('user-display');
  const userMenuButton = document.getElementById('user-menu-button');
  
  if (userDisplay) {
    userDisplay.textContent = user.username || user.email || '用户';
  }
  
  if (userMenuButton) {
    const userIcon = userMenuButton.querySelector('div');
    if (userIcon) {
      userIcon.textContent = (user.username || '用')[0].toUpperCase();
    }
  }

  // 显示用户邮箱（如果有）
  const userEmail = document.getElementById('user-email');
  if (userEmail && user.email) {
    userEmail.textContent = user.email;
  }

  // 更新下拉菜单中的用户信息
  updateUserDropdownInfo(user);
}

// 更新未认证用户的UI
function updateUIForUnauthenticated() {
  const userDisplay = document.getElementById('user-display');
  if (userDisplay) {
    userDisplay.textContent = '未登录';
  }

  // 隐藏用户菜单相关元素
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
}

// 更新用户下拉菜单信息
function updateUserDropdownInfo(user) {
  const dropdown = document.getElementById('user-dropdown');
  if (!dropdown) return;

  // 更新用户信息显示
  const userInfo = dropdown.querySelector('.user-info');
  if (userInfo) {
    userInfo.innerHTML = `
      <p class="text-sm font-medium text-gray-900">${user.username || '用户名'}</p>
      <p class="text-xs text-gray-500">${user.email || '用户邮箱'}</p>
    `;
  }
}

// 切换用户菜单显示状态
export function toggleUserMenu() {
  const dropdown = document.getElementById('user-dropdown');
  const caret = document.getElementById('menu-caret');
  
  if (!dropdown || !caret) {
    console.warn('用户菜单元素未找到');
    return;
  }

  if (isMenuOpen) {
    closeUserMenu();
  } else {
    openUserMenu();
  }
}

// 打开用户菜单
function openUserMenu() {
  const dropdown = document.getElementById('user-dropdown');
  const caret = document.getElementById('menu-caret');
  
  if (dropdown && caret) {
    dropdown.classList.remove('hidden');
    dropdown.classList.add('dropdown-menu');
    caret.style.transform = 'rotate(180deg)';
    isMenuOpen = true;
    
    console.log('用户菜单已打开');
  }
}

// 关闭用户菜单
function closeUserMenu() {
  const dropdown = document.getElementById('user-dropdown');
  const caret = document.getElementById('menu-caret');
  
  if (dropdown && caret) {
    dropdown.classList.add('hidden');
    caret.style.transform = 'rotate(0deg)';
    isMenuOpen = false;
    
    console.log('用户菜单已关闭');
  }
}

// 处理用户退出登录
export async function handleLogout() {
  try {
    const confirmed = await confirmLogout();
    if (!confirmed) return;

    notifications.showLoading('正在退出登录...');
    
    // 调用登出API
    await apiRequest('/logout/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 清除本地token
    clearAuthToken();
    currentUser = null;
    
    notifications.hideLoading();
    notifications.success('已成功退出登录', 2000);
    
    // 跳转到登录页
    setTimeout(() => {
      window.location.href = '/login/';
    }, 1000);
    
  } catch (error) {
    notifications.hideLoading();
    console.error('退出登录失败:', error);
    notifications.error('退出登录失败，请重试');
  }
}

// 确认退出登录
function confirmLogout() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">确认退出</h3>
        <p class="text-gray-600 mb-6">确定要退出登录吗？</p>
        <div class="flex justify-end space-x-3">
          <button onclick="this.closest('.fixed').remove(); resolve(false)" 
            class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-150">
            取消
          </button>
          <button onclick="this.closest('.fixed').remove(); resolve(true)" 
            class="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition duration-150">
            退出登录
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 点击外部关闭
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    });
    
    // ESC键关闭
    const handleEsc = function(e) {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEsc);
        resolve(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
  });
}

// 获取当前用户信息
export function getCurrentUser() {
  return currentUser;
}

// 刷新用户信息
export async function refreshUserInfo() {
  try {
    if (!getAuthToken()) {
      throw new Error('用户未登录');
    }
    
    const userInfo = await getCurrentUserInfo();
    if (userInfo) {
      currentUser = userInfo;
      updateUIForAuthenticated(currentUser);
      return userInfo;
    }
    return null;
  } catch (error) {
    console.error('刷新用户信息失败:', error);
    throw error;
  }
}

// 处理用户资料页面跳转
export function handleMyProfile() {
  console.log('跳转到用户资料页面');
  window.location.href = '/profile/';
}

// 处理返回仪表板
export function handleBackToDashboard() {
  console.log('返回仪表板');
  window.location.href = '/';
}

// 显示用户状态信息
export function showUserStatus() {
  if (!currentUser) {
    console.log('用户未登录');
    return;
  }
  
  console.log('当前用户信息:', {
    username: currentUser.username,
    email: currentUser.email,
    id: currentUser.id,
    isAdmin: currentUser.is_admin,
    lastLogin: currentUser.last_login
  });
}

// 错误处理
window.addEventListener('error', function(event) {
  console.error('页面错误:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
  console.error('未处理的Promise错误:', event.reason);
});

// 自动初始化（如果DOM已加载）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUserMenu);
} else {
  initUserMenu();
}

// 导出默认函数
export default initUserMenu;