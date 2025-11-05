/**
 * 群组详情页模块
 * 处理群组详情页的初始化、数据加载、交互逻辑等
 */

import { getGroupDetails, getGroupMembers, getGroupExpenses, getGroupStatistics } from '../api/groups.js';
import { Utils, notifications } from '../ui/utils.js';

// 全局变量
let currentGroup = null;
let groupMembers = [];
let groupExpenses = [];
let groupStatistics = null;
let activeTab = 'expenses';
let isLoading = false;

// 页面初始化
export async function initializeGroupPage() {
  console.log('初始化群组详情页...');
  
  try {
    const groupId = getGroupIdFromURL();
    if (!groupId) {
      throw new Error('群组ID无效');
    }
    
    // 显示加载状态
    showLoadingState();
    
    // 加载群组数据
    await loadGroupData(groupId);
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 渲染页面内容
    renderGroupPage();
    
    console.log('群组详情页初始化完成');
    
  } catch (error) {
    console.error('群组详情页初始化失败:', error);
    notifications.error('页面加载失败，请刷新重试');
    showErrorState(error.message);
  } finally {
    hideLoadingState();
  }
}

// 从URL获取群组ID
function getGroupIdFromURL() {
  const path = window.location.pathname;
  const match = path.match(/\/groups\/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

// 加载群组数据
async function loadGroupData(groupId) {
  try {
    isLoading = true;
    
    // 并行加载数据
    const [groupData, membersData, expensesData, statisticsData] = await Promise.allSettled([
      loadGroupDetails(groupId),
      loadGroupMembers(groupId),
      loadGroupExpenses(groupId),
      loadGroupStatistics(groupId)
    ]);
    
    // 处理群组详情
    if (groupData.status === 'fulfilled') {
      currentGroup = groupData.value;
    } else {
      console.error('加载群组详情失败:', groupData.reason);
      throw new Error('无法加载群组信息');
    }
    
    // 处理成员数据
    if (membersData.status === 'fulfilled') {
      groupMembers = membersData.value || [];
    } else {
      console.error('加载群组成员失败:', membersData.reason);
      groupMembers = [];
    }
    
    // 处理费用数据
    if (expensesData.status === 'fulfilled') {
      groupExpenses = expensesData.value?.results || expensesData.value || [];
    } else {
      console.error('加载群组费用失败:', expensesData.reason);
      groupExpenses = [];
    }
    
    // 处理统计数据
    if (statisticsData.status === 'fulfilled') {
      groupStatistics = statisticsData.value;
    } else {
      console.error('加载群组统计失败:', statisticsData.reason);
      groupStatistics = {};
    }
    
    console.log('群组数据加载完成:', {
      groupName: currentGroup?.name,
      membersCount: groupMembers.length,
      expensesCount: groupExpenses.length
    });
    
  } catch (error) {
    console.error('加载群组数据失败:', error);
    throw error;
  } finally {
    isLoading = false;
  }
}

// 加载群组详情
async function loadGroupDetails(groupId) {
  try {
    const group = await getGroupDetails(groupId);
    return group;
  } catch (error) {
    console.error('加载群组详情失败:', error);
    throw error;
  }
}

// 加载群组成员
async function loadGroupMembers(groupId) {
  try {
    const members = await getGroupMembers(groupId);
    return members;
  } catch (error) {
    console.error('加载群组成员失败:', error);
    throw error;
  }
}

// 加载群组费用
async function loadGroupExpenses(groupId) {
  try {
    const expenses = await getGroupExpenses(groupId, 1, 50); // 加载前50条
    return expenses;
  } catch (error) {
    console.error('加载群组费用失败:', error);
    throw error;
  }
}

// 加载群组统计
async function loadGroupStatistics(groupId) {
  try {
    const statistics = await getGroupStatistics(groupId);
    return statistics;
  } catch (error) {
    console.error('加载群组统计失败:', error);
    return {};
  }
}

// 绑定事件监听器
function bindEventListeners() {
  // 标签页切换
  bindTabSwitching();
  
  // 群组操作按钮
  bindGroupActions();
  
  // 费用操作
  bindExpenseActions();
  
  // 成员操作
  bindMemberActions();
  
  // 自动刷新
  setupAutoRefresh();
}

// 绑定标签页切换
function bindTabSwitching() {
  document.addEventListener('click', function(event) {
    const tabButton = event.target.closest('[data-tab]');
    if (tabButton) {
      const tabName = tabButton.dataset.tab;
      switchTab(tabName);
    }
  });
}

// 切换标签页
export function switchTab(tabName) {
  console.log('切换标签页:', tabName);
  
  // 更新活动标签
  document.querySelectorAll('[data-tab]').forEach(button => {
    const isActive = button.dataset.tab === tabName;
    button.className = `tab-button py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
      isActive 
        ? 'text-indigo-600 border-indigo-600' 
        : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
    }`;
  });
  
  // 更新标签页内容
  document.querySelectorAll('.tab-content').forEach(content => {
    const isActive = content.id === `content-${tabName}`;
    if (isActive) {
      content.classList.remove('hidden');
    } else {
      content.classList.add('hidden');
    }
  });
  
  activeTab = tabName;
  
  // 根据标签页加载特定数据
  switch (tabName) {
    case 'members':
      renderMembers();
      break;
    case 'settlements':
      renderSettlements();
      break;
    case 'settings':
      renderSettings();
      break;
    default:
      renderExpenses();
  }
}

// 绑定群组操作
function bindGroupActions() {
  document.addEventListener('click', function(event) {
    const target = event.target;
    
    // 编辑群组
    if (target.matches('[onclick*="handleEditGroup"]') || target.closest('[onclick*="handleEditGroup"]')) {
      handleEditGroup();
    }
    
    // 退出群组
    if (target.matches('[onclick*="handleLeaveGroup"]') || target.closest('[onclick*="handleLeaveGroup"]')) {
      handleLeaveGroup();
    }
    
    // 邀请成员
    if (target.matches('[onclick*="showInviteMemberModal"]') || target.closest('[onclick*="showInviteMemberModal"]')) {
      showInviteMemberModal();
    }
    
    // 添加费用
    if (target.matches('[onclick*="showAddExpenseModal"]') || target.closest('[onclick*="showAddExpenseModal"]')) {
      showAddExpenseModal();
    }
  });
}

// 处理编辑群组
function handleEditGroup() {
  console.log('显示编辑群组模态框');
  showEditGroupModal();
}

// 显示编辑群组模态框
function showEditGroupModal() {
  const modal = Utils.dom.create('div', {
    className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  }, `
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-900">编辑群组信息</h3>
          <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <form id="edit-group-form">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="edit-group-name">
              群组名称 <span class="text-red-500">*</span>
            </label>
            <input type="text" id="edit-group-name" name="name" required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value="${currentGroup?.name || ''}" maxlength="50">
          </div>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="edit-group-description">
              群组描述
            </label>
            <textarea id="edit-group-description" name="description" rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              maxlength="200">${currentGroup?.description || ''}</textarea>
          </div>
          
          <div class="flex space-x-3">
            <button type="button" onclick="closeModal()"
              class="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition duration-150">
              取消
            </button>
            <button type="submit"
              class="flex-1 py-2 px-4 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition duration-150">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  `);
  
  document.body.appendChild(modal);
  
  // 绑定表单提交
  modal.querySelector('#edit-group-form').addEventListener('submit', handleEditGroupSubmit);
}

// 处理编辑群组提交
async function handleEditGroupSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  try {
    // 这里应该调用更新群组API
    notifications.info('更新群组功能开发中...');
    closeModal();
  } catch (error) {
    console.error('更新群组失败:', error);
    notifications.error('更新群组失败，请重试');
  }
}

// 处理退出群组
async function handleLeaveGroup() {
  try {
    const confirmed = await Utils.confirm('确定要退出这个群组吗？退出后将无法查看群组信息。');
    if (!confirmed) return;
    
    notifications.showLoading('正在退出群组...');
    
    // 这里应该调用退出群组API
    setTimeout(() => {
      notifications.hideLoading();
      notifications.success('已退出群组', 2000);
      window.location.href = '/';
    }, 1000);
    
  } catch (error) {
    notifications.hideLoading();
    console.error('退出群组失败:', error);
    notifications.error('退出群组失败，请重试');
  }
}

// 显示邀请成员模态框
function showInviteMemberModal() {
  const modal = Utils.dom.create('div', {
    className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  }, `
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-900">邀请新成员</h3>
          <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <form id="invite-member-form">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="invite-email">
              邮箱地址 <span class="text-red-500">*</span>
            </label>
            <input type="email" id="invite-email" name="email" required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="输入要邀请的成员邮箱">
          </div>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="invite-message">
              邀请消息
            </label>
            <textarea id="invite-message" name="message" rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="向被邀请人发送的消息（可选）"></textarea>
          </div>
          
          <div class="flex space-x-3">
            <button type="button" onclick="closeModal()"
              class="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition duration-150">
              取消
            </button>
            <button type="submit"
              class="flex-1 py-2 px-4 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition duration-150">
              发送邀请
            </button>
          </div>
        </form>
      </div>
    </div>
  `);
  
  document.body.appendChild(modal);
  
  // 绑定表单提交
  modal.querySelector('#invite-member-form').addEventListener('submit', handleInviteMemberSubmit);
}

// 处理邀请成员提交
async function handleInviteMemberSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  try {
    // 这里应该调用邀请成员API
    notifications.info('邀请功能开发中...');
    closeModal();
  } catch (error) {
    console.error('邀请成员失败:', error);
    notifications.error('邀请成员失败，请重试');
  }
}

