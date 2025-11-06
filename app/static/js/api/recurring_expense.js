// recurring_expense.js - 定期费用相关的CRUD操作、频率设置
// 防止缓存版本: 2025.11.06
const JS_CACHE_VERSION = '2025.11.06.001';

// 导入金额转换函数 - 修复导入路径
import { centsToAmountString } from './amount_utils.js';

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

/**
 * 初始化定期费用表单
 */
export function initializeRecurringExpenseForm() {
    console.log('初始化定期费用表单');

    // 设置默认日期
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('recurring-start-date');
    if (startDateInput) {
        startDateInput.value = today;
        recurringExpenseState.startDate = today;
    }

    // 检查组员数据是否已加载
    if (!window.groupMembers || window.groupMembers.length === 0) {
        console.warn('组员数据尚未加载，定期费用表单可能无法正常初始化');
        // 可以选择延迟初始化，或者显示提示信息
        setTimeout(() => {
            initializePayerSelector();
            initializeParticipantSelection();
        }, 1000);
    } else {
        // 初始化付款人选择器
        initializePayerSelector();

        // 初始化参与者选择
        initializeParticipantSelection();
    }

    // 初始化分摊方式
    initializeSplitMethod();

    // 初始化频率选择
    initializeFrequencySelection();

    // 绑定事件监听器
    bindEventListeners();
}

/**
 * 初始化付款人选择器 - 修复版本
 */
function initializePayerSelector() {
    const payerSelect = document.getElementById('recurring-payer');
    if (payerSelect) {
        // 从全局组员列表中加载选项，使用 groupMembers 而不是 participants
        if (window.groupMembers && window.groupMembers.length > 0) {
            payerSelect.innerHTML = '<option value="">请选择付款人</option>';
            window.groupMembers.forEach(member => {
                const option = document.createElement('option');
                // 使用member.id或member.user_id作为值，确保兼容性
                const memberId = member.id || member.user_id;
                option.value = memberId;
                // 使用member.username作为显示名称，确保兼容性
                const memberName = member.username || member.user?.username || member.name || '未知用户';
                option.textContent = memberName;
                payerSelect.appendChild(option);
            });
            console.log('已初始化付款人选择器，成员数量:', window.groupMembers.length);
        } else {
            // 如果没有数据，显示提示信息
            payerSelect.innerHTML = '<option value="">暂无可选付款人</option>';
            console.warn('组员数据为空，无法初始化付款人选择器');
        }
    } else {
        console.error('找不到付款人选择器元素');
    }
}

/**
 * 初始化参与者选择 - 修复版本
 */
function initializeParticipantSelection() {
    const participantContainer = document.getElementById('recurring-participants');
    if (participantContainer && window.groupMembers) {
        participantContainer.innerHTML = '';
        window.groupMembers.forEach(member => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            // 使用member.id或member.user_id作为值，确保兼容性
            const memberId = member.id || member.user_id;
            checkbox.id = `participant-${memberId}`;
            checkbox.value = memberId;
            checkbox.addEventListener('change', handleParticipantToggle);
            
            const label = document.createElement('label');
            label.setAttribute('for', `participant-${memberId}`);
            // 使用member.username作为显示名称，确保兼容性
            const memberName = member.username || member.user?.username || member.name || '未知用户';
            label.textContent = memberName;
            
            const container = document.createElement('div');
            container.appendChild(checkbox);
            container.appendChild(label);
            participantContainer.appendChild(container);
        });
        console.log('已初始化参与者选择，参与者数量:', window.groupMembers.length);
    } else {
        console.error('找不到参与者容器或组员数据为空');
    }
}

/**
 * 初始化分摊方式
 */
function initializeSplitMethod() {
    const methodButtons = document.querySelectorAll('.split-method-btn');
    methodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const method = btn.getAttribute('data-method');
            setRecurringSplitMethod(method);
        });
    });
    
    // 默认选择等额分摊
    setRecurringSplitMethod('equal');
}

/**
 * 初始化频率选择
 */
