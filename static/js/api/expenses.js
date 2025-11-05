/**
 * 费用管理模块
 * 提供费用的创建、更新、删除、分摊计算等功能
 * 基于统一的API基础模块
 */

import { api, Validator, handleAPIError } from './base-api.js';

// 全局状态管理
let selectedParticipants = new Set();
let currentSplitMethod = 'equal';
let memberSplits = [];
let currentEditingExpense = null;
let currentEditingExpenseId = null;

/**
 * 创建新费用
 * @param {number} groupId - 群组ID
 * @param {Object} expenseData - 费用数据
 * @param {File} receiptFile - 收据文件（可选）
 * @returns {Promise<Object>} 创建的费用信息
 */
export async function createExpense(groupId, expenseData, receiptFile = null) {
    try {
        const cleanGroupId = Validator.id(groupId, '群组ID');
        
        // 验证费用数据
        const cleanData = validateExpenseData(expenseData);
        
        // 创建FormData用于文件上传
        const formData = new FormData();
        
        // 添加基本字段
        formData.append('description', cleanData.description);
        formData.append('amount', cleanData.amount);
        formData.append('payer_id', cleanData.payer_id);
        formData.append('date', cleanData.date);
        formData.append('split_type', cleanData.split_type);
        formData.append('splits', JSON.stringify(cleanData.splits));
        
        // 添加文件
        if (receiptFile) {
            // 验证文件类型和大小
            validateReceiptFile(receiptFile);
            formData.append('image_file', receiptFile);
        }

        // 临时使用form-data的POST请求
        const response = await fetch(`/groups/${cleanGroupId}/expenses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${api.getAuthToken ? api.getAuthToken() : localStorage.getItem('access_token')}`
                // 注意：不设置Content-Type，让浏览器自动设置为multipart/form-data
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || '创建费用失败');
        }

        const newExpense = await response.json();
        console.log('费用创建成功:', newExpense);
        return newExpense;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 更新费用
 * @param {number} groupId - 群组ID
 * @param {number} expenseId - 费用ID
 * @param {Object} expenseData - 费用数据
 * @param {File} receiptFile - 新收据文件（可选）
 * @returns {Promise<Object>} 更新后的费用信息
 */
export async function updateExpense(groupId, expenseId, expenseData, receiptFile = null) {
    try {
        const cleanGroupId = Validator.id(groupId, '群组ID');
        const cleanExpenseId = Validator.id(expenseId, '费用ID');
        
        // 验证费用数据
        const cleanData = validateExpenseData(expenseData);
        
        if (receiptFile) {
            // 如果有新文件上传，使用FormData
            const formData = new FormData();
            formData.append('description', cleanData.description);
            formData.append('amount', cleanData.amount);
            formData.append('payer_id', cleanData.payer_id);
            formData.append('date', cleanData.date);
            formData.append('split_type', cleanData.split_type);
            formData.append('splits', JSON.stringify(cleanData.splits));
            formData.append('image_file', receiptFile);
            
            const response = await fetch(`/groups/${cleanGroupId}/expenses/${cleanExpenseId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${api.getAuthToken ? api.getAuthToken() : localStorage.getItem('access_token')}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '更新费用失败');
            }
            
            return await response.json();
        } else {
            // 无文件时使用JSON
            return await api.patch(`/groups/${cleanGroupId}/expenses/${cleanExpenseId}`, cleanData);
        }
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 删除费用
 * @param {number} groupId - 群组ID
 * @param {number} expenseId - 费用ID
 * @returns {Promise<Object>} 删除结果
 */
export async function deleteExpense(groupId, expenseId) {
    try {
        const cleanGroupId = Validator.id(groupId, '群组ID');
        const cleanExpenseId = Validator.id(expenseId, '费用ID');

        await api.delete(`/groups/${cleanGroupId}/expenses/${cleanExpenseId}`);
        console.log('费用删除成功');
        return { success: true };
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 获取群组费用列表
 * @param {number} groupId - 群组ID
 * @returns {Promise<Array>} 费用列表
 */
export async function getGroupExpenses(groupId) {
    try {
        const cleanGroupId = Validator.id(groupId, '群组ID');

        const expenses = await api.get(`/groups/${cleanGroupId}/expenses`);
        console.log('获取群组费用列表成功:', expenses);
        return expenses;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 获取费用详情
 * @param {number} groupId - 群组ID
 * @param {number} expenseId - 费用ID
 * @returns {Promise<Object>} 费用详情
 */
export async function getExpenseDetail(groupId, expenseId) {
    try {
        const cleanGroupId = Validator.id(groupId, '群组ID');
        const cleanExpenseId = Validator.id(expenseId, '费用ID');

        const expense = await api.get(`/groups/${cleanGroupId}/expenses/${cleanExpenseId}`);
        console.log('获取费用详情成功:', expense);
        return expense;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 验证费用数据
 * @param {Object} expenseData - 费用数据
 * @returns {Object} 验证后的数据
 */
function validateExpenseData(expenseData) {
    const cleanData = {};
    
    // 验证描述
    cleanData.description = Validator.string(expenseData.description, '描述', 255);
    
    // 验证金额（转换为分）
    const amountFloat = Validator.positiveAmount(expenseData.amount, '金额');
    cleanData.amount = Math.round(amountFloat * 100);
    
    // 验证付款人ID
    cleanData.payer_id = Validator.id(expenseData.payer_id, '付款人ID');
    
    // 验证日期
    cleanData.date = Validator.date(expenseData.date, '日期');
    
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

/**
 * 验证收据文件
 * @param {File} file - 文件对象
 */
function validateReceiptFile(file) {
    // 检查文件大小（限制1MB）
    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
        throw new ValidationError('文件大小不能超过1MB');
    }
    
    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        throw new ValidationError('只支持JPEG、PNG、GIF格式的图片');
    }
}

/**
 * 初始化费用表单
 */
export function initializeExpenseForm() {
    const today = getTodayDate();
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = today;
    }

    // 获取成员列表
    const members = window.groupMembers || [];
    
    const payerSelect = document.getElementById('payer');
    const participantsContainer = document.querySelector('#participants-section .grid');

    if (!payerSelect || !participantsContainer) {
        console.error('费用表单元素未找到');
        return;
    }

    // 清空旧选项
    payerSelect.innerHTML = '';
    participantsContainer.innerHTML = '';

    if (members.length === 0) {
        payerSelect.innerHTML = '<option value="">未找到成员</option>';
        return;
    }

    // 填充付款人下拉框
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.user_id || member.id;
        option.textContent = member.user?.username || member.username || member.nickname || `用户 ${member.user_id || member.id}`;
        
        // 默认选中当前用户
        if ((member.user_id || member.id) == window.CURRENT_USER_ID) {
            option.selected = true;
        }
        
        payerSelect.appendChild(option);
    });

    // 初始化参与者复选框
    selectedParticipants = new Set();
    members.forEach(member => {
        selectedParticipants.add(member.user_id || member.id);
        
        const memberId = member.user_id || member.id;
        const memberName = member.user?.username || member.username || member.nickname || `用户 ${memberId}`;
        
        const label = document.createElement('label');
        label.className = 'flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-300 shadow-sm';
        
        label.innerHTML = `
            <input 
                type="checkbox" 
                value="${memberId}" 
                class="participant-checkbox h-5 w-5 rounded text-primary focus:ring-primary" 
                checked
            >
            <span class="font-medium text-gray-800">${memberName}</span>
        `;
        
        // 添加事件监听器
        label.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedParticipants.add(parseInt(e.target.value));
            } else {
                selectedParticipants.delete(parseInt(e.target.value));
            }
            updateSplitCalculation();
        });
        
        participantsContainer.appendChild(label);
    });
    
    console.log('费用表单初始化完成，默认参与者:', selectedParticipants);
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
 * 设置分摊方式
 * @param {string} method - 分摊方式
 */
export function setSplitMethod(method) {
    currentSplitMethod = method;
    updateSplitCalculation();
}

/**
 * 更新分摊计算
 */
export function updateSplitCalculation() {
    const amountInput = document.getElementById('amount');
    if (!amountInput || selectedParticipants.size === 0) return;
    
    const totalAmount = parseFloat(amountInput.value);
    if (isNaN(totalAmount) || totalAmount <= 0) return;
    
    if (currentSplitMethod === 'equal') {
        // 等额分摊
        const amountPerPerson = totalAmount / selectedParticipants.size;
        memberSplits = Array.from(selectedParticipants).map(userId => ({
            user_id: userId,
            amount: amountPerPerson
        }));
    } else if (currentSplitMethod === 'exact') {
        // 自定义分摊，需要额外处理
        console.log('自定义分摊功能待实现');
    }
    
    console.log('分摊计算更新:', memberSplits);
}

/**
 * 处理保存费用
 * @param {Event} event - 表单提交事件
 */
export async function handleSaveExpense(event) {
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
        const description = form.querySelector('#description')?.value;
        const amount = form.querySelector('#amount')?.value;
        const payerId = parseInt(form.querySelector('#payer')?.value);
        const date = form.querySelector('#date')?.value;
        const receiptFile = form.querySelector('#receipt-file')?.files[0];
        
        if (!description || !amount || !payerId || !date) {
            throw new Error('请填写所有必需字段');
        }
        
        if (selectedParticipants.size === 0) {
            throw new Error('请至少选择一个参与者');
        }
        
        // 构建分摊数据
        const splits = Array.from(selectedParticipants).map(userId => ({
            user_id: userId,
            amount: currentSplitMethod === 'equal' ? null : 0 // 等额分摊时amount为null
        }));
        
        const expenseData = {
            description: description.trim(),
            amount: parseFloat(amount),
            payer_id: payerId,
            date: date,
            split_type: currentSplitMethod,
            splits: splits
        };
        
        // 创建费用
        await createExpense(window.currentGroupId, expenseData, receiptFile);
        
        // 显示成功消息
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('成功', '费用创建成功');
        }
        
        // 关闭弹窗并刷新
        if (typeof window.handleCancel === 'function') {
            window.handleCancel();
        }
        
        if (typeof window.loadExpensesList === 'function') {
            await window.loadExpensesList();
        }
        
    } catch (error) {
        console.error('保存费用失败:', error);
        handleAPIError(error);
    } finally {
        // 恢复按钮状态
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = '保存费用';
        }
    }
}

/**
 * 打开费用详情
 * @param {number} expenseId - 费用ID
 */
export async function openExpenseDetail(expenseId) {
    try {
        const expense = window.expensesList?.find(e => e.id == expenseId);
        if (!expense) {
            throw new Error('未找到费用信息');
        }
        
        currentEditingExpenseId = expenseId;
        currentEditingExpense = expense;
        
        const modal = document.getElementById('expense-detail-modal');
        const title = document.getElementById('expense-detail-title');
        
        if (modal && title) {
            title.textContent = `费用详情 - ${expense.description}`;
            modal.classList.remove('hidden');
            
            // 初始化详情表单
            initializeExpenseDetailForm(expense);
        }
    } catch (error) {
        console.error('打开费用详情失败:', error);
        handleAPIError(error);
    }
}

/**
 * 初始化费用详情表单
 * @param {Object} expense - 费用数据
 */
export function initializeExpenseDetailForm(expense) {
    const form = document.querySelector('#expense-detail-modal #expense-detail-form');
    if (!form) return;
    
    // 填充基础字段
    form.querySelector('#detail-description').value = expense.description;
    form.querySelector('#detail-amount').value = (expense.amount / 100).toFixed(2);
    form.querySelector('#detail-date').value = expense.date;
    
    // 填充付款人下拉框
    const payerSelect = form.querySelector('#detail-payer');
    payerSelect.innerHTML = '';
    
    (window.groupMembers || []).forEach(member => {
        const option = document.createElement('option');
        option.value = member.user_id || member.id;
        option.textContent = member.user?.username || member.username || member.nickname || `用户 ${member.user_id || member.id}`;
        
        if ((member.user_id || member.id) == expense.payer_id) {
            option.selected = true;
        }
        
        payerSelect.appendChild(option);
    });
    
    // 初始化参与者复选框
    const participantsContainer = form.querySelector('#detail-participants-container');
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
                    class="participant-checkbox h-5 w-5 rounded text-primary focus:ring-primary" 
                    ${isParticipating ? 'checked' : ''}
                >
                <span class="font-medium text-gray-800">${memberName}</span>
            `;
            
            participantsContainer.appendChild(label);
        });
    }
    
    // 设置分摊方式按钮状态
    const splitEqualBtn = form.querySelector('#detail-split-equal');
    const splitExactBtn = form.querySelector('#detail-split-exact');
    
    if (expense.split_type === 'equal') {
        splitEqualBtn?.classList.add('active');
        splitExactBtn?.classList.remove('active');
    } else {
        splitEqualBtn?.classList.remove('active');
        splitExactBtn?.classList.add('active');
    }
    
    // 显示当前图片
    const previewContainer = form.querySelector('#detail-current-receipt-preview');
    const previewImg = form.querySelector('#detail-current-receipt-img');
    const fileNameDisplay = form.querySelector('#detail-file-name-display');
    
    if (expense.image_url) {
        if (previewImg) previewImg.src = expense.image_url;
        if (previewContainer) previewContainer.classList.remove('hidden');
        if (fileNameDisplay) fileNameDisplay.textContent = '当前收据已上传。点击选择替换';
    } else {
        if (previewContainer) previewContainer.classList.add('hidden');
        if (fileNameDisplay) fileNameDisplay.textContent = '点击上传收据图片 (最大 1MB)';
    }
    
    // 重置文件输入
    const fileInput = form.querySelector('#detail-receipt-file');
    if (fileInput) fileInput.value = '';
}

/**
 * 处理更新费用
 * @param {Event} event - 表单提交事件
 */
export async function handleUpdateExpense(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    try {
        // 显示加载状态
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = '更新中...';
        }
        
        if (!currentEditingExpenseId) {
            throw new Error('未找到正在编辑的费用');
        }
        
        // 读取表单数据
        const description = form.querySelector('#detail-description')?.value;
        const amount = form.querySelector('#detail-amount')?.value;
        const payerId = parseInt(form.querySelector('#detail-payer')?.value);
        const date = form.querySelector('#detail-date')?.value;
        const receiptFile = form.querySelector('#detail-receipt-file')?.files[0];
        
        if (!description || !amount || !payerId || !date) {
            throw new Error('请填写所有必需字段');
        }
        
        // 获取选中的参与者
        const selectedParticipantInputs = form.querySelectorAll('#detail-participants-container input:checked');
        if (selectedParticipantInputs.length === 0) {
            throw new Error('请至少选择一个参与者');
        }
        
        const selectedParticipantIds = Array.from(selectedParticipantInputs).map(input => parseInt(input.value));
        
        // 构建分摊数据
        const splits = selectedParticipantIds.map(userId => ({
            user_id: userId,
            amount: null // 等额分摊
        }));
        
        const expenseData = {
            description: description.trim(),
            amount: parseFloat(amount),
            payer_id: payerId,
            date: date,
            split_type: 'equal',
            splits: splits
        };
        
        // 更新费用
        await updateExpense(window.currentGroupId, currentEditingExpenseId, expenseData, receiptFile);
        
        // 显示成功消息
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('成功', '费用更新成功');
        }
        
        // 关闭弹窗并刷新
        if (typeof window.handleDetailCancel === 'function') {
            window.handleDetailCancel();
        }
        
        if (typeof window.loadExpensesList === 'function') {
            await window.loadExpensesList();
        }
        
    } catch (error) {
        console.error('更新费用失败:', error);
        handleAPIError(error);
    } finally {
        // 恢复按钮状态
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = '更新费用';
        }
    }
}