// 显示添加费用模态框
function showAddExpenseModal() {
  const modal = Utils.dom.create('div', {
    className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  }, `
    <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-900">添加新费用</h3>
          <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <form id="add-expense-form">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="expense-description">
              费用描述 <span class="text-red-500">*</span>
            </label>
            <input type="text" id="expense-description" name="description" required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="描述这笔费用" maxlength="100">
          </div>
          
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2" for="expense-amount">
                金额 <span class="text-red-500">*</span>
              </label>
              <input type="number" id="expense-amount" name="amount" required step="0.01" min="0.01"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2" for="expense-category">
                分类
              </label>
              <select id="expense-category" name="category"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">选择分类</option>
                <option value="food">餐饮</option>
                <option value="transport">交通</option>
                <option value="entertainment">娱乐</option>
                <option value="shopping">购物</option>
                <option value="other">其他</option>
              </select>
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="expense-payer">
              付款人 <span class="text-red-500">*</span>
            </label>
            <select id="expense-payer" name="payer_id" required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              ${groupMembers.map(member => `
                <option value="${member.id}">${member.username}</option>
              `).join('')}
            </select>
          </div>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">参与人员</label>
            <div class="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
              ${groupMembers.map(member => `
                <label class="flex items-center">
                  <input type="checkbox" name="participants" value="${member.id}" 
                    ${member.id === parseInt(localStorage.getItem('current_user_id')) ? 'checked' : ''}
                    class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                  <span class="ml-2 text-sm text-gray-700">${member.username}</span>
                </label>
              `).join('')}
            </div>
          </div>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="expense-notes">
              备注
            </label>
            <textarea id="expense-notes" name="notes" rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="添加备注信息（可选）" maxlength="200"></textarea>
          </div>
          
          <div class="flex space-x-3">
            <button type="button" onclick="closeModal()"
              class="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition duration-150">
              取消
            </button>
            <button type="submit"
              class="flex-1 py-2 px-4 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition duration-150">
              添加费用
            </button>
          </div>
        </form>
      </div>
    </div>
  `);
  
  document.body.appendChild(modal);
  
  // 绑定表单提交
  modal.querySelector('#add-expense-form').addEventListener('submit', handleAddExpenseSubmit);
}

