/**
 * 主页模块
 * 处理主页的初始化、数据加载、交互逻辑等
 */

import { getUserGroups } from '../api/groups.js';
import { getPendingInvitations, acceptInvitation, declineInvitation } from '../api/invitations.js';
import { Utils, notifications } from '../ui/utils.js';

// 全局变量
let currentUser = null;
let userGroups = [];
let pendingInvitations = [];
let isLoading = false;

// 页面初始化
export async function initializeHomePage() {
  console.log('初始化主页...');
  
  try {
    // 显示加载状态
    showLoadingState();
    
    // 获取当前用户信息
    currentUser = await getCurrentUser();
    
    // 加载数据
    await loadHomePageData();
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 渲染页面内容
    renderHomePage();
    
    console.log('主页初始化完成');
    
  } catch (error) {
    console.error('主页初始化失败:', error);
    notifications.error('页面加载失败，请刷新重试');
    showErrorState(error.message);
  } finally {
    hideLoadingState();
  }
}

// 获取当前用户信息
async function getCurrentUser() {
  try {
    // 从localStorage获取token
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('用户未登录');
    }
    
    // 这里应该调用API获取用户信息
    // 暂时使用模拟数据
    return {
      id: 1,
      username: '当前用户',
      email: 'user@example.com'
    };
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
}

// 加载主页数据
async function loadHomePageData() {
  try {
    isLoading = true;
    
    // 并行加载数据
    const [groupsData, invitationsData] = await Promise.allSettled([
      loadUserGroups(),
      loadPendingInvitations()
    ]);
    
    // 处理群组数据
    if (groupsData.status === 'fulfilled') {
      userGroups = groupsData.value || [];
    } else {
      console.error('加载群组数据失败:', groupsData.reason);
      userGroups = [];
    }
    
    // 处理邀请数据
    if (invitationsData.status === 'fulfilled') {
      pendingInvitations = invitationsData.value || [];
    } else {
      console.error('加载邀请数据失败:', invitationsData.reason);
      pendingInvitations = [];
    }
    
    console.log('主页数据加载完成:', {
      groupsCount: userGroups.length,
      invitationsCount: pendingInvitations.length
    });
    
  } catch (error) {
    console.error('加载主页数据失败:', error);
    throw error;
  } finally {
    isLoading = false;
  }
}

// 加载用户群组
async function loadUserGroups() {
  try {
    const groups = await getUserGroups();
    return groups.results || groups || [];
  } catch (error) {
    console.error('加载用户群组失败:', error);
    return [];
  }
}

// 加载待处理邀请
async function loadPendingInvitations() {
  try {
    const invitations = await getPendingInvitations();
    return invitations.results || invitations || [];
  } catch (error) {
    console.error('加载待处理邀请失败:', error);
    return [];
  }
}

// 绑定事件监听器
function bindEventListeners() {
  // 创建群组按钮
  const createGroupButton = document.querySelector('[onclick="handleCreateGroup()"]');
  if (createGroupButton) {
    createGroupButton.addEventListener('click', handleCreateGroup);
  }
  
  // 邀请操作按钮
  bindInvitationActions();
  
  // 群组卡片点击
  bindGroupCardClicks();
  
  // 自动刷新
  setupAutoRefresh();
}

// 绑定邀请操作
function bindInvitationActions() {
  // 使用事件委托处理邀请操作
  document.addEventListener('click', function(event) {
    const target = event.target;
    
    // 接受邀请
    if (target.matches('[data-action="accept-invitation"]') || 
        target.closest('[data-action="accept-invitation"]')) {
      const button = target.matches('[data-action="accept-invitation"]') ? target : target.closest('[data-action="accept-invitation"]');
      const invitationId = button.dataset.invitationId;
      if (invitationId) {
        handleAcceptInvitation(invitationId);
      }
    }
    
    // 拒绝邀请
    if (target.matches('[data-action="decline-invitation"]') || 
        target.closest('[data-action="decline-invitation"]')) {
      const button = target.matches('[data-action="decline-invitation"]') ? target : target.closest('[data-action="decline-invitation"]');
      const invitationId = button.dataset.invitationId;
      if (invitationId) {
        handleDeclineInvitation(invitationId);
      }
    }
  });
}

// 绑定群组卡片点击
function bindGroupCardClicks() {
  document.addEventListener('click', function(event) {
    const groupCard = event.target.closest('.group-card');
    if (groupCard && groupCard.dataset.groupId) {
      const groupId = groupCard.dataset.groupId;
      navigateToGroup(groupId);
    }
  });
}

// 设置自动刷新
function setupAutoRefresh() {
  // 每5分钟刷新一次数据
  setInterval(async () => {
    if (!isLoading && document.visibilityState === 'visible') {
      console.log('自动刷新主页数据...');
      try {
        await loadHomePageData();
        renderHomePage();
      } catch (error) {
        console.error('自动刷新失败:', error);
      }
    }
  }, 5 * 60 * 1000);
}

