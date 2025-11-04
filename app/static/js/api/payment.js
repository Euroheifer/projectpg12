// payment.js - 支付相关的CRUD操作、表单处理 - 修复版本

import { getTodayDate } from '../ui/utils.js';

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

// --- 全局状态 ---
let currentEditingPayment = null;

/**
 * API函数 - 创建支付记录
 */
async function createPayment(expenseId, paymentData) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '创建支付失败');
        }

        return await response.json();
    } catch (error) {
        console.error('创建支付错误:', error);
        throw error;
    }
}

/**
 * API函数 - 获取群组支付列表
 */
async function getGroupPayments(groupId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/groups/${groupId}/payments`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('获取支付列表失败');
        }

        return await response.json();
    } catch (error) {
        console.error('获取支付列表错误:', error);
        throw error;
    }
}

/**
 * API函数 - 更新支付记录
 */
async function updatePayment(paymentId, paymentData) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '更新支付失败');
        }

        return await response.json();
    } catch (error) {
        console.error('更新支付错误:', error);
        throw error;
    }
}

/**
 * API函数 - 删除支付记录
 */
async function deletePaymentAPI(paymentId) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '删除支付失败');
        }

        return { success: true };
    } catch (error) {
        console.error('删除支付错误:', error);
        throw error;
    }
}

/**
 * 初始化支付表单
 */
export function initializePaymentForm() {
    const form = document.getElementById('payment-form');
    if (!form) return;
    
    // 重置表单
    form.reset();
    form.querySelector('input[name="payment_id"]').value = '';
    
    // 设置默认值
    const currentUserSelect = form.querySelector('select[name="from_user_id"]');
    if (currentUserSelect && window.currentUserId) {
        currentUserSelect.value = window.currentUserId;
    }
}

/**
 * 模态框控制函数
 */
export function openPaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.remove('hidden');
        initializePaymentForm();
    }
}

export function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.add('hidden');
        initializePaymentForm();
    }
}

/**
 * 保存支付
 */
export async function handleSavePayment(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        // 构建支付数据
        const paymentData = {
            from_user_id: parseInt(formData.get('from_user_id')),
            to_user_id: parseInt(formData.get('to_user_id')),
            amount: Math.round(parseFloat(formData.get('amount')) * 100),
            description: formData.get('description') || ''
        };

        // 获取expense_id
        const expenseId = formData.get('expense_id') ? parseInt(formData.get('expense_id')) : null;
        if (!expenseId) {
            throw new Error('必须选择关联的费用');
        }

        // 处理图片上传
        const fileInput = form.querySelector('input[type="file"]');
        if (fileInput && fileInput.files[0]) {
            const imageFormData = new FormData();
            imageFormData.append('file', fileInput.files[0]);
            
            const uploadResponse = await fetch('/upload', {
                method: 'POST',
                body: imageFormData
            });
            
            if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
                paymentData.image_url = uploadResult.filename;
            }
        }

        // 🚨 修复：使用正确的参数调用createPayment
        const response = await createPayment(expenseId, paymentData);
        
        if (response) {
            showSuccessMessage('支付记录已保存');
            closePaymentModal();
            refreshPaymentsList();
        }
    } catch (error) {
        console.error('保存支付错误:', error);
        showErrorMessage('保存支付失败: ' + error.message);
    }
}

/**
 * 更新支付
 */
export async function handleUpdatePayment(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const paymentId = parseInt(formData.get('payment_id'));
    
    try {
        const paymentData = {
            from_user_id: parseInt(formData.get('from_user_id')),
            to_user_id: parseInt(formData.get('to_user_id')),
            amount_cents: Math.round(parseFloat(formData.get('amount')) * 100),
            description: formData.get('description') || '',
            expense_id: formData.get('expense_id') ? parseInt(formData.get('expense_id')) : null
        };

        // 处理图片上传
        const fileInput = form.querySelector('input[type="file"]');
        if (fileInput && fileInput.files[0]) {
            const imageFormData = new FormData();
            imageFormData.append('file', fileInput.files[0]);
            
            const uploadResponse = await fetch('/upload', {
                method: 'POST',
                body: imageFormData
            });
            
            if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
                paymentData.image_url = uploadResult.filename;
            }
        }

        const response = await updatePayment(paymentId, paymentData);
        
        if (response) {
            showSuccessMessage('支付记录已更新');
            closePaymentModal();
            refreshPaymentsList();
        }
    } catch (error) {
        console.error('更新支付错误:', error);
        showErrorMessage('更新支付失败: ' + error.message);
    }
}

/**
 * 删除支付
 */
export async function handleDeletePayment() {
    const modal = document.getElementById('delete-payment-confirm-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * 确认删除支付
 */
export async function confirmDeletePayment() {
    if (!currentEditingPayment) return;
    
    try {
        await deletePaymentAPI(currentEditingPayment.id);
        
        const modal = document.getElementById('delete-payment-confirm-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        showSuccessMessage('支付记录已删除');
        refreshPaymentsList();
    } catch (error) {
        console.error('删除支付错误:', error);
        showErrorMessage('删除支付失败: ' + error.message);
    }
}

/**
 * 填充支付详情表单
 */
export function populatePaymentDetailForm(payment) {
    const form = document.getElementById('payment-form');
    if (!form) return;
    
    form.querySelector('input[name="payment_id"]').value = payment.id;
    form.querySelector('select[name="from_user_id"]').value = payment.from_user_id;
    form.querySelector('select[name="to_user_id"]').value = payment.to_user_id;
    form.querySelector('input[name="amount"]').value = (payment.amount_cents / 100).toFixed(2);
    form.querySelector('textarea[name="description"]').value = payment.description || '';
    
    if (payment.expense_id) {
        form.querySelector('select[name="expense_id"]').value = payment.expense_id;
    }
    
    // 更新文件显示
    updatePaymentFileNameDisplay(payment.image_url);
}

/**
 * 刷新支付列表
 */
export function refreshPaymentsList() {
    const container = document.getElementById('payments-list');
    if (!container) return;
    
    if (!window.paymentsList || window.paymentsList.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">暂无支付记录</p>';
        return;
    }
    
    container.innerHTML = window.paymentsList.map(payment => {
        const fromUser = window.groupMembers?.find(m => m.id === payment.from_user_id);
        const toUser = window.groupMembers?.find(m => m.id === payment.to_user_id);
        const expense = window.expensesList?.find(e => e.id === payment.expense_id);
        
        return `
            <div class="payment-item border rounded p-4 mb-2 bg-white" data-payment-id="${payment.id}">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                            <span class="font-semibold text-blue-600">${fromUser?.name || '未知用户'}</span>
                            <span class="text-gray-400">→</span>
                            <span class="font-semibold text-green-600">${toUser?.name || '未知用户'}</span>
                        </div>
                        <div class="text-2xl font-bold text-gray-800 mb-1">
                            $${(payment.amount_cents / 100).toFixed(2)}
                        </div>
                        ${payment.description ? `<p class="text-sm text-gray-600">${payment.description}</p>` : ''}
                        ${expense ? `<p class="text-xs text-gray-500">关联费用: ${expense.title}</p>` : ''}
                        ${payment.image_url ? `<p class="text-xs text-blue-600">📎 ${payment.image_url}</p>` : ''}
                        <p class="text-xs text-gray-400 mt-1">${new Date(payment.created_at).toLocaleString()}</p>
                    </div>
                    <div class="flex space-x-2 ml-4">
                        <button onclick="editPayment(${payment.id})" 
                                class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                            编辑
                        </button>
                        <button onclick="deletePaymentConfirm(${payment.id})" 
                                class="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">
                            删除
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 打开支付详情
 */
export function openPaymentDetail(paymentId) {
    const payment = window.paymentsList?.find(p => p.id === paymentId);
    if (!payment) {
        showErrorMessage('支付记录不存在');
        return;
    }
    
    currentEditingPayment = payment;
    populatePaymentDetailForm(payment);
    openPaymentModal();
}

/**
 * 更新支付文件名显示
 */
export function updatePaymentFileNameDisplay(input) {
    let filename = '';
    if (typeof input === 'string') {
        filename = input;
    } else if (input && input.files && input.files[0]) {
        filename = input.files[0].name;
    }
    
    const fileDisplay = document.getElementById('payment-file-name');
    if (fileDisplay) {
        if (filename) {
            fileDisplay.textContent = filename;
            fileDisplay.classList.remove('hidden');
        } else {
            fileDisplay.textContent = '';
            fileDisplay.classList.add('hidden');
        }
    }
}

/**
 * 更新支付详情文件名显示
 */
export function updatePaymentDetailFileNameDisplay(input) {
    let filename = '';
    if (input && input.files && input.files[0]) {
        filename = input.files[0].name;
    }
    
    const fileDisplay = document.getElementById('payment-detail-file-name');
    if (fileDisplay) {
        if (filename) {
            fileDisplay.textContent = filename;
            fileDisplay.classList.remove('hidden');
        } else {
            fileDisplay.textContent = '';
            fileDisplay.classList.add('hidden');
        }
    }
}

/**
 * 初始化支付详情表单
 */
export function initializePaymentDetailForm(payment) {
    // 已由 populatePaymentDetailForm 处理
    console.log('初始化支付详情表单:', payment);
}

/**
 * 编辑支付函数
 */
export function editPayment(paymentId) {
    const payment = window.paymentsList?.find(p => p.id === paymentId);
    if (!payment) {
        showErrorMessage('支付记录不存在');
        return;
    }
    
    populatePaymentDetailForm(payment);
    openPaymentModal();
}

/**
 * 删除支付确认函数
 */
export function deletePaymentConfirm(paymentId) {
    const payment = window.paymentsList?.find(p => p.id === paymentId);
    if (!payment) {
        showErrorMessage('支付记录不存在');
        return;
    }
    
    currentEditingPayment = payment;
    handleDeletePayment();
}

/**
 * 关闭删除确认弹窗
 */
export function closeDeletePaymentConfirm() {
    const modal = document.getElementById('delete-payment-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentEditingPayment = null;
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
window.createPayment = createPayment;
window.updatePayment = updatePayment;
window.initializePaymentForm = initializePaymentForm;
window.initializePaymentDetailForm = initializePaymentDetailForm;
window.refreshPaymentsList = refreshPaymentsList;
window.closeDeletePaymentConfirm = closeDeletePaymentConfirm;
window.editPayment = editPayment;
window.deletePaymentConfirm = deletePaymentConfirm;

console.log('支付模块已加载，所有函数已暴露到全局 - 修复版本');