// 处理添加费用提交
async function handleAddExpenseSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  try {
    // 这里应该调用添加费用API
    notifications.info('添加费用功能开发中...');
    closeModal();
  } catch (error) {
    console.error('添加费用失败:', error);
    notifications.error('添加费用失败，请重试');
  }
}

// 绑定费用操作
function bindExpenseActions() {
  // 使用事件委托处理费用操作
  document.addEventListener('click', function(event) {
    const target = event.target;
    
    // 编辑费用
    if (target.matches('[data-action="edit-expense"]') || 
        target.closest('[data-action="edit-expense"]')) {
      const button = target.matches('[data-action="edit-expense"]') ? target : target.closest('[data-action="edit-expense"]');
      const expenseId = button.dataset.expenseId;
      if (expenseId) {
        handleEditExpense(expenseId);
      }
    }
    
    // 删除费用
    if (target.matches('[data-action="delete-expense"]') || 
        target.closest('[data-action="delete-expense"]')) {
      const button = target.matches('[data-action="delete-expense"]') ? target : target.closest('[data-action="delete-expense"]');
      const expenseId = button.dataset.expenseId;
      if (expenseId) {
        handleDeleteExpense(expenseId);
      }
    }
  });
}

// 处理编辑费用
function handleEditExpense(expenseId) {
  console.log('编辑费用:', expenseId);
  notifications.info('编辑费用功能开发中...');
}

