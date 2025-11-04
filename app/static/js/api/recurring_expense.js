// recurring_expense.js - 定期费用相关的CRUD操作、频率设置 - 修复版本

// --- 全局状态 ---
let recurringExpenseState = {
    isRecurring: false,
    frequency: 'daily',
    startDate: '',
    endDate: '',
};
let recurringSelectedParticipants = new Set();
let recurringSplitMethod = 'equal';
let recurringMemberSplits = [];
let currentEditingRecurringExpense = null;

// API基础URL
const API_BASE_URL = '/api';

// 消息显示函数
function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded shadow-lg z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded shadow-lg z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// API函数 - 创建定期费用
async function createRecurringExpense(expenseData) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/groups/${expenseData.group_id}/recurring-expenses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(expenseData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '创建定期费用失败');
        }

        return await response.json();
    } catch (error) {
        console.error('创建定期费用错误:', error);
        throw error;
    }
}

// API函数 - 获取群组定期费用列表
async function getGroupRecurringExpenses(groupId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/groups/${groupId}/recurring-expenses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('获取定期费用列表失败');
        }

        return await response.json();
    } catch (error) {
        console.error('获取定期费用列表错误:', error);
        throw error;
    }
}

// API函数 - 更新定期费用
async function updateRecurringExpenseAPI(expenseId, expenseData) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/recurring-expenses/${expenseId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(expenseData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '更新定期费用失败');
        }

        return await response.json();
    } catch (error) {
        console.error('更新定期费用错误:', error);
        throw error;
    }
}

// API函数 - 删除定期费用
async function deleteRecurringExpenseAPI(expenseId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/recurring-expenses/${expenseId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '删除定期费用失败');
        }

        return { success: true };
    } catch (error) {
        console.error('删除定期费用错误:', error);
        throw error;
    }
}

// API函数 - 切换定期费用状态
async function toggleRecurringExpenseAPI(expenseId, isActive) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/recurring-expenses/${expenseId}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_active: isActive })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '切换状态失败');
        }

        return await response.json();
    } catch (error) {
        console.error('切换定期费用状态错误:', error);
        throw error;
    }
}

/**
 * 初始化定期费用表单
 */
export function initializeRecurringExpenseForm() {
    const form = document.getElementById('recurring-expense-form');
    if (!form) return;
    
    form.reset();
    form.querySelector('input[name="recurring_expense_id"]').value = '';
    
    // 设置默认下次日期为下周
    const nextDateInput = form.querySelector('input[name="next_date"]');
    if (nextDateInput) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextDateInput.value = nextWeek.toISOString().split('T')[0];
    }
    
    // 重置状态
    recurringSelectedParticipants.clear();
    recurringMemberSplits = [];
    recurringSplitMethod = 'equal';
    
    // 清除分摊自定义表单
    const customSplitsContainer = document.getElementById('custom-splits-container');
    if (customSplitsContainer) {
        customSplitsContainer.innerHTML = '';
    }
}

/**
 * 选择频率
 */
export function selectFrequency(frequency) {
    recurringExpenseState.frequency = frequency;
    
    // 更新UI选中状态
    const frequencyButtons = document.querySelectorAll('[data-frequency]');
    frequencyButtons.forEach(btn => {
        if (btn.dataset.frequency === frequency) {
            btn.classList.add('bg-blue-500', 'text-white');
            btn.classList.remove('bg-gray-200', 'text-gray-700');
        } else {
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        }
    });
    
    // 更新预览信息
    updateRecurringPreview();
}

/**
 * 设置定期费用分摊方式
 */
export function setRecurringSplitMethod(method) {
    recurringSplitMethod = method;
    
    // 更新按钮状态
    const equalSplitBtn = document.getElementById('equal-split-btn');
    const customSplitBtn = document.getElementById('custom-split-btn');
    
    if (equalSplitBtn && customSplitBtn) {
        if (method === 'equal') {
            equalSplitBtn.classList.add('bg-blue-500', 'text-white');
            customSplitBtn.classList.remove('bg-blue-500', 'text-white');
        } else {
            customSplitBtn.classList.add('bg-blue-500', 'text-white');
            equalSplitBtn.classList.remove('bg-blue-500', 'text-white');
        }
    }
    
    // 重新计算分摊金额
    updateRecurringSplitCalculation();
}