// 处理创建群组
function handleCreateGroup() {
  console.log('显示创建群组模态框');
  showCreateGroupModal();
}

// 显示创建群组模态框
function showCreateGroupModal() {
  const modal = Utils.dom.create('div', {
    className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  }, `
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition duration-300 scale-100">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-900">创建新群组</h3>
          <button onclick="closeCreateGroupModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <form id="create-group-form" onsubmit="createNewGroup(event)">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="group-name">
              群组名称 <span class="text-red-500">*</span>
            </label>
            <input type="text" id="group-name" name="name" required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="输入群组名称" maxlength="50">
            <div class="mt-1 text-xs text-gray-500">
              <span id="group-name-count">0</span>/50 字符
            </div>
          </div>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="group-description">
              群组描述
            </label>
            <textarea id="group-description" name="description" rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              placeholder="输入群组描述（可选）" maxlength="200"></textarea>
            <div class="mt-1 text-xs text-gray-500">
              <span id="group-description-count">0</span>/200 字符
            </div>
          </div>
          
          <div class="flex space-x-3">
            <button type="button" onclick="closeCreateGroupModal()"
              class="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition duration-150 font-medium">
              取消
            </button>
            <button type="submit" id="create-group-submit"
              class="flex-1 py-2 px-4 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition duration-150 font-medium">
              创建群组
            </button>
          </div>
        </form>
      </div>
    </div>
  `);
  
  document.body.appendChild(modal);
  
  // 绑定字符计数
  bindCharacterCount();
  
  // 绑定表单提交
  modal.querySelector('#create-group-form').addEventListener('submit', handleCreateGroupSubmit);
}

// 关闭创建群组模态框
export function closeCreateGroupModal() {
  const modal = document.querySelector('.fixed.inset-0.z-50');
  if (modal) {
    modal.remove();
  }
}

// 绑定字符计数
function bindCharacterCount() {
  const nameInput = document.getElementById('group-name');
  const descriptionInput = document.getElementById('group-description');
  
  if (nameInput) {
    nameInput.addEventListener('input', function() {
      const count = this.value.length;
      const counter = document.getElementById('group-name-count');
      if (counter) {
        counter.textContent = count;
        counter.className = count > 45 ? 'text-red-500 text-xs' : 'text-gray-500 text-xs';
      }
    });
  }
  
  if (descriptionInput) {
    descriptionInput.addEventListener('input', function() {
      const count = this.value.length;
      const counter = document.getElementById('group-description-count');
      if (counter) {
        counter.textContent = count;
        counter.className = count > 180 ? 'text-red-500 text-xs' : 'text-gray-500 text-xs';
      }
    });
  }
}

// 处理创建群组提交
async function handleCreateGroupSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const submitButton = form.querySelector('#create-group-submit');
  
  const groupName = formData.get('name').trim();
  const groupDescription = formData.get('description').trim();
  
  // 验证表单
  if (!groupName) {
    notifications.error('请输入群组名称');
    return;
  }
  
  if (groupName.length > 50) {
    notifications.error('群组名称不能超过50个字符');
    return;
  }
  
  // 显示加载状态
  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = '创建中...';
  
  try {
    // 导入并调用createNewGroup函数
    const { createNewGroup } = await import('../api/groups.js');
    const result = await createNewGroup({
      name: groupName,
      description: groupDescription
    });
    
    if (result && result.id) {
      notifications.success('群组创建成功', 2000);
      closeCreateGroupModal();
      
      // 刷新群组列表
      await loadUserGroups();
      renderUserGroups();
    } else {
      throw new Error('群组创建失败');
    }
    
  } catch (error) {
    console.error('创建群组失败:', error);
    notifications.error('创建群组失败，请重试');
  } finally {
    // 恢复按钮状态
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
}

// 处理接受邀请
async function handleAcceptInvitation(invitationId) {
  try {
    console.log('接受邀请:', invitationId);
    
    const confirmed = await Utils.confirm('确定要接受这个邀请吗？');
    if (!confirmed) return;
    
    notifications.showLoading('正在处理邀请...');
    
    const result = await acceptInvitation(invitationId);
    
    notifications.hideLoading();
    
    if (result.success) {
      notifications.success('已成功加入群组', 3000);
      
      // 刷新邀请列表
      await loadPendingInvitations();
      renderPendingInvitations();
    }
    
  } catch (error) {
    notifications.hideLoading();
    console.error('接受邀请失败:', error);
    notifications.error('接受邀请失败，请重试');
  }
}

// 处理拒绝邀请
async function handleDeclineInvitation(invitationId) {
  try {
    console.log('拒绝邀请:', invitationId);
    
    const confirmed = await Utils.confirm('确定要拒绝这个邀请吗？');
    if (!confirmed) return;
    
    notifications.showLoading('正在处理邀请...');
    
    const result = await declineInvitation(invitationId);
    
    notifications.hideLoading();
    
    if (result.success) {
      notifications.success('已拒绝邀请', 2000);
      
      // 刷新邀请列表
      await loadPendingInvitations();
      renderPendingInvitations();
    }
    
  } catch (error) {
    notifications.hideLoading();
    console.error('拒绝邀请失败:', error);
    notifications.error('拒绝邀请失败，请重试');
  }
}