/**
 * 确认删除费用
 */
export async function confirmDeleteExpense() {
    try {
        if (!currentEditingExpenseId) {
            throw new Error('未找到费用ID');
        }
        
        // 执行删除
        await deleteExpense(window.currentGroupId, currentEditingExpenseId);
        
        // 显示成功消息
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('成功', '费用已删除');
        }
        
        // 关闭弹窗并刷新
        if (typeof window.closeDeleteConfirm === 'function') {
            window.closeDeleteConfirm();
        }
        
        if (typeof window.handleDetailCancel === 'function') {
            window.handleDetailCancel();
        }
        
        if (typeof window.loadExpensesList === 'function') {
            await window.loadExpensesList();
        }
        
    } catch (error) {
        console.error('删除费用失败:', error);
        handleAPIError(error);
    }
}

/**
 * 刷新费用列表显示
 * @param {Array} expenses - 费用列表
 */
export function refreshExpensesList(expenses = []) {
    const container = document.getElementById('expenses-list');
    if (!container) return;

    if (expenses.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>暂无费用记录</p>
            </div>
        `;
        return;
    }

    container.innerHTML = expenses.map(expense => {
        const payerMember = window.groupMembers?.find(m => (m.user_id || m.id) === expense.payer_id);
        const payerName = payerMember ? (payerMember.user?.username || payerMember.username || payerMember.nickname) : '未知用户';
        const isOwnExpense = expense.payer_id == window.CURRENT_USER_ID;
        const amountDisplay = (expense.amount / 100).toFixed(2);
        
        return `
            <div class="expense-item flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition duration-150 cursor-pointer ${isOwnExpense ? 'border-l-4 border-l-primary' : ''}"
                 onclick="openExpenseDetail(${expense.id})">
                
                ${expense.image_url ? `
                    <div class="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 mr-4">
                        <img src="${expense.image_url}" alt="费用收据图片" 
                             class="w-full h-full object-cover">
                    </div>
                ` : `
                    <div class="flex-shrink-0 w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center text-lg font-bold mr-4">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5h6"></path>
                        </svg>
                    </div>
                `}

                <div class="flex-grow">
                    <p class="font-medium text-gray-800 truncate">${expense.description}</p>
                    <p class="text-xs text-gray-500">日期: ${expense.date} | 付款人: ${payerName}</p>
                </div>
                <div class="text-right">
                    <p class="text-lg font-semibold text-primary">$${amountDisplay}</p>
                    <p class="text-xs text-gray-500">${isOwnExpense ? '您支付的' : ''}</p>
                </div>
            </div>
        `;
    }).join('');
}

// 弹窗管理函数
export function handleCancel() {
    const modal = document.getElementById('add-expense-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

export function handleDetailCancel() {
    const modal = document.getElementById('expense-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // 清理状态
    currentEditingExpenseId = null;
    currentEditingExpense = null;
}

export function closeDeleteConfirm() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// 文件名显示更新
export function updateFileNameDisplay(input) {
    const display = document.querySelector('.file-name-display');
    if (display) {
        display.textContent = input.files[0]?.name || '未选择文件';
    }
}

export function updateDetailFileNameDisplay(input) {
    const display = document.querySelector('#detail-file-name-display');
    if (display) {
        display.textContent = input.files[0]?.name || '点击上传收据图片 (最大 1MB)';
    }
}

// 全局函数暴露
if (typeof window !== 'undefined') {
    // 核心API函数
    window.createExpense = createExpense;
    window.updateExpense = updateExpense;
    window.deleteExpense = deleteExpense;
    window.getGroupExpenses = getGroupExpenses;
    window.getExpenseDetail = getExpenseDetail;
    
    // 表单和UI函数
    window.initializeExpenseForm = initializeExpenseForm;
    window.setSplitMethod = setSplitMethod;
    window.updateSplitCalculation = updateSplitCalculation;
    window.handleSaveExpense = handleSaveExpense;
    window.handleUpdateExpense = handleUpdateExpense;
    window.confirmDeleteExpense = confirmDeleteExpense;
    window.openExpenseDetail = openExpenseDetail;
    window.initializeExpenseDetailForm = initializeExpenseDetailForm;
    window.refreshExpensesList = refreshExpensesList;
    
    // 弹窗管理
    window.handleCancel = handleCancel;
    window.handleDetailCancel = handleDetailCancel;
    window.closeDeleteConfirm = closeDeleteConfirm;
    window.updateFileNameDisplay = updateFileNameDisplay;
    window.updateDetailFileNameDisplay = updateDetailFileNameDisplay;
    
    console.log('费用管理模块已加载，所有函数已暴露到全局');
}

export default {
    createExpense,
    updateExpense,
    deleteExpense,
    getGroupExpenses,
    getExpenseDetail,
    initializeExpenseForm,
    setSplitMethod,
    updateSplitCalculation,
    handleSaveExpense,
    handleUpdateExpense,
    confirmDeleteExpense,
    openExpenseDetail,
    initializeExpenseDetailForm,
    refreshExpensesList,
    handleCancel,
    handleDetailCancel,
    closeDeleteConfirm,
    updateFileNameDisplay,
    updateDetailFileNameDisplay
};
