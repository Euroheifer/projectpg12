// payment.js - 支付相关的CRUD操作、表单处理
// 防止缓存版本: 2025.11.06
const JS_CACHE_VERSION = '2025.11.06.001';

import { 
    getTodayDate, 
    getAuthToken, 
    amountToCents, 
    centsToAmountString, 
    showCustomAlert,
    requireAdmin 
} from '../ui/utils.js';

// --- 全局状态 ---
let currentEditingPayment = null;

/**
 * 初始化支付表单
 */
export function initializePaymentForm() {
    console.log('初始化支付表单');

    // 设置默认日期
    const dateInput = document.getElementById('payment-date');
    if (dateInput) {
        dateInput.value = getTodayDate();
    }

    // 获取群组成员列表
    const members = window.groupMembers || [];
    
    // 初始化付款人选择器
    const payerSelect = document.getElementById('payment-payer');
    if (payerSelect) {
        payerSelect.innerHTML = '';
        
        if (members.length === 0) {
            payerSelect.innerHTML = '<option value="">未找到成员</option>';
        } else {
            members.forEach(member => {
                const option = document.createElement('option');
                // 修复：使用正确的成员ID和用户名
                const memberId = member.user_id || member.id;
                option.value = memberId;
                // 修复：使用正确的用户名获取逻辑
                const memberName = member.user?.username || member.username || member.nickname || member.name || `用户 ${memberId}`;
                option.textContent = memberName;
                
                // 设置当前用户为默认付款人
                if (memberId === window.CURRENT_USER_ID) {
                    option.selected = true;
                }
                payerSelect.appendChild(option);
            });
        }
    }

    // 初始化收款人选择器
    const payeeSelect = document.getElementById('payment-payee');
    if (payeeSelect) {
        payeeSelect.innerHTML = '';
        
        if (members.length === 0) {
            payeeSelect.innerHTML = '<option value="">未找到成员</option>';
        } else {
            members.forEach(member => {
                const option = document.createElement('option');
                // 修复：使用正确的成员ID和用户名
                const memberId = member.user_id || member.id;
                option.value = memberId;
                // 修复：使用正确的用户名获取逻辑
                const memberName = member.user?.username || member.username || member.nickname || member.name || `用户 ${memberId}`;
                option.textContent = memberName;
                payeeSelect.appendChild(option);
            });
        }
    }

    // 绑定事件监听器
    bindPaymentFormEvents();
}

/**
 * 绑定支付表单事件监听器
 */
function bindPaymentFormEvents() {
    // 文件上传事件
    const fileInput = document.getElementById('payment-attachment');
    if (fileInput) {
        fileInput.addEventListener('change', updatePaymentFileNameDisplay);
    }

    // 表单提交事件
    const form = document.getElementById('payment-form');
    if (form) {
        form.addEventListener('submit', handleSavePayment);
    }
}

/**
 * 表单验证
 */
function validatePaymentForm(formData) {
    const errors = [];

    // 验证付款人
    if (!formData.get('payer_id')) {
        errors.push('请选择付款人');
    }

    // 验证收款人
    if (!formData.get('payee_id')) {
        errors.push('请选择收款人');
    }

    // 验证付款人和收款人不能相同
    if (formData.get('payer_id') === formData.get('payee_id')) {
        errors.push('付款人和收款人不能是同一个人');
    }

    // 验证金额
    const amount = formData.get('amount');
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        errors.push('请输入有效的金额');
    }

    // 验证日期
    if (!formData.get('date')) {
        errors.push('请选择日期');
    }

    return errors;
}

/**
 * 保存支付 - 修复版本
 */
