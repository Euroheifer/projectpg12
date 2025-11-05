/**
 * 定期费用管理模块
 * 提供定期费用的创建、更新、删除、启用/禁用等功能
 * 基于统一的API基础模块
 */

import { api, Validator, handleAPIError } from './base-api.js';

// 全局状态管理
let recurringExpenseState = {
    isRecurring: false,
    frequency: 'monthly',
    startDate: '',
    endDate: '',
};

let recurringSelectedParticipants = new Set();
let recurringSplitMethod = 'equal';
let recurringMemberSplits = [];
let currentEditingRecurringExpense = null;

/**
 * 创建新定期费用
 * @param {number} groupId - 群组ID
 * @param {Object} expenseData - 费用数据
 * @returns {Promise<Object>} 创建的定期费用信息
 */
export async function createRecurringExpense(groupId, expenseData) {
    try {
        const cleanGroupId = Validator.id(groupId, '群组ID');
        const cleanData = validateRecurringExpenseData(expenseData);

        const result = await api.post(`/groups/${cleanGroupId}/recurring-expenses`, cleanData);
        console.log('定期费用创建成功:', result);
        return result;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 更新定期费用
 * @param {number} expenseId - 费用ID
 * @param {Object} expenseData - 费用数据
 * @returns {Promise<Object>} 更新后的定期费用信息
 */
export async function updateRecurringExpense(expenseId, expenseData) {
    try {
        const cleanExpenseId = Validator.id(expenseId, '费用ID');
        const cleanData = validateRecurringExpenseData(expenseData);

        const result = await api.patch(`/recurring-expenses/${cleanExpenseId}`, cleanData);
        console.log('定期费用更新成功:', result);
        return result;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 删除定期费用
 * @param {number} expenseId - 费用ID
 * @returns {Promise<Object>} 删除结果
 */
export async function deleteRecurringExpense(expenseId) {
    try {
        const cleanExpenseId = Validator.id(expenseId, '费用ID');

        await api.delete(`/recurring-expenses/${cleanExpenseId}`);
        console.log('定期费用删除成功');
        return { success: true };
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 启用定期费用
 * @param {number} expenseId - 费用ID
 * @returns {Promise<Object>} 启用结果
 */
export async function enableRecurringExpense(expenseId) {
    try {
        const cleanExpenseId = Validator.id(expenseId, '费用ID');

        const result = await api.patch(`/recurring-expenses/${cleanExpenseId}/enable`);
        console.log('定期费用启用成功:', result);
        return result;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 禁用定期费用
 * @param {number} expenseId - 费用ID
 * @returns {Promise<Object>} 禁用结果
 */
export async function disableRecurringExpense(expenseId) {
    try {
        const cleanExpenseId = Validator.id(expenseId, '费用ID');

        const result = await api.patch(`/recurring-expenses/${cleanExpenseId}/disable`);
        console.log('定期费用禁用成功:', result);
        return result;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 获取群组的定期费用列表
 * @param {number} groupId - 群组ID
 * @returns {Promise<Array>} 定期费用列表
 */
export async function getGroupRecurringExpenses(groupId) {
    try {
        const cleanGroupId = Validator.id(groupId, '群组ID');

        const expenses = await api.get(`/groups/${cleanGroupId}/recurring-expenses`);
        console.log('获取群组定期费用列表成功:', expenses);
        return expenses;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 获取定期费用详情
 * @param {number} expenseId - 费用ID
 * @returns {Promise<Object>} 定期费用详情
 */
export async function getRecurringExpenseDetail(expenseId) {
    try {
        const cleanExpenseId = Validator.id(expenseId, '费用ID');

        const expense = await api.get(`/recurring-expenses/${cleanExpenseId}`);
        console.log('获取定期费用详情成功:', expense);
        return expense;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 获取定期费用执行历史
 * @param {number} expenseId - 费用ID
 * @returns {Promise<Array>} 执行历史列表
 */
export async function getRecurringExpenseHistory(expenseId) {
    try {
        const cleanExpenseId = Validator.id(expenseId, '费用ID');

        const history = await api.get(`/recurring-expenses/${cleanExpenseId}/history`);
        console.log('获取定期费用历史成功:', history);
        return history;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 验证定期费用数据
 * @param {Object} expenseData - 费用数据
 * @returns {Object} 验证后的数据
 */
function validateRecurringExpenseData(expenseData) {
    const cleanData = {};
    
    // 验证描述
    cleanData.description = Validator.string(expenseData.description, '描述', 255);
    
    // 验证金额（转换为分）
    const amountFloat = Validator.positiveAmount(expenseData.amount, '金额');
    cleanData.amount = Math.round(amountFloat * 100);
    
    // 验证付款人ID
    cleanData.payer_id = Validator.id(expenseData.payer_id, '付款人ID');
    
    // 验证频率
    const frequency = Validator.string(expenseData.frequency, '频率', 20);
    const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validFrequencies.includes(frequency)) {
        throw new ValidationError('频率必须是daily、weekly、monthly或yearly');
    }
    cleanData.frequency = frequency;
    
    // 验证开始日期
    cleanData.start_date = Validator.date(expenseData.start_date, '开始日期');
    
    // 验证结束日期（可选）
    if (expenseData.end_date) {
        cleanData.end_date = Validator.date(expenseData.end_date, '结束日期');
        // 验证结束日期不能早于开始日期
        if (new Date(cleanData.end_date) <= new Date(cleanData.start_date)) {
            throw new ValidationError('结束日期必须晚于开始日期');
        }
    }
    
    // 验证分摊方式
    const splitType = Validator.string(expenseData.split_type || 'equal', '分摊方式', 10);
    if (!['equal', 'exact', 'ratio'].includes(splitType)) {
        throw new ValidationError('分摊方式必须是equal、exact或ratio');
    }
    cleanData.split_type = splitType;
    
    // 验证分摊数据
    if (!Array.isArray(expenseData.splits) || expenseData.splits.length === 0) {
        throw new ValidationError('分摊数据不能为空');
    }
    
    cleanData.splits = expenseData.splits.map(split => {
        return {
            user_id: Validator.id(split.user_id, '用户ID'),
            amount: split.amount ? Validator.positiveAmount(split.amount, '分摊金额') : null
        };
    });
    
    return cleanData;
}

// UI相关函数

/**
 * 初始化定期费用表单
 */
export function initializeRecurringExpenseForm() {
    const today = getTodayDate();
    const startDateInput = document.getElementById('recurring-start-date');
    const endDateInput = document.getElementById('recurring-end-date');
    
    if (startDateInput) {
        startDateInput.value = today;
        recurringExpenseState.startDate = today;
    }
    
    if (endDateInput) {
        endDateInput.value = '';
    }

    // 获取成员列表
    const members = window.groupMembers || [];
    
    const payerSelect = document.getElementById('recurring-payer');
    const participantsContainer = document.querySelector('#recurring-participants-section .grid');

    if (!payerSelect || !participantsContainer) {
        console.error('定期费用表单元素未找到');
        return;
    }

    // 清空选项
    payerSelect.innerHTML = '';
    participantsContainer.innerHTML = '';

    if (members.length === 0) {
        payerSelect.innerHTML = '<option value="">未找到成员</option>';
        return;
    }

    // 填充付款人下拉框
    members.forEach(member => {
        const option = document.createElement('option');
        const memberId = member.user_id || member.id;
        const memberName = member.user?.username || member.username || member.nickname || `用户 ${memberId}`;
        
        option.value = memberId;
        option.textContent = memberName;
        
        // 默认选中当前用户
        if (memberId == window.CURRENT_USER_ID) {
            option.selected = true;
        }
        
        payerSelect.appendChild(option);
    });

    // 初始化参与者复选框
    recurringSelectedParticipants = new Set();
    members.forEach(member => {
        recurringSelectedParticipants.add(member.user_id || member.id);
        
        const memberId = member.user_id || member.id;
        const memberName = member.user?.username || member.username || member.nickname || `用户 ${memberId}`;
        
        const label = document.createElement('label');
        label.className = 'flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-300 shadow-sm';
        
        label.innerHTML = `
            <input 
                type="checkbox" 
                value="${memberId}" 
                class="recurring-participant-checkbox h-5 w-5 rounded text-primary focus:ring-primary" 
                checked
            >
            <span class="font-medium text-gray-800">${memberName}</span>
        `;
        
        // 添加事件监听器
        label.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) {
                recurringSelectedParticipants.add(parseInt(e.target.value));
            } else {
                recurringSelectedParticipants.delete(parseInt(e.target.value));
            }
            updateRecurringSplitCalculation();
        });
        
        participantsContainer.appendChild(label);
    });
    
    // 默认选中月度
    selectFrequency('monthly');
    
    console.log('定期费用表单初始化完成');
}

/**
 * 获取今天的日期字符串
 * @returns {string} YYYY-MM-DD格式的日期
 */
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

/**
 * 选择频率
 * @param {string} frequency - 频率
 */
export function selectFrequency(frequency) {
    const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validFrequencies.includes(frequency)) {
        console.error('无效的频率:', frequency);
        return;
    }
    
    recurringExpenseState.frequency = frequency;
    
    // 更新UI选中状态
    document.querySelectorAll('.frequency-button').forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    
    const activeButton = document.querySelector(`[data-frequency="${frequency}"]`);
    if (activeButton) {
        activeButton.classList.remove('bg-gray-200', 'text-gray-700');
        activeButton.classList.add('active', 'bg-primary', 'text-white');
    }
    
    // 更新预览信息
    updateRecurringPreview();
    
    console.log('选择频率:', frequency);
}

/**
 * 设置定期费用分摊方式
 * @param {string} method - 分摊方式
 */
export function setRecurringSplitMethod(method) {
    const validMethods = ['equal', 'exact', 'ratio'];
    if (!validMethods.includes(method)) {
        console.error('无效的分摊方式:', method);
        return;
    }
    
    recurringSplitMethod = method;
    
    // 更新按钮状态
    document.querySelectorAll('.recurring-split-button').forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    
    const activeButton = document.querySelector(`[data-split-method="${method}"]`);
    if (activeButton) {
        activeButton.classList.remove('bg-gray-200', 'text-gray-700');
        activeButton.classList.add('active', 'bg-primary', 'text-white');
    }
    
    // 重新计算分摊金额
    updateRecurringSplitCalculation();
    
    console.log('设置定期费用分摊方式:', method);
}

/**
 * 更新定期费用分摊计算
 */
export function updateRecurringSplitCalculation() {
    const amountInput = document.getElementById('recurring-amount');
    if (!amountInput || recurringSelectedParticipants.size === 0) return;
    
    const totalAmount = parseFloat(amountInput.value);
    if (isNaN(totalAmount) || totalAmount <= 0) return;
    
    if (recurringSplitMethod === 'equal') {
        // 等额分摊
        const amountPerPerson = totalAmount / recurringSelectedParticipants.size;
        recurringMemberSplits = Array.from(recurringSelectedParticipants).map(userId => ({
            user_id: userId,
            amount: amountPerPerson
        }));
    } else if (recurringSplitMethod === 'exact') {
        // 自定义分摊，需要额外处理
        console.log('自定义分摊功能待实现');
    } else if (recurringSplitMethod === 'ratio') {
        // 比例分摊，需要额外处理
        console.log('比例分摊功能待实现');
    }
    
    // 更新UI显示
    updateSplitCalculationDisplay();
    
    console.log('定期费用分摊计算更新:', recurringMemberSplits);
}

/**
 * 更新分摊计算显示
 */
function updateSplitCalculationDisplay() {
    const container = document.getElementById('recurring-split-details');
    if (!container) return;
    
    container.innerHTML = '';
    
    const members = window.groupMembers || [];
    const amountInput = document.getElementById('recurring-amount');
    const totalAmount = parseFloat(amountInput?.value) || 0;
    
    recurringMemberSplits.forEach(split => {
        const member = members.find(m => (m.user_id || m.id) === split.user_id);
        const memberName = member ? (member.user?.username || member.username || member.nickname) : '未知用户';
        
        const splitItem = document.createElement('div');
        splitItem.className = 'flex justify-between items-center p-2 bg-gray-50 rounded';
        
        splitItem.innerHTML = `
            <span class="text-sm font-medium">${memberName}</span>
            <span class="text-sm text-gray-600">¥${(split.amount || 0).toFixed(2)}</span>
        `;
        
        container.appendChild(splitItem);
    });
    
    // 更新摘要信息
    updateRecurringSummary(totalAmount);
}

/**
 * 更新定期费用摘要
 * @param {number} totalAmount - 总金额
 */
function updateRecurringSummary(totalAmount) {
    const summaryContainer = document.getElementById('recurring-summary');
    if (!summaryContainer) return;
    
    const frequencyLabels = {
        daily: '每日',
        weekly: '每周',
        monthly: '每月',
        yearly: '每年'
    };
    
    const frequency = recurringExpenseState.frequency;
    const label = frequencyLabels[frequency] || frequency;
    
    summaryContainer.innerHTML = `
        <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-semibold text-blue-900 mb-2">定期费用摘要</h4>
            <p class="text-sm text-blue-700">
                <span class="font-medium">频率:</span> ${label}<br>
                <span class="font-medium">总金额:</span> ¥${totalAmount.toFixed(2)}<br>
                <span class="font-medium">参与者:</span> ${recurringSelectedParticipants.size} 人<br>
                <span class="font-medium">预计年度总额:</span> ¥${calculateAnnualAmount(totalAmount, frequency).toFixed(2)}
            </p>
        </div>
    `;
}

/**
 * 计算年度总额
 * @param {number} amount - 单次金额
 * @param {string} frequency - 频率
 * @returns {number} 年度总额
 */
function calculateAnnualAmount(amount, frequency) {
    const multipliers = {
        daily: 365,
        weekly: 52,
        monthly: 12,
        yearly: 1
    };
    
    return amount * (multipliers[frequency] || 1);
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
    const previewContainer = document.getElementById('recurring-preview');
    if (!previewContainer) return;
    
    const startDateInput = document.getElementById('recurring-start-date');
    const endDateInput = document.getElementById('recurring-end-date');
    
    if (!startDateInput) return;
    
    const startDate = startDateInput.value;
    const endDate = endDateInput?.value;
    
    if (!startDate) return;
    
    const previewDates = generatePreviewDates(startDate, endDate, recurringExpenseState.frequency);
    
    previewContainer.innerHTML = `
        <div class="space-y-2">
            <h4 class="font-semibold text-gray-900">执行预览</h4>
            <div class="max-h-32 overflow-y-auto space-y-1">
                ${previewDates.slice(0, 10).map(date => `
                    <div class="text-sm text-gray-600 flex justify-between">
                        <span>${formatDate(date)}</span>
                        <span class="font-medium">¥${(parseFloat(document.getElementById('recurring-amount')?.value) || 0).toFixed(2)}</span>
                    </div>
                `).join('')}
                ${previewDates.length > 10 ? `<div class="text-xs text-gray-500 text-center">...还有 ${previewDates.length - 10} 次</div>` : ''}
            </div>
        </div>
    `;
}

/**
 * 生成预览日期列表
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 * @param {string} frequency - 频率
 * @returns {Array<Date>} 日期列表
 */
function generatePreviewDates(startDate, endDate, frequency) {
    const dates = [];
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
    
    const intervals = {
        daily: 1,
        weekly: 7,
        monthly: 30,
        yearly: 365
    };
    
    const interval = intervals[frequency] || 30;
    const maxIterations = 50; // 防止无限循环
    
    let current = new Date(start);
    let count = 0;
    
    while (current <= end && count < maxIterations) {
        dates.push(new Date(current));
        
        // 根据频率增加日期
        if (frequency === 'monthly') {
            current.setMonth(current.getMonth() + 1);
        } else if (frequency === 'yearly') {
            current.setFullYear(current.getFullYear() + 1);
        } else {
            current.setDate(current.getDate() + interval);
        }
        
        count++;
    }
    
    return dates;
}

/**
 * 格式化日期
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * 处理保存定期费用
 * @param {Event} event - 表单提交事件
 */
export async function handleSaveRecurringExpense(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    try {
        // 显示加载状态
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = '保存中...';
        }
        
        // 读取表单数据
        const description = form.querySelector('#recurring-description')?.value;
        const amount = form.querySelector('#recurring-amount')?.value;
        const payerId = parseInt(form.querySelector('#recurring-payer')?.value);
        const startDate = form.querySelector('#recurring-start-date')?.value;
        const endDate = form.querySelector('#recurring-end-date')?.value;
        
        if (!description || !amount || !payerId || !startDate) {
            throw new Error('请填写所有必需字段');
        }
        
        if (recurringSelectedParticipants.size === 0) {
            throw new Error('请至少选择一个参与者');
        }
        
        // 构建分摊数据
        const splits = Array.from(recurringSelectedParticipants).map(userId => ({
            user_id: userId,
            amount: recurringSplitMethod === 'equal' ? null : 0
        }));
        
        const expenseData = {
            description: description.trim(),
            amount: parseFloat(amount),
            payer_id: payerId,
            frequency: recurringExpenseState.frequency,
            start_date: startDate,
            end_date: endDate || null,
            split_type: recurringSplitMethod,
            splits: splits
        };
        
        // 创建定期费用
        await createRecurringExpense(window.currentGroupId, expenseData);
        
        // 显示成功消息
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('成功', '定期费用创建成功');
        }
        
        // 关闭弹窗并刷新
        if (typeof window.handleRecurringCancel === 'function') {
            window.handleRecurringCancel();
        }
        
        if (typeof window.loadRecurringExpensesList === 'function') {
            await window.loadRecurringExpensesList();
        }
        
    } catch (error) {
        console.error('保存定期费用失败:', error);
        handleAPIError(error);
    } finally {
        // 恢复按钮状态
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = '保存定期费用';
        }
    }
}

/**
 * 打开定期费用详情
 * @param {number} expenseId - 费用ID
 */
export async function openRecurringDetail(expenseId) {
    try {
        const expense = await getRecurringExpenseDetail(expenseId);
        currentEditingRecurringExpense = expense;
        
        const modal = document.getElementById('recurring-detail-modal');
        const title = document.getElementById('recurring-detail-title');
        
        if (modal && title) {
            title.textContent = `定期费用详情 - ${expense.description}`;
            modal.classList.remove('hidden');
            
            // 初始化详情表单
            initializeRecurringDetailForm(expense);
        }
    } catch (error) {
        console.error('打开定期费用详情失败:', error);
        handleAPIError(error);
    }
}

/**
 * 初始化定期费用详情表单
 * @param {Object} expense - 费用数据
 */
export function initializeRecurringDetailForm(expense) {
    const form = document.querySelector('#recurring-detail-modal #recurring-detail-form');
    if (!form) return;
    
    // 填充基础字段
    form.querySelector('#detail-recurring-description').value = expense.description;
    form.querySelector('#detail-recurring-amount').value = (expense.amount / 100).toFixed(2);
    form.querySelector('#detail-recurring-start-date').value = expense.start_date;
    form.querySelector('#detail-recurring-end-date').value = expense.end_date || '';
    
    // 填充付款人下拉框
    const payerSelect = form.querySelector('#detail-recurring-payer');
    payerSelect.innerHTML = '';
    
    (window.groupMembers || []).forEach(member => {
        const option = document.createElement('option');
        const memberId = member.user_id || member.id;
        const memberName = member.user?.username || member.username || member.nickname || `用户 ${memberId}`;
        
        option.value = memberId;
        option.textContent = memberName;
        
        if (memberId == expense.payer_id) {
            option.selected = true;
        }
        
        payerSelect.appendChild(option);
    });
    
    // 设置频率选择
    const frequencySelect = form.querySelector('#detail-recurring-frequency');
    frequencySelect.innerHTML = `
        <option value="daily" ${expense.frequency === 'daily' ? 'selected' : ''}>每日</option>
        <option value="weekly" ${expense.frequency === 'weekly' ? 'selected' : ''}>每周</option>
        <option value="monthly" ${expense.frequency === 'monthly' ? 'selected' : ''}>每月</option>
        <option value="yearly" ${expense.frequency === 'yearly' ? 'selected' : ''}>每年</option>
    `;
    
    // 初始化参与者复选框
    const participantsContainer = form.querySelector('#detail-recurring-participants-container');
    if (participantsContainer) {
        participantsContainer.innerHTML = '';
        
        const currentSplitUserIds = new Set(expense.splits?.map(s => s.user_id) || []);
        
        (window.groupMembers || []).forEach(member => {
            const memberId = member.user_id || member.id;
            const memberName = member.user?.username || member.username || member.nickname || `用户 ${memberId}`;
            const isParticipating = currentSplitUserIds.has(memberId);
            
            const label = document.createElement('label');
            label.className = 'flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-300 shadow-sm';
            
            label.innerHTML = `
                <input 
                    type="checkbox" 
                    value="${memberId}" 
                    class="recurring-participant-checkbox h-5 w-5 rounded text-primary focus:ring-primary" 
                    ${isParticipating ? 'checked' : ''}
                >
                <span class="font-medium text-gray-800">${memberName}</span>
            `;
            
            participantsContainer.appendChild(label);
        });
    }
    
    // 设置分摊方式按钮状态
    const splitEqualBtn = form.querySelector('#detail-recurring-split-equal');
    const splitExactBtn = form.querySelector('#detail-recurring-split-exact');
    
    if (expense.split_type === 'equal') {
        splitEqualBtn?.classList.add('active');
        splitExactBtn?.classList.remove('active');
    } else {
        splitEqualBtn?.classList.remove('active');
        splitExactBtn?.classList.add('active');
    }
    
    // 显示状态信息
    const statusBadge = form.querySelector('#detail-recurring-status');
    if (statusBadge) {
        statusBadge.textContent = expense.status === 'active' ? '激活' : '禁用';
        statusBadge.className = `px-3 py-1 rounded-full text-sm font-medium ${
            expense.status === 'active' ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
        }`;
    }
}

/**
 * 处理启用定期费用
 * @param {number} expenseId - 费用ID
 */
export async function handleEnableRecurringExpense(expenseId) {
    try {
        await enableRecurringExpense(expenseId);
        
        // 显示成功消息
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('成功', '定期费用已启用');
        }
        
        // 刷新详情页面
        if (currentEditingRecurringExpense && currentEditingRecurringExpense.id === expenseId) {
            const updatedExpense = await getRecurringExpenseDetail(expenseId);
            currentEditingRecurringExpense = updatedExpense;
            initializeRecurringDetailForm(updatedExpense);
        }
        
        // 刷新列表
        if (typeof window.loadRecurringExpensesList === 'function') {
            await window.loadRecurringExpensesList();
        }
        
    } catch (error) {
        console.error('启用定期费用失败:', error);
        handleAPIError(error);
    }
}

/**
 * 处理禁用定期费用
 * @param {number} expenseId - 费用ID
 */
export async function handleDisableRecurringExpense(expenseId) {
    try {
        await disableRecurringExpense(expenseId);
        
        // 显示成功消息
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('成功', '定期费用已禁用');
        }
        
        // 刷新详情页面
        if (currentEditingRecurringExpense && currentEditingRecurringExpense.id === expenseId) {
            const updatedExpense = await getRecurringExpenseDetail(expenseId);
            currentEditingRecurringExpense = updatedExpense;
            initializeRecurringDetailForm(updatedExpense);
        }
        
        // 刷新列表
        if (typeof window.loadRecurringExpensesList === 'function') {
            await window.loadRecurringExpensesList();
        }
        
    } catch (error) {
        console.error('禁用定期费用失败:', error);
        handleAPIError(error);
    }
}

/**
 * 处理删除定期费用
 * @param {number} expenseId - 费用ID
 */
export async function handleDeleteRecurringExpense(expenseId) {
    try {
        const confirmed = confirm('确定要删除这个定期费用吗？这将停止所有未来的自动执行。');
        if (!confirmed) return;

        await deleteRecurringExpense(expenseId);
        
        // 显示成功消息
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('成功', '定期费用已删除');
        }
        
        // 关闭弹窗并刷新
        if (typeof window.handleRecurringDetailCancel === 'function') {
            window.handleRecurringDetailCancel();
        }
        
        if (typeof window.loadRecurringExpensesList === 'function') {
            await window.loadRecurringExpensesList();
        }
        
    } catch (error) {
        console.error('删除定期费用失败:', error);
        handleAPIError(error);
    }
}

/**
 * 刷新定期费用列表显示
 * @param {Array} expenses - 费用列表
 */
export function refreshRecurringList(expenses = []) {
    const container = document.getElementById('recurring-expenses-list');
    if (!container) return;

    if (expenses.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>暂无定期费用</p>
            </div>
        `;
        return;
    }

    const frequencyLabels = {
        daily: '每日',
        weekly: '每周',
        monthly: '每月',
        yearly: '每年'
    };

    container.innerHTML = expenses.map(expense => {
        const payerMember = window.groupMembers?.find(m => (m.user_id || m.id) === expense.payer_id);
        const payerName = payerMember ? (payerMember.user?.username || payerMember.username || payerMember.nickname) : '未知用户';
        const amountDisplay = (expense.amount / 100).toFixed(2);
        const frequencyLabel = frequencyLabels[expense.frequency] || expense.frequency;
        
        return `
            <div class="recurring-item flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition duration-150 cursor-pointer"
                 onclick="openRecurringDetail(${expense.id})">
                
                <div class="flex-grow">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                        </div>
                        <div>
                            <p class="font-medium text-gray-800">${expense.description}</p>
                            <p class="text-sm text-gray-500">${frequencyLabel} | 付款人: ${payerName}</p>
                        </div>
                    </div>
                </div>
                
                <div class="flex items-center space-x-4">
                    <span class="px-3 py-1 rounded-full text-sm font-medium ${
                        expense.status === 'active' ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                    }">
                        ${expense.status === 'active' ? '激活' : '禁用'}
                    </span>
                    <span class="text-lg font-semibold text-primary">¥${amountDisplay}</span>
                </div>
            </div>
        `;
    }).join('');
}

// 弹窗管理函数
export function handleRecurringCancel() {
    const modal = document.getElementById('add-recurring-expense-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

export function handleRecurringDetailCancel() {
    const modal = document.getElementById('recurring-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // 清理状态
    currentEditingRecurringExpense = null;
}

// 全局函数暴露
if (typeof window !== 'undefined') {
    // 核心API函数
    window.createRecurringExpense = createRecurringExpense;
    window.updateRecurringExpense = updateRecurringExpense;
    window.deleteRecurringExpense = deleteRecurringExpense;
    window.enableRecurringExpense = enableRecurringExpense;
    window.disableRecurringExpense = disableRecurringExpense;
    window.getGroupRecurringExpenses = getGroupRecurringExpenses;
    window.getRecurringExpenseDetail = getRecurringExpenseDetail;
    window.getRecurringExpenseHistory = getRecurringExpenseHistory;
    
    // UI函数
    window.initializeRecurringExpenseForm = initializeRecurringExpenseForm;
    window.selectFrequency = selectFrequency;
    window.setRecurringSplitMethod = setRecurringSplitMethod;
    window.updateRecurringSplitCalculation = updateRecurringSplitCalculation;
    window.handleRecurringAmountChange = handleRecurringAmountChange;
    window.updateRecurringPreview = updateRecurringPreview;
    window.handleSaveRecurringExpense = handleSaveRecurringExpense;
    window.openRecurringDetail = openRecurringDetail;
    window.initializeRecurringDetailForm = initializeRecurringDetailForm;
    window.handleEnableRecurringExpense = handleEnableRecurringExpense;
    window.handleDisableRecurringExpense = handleDisableRecurringExpense;
    window.handleDeleteRecurringExpense = handleDeleteRecurringExpense;
    window.refreshRecurringList = refreshRecurringList;
    
    // 弹窗管理
    window.handleRecurringCancel = handleRecurringCancel;
    window.handleRecurringDetailCancel = handleRecurringDetailCancel;
    
    console.log('定期费用管理模块已加载，所有函数已暴露到全局');
}

export default {
    createRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    enableRecurringExpense,
    disableRecurringExpense,
    getGroupRecurringExpenses,
    getRecurringExpenseDetail,
    getRecurringExpenseHistory,
    initializeRecurringExpenseForm,
    selectFrequency,
    setRecurringSplitMethod,
    updateRecurringSplitCalculation,
    handleRecurringAmountChange,
    updateRecurringPreview,
    handleSaveRecurringExpense,
    openRecurringDetail,
    initializeRecurringDetailForm,
    handleEnableRecurringExpense,
    handleDisableRecurringExpense,
    handleDeleteRecurringExpense,
    refreshRecurringList,
    handleRecurringCancel,
    handleRecurringDetailCancel
};
