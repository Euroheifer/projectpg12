// payment.js - 支付相关的CRUD操作、表单处理
// 防止缓存版本: 2025.11.10.004 (Gemini 修复版)
const JS_CACHE_VERSION = '2025.11.10.004';

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

// =================================================================
// --- 🔴 修复：将辅助函数移动到文件顶部 ---
// =================================================================

/**
 * 辅助函数：根据ID获取成员名称
 */
function getMemberNameById(userId) {
    const members = window.groupMembers || [];
    const member = members.find(m => {
        return m.user_id === userId || 
               m.id === userId || 
               (m.user && m.user.id === userId);
    });
    
    if (member) {
        return member.user?.username || 
               member.nickname || 
               `用户 ${userId}`;
    }
    
    return `用户 ${userId}`;
}

/**
 * 渲染支付列表UI
 */
function renderPaymentsList(payments) {
    const container = document.getElementById('payments-list');
    if (!container) {
        console.error('支付列表容器未找到');
        return;
    }

    container.innerHTML = '';

    if (!payments || payments.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>暂无支付记录</p>
            </div>
        `;
        return;
    }

    payments.forEach(payment => {
        const paymentCard = createPaymentCard(payment);
        container.appendChild(paymentCard);
    });
}

/**
 * 创建支付记录卡片
 */
function createPaymentCard(payment) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow p-4 border border-gray-200';

    const amountDisplay = centsToAmountString(payment.amount);
    
    const payerName = getMemberNameById(payment.from_user_id);
    const payeeName = getMemberNameById(payment.to_user_id);

    // 🔴 修复：确保 payment.payment_date 存在
    const paymentDate = payment.payment_date ? payment.payment_date.split('T')[0] : (payment.created_at ? payment.created_at.split('T')[0] : '未知日期');

    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                    <h3 class="font-semibold text-lg text-gray-900">
                        ¥${amountDisplay}
                    </h3>
                    ${payment.image_url ? `
                        <a href="${payment.image_url}" target="_blank" rel="noopener noreferrer" class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200">
                            有附件 <i class="fa-solid fa-external-link-alt ml-1"></i>
                        </a>` 
                    : ''}
                </div>
                <p class="text-sm text-gray-600 mb-1">
                    ${payerName} → ${payeeName}
                </p>
                <p class="text-sm text-gray-500">
                    ${paymentDate}
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
                ${(window.IS_CURRENT_USER_ADMIN || payment.creator_id === window.CURRENT_USER_ID) ? `
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
 * 统一更新支付显示的辅助函数
 */
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
 * 绑定支付表单事件监听器
 */
function bindPaymentFormEvents() {
    const fileInput = document.getElementById('payment-receipt-file');
    if (fileInput) {
        fileInput.addEventListener('change', () => updatePaymentFileNameDisplay(fileInput));
    }
}

/**
 * 绑定支付详情表单事件
 */
function bindPaymentDetailFormEvents() {
    const detailFileInput = document.getElementById('payment-detail-receipt-file');
    if (detailFileInput) {
        detailFileInput.addEventListener('change', () => updatePaymentDetailFileNameDisplay(detailFileInput));
    }
}

/**
 * 🔴 修复：初始化支付事件监听器
 */
function initializePaymentEventListeners() {
    console.log('初始化支付事件监听器...');
    
    bindPaymentFormEvents();
    bindPaymentDetailFormEvents();
    
    console.log('支付事件监听器初始化完成');
}

// =================================================================
// --- 页面功能函数 ---
// =================================================================

/**
 * 初始化支付表单
 */
export function initializePaymentForm() {
    console.log('初始化支付表单');

    const dateInput = document.getElementById('payment-date');
    if (dateInput) {
        dateInput.value = getTodayDate();
    }

    const members = window.groupMembers || [];
    
    const payerSelect = document.getElementById('payment-payer');
    if (payerSelect) {
        payerSelect.innerHTML = '';
        if (members.length === 0) {
            payerSelect.innerHTML = '<option value="">未找到成员</option>';
        } else {
            payerSelect.innerHTML = '<option value="">请选择付款人</option>';
            members.forEach(member => {
                const option = document.createElement('option');
                const memberId = member.user_id;
                option.value = memberId;
                const memberName = member.user?.username || member.nickname || `用户 ${memberId}`;
                option.textContent = memberName;
                
                if (memberId === window.CURRENT_USER_ID) {
                    option.selected = true;
                }
                payerSelect.appendChild(option);
            });
        }
    }

    const payeeSelect = document.getElementById('payment-to');
    if (payeeSelect) {
        payeeSelect.innerHTML = '';
        if (members.length === 0) {
            payeeSelect.innerHTML = '<option value="">未找到成员</option>';
        } else {
            payeeSelect.innerHTML = '<option value="">请选择收款人</option>';
            members.forEach(member => {
                const option = document.createElement('option');
                const memberId = member.user_id;
                option.value = memberId;
                const memberName = member.user?.username || member.nickname || `用户 ${memberId}`;
                option.textContent = memberName;
                payeeSelect.appendChild(option);
            });
        }
    } else {
        console.error('❌ 找不到收款人选择器 #payment-to');
    }

    const expenseSelect = document.getElementById('payment-for-expense');
    const expenses = window.expensesList || [];
    if (expenseSelect) {
        expenseSelect.innerHTML = '<option value="">请选择费用</option>';
        if (expenses.length === 0) {
            expenseSelect.innerHTML = '<option value="">暂无费用</option>';
        } else {
            expenses.forEach(expense => {
                const option = document.createElement('option');
                option.value = expense.id;
                option.textContent = `[¥${centsToAmountString(expense.amount)}] ${expense.description}`;
                expenseSelect.appendChild(option);
            });
        }
        console.log(`✅ 费用下拉菜单已初始化，共 ${expenses.length} 个费用`);
    } else {
        console.error('❌ 找不到费用选择器 #payment-for-expense');
    }

    // 🔴 修复：绑定事件监听器
    bindPaymentFormEvents();
}

/**
 * 表单验证
 */
function validatePaymentForm(formData) {
    // ... (此函数在 handleSavePayment 中内联实现了) ...
    return [];
}

/**
 * 保存支付 (POST) - 使用 FormData
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
        const formData = new FormData(form);
        
        const paymentData = {
            description: formData.get('payment-description'),
            amount: amountToCents(formData.get('payment-amount')),
            to_user_id: parseInt(formData.get('payment-to'), 10),
            from_user_id: parseInt(formData.get('payment-payer'), 10),
            date: formData.get('payment-date'),
        };
        
        const apiFormData = new FormData();
        apiFormData.append('description', paymentData.description);
        apiFormData.append('amount', paymentData.amount);
        apiFormData.append('to_user_id', paymentData.to_user_id);
        apiFormData.append('from_user_id', paymentData.from_user_id);
        // 'date' is not part of the FormData fields in main.py, it seems
        
        const receiptFile = formData.get('payment-receipt-file');
        if (receiptFile && receiptFile.size > 0) {
             apiFormData.append('image_file', receiptFile);
        }

        // 验证
        const errors = [];
        if (!paymentData.from_user_id) errors.push('请选择付款人');
        if (!paymentData.to_user_id) errors.push('请选择收款人');
        if (paymentData.from_user_id === paymentData.to_user_id) errors.push('付款人和收款人不能是同一个人');
        if (paymentData.amount <= 0) errors.push('请输入有效的金额');
        
        const expenseId = formData.get('payment-for-expense');
        if (!expenseId) errors.push('请选择一个关联的费用');
        
        if (errors.length > 0) {
            showCustomAlert('表单验证失败', errors.join('<br>'));
            return;
        }

        const token = getAuthToken();
        if (!token) {
            showCustomAlert('错误', '用户未登录，请重新登录');
            return;
        }
        
        console.log('保存支付记录，费用ID:', expenseId);

        const response = await fetch(`/expenses/${expenseId}/payments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: apiFormData
        });

        if (!response.ok) {
            const errorData = await response.json();
            let errorMessage = '保存支付失败';
            if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    errorMessage = errorData.detail.map(err => `${err.loc.slice(-1)[0]}: ${err.msg}`).join('<br>');
                } else {
                    errorMessage = JSON.stringify(errorData.detail);
                }
            }
            throw new Error(errorMessage);
        }

        showCustomAlert('成功', '支付记录保存成功');
        
        const modal = document.getElementById('add-payment-modal');
        if (modal) modal.classList.add('hidden');

        form.reset();
        updatePaymentFileNameDisplay(form.querySelector('#payment-receipt-file')); // 🔴 修复：重置文件名
        
        await refreshPaymentsList();

    } catch (error) {
        console.error('保存支付错误:', error);
        showCustomAlert('错误', error.message || '保存支付时发生未知错误');
    }
}

/**
 * 🔴🔴🔴 重大修复 🔴🔴🔴
 * 更新支付 (PATCH) - 必须使用 JSON
 * (原版本错误地使用了 FormData)
 */
export async function handleUpdatePayment(event) {
    event.preventDefault();
    console.log('更新支付 (已修复：使用 JSON)');

    const form = document.getElementById('payment-detail-form');
    if (!currentEditingPayment) {
        console.error('没有正在编辑的支付');
        return;
    }

    try {
        const formData = new FormData(form);
        
        // 1. 构造 JSON 对象 (匹配 schemas.PaymentUpdate)
        const paymentData = {
            description: formData.get('payment-detail-description'),
            amount: amountToCents(formData.get('payment-detail-amount')),
            to_user_id: parseInt(formData.get('payment-detail-to'), 10),
            from_user_id: parseInt(formData.get('payment-detail-payer'), 10),
            // 'date' is not in the schema for update
            // 'image_url' is also not supported via file upload on PATCH
        };
        
        // 🔴 修复：文件上传在 PATCH 时不受支持
        const receiptFile = formData.get('payment-detail-receipt-file');
        if (receiptFile && receiptFile.size > 0) {
             console.warn('此后端口不支持在更新时上传新图片，图片将不会被更新。');
             // 我们可以尝试更新 image_url 字符串，但后端没有逻辑处理它
             // paymentData.image_url = "new_file_pending_upload"; // (不支持)
        }
        
        // 2. 验证
        const errors = [];
        if (!paymentData.from_user_id) errors.push('请选择付款人');
        if (!paymentData.to_user_id) errors.push('请选择收款人');
        if (paymentData.from_user_id === paymentData.to_user_id) errors.push('付款人和收款人不能是同一个人');
        if (paymentData.amount <= 0) errors.push('请输入有效的金额');
        
        // 🔴 修复：支付更新与费用无关，它只更新支付本身
        // const expenseId = formData.get('payment-detail-for-expense'); 
        // if (!expenseId) errors.push('请选择一个关联的费用');
        
        if (errors.length > 0) {
            showCustomAlert('表单验证失败', errors.join('<br>'));
            return;
        }

        const token = getAuthToken();
        if (!token) {
            showCustomAlert('错误', '用户未登录，请重新登录');
            return;
        }

        const paymentId = currentEditingPayment.id;
        console.log('更新支付记录 (JSON):', { paymentId, paymentData });

        // 3. 🔴 修复：API 调用
        const response = await fetch(`/payments/${paymentId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' // 🔴 必须是 JSON
            },
            body: JSON.stringify(paymentData) // 🔴 发送 JSON 字符串
        });

        if (!response.ok) {
            const errorData = await response.json();
            let errorMessage = '更新支付失败';
            if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    errorMessage = errorData.detail.map(err => `${err.loc.slice(-1)[0]}: ${err.msg}`).join('<br>');
                } else {
                    errorMessage = JSON.stringify(errorData.detail);
                }
            }
            throw new Error(errorMessage);
        }

        showCustomAlert('成功', '支付记录更新成功');
        
        const modal = document.getElementById('payment-detail-modal');
        if (modal) modal.classList.add('hidden');

        await refreshPaymentsList();

    } catch (error) {
        console.error('更新支付错误:', error);
        showCustomAlert('错误', error.message || '更新支付时发生未知错误');
    }
}


/**
 * 删除支付
 */
export async function handleDeletePayment(paymentId) {
    if (!paymentId) {
        if (currentEditingPayment) {
            paymentId = currentEditingPayment.id;
        } else {
            showCustomAlert('错误', '支付ID不存在');
            return;
        }
    }

    const confirmed = confirm('确定要删除这个支付记录吗？此操作无法撤销。');
    if (!confirmed) return;

    try {
        const token = getAuthToken();
        if (!token) {
            showCustomAlert('错误', '用户未登录，请重新登录');
            return;
        }

        console.log('删除支付记录:', { paymentId });

        const response = await fetch(`/payments/${paymentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 204) {
             // 成功
        } else if (!response.ok) {
            const errorData = await response.json();
            let errorMessage = '删除支付失败';
            if (errorData.detail) {
                errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
            }
            throw new Error(errorMessage);
        }

        showCustomAlert('成功', '支付记录删除成功');

        const detailModal = document.getElementById('payment-detail-modal');
        if (detailModal) detailModal.classList.add('hidden');

        await refreshPaymentsList();

    } catch (error) {
        console.error('删除支付错误:', error);
        showCustomAlert('错误', error.message || '删除支付时发生未知错误');
    }
}

/**
 * 确认删除支付（用于确认弹窗）
 */
export async function confirmDeletePayment() {
    console.log('确认删除支付');
    
    if (!currentEditingPayment) {
        showCustomAlert('错误', '支付ID不存在');
        return;
    }

    await handleDeletePayment(currentEditingPayment.id);

    const confirmModal = document.getElementById('delete-payment-confirm-modal');
    if (confirmModal) confirmModal.classList.add('hidden');
}

/**
 * 填充支付详情表单
 */
export function populatePaymentDetailForm(payment) {
    console.log('填充支付详情表单', payment);

    if (!payment) return;

    const form = document.getElementById('payment-detail-form');
    if (!form) {
        console.error('找不到支付详情表单');
        return;
    }

    const amountField = document.getElementById('payment-detail-amount');
    if (amountField) amountField.value = centsToAmountString(payment.amount);

    const dateField = document.getElementById('payment-detail-date');
    if (dateField) {
        const paymentDate = payment.payment_date ? payment.payment_date.split('T')[0] : (payment.created_at ? payment.created_at.split('T')[0] : getTodayDate());
        dateField.value = paymentDate;
    }

    const descriptionField = document.getElementById('payment-detail-description');
    if (descriptionField) descriptionField.value = payment.description || '';

    const members = window.groupMembers || [];
    const payerSelect = document.getElementById('payment-detail-payer');
    const payeeSelect = document.getElementById('payment-detail-to');

    if (payerSelect) {
        payerSelect.innerHTML = '<option value="">请选择付款人</option>';
        members.forEach(member => {
            const option = document.createElement('option');
            const memberId = member.user_id;
            option.value = memberId;
            option.textContent = member.user?.username || member.nickname || `用户 ${memberId}`;
            if (memberId === payment.from_user_id) option.selected = true;
            payerSelect.appendChild(option);
        });
    }

    if (payeeSelect) {
        payeeSelect.innerHTML = '<option value="">请选择收款人</option>';
        members.forEach(member => {
            const option = document.createElement('option');
            const memberId = member.user_id;
            option.value = memberId;
            option.textContent = member.user?.username || member.nickname || `用户 ${memberId}`;
            if (memberId === payment.to_user_id) option.selected = true;
            payeeSelect.appendChild(option);
        });
    }
    
    const expenseSelect = document.getElementById('payment-detail-for-expense');
    const expenses = window.expensesList || [];
    if (expenseSelect) {
        expenseSelect.innerHTML = '<option value="">请选择费用</option>';
        expenses.forEach(expense => {
            const option = document.createElement('option');
            option.value = expense.id;
            option.textContent = `[¥${centsToAmountString(expense.amount)}] ${expense.description}`;
            if (expense.id === payment.expense_id) option.selected = true;
            expenseSelect.appendChild(option);
        });
        // 🔴 修复：在详情页中，费用关联是只读的
        expenseSelect.disabled = true;
    }

    // 设置表单可编辑状态（基于权限）
    const isAdmin = window.IS_CURRENT_USER_ADMIN;
    const isOwner = payment.creator_id === window.CURRENT_USER_ID; 
    const canEdit = isAdmin || isOwner;

    Array.from(form.elements).forEach(element => {
        if (element.tagName === 'BUTTON' || element.id === 'payment-detail-for-expense') return;
        element.disabled = !canEdit;
    });

    const deleteButton = form.querySelector('button[onclick*="handleDeletePayment"]'); // 🔴 修复：更灵活的选择器
    const saveButton = form.querySelector('button[type="submit"]');

    if (deleteButton) deleteButton.style.display = canEdit ? 'inline-block' : 'none';
    if (saveButton) saveButton.style.display = canEdit ? 'inline-block' : 'none';
    
    // 🔴 修复：重置文件名显示
    const fileInput = document.getElementById('payment-detail-receipt-file');
    updatePaymentDetailFileNameDisplay(fileInput, payment.image_url);
}

/**
 * 刷新支付列表
 */
export async function refreshPaymentsList() {
    console.log('刷新支付列表');
    try {
        const groupId = window.currentGroupId;
        if (!groupId) {
            console.log('群组ID不存在，显示空支付列表');
            updatePaymentsDisplay([]);
            return;
        }
        const token = getAuthToken();
        if (!token) {
            console.warn('未找到认证令牌');
            updatePaymentsDisplay([]);
            return;
        }
        console.log('获取支付列表，群组ID:', groupId);
        
        // getGroupPayments (in auth.js) 会聚合所有费用的支付
        const payments = await window.getGroupPayments(groupId);
        window.paymentsList = payments; // 更新全局支付列表
        updatePaymentsDisplay(payments); // 🔴 修复：使用辅助函数
    } catch (error) {
        console.warn('刷新支付列表失败，显示空列表:', error);
        updatePaymentsDisplay([]);
    }
}

/**
 * 打开支付详情
 */
export function openPaymentDetail(paymentId) {
    console.log('打开支付详情', paymentId);
    const payment = window.paymentsList?.find(p => p.id === paymentId);
    if (!payment) {
        showCustomAlert('错误', '未找到支付记录');
        return;
    }
    currentEditingPayment = payment;
    populatePaymentDetailForm(payment);
    initializePaymentDetailForm(payment); // 绑定事件
    const modal = document.getElementById('payment-detail-modal');
    if (modal) modal.classList.remove('hidden');
}

/**
 * 更新支付文件名显示
 */
export function updatePaymentFileNameDisplay(input) {
    console.log('更新支付文件名显示', input.files[0]?.name);
    const fileNameDisplay = document.getElementById('payment-file-name-display');
    if (fileNameDisplay) {
        if (input.files && input.files[0]) {
            fileNameDisplay.textContent = `已选择: ${input.files[0].name}`;
            fileNameDisplay.className = 'text-gray-700'; // 🔴 修复：保持一致的颜色
        } else {
            fileNameDisplay.textContent = '点击上传支付凭证图片 (最大 1MB)';
            fileNameDisplay.className = 'text-gray-700';
        }
    }
}

/**
 * 更新支付详情文件名显示
 */
export function updatePaymentDetailFileNameDisplay(input, existingImageUrl = null) {
    console.log('更新支付详情文件名显示', input.files[0]?.name);
    const fileNameDisplay = document.getElementById('payment-detail-file-name-display');
    if (fileNameDisplay) {
        if (input && input.files && input.files[0]) {
            fileNameDisplay.textContent = `已选择新文件: ${input.files[0].name}`;
            fileNameDisplay.className = 'text-sm text-green-600'; // 🔴 修复：使用 text-sm
        } else if (existingImageUrl) {
            // 🔴 修复：显示现有文件
            fileNameDisplay.textContent = `已上传文件 (更新时不支持更改)`;
            fileNameDisplay.className = 'text-sm text-gray-500'; // 🔴 修复：使用 text-sm
        } else {
            fileNameDisplay.textContent = '点击上传支付凭证图片 (最大 1MB)';
            fileNameDisplay.className = 'text-gray-700';
        }
    }
}


/**
 * 初始化支付详情表单
 */
export function initializePaymentDetailForm(payment) {
    console.log('初始化支付详情表单:', payment);
    bindPaymentDetailFormEvents();
}

/**
 * 处理添加新支付
 */
export function handleAddNewPayment() {
    console.log('add new payment');
    currentEditingPayment = null;
    initializePaymentForm();
    
    const fileInput = document.getElementById('payment-receipt-file');
    if (fileInput) {
        fileInput.value = ''; // 🔴 重置文件输入
        updatePaymentFileNameDisplay(fileInput); // 🔴 重置文件名显示
    }
    
    const modal = document.getElementById('add-payment-modal');
    if (modal) modal.classList.remove('hidden');
}

/**
 * 处理支付取消
 */
export function handlePaymentCancel() {
    console.log('cancel payment form');
    const modal = document.getElementById('add-payment-modal');
    if (modal) modal.classList.add('hidden');
    
    const form = document.getElementById('payment-form');
    if (form) form.reset();
}

/**
 * 处理支付详情取消
 */
export function handlePaymentDetailCancel() {
    console.log('cancel payment detail');
    const modal = document.getElementById('payment-detail-modal');
    if (modal) modal.classList.add('hidden');
    currentEditingPayment = null;
}

/**
 * 关闭删除支付确认弹窗
 */
export function closeDeletePaymentConfirm() {
    const modal = document.getElementById('delete-payment-confirm-modal');
    if (modal) modal.classList.add('hidden');
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

// 🔴 修复：立即绑定事件监听器
initializePaymentEventListeners();