/**
 * 更新定期费用分摊计算
 */
export function updateRecurringSplitCalculation() {
    const totalAmountInput = document.querySelector('input[name="amount"]');
    if (!totalAmountInput) return;
    
    const totalAmount = parseFloat(totalAmountInput.value) || 0;
    const customSplitsContainer = document.getElementById('custom-splits-container');
    
    if (recurringSplitMethod === 'equal') {
        // 等额分摊
        const memberCount = window.groupMembers?.length || 0;
        if (memberCount > 0) {
            const amountPerMember = totalAmount / memberCount;
            
            // 更新所有成员显示
            const splitItems = document.querySelectorAll('.split-item');
            splitItems.forEach(item => {
                const nameSpan = item.querySelector('.split-member-name');
                const amountSpan = item.querySelector('.split-member-amount');
                if (nameSpan && amountSpan) {
                    amountSpan.textContent = `$${amountPerMember.toFixed(2)}`;
                }
            });
        }
    } else if (recurringSplitMethod === 'custom' && customSplitsContainer) {
        // 自定义分摊 - 从表单数据计算
        const customSplits = getCustomSplitsFromForm();
        const customTotal = customSplits.reduce((sum, split) => sum + split.amount, 0);
        
        // 验证总金额
        if (customTotal > 0) {
            const difference = Math.abs(totalAmount - customTotal);
            if (difference > 0.01) {
                showErrorMessage(`分摊金额总和 ($${customTotal.toFixed(2)}) 与费用金额 ($${totalAmount.toFixed(2)}) 不匹配`);
            }
        }
    }
}

/**
 * 处理定期费用金额变化
 */
export function handleRecurringAmountChange() {
    updateRecurringSplitCalculation();
    updateRecurringPreview();
}

/**
 * 更新定期费用预览
 */
export function updateRecurringPreview() {
    const frequency = recurringExpenseState.frequency;
    const nextDateInput = document.querySelector('input[name="next_date"]');
    
    if (!nextDateInput) return;
    
    const nextDate = new Date(nextDateInput.value);
    const previewContainer = document.getElementById('recurring-preview');
    
    if (!previewContainer) return;
    
    const frequencyTexts = {
        'daily': '每日',
        'weekly': '每周',
        'monthly': '每月',
        'yearly': '每年'
    };
    
    const previewDates = [];
    for (let i = 0; i < 5; i++) {
        const previewDate = new Date(nextDate);
        switch (frequency) {
            case 'daily':
                previewDate.setDate(nextDate.getDate() + i);
                break;
            case 'weekly':
                previewDate.setDate(nextDate.getDate() + (i * 7));
                break;
            case 'monthly':
                previewDate.setMonth(nextDate.getMonth() + i);
                break;
            case 'yearly':
                previewDate.setFullYear(nextDate.getFullYear() + i);
                break;
        }
        previewDates.push(previewDate.toLocaleDateString());
    }
    
    previewContainer.innerHTML = `
        <div class="text-sm text-gray-600">
            <p class="font-semibold">${frequencyTexts[frequency] || frequency} 费用预览：</p>
            <ul class="mt-1 space-y-1">
                ${previewDates.map(date => `<li class="text-xs">• ${date}</li>`).join('')}
            </ul>
        </div>
    `;
}

/**
 * 保存定期费用
 */
