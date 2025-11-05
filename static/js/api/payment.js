// payment.js - 支付管理模块（完整实现版本）

import { 
    getTodayDate, 
    showCustomAlert, 
    getAuthToken, 
    requireAdmin,
    setupModalCloseHandlers 
} from '../ui/utils.js';

// --- 全局状态 ---
let currentEditingPayment = null;

/**
 * 初始化支付表单
 */
export function initializePaymentForm() {
    console.log('初始化支付表单');
    
    const form = document.getElementById('payment-form');
    if (!form) return;
    
    // 设置默认日期为今天
    const dateInput = document.getElementById('payment-date-input');
    if (dateInput) {
        dateInput.value = getTodayDate();
    }
    
    // 初始化付款人选择器
    populatePayerSelect();
    
    // 初始化收款人选择器
    populateReceiverSelect();
    
    // 初始化费用选择器
    populateExpenseSelect();
    
    // 绑定事件监听器
    bindPaymentFormEvents();
    
    // 绑定文件上传事件
    const fileInput = document.getElementById('payment-receipt-file');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            updatePaymentFileNameDisplay(e.target);
        });
    }
}

/**
 * 填充付款人选择器
 */
function populatePayerSelect() {
    const payerSelect = document.getElementById('payment-payer-select');
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
 * 填充收款人选择器
 */
function populateReceiverSelect() {
    const receiverSelect = document.getElementById('payment-receiver-select');
    if (!receiverSelect || !window.groupMembers) return;
    
    receiverSelect.innerHTML = '<option value="">选择收款人</option>';
    
    window.groupMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.username;
        receiverSelect.appendChild(option);
    });
}

/**
 * 填充费用选择器
 */
function populateExpenseSelect() {
    const expenseSelect = document.getElementById('payment-expense-select');
    if (!expenseSelect || !window.expensesList) return;
    
    expenseSelect.innerHTML = '<option value="">选择相关费用（可选）</option>';
    
    window.expensesList.forEach(expense => {
        const option = document.createElement('option');
        option.value = expense.id;
        option.textContent = `${expense.description} - ¥${(expense.amount / 100).toFixed(2)}`;
        expenseSelect.appendChild(option);
    });
}

/**
 * 绑定支付表单事件
 */
function bindPaymentFormEvents() {
    const form = document.getElementById('payment-form');
    if (!form) return;
    
    // 防止表单默认提交
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // 判断是新建还是更新
        if (currentEditingPayment) {
            await handleUpdatePayment(event);
        } else {
            await handleSavePayment(event);
        }
    });
}

/**
 * 初始化支付详情表单
 */
export function initializePaymentDetailForm(payment) {
    console.log('初始化支付详情表单:', payment);
    populatePaymentDetailForm(payment);
}

/**
 * 保存支付
 */