export async function handleSavePayment(event) {
    event.preventDefault();
    console.log('保存支付');

    const form = document.getElementById('payment-form');
    if (!form) {
        console.error('找不到支付表单');
        showCustomAlert('错误', '支付表单不存在');
        return;
    }

    try {
        // 获取表单数据
        const formData = new FormData(form);
        
        // 表单验证
        const errors = validatePaymentForm(formData);
        if (errors.length > 0) {
            showCustomAlert('表单验证失败', errors.join('<br>'));
            return;
        }

        // 转换金额为分
        const amountInCents = amountToCents(formData.get('amount'));
        formData.set('amount', amountInCents);

        // 获取认证令牌
        const token = getAuthToken();
        if (!token) {
            showCustomAlert('错误', '用户未登录，请重新登录');
            return;
        }

        // 修复：改进费用ID获取逻辑
        let expenseId = window.currentExpenseId;
        
        // 如果没有费用ID，尝试从其他来源获取
        if (!expenseId) {
            // 尝试从URL参数获取
            const urlParams = new URLSearchParams(window.location.search);
            expenseId = urlParams.get('expense_id');
            
            // 尝试从全局变量获取
            if (!expenseId) {
                expenseId = window.selectedExpenseId || window.expenseId;
            }
            
            // 尝试从DOM元素获取
            if (!expenseId) {
                const expenseIdElement = document.getElementById('current-expense-id');
                if (expenseIdElement) {
                    expenseId = expenseIdElement.value;
                }
            }
        }
        
        if (!expenseId) {
            console.error('无法获取费用ID');
            showCustomAlert('错误', '无法确定当前费用，请刷新页面后重试');
            return;
        }

        console.log('保存支付记录，费用ID:', expenseId);

        // API调用
        const response = await fetch(`/expenses/${expenseId}/payments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            let errorMessage = '保存支付失败';

            if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    errorMessage = errorData.detail.map(err => {
                        let field = err.loc && err.loc.length > 1 ? err.loc[err.loc.length - 1] : '未知字段';
                        return `${field}: ${err.msg}`;
                    }).join('<br>');
                } else {
                    errorMessage = JSON.stringify(errorData.detail);
                }
            }

            throw new Error(errorMessage);
        }

        // 成功处理
        showCustomAlert('成功', '支付记录保存成功');
        
        // 关闭弹窗
        const modal = document.getElementById('add-payment-modal');
        if (modal) {
            modal.classList.add('hidden');
        }

        // 重置表单
        form.reset();
        initializePaymentForm();

        // 刷新支付列表
        await refreshPaymentsList();

    } catch (error) {
        console.error('保存支付错误:', error);
        showCustomAlert('错误', error.message || '保存支付时发生未知错误');
    }
}

/**
 * 更新支付 - 修复版本
 */
export async function handleUpdatePayment(event) {
    event.preventDefault();
    console.log('更新支付');

    const form = document.getElementById('payment-detail-form');
    if (!form || !currentEditingPayment) {
        console.error('找不到支付详情表单或没有正在编辑的支付');
        return;
    }

    try {
        // 获取表单数据
        const formData = new FormData(form);
        
        // 表单验证
        const errors = validatePaymentForm(formData);
        if (errors.length > 0) {
            showCustomAlert('表单验证失败', errors.join('<br>'));
            return;
        }

        // 转换金额为分
        const amountInCents = amountToCents(formData.get('amount'));
        formData.set('amount', amountInCents);

        // 获取认证令牌
        const token = getAuthToken();
        if (!token) {
            showCustomAlert('错误', '用户未登录，请重新登录');
            return;
        }

        // 修复：改进费用ID获取逻辑
        let expenseId = window.currentExpenseId;
        
        // 如果没有费用ID，尝试从其他来源获取
        if (!expenseId) {
            const urlParams = new URLSearchParams(window.location.search);
            expenseId = urlParams.get('expense_id');
            
            if (!expenseId) {
                expenseId = window.selectedExpenseId || window.expenseId;
            }
            
            if (!expenseId) {
                const expenseIdElement = document.getElementById('current-expense-id');
                if (expenseIdElement) {
                    expenseId = expenseIdElement.value;
                }
            }
        }
        
        if (!expenseId) {
            console.error('无法获取费用ID');
            showCustomAlert('错误', '无法确定当前费用，请刷新页面后重试');
            return;
        }

        const paymentId = currentEditingPayment.id;
        console.log('更新支付记录:', { expenseId, paymentId });

        // API调用
        const response = await fetch(`/expenses/${expenseId}/payments/${paymentId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            let errorMessage = '更新支付失败';

            if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    errorMessage = errorData.detail.map(err => {
                        let field = err.loc && err.loc.length > 1 ? err.loc[err.loc.length - 1] : '未知字段';
                        return `${field}: ${err.msg}`;
                    }).join('<br>');
                } else {
                    errorMessage = JSON.stringify(errorData.detail);
                }
            }

            throw new Error(errorMessage);
        }

        // 成功处理
        showCustomAlert('成功', '支付记录更新成功');
        
        // 关闭弹窗
        const modal = document.getElementById('payment-detail-modal');
        if (modal) {
            modal.classList.add('hidden');
        }

        // 刷新支付列表
        await refreshPaymentsList();

    } catch (error) {
        console.error('更新支付错误:', error);
        showCustomAlert('错误', error.message || '更新支付时发生未知错误');
    }
}

