// payment.js - 支付相关的CRUD操作、表单处理
// 防止缓存版本: 2025.11.10.003 - 修复模块导出
const JS_CACHE_VERSION = '2025.11.10.003';

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
 * 🔴 修复：此函数现在将填充所有下拉菜单
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
    
    // 初始化付款人选择器 ("谁支付了?")
    const payerSelect = document.getElementById('payment-payer');
    if (payerSelect) {
        payerSelect.innerHTML = '';
        
        if (members.length === 0) {
            payerSelect.innerHTML = '<option value="">未找到成员</option>';
        } else {
            payerSelect.innerHTML = '<option value="">请选择付款人</option>'; // 🔴 添加默认提示
            members.forEach(member => {
                const option = document.createElement('option');
                // 🔴 修复：使用正确的成员ID和用户名
                const memberId = member.user_id;
                option.value = memberId;
                const memberName = member.user?.username || member.nickname || `用户 ${memberId}`;
                option.textContent = memberName;
                
                // 设置当前用户为默认付款人
                if (memberId === window.CURRENT_USER_ID) {
                    option.selected = true;
                }
                payerSelect.appendChild(option);
            });
        }
    }

    // 🔴 修复：初始化收款人选择器 ("支付给谁?")
    const payeeSelect = document.getElementById('payment-to'); // 🔴 修复：ID 是 'payment-to'
    if (payeeSelect) {
        payeeSelect.innerHTML = '';
        
        if (members.length === 0) {
            payeeSelect.innerHTML = '<option value="">未找到成员</option>';
        } else {
            payeeSelect.innerHTML = '<option value="">请选择收款人</option>'; // 🔴 添加默认提示
            members.forEach(member => {
                const option = document.createElement('option');
                // 🔴 修复：使用正确的成员ID和用户名
                const memberId = member.user_id;
                option.value = memberId;
                const memberName = member.user?.username || member.nickname || `用户 ${memberId}`;
                option.textContent = memberName;
                payeeSelect.appendChild(option);
            });
        }
    } else {
        console.error('❌ 找不到收款人选择器 #payment-to'); // 🔴 修复：更新错误日志
    }

    // 🔴 修复：填充 "为哪个费用支付"
    const expenseSelect = document.getElementById('payment-for-expense');
    const expenses = window.expensesList || []; // 从全局获取费用列表
    if (expenseSelect) {
        expenseSelect.innerHTML = '<option value="">请选择费用</option>'; // 重置
        if (expenses.length === 0) {
            expenseSelect.innerHTML = '<option value="">暂无费用</option>';
        } else {
            expenses.forEach(expense => {
                const option = document.createElement('option');
                option.value = expense.id;
                // 🔴 修复：使用 centsToAmountString 
                option.textContent = `[¥${centsToAmountString(expense.amount)}] ${expense.description}`;
                expenseSelect.appendChild(option);
            });
        }
        console.log(`✅ 费用下拉菜单已初始化，共 ${expenses.length} 个费用`);
    } else {
        console.error('❌ 找不到费用选择器 #payment-for-expense');
    }


    // 绑定事件监听器
    bindPaymentFormEvents();
}

/**
 * 绑定支付表单事件监听器
 */
function bindPaymentFormEvents() {
    // 文件上传事件
    const fileInput = document.getElementById('payment-receipt-file'); // 🔴 修复：使用正确的 ID
    if (fileInput) {
        fileInput.addEventListener('change', () => updatePaymentFileNameDisplay(fileInput));
    }

    // 表单提交事件 (已在 groups.html 中通过 onsubmit 绑定)
}

/**
 * 表单验证
 */
function validatePaymentForm(formData) {
    const errors = [];

    // 🔴 修复：使用正确的表单字段名
    const payerId = formData.get('payment-payer');
    const payeeId = formData.get('payment-to');

    // 验证付款人
    if (!payerId) {
        errors.push('请选择付款人');
    }

    // 验证收款人
    if (!payeeId) {
        errors.push('请选择收款人');
    }

    // 验证付款人和收款人不能相同
    if (payerId === payeeId) {
        errors.push('付款人和收款人不能是同一个人');
    }

    // 验证金额
    const amount = formData.get('payment-amount');
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        errors.push('请输入有效的金额');
    }

    // 验证日期
    if (!formData.get('payment-date')) {
        errors.push('请选择日期');
    }
    
    // 验证费用
    if (!formData.get('payment-for-expense')) {
        errors.push('请选择一个关联的费用');
    }

    return errors;
}