// 导航到群组详情页
function navigateToGroup(groupId) {
  console.log('导航到群组:', groupId);
  window.location.href = `/groups/${groupId}/`;
}

// 渲染主页
function renderHomePage() {
  renderPendingInvitations();
  renderUserGroups();
  updatePageTitle();
}

// 渲染待处理邀请
function renderPendingInvitations() {
  const container = document.getElementById('invitation-list-container');
  if (!container) return;
  
  if (pendingInvitations.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-envelope-open-text text-4xl mb-3 opacity-50"></i>
        <p class="text-sm">暂无待处理的邀请</p>
      </div>
    `;
    return;
  }
  
  const invitationsHTML = pendingInvitations.map(invitation => `
    <div class="invitation-item p-4 border border-gray-200 rounded-lg hover:shadow-md transition duration-150 mb-3">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-medium text-gray-900 mb-1">${invitation.group_name || '群组邀请'}</h4>
          <p class="text-sm text-gray-600 mb-2">${invitation.message || '邀请您加入群组'}</p>
          <p class="text-xs text-gray-500">
            <i class="fas fa-clock mr-1"></i>
            邀请时间: ${Utils.formatDate(invitation.created_at)}
          </p>
        </div>
        <div class="flex space-x-2 ml-4">
          <button data-action="accept-invitation" data-invitation-id="${invitation.id}"
            class="px-3 py-1 text-sm text-white bg-green-500 hover:bg-green-600 rounded transition duration-150">
            <i class="fas fa-check mr-1"></i>接受
          </button>
          <button data-action="decline-invitation" data-invitation-id="${invitation.id}"
            class="px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-600 rounded transition duration-150">
            <i class="fas fa-times mr-1"></i>拒绝
          </button>
        </div>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = invitationsHTML;
}

// 渲染用户群组
function renderUserGroups() {
  const container = document.getElementById('my-groups-list');
  if (!container) return;
  
  if (userGroups.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12 text-gray-500">
        <i class="fas fa-users text-4xl mb-4 opacity-50"></i>
        <p class="text-lg font-medium mb-2">还没有加入任何群组</p>
        <p class="text-sm">创建或接受邀请来开始使用</p>
      </div>
    `;
    return;
  }
  
  const groupsHTML = userGroups.map(group => `
    <div class="group-card p-4 border border-gray-200 rounded-lg hover:shadow-lg cursor-pointer transition duration-200"
         data-group-id="${group.id}">
      <div class="flex items-start justify-between mb-2">
        <h4 class="font-medium text-gray-900 truncate">${group.name}</h4>
        ${group.is_admin ? '<span class="admin-badge text-xs">管理员</span>' : ''}
      </div>
      <p class="text-sm text-gray-600 mb-3 line-clamp-2">${group.description || '暂无描述'}</p>
      <div class="flex items-center justify-between text-xs text-gray-500">
        <span><i class="fas fa-users mr-1"></i>${group.member_count || 0} 人</span>
        <span><i class="fas fa-calendar mr-1"></i>${Utils.formatDate(group.created_at, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = groupsHTML;
}

// 更新页面标题
function updatePageTitle() {
  const userName = currentUser?.username || '用户';
  document.title = `${userName} - 主页 - 群组管理系统`;
}

// 显示加载状态
function showLoadingState() {
  // 隐藏邀请列表和群组列表，显示加载指示器
  const containers = ['invitation-list-container', 'my-groups-list'];
  containers.forEach(containerId => {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="flex items-center justify-center py-8">
          <div class="loading w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mr-3"></div>
          <span class="text-gray-600">加载中...</span>
        </div>
      `;
    }
  });
}

// 显示错误状态
function showErrorState(errorMessage) {
  const containers = ['invitation-list-container', 'my-groups-list'];
  containers.forEach(containerId => {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="text-center py-8 text-red-500">
          <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
          <p class="text-sm">加载失败: ${errorMessage}</p>
          <button onclick="location.reload()" 
            class="mt-2 px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-600 rounded">
            重新加载
          </button>
        </div>
      `;
    }
  });
}

// 隐藏加载状态
function hideLoadingState() {
  // 重新渲染页面内容
  renderHomePage();
}

// 刷新主页数据
export async function refreshHomePage() {
  console.log('刷新主页数据...');
  
  try {
    await loadHomePageData();
    renderHomePage();
    notifications.success('数据已刷新', 1500);
  } catch (error) {
    console.error('刷新主页数据失败:', error);
    notifications.error('刷新失败，请重试');
  }
}

// 导出公共函数
export { 
  closeCreateGroupModal,
  refreshHomePage,
  handleCreateGroup,
  navigateToGroup
};

// 页面加载完成后自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeHomePage);
} else {
  initializeHomePage();
}