/**
 * 删除支付 - 修复版本
 */
export async function handleDeletePayment(paymentId) {
    if (!paymentId) {
        showCustomAlert('错误', '支付ID不存在');
        return;
    }

    // 确认删除
    const confirmed = confirm('确定要删除这个支付记录吗？此操作无法撤销。');
    if (!confirmed) return;

    try {
        // 获取认证令牌
        const token = getAuthToken();
        if (!token) {
            showCustomAlert('错误', '用户未登录，请重新登录');
            return;
        }

        // 改进费用ID获取逻辑
        let expenseId = window.currentExpenseId;
        
        if (!expenseId) {
            const urlParams = new URLSearchParams(window.location.search);
            expenseId = urlParams.get('expense_id');
            
            if (!expenseId) {
                expenseId = window.selectedExpenseId || window.expenseId;
            }
            
            if (!expenseId) {
                const expenseIdElement = document.getElementById('current-expense-id');
                if (expenseIdElement) {
                    expenseId = expenseIdElement.value;
                }
            }
        }
        
        if (!expenseId) {
            console.error('无法获取费用ID');
            showCustomAlert('错误', '无法确定当前费用，请刷新页面后重试');
            return;
        }

        console.log('删除支付记录:', { expenseId, paymentId });

        // API调用
        const response = await fetch(`/expenses/${expenseId}/payments/${paymentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            let errorMessage = '删除支付失败';

            if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else {
                    errorMessage = JSON.stringify(errorData.detail);
                }
            }

            throw new Error(errorMessage);
        }

        // 成功处理
        showCustomAlert('成功', '支付记录删除成功');

        // 关闭相关弹窗
        const detailModal = document.getElementById('payment-detail-modal');
        if (detailModal) {
            detailModal.classList.add('hidden');
        }

        // 刷新支付列表
        await refreshPaymentsList();

    } catch (error) {
        console.error('删除支付错误:', error);
        showCustomAlert('错误', error.message || '删除支付时发生未知错误');
    }
}

/**
 * 确认删除支付（用于确认弹窗）
 */
export async function confirmDeletePayment(paymentId) {
    console.log('确认删除支付', paymentId);
    
    if (!paymentId) {
        showCustomAlert('错误', '支付ID不存在');
        return;
    }

    // 调用删除函数
    await handleDeletePayment(paymentId);

    // 关闭确认弹窗
    const confirmModal = document.getElementById('delete-payment-confirm-modal');
    if (confirmModal) {
        confirmModal.classList.add('hidden');
    }
}

/**
 * 填充支付详情表单 - 修复版本
 */
export function populatePaymentDetailForm(payment) {
    console.log('填充支付详情表单', payment);

    if (!payment) return;

    // 获取表单元素
    const form = document.getElementById('payment-detail-form');
    if (!form) {
        console.error('找不到支付详情表单');
        return;
    }

    // 填充基本信息
    const amountField = document.getElementById('payment-detail-amount');
    if (amountField) {
        amountField.value = centsToAmountString(payment.amount);
    }

    const dateField = document.getElementById('payment-detail-date');
    if (dateField) {
        dateField.value = payment.date;
    }

    const descriptionField = document.getElementById('payment-detail-description');
    if (descriptionField) {
        descriptionField.value = payment.description || '';
    }

    // 设置付款人和收款人
    const payerSelect = document.getElementById('payment-detail-payer');
    const payeeSelect = document.getElementById('payment-detail-payee');

    if (payerSelect) {
        payerSelect.value = payment.payer_id;
    }

    if (payeeSelect) {
        payeeSelect.value = payment.payee_id;
    }

    // 设置表单可编辑状态（基于权限）
    const isAdmin = window.IS_CURRENT_USER_ADMIN;
    const isOwner = payment.payer_id === window.CURRENT_USER_ID;

    // 只有管理员或支付人自己可以编辑
    const canEdit = isAdmin || isOwner;

    Array.from(form.elements).forEach(element => {
        if (element.tagName === 'BUTTON') return; // 跳过按钮
        
        if (element.type === 'file') {
            // 文件输入框始终可操作，但显示当前文件状态
            const currentFileDisplay = element.parentElement.querySelector('.current-file');
            if (currentFileDisplay) {
                if (payment.has_file) {
                    currentFileDisplay.textContent = '已有附件';
                    currentFileDisplay.className = 'current-file text-sm text-blue-600';
                } else {
                    currentFileDisplay.textContent = '无附件';
                    currentFileDisplay.className = 'current-file text-sm text-gray-500';
                }
            }
        } else {
            element.disabled = !canEdit;
        }
    });

    // 设置操作按钮可见性
    const editButton = document.getElementById('payment-detail-edit-btn');
    const deleteButton = document.getElementById('payment-detail-delete-btn');
    const saveButton = document.getElementById('payment-detail-save-btn');
    const cancelButton = document.getElementById('payment-detail-cancel-btn');

    if (canEdit) {
        if (editButton) editButton.style.display = 'none';
        if (saveButton) saveButton.style.display = 'inline-block';
        if (cancelButton) cancelButton.style.display = 'inline-block';
        if (deleteButton) deleteButton.style.display = 'inline-block';
    } else {
        if (editButton) editButton.style.display = 'none';
        if (saveButton) saveButton.style.display = 'none';
        if (cancelButton) cancelButton.style.display = 'none';
        if (deleteButton) deleteButton.style.display = 'none';
    }
}

/**
 * 刷新支付列表 - 修复版本
 */
export async function refreshPaymentsList() {
    console.log('刷新支付列表');

    try {
        // 🔴 v12.0修复：费用ID不存在时优雅处理
        const expenseId = window.currentExpenseId;
        if (!expenseId) {
            console.log('费用ID不存在，显示空支付列表');
            updatePaymentsDisplay([]);
            return;
        }

        // 获取认证令牌
        const token = getAuthToken();
        if (!token) {
            console.warn('未找到认证令牌');
            updatePaymentsDisplay([]);
            return;
        }

        console.log('获取支付列表，费用ID:', expenseId);

        // API调用获取支付列表
        const response = await fetch(`/expenses/${expenseId}/payments`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('支付API返回错误状态:', response.status, '显示空列表');
            updatePaymentsDisplay([]);
            return;
        }

        // 获取支付列表数据
        const payments = await response.json();
        window.paymentsList = payments; // 更新全局支付列表

        // 渲染支付列表UI
        renderPaymentsList(payments);

    } catch (error) {
        console.warn('刷新支付列表失败，显示空列表:', error);
        updatePaymentsDisplay([]);
    }
}

// 🔴 v12.0新增：统一更新支付显示的辅助函数
function updatePaymentsDisplay(payments) {
    const container = document.getElementById('payments-list');
    if (container) {
        if (payments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>暂无支付记录</p>
                    <small>点击添加支付记录按钮来创建新的支付</small>
                </div>
            `;
        } else {
            renderPaymentsList(payments);
        }
    }
}