// 处理删除费用
async function handleDeleteExpense(expenseId) {
  try {
    const confirmed = await Utils.confirm('确定要删除这笔费用吗？此操作无法撤销。');
    if (!confirmed) return;
    
    // 这里应该调用删除费用API
    notifications.info('删除费用功能开发中...');
  } catch (error) {
    console.error('删除费用失败:', error);
    notifications.error('删除费用失败，请重试');
  }
}

// 绑定成员操作
function bindMemberActions() {
  // 使用事件委托处理成员操作
  document.addEventListener('click', function(event) {
    const target = event.target;
    
    // 移除成员
    if (target.matches('[data-action="remove-member"]') || 
        target.closest('[data-action="remove-member"]')) {
      const button = target.matches('[data-action="remove-member"]') ? target : target.closest('[data-action="remove-member"]');
      const memberId = button.dataset.memberId;
      if (memberId) {
        handleRemoveMember(memberId);
      }
    }
  });
}

// 处理移除成员
async function handleRemoveMember(memberId) {
  try {
    const confirmed = await Utils.confirm('确定要移除这个成员吗？');
    if (!confirmed) return;
    
    // 这里应该调用移除成员API
    notifications.info('移除成员功能开发中...');
  } catch (error) {
    console.error('移除成员失败:', error);
    notifications.error('移除成员失败，请重试');
  }
}

// 设置自动刷新
function setupAutoRefresh() {
  // 每3分钟刷新一次数据
  setInterval(async () => {
    if (!isLoading && document.visibilityState === 'visible') {
      console.log('自动刷新群组数据...');
      try {
        const groupId = getGroupIdFromURL();
        if (groupId) {
          await loadGroupData(groupId);
          renderGroupPage();
        }
      } catch (error) {
        console.error('自动刷新失败:', error);
      }
    }
  }, 3 * 60 * 1000);
}

// 渲染群组页面
function renderGroupPage() {
  renderGroupHeader();
  renderFinancialOverview();
  renderActiveTab();
}

// 渲染群组头部
function renderGroupHeader() {
  const groupNameDisplay = document.getElementById('group-name-display');
  if (groupNameDisplay && currentGroup) {
    groupNameDisplay.innerHTML = `
      ${currentGroup.name}
      ${currentGroup.is_admin ? '<span class="admin-badge">管理员</span>' : ''}
    `;
  }
  
  const memberCount = document.querySelector('[data-member-count]');
  if (memberCount) {
    memberCount.textContent = groupMembers.length;
  }
}

// 渲染财务概览
function renderFinancialOverview() {
  if (!groupStatistics) return;
  
  // 更新财务数据显示
  const elements = {
    'user-owes': groupStatistics.user_owes,
    'user-owed': groupStatistics.user_owed,
    'net-balance': groupStatistics.net_balance
  };
  
  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = Utils.formatCurrency(value || 0);
    }
  });
}

// 渲染活动标签页
function renderActiveTab() {
  switch (activeTab) {
    case 'members':
      renderMembers();
      break;
    case 'settlements':
      renderSettlements();
      break;
    case 'settings':
      renderSettings();
      break;
    default:
      renderExpenses();
  }
}