function initializeFrequencySelection() {
    const frequencyButtons = document.querySelectorAll('.frequency-option');
    frequencyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const frequency = btn.getAttribute('data-frequency') || btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
            selectFrequency(frequency);
        });
    });
    
    // 默认选择每日
    selectFrequency('daily');
}

/**
 * 更新定期费用表单中的成员列表
 */
export function updateRecurringFormMembers() {
    console.log('更新定期费用表单中的成员列表');
    
    // 重新初始化付款人选择器
    initializePayerSelector();
    
    // 重新初始化参与者选择
    initializeParticipantSelection();
    
    // 重新计算分摊详情
    updateSplitDetailDisplay();
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 金额变化监听
    const amountInput = document.getElementById('recurring-amount');
    if (amountInput) {
        amountInput.addEventListener('input', handleRecurringAmountChange);
    }
    
    // 日期变化监听
    const startDateInput = document.getElementById('recurring-start-date');
    const endDateInput = document.getElementById('recurring-end-date');
    
    if (startDateInput) {
        startDateInput.addEventListener('change', handleDateChange);
    }
    if (endDateInput) {
        endDateInput.addEventListener('change', handleDateChange);
    }
    
    // 表单提交监听
    const form = document.getElementById('recurring-expense-form');
    if (form) {
        form.addEventListener('submit', handleSaveRecurringExpense);
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
    const frequencyButtons = document.querySelectorAll('.frequency-option');
    frequencyButtons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.getAttribute('data-frequency') === frequency || btn.getAttribute('onclick')?.includes(`'${frequency}'`)) {
            btn.classList.add('selected');
        }
    });
    
    // 更新预览信息
    updateRecurringPreview();
}

/**
 * 设置定期费用分摊方式
 */
export function setRecurringSplitMethod(method) {
    console.log('设置定期费用分摊方式:', method);
    
    // 更新当前分摊方式
    recurringSplitMethod = method;
    
    // 更新按钮状态
    const methodButtons = document.querySelectorAll('.split-method-btn');
    methodButtons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.getAttribute('data-method') === method) {
            btn.classList.add('selected');
        }
    });
    
    // 重新计算分摊金额
    updateRecurringSplitCalculation();
    
    // 更新UI显示
    updateSplitDetailDisplay();
}

/**
 * 更新定期费用分摊计算
 */
export function updateRecurringSplitCalculation() {
    console.log('更新定期费用分摊计算');
    
    // 获取总金额
    const totalAmountInput = document.getElementById('recurring-amount');
    const totalAmount = parseFloat(totalAmountInput?.value) || 0;
    
    if (totalAmount <= 0 || recurringSelectedParticipants.size === 0) {
        recurringMemberSplits = [];
        return;
    }
    
    // 根据分摊方式计算每人金额
    const participants = Array.from(recurringSelectedParticipants);
    const totalParticipants = participants.length;
    
    if (recurringSplitMethod === 'equal') {
        // 等额分摊
        const baseAmount = Math.floor((totalAmount * 100) / totalParticipants) / 100;
        const remainder = Math.round((totalAmount - baseAmount * totalParticipants) * 100);
        
        recurringMemberSplits = participants.map((participantId, index) => {
            const amount = baseAmount + (index < remainder ? 0.01 : 0);
            return {
                participantId,
                amount: parseFloat(amount.toFixed(2)),
                percentage: parseFloat((amount / totalAmount * 100).toFixed(2))
            };
        });
    } else if (recurringSplitMethod === 'custom') {
        // 自定义分摊 - 这里可以后续扩展
        const equalAmount = totalAmount / totalParticipants;
        recurringMemberSplits = participants.map(participantId => ({
            participantId,
            amount: parseFloat(equalAmount.toFixed(2)),
            percentage: parseFloat((100 / totalParticipants).toFixed(2))
        }));
    }
    
    // 更新分摊详情显示和摘要信息
    updateSplitDetailDisplay();
    updateRecurringSummary();
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
    updateAmountDisplay();
}

/**
 * 更新定期费用预览
 */