/**
 * 渲染支付列表UI - 修复版本
 */
function renderPaymentsList(payments) {
    const container = document.getElementById('payments-list');
    if (!container) {
        console.error('支付列表容器未找到');
        return;
    }

    // 清空现有内容
    container.innerHTML = '';

    if (!payments || payments.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>暂无支付记录</p>
            </div>
        `;
        return;
    }

    // 渲染每个支付记录
    payments.forEach(payment => {
        const paymentCard = createPaymentCard(payment);
        container.appendChild(paymentCard);
    });
}

/**
 * 创建支付记录卡片 - 修复版本
 */
function createPaymentCard(payment) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow p-4 border border-gray-200';

    // 转换金额显示
    const amountDisplay = centsToAmountString(payment.amount);
    
    // 获取成员信息（修复版本）
    const payerName = getMemberNameById(payment.payer_id);
    const payeeName = getMemberNameById(payment.payee_id);

    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                    <h3 class="font-semibold text-lg text-gray-900">
                        ¥${amountDisplay}
                    </h3>
                    ${payment.has_file ? '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">有附件</span>' : ''}
                </div>
                <p class="text-sm text-gray-600 mb-1">
                    ${payerName} → ${payeeName}
                </p>
                <p class="text-sm text-gray-500">
                    ${payment.date}
                </p>
                ${payment.description ? `<p class="text-sm text-gray-700 mt-2">${payment.description}</p>` : ''}
            </div>
            <div class="flex gap-2">
                <button 
                    class="text-blue-600 hover:text-blue-800 text-sm"
                    onclick="openPaymentDetail(${payment.id})"
                >
                    查看
                </button>
                ${(window.IS_CURRENT_USER_ADMIN || payment.payer_id === window.CURRENT_USER_ID) ? `
                    <button 
                        class="text-red-600 hover:text-red-800 text-sm"
                        onclick="handleDeletePayment(${payment.id})"
                    >
                        删除
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    return card;
}

/**
 * 根据ID获取成员名称 - 修复版本
 */
function getMemberNameById(userId) {
    const members = window.groupMembers || [];
    const member = members.find(m => {
        // 尝试多种ID字段匹配
        return m.user_id === userId || 
               m.id === userId || 
               (m.user && m.user.id === userId);
    });
    
    if (member) {
        // 尝试多种用户名获取方式
        return member.user?.username || 
               member.username || 
               member.nickname || 
               member.name || 
               `用户 ${userId}`;
    }
    
    return `用户 ${userId}`;
}

/**
 * 打开支付详情 - 修复版本
 */
export function openPaymentDetail(paymentId) {
    console.log('打开支付详情', paymentId);

    // 查找支付记录
    const payment = window.paymentsList?.find(p => p.id === paymentId);
    
    if (!payment) {
        showCustomAlert('错误', '未找到支付记录');
        return;
    }

    // 设置当前编辑支付
    currentEditingPayment = payment;

    // 填充详情表单
    populatePaymentDetailForm(payment);

    // 初始化支付详情表单
    initializePaymentDetailForm(payment);

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
    console.log('更新支付文件名显示', input.files[0]?.name);

    const fileNameSpan = document.getElementById('payment-file-name');
    if (fileNameSpan) {
        if (input.files && input.files[0]) {
            fileNameSpan.textContent = `已选择: ${input.files[0].name}`;
            fileNameSpan.className = 'text-sm text-green-600';
        } else {
            fileNameSpan.textContent = '未选择文件';
            fileNameSpan.className = 'text-sm text-gray-500';
        }
    }
}

/**
 * 更新支付详情文件名显示
 */
export function updatePaymentDetailFileNameDisplay(input) {
    console.log('更新支付详情文件名显示', input.files[0]?.name);

    const fileNameSpan = document.getElementById('payment-detail-file-name');
    if (fileNameSpan) {
        if (input.files && input.files[0]) {
            fileNameSpan.textContent = `已选择: ${input.files[0].name}`;
            fileNameSpan.className = 'text-sm text-green-600';
        } else {
            fileNameSpan.textContent = '未选择新文件';
            fileNameSpan.className = 'text-sm text-gray-500';
        }
    }
}

/**
 * 初始化支付详情表单
 */
export function initializePaymentDetailForm(payment) {
    console.log('初始化支付详情表单:', payment);

    // 绑定事件监听器
    bindPaymentDetailFormEvents();
}

/**
 * 绑定支付详情表单事件
 */
function bindPaymentDetailFormEvents() {
    // 详情表单文件上传事件
    const detailFileInput = document.getElementById('payment-detail-attachment');
    if (detailFileInput) {
        detailFileInput.addEventListener('change', updatePaymentDetailFileNameDisplay);
    }

    // 详情表单提交事件
    const detailForm = document.getElementById('payment-detail-form');
    if (detailForm) {
        detailForm.addEventListener('submit', handleUpdatePayment);
    }
}

/**
 * 处理添加新支付
 */
export function handleAddNewPayment() {
    console.log('add new payment');
    
    // 重置当前编辑支付
    currentEditingPayment = null;

    // 初始化表单
    initializePaymentForm();

    // 清空文件选择
    const fileInput = document.getElementById('payment-attachment');
    if (fileInput) {
        fileInput.value = '';
        updatePaymentFileNameDisplay(fileInput);
    }

    // 打开添加支付弹窗
    const modal = document.getElementById('add-payment-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * 处理支付取消
 */
export function handlePaymentCancel() {
    console.log('cancel payment form');

    // 关闭添加支付弹窗
    const modal = document.getElementById('add-payment-modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    // 重置表单
    const form = document.getElementById('payment-form');
    if (form) {
        form.reset();
    }
}

/**
 * 处理支付详情取消
 */
export function handlePaymentDetailCancel() {
    console.log('cancel payment detail');

    // 关闭详情弹窗
    const modal = document.getElementById('payment-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    // 清除当前编辑支付
    currentEditingPayment = null;
}

/**
 * 关闭删除支付确认弹窗
 */
export function closeDeletePaymentConfirm() {
    const modal = document.getElementById('delete-payment-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
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
