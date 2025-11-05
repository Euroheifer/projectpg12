// recurring_expense.js - 定期费用管理模块（完整实现版本）

import { 
    getTodayDate, 
    showCustomAlert, 
    getAuthToken, 
    requireAdmin,
    setupModalCloseHandlers 
} from '../ui/utils.js';

// --- 全局状态 ---
let recurringExpenseState = {
    isRecurring: false,
    frequency: 'monthly', // 默认每月
    startDate: getTodayDate(),
    endDate: ''
};

let recurringSelectedParticipants = new Set();
let recurringSplitMethod = 'equal';
let recurringMemberSplits = [];
let currentEditingRecurringExpense = null;

/**
 * 初始化定期费用表单
 */
export function initializeRecurringExpenseForm() {
    console.log('初始化定期费用表单');
    
    const form = document.getElementById('recurring-expense-form');
    if (!form) return;
    
    // 设置默认日期
    const startDateInput = document.getElementById('recurring-start-date');
    const endDateInput = document.getElementById('recurring-end-date');
    
    if (startDateInput) {
        startDateInput.value = getTodayDate();
    }
    
    if (endDateInput) {
        endDateInput.value = '';
    }
    
    // 初始化付款人选择器
    populateRecurringPayerSelect();
    
    // 初始化参与者选择
    populateRecurringParticipants();
    
    // 初始化分摊方式
    initializeRecurringSplitMethod();
    
    // 初始化频率选择
    initializeFrequencySelection();
    
    // 绑定事件监听器
    bindRecurringFormEvents();
    
    // 更新预览
    updateRecurringPreview();
}

/**
 * 填充定期费用付款人选择器
 */
function populateRecurringPayerSelect() {
    const payerSelect = document.getElementById('recurring-payer-select');
    if (!payerSelect || !window.groupMembers) return;
    
    payerSelect.innerHTML = '<option value="">选择付款人</option>';
    
    window.groupMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.username;
        if (member.id === window.CURRENT_USER_ID) {
            option.selected = true; // 默认选择当前用户
        }
        payerSelect.appendChild(option);
    });
}

/**
 * 填充参与者选择
 */
function populateRecurringParticipants() {
    const container = document.getElementById('recurring-participants-container');
    if (!container || !window.groupMembers) return;
    
    container.innerHTML = '';
    
    window.groupMembers.forEach(member => {
        const participantDiv = document.createElement('div');
        participantDiv.className = 'participant-item';
        participantDiv.innerHTML = `
            <input type="checkbox" 
                   id="participant-${member.id}" 
                   value="${member.id}" 
                   onchange="handleRecurringParticipantChange(${member.id})">
            <label for="participant-${member.id}">${member.username}</label>
        `;
        container.appendChild(participantDiv);
    });
}

/**
 * 初始化分摊方式
 */
function initializeRecurringSplitMethod() {
    // 默认选择等额分摊
    const equalBtn = document.getElementById('split-equal-btn');
    if (equalBtn) {
        equalBtn.classList.add('active');
    }
    
    // 更新分摊计算
    updateRecurringSplitCalculation();
}

/**
 * 初始化频率选择
 */
function initializeFrequencySelection() {
    // 默认选择每月
    const monthlyBtn = document.getElementById('frequency-monthly-btn');
    if (monthlyBtn) {
        monthlyBtn.classList.add('active');
    }
}

/**
 * 绑定定期费用表单事件
 */
function bindRecurringFormEvents() {
    const form = document.getElementById('recurring-expense-form');
    if (!form) return;
    
    // 防止表单默认提交
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await handleSaveRecurringExpense(event);
    });
    
    // 金额变化事件
    const amountInput = document.getElementById('recurring-amount-input');
    if (amountInput) {
        amountInput.addEventListener('input', handleRecurringAmountChange);
    }
}

/**
 * 选择频率
 */
export function selectFrequency(frequency) {
    console.log('选择频率:', frequency);
    
    // 更新频率状态
    recurringExpenseState.frequency = frequency;
    
    // 更新UI选中状态
    updateFrequencyButtons(frequency);
    
    // 更新预览信息
    updateRecurringPreview();
}

