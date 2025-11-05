/**
 * 支付管理功能模块
 * 提供支付记录的创建、编辑、删除、查询和状态管理功能
 */

class PaymentManager {
    constructor() {
        this.apiBase = '/api';
        this.currentGroupId = null;
        this.payments = [];
        this.paymentStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
        this.initEventListeners();
    }

    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 支付表单提交
        document.addEventListener('submit', (e) => {
            if (e.target.classList.contains('payment-form')) {
                e.preventDefault();
                this.handlePaymentSubmit(e.target);
            }
        });

        // 删除支付确认
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-payment')) {
                e.preventDefault();
                this.confirmDeletePayment(e.target.dataset.paymentId);
            }
        });

        // 编辑支付
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-payment')) {
                e.preventDefault();
                this.editPayment(e.target.dataset.paymentId);
            }
        });

        // 状态筛选
        document.addEventListener('change', (e) => {
            if (e.target.id === 'status-filter') {
                this.filterPaymentsByStatus(e.target.value);
            }
        });

        // 批量操作
        document.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.classList.contains('payment-select')) {
                this.updateBatchActionsVisibility();
            }
        });

        // 批量删除
        document.addEventListener('click', (e) => {
            if (e.target.id === 'batch-delete') {
                e.preventDefault();
                this.batchDeletePayments();
            }
        });

        // 批量状态更新
        document.addEventListener('click', (e) => {
            if (e.target.id === 'batch-status-update') {
                e.preventDefault();
                this.showBatchStatusUpdateDialog();
            }
        });

        // 凭证上传
        document.addEventListener('change', (e) => {
            if (e.target.type === 'file' && e.target.accept && e.target.accept.includes('image')) {
                this.handleProofUpload(e.target);
            }
        });

        // 全选/取消全选
        document.addEventListener('change', (e) => {
            if (e.target.id === 'select-all-payments') {
                this.toggleSelectAll(e.target.checked);
            }
        });
    }

    /**
     * 设置当前群组ID
     */
    setGroupId(groupId) {
        this.currentGroupId = groupId;
        this.loadPayments();
    }

    /**
     * 加载支付列表
     */
    async loadPayments(filters = {}) {
        if (!this.currentGroupId) return;

        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/payments?${params}`);
            
            if (response.ok) {
                this.payments = await response.json();
                this.renderPayments();
            } else {
                console.error('加载支付列表失败');
            }
        } catch (error) {
            console.error('加载支付列表出错:', error);
        }
    }

    /**
     * 创建新支付记录
     */
    async createPayment(paymentData) {
        if (!this.currentGroupId) return;

        try {
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(paymentData)
            });

            if (response.ok) {
                const newPayment = await response.json();
                this.payments.unshift(newPayment);
                this.renderPayments();
                this.showNotification('支付记录创建成功', 'success');
                return newPayment;
            } else {
                throw new Error('创建支付记录失败');
            }
        } catch (error) {
            console.error('创建支付记录出错:', error);
            this.showNotification('创建支付记录失败', 'error');
        }
    }

    /**
     * 更新支付记录
     */
    async updatePayment(paymentId, paymentData) {
        try {
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/payments/${paymentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(paymentData)
            });

            if (response.ok) {
                const updatedPayment = await response.json();
                const index = this.payments.findIndex(p => p.id === paymentId);
                if (index !== -1) {
                    this.payments[index] = updatedPayment;
                }
                this.renderPayments();
                this.showNotification('支付记录更新成功', 'success');
                return updatedPayment;
            } else {
                throw new Error('更新支付记录失败');
            }
        } catch (error) {
            console.error('更新支付记录出错:', error);
            this.showNotification('更新支付记录失败', 'error');
        }
    }

    /**
     * 删除支付记录
     */
    async deletePayment(paymentId) {
        try {
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/payments/${paymentId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.payments = this.payments.filter(p => p.id !== paymentId);
                this.renderPayments();
                this.showNotification('支付记录删除成功', 'success');
            } else {
                throw new Error('删除支付记录失败');
            }
        } catch (error) {
            console.error('删除支付记录出错:', error);
            this.showNotification('删除支付记录失败', 'error');
        }
    }

    /**
     * 确认删除支付记录
     */
    confirmDeletePayment(paymentId) {
        const payment = this.payments.find(p => p.id === paymentId);
        if (!payment) return;

        const message = payment.status === 'completed' 
            ? '此支付已完成，确定要删除吗？删除后可能影响账目平衡。'
            : '确定要删除这个支付记录吗？此操作不可撤销。';

        if (confirm(message)) {
            this.deletePayment(paymentId);
        }
    }

    /**
     * 编辑支付记录
     */
    editPayment(paymentId) {
        const payment = this.payments.find(p => p.id === paymentId);
        if (!payment) return;

        // 填充表单数据
        const form = document.getElementById('payment-form');
        if (form) {
            form.dataset.editingId = paymentId;
            form.fromUser.value = payment.fromUserId;
            form.toUser.value = payment.toUserId;
            form.amount.value = payment.amount;
            form.description.value = payment.description || '';
            form.paymentMethod.value = payment.paymentMethod;
            form.referenceNumber.value = payment.referenceNumber || '';
            
            // 设置日期
            if (form.paymentDate) {
                form.paymentDate.value = payment.paymentDate ? 
                    new Date(payment.paymentDate).toISOString().slice(0, 16) : '';
            }
            
            // 滚动到表单
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * 处理支付表单提交
     */
    async handlePaymentSubmit(form) {
        const formData = new FormData(form);
        const paymentData = {
            fromUserId: formData.get('fromUser'),
            toUserId: formData.get('toUser'),
            amount: parseFloat(formData.get('amount')),
            description: formData.get('description'),
            paymentMethod: formData.get('paymentMethod'),
            referenceNumber: formData.get('referenceNumber'),
            paymentDate: formData.get('paymentDate') || new Date().toISOString(),
            proof: formData.get('proof') ? await this.uploadProof(formData.get('proof')) : null
        };

        // 验证数据
        if (!this.validatePaymentData(paymentData)) {
            return;
        }

        const editingId = form.dataset.editingId;
        if (editingId) {
            await this.updatePayment(editingId, paymentData);
            delete form.dataset.editingId;
        } else {
            await this.createPayment(paymentData);
        }

        form.reset();
        this.clearProofPreview();
    }

    /**
     * 验证支付数据
     */
    validatePaymentData(data) {
        if (!data.fromUserId) {
            this.showNotification('请选择付款人', 'error');
            return false;
        }
        if (!data.toUserId) {
            this.showNotification('请选择收款人', 'error');
            return false;
        }
        if (data.fromUserId === data.toUserId) {
            this.showNotification('付款人和收款人不能是同一个人', 'error');
            return false;
        }
        if (!data.amount || data.amount <= 0) {
            this.showNotification('请输入有效的支付金额', 'error');
            return false;
        }
        return true;
    }

    /**
     * 按状态筛选支付记录
     */
    filterPaymentsByStatus(status) {
        const filteredPayments = status 
            ? this.payments.filter(p => p.status === status)
            : this.payments;
        this.renderFilteredPayments(filteredPayments);
    }

    /**
     * 渲染筛选后的支付记录
     */
    renderFilteredPayments(payments) {
        const container = document.getElementById('payments-list');
        if (!container) return;

        container.innerHTML = payments.map(payment => `
            <div class="payment-item" data-payment-id="${payment.id}">
                <div class="payment-header">
                    <input type="checkbox" class="payment-select" data-payment-id="${payment.id}">
                    <div class="payment-info">
                        <span class="payment-amount">¥${payment.amount.toFixed(2)}</span>
                        <span class="payment-direction">${payment.fromUserName} → ${payment.toUserName}</span>
                    </div>
                    <span class="payment-status status-${payment.status}">${this.getStatusText(payment.status)}</span>
                </div>
                <div class="payment-details">
                    <span class="payment-method">${this.getPaymentMethodText(payment.paymentMethod)}</span>
                    <span class="payment-date">${new Date(payment.paymentDate).toLocaleString()}</span>
                    ${payment.referenceNumber ? `<span class="payment-reference">单号: ${payment.referenceNumber}</span>` : ''}
                </div>
                ${payment.description ? `<p class="payment-description">${payment.description}</p>` : ''}
                <div class="payment-actions">
                    <button class="edit-payment" data-payment-id="${payment.id}">编辑</button>
                    <button class="delete-payment" data-payment-id="${payment.id}">删除</button>
                    ${this.getStatusActionButtons(payment)}
                </div>
                ${payment.proof ? `<div class="payment-proof"><img src="${payment.proof}" alt="支付凭证" onclick="this.src='${payment.proof}'"></div>` : ''}
            </div>
        `).join('');

        this.updateBatchActionsVisibility();
    }

    /**
     * 渲染所有支付记录
     */
    renderPayments() {
        this.renderFilteredPayments(this.payments);
    }

    /**
     * 获取状态操作按钮
     */
    getStatusActionButtons(payment) {
        const buttons = [];
        
        if (payment.status === 'pending') {
            buttons.push(`<button class="confirm-payment" data-payment-id="${payment.id}">确认收款</button>`);
            buttons.push(`<button class="reject-payment" data-payment-id="${payment.id}">拒绝收款</button>`);
        }
        
        if (payment.status === 'processing') {
            buttons.push(`<button class="complete-payment" data-payment-id="${payment.id}">完成支付</button>`);
            buttons.push(`<button class="fail-payment" data-payment-id="${payment.id}">支付失败</button>`);
        }

        return buttons.join('');
    }

    /**
     * 更新支付状态
     */
    async updatePaymentStatus(paymentId, newStatus, note = '') {
        try {
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/payments/${paymentId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, note })
            });

            if (response.ok) {
                const updatedPayment = await response.json();
                const index = this.payments.findIndex(p => p.id === paymentId);
                if (index !== -1) {
                    this.payments[index] = updatedPayment;
                }
                this.renderPayments();
                this.showNotification('支付状态更新成功', 'success');
                return updatedPayment;
            } else {
                throw new Error('更新支付状态失败');
            }
        } catch (error) {
            console.error('更新支付状态出错:', error);
            this.showNotification('更新支付状态失败', 'error');
        }
    }

    /**
     * 批量删除支付记录
     */
    async batchDeletePayments() {
        const selectedIds = this.getSelectedPaymentIds();
        if (selectedIds.length === 0) {
            this.showNotification('请选择要删除的支付记录', 'warning');
            return;
        }

        if (!confirm(`确定要删除选中的 ${selectedIds.length} 条支付记录吗？此操作不可撤销。`)) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/payments/batch-delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentIds: selectedIds })
            });

            if (response.ok) {
                this.payments = this.payments.filter(p => !selectedIds.includes(p.id));
                this.renderPayments();
                this.showNotification(`成功删除 ${selectedIds.length} 条支付记录`, 'success');
            }
        } catch (error) {
            console.error('批量删除失败:', error);
            this.showNotification('批量删除失败', 'error');
        }
    }

    /**
     * 显示批量状态更新对话框
     */
    showBatchStatusUpdateDialog() {
        const selectedIds = this.getSelectedPaymentIds();
        if (selectedIds.length === 0) {
            this.showNotification('请选择要更新的支付记录', 'warning');
            return;
        }

        // 创建简单的状态选择对话框
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>批量更新支付状态</h3>
                <p>已选择 ${selectedIds.length} 条支付记录</p>
                <select id="new-status">
                    ${this.paymentStatuses.map(status => 
                        `<option value="${status}">${this.getStatusText(status)}</option>`
                    ).join('')}
                </select>
                <textarea id="status-note" placeholder="备注（可选）"></textarea>
                <div class="modal-actions">
                    <button id="confirm-batch-update">确定</button>
                    <button id="cancel-batch-update">取消</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 事件监听
        modal.querySelector('#confirm-batch-update').addEventListener('click', async () => {
            const newStatus = modal.querySelector('#new-status').value;
            const note = modal.querySelector('#status-note').value;
            await this.batchUpdatePaymentStatus(selectedIds, newStatus, note);
            modal.remove();
        });

        modal.querySelector('#cancel-batch-update').addEventListener('click', () => {
            modal.remove();
        });
    }

    /**
     * 批量更新支付状态
     */
    async batchUpdatePaymentStatus(paymentIds, newStatus, note = '') {
        try {
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/payments/batch-status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentIds, status: newStatus, note })
            });

            if (response.ok) {
                const updatedPayments = await response.json();
                // 更新本地数据
                updatedPayments.forEach(updatedPayment => {
                    const index = this.payments.findIndex(p => p.id === updatedPayment.id);
                    if (index !== -1) {
                        this.payments[index] = updatedPayment;
                    }
                });
                this.renderPayments();
                this.showNotification(`成功更新 ${paymentIds.length} 条支付记录状态`, 'success');
            }
        } catch (error) {
            console.error('批量更新状态失败:', error);
            this.showNotification('批量更新状态失败', 'error');
        }
    }

    /**
     * 获取选中的支付记录ID
     */
    getSelectedPaymentIds() {
        const checkboxes = document.querySelectorAll('.payment-select:checked');
        return Array.from(checkboxes).map(cb => cb.dataset.paymentId);
    }

    /**
     * 全选/取消全选
     */
    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.payment-select');
        checkboxes.forEach(cb => cb.checked = checked);
        this.updateBatchActionsVisibility();
    }

    /**
     * 更新批量操作按钮可见性
     */
    updateBatchActionsVisibility() {
        const selectedIds = this.getSelectedPaymentIds();
        const batchActions = document.querySelectorAll('.batch-actions');
        
        batchActions.forEach(action => {
            action.style.display = selectedIds.length > 0 ? 'block' : 'none';
        });
    }

    /**
     * 凭证上传处理
     */
    async handleProofUpload(input) {
        const file = input.files[0];
        if (!file) return;

        // 文件验证
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            this.showNotification('请选择图片或PDF文件', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('文件大小不能超过10MB', 'error');
            return;
        }

        // 预览图片
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('proof-preview');
                if (preview) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        }
    }

    /**
     * 上传支付凭证到服务器
     */
    async uploadProof(file) {
        const formData = new FormData();
        formData.append('proof', file);

        try {
            const response = await fetch(`${this.apiBase}/upload/proof`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                return result.url;
            }
        } catch (error) {
            console.error('凭证上传失败:', error);
        }
        return null;
    }

    /**
     * 清空凭证预览
     */
    clearProofPreview() {
        const preview = document.getElementById('proof-preview');
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }
    }

    /**
     * 获取状态文本
     */
    getStatusText(status) {
        const statusMap = {
            'pending': '待确认',
            'processing': '处理中',
            'completed': '已完成',
            'failed': '失败',
            'cancelled': '已取消'
        };
        return statusMap[status] || status;
    }

    /**
     * 获取支付方式文本
     */
    getPaymentMethodText(method) {
        const methodMap = {
            'cash': '现金',
            'transfer': '转账',
            'alipay': '支付宝',
            'wechat': '微信',
            'bank': '银行卡',
            'other': '其他'
        };
        return methodMap[method] || method;
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => notification.classList.add('show'), 100);
        
        // 自动移除
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * 获取支付统计信息
     */
    getPaymentStats() {
        const stats = {
            total: this.payments.length,
            byStatus: {},
            byMethod: {},
            totalAmount: 0,
            monthlyAmount: {}
        };

        this.payments.forEach(payment => {
            // 按状态统计
            stats.byStatus[payment.status] = (stats.byStatus[payment.status] || 0) + 1;

            // 按支付方式统计
            const method = this.getPaymentMethodText(payment.paymentMethod);
            stats.byMethod[method] = (stats.byMethod[method] || 0) + 1;

            // 统计总金额
            if (payment.status === 'completed') {
                stats.totalAmount += payment.amount;
            }

            // 按月份统计
            const month = new Date(payment.paymentDate).toISOString().slice(0, 7);
            if (!stats.monthlyAmount[month]) stats.monthlyAmount[month] = 0;
            if (payment.status === 'completed') {
                stats.monthlyAmount[month] += payment.amount;
            }
        });

        return stats;
    }

    /**
     * 导出支付数据
     */
    async exportPayments(format = 'csv') {
        try {
            const response = await fetch(
                `${this.apiBase}/groups/${this.currentGroupId}/payments/export?format=${format}`
            );
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `payments_${new Date().toISOString().split('T')[0]}.${format}`;
                a.click();
                window.URL.revokeObjectURL(url);
                this.showNotification('支付数据导出成功', 'success');
            }
        } catch (error) {
            console.error('导出失败:', error);
            this.showNotification('导出失败', 'error');
        }
    }
}

// 创建全局实例
window.paymentManager = new PaymentManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentManager;
}