/**
 * 保存支付 - 修复版本
 */
// 🔴 修复：添加 export
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
        
        // 🔴 修复：创建 FormData 时，HTML input 的 'name' 属性是关键。
        // 我们需要从 'name' 属性转换到后
        const paymentData = {
            description: formData.get('payment-description'),
            amount: amountToCents(formData.get('payment-amount')),
            to_user_id: parseInt(formData.get('payment-to'), 10),
            from_user_id: parseInt(formData.get('payment-payer'), 10),
            date: formData.get('payment-date'),
            // expense_id 将从 URL 获取, image_url 将通过 FormData 添加
        };
        
        // 🔴 修复：使用新的 FormData 进行 API 提交
        const apiFormData = new FormData();
        apiFormData.append('description', paymentData.description);
        apiFormData.append('amount', paymentData.amount);
        apiFormData.append('to_user_id', paymentData.to_user_id);
        apiFormData.append('from_user_id', paymentData.from_user_id);
        // apiFormData.append('date', paymentData.date); // 支付日期由后端设置
        
        const receiptFile = formData.get('payment-receipt-file');
        if (receiptFile && receiptFile.size > 0) {
             apiFormData.append('image_file', receiptFile);
        }

        // 验证（使用 paymentData 验证）
        const errors = [];
        if (!paymentData.from_user_id) errors.push('请选择付款人');
        if (!paymentData.to_user_id) errors.push('请选择收款人');
        if (paymentData.from_user_id === paymentData.to_user_id) errors.push('付款人和收款人不能是同一个人');
        if (paymentData.amount <= 0) errors.push('请输入有效的金额');
        
        const expenseId = formData.get('payment-for-expense'); // 🔴
        if (!expenseId) errors.push('请选择一个关联的费用');
        
        if (errors.length > 0) {
            showCustomAlert('表单验证失败', errors.join('<br>'));
            return;
        }

        // 获取认证令牌
        const token = getAuthToken();
        if (!token) {
            showCustomAlert('错误', '用户未登录，请重新登录');
            return;
        }
        
        console.log('保存支付记录，费用ID:', expenseId);

        // API调用
        const response = await fetch(`/expenses/${expenseId}/payments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // 'Content-Type' 'multipart/form-data' 由浏览器自动设置
            },
            body: apiFormData // 🔴 发送 apiFormData
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
// 🔴 修复：添加 export
export async function handleUpdatePayment(event) {
    event.preventDefault();
    console.log('更新支付');

    const form = document.getElementById('payment-detail-form');
    if (!currentEditingPayment) { // 🔴 修复：检查 currentEditingPayment
        console.error('没有正在编辑的支付');
        return;
    }

    try {
        const formData = new FormData(form);
        
        const paymentData = {
            description: formData.get('payment-detail-description'),
            amount: amountToCents(formData.get('payment-detail-amount')),
            to_user_id: parseInt(formData.get('payment-detail-to'), 10),
            from_user_id: parseInt(formData.get('payment-detail-payer'), 10),
            date: formData.get('payment-detail-date'),
        };

        const apiFormData = new FormData();
        apiFormData.append('description', paymentData.description);
        apiFormData.append('amount', paymentData.amount);
        apiFormData.append('to_user_id', paymentData.to_user_id);
        apiFormData.append('from_user_id', paymentData.from_user_id);
        
        const receiptFile = formData.get('payment-detail-receipt-file');
         if (receiptFile && receiptFile.size > 0) {
             apiFormData.append('image_file', receiptFile);
        }
        
        const errors = [];
        if (!paymentData.from_user_id) errors.push('请选择付款人');
        if (!paymentData.to_user_id) errors.push('请选择收款人');
        if (paymentData.from_user_id === paymentData.to_user_id) errors.push('付款人和收款人不能是同一个人');
        if (paymentData.amount <= 0) errors.push('请输入有效的金额');
        
        const expenseId = formData.get('payment-detail-for-expense'); // 🔴
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

        const paymentId = currentEditingPayment.id;
        console.log('更新支付记录:', { expenseId, paymentId });

        // API调用
        const response = await fetch(`/payments/${paymentId}`, { // 🔴 修复：使用 /payments/{payment_id} 端点
            method: 'PATCH', // 🔴 修复：使用 PATCH
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: apiFormData
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
// 🔴 修复：添加 export
export async function handleDeletePayment(paymentId) {
    if (!paymentId) {
        // 🔴 尝试从 currentEditingPayment 获取
        if (currentEditingPayment) {
            paymentId = currentEditingPayment.id;
        } else {
            showCustomAlert('错误', '支付ID不存在');
            return;
        }
    }

    // 确认删除
    const confirmed = confirm('确定要删除这个支付记录吗？此操作无法撤销。');
    if (!confirmed) return;

    try {
        const token = getAuthToken();
        if (!token) {
            showCustomAlert('错误', '用户未登录，请重新登录');
            return;
        }

        console.log('删除支付记录:', { paymentId });

        // API调用
        const response = await fetch(`/payments/${paymentId}`, { // 🔴 修复：使用 /payments/{payment_id}
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
             // 🔴 修复：后端在 DELETE 成功时返回 204
            if (response.status === 204) {
                 // 这实际上是成功了
            } else {
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
// 🔴 修复：添加 export
export async function confirmDeletePayment() { // 🔴 修复：不需要 paymentId
    console.log('确认删除支付');
    
    if (!currentEditingPayment) { // 🔴 修复：从全局状态获取
        showCustomAlert('错误', '支付ID不存在');
        return;
    }

    // 调用删除函数
    await handleDeletePayment(currentEditingPayment.id);

    // 关闭确认弹窗
    const confirmModal = document.getElementById('delete-payment-confirm-modal');
    if (confirmModal) {
        confirmModal.classList.add('hidden');
    }
}

/**
 * 填充支付详情表单 - 修复版本
 */
// 🔴 修复：添加 export
export function populatePaymentDetailForm(payment) {
    console.log('填充支付详情表单', payment);

    if (!payment) return;

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
        // 🔴 修复：后端 payment_date 是 date, 不是 datetime
        dateField.value = payment.payment_date ? payment.payment_date.split('T')[0] : getTodayDate();
    }

    const descriptionField = document.getElementById('payment-detail-description');
    if (descriptionField) {
        descriptionField.value = payment.description || '';
    }

    // 🔴 修复：填充成员下拉菜单
    const members = window.groupMembers || [];
    const payerSelect = document.getElementById('payment-detail-payer');
    const payeeSelect = document.getElementById('payment-detail-to'); // 🔴 修复：ID

    if (payerSelect) {
        payerSelect.innerHTML = '<option value="">请选择付款人</option>';
        members.forEach(member => {
            const option = document.createElement('option');
            const memberId = member.user_id;
            option.value = memberId;
            option.textContent = member.user?.username || member.nickname || `用户 ${memberId}`;
            if (memberId === payment.from_user_id) option.selected = true; // 🔴 修复：from_user_id
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
            if (memberId === payment.to_user_id) option.selected = true; // 🔴 修复：to_user_id
            payeeSelect.appendChild(option);
        });
    }
    
    // 🔴 修复：填充费用下拉菜单
    const expenseSelect = document.getElementById('payment-detail-for-expense');
    const expenses = window.expensesList || [];
    if (expenseSelect) {
        expenseSelect.innerHTML = '<option value="">请选择费用</option>';
        expenses.forEach(expense => {
            const option = document.createElement('option');
            option.value = expense.id;
            option.textContent = `[¥${centsToAmountString(expense.amount)}] ${expense.description}`;
            if (expense.id === payment.expense_id) option.selected = true; // 🔴 修复：expense_id
            expenseSelect.appendChild(option);
        });
    }


    // 设置表单可编辑状态（基于权限）
    const isAdmin = window.IS_CURRENT_USER_ADMIN;
    // 🔴 修复：支付的创建者是 creator_id
    const isOwner = payment.creator_id === window.CURRENT_USER_ID; 

    // 只有管理员或支付人自己可以编辑
    const canEdit = isAdmin || isOwner;

    Array.from(form.elements).forEach(element => {
        if (element.tagName === 'BUTTON') return; // 跳过按钮
        element.disabled = !canEdit;
    });

    // 🔴 修复：隐藏/显示按钮
    const deleteButton = form.querySelector('button[onclick="handleDeletePayment()"]');
    const saveButton = form.querySelector('button[type="submit"]');

    if (deleteButton) deleteButton.style.display = canEdit ? 'inline-block' : 'none';
    if (saveButton) saveButton.style.display = canEdit ? 'inline-block' : 'none';
}

/**
 * 刷新支付列表 - 修复版本
 */
// 🔴 修复：添加 export
export async function refreshPaymentsList() {
    console.log('刷新支付列表');

    try {
        // 🔴 v12.0修复：费用ID不存在时优雅处理
        // 🔴 修复：支付是按群组获取的，不是按费用
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

        // 🔴 修复：支付API应按群组获取 (假设)
        // 噢，等等，auth.js (line 212) 确实是按群组聚合的。
        // `getGroupPayments` (in auth.js) 会获取所有费用，然后获取每个费用的支付
        const payments = await window.getGroupPayments(groupId);
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
 * 创建支付记录卡片 - 修复版本
 */
function createPaymentCard(payment) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow p-4 border border-gray-200';

    const amountDisplay = centsToAmountString(payment.amount);
    
    // 🔴 修复：使用 getMemberNameById
    const payerName = getMemberNameById(payment.from_user_id);
    const payeeName = getMemberNameById(payment.to_user_id);

    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                    <h3 class="font-semibold text-lg text-gray-900">
                        ¥${amountDisplay}
                    </h3>
                    ${payment.image_url ? '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">有附件</span>' : ''}
                </div>
                <p class="text-sm text-gray-600 mb-1">
                    ${payerName} → ${payeeName}
                </p>
                <p class="text-sm text-gray-500">
                    ${payment.payment_date ? payment.payment_date.split('T')[0] : ''}
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
        // 🔴 修复：使用正确的用户名获取逻辑
        return member.user?.username || 
               member.nickname || 
               `用户 ${userId}`;
    }
    
    return `用户 ${userId}`;
}

/**
 * 打开支付详情 - 修复版本
 */
// 🔴 修复：添加 export
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
// 🔴 修复：添加 export
export function updatePaymentFileNameDisplay(input) {
    console.log('更新支付文件名显示', input.files[0]?.name);

    const fileNameSpan = document.getElementById('payment-file-name-display'); // 🔴 修复 ID
    if (fileNameSpan) {
        if (input.files && input.files[0]) {
            fileNameSpan.textContent = `已选择: ${input.files[0].name}`;
            fileNameSpan.className = 'text-sm text-green-600';
        } else {
            fileNameSpan.textContent = '点击上传支付凭证图片 (最大 1MB)';
            fileNameSpan.className = 'text-gray-700';
        }
    }
}

/**
 * 更新支付详情文件名显示
 */
// 🔴 修复：添加 export
export function updatePaymentDetailFileNameDisplay(input) {
    console.log('更新支付详情文件名显示', input.files[0]?.name);

    const fileNameSpan = document.getElementById('payment-detail-file-name-display');
    if (fileNameSpan) {
        if (input.files && input.files[0]) {
            fileNameSpan.textContent = `已选择新文件: ${input.files[0].name}`;
            fileNameSpan.className = 'text-sm text-green-600';
        } else {
            fileNameSpan.textContent = '点击上传支付凭证图片 (最大 1MB)';
            fileNameSpan.className = 'text-gray-700';
        }
    }
}

/**
 * 初始化支付详情表单
 */
// 🔴 修复：添加 export
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
    const detailFileInput = document.getElementById('payment-detail-receipt-file'); // 🔴 修复 ID
    if (detailFileInput) {
        detailFileInput.addEventListener('change', () => updatePaymentDetailFileNameDisplay(detailFileInput));
    }

    // 详情表单提交事件 (已在 groups.html 中通过 onsubmit 绑定)
}

/**
 * 处理添加新支付
 */
// 🔴 修复：添加 export
export function handleAddNewPayment() {
    console.log('add new payment');
    
    // 重置当前编辑支付
    currentEditingPayment = null;

    // 初始化表单
    initializePaymentForm();

    // 清空文件选择
    const fileInput = document.getElementById('payment-receipt-file'); // 🔴 修复 ID
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
// 🔴 修复：添加 export
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
// 🔴 修复：添加 export
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
// 🔴 修复：添加 export
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

// 🔴 v6.1修复：立即绑定事件监听器（替代内联事件处理器）
initializePaymentEventListeners();

/**
 * 🔴 v6.1修复：初始化支付事件监听器
 * 替代HTML中的内联事件处理器，避免时序问题
 */
function initializePaymentEventListeners() {
    console.log('初始化支付事件监听器...');
    
    // 绑定主要支付表单事件
    bindPaymentFormEvents();
    
    // 绑定支付详情表单事件
    bindPaymentDetailFormEvents();
    
    console.log('支付事件监听器初始化完成');
}

console.log('支付模块已加载，所有函数已暴露到全局');