/**
 * 更新频率按钮状态
 */
function updateFrequencyButtons(selectedFrequency) {
    const buttons = document.querySelectorAll('[id^="frequency-"][id$="-btn"]');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === `frequency-${selectedFrequency}-btn`) {
            btn.classList.add('active');
        }
    });
}

/**
 * 设置定期费用分摊方式
 */
export function setRecurringSplitMethod(method) {
    console.log('设置定期费用分摊方式:', method);
    
    // 更新当前分摊方式
    recurringSplitMethod = method;
    
    // 更新按钮状态
    updateSplitMethodButtons(method);
    
    // 重新计算分摊金额
    updateRecurringSplitCalculation();
    
    // 更新UI显示
    renderSplitCalculation();
}

/**
 * 更新分摊方式按钮状态
 */
function updateSplitMethodButtons(method) {
    const buttons = document.querySelectorAll('[id^="split-"][id$="-btn"]');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === `split-${method}-btn`) {
            btn.classList.add('active');
        }
    });
}

/**
 * 处理参与者选择变化
 */
export function handleRecurringParticipantChange(memberId) {
    const checkbox = document.getElementById(`participant-${memberId}`);
    
    if (checkbox.checked) {
        recurringSelectedParticipants.add(memberId);
    } else {
        recurringSelectedParticipants.delete(memberId);
    }
    
    // 重新计算分摊金额
    updateRecurringSplitCalculation();
}

/**
 * 更新定期费用分摊计算
 */
export function updateRecurringSplitCalculation() {
    console.log('更新定期费用分摊计算');
    
    // 获取总金额
    const amountInput = document.getElementById('recurring-amount-input');
    const totalAmount = parseFloat(amountInput?.value || '0');
    
    if (totalAmount <= 0 || recurringSelectedParticipants.size === 0) {
        recurringMemberSplits = [];
        renderSplitCalculation();
        return;
    }
    
    // 根据分摊方式计算每人金额
    if (recurringSplitMethod === 'equal') {
        // 等额分摊
        const amountPerPerson = totalAmount / recurringSelectedParticipants.size;
        recurringMemberSplits = Array.from(recurringSelectedParticipants).map(memberId => {
            const member = window.groupMembers.find(m => m.id === memberId);
            return {
                user_id: memberId,
                username: member?.username || '未知',
                amount: amountPerPerson
            };
        });
        
    } else if (recurringSplitMethod === 'exact') {
        // 自定义分摊 - 暂时使用等额分摊，后续可以扩展为可编辑
        const amountPerPerson = totalAmount / recurringSelectedParticipants.size;
        recurringMemberSplits = Array.from(recurringSelectedParticipants).map(memberId => {
            const member = window.groupMembers.find(m => m.id === memberId);
            return {
                user_id: memberId,
                username: member?.username || '未知',
                amount: amountPerPerson
            };
        });
    }
    
    renderSplitCalculation();
}

/**
 * 渲染分摊计算结果
 */
function renderSplitCalculation() {
    const container = document.getElementById('recurring-split-calculation');
    if (!container) return;
    
    if (recurringMemberSplits.length === 0) {
        container.innerHTML = '<div class="split-placeholder">请选择参与者和金额</div>';
        return;
    }
    
    const splitsHTML = recurringMemberSplits.map(split => `
        <div class="split-item">
            <span class="split-username">${split.username}</span>
            <span class="split-amount">¥${split.amount.toFixed(2)}</span>
        </div>
    `).join('');
    
    const totalAmount = recurringMemberSplits.reduce((sum, split) => sum + split.amount, 0);
    
    container.innerHTML = `
        <div class="split-details">
            ${splitsHTML}
        </div>
        <div class="split-total">
            总计: ¥${totalAmount.toFixed(2)}
        </div>
    `;
}

/**
 * 处理定期费用金额变化
 */
