/**
 * 支付管理模块
 * 提供支付创建、更新、删除等核心功能
 * 基于统一的API基础模块
 */

import { api, Validator, handleAPIError } from './base-api.js';

// 全局状态管理
let currentEditingPayment = null;

/**
 * 创建新支付
 * @param {number} expenseId - 关联费用ID
 * @param {Object} paymentData - 支付数据
 * @param {File} receiptFile - 收据文件（可选）
 * @returns {Promise<Object>} 创建的支付信息
 */
export async function createPayment(expenseId, paymentData, receiptFile = null) {
    try {
        const cleanExpenseId = Validator.id(expenseId, '费用ID');
        const cleanData = validatePaymentData(paymentData);
        
        if (receiptFile) {
            // 文件上传使用FormData
            validateReceiptFile(receiptFile);
            
            const formData = new FormData();
            formData.append('description', cleanData.description);
            formData.append('amount', cleanData.amount);
            formData.append('payer_id', cleanData.payer_id);
            formData.append('receiver_id', cleanData.receiver_id);
            formData.append('date', cleanData.date);
            formData.append('status', cleanData.status);
            formData.append('image_file', receiptFile);
            
            const response = await fetch(`/expenses/${cleanExpenseId}/payments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${api.getAuthToken ? api.getAuthToken() : localStorage.getItem('access_token')}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '创建支付失败');
            }
            
            return await response.json();
        } else {
            // 使用JSON格式
            return await api.post(`/expenses/${cleanExpenseId}/payments`, cleanData);
        }
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 更新支付
 * @param {number} paymentId - 支付ID
 * @param {Object} paymentData - 支付数据
 * @param {File} receiptFile - 新收据文件（可选）
 * @returns {Promise<Object>} 更新后的支付信息
 */
export async function updatePayment(paymentId, paymentData, receiptFile = null) {
    try {
        const cleanPaymentId = Validator.id(paymentId, '支付ID');
        const cleanData = validatePaymentData(paymentData);
        
        if (receiptFile) {
            // 文件上传使用FormData
            validateReceiptFile(receiptFile);
            
            const formData = new FormData();
            formData.append('description', cleanData.description);
            formData.append('amount', cleanData.amount);
            formData.append('payer_id', cleanData.payer_id);
            formData.append('receiver_id', cleanData.receiver_id);
            formData.append('date', cleanData.date);
            formData.append('status', cleanData.status);
            formData.append('image_file', receiptFile);
            
            const response = await fetch(`/payments/${cleanPaymentId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${api.getAuthToken ? api.getAuthToken() : localStorage.getItem('access_token')}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '更新支付失败');
            }
            
            return await response.json();
        } else {
            // 使用JSON格式
            return await api.patch(`/payments/${cleanPaymentId}`, cleanData);
        }
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 删除支付
 * @param {number} paymentId - 支付ID
 * @returns {Promise<Object>} 删除结果
 */
export async function deletePayment(paymentId) {
    try {
        const cleanPaymentId = Validator.id(paymentId, '支付ID');

        await api.delete(`/payments/${cleanPaymentId}`);
        console.log('支付删除成功');
        return { success: true };
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 获取费用的支付列表
 * @param {number} expenseId - 费用ID
 * @returns {Promise<Array>} 支付列表
 */
export async function getExpensePayments(expenseId) {
    try {
        const cleanExpenseId = Validator.id(expenseId, '费用ID');

        const payments = await api.get(`/expenses/${cleanExpenseId}/payments`);
        console.log('获取费用支付列表成功:', payments);
        return payments;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 获取群组的支付列表
 * @param {number} groupId - 群组ID
 * @returns {Promise<Array>} 支付列表
 */
export async function getGroupPayments(groupId) {
    try {
        const cleanGroupId = Validator.id(groupId, '群组ID');

        const payments = await api.get(`/groups/${cleanGroupId}/payments`);
        console.log('获取群组支付列表成功:', payments);
        return payments;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 获取支付详情
 * @param {number} paymentId - 支付ID
 * @returns {Promise<Object>} 支付详情
 */
export async function getPaymentDetail(paymentId) {
    try {
        const cleanPaymentId = Validator.id(paymentId, '支付ID');

        const payment = await api.get(`/payments/${cleanPaymentId}`);
        console.log('获取支付详情成功:', payment);
        return payment;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 更新支付状态
 * @param {number} paymentId - 支付ID
 * @param {string} status - 新状态
 * @returns {Promise<Object>} 更新结果
 */
export async function updatePaymentStatus(paymentId, status) {
    try {
        const cleanPaymentId = Validator.id(paymentId, '支付ID');
        const cleanStatus = Validator.string(status, '状态', 20);
        
        const validStatuses = ['pending', 'completed', 'cancelled', 'failed'];
        if (!validStatuses.includes(cleanStatus)) {
            throw new ValidationError('支付状态必须是pending、completed、cancelled或failed');
        }

        const result = await api.patch(`/payments/${cleanPaymentId}/status`, {
            status: cleanStatus
        });
        
        console.log('支付状态更新成功:', result);
        return result;
    } catch (error) {
        handleAPIError(error);
        throw error;
    }
}

/**
 * 验证支付数据
 * @param {Object} paymentData - 支付数据
 * @returns {Object} 验证后的数据
 */
function validatePaymentData(paymentData) {
    const cleanData = {};
    
    // 验证描述
    cleanData.description = Validator.string(paymentData.description, '描述', 255);
    
    // 验证金额（转换为分）
    const amountFloat = Validator.positiveAmount(paymentData.amount, '金额');
    cleanData.amount = Math.round(amountFloat * 100);
    
    // 验证付款人ID
    cleanData.payer_id = Validator.id(paymentData.payer_id, '付款人ID');
    
    // 验证收款人ID
    cleanData.receiver_id = Validator.id(paymentData.receiver_id, '收款人ID');
    
    // 验证付款人和收款人不能相同
    if (cleanData.payer_id === cleanData.receiver_id) {
        throw new ValidationError('付款人和收款人不能是同一个人');
    }
    
    // 验证日期
    cleanData.date = Validator.date(paymentData.date, '日期');
    
    // 验证状态
    const status = Validator.string(paymentData.status || 'pending', '状态', 20);
    const validStatuses = ['pending', 'completed', 'cancelled', 'failed'];
    if (!validStatuses.includes(status)) {
        throw new ValidationError('支付状态必须是pending、completed、cancelled或failed');
    }
    cleanData.status = status;
    
    return cleanData;
}

/**
 * 验证收据文件
 * @param {File} file - 文件对象
 */
function validateReceiptFile(file) {
    // 检查文件大小（限制2MB）
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        throw new ValidationError('文件大小不能超过2MB');
    }
    
    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
        throw new ValidationError('只支持JPEG、PNG、GIF格式的图片或PDF文件');
    }
}

// UI相关函数

/**
 * 初始化支付表单
 */
export function initializePaymentForm() {
    const today = getTodayDate();
    const dateInput = document.getElementById('payment-date');
    if (dateInput) {
        dateInput.value = today;
    }

    // 获取成员列表
    const members = window.groupMembers || [];
    
    const payerSelect = document.getElementById('payment-payer');
    const receiverSelect = document.getElementById('payment-receiver');
    const expenseSelect = document.getElementById('payment-expense');

    if (!payerSelect || !receiverSelect || !expenseSelect) {
        console.error('支付表单元素未找到');
        return;
    }

    // 清空选项
    payerSelect.innerHTML = '';
    receiverSelect.innerHTML = '';
    expenseSelect.innerHTML = '';

    if (members.length === 0) {
        payerSelect.innerHTML = '<option value="">未找到成员</option>';
        receiverSelect.innerHTML = '<option value="">未找到成员</option>';
        return;
    }

    // 填充付款人和收款人下拉框
    const populateMemberSelect = (selectElement) => {
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
            
            selectElement.appendChild(option);
        });
    };

    populateMemberSelect(payerSelect);
    populateMemberSelect(receiverSelect);

    // 填充费用下拉框
    const expenses = window.expensesList || [];
    if (expenses.length === 0) {
        expenseSelect.innerHTML = '<option value="">未找到费用</option>';
    } else {
        expenses.forEach(expense => {
            const option = document.createElement('option');
            option.value = expense.id;
            option.textContent = `${expense.description} - ¥${(expense.amount / 100).toFixed(2)}`;
            expenseSelect.appendChild(option);
        });
    }
    
    console.log('支付表单初始化完成');
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
 * 打开支付详情
 * @param {number} paymentId - 支付ID
 */
export async function openPaymentDetail(paymentId) {
    try {
        const payment = await getPaymentDetail(paymentId);
        currentEditingPayment = payment;
        
        const modal = document.getElementById('payment-detail-modal');
        const title = document.getElementById('payment-detail-title');
        
        if (modal && title) {
            title.textContent = `支付详情 - ${payment.description}`;
            modal.classList.remove('hidden');
            
            // 初始化详情表单
            initializePaymentDetailForm(payment);
        }
    } catch (error) {
        console.error('打开支付详情失败:', error);
        handleAPIError(error);
    }
}

/**
 * 初始化支付详情表单
 * @param {Object} payment - 支付数据
 */
export function initializePaymentDetailForm(payment) {
    const form = document.querySelector('#payment-detail-modal #payment-detail-form');
    if (!form) return;
    
    // 填充基础字段
    form.querySelector('#detail-payment-description').value = payment.description;
    form.querySelector('#detail-payment-amount').value = (payment.amount / 100).toFixed(2);
    form.querySelector('#detail-payment-date').value = payment.date;
    
    // 填充付款人下拉框
    const payerSelect = form.querySelector('#detail-payment-payer');
    payerSelect.innerHTML = '';
    
    (window.groupMembers || []).forEach(member => {
        const option = document.createElement('option');
        const memberId = member.user_id || member.id;
        const memberName = member.user?.username || member.username || member.nickname || `用户 ${memberId}`;
        
        option.value = memberId;
        option.textContent = memberName;
        
        if (memberId == payment.payer_id) {
            option.selected = true;
        }
        
        payerSelect.appendChild(option);
    });
    
    // 填充收款人下拉框
    const receiverSelect = form.querySelector('#detail-payment-receiver');
    receiverSelect.innerHTML = '';
    
    (window.groupMembers || []).forEach(member => {
        const option = document.createElement('option');
        const memberId = member.user_id || member.id;
        const memberName = member.user?.username || member.username || member.nickname || `用户 ${memberId}`;
        
        option.value = memberId;
        option.textContent = memberName;
        
        if (memberId == payment.receiver_id) {
            option.selected = true;
        }
        
        receiverSelect.appendChild(option);
    });
    
    // 填充状态选择
    const statusSelect = form.querySelector('#detail-payment-status');
    statusSelect.innerHTML = `
        <option value="pending" ${payment.status === 'pending' ? 'selected' : ''}>待处理</option>
        <option value="completed" ${payment.status === 'completed' ? 'selected' : ''}>已完成</option>
        <option value="cancelled" ${payment.status === 'cancelled' ? 'selected' : ''}>已取消</option>
        <option value="failed" ${payment.status === 'failed' ? 'selected' : ''}>失败</option>
    `;
    
    // 显示当前图片
    const previewContainer = form.querySelector('#detail-payment-receipt-preview');
    const previewImg = form.querySelector('#detail-payment-receipt-img');
    const fileNameDisplay = form.querySelector('#detail-payment-file-name-display');
    
    if (payment.image_url) {
        if (previewImg) previewImg.src = payment.image_url;
        if (previewContainer) previewContainer.classList.remove('hidden');
        if (fileNameDisplay) fileNameDisplay.textContent = '当前收据已上传。点击选择替换';
    } else {
        if (previewContainer) previewContainer.classList.add('hidden');
        if (fileNameDisplay) fileNameDisplay.textContent = '点击上传收据图片 (最大 2MB)';
    }
    
    // 重置文件输入
    const fileInput = form.querySelector('#detail-payment-receipt-file');
    if (fileInput) fileInput.value = '';
}

/**
 * 处理保存支付
 * @param {Event} event - 表单提交事件
 */
export async function handleSavePayment(event) {
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
        const expenseId = parseInt(form.querySelector('#payment-expense')?.value);
        const description = form.querySelector('#payment-description')?.value;
        const amount = form.querySelector('#payment-amount')?.value;
        const payerId = parseInt(form.querySelector('#payment-payer')?.value);
        const receiverId = parseInt(form.querySelector('#payment-receiver')?.value);
        const date = form.querySelector('#payment-date')?.value;
        const receiptFile = form.querySelector('#payment-receipt-file')?.files[0];
        
        if (!expenseId || !description || !amount || !payerId || !receiverId || !date) {
            throw new Error('请填写所有必需字段');
        }
        
        const paymentData = {
            description: description.trim(),
            amount: parseFloat(amount),
            payer_id: payerId,
            receiver_id: receiverId,
            date: date,
            status: 'pending'
        };
        
        // 创建支付
        await createPayment(expenseId, paymentData, receiptFile);
        
        // 显示成功消息
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('成功', '支付创建成功');
        }
        
        // 关闭弹窗并刷新
        if (typeof window.handlePaymentCancel === 'function') {
            window.handlePaymentCancel();
        }
        
        if (typeof window.loadPaymentsList === 'function') {
            await window.loadPaymentsList();
        }
        
    } catch (error) {
        console.error('保存支付失败:', error);
        handleAPIError(error);
    } finally {
        // 恢复按钮状态
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = '保存支付';
        }
    }
}

/**
 * 处理更新支付
 * @param {Event} event - 表单提交事件
 */
export async function handleUpdatePayment(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    try {
        // 显示加载状态
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = '更新中...';
        }
        
        if (!currentEditingPayment) {
            throw new Error('未找到正在编辑的支付');
        }
        
        // 读取表单数据
        const description = form.querySelector('#detail-payment-description')?.value;
        const amount = form.querySelector('#detail-payment-amount')?.value;
        const payerId = parseInt(form.querySelector('#detail-payment-payer')?.value);
        const receiverId = parseInt(form.querySelector('#detail-payment-receiver')?.value);
        const date = form.querySelector('#detail-payment-date')?.value;
        const status = form.querySelector('#detail-payment-status')?.value;
        const receiptFile = form.querySelector('#detail-payment-receipt-file')?.files[0];
        
        if (!description || !amount || !payerId || !receiverId || !date || !status) {
            throw new Error('请填写所有必需字段');
        }
        
        const paymentData = {
            description: description.trim(),
            amount: parseFloat(amount),
            payer_id: payerId,
            receiver_id: receiverId,
            date: date,
            status: status
        };
        
        // 更新支付
        await updatePayment(currentEditingPayment.id, paymentData, receiptFile);
        
        // 显示成功消息
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('成功', '支付更新成功');
        }
        
        // 关闭弹窗并刷新
        if (typeof window.handlePaymentDetailCancel === 'function') {
            window.handlePaymentDetailCancel();
        }
        
        if (typeof window.loadPaymentsList === 'function') {
            await window.loadPaymentsList();
        }
        
    } catch (error) {
        console.error('更新支付失败:', error);
        handleAPIError(error);
    } finally {
        // 恢复按钮状态
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = '更新支付';
        }
    }
}

/**
 * 确认删除支付
 */
export async function confirmDeletePayment() {
    try {
        if (!currentEditingPayment) {
            throw new Error('未找到支付信息');
        }
        
        // 执行删除
        await deletePayment(currentEditingPayment.id);
        
        // 显示成功消息
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('成功', '支付已删除');
        }
        
        // 关闭弹窗并刷新
        if (typeof window.closeDeletePaymentConfirm === 'function') {
            window.closeDeletePaymentConfirm();
        }
        
        if (typeof window.handlePaymentDetailCancel === 'function') {
            window.handlePaymentDetailCancel();
        }
        
        if (typeof window.loadPaymentsList === 'function') {
            await window.loadPaymentsList();
        }
        
    } catch (error) {
        console.error('删除支付失败:', error);
        handleAPIError(error);
    }
}