export async function handleSavePayment(event) {
    try {
        console.log('保存支付');
        
        // 表单验证
        if (!validatePaymentForm()) {
            return;
        }
        
        // 数据组装
        const paymentData = collectPaymentFormData();
        
        // 显示加载状态
        const submitBtn = document.querySelector('#payment-form button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '保存中...';
        submitBtn.disabled = true;
        
        // API调用保存支付
        const token = getAuthToken();
        const response = await fetch(`/api/expenses/${paymentData.expense_id || 0}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(paymentData)
        });
        
        // 恢复按钮状态
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        if (response.ok) {
            showCustomAlert('支付记录创建成功！', false);
            
            // 关闭弹窗
            const modal = document.getElementById('payment-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
            
            // 刷新支付列表
            await refreshPaymentsList();
            
        } else {
            const error = await response.json();
            showCustomAlert('保存失败: ' + (error.detail || '未知错误'));
        }
        
    } catch (error) {
        console.error('保存支付错误:', error);
        showCustomAlert('保存失败: ' + error.message);
    }
}

/**
 * 更新支付
 */
export async function handleUpdatePayment(event) {
    try {
        console.log('更新支付');
        
        // 表单验证
        if (!validatePaymentForm()) {
            return;
        }
        
        // 数据组装
        const paymentData = collectPaymentFormData();
        
        // 显示加载状态
        const submitBtn = document.querySelector('#payment-detail-form button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '更新中...';
        submitBtn.disabled = true;
        
        // API调用更新支付
        const token = getAuthToken();
        const response = await fetch(`/api/payments/${currentEditingPayment.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(paymentData)
        });
        
        // 恢复按钮状态
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        if (response.ok) {
            showCustomAlert('支付记录更新成功！', false);
            
            // 关闭详情弹窗
            const modal = document.getElementById('payment-detail-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
            
            // 重置编辑状态
            currentEditingPayment = null;
            
            // 刷新支付列表
            await refreshPaymentsList();
            
        } else {
            const error = await response.json();
            showCustomAlert('更新失败: ' + (error.detail || '未知错误'));
        }
        
    } catch (error) {
        console.error('更新支付错误:', error);
        showCustomAlert('更新失败: ' + error.message);
    }
}

/**
 * 删除支付
 */
export async function handleDeletePayment() {
    console.log('删除支付');
    
    // 显示确认弹窗
    const confirmModal = document.getElementById('delete-payment-confirm-modal');
    if (confirmModal) {
        confirmModal.classList.remove('hidden');
    }
}

/**
 * 确认删除支付
 */
export async function confirmDeletePayment() {
    try {
        if (!currentEditingPayment) {
            showCustomAlert('没有选择要删除的支付记录');
            return;
        }
        
        // API调用删除支付
        const token = getAuthToken();
        const response = await fetch(`/api/payments/${currentEditingPayment.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showCustomAlert('支付记录删除成功！', false);
            
            // 关闭确认弹窗
            const confirmModal = document.getElementById('delete-payment-confirm-modal');
            if (confirmModal) {
                confirmModal.classList.add('hidden');
            }
            
            // 关闭详情弹窗
            const modal = document.getElementById('payment-detail-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
            
            // 重置编辑状态
            currentEditingPayment = null;
            
            // 刷新支付列表
            await refreshPaymentsList();
            
        } else {
            const error = await response.json();
            showCustomAlert('删除失败: ' + (error.detail || '未知错误'));
        }
        
    } catch (error) {
        console.error('删除支付错误:', error);
        showCustomAlert('删除失败: ' + error.message);
    }
}

/**
 * 填充支付详情表单
 */
export function populatePaymentDetailForm(payment) {
    console.log('填充支付详情表单', payment);
    
    if (!payment) return;
    
    // 设置当前编辑支付
    currentEditingPayment = payment;
    
    // 填充表单字段
    const payerSelect = document.getElementById('payment-detail-payer-select');
    const receiverSelect = document.getElementById('payment-detail-receiver-select');
    const expenseSelect = document.getElementById('payment-detail-expense-select');
    const amountInput = document.getElementById('payment-detail-amount-input');
    const descriptionInput = document.getElementById('payment-detail-description-input');
    const dateInput = document.getElementById('payment-detail-date-input');
    
    if (payerSelect) {
        payerSelect.value = payment.payer_id || '';
    }
    
    if (receiverSelect) {
        receiverSelect.value = payment.receiver_id || '';
    }
    
    if (expenseSelect) {
        expenseSelect.value = payment.expense_id || '';
    }
    
    if (amountInput) {
        amountInput.value = (payment.amount / 100).toFixed(2);
    }
    
    if (descriptionInput) {
        descriptionInput.value = payment.description || '';
    }
    
    if (dateInput) {
        dateInput.value = payment.date || getTodayDate();
    }
    
    // 更新文件显示
    if (payment.receipt_file_name) {
        const fileDisplay = document.getElementById('payment-detail-file-display');
        if (fileDisplay) {
            fileDisplay.textContent = payment.receipt_file_name;
        }
    }
}

/**
 * 验证支付表单
 */
function validatePaymentForm() {
    const payerSelect = document.getElementById('payment-payer-select');
    const receiverSelect = document.getElementById('payment-receiver-select');
    const amountInput = document.getElementById('payment-amount-input');
    const descriptionInput = document.getElementById('payment-description-input');
    
    if (!payerSelect?.value) {
        showCustomAlert('请选择付款人');
        return false;
    }
    
    if (!receiverSelect?.value) {
        showCustomAlert('请选择收款人');
        return false;
    }
    
    if (payerSelect.value === receiverSelect.value) {
        showCustomAlert('付款人和收款人不能是同一个人');
        return false;
    }
    
    const amount = parseFloat(amountInput?.value || '0');
    if (!amount || amount <= 0) {
        showCustomAlert('请输入有效的支付金额');
        return false;
    }
    
    if (!descriptionInput?.value.trim()) {
        showCustomAlert('请输入支付描述');
        return false;
    }
    
    return true;
}

/**
 * 收集支付表单数据
 */
function collectPaymentFormData() {
    const payerSelect = document.getElementById('payment-payer-select');
    const receiverSelect = document.getElementById('payment-receiver-select');
    const expenseSelect = document.getElementById('payment-expense-select');
    const amountInput = document.getElementById('payment-amount-input');
    const descriptionInput = document.getElementById('payment-description-input');
    const dateInput = document.getElementById('payment-date-input');
    const fileInput = document.getElementById('payment-receipt-file');
    
    return {
        payer_id: parseInt(payerSelect?.value || '0'),
        receiver_id: parseInt(receiverSelect?.value || '0'),
        expense_id: parseInt(expenseSelect?.value || '0') || null,
        amount: Math.round(parseFloat(amountInput?.value || '0') * 100), // 转换为分
        description: descriptionInput?.value.trim() || '',
        date: dateInput?.value || getTodayDate(),
        receipt_file: fileInput?.files?.[0] || null
    };
}

/**
 * 刷新支付列表
 */
export function refreshPaymentsList() {
    console.log('刷新支付列表');
    
    // API调用获取支付列表
    fetchPaymentsData().then(payments => {
        // 更新全局支付列表
        window.paymentsList = payments;
        
        // 渲染支付列表UI
        renderPaymentsList(payments);
    }).catch(error => {
        console.error('获取支付列表失败:', error);
        showCustomAlert('获取支付列表失败');
    });
}

/**
 * 获取支付数据
 */
async function fetchPaymentsData() {
    const token = getAuthToken();
    const response = await fetch(`/api/groups/${window.currentGroupId}/payments`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error('获取支付列表失败');
    }
    
    return await response.json();
}

/**
 * 渲染支付列表
 */
function renderPaymentsList(payments) {
    const container = document.getElementById('payments-list-container');
    if (!container) return;
    
    if (!payments || payments.length === 0) {
        container.innerHTML = '<div class="empty-message">暂无支付记录</div>';
        return;
    }
    
    const paymentsHTML = payments.map(payment => {
        const payer = window.groupMembers.find(m => m.id === payment.payer_id);
        const receiver = window.groupMembers.find(m => m.id === payment.receiver_id);
        
        return `
            <div class="payment-item" onclick="openPaymentDetail(${payment.id})">
                <div class="payment-info">
                    <span class="payer-name">${payer?.username || '未知'}</span>
                    <span class="payment-arrow">→</span>
                    <span class="receiver-name">${receiver?.username || '未知'}</span>
                </div>
                <div class="payment-details">
                    <div class="payment-amount">¥${(payment.amount / 100).toFixed(2)}</div>
                    <div class="payment-description">${payment.description}</div>
                    <div class="payment-date">${payment.date}</div>
                </div>
                <div class="payment-status">
                    <span class="status-badge ${payment.status || 'pending'}">${getStatusText(payment.status)}</span>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = paymentsHTML;
}

/**
 * 获取状态文本
 */
function getStatusText(status) {
    const statusMap = {
        pending: '待处理',
        completed: '已完成',
        cancelled: '已取消'
    };
    return statusMap[status] || '未知';
}

/**
 * 打开支付详情
 */
export function openPaymentDetail(paymentId) {
    console.log('打开支付详情', paymentId);
    
    const payment = window.paymentsList.find(p => p.id === paymentId);
    if (!payment) {
        showCustomAlert('支付记录不存在');
        return;
    }
    
    // 设置当前编辑支付
    currentEditingPayment = payment;
    
    // 填充详情表单
    populatePaymentDetailForm(payment);
    
    // 打开详情弹窗
    const modal = document.getElementById('payment-detail-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * 更新支付文件名显示
 */
export function updatePaymentFileNameDisplay(input) {
    const fileDisplay = document.getElementById('payment-file-display');
    if (fileDisplay) {
        if (input.files && input.files[0]) {
            fileDisplay.textContent = `已选择: ${input.files[0].name}`;
        } else {
            fileDisplay.textContent = '未选择文件';
        }
    }
}

/**
 * 更新支付详情文件名显示
 */
export function updatePaymentDetailFileNameDisplay(input) {
    const fileDisplay = document.getElementById('payment-detail-file-display');
    if (fileDisplay) {
        if (input.files && input.files[0]) {
            fileDisplay.textContent = `已选择: ${input.files[0].name}`;
        } else {
            fileDisplay.textContent = '未选择文件';
        }
    }
}

/**
 * 处理添加新支付
 */
export function handleAddNewPayment(payment) {
    console.log('add new payment', payment);
    // 重置编辑状态
    currentEditingPayment = null;
    
    // 初始化表单
    initializePaymentForm();
    
    // 打开创建弹窗
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * 处理支付取消
 */
export function handlePaymentCancel(payment) {
    console.log('cancel', payment);
    
    // 关闭弹窗
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // 重置编辑状态
    currentEditingPayment = null;
}

/**
 * 处理支付详情取消
 */
export function handlePaymentDetailCancel(payment) {
    console.log('cancel', payment);
    
    // 关闭弹窗
    const modal = document.getElementById('payment-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // 重置编辑状态
    currentEditingPayment = null;
}

/**
 * 关闭删除支付确认
 */
export function closeDeletePaymentConfirm(payment) {
    const confirmModal = document.getElementById('delete-payment-confirm-modal');
    if (confirmModal) {
        confirmModal.classList.add('hidden');
    }
}

// 暴露所有支付相关函数到全局 window 对象
window.handleSavePayment = handleSavePayment;
window.handleUpdatePayment = handleUpdatePayment;
window.handleDeletePayment = handleDeletePayment;
window.confirmDeletePayment = confirmDeletePayment;
window.handleAddNewPayment = handleAddNewPayment;
window.handlePaymentCancel = handlePaymentCancel;
window.handlePaymentDetailCancel = handlePaymentDetailCancel;
window.openPaymentDetail = openPaymentDetail;
window.updatePaymentFileNameDisplay = updatePaymentFileNameDisplay;
window.updatePaymentDetailFileNameDisplay = updatePaymentDetailFileNameDisplay;
window.populatePaymentDetailForm = populatePaymentDetailForm;
window.initializePaymentForm = initializePaymentForm;
window.initializePaymentDetailForm = initializePaymentDetailForm;
window.refreshPaymentsList = refreshPaymentsList;
window.closeDeletePaymentConfirm = closeDeletePaymentConfirm;

console.log('支付模块已加载，所有函数已暴露到全局');