// 渲染费用列表
function renderExpenses() {
  const container = document.getElementById('expense-list');
  if (!container) return;
  
  if (groupExpenses.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <i class="fas fa-receipt text-4xl mb-4 opacity-50"></i>
        <p>还没有费用记录</p>
        <p class="text-sm">点击上方按钮添加第一笔费用</p>
      </div>
    `;
    return;
  }
  
  const expensesHTML = groupExpenses.map(expense => `
    <div class="expense-item p-4 border border-gray-200 rounded-lg hover:shadow-md transition duration-150">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-medium text-gray-900">${expense.description}</h4>
          <p class="text-sm text-gray-500 mt-1">
            <i class="fas fa-user mr-1"></i>${expense.payer_name}
            <i class="fas fa-calendar ml-3 mr-1"></i>${Utils.formatDate(expense.created_at)}
          </p>
          ${expense.notes ? `
            <p class="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
              ${expense.notes}
            </p>
          ` : ''}
        </div>
        <div class="text-right">
          <div class="text-lg font-semibold text-gray-900">${Utils.formatCurrency(expense.amount)}</div>
          <div class="text-sm text-gray-500">${expense.participants?.length || 0} 人分摊</div>
        </div>
      </div>
      ${currentGroup?.is_admin ? `
        <div class="mt-3 flex space-x-2">
          <button data-action="edit-expense" data-expense-id="${expense.id}"
            class="text-sm text-indigo-600 hover:text-indigo-800">
            <i class="fas fa-edit mr-1"></i>编辑
          </button>
          <button data-action="delete-expense" data-expense-id="${expense.id}"
            class="text-sm text-red-600 hover:text-red-800">
            <i class="fas fa-trash mr-1"></i>删除
          </button>
        </div>
      ` : ''}
    </div>
  `).join('');
  
  container.innerHTML = expensesHTML;
}

// 渲染成员列表
function renderMembers() {
  const container = document.getElementById('member-list');
  if (!container) return;
  
  if (groupMembers.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <i class="fas fa-users text-4xl mb-4 opacity-50"></i>
        <p>暂无成员</p>
      </div>
    `;
    return;
  }
  
  const membersHTML = groupMembers.map(member => `
    <div class="member-item flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
      <div class="flex items-center">
        <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
          <i class="fas fa-user text-indigo-600"></i>
        </div>
        <div>
          <div class="font-medium text-gray-900">${member.username}</div>
          <div class="text-sm text-gray-500">${member.email}</div>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        ${member.is_admin ? '<span class="admin-badge">管理员</span>' : ''}
        ${currentGroup?.is_admin && !member.is_admin ? `
          <button data-action="remove-member" data-member-id="${member.id}"
            class="text-red-600 hover:text-red-800 text-sm">
            <i class="fas fa-trash"></i>
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
  
  container.innerHTML = membersHTML;
}

// 渲染结算建议
function renderSettlements() {
  const container = document.getElementById('settlement-suggestions');
  if (!container) return;
  
  container.innerHTML = `
    <div class="text-center py-12 text-gray-500">
      <i class="fas fa-exchange-alt text-4xl mb-4 opacity-50"></i>
      <p>结算建议功能开发中...</p>
    </div>
  `;
}

// 渲染设置页面
function renderSettings() {
  const container = document.getElementById('settings-content');
  if (!container) return;
  
  if (!currentGroup?.is_admin) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <i class="fas fa-lock text-4xl mb-4 opacity-50"></i>
        <p>只有管理员才能修改群组设置</p>
      </div>
    `;
    return;
  }
  
  // 渲染管理员设置
  container.innerHTML = `
    <div class="space-y-6">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div class="flex">
          <i class="fa-solid fa-exclamation-triangle text-yellow-400 mt-0.5 mr-3"></i>
          <div>
            <h4 class="text-sm font-medium text-yellow-800">危险操作</h4>
            <p class="text-sm text-yellow-700 mt-1">这些操作无法撤销，请谨慎操作。</p>
          </div>
        </div>
      </div>
      
      <div class="flex justify-between items-center p-4 border border-red-200 rounded-lg">
        <div>
          <h4 class="font-medium text-gray-900">删除群组</h4>
          <p class="text-sm text-gray-500">永久删除此群组及其所有数据</p>
        </div>
        <button onclick="confirmDeleteGroup()" 
          class="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition duration-150">
          删除群组
        </button>
      </div>
    </div>
  `;
}

// 显示加载状态
function showLoadingState() {
  const containers = ['expense-list', 'member-list', 'settlement-suggestions'];
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
  const containers = ['expense-list', 'member-list', 'settlement-suggestions'];
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
  renderGroupPage();
}

// 关闭模态框
export function closeModal() {
  const modal = document.querySelector('.fixed.inset-0.z-50');
  if (modal) {
    modal.remove();
  }
}

// 确认删除群组
export function confirmDeleteGroup() {
  Utils.confirm('确定要删除这个群组吗？此操作无法撤销，所有数据将永久丢失！').then(confirmed => {
    if (confirmed) {
      notifications.info('删除群组功能开发中...');
    }
  });
}

// 导出公共函数
export { 
  closeModal,
  confirmDeleteGroup,
  switchTab,
  showAddExpenseModal,
  showInviteMemberModal
};

// 页面加载完成后自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGroupPage);
} else {
  initializeGroupPage();
}