export async function handleSaveRecurringExpense(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        // 构建定期费用数据
        const expenseData = {
            title: formData.get('title'),
            amount_cents: Math.round(parseFloat(formData.get('amount')) * 100),
            description: formData.get('description') || '',
            frequency: formData.get('frequency'),
            next_date: formData.get('next_date'),
            category: formData.get('category') || 'other',
            created_by: window.currentUserId
        };

        // 处理分摊方式
        if (recurringSplitMethod === 'equal') {
            expenseData.split_method = 'equal';
        } else {
            expenseData.split_method = 'custom';
            expenseData.custom_splits = getCustomSplitsFromForm();
        }

        const response = await createRecurringExpense({
            ...expenseData,
            group_id: window.currentGroupId
        });
        
        if (response) {
            showSuccessMessage('定期费用已创建');
            closeRecurringExpenseModal();
            refreshRecurringList();
        }
    } catch (error) {
        console.error('创建定期费用错误:', error);
        showErrorMessage('创建定期费用失败: ' + error.message);
    }
}

/**
 * 禁用定期费用
 */
export async function handleDisableRecurringExpense() {
    if (!currentEditingRecurringExpense) return;
    
    try {
        await toggleRecurringExpenseAPI(currentEditingRecurringExpense.id, false);
        showSuccessMessage('定期费用已禁用');
        closeRecurringExpenseModal();
        refreshRecurringList();
    } catch (error) {
        console.error('禁用定期费用错误:', error);
        showErrorMessage('禁用失败: ' + error.message);
    }
}

/**
 * 启用定期费用
 */
export async function handleEnableRecurringExpense() {
    if (!currentEditingRecurringExpense) return;
    
    try {
        await toggleRecurringExpenseAPI(currentEditingRecurringExpense.id, true);
        showSuccessMessage('定期费用已启用');
        closeRecurringExpenseModal();
        refreshRecurringList();
    } catch (error) {
        console.error('启用定期费用错误:', error);
        showErrorMessage('启用失败: ' + error.message);
    }
}

/**
 * 删除定期费用
 */