/**
 * 刷新支付列表显示
 * @param {Array} payments - 支付列表
 */
export function refreshPaymentsList(payments = []) {
    const container = document.getElementById('payments-list');
    if (!container) return;

    if (payments.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>暂无支付记录</p>
            </div>
        `;
        return;
    }

    container.innerHTML = payments.map(payment => {
        const payerMember = window.groupMembers?.find(m => (m.user_id || m.id) === payment.payer_id);
        const receiverMember = window.groupMembers?.find(m => (m.user_id || m.id) === payment.receiver_id);
        const payerName = payerMember ? (payerMember.user?.username || payerMember.username || payerMember.nickname) : '未知用户';
        const receiverName = receiverMember ? (receiverMember.user?.username || receiverMember.username || receiverMember.nickname) : '未知用户';
        const amountDisplay = (payment.amount / 100).toFixed(2);
        
        const getStatusColor = (status) => {
            switch (status) {
                case 'completed': return 'text-green-600 bg-green-100';
                case 'pending': return 'text-yellow-600 bg-yellow-100';
                case 'cancelled': return 'text-gray-600 bg-gray-100';
                case 'failed': return 'text-red-600 bg-red-100';
                default: return 'text-gray-600 bg-gray-100';
            }
        };
        
        const getStatusText = (status) => {
            switch (status) {
                case 'completed': return '已完成';
                case 'pending': return '待处理';
                case 'cancelled': return '已取消';
                case 'failed': return '失败';
                default: return '未知';
            }
        };
        
        return `
            <div class="payment-item flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition duration-150 cursor-pointer"
                 onclick="openPaymentDetail(${payment.id})">
                
                <div class="flex-grow">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                            </svg>
                        </div>
                        <div>
                            <p class="font-medium text-gray-800">${payment.description}</p>
                            <p class="text-sm text-gray-500">${payerName} → ${receiverName} | ${payment.date}</p>
                        </div>
                    </div>
                </div>
                
                <div class="flex items-center space-x-4">
                    <span class="px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.status)}">
                        ${getStatusText(payment.status)}
                    </span>
                    <span class="text-lg font-semibold text-primary">¥${amountDisplay}</span>
                </div>
            </div>
        `;
    }).join('');
}

// 弹窗管理函数
export function handleAddNewPayment() {
    const modal = document.getElementById('add-payment-modal');
    if (modal) {
        modal.classList.remove('hidden');
        initializePaymentForm();
    }
}

export function handlePaymentCancel() {
    const modal = document.getElementById('add-payment-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

export function handlePaymentDetailCancel() {
    const modal = document.getElementById('payment-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // 清理状态
    currentEditingPayment = null;
}

export function closeDeletePaymentConfirm() {
    const modal = document.getElementById('delete-payment-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// 文件名显示更新
export function updatePaymentFileNameDisplay(input) {
    const display = document.querySelector('.payment-file-name-display');
    if (display) {
        display.textContent = input.files[0]?.name || '未选择文件';
    }
}

export function updatePaymentDetailFileNameDisplay(input) {
    const display = document.querySelector('#detail-payment-file-name-display');
    if (display) {
        display.textContent = input.files[0]?.name || '点击上传收据图片 (最大 2MB)';
    }
}

// 全局函数暴露
if (typeof window !== 'undefined') {
    // 核心API函数
    window.createPayment = createPayment;
    window.updatePayment = updatePayment;
    window.deletePayment = deletePayment;
    window.getExpensePayments = getExpensePayments;
    window.getGroupPayments = getGroupPayments;
    window.getPaymentDetail = getPaymentDetail;
    window.updatePaymentStatus = updatePaymentStatus;
    
    // UI函数
    window.initializePaymentForm = initializePaymentForm;
    window.openPaymentDetail = openPaymentDetail;
    window.initializePaymentDetailForm = initializePaymentDetailForm;
    window.handleSavePayment = handleSavePayment;
    window.handleUpdatePayment = handleUpdatePayment;
    window.confirmDeletePayment = confirmDeletePayment;
    window.refreshPaymentsList = refreshPaymentsList;
    
    // 弹窗管理
    window.handleAddNewPayment = handleAddNewPayment;
    window.handlePaymentCancel = handlePaymentCancel;
    window.handlePaymentDetailCancel = handlePaymentDetailCancel;
    window.closeDeletePaymentConfirm = closeDeletePaymentConfirm;
    window.updatePaymentFileNameDisplay = updatePaymentFileNameDisplay;
    window.updatePaymentDetailFileNameDisplay = updatePaymentDetailFileNameDisplay;
    
    console.log('支付管理模块已加载，所有函数已暴露到全局');
}

export default {
    createPayment,
    updatePayment,
    deletePayment,
    getExpensePayments,
    getGroupPayments,
    getPaymentDetail,
    updatePaymentStatus,
    initializePaymentForm,
    openPaymentDetail,
    initializePaymentDetailForm,
    handleSavePayment,
    handleUpdatePayment,
    confirmDeletePayment,
    refreshPaymentsList,
    handleAddNewPayment,
    handlePaymentCancel,
    handlePaymentDetailCancel,
    closeDeletePaymentConfirm,
    updatePaymentFileNameDisplay,
    updatePaymentDetailFileNameDisplay
};