export function handleRecurringAmountChange() {
    console.log('处理定期费用金额变化');
    
    // 重新计算分摊金额
    updateRecurringSplitCalculation();
    
    // 更新预览信息
    updateRecurringPreview();
    
    // 更新UI显示
    renderRecurringAmountChange();
}

/**
 * 渲染金额变化
 */
function renderRecurringAmountChange() {
    // 更新摘要信息
    const summaryContainer = document.getElementById('recurring-summary');
    if (summaryContainer) {
        const amount = parseFloat(document.getElementById('recurring-amount-input')?.value || '0');
        const frequency = recurringExpenseState.frequency;
        const frequencyText = getFrequencyText(frequency);
        
        summaryContainer.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">金额:</span>
                <span class="summary-value">¥${amount.toFixed(2)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">频率:</span>
                <span class="summary-value">${frequencyText}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">参与者:</span>
                <span class="summary-value">${recurringSelectedParticipants.size}人</span>
            </div>
        `;
    }
}

/**
 * 获取频率文本
 */
function getFrequencyText(frequency) {
    const frequencyMap = {
        daily: '每日',
        weekly: '每周',
        monthly: '每月',
        yearly: '每年'
    };
    return frequencyMap[frequency] || '未知';
}

/**
 * 更新定期费用预览
 */
export function updateRecurringPreview() {
    console.log('更新定期费用预览');
    
    // 生成预览日期
    const previewDates = generateRecurringPreviewDates();
    
    // 更新预览列表
    renderRecurringPreviewList(previewDates);
    
    // 更新预览摘要
    updateRecurringPreviewSummary(previewDates);
}

/**
 * 生成定期费用预览日期
 */
function generateRecurringPreviewDates() {
    const startDate = recurringExpenseState.startDate;
    const endDate = recurringExpenseState.endDate;
    const frequency = recurringExpenseState.frequency;
    
    const dates = [];
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
    
    let current = new Date(start);
    const interval = getFrequencyInterval(frequency);
    
    // 最多显示12个未来日期
    const maxPreviewCount = 12;
    let count = 0;
    
    while (current <= end && count < maxPreviewCount) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + interval);
        count++;
    }
    
    return dates;
}

/**
 * 获取频率间隔天数
 */
function getFrequencyInterval(frequency) {
    const intervalMap = {
        daily: 1,
        weekly: 7,
        monthly: 30,
        yearly: 365
    };
    return intervalMap[frequency] || 30;
}

/**
 * 渲染预览列表
 */
function renderRecurringPreviewList(dates) {
    const container = document.getElementById('recurring-preview-list');
    if (!container) return;
    
    if (dates.length === 0) {
        container.innerHTML = '<div class="preview-placeholder">暂无预览日期</div>';
        return;
    }
    
    const datesHTML = dates.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        const dayStr = date.toLocaleDateString('zh-CN', { 
            month: 'short', 
            day: 'numeric',
            weekday: 'short'
        });
        
        return `
            <div class="preview-item">
                <span class="preview-date">${dayStr}</span>
                <span class="preview-date-str">${dateStr}</span>
            </div>
        `;
    }).join('');
    
    container.innerHTML = datesHTML;
}

/**
 * 更新预览摘要
 */
function updateRecurringPreviewSummary(dates) {
    const container = document.getElementById('recurring-preview-summary');
    if (!container) return;
    
    const frequencyText = getFrequencyText(recurringExpenseState.frequency);
    const totalCount = dates.length;
    
    container.innerHTML = `
        <div class="preview-summary-item">
            <span class="summary-label">频率:</span>
            <span class="summary-value">${frequencyText}</span>
        </div>
        <div class="preview-summary-item">
            <span class="summary-label">未来 ${frequencyText} 共:</span>
            <span class="summary-value">${totalCount} 次</span>
        </div>
    `;
}

/**
 * 保存定期费用
 */
export async function handleSaveRecurringExpense(event) {
    try {
        console.log('保存定期费用');
        
        // 表单验证
        if (!validateRecurringExpenseForm()) {
            return;
        }
        
        // 数据组装
        const expenseData = collectRecurringExpenseFormData();
        
        // 显示加载状态
        const submitBtn = document.querySelector('#recurring-expense-form button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '保存中...';
        submitBtn.disabled = true;
        
        // API调用保存定期费用
        const token = getAuthToken();
        const url = currentEditingRecurringExpense 
            ? `/api/recurring-expenses/${currentEditingRecurringExpense.id}`
            : `/api/groups/${window.currentGroupId}/recurring-expenses`;
        
        const method = currentEditingRecurringExpense ? 'PATCH' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(expenseData)
        });
        
        // 恢复按钮状态
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        if (response.ok) {
            showCustomAlert('定期费用保存成功！', false);
            
            // 关闭弹窗
            const modal = document.getElementById('recurring-expense-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
            
            // 刷新定期费用列表
            await refreshRecurringList();
            
        } else {
            const error = await response.json();
            showCustomAlert('保存失败: ' + (error.detail || '未知错误'));
        }
        
    } catch (error) {
        console.error('保存定期费用错误:', error);
        showCustomAlert('保存失败: ' + error.message);
    }
}

/**
 * 验证定期费用表单
 */
function validateRecurringExpenseForm() {
    const descriptionInput = document.getElementById('recurring-description-input');
    const amountInput = document.getElementById('recurring-amount-input');
    const payerSelect = document.getElementById('recurring-payer-select');
    const startDateInput = document.getElementById('recurring-start-date');
    const endDateInput = document.getElementById('recurring-end-date');
    
    if (!descriptionInput?.value.trim()) {
        showCustomAlert('请输入费用描述');
        return false;
    }
    
    const amount = parseFloat(amountInput?.value || '0');
    if (!amount || amount <= 0) {
        showCustomAlert('请输入有效的费用金额');
        return false;
    }
    
    if (!payerSelect?.value) {
        showCustomAlert('请选择付款人');
        return false;
    }
    
    if (!startDateInput?.value) {
        showCustomAlert('请选择开始日期');
        return false;
    }
    
    if (endDateInput?.value && new Date(endDateInput.value) <= new Date(startDateInput.value)) {
        showCustomAlert('结束日期必须晚于开始日期');
        return false;
    }
    
    if (recurringSelectedParticipants.size === 0) {
        showCustomAlert('请选择至少一个参与者');
        return false;
    }
    
    return true;
}

/**
 * 收集定期费用表单数据
 */
function collectRecurringExpenseFormData() {
    const descriptionInput = document.getElementById('recurring-description-input');
    const amountInput = document.getElementById('recurring-amount-input');
    const payerSelect = document.getElementById('recurring-payer-select');
    const startDateInput = document.getElementById('recurring-start-date');
    const endDateInput = document.getElementById('recurring-end-date');
    
    return {
        description: descriptionInput?.value.trim() || '',
        amount: Math.round(parseFloat(amountInput?.value || '0') * 100),
        payer_id: parseInt(payerSelect?.value || '0'),
        frequency: recurringExpenseState.frequency,
        start_date: startDateInput?.value || '',
        end_date: endDateInput?.value || null,
        split_type: recurringSplitMethod,
        splits: Array.from(recurringSelectedParticipants).map(userId => ({
            user_id: userId,
            amount: null // 后续可以支持自定义金额
        })),
        status: 'active'
    };
}

/**
 * 禁用定期费用
 */
export async function handleDisableRecurringExpense() {
    try {
        if (!currentEditingRecurringExpense) {
            showCustomAlert('没有选择要禁用的定期费用');
            return;
        }
        
        // API调用禁用定期费用
        const token = getAuthToken();
        const response = await fetch(`/api/recurring-expenses/${currentEditingRecurringExpense.id}/disable`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showCustomAlert('定期费用已禁用！', false);
            
            // 更新UI状态
            updateRecurringExpenseStatus(false);
            
            // 关闭详情弹窗
            const modal = document.getElementById('recurring-expense-detail-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
            
            // 重置编辑状态
            currentEditingRecurringExpense = null;
            
            // 刷新定期费用列表
            await refreshRecurringList();
            
        } else {
            const error = await response.json();
            showCustomAlert('禁用失败: ' + (error.detail || '未知错误'));
        }
        
    } catch (error) {
        console.error('禁用定期费用错误:', error);
        showCustomAlert('禁用失败: ' + error.message);
    }
}

/**
 * 启用定期费用
 */
export async function handleEnableRecurringExpense() {
    try {
        if (!currentEditingRecurringExpense) {
            showCustomAlert('没有选择要启用的定期费用');
            return;
        }
        
        // API调用启用定期费用
        const token = getAuthToken();
        const response = await fetch(`/api/recurring-expenses/${currentEditingRecurringExpense.id}/enable`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showCustomAlert('定期费用已启用！', false);
            
            // 更新UI状态
            updateRecurringExpenseStatus(true);
            
            // 关闭详情弹窗
            const modal = document.getElementById('recurring-expense-detail-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
            
            // 重置编辑状态
            currentEditingRecurringExpense = null;
            
            // 刷新定期费用列表
            await refreshRecurringList();
            
        } else {
            const error = await response.json();
            showCustomAlert('启用失败: ' + (error.detail || '未知错误'));
        }
        
    } catch (error) {
        console.error('启用定期费用错误:', error);
        showCustomAlert('启用失败: ' + error.message);
    }
}

/**
 * 删除定期费用
 */
export async function handleDeleteRecurringExpense() {
    console.log('删除定期费用');
    
    // 显示确认弹窗
    const confirmModal = document.getElementById('delete-recurring-confirm-modal');
    if (confirmModal) {
        confirmModal.classList.remove('hidden');
    }
}

/**
 * 确认删除定期费用
 */
export async function confirmDeleteRecurringExpense() {
    try {
        if (!currentEditingRecurringExpense) {
            showCustomAlert('没有选择要删除的定期费用');
            return;
        }
        
        // API调用删除定期费用
        const token = getAuthToken();
        const response = await fetch(`/api/recurring-expenses/${currentEditingRecurringExpense.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showCustomAlert('定期费用删除成功！', false);
            
            // 关闭确认弹窗
            const confirmModal = document.getElementById('delete-recurring-confirm-modal');
            if (confirmModal) {
                confirmModal.classList.add('hidden');
            }
            
            // 关闭详情弹窗
            const modal = document.getElementById('recurring-expense-detail-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
            
            // 重置编辑状态
            currentEditingRecurringExpense = null;
            
            // 刷新定期费用列表
            await refreshRecurringList();
            
        } else {
            const error = await response.json();
            showCustomAlert('删除失败: ' + (error.detail || '未知错误'));
        }
        
    } catch (error) {
        console.error('删除定期费用错误:', error);
        showCustomAlert('删除失败: ' + error.message);
    }
}

/**
 * 刷新定期费用列表
 */
export function refreshRecurringList() {
    console.log('刷新定期费用列表');
    
    // API调用获取定期费用列表
    fetchRecurringExpensesData().then(expenses => {
        // 更新全局定期费用列表
        window.recurringExpensesList = expenses;
        
        // 渲染定期费用列表UI
        renderRecurringList(expenses);
    }).catch(error => {
        console.error('获取定期费用列表失败:', error);
        showCustomAlert('获取定期费用列表失败');
    });
}

/**
 * 获取定期费用数据
 */
async function fetchRecurringExpensesData() {
    const token = getAuthToken();
    const response = await fetch(`/api/groups/${window.currentGroupId}/recurring-expenses`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error('获取定期费用列表失败');
    }
    
    return await response.json();
}

/**
 * 渲染定期费用列表
 */
function renderRecurringList(expenses) {
    const container = document.getElementById('recurring-expenses-list-container');
    if (!container) return;
    
    if (!expenses || expenses.length === 0) {
        container.innerHTML = '<div class="empty-message">暂无定期费用</div>';
        return;
    }
    
    const expensesHTML = expenses.map(expense => {
        const payer = window.groupMembers.find(m => m.id === expense.payer_id);
        const frequencyText = getFrequencyText(expense.frequency);
        const statusText = expense.status === 'active' ? '活跃' : '已禁用';
        const nextDate = calculateNextExpenseDate(expense);
        
        return `
            <div class="recurring-item" onclick="openRecurringDetail(${expense.id})">
                <div class="recurring-info">
                    <div class="recurring-description">${expense.description}</div>
                    <div class="recurring-details">
                        <span class="frequency">${frequencyText}</span>
                        <span class="payer">付款人: ${payer?.username || '未知'}</span>
                    </div>
                </div>
                <div class="recurring-amount">¥${(expense.amount / 100).toFixed(2)}</div>
                <div class="recurring-status">
                    <span class="status-badge ${expense.status}">${statusText}</span>
                    <div class="next-date">下次: ${nextDate}</div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = expensesHTML;
}

/**
 * 计算下次费用日期
 */
function calculateNextExpenseDate(expense) {
    const startDate = new Date(expense.start_date);
    const now = new Date();
    const interval = getFrequencyInterval(expense.frequency);
    
    let nextDate = new Date(startDate);
    while (nextDate <= now) {
        nextDate.setDate(nextDate.getDate() + interval);
    }
    
    return nextDate.toLocaleDateString('zh-CN', { 
        month: 'short', 
        day: 'numeric'
    });
}

/**
 * 填充定期费用详情表单
 */
export function populateRecurringDetailForm(expense) {
    console.log('填充定期费用详情表单', expense);
    
    if (!expense) return;
    
    // 设置当前编辑定期费用
    currentEditingRecurringExpense = expense;
    
    // 填充表单字段
    const descriptionInput = document.getElementById('recurring-detail-description');
    const amountInput = document.getElementById('recurring-detail-amount');
    const payerSelect = document.getElementById('recurring-detail-payer-select');
    const startDateInput = document.getElementById('recurring-detail-start-date');
    const endDateInput = document.getElementById('recurring-detail-end-date');
    
    if (descriptionInput) {
        descriptionInput.textContent = expense.description;
    }
    
    if (amountInput) {
        amountInput.textContent = `¥${(expense.amount / 100).toFixed(2)}`;
    }
    
    if (payerSelect) {
        const payer = window.groupMembers.find(m => m.id === expense.payer_id);
        payerSelect.textContent = payer?.username || '未知';
    }
    
    if (startDateInput) {
        startDateInput.textContent = expense.start_date;
    }
    
    if (endDateInput) {
        endDateInput.textContent = expense.end_date || '无';
    }
    
    // 设置频率信息
    const frequencyText = getFrequencyText(expense.frequency);
    const frequencyElement = document.getElementById('recurring-detail-frequency');
    if (frequencyElement) {
        frequencyElement.textContent = frequencyText;
    }
    
    // 设置状态信息
    const statusText = expense.status === 'active' ? '活跃' : '已禁用';
    const statusElement = document.getElementById('recurring-detail-status');
    if (statusElement) {
        statusElement.textContent = statusText;
    }
    
    // 设置分摊详情
    renderRecurringDetailSplits(expense.splits || []);
}

/**
 * 渲染定期费用详情分摊
 */
function renderRecurringDetailSplits(splits) {
    const container = document.getElementById('recurring-detail-splits');
    if (!container) return;
    
    const splitsHTML = splits.map(split => {
        const member = window.groupMembers.find(m => m.id === split.user_id);
        const amount = split.amount || 0;
        
        return `
            <div class="split-item">
                <span class="split-username">${member?.username || '未知'}</span>
                <span class="split-amount">¥${(amount / 100).toFixed(2)}</span>
            </div>
        `;
    }).join('');
    
    container.innerHTML = splitsHTML;
}

/**
 * 打开定期费用详情
 */
export function openRecurringDetail(expenseId) {
    console.log('打开定期费用详情', expenseId);
    
    const expense = window.recurringExpensesList.find(e => e.id === expenseId);
    if (!expense) {
        showCustomAlert('定期费用不存在');
        return;
    }
    
    // 设置当前编辑定期费用
    currentEditingRecurringExpense = expense;
    
    // 填充详情表单
    populateRecurringDetailForm(expense);
    
    // 打开详情弹窗
    const modal = document.getElementById('recurring-expense-detail-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * 更新定期费用状态
 */
function updateRecurringExpenseStatus(isActive) {
    if (!currentEditingRecurringExpense) return;
    
    currentEditingRecurringExpense.status = isActive ? 'active' : 'inactive';
    
    // 更新状态显示
    const statusElement = document.getElementById('recurring-detail-status');
    if (statusElement) {
        statusElement.textContent = isActive ? '活跃' : '已禁用';
    }
}

/**
 * 编辑定期费用
 */
export async function handleEditRecurringExpense() {
    console.log('编辑定期费用');
    
    if (!currentEditingRecurringExpense) {
        showCustomAlert('没有选择要编辑的定期费用');
        return;
    }
    
    // 切换到编辑模式
    // 这里可以切换到编辑弹窗，或者在同一弹窗中切换到编辑模式
    // 为了简化，这里直接关闭详情弹窗，打开编辑弹窗
    const detailModal = document.getElementById('recurring-expense-detail-modal');
    if (detailModal) {
        detailModal.classList.add('hidden');
    }
    
    // 填充编辑表单
    populateRecurringEditForm(currentEditingRecurringExpense);
    
    // 打开编辑弹窗
    const editModal = document.getElementById('recurring-expense-modal');
    if (editModal) {
        editModal.classList.remove('hidden');
    }
}

/**
 * 填充定期费用编辑表单
 */
function populateRecurringEditForm(expense) {
    // 填充基本字段
    const descriptionInput = document.getElementById('recurring-description-input');
    const amountInput = document.getElementById('recurring-amount-input');
    const payerSelect = document.getElementById('recurring-payer-select');
    const startDateInput = document.getElementById('recurring-start-date');
    const endDateInput = document.getElementById('recurring-end-date');
    
    if (descriptionInput) {
        descriptionInput.value = expense.description;
    }
    
    if (amountInput) {
        amountInput.value = (expense.amount / 100).toFixed(2);
    }
    
    if (payerSelect) {
        payerSelect.value = expense.payer_id;
    }
    
    if (startDateInput) {
        startDateInput.value = expense.start_date;
    }
    
    if (endDateInput) {
        endDateInput.value = expense.end_date || '';
    }
    
    // 设置频率
    recurringExpenseState.frequency = expense.frequency;
    updateFrequencyButtons(expense.frequency);
    
    // 设置参与者
    recurringSelectedParticipants.clear();
    if (expense.splits) {
        expense.splits.forEach(split => {
            recurringSelectedParticipants.add(split.user_id);
            
            // 选中对应的复选框
            const checkbox = document.getElementById(`participant-${split.user_id}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
    
    // 设置分摊方式
    recurringSplitMethod = expense.split_type || 'equal';
    updateSplitMethodButtons(recurringSplitMethod);
    
    // 重新计算分摊
    updateRecurringSplitCalculation();
}

// 暴露函数到全局
window.handleSaveRecurringExpense = handleSaveRecurringExpense;
window.selectFrequency = selectFrequency;
window.setRecurringSplitMethod = setRecurringSplitMethod;
window.handleRecurringParticipantChange = handleRecurringParticipantChange;
window.updateRecurringSplitCalculation = updateRecurringSplitCalculation;
window.handleRecurringAmountChange = handleRecurringAmountChange;
window.updateRecurringPreview = updateRecurringPreview;
window.handleDisableRecurringExpense = handleDisableRecurringExpense;
window.handleEnableRecurringExpense = handleEnableRecurringExpense;
window.handleDeleteRecurringExpense = handleDeleteRecurringExpense;
window.confirmDeleteRecurringExpense = confirmDeleteRecurringExpense;
window.handleEditRecurringExpense = handleEditRecurringExpense;
window.openRecurringDetail = openRecurringDetail;
window.refreshRecurringList = refreshRecurringList;

console.log('定期费用模块已加载，所有函数已暴露到全局');