export async function handleDeleteRecurringExpense() {
    if (!currentEditingRecurringExpense) return;
    
    if (!confirm('确定要删除此定期费用吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        await deleteRecurringExpenseAPI(currentEditingRecurringExpense.id);
        showSuccessMessage('定期费用已删除');
        closeRecurringExpenseModal();
        refreshRecurringList();
    } catch (error) {
        console.error('删除定期费用错误:', error);
        showErrorMessage('删除失败: ' + error.message);
    }
}

/**
 * 编辑定期费用
 */
export async function handleEditRecurringExpense() {
    if (!currentEditingRecurringExpense) return;
    
    populateRecurringDetailForm(currentEditingRecurringExpense);
    openRecurringExpenseModal();
}

/**
 * 填充定期费用详情表单
 */
export function populateRecurringDetailForm(expense) {
    const form = document.getElementById('recurring-expense-form');
    if (!form) return;
    
    currentEditingRecurringExpense = expense;
    
    form.querySelector('input[name="recurring_expense_id"]').value = expense.id;
    form.querySelector('input[name="title"]').value = expense.title;
    form.querySelector('input[name="amount"]').value = (expense.amount_cents / 100).toFixed(2);
    form.querySelector('textarea[name="description"]').value = expense.description || '';
    form.querySelector('select[name="frequency"]').value = expense.frequency;
    form.querySelector('input[name="next_date"]').value = expense.next_date.split('T')[0];
    form.querySelector('select[name="category"]').value = expense.category;
    
    // 设置分摊方式
    if (expense.split_method) {
        setRecurringSplitMethod(expense.split_method);
    }
    
    if (expense.split_method === 'custom' && expense.custom_splits) {
        populateCustomSplits(expense.custom_splits);
    }
}

/**
 * 刷新定期费用列表
 */
export function refreshRecurringList() {
    const container = document.getElementById('recurring-expenses-list');
    if (!container) return;
    
    if (!window.recurringExpensesList || window.recurringExpensesList.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">暂无定期费用</p>';
        return;
    }
    
    container.innerHTML = window.recurringExpensesList.map(expense => {
        const creator = window.groupMembers?.find(m => m.id === expense.created_by);
        const frequencyText = {
            'daily': '每日',
            'weekly': '每周', 
            'monthly': '每月',
            'yearly': '每年'
        }[expense.frequency] || expense.frequency;
        
        const statusClass = expense.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
        const statusText = expense.is_active ? '活跃' : '已暂停';
        
        return `
            <div class="recurring-expense-item border rounded p-4 mb-2 bg-white" data-expense-id="${expense.id}">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                            <h4 class="font-bold text-lg">${expense.title}</h4>
                            <span class="px-2 py-1 text-xs rounded-full ${statusClass}">
                                ${statusText}
                            </span>
                        </div>
                        <p class="text-sm text-gray-600 mb-2">${expense.description || '无描述'}</p>
                        <div class="flex items-center space-x-4 text-sm text-gray-500">
                            <span>👤 ${creator?.name || '未知'}</span>
                            <span>🔄 ${frequencyText}</span>
                            <span>📅 下次: ${new Date(expense.next_date).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="text-right ml-4">
                        <div class="text-2xl font-bold text-blue-600 mb-2">
                            $${(expense.amount_cents / 100).toFixed(2)}
                        </div>
                    </div>
                </div>
                <div class="mt-4 flex space-x-2">
                    <button onclick="editRecurringExpense(${expense.id})" 
                            class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                        编辑
                    </button>
                    <button onclick="toggleRecurringExpenseConfirm(${expense.id})" 
                            class="px-3 py-1 text-sm ${expense.is_active ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded">
                        ${expense.is_active ? '暂停' : '激活'}
                    </button>
                    <button onclick="deleteRecurringExpenseConfirm(${expense.id})" 
                            class="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">
                        删除
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 打开定期费用详情
 */
export function openRecurringDetail(expenseId) {
    const expense = window.recurringExpensesList?.find(e => e.id === expenseId);
    if (!expense) {
        showErrorMessage('定期费用不存在');
        return;
    }
    
    currentEditingRecurringExpense = expense;
    populateRecurringDetailForm(expense);
    openRecurringExpenseModal();
}

/**
 * 模态框控制函数
 */
export function openRecurringExpenseModal() {
    const modal = document.getElementById('recurring-expense-modal');
    if (modal) {
        modal.classList.remove('hidden');
        if (!currentEditingRecurringExpense) {
            initializeRecurringExpenseForm();
        }
    }
}

export function closeRecurringExpenseModal() {
    const modal = document.getElementById('recurring-expense-modal');
    if (modal) {
        modal.classList.add('hidden');
        currentEditingRecurringExpense = null;
    }
}

/**
 * 辅助函数：从表单获取自定义分摊
 */
function getCustomSplitsFromForm() {
    const customSplits = [];
    const memberIds = document.querySelectorAll('input[name="member_ids[]"]');
    const memberAmounts = document.querySelectorAll('input[name="member_amounts[]"]');
    
    memberIds.forEach((memberIdInput, index) => {
        const amountInput = memberAmounts[index];
        if (amountInput && amountInput.value) {
            customSplits.push({
                user_id: parseInt(memberIdInput.value),
                amount_cents: Math.round(parseFloat(amountInput.value) * 100)
            });
        }
    });
    
    return customSplits;
}

/**
 * 填充自定义分摊
 */
function populateCustomSplits(customSplits) {
    const container = document.getElementById('custom-splits-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    customSplits.forEach(split => {
        const member = window.groupMembers?.find(m => m.id === split.user_id);
        if (member) {
            addCustomSplitRow(member, split.amount_cents / 100);
        }
    });
}

/**
 * 添加自定义分摊行
 */
export function addCustomSplit() {
    const container = document.getElementById('custom-splits-container');
    if (!container || !window.groupMembers) return;
    
    const availableMembers = window.groupMembers.filter(member => {
        const existingSplits = container.querySelectorAll('input[name="member_ids[]"]');
        const existingIds = Array.from(existingSplits).map(input => parseInt(input.value));
        return !existingIds.includes(member.id);
    });
    
    if (availableMembers.length === 0) {
        showErrorMessage('所有成员已添加分摊');
        return;
    }
    
    const member = availableMembers[0];
    addCustomSplitRow(member, 0);
}

/**
 * 添加自定义分摊行
 */
function addCustomSplitRow(member, amount = 0) {
    const container = document.getElementById('custom-splits-container');
    if (!container) return;
    
    const row = document.createElement('div');
    row.className = 'flex items-center space-x-2 mb-2';
    row.innerHTML = `
        <span class="flex-1">${member.name}</span>
        <input type="number" name="member_amounts[]" 
               value="${amount.toFixed(2)}" step="0.01" min="0"
               class="w-24 px-2 py-1 border rounded">
        <input type="hidden" name="member_ids[]" value="${member.id}">
        <button type="button" onclick="removeCustomSplit(this)" 
                class="px-2 py-1 bg-red-500 text-white rounded text-sm">
            删除
        </button>
    `;
    container.appendChild(row);
}

/**
 * 删除自定义分摊行
 */
export function removeCustomSplit(button) {
    const row = button.closest('.flex');
    if (row) {
        row.remove();
    }
}

/**
 * 编辑定期费用
 */
export function editRecurringExpense(expenseId) {
    const expense = window.recurringExpensesList?.find(e => e.id === expenseId);
    if (!expense) {
        showErrorMessage('定期费用不存在');
        return;
    }
    
    populateRecurringDetailForm(expense);
    openRecurringExpenseModal();
}

/**
 * 切换定期费用状态确认
 */
export function toggleRecurringExpenseConfirm(expenseId) {
    const expense = window.recurringExpensesList?.find(e => e.id === expenseId);
    if (!expense) {
        showErrorMessage('定期费用不存在');
        return;
    }
    
    const action = expense.is_active ? '暂停' : '激活';
    if (!confirm(`确定要${action}此定期费用吗？`)) {
        return;
    }
    
    currentEditingRecurringExpense = expense;
    
    if (expense.is_active) {
        handleDisableRecurringExpense();
    } else {
        handleEnableRecurringExpense();
    }
}

/**
 * 删除定期费用确认
 */
export function deleteRecurringExpenseConfirm(expenseId) {
    const expense = window.recurringExpensesList?.find(e => e.id === expenseId);
    if (!expense) {
        showErrorMessage('定期费用不存在');
        return;
    }
    
    currentEditingRecurringExpense = expense;
    handleDeleteRecurringExpense();
}

// 暴露所有函数到全局
window.handleSaveRecurringExpense = handleSaveRecurringExpense;
window.handleDisableRecurringExpense = handleDisableRecurringExpense;
window.handleEnableRecurringExpense = handleEnableRecurringExpense;
window.handleDeleteRecurringExpense = handleDeleteRecurringExpense;
window.handleEditRecurringExpense = handleEditRecurringExpense;
window.populateRecurringDetailForm = populateRecurringDetailForm;
window.refreshRecurringList = refreshRecurringList;
window.openRecurringDetail = openRecurringDetail;
window.initializeRecurringExpenseForm = initializeRecurringExpenseForm;
window.selectFrequency = selectFrequency;
window.setRecurringSplitMethod = setRecurringSplitMethod;
window.updateRecurringSplitCalculation = updateRecurringSplitCalculation;
window.handleRecurringAmountChange = handleRecurringAmountChange;
window.updateRecurringPreview = updateRecurringPreview;
window.addCustomSplit = addCustomSplit;
window.removeCustomSplit = removeCustomSplit;
window.editRecurringExpense = editRecurringExpense;
window.toggleRecurringExpenseConfirm = toggleRecurringExpenseConfirm;
window.deleteRecurringExpenseConfirm = deleteRecurringExpenseConfirm;
window.openRecurringExpenseModal = openRecurringExpenseModal;
window.closeRecurringExpenseModal = closeRecurringExpenseModal;

console.log('定期费用模块已加载，所有函数已暴露到全局 - 修复版本');
