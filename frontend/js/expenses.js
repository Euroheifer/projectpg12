/**
 * 支出管理功能模块
 * 提供支出的创建、编辑、删除、查询和分类管理功能
 */

class ExpenseManager {
    constructor() {
        this.apiBase = '/api';
        this.currentGroupId = null;
        this.expenses = [];
        this.categories = [];
        this.recurringExpenses = [];
        this.initEventListeners();
    }

    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 支出表单提交
        document.addEventListener('submit', (e) => {
            if (e.target.classList.contains('expense-form')) {
                e.preventDefault();
                this.handleExpenseSubmit(e.target);
            }
        });

        // 删除支出确认
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-expense')) {
                e.preventDefault();
                this.confirmDeleteExpense(e.target.dataset.expenseId);
            }
        });

        // 编辑支出
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-expense')) {
                e.preventDefault();
                this.editExpense(e.target.dataset.expenseId);
            }
        });

        // 分类筛选
        document.addEventListener('change', (e) => {
            if (e.target.id === 'category-filter') {
                this.filterExpensesByCategory(e.target.value);
            }
        });

        // 收据上传
        document.addEventListener('change', (e) => {
            if (e.target.type === 'file' && e.target.accept === 'image/*') {
                this.handleReceiptUpload(e.target);
            }
        });

        // 定期支出设置
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('setup-recurring')) {
                e.preventDefault();
                this.setupRecurringExpense(e.target.dataset.expenseId);
            }
        });
    }

    /**
     * 设置当前群组ID
     */
    setGroupId(groupId) {
        this.currentGroupId = groupId;
        this.loadExpenses();
        this.loadCategories();
        this.loadRecurringExpenses();
    }

    /**
     * 加载支出列表
     */
    async loadExpenses(filters = {}) {
        if (!this.currentGroupId) return;

        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/expenses?${params}`);
            
            if (response.ok) {
                this.expenses = await response.json();
                this.renderExpenses();
            } else {
                console.error('加载支出列表失败');
            }
        } catch (error) {
            console.error('加载支出列表出错:', error);
        }
    }

    /**
     * 创建新支出
     */
    async createExpense(expenseData) {
        if (!this.currentGroupId) return;

        try {
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/expenses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(expenseData)
            });

            if (response.ok) {
                const newExpense = await response.json();
                this.expenses.unshift(newExpense);
                this.renderExpenses();
                this.showNotification('支出创建成功', 'success');
                return newExpense;
            } else {
                throw new Error('创建支出失败');
            }
        } catch (error) {
            console.error('创建支出出错:', error);
            this.showNotification('创建支出失败', 'error');
        }
    }

    /**
     * 更新支出
     */
    async updateExpense(expenseId, expenseData) {
        try {
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/expenses/${expenseId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(expenseData)
            });

            if (response.ok) {
                const updatedExpense = await response.json();
                const index = this.expenses.findIndex(e => e.id === expenseId);
                if (index !== -1) {
                    this.expenses[index] = updatedExpense;
                }
                this.renderExpenses();
                this.showNotification('支出更新成功', 'success');
                return updatedExpense;
            } else {
                throw new Error('更新支出失败');
            }
        } catch (error) {
            console.error('更新支出出错:', error);
            this.showNotification('更新支出失败', 'error');
        }
    }

    /**
     * 删除支出
     */
    async deleteExpense(expenseId) {
        try {
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/expenses/${expenseId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.expenses = this.expenses.filter(e => e.id !== expenseId);
                this.renderExpenses();
                this.showNotification('支出删除成功', 'success');
            } else {
                throw new Error('删除支出失败');
            }
        } catch (error) {
            console.error('删除支出出错:', error);
            this.showNotification('删除支出失败', 'error');
        }
    }

    /**
     * 确认删除支出
     */
    confirmDeleteExpense(expenseId) {
        if (confirm('确定要删除这个支出吗？此操作不可撤销。')) {
            this.deleteExpense(expenseId);
        }
    }

    /**
     * 编辑支出
     */
    editExpense(expenseId) {
        const expense = this.expenses.find(e => e.id === expenseId);
        if (!expense) return;

        // 填充表单数据
        const form = document.getElementById('expense-form');
        if (form) {
            form.dataset.editingId = expenseId;
            form.title.value = expense.title;
            form.amount.value = expense.amount;
            form.description.value = expense.description || '';
            form.category.value = expense.category;
            form.paymentMethod.value = expense.paymentMethod;
            
            // 设置参与者
            const participantsContainer = form.querySelector('.participants-container');
            participantsContainer.innerHTML = '';
            expense.participants.forEach(participant => {
                this.addParticipantField(participantsContainer, participant.userId, participant.amount);
            });

            // 滚动到表单
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * 处理支出表单提交
     */
    async handleExpenseSubmit(form) {
        const formData = new FormData(form);
        const expenseData = {
            title: formData.get('title'),
            amount: parseFloat(formData.get('amount')),
            description: formData.get('description'),
            category: formData.get('category'),
            paymentMethod: formData.get('paymentMethod'),
            date: formData.get('date') || new Date().toISOString().split('T')[0],
            participants: this.getParticipantsFromForm(form),
            receipt: formData.get('receipt') ? await this.uploadReceipt(formData.get('receipt')) : null
        };

        const editingId = form.dataset.editingId;
        if (editingId) {
            await this.updateExpense(editingId, expenseData);
            delete form.dataset.editingId;
        } else {
            await this.createExpense(expenseData);
        }

        form.reset();
        this.clearParticipantsForm(form);
    }

    /**
     * 从表单获取参与者数据
     */
    getParticipantsFromForm(form) {
        const participants = [];
        const participantFields = form.querySelectorAll('.participant-field');
        
        participantFields.forEach(field => {
            const userId = field.querySelector('[name="participant-user"]').value;
            const amount = parseFloat(field.querySelector('[name="participant-amount"]').value) || 0;
            
            if (userId && amount > 0) {
                participants.push({ userId, amount });
            }
        });

        return participants;
    }

    /**
     * 添加参与者字段
     */
    addParticipantField(container, userId = '', amount = '') {
        const participantDiv = document.createElement('div');
        participantDiv.className = 'participant-field';
        participantDiv.innerHTML = `
            <select name="participant-user" class="participant-user-select">
                <option value="">选择参与者</option>
                ${this.getGroupMembers().map(member => 
                    `<option value="${member.id}" ${member.id === userId ? 'selected' : ''}>${member.name}</option>`
                ).join('')}
            </select>
            <input type="number" name="participant-amount" placeholder="分摊金额" 
                   value="${amount}" step="0.01" min="0">
            <button type="button" class="remove-participant">×</button>
        `;
        
        container.appendChild(participantDiv);
        
        // 添加移除按钮事件
        participantDiv.querySelector('.remove-participant').addEventListener('click', () => {
            participantDiv.remove();
        });
    }

    /**
     * 清空参与者表单
     */
    clearParticipantsForm(form) {
        const container = form.querySelector('.participants-container');
        container.innerHTML = '';
        this.addParticipantField(container);
    }

    /**
     * 加载支出分类
     */
    async loadCategories() {
        try {
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/expense-categories`);
            if (response.ok) {
                this.categories = await response.json();
                this.renderCategoryFilter();
            }
        } catch (error) {
            console.error('加载分类失败:', error);
        }
    }

    /**
     * 渲染分类筛选器
     */
    renderCategoryFilter() {
        const filter = document.getElementById('category-filter');
        if (!filter) return;

        filter.innerHTML = `
            <option value="">所有分类</option>
            ${this.categories.map(category => 
                `<option value="${category.id}">${category.name}</option>`
            ).join('')}
        `;
    }

    /**
     * 按分类筛选支出
     */
    filterExpensesByCategory(categoryId) {
        const filteredExpenses = categoryId 
            ? this.expenses.filter(e => e.category === categoryId)
            : this.expenses;
        this.renderFilteredExpenses(filteredExpenses);
    }

    /**
     * 渲染筛选后的支出
     */
    renderFilteredExpenses(expenses) {
        const container = document.getElementById('expenses-list');
        if (!container) return;

        container.innerHTML = expenses.map(expense => `
            <div class="expense-item" data-expense-id="${expense.id}">
                <div class="expense-header">
                    <h3>${expense.title}</h3>
                    <span class="expense-amount">¥${expense.amount.toFixed(2)}</span>
                </div>
                <div class="expense-details">
                    <span class="expense-category">${this.getCategoryName(expense.category)}</span>
                    <span class="expense-date">${new Date(expense.date).toLocaleDateString()}</span>
                    <span class="expense-payer">支付者: ${expense.payerName}</span>
                </div>
                <div class="expense-participants">
                    参与者: ${expense.participants.map(p => p.name).join(', ')}
                </div>
                ${expense.description ? `<p class="expense-description">${expense.description}</p>` : ''}
                <div class="expense-actions">
                    <button class="edit-expense" data-expense-id="${expense.id}">编辑</button>
                    <button class="delete-expense" data-expense-id="${expense.id}">删除</button>
                    ${!expense.isRecurring ? `<button class="setup-recurring" data-expense-id="${expense.id}">设为定期</button>` : ''}
                </div>
                ${expense.receipt ? `<div class="expense-receipt"><img src="${expense.receipt}" alt="收据" onclick="this.src='${expense.receipt}'"></div>` : ''}
            </div>
        `).join('');
    }

    /**
     * 渲染所有支出
     */
    renderExpenses() {
        this.renderFilteredExpenses(this.expenses);
    }

    /**
     * 收据上传处理
     */
    async handleReceiptUpload(input) {
        const file = input.files[0];
        if (!file) return;

        // 文件验证
        if (!file.type.startsWith('image/')) {
            this.showNotification('请选择图片文件', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('图片大小不能超过5MB', 'error');
            return;
        }

        // 预览图片
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('receipt-preview');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }

    /**
     * 上传收据到服务器
     */
    async uploadReceipt(file) {
        const formData = new FormData();
        formData.append('receipt', file);

        try {
            const response = await fetch(`${this.apiBase}/upload/receipt`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                return result.url;
            }
        } catch (error) {
            console.error('收据上传失败:', error);
        }
        return null;
    }

    /**
     * 设置定期支出
     */
    async setupRecurringExpense(expenseId) {
        const expense = this.expenses.find(e => e.id === expenseId);
        if (!expense) return;

        const frequency = prompt('请选择重复频率:\n1. 每日\n2. 每周\n3. 每月\n4. 每年\n\n请输入数字(1-4):');
        
        const frequencies = { '1': 'daily', '2': 'weekly', '3': 'monthly', '4': 'yearly' };
        if (!frequencies[frequency]) return;

        const recurringData = {
            originalExpenseId: expenseId,
            frequency: frequencies[frequency],
            startDate: expense.date,
            endDate: null // 可选，设置结束日期
        };

        try {
            const response = await fetch(`${this.apiBase}/recurring-expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recurringData)
            });

            if (response.ok) {
                this.showNotification('定期支出设置成功', 'success');
            }
        } catch (error) {
            console.error('设置定期支出失败:', error);
            this.showNotification('设置定期支出失败', 'error');
        }
    }

    /**
     * 加载定期支出
     */
    async loadRecurringExpenses() {
        try {
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/recurring-expenses`);
            if (response.ok) {
                this.recurringExpenses = await response.json();
            }
        } catch (error) {
            console.error('加载定期支出失败:', error);
        }
    }

    /**
     * 获取群组成员列表
     */
    getGroupMembers() {
        // 这里应该从群组数据中获取成员列表
        // 暂时返回模拟数据
        return window.groupMembers || [];
    }

    /**
     * 获取分类名称
     */
    getCategoryName(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        return category ? category.name : '未分类';
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
     * 导出支出数据
     */
    async exportExpenses(format = 'csv') {
        try {
            const response = await fetch(
                `${this.apiBase}/groups/${this.currentGroupId}/expenses/export?format=${format}`
            );
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `expenses_${new Date().toISOString().split('T')[0]}.${format}`;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('导出失败:', error);
            this.showNotification('导出失败', 'error');
        }
    }

    /**
     * 获取支出统计信息
     */
    getExpenseStats() {
        const stats = {
            total: this.expenses.reduce((sum, e) => sum + e.amount, 0),
            byCategory: {},
            byUser: {},
            byMonth: {}
        };

        this.expenses.forEach(expense => {
            // 按分类统计
            const category = this.getCategoryName(expense.category);
            stats.byCategory[category] = (stats.byCategory[category] || 0) + expense.amount;

            // 按用户统计
            const payer = expense.payerName;
            stats.byUser[payer] = (stats.byUser[payer] || 0) + expense.amount;

            // 按月份统计
            const month = new Date(expense.date).toISOString().slice(0, 7);
            stats.byMonth[month] = (stats.byMonth[month] || 0) + expense.amount;
        });

        return stats;
    }
}

// 创建全局实例
window.expenseManager = new ExpenseManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExpenseManager;
}