export function updateRecurringPreview() {
    console.log('更新定期费用预览');
    
    const startDate = document.getElementById('recurring-start-date')?.value;
    const endDate = document.getElementById('recurring-end-date')?.value;
    const totalAmount = parseFloat(document.getElementById('recurring-amount')?.value) || 0;
    
    if (!startDate || totalAmount <= 0) {
        clearPreviewDisplay();
        return;
    }
    
    // 根据频率和日期生成预览
    const previewData = generateRecurringPreview(
        startDate,
        endDate,
        recurringExpenseState.frequency,
        totalAmount
    );
    
    // 更新预览列表
    updatePreviewList(previewData);
    
    // 更新预览摘要
    updatePreviewSummary(previewData);
}

/**
 * 保存定期费用
 */
export async function handleSaveRecurringExpense(event) {
    event.preventDefault();
    console.log('保存定期费用');
    
    try {
        // 表单验证
        const validationResult = validateRecurringExpenseForm();
        if (!validationResult.isValid) {
            showMessage(validationResult.message, 'error');
            return;
        }
        
        // 数据组装
        const formData = collectRecurringExpenseFormData();
        
        // API调用保存定期费用
        const response = await fetch('/api/recurring-expenses', {
            method: currentEditingRecurringExpense ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        // 处理响应
        if (response.ok) {
            const result = await response.json();
            showMessage(currentEditingRecurringExpense ? '定期费用更新成功' : '定期费用创建成功', 'success');
            
            // 关闭弹窗
            closeRecurringExpenseModal();
            
            // 刷新定期费用列表
            await refreshRecurringList();
        } else {
            const error = await response.json();
            showMessage(error.message || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存定期费用失败:', error);
        showMessage('保存失败，请稍后重试', 'error');
    }
}

/**
 * 禁用定期费用
 */
export async function handleDisableRecurringExpense(expenseId) {
    console.log('禁用定期费用:', expenseId);
    
    try {
        // API调用禁用定期费用
        const response = await fetch(`/api/recurring-expenses/${expenseId}/disable`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        // 处理响应
        if (response.ok) {
            showMessage('定期费用已禁用', 'success');
            
            // 更新UI状态
            updateRecurringExpenseStatus(expenseId, false);
        } else {
            const error = await response.json();
            showMessage(error.message || '禁用失败', 'error');
        }
    } catch (error) {
        console.error('禁用定期费用失败:', error);
        showMessage('禁用失败，请稍后重试', 'error');
    }
}

/**
 * 启用定期费用
 */
export async function handleEnableRecurringExpense(expenseId) {
    console.log('启用定期费用:', expenseId);
    
    try {
        // API调用启用定期费用
        const response = await fetch(`/api/recurring-expenses/${expenseId}/enable`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        // 处理响应
        if (response.ok) {
            showMessage('定期费用已启用', 'success');
            
            // 更新UI状态
            updateRecurringExpenseStatus(expenseId, true);
        } else {
            const error = await response.json();
            showMessage(error.message || '启用失败', 'error');
        }
    } catch (error) {
        console.error('启用定期费用失败:', error);
        showMessage('启用失败，请稍后重试', 'error');
    }
}

/**
 * 删除定期费用
 */
export async function handleDeleteRecurringExpense(expenseId) {
    console.log('删除定期费用:', expenseId);
    
    // 确认删除
    if (!confirm('确定要删除这个定期费用吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        // API调用删除定期费用
        const response = await fetch(`/api/recurring-expenses/${expenseId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        // 处理响应
        if (response.ok) {
            showMessage('定期费用已删除', 'success');
            
            // 关闭弹窗
            closeRecurringExpenseModal();
            
            // 刷新定期费用列表
            await refreshRecurringList();
        } else {
            const error = await response.json();
            showMessage(error.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除定期费用失败:', error);
        showMessage('删除失败，请稍后重试', 'error');
    }
}

/**
 * 编辑定期费用
 */
export async function handleEditRecurringExpense(expenseId) {
    console.log('编辑定期费用:', expenseId);
    
    try {
        // 切换到编辑模式
        currentEditingRecurringExpense = expenseId;
        
        // 获取定期费用详情
        const response = await fetch(`/api/recurring-expenses/${expenseId}`);
        
        if (response.ok) {
            const expense = await response.json();
            
            // 填充编辑表单
            populateRecurringDetailForm(expense);
            
            // 打开编辑弹窗
            openRecurringExpenseModal();
        } else {
            showMessage('获取定期费用详情失败', 'error');
        }
    } catch (error) {
        console.error('编辑定期费用失败:', error);
        showMessage('编辑失败，请稍后重试', 'error');
    }
}

/**
 * 填充定期费用详情表单
 */
export function populateRecurringDetailForm(expense) {
    console.log('填充定期费用详情表单', expense);

    // 填充表单字段
    document.getElementById('recurring-title').value = expense.title || '';
    document.getElementById('recurring-amount').value = expense.amount || '';
    document.getElementById('recurring-description').value = expense.description || '';
    document.getElementById('recurring-payer').value = expense.payer_id || '';
    document.getElementById('recurring-start-date').value = expense.start_date || '';
    document.getElementById('recurring-end-date').value = expense.end_date || '';
    
    // 设置频率信息
    recurringExpenseState.frequency = expense.frequency || 'daily';
    selectFrequency(expense.frequency || 'daily');
    
    // 设置状态信息
    recurringExpenseState.isRecurring = expense.is_active;
    
    // 清除并重新设置参与者选择
    recurringSelectedParticipants.clear();
    if (expense.participants && expense.participants.length > 0) {
        expense.participants.forEach(participantId => {
            recurringSelectedParticipants.add(participantId.toString());
            const checkbox = document.getElementById(`participant-${participantId}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
    
    // 设置分摊方式
    recurringSplitMethod = expense.split_method || 'equal';
    setRecurringSplitMethod(expense.split_method || 'equal');
    
    // 设置分摊详情
    if (expense.member_splits) {
        recurringMemberSplits = expense.member_splits;
        updateSplitDetailDisplay();
    }
    
    // 更新预览
    updateRecurringPreview();
}

/**
 * 刷新定期费用列表
 */
export async function refreshRecurringList() {
    console.log('刷新定期费用列表');
    
    try {
        // API调用获取定期费用列表
        const response = await fetch('/api/recurring-expenses');
        
        if (response.ok) {
            const recurringExpenses = await response.json();
            
            // 更新全局定期费用列表
            window.recurringExpensesList = recurringExpenses;
            
            // 渲染定期费用列表UI
            renderRecurringExpensesList(recurringExpenses);
        } else {
            console.error('获取定期费用列表失败');
            showMessage('获取定期费用列表失败', 'error');
        }
    } catch (error) {
        console.error('刷新定期费用列表失败:', error);
        showMessage('刷新定期费用列表失败', 'error');
    }
}

/**
 * 打开定期费用详情
 */
export function openRecurringDetail(expenseId) {
    console.log('打开定期费用详情', expenseId);
    
    // 设置当前编辑定期费用
    currentEditingRecurringExpense = expenseId;
    
    // API调用获取定期费用详情
    fetch(`/api/recurring-expenses/${expenseId}`)
        .then(response => response.json())
        .then(expense => {
            // 填充详情表单
            populateRecurringDetailForm(expense);
            
            // 打开详情弹窗
            openRecurringExpenseModal();
        })
        .catch(error => {
            console.error('获取定期费用详情失败:', error);
            showMessage('获取定期费用详情失败', 'error');
        });
}

window.handleSaveRecurringExpense = handleSaveRecurringExpense;

// ==================== 辅助函数 ====================

/**
 * 表单验证
 */
function validateRecurringExpenseForm() {
    const title = document.getElementById('recurring-title')?.value.trim();
    const amount = parseFloat(document.getElementById('recurring-amount')?.value);
    const payer = document.getElementById('recurring-payer')?.value;
    const startDate = document.getElementById('recurring-start-date')?.value;
    const endDate = document.getElementById('recurring-end-date')?.value;
    
    if (!title) {
        return { isValid: false, message: '请输入费用标题' };
    }
    
    if (!amount || amount <= 0) {
        return { isValid: false, message: '请输入有效的费用金额' };
    }
    
    if (!payer) {
        return { isValid: false, message: '请选择付款人' };
    }
    
    if (!startDate) {
        return { isValid: false, message: '请选择开始日期' };
    }
    
    if (endDate && new Date(endDate) <= new Date(startDate)) {
        return { isValid: false, message: '结束日期必须晚于开始日期' };
    }
    
    if (recurringSelectedParticipants.size === 0) {
        return { isValid: false, message: '请至少选择一个参与者' };
    }
    
    return { isValid: true };
}

/**
 * 收集表单数据
 */
function collectRecurringExpenseFormData() {
    const formData = {
        title: document.getElementById('recurring-title')?.value.trim(),
        amount: parseFloat(document.getElementById('recurring-amount')?.value),
        description: document.getElementById('recurring-description')?.value.trim(),
        payer_id: document.getElementById('recurring-payer')?.value,
        start_date: document.getElementById('recurring-start-date')?.value,
        end_date: document.getElementById('recurring-end-date')?.value || null,
        frequency: recurringExpenseState.frequency,
        participants: Array.from(recurringSelectedParticipants),
        split_method: recurringSplitMethod,
        member_splits: recurringMemberSplits,
        is_active: true
    };
    
    if (currentEditingRecurringExpense) {
        formData.id = currentEditingRecurringExpense;
    }
    
    return formData;
}

/**
 * 处理参与者切换
 */
function handleParticipantToggle(event) {
    const participantId = event.target.value;
    if (event.target.checked) {
        recurringSelectedParticipants.add(participantId);
    } else {
        recurringSelectedParticipants.delete(participantId);
    }
    updateRecurringSplitCalculation();
}

/**
 * 处理日期变化
 */
function handleDateChange(event) {
    const startDate = document.getElementById('recurring-start-date')?.value;
    const endDate = document.getElementById('recurring-end-date')?.value;
    
    recurringExpenseState.startDate = startDate;
    recurringExpenseState.endDate = endDate;
    
    updateRecurringPreview();
}

/**
 * 生成定期费用预览数据
 */
function generateRecurringPreview(startDate, endDate, frequency, totalAmount) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000); // 默认一年
    const previewData = [];
    const maxInstances = 100; // 限制最大实例数量
    let currentDate = new Date(start);
    let instanceCount = 0;
    
    while (currentDate <= end && instanceCount < maxInstances) {
        previewData.push({
            date: currentDate.toISOString().split('T')[0],
            amount: totalAmount,
            isActive: currentDate >= new Date()
        });
        
        // 根据频率增加日期
        switch (frequency) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
            case 'yearly':
                currentDate.setFullYear(currentDate.getFullYear() + 1);
                break;
        }
        instanceCount++;
    }
    
    return previewData;
}

/**
 * 更新预览列表显示
 */
function updatePreviewList(previewData) {
    const previewContainer = document.getElementById('recurring-preview-list');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = '';
    
    previewData.slice(0, 10).forEach(item => { // 只显示前10个实例
        const itemElement = document.createElement('div');
        itemElement.className = `preview-item ${item.isActive ? 'active' : 'inactive'}`;
        const amountCents = Math.round(item.amount * 100); // 将金额转换为分
        itemElement.innerHTML = `
            <span class="date">${item.date}</span>
            <span class="amount">${centsToAmountString(amountCents)}</span>
        `;
        previewContainer.appendChild(itemElement);
    });
    
    if (previewData.length > 10) {
        const moreElement = document.createElement('div');
        moreElement.className = 'preview-more';
        moreElement.textContent = `...还有 ${previewData.length - 10} 个实例`;
        previewContainer.appendChild(moreElement);
    }
}

/**
 * 更新预览摘要
 */
function updatePreviewSummary(previewData) {
    const summaryContainer = document.getElementById('recurring-preview-summary');
    if (!summaryContainer) return;
    
    const totalInstances = previewData.length;
    const totalAmount = previewData.reduce((sum, item) => sum + item.amount, 0);
    const activeInstances = previewData.filter(item => item.isActive).length;
    
    const totalAmountCents = Math.round(totalAmount * 100); // 将总金额转换为分
    
    summaryContainer.innerHTML = `
        <div class="summary-item">
            <span>总实例数:</span>
            <span>${totalInstances}</span>
        </div>
        <div class="summary-item">
            <span>总金额:</span>
            <span>${centsToAmountString(totalAmountCents)}</span>
        </div>
        <div class="summary-item">
            <span>有效实例:</span>
            <span>${activeInstances}</span>
        </div>
    `;
}

/**
 * 清除预览显示
 */
function clearPreviewDisplay() {
    const previewContainer = document.getElementById('recurring-preview-list');
    const summaryContainer = document.getElementById('recurring-preview-summary');
    
    if (previewContainer) previewContainer.innerHTML = '';
    if (summaryContainer) summaryContainer.innerHTML = '';
}

/**
 * 更新分摊详情显示
 */
function updateSplitDetailDisplay() {
    const detailContainer = document.getElementById('recurring-split-details');
    if (!detailContainer) return;
    
    detailContainer.innerHTML = '';
    
    recurringMemberSplits.forEach(split => {
        // 从 groupMembers 中查找参与者，确保兼容性
        const member = window.groupMembers?.find(m => 
            m.id?.toString() === split.participantId || 
            m.user_id?.toString() === split.participantId
        );
        // 使用member.username或member.name作为显示名称
        const memberName = member?.username || member?.user?.username || member?.name || `参与者${split.participantId}`;
        
        const amountCents = Math.round(split.amount * 100); // 将金额转换为分
        const detailElement = document.createElement('div');
        detailElement.className = 'split-detail-item';
        detailElement.innerHTML = `
            <span class="participant">${memberName}</span>
            <span class="amount">${centsToAmountString(amountCents)}</span>
            <span class="percentage">${split.percentage}%</span>
        `;
        detailContainer.appendChild(detailElement);
    });
}

/**
 * 更新定期费用摘要
 */
function updateRecurringSummary() {
    const totalAmount = parseFloat(document.getElementById('recurring-amount')?.value) || 0;
    const participantsCount = recurringSelectedParticipants.size;
    const perPersonAmount = participantsCount > 0 ? (totalAmount / participantsCount).toFixed(2) : '0.00';
    
    const summaryElement = document.getElementById('recurring-summary');
    if (summaryElement) {
        const totalAmountCents = Math.round(totalAmount * 100);
        const perPersonAmountCents = Math.round(perPersonAmount * 100);
        summaryElement.innerHTML = `
            <div class="summary-info">
                <span>总金额: ${centsToAmountString(totalAmountCents)}</span>
                <span>参与人数: ${participantsCount}</span>
                <span>每人平均: ${centsToAmountString(perPersonAmountCents)}</span>
            </div>
        `;
    }
}

/**
 * 更新金额显示
 */
function updateAmountDisplay() {
    const amountInput = document.getElementById('recurring-amount');
    if (amountInput) {
        const amount = parseFloat(amountInput.value);
        if (amount > 0) {
            // 可以在这里添加金额格式化显示
        }
    }
}

/**
 * 更新定期费用状态
 */
function updateRecurringExpenseStatus(expenseId, isActive) {
    // 更新列表中的状态显示
    const expenseElement = document.querySelector(`[data-expense-id="${expenseId}"]`);
    if (expenseElement) {
        const statusElement = expenseElement.querySelector('.status');
        if (statusElement) {
            statusElement.textContent = isActive ? '启用' : '禁用';
            statusElement.className = `status ${isActive ? 'active' : 'inactive'}`;
        }
    }
    
    // 更新全局状态
    if (window.recurringExpensesList) {
        const expense = window.recurringExpensesList.find(e => e.id === expenseId);
        if (expense) {
            expense.is_active = isActive;
        }
    }
}

/**
 * 显示消息
 */
function showMessage(message, type = 'info') {
    // 简单的消息显示，可以根据实际需求进行改进
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    // 3秒后自动消失
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

/**
 * 关闭定期费用模态框
 */
function closeRecurringExpenseModal() {
    const modal = document.getElementById('recurring-expense-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // 重置状态
    resetRecurringExpenseState();
}

/**
 * 打开定期费用模态框
 */
function openRecurringExpenseModal() {
    const modal = document.getElementById('recurring-expense-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * 重置定期费用状态
 */
function resetRecurringExpenseState() {
    recurringExpenseState = {
        isRecurring: false,
        frequency: 'daily',
        startDate: '',
        endDate: '',
    };
    recurringSelectedParticipants.clear();
    recurringSplitMethod = 'equal';
    recurringMemberSplits = [];
    currentEditingRecurringExpense = null;
    
    // 重置表单
    const form = document.getElementById('recurring-expense-form');
    if (form) {
        form.reset();
    }
}

/**
 * 渲染定期费用列表
 */
function renderRecurringExpensesList(expenses) {
    const container = document.getElementById('recurring-expenses-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!expenses || expenses.length === 0) {
        container.innerHTML = '<div class="no-data">暂无定期费用</div>';
        return;
    }
    
    expenses.forEach(expense => {
        const expenseElement = createRecurringExpenseElement(expense);
        container.appendChild(expenseElement);
    });
}

/**
 * 创建定期费用列表项元素
 */
function createRecurringExpenseElement(expense) {
    const div = document.createElement('div');
    div.className = 'recurring-expense-item';
    div.setAttribute('data-expense-id', expense.id);
    
    div.innerHTML = `
        <div class="expense-header">
            <h3>${expense.title}</h3>
            <span class="status ${expense.is_active ? 'active' : 'inactive'}">
                ${expense.is_active ? '启用' : '禁用'}
            </span>
        </div>
        <div class="expense-details">
            <span class="amount">${centsToAmountString(Math.round(expense.amount * 100))}</span>
            <span class="frequency">${getFrequencyLabel(expense.frequency)}</span>
            <span class="payer">付款人: ${expense.payer_name || '未知'}</span>
        </div>
        <div class="expense-actions">
            <button onclick="handleEditRecurringExpense(${expense.id})" class="btn-edit">编辑</button>
            <button onclick="${expense.is_active ? 'handleDisableRecurringExpense' : 'handleEnableRecurringExpense'}(${expense.id})" 
                    class="btn-toggle">${expense.is_active ? '禁用' : '启用'}</button>
            <button onclick="handleDeleteRecurringExpense(${expense.id})" class="btn-delete">删除</button>
        </div>
    `;
    
    return div;
}

/**
 * 获取频率标签
 */
function getFrequencyLabel(frequency) {
    const labels = {
        'daily': '每日',
        'weekly': '每周',
        'monthly': '每月',
        'yearly': '每年'
    };
    return labels[frequency] || frequency;
}

// ==================== 全局函数绑定 ====================

// 将函数绑定到window对象，使其可以在HTML中直接调用
window.handleSaveRecurringExpense = handleSaveRecurringExpense;
window.handleDisableRecurringExpense = handleDisableRecurringExpense;
window.handleEnableRecurringExpense = handleEnableRecurringExpense;
window.handleDeleteRecurringExpense = handleDeleteRecurringExpense;
window.handleEditRecurringExpense = handleEditRecurringExpense;
window.selectFrequency = selectFrequency;
window.setRecurringSplitMethod = setRecurringSplitMethod;
window.refreshRecurringList = refreshRecurringList;
window.openRecurringDetail = openRecurringDetail;
window.initializeRecurringExpenseForm = initializeRecurringExpenseForm;
window.updateRecurringFormMembers = updateRecurringFormMembers;
