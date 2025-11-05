/**
 * 余额计算功能模块
 * 提供群组余额计算、个人收支统计、结算建议和财务报告功能
 */

class BalanceManager {
    constructor() {
        this.apiBase = '/api';
        this.currentGroupId = null;
        this.groupMembers = [];
        this.expenses = [];
        this.payments = [];
        this.balances = {};
        this.settlementSuggestions = [];
        this.initEventListeners();
    }

    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 刷新余额
        document.addEventListener('click', (e) => {
            if (e.target.id === 'refresh-balances') {
                e.preventDefault();
                this.refreshBalances();
            }
        });

        // 生成结算建议
        document.addEventListener('click', (e) => {
            if (e.target.id === 'generate-suggestions') {
                e.preventDefault();
                this.generateSettlementSuggestions();
            }
        });

        // 执行结算
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('execute-settlement')) {
                e.preventDefault();
                this.executeSettlement(e.target.dataset.suggestionId);
            }
        });

        // 查看详情
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-details')) {
                e.preventDefault();
                this.showMemberDetails(e.target.dataset.userId);
            }
        });

        // 导出报告
        document.addEventListener('click', (e) => {
            if (e.target.id === 'export-report') {
                e.preventDefault();
                this.exportFinancialReport();
            }
        });

        // 打印报告
        document.addEventListener('click', (e) => {
            if (e.target.id === 'print-report') {
                e.preventDefault();
                this.printFinancialReport();
            }
        });

        // 时间范围筛选
        document.addEventListener('change', (e) => {
            if (e.target.id === 'date-range-filter') {
                this.filterByDateRange(e.target.value);
            }
        });

        // 图表类型切换
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('chart-type-btn')) {
                e.preventDefault();
                this.switchChartType(e.target.dataset.chartType);
            }
        });
    }

    /**
     * 设置当前群组ID
     */
    setGroupId(groupId) {
        this.currentGroupId = groupId;
        this.loadGroupData();
    }

    /**
     * 加载群组数据
     */
    async loadGroupData() {
        if (!this.currentGroupId) return;

        try {
            await Promise.all([
                this.loadGroupMembers(),
                this.loadExpenses(),
                this.loadPayments()
            ]);
            this.calculateBalances();
            this.renderBalances();
            this.generateSettlementSuggestions();
        } catch (error) {
            console.error('加载群组数据失败:', error);
        }
    }

    /**
     * 加载群组成员
     */
    async loadGroupMembers() {
        try {
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/members`);
            if (response.ok) {
                this.groupMembers = await response.json();
            }
        } catch (error) {
            console.error('加载群组成员失败:', error);
        }
    }

    /**
     * 加载支出数据
     */
    async loadExpenses() {
        try {
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/expenses`);
            if (response.ok) {
                this.expenses = await response.json();
            }
        } catch (error) {
            console.error('加载支出数据失败:', error);
        }
    }

    /**
     * 加载支付数据
     */
    async loadPayments() {
        try {
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/payments?status=completed`);
            if (response.ok) {
                this.payments = await response.json();
            }
        } catch (error) {
            console.error('加载支付数据失败:', error);
        }
    }

    /**
     * 计算余额
     */
    calculateBalances() {
        this.balances = {};
        
        // 初始化每个成员的余额
        this.groupMembers.forEach(member => {
            this.balances[member.id] = {
                userId: member.id,
                userName: member.name,
                totalPaid: 0,      // 总支出
                totalOwed: 0,      // 应支付金额
                totalReceived: 0,  // 收到支付
                netBalance: 0      // 净余额
            };
        });

        // 计算支出分摊
        this.expenses.forEach(expense => {
            if (!expense.isActive) return; // 跳过已删除的支出
            
            const payer = this.balances[expense.payerId];
            if (payer) {
                payer.totalPaid += expense.amount;
            }

            // 计算每个参与者的分摊金额
            const shareAmount = expense.amount / expense.participants.length;
            expense.participants.forEach(participant => {
                const participant = this.balances[participant.userId];
                if (participant) {
                    participant.totalOwed += shareAmount;
                }
            });
        });

        // 计算支付
        this.payments.forEach(payment => {
            const fromUser = this.balances[payment.fromUserId];
            const toUser = this.balances[payment.toUserId];
            
            if (fromUser) fromUser.totalReceived += payment.amount;
            if (toUser) toUser.totalReceived += payment.amount;
        });

        // 计算净余额
        Object.values(this.balances).forEach(balance => {
            balance.netBalance = balance.totalPaid + balance.totalReceived - balance.totalOwed;
        });
    }

    /**
     * 渲染余额显示
     */
    renderBalances() {
        const container = document.getElementById('balances-container');
        if (!container) return;

        container.innerHTML = `
            <div class="balances-overview">
                <h3>群组余额概览</h3>
                <div class="balances-grid">
                    ${Object.values(this.balances).map(balance => this.renderBalanceCard(balance)).join('')}
                </div>
            </div>
            <div class="settlement-section">
                <h3>结算建议</h3>
                <div id="settlement-suggestions">
                    ${this.renderSettlementSuggestions()}
                </div>
            </div>
            <div class="financial-charts">
                <h3>财务图表</h3>
                <div class="chart-controls">
                    <button class="chart-type-btn" data-chart-type="pie">支出分类饼图</button>
                    <button class="chart-type-btn" data-chart-type="bar">成员支出对比</button>
                    <button class="chart-type-btn" data-chart-type="line">月度趋势</button>
                </div>
                <canvas id="financial-chart" width="400" height="200"></canvas>
            </div>
        `;

        // 绘制默认图表
        this.drawChart('pie');
    }

    /**
     * 渲染单个余额卡片
     */
    renderBalanceCard(balance) {
        const isPositive = balance.netBalance > 0;
        const isNegative = balance.netBalance < 0;
        const balanceClass = isPositive ? 'positive' : isNegative ? 'negative' : 'neutral';

        return `
            <div class="balance-card ${balanceClass}" data-user-id="${balance.userId}">
                <div class="balance-header">
                    <h4>${balance.userName}</h4>
                    <span class="balance-amount">${isPositive ? '+' : ''}¥${balance.netBalance.toFixed(2)}</span>
                </div>
                <div class="balance-details">
                    <div class="balance-item">
                        <span class="label">总支出:</span>
                        <span class="value">¥${balance.totalPaid.toFixed(2)}</span>
                    </div>
                    <div class="balance-item">
                        <span class="label">应支付:</span>
                        <span class="value">¥${balance.totalOwed.toFixed(2)}</span>
                    </div>
                    <div class="balance-item">
                        <span class="label">已收到:</span>
                        <span class="value">¥${balance.totalReceived.toFixed(2)}</span>
                    </div>
                </div>
                <div class="balance-actions">
                    <button class="view-details" data-user-id="${balance.userId}">查看详情</button>
                </div>
                ${this.getBalanceStatus(balance)}
            </div>
        `;
    }

    /**
     * 获取余额状态显示
     */
    getBalanceStatus(balance) {
        if (balance.netBalance > 0) {
            return `<div class="balance-status status-credit">应收: ¥${balance.netBalance.toFixed(2)}</div>`;
        } else if (balance.netBalance < 0) {
            return `<div class="balance-status status-debt">应付: ¥${Math.abs(balance.netBalance).toFixed(2)}</div>`;
        } else {
            return `<div class="balance-status status-settled">已结清</div>`;
        }
    }

    /**
     * 生成结算建议
     */
    generateSettlementSuggestions() {
        const creditors = []; // 应收款人
        const debtors = [];   // 应付款人

        Object.values(this.balances).forEach(balance => {
            if (balance.netBalance > 0.01) {
                creditors.push({ ...balance, amount: balance.netBalance });
            } else if (balance.netBalance < -0.01) {
                debtors.push({ ...balance, amount: Math.abs(balance.netBalance) });
            }
        });

        this.settlementSuggestions = this.optimizeSettlements(creditors, debtors);
        this.renderSettlementSuggestions();
    }

    /**
     * 优化结算建议（最小化转账次数）
     */
    optimizeSettlements(creditors, debtors) {
        const suggestions = [];
        let i = 0, j = 0;

        // 按金额排序
        creditors.sort((a, b) => b.amount - a.amount);
        debtors.sort((a, b) => b.amount - a.amount);

        while (i < creditors.length && j < debtors.length) {
            const creditor = creditors[i];
            const debtor = debtors[j];
            
            const amount = Math.min(creditor.amount, debtor.amount);
            
            suggestions.push({
                id: `settle_${creditor.userId}_${debtor.userId}`,
                fromUserId: debtor.userId,
                fromUserName: debtor.userName,
                toUserId: creditor.userId,
                toUserName: creditor.userName,
                amount: parseFloat(amount.toFixed(2)),
                description: `${debtor.userName} 向 ${creditor.userName} 支付 ¥${amount.toFixed(2)}`
            });

            creditor.amount -= amount;
            debtor.amount -= amount;

            if (creditor.amount <= 0.01) i++;
            if (debtor.amount <= 0.01) j++;
        }

        return suggestions;
    }

    /**
     * 渲染结算建议
     */
    renderSettlementSuggestions() {
        if (this.settlementSuggestions.length === 0) {
            return '<div class="no-suggestions">所有成员余额已结清</div>';
        }

        return `
            <div class="suggestions-list">
                ${this.settlementSuggestions.map(suggestion => `
                    <div class="settlement-suggestion" data-suggestion-id="${suggestion.id}">
                        <div class="suggestion-info">
                            <span class="suggestion-amount">¥${suggestion.amount.toFixed(2)}</span>
                            <span class="suggestion-description">${suggestion.description}</span>
                        </div>
                        <div class="suggestion-actions">
                            <button class="execute-settlement" data-suggestion-id="${suggestion.id}">执行结算</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="suggestions-summary">
                <p>总共需要 ${this.settlementSuggestions.length} 笔转账来结清所有余额</p>
            </div>
        `;
    }

    /**
     * 执行结算
     */
    async executeSettlement(suggestionId) {
        const suggestion = this.settlementSuggestions.find(s => s.id === suggestionId);
        if (!suggestion) return;

        const paymentData = {
            fromUserId: suggestion.fromUserId,
            toUserId: suggestion.toUserId,
            amount: suggestion.amount,
            description: suggestion.description,
            paymentMethod: 'transfer',
            paymentDate: new Date().toISOString()
        };

        try {
            // 这里应该调用支付创建接口
            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });

            if (response.ok) {
                this.showNotification('结算执行成功', 'success');
                // 重新加载数据
                this.loadGroupData();
            } else {
                throw new Error('结算执行失败');
            }
        } catch (error) {
            console.error('执行结算出错:', error);
            this.showNotification('结算执行失败', 'error');
        }
    }

    /**
     * 显示成员详情
     */
    showMemberDetails(userId) {
        const memberData = this.getMemberDetailData(userId);
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content member-details">
                <h3>${memberData.name} 的财务详情</h3>
                <div class="member-stats">
                    <div class="stat-item">
                        <span class="label">总支出:</span>
                        <span class="value">¥${memberData.totalPaid.toFixed(2)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">应支付:</span>
                        <span class="value">¥${memberData.totalOwed.toFixed(2)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">已收到:</span>
                        <span class="value">¥${memberData.totalReceived.toFixed(2)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">净余额:</span>
                        <span class="value ${memberData.netBalance >= 0 ? 'positive' : 'negative'}">
                            ${memberData.netBalance >= 0 ? '+' : ''}¥${memberData.netBalance.toFixed(2)}
                        </span>
                    </div>
                </div>
                <div class="member-expenses">
                    <h4>支出记录</h4>
                    <div class="expense-list">
                        ${this.renderMemberExpenses(userId)}
                    </div>
                </div>
                <div class="member-payments">
                    <h4>支付记录</h4>
                    <div class="payment-list">
                        ${this.renderMemberPayments(userId)}
                    </div>
                </div>
                <button class="close-modal">关闭</button>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
    }

    /**
     * 获取成员详情数据
     */
    getMemberDetailData(userId) {
        const balance = this.balances[userId] || {};
        return {
            name: balance.userName || '未知用户',
            totalPaid: balance.totalPaid || 0,
            totalOwed: balance.totalOwed || 0,
            totalReceived: balance.totalReceived || 0,
            netBalance: balance.netBalance || 0
        };
    }

    /**
     * 渲染成员支出记录
     */
    renderMemberExpenses(userId) {
        const memberExpenses = this.expenses.filter(e => 
            e.payerId === userId || e.participants.some(p => p.userId === userId)
        );

        if (memberExpenses.length === 0) {
            return '<p>暂无支出记录</p>';
        }

        return memberExpenses.map(expense => {
            const isPayer = expense.payerId === userId;
            const shareAmount = expense.amount / expense.participants.length;
            const participant = expense.participants.find(p => p.userId === userId);
            const actualAmount = isPayer ? expense.amount : (participant ? shareAmount : 0);

            return `
                <div class="detail-item">
                    <span class="item-title">${expense.title}</span>
                    <span class="item-amount">¥${actualAmount.toFixed(2)}</span>
                    <span class="item-type">${isPayer ? '支出' : '分摊'}</span>
                    <span class="item-date">${new Date(expense.date).toLocaleDateString()}</span>
                </div>
            `;
        }).join('');
    }

    /**
     * 渲染成员支付记录
     */
    renderMemberPayments(userId) {
        const memberPayments = this.payments.filter(p => 
            p.fromUserId === userId || p.toUserId === userId
        );

        if (memberPayments.length === 0) {
            return '<p>暂无支付记录</p>';
        }

        return memberPayments.map(payment => {
            const isOutgoing = payment.fromUserId === userId;
            return `
                <div class="detail-item">
                    <span class="item-title">${payment.description || '支付转账'}</span>
                    <span class="item-amount ${isOutgoing ? 'negative' : 'positive'}">
                        ${isOutgoing ? '-' : '+'}¥${payment.amount.toFixed(2)}
                    </span>
                    <span class="item-type">${isOutgoing ? '支付' : '收款'}</span>
                    <span class="item-counterpart">
                        ${isOutgoing ? '→' : '←'} ${isOutgoing ? payment.toUserName : payment.fromUserName}
                    </span>
                    <span class="item-date">${new Date(payment.paymentDate).toLocaleDateString()}</span>
                </div>
            `;
        }).join('');
    }

    /**
     * 刷新余额
     */
    async refreshBalances() {
        this.showNotification('正在刷新余额...', 'info');
        await this.loadGroupData();
        this.showNotification('余额已更新', 'success');
    }

    /**
     * 按日期范围筛选
     */
    filterByDateRange(range) {
        const now = new Date();
        let startDate;

        switch (range) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                break;
            case 'quarter':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                break;
            case 'year':
                startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            default:
                startDate = null;
        }

        if (startDate) {
            this.filteredExpenses = this.expenses.filter(e => new Date(e.date) >= startDate);
            this.filteredPayments = this.payments.filter(p => new Date(p.paymentDate) >= startDate);
        } else {
            this.filteredExpenses = [...this.expenses];
            this.filteredPayments = [...this.payments];
        }

        this.calculateBalances();
        this.renderBalances();
    }

    /**
     * 切换图表类型
     */
    switchChartType(chartType) {
        // 更新按钮状态
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-chart-type="${chartType}"]`).classList.add('active');

        // 绘制图表
        this.drawChart(chartType);
    }

    /**
     * 绘制图表
     */
    drawChart(chartType) {
        const canvas = document.getElementById('financial-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        switch (chartType) {
            case 'pie':
                this.drawPieChart(ctx);
                break;
            case 'bar':
                this.drawBarChart(ctx);
                break;
            case 'line':
                this.drawLineChart(ctx);
                break;
        }
    }

    /**
     * 绘制饼图
     */
    drawPieChart(ctx) {
        const expenseByCategory = {};
        this.expenses.forEach(expense => {
            const category = expense.categoryName || '未分类';
            expenseByCategory[category] = (expenseByCategory[category] || 0) + expense.amount;
        });

        const categories = Object.keys(expenseByCategory);
        const values = Object.values(expenseByCategory);
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

        let currentAngle = -Math.PI / 2;
        const centerX = 200;
        const centerY = 100;
        const radius = 80;

        values.forEach((value, index) => {
            const sliceAngle = (value / values.reduce((a, b) => a + b, 0)) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.lineTo(centerX, centerY);
            ctx.fillStyle = colors[index % colors.length];
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();

            currentAngle += sliceAngle;
        });

        // 添加图例
        categories.forEach((category, index) => {
            ctx.fillStyle = colors[index % colors.length];
            ctx.fillRect(320, 20 + index * 20, 15, 15);
            ctx.fillStyle = '#000';
            ctx.font = '12px Arial';
            ctx.fillText(`${category} (¥${expenseByCategory[category].toFixed(2)})`, 340, 32 + index * 20);
        });
    }

    /**
     * 绘制柱状图
     */
    drawBarChart(ctx) {
        const memberExpenses = {};
        this.expenses.forEach(expense => {
            const payer = expense.payerName || '未知';
            memberExpenses[payer] = (memberExpenses[payer] || 0) + expense.amount;
        });

        const members = Object.keys(memberExpenses);
        const values = Object.values(memberExpenses);
        const maxValue = Math.max(...values);

        const barWidth = 50;
        const spacing = 20;
        const startX = 50;
        const startY = 180;

        members.forEach((member, index) => {
            const barHeight = (values[index] / maxValue) * 150;
            const x = startX + index * (barWidth + spacing);
            const y = startY - barHeight;

            ctx.fillStyle = '#36A2EB';
            ctx.fillRect(x, y, barWidth, barHeight);

            // 数值标签
            ctx.fillStyle = '#000';
            ctx.font = '10px Arial';
            ctx.fillText(`¥${values[index].toFixed(0)}`, x, y - 5);

            // 成员名称
            ctx.save();
            ctx.translate(x + barWidth / 2, startY + 15);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(member, 0, 0);
            ctx.restore();
        });

        // Y轴
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX, startY - 160);
        ctx.stroke();

        // X轴
        ctx.beginPath();
        ctx.moveTo(startX - 10, startY);
        ctx.lineTo(startX + members.length * (barWidth + spacing), startY);
        ctx.stroke();
    }

    /**
     * 绘制折线图
     */
    drawLineChart(ctx) {
        const monthlyExpenses = {};
        this.expenses.forEach(expense => {
            const month = new Date(expense.date).toISOString().slice(0, 7);
            monthlyExpenses[month] = (monthlyExpenses[month] || 0) + expense.amount;
        });

        const months = Object.keys(monthlyExpenses).sort();
        const values = months.map(month => monthlyExpenses[month]);
        const maxValue = Math.max(...values);

        const startX = 50;
        const startY = 180;
        const chartWidth = 300;
        const chartHeight = 150;

        // 绘制网格
        ctx.strokeStyle = '#eee';
        for (let i = 0; i <= 5; i++) {
            const y = startY - (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(startX + chartWidth, y);
            ctx.stroke();

            // Y轴标签
            ctx.fillStyle = '#000';
            ctx.font = '10px Arial';
            ctx.fillText(`¥${(maxValue / 5 * i).toFixed(0)}`, 10, y + 4);
        }

        // 绘制折线
        ctx.strokeStyle = '#36A2EB';
        ctx.lineWidth = 2;
        ctx.beginPath();

        values.forEach((value, index) => {
            const x = startX + (chartWidth / (values.length - 1)) * index;
            const y = startY - (value / maxValue) * chartHeight;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            // 绘制数据点
            ctx.fillStyle = '#36A2EB';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();

            // X轴标签
            ctx.fillStyle = '#000';
            ctx.font = '10px Arial';
            ctx.fillText(months[index], x - 15, startY + 20);
        });

        ctx.stroke();
    }

    /**
     * 导出财务报告
     */
    async exportFinancialReport() {
        try {
            const reportData = {
                groupId: this.currentGroupId,
                generatedAt: new Date().toISOString(),
                balances: this.balances,
                settlementSuggestions: this.settlementSuggestions,
                statistics: this.getFinancialStatistics()
            };

            const response = await fetch(`${this.apiBase}/groups/${this.currentGroupId}/balances/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportData)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `financial_report_${new Date().toISOString().split('T')[0]}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
                this.showNotification('财务报告导出成功', 'success');
            }
        } catch (error) {
            console.error('导出报告失败:', error);
            this.showNotification('导出报告失败', 'error');
        }
    }

    /**
     * 打印财务报告
     */
    printFinancialReport() {
        const printWindow = window.open('', '_blank');
        const reportHtml = this.generateReportHTML();
        printWindow.document.write(reportHtml);
        printWindow.document.close();
        printWindow.print();
    }

    /**
     * 生成报告HTML
     */
    generateReportHTML() {
        const statistics = this.getFinancialStatistics();
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>群组财务报告</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .balance-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
                    .balance-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                    .balance-amount { font-size: 18px; font-weight: bold; }
                    .positive { color: green; }
                    .negative { color: red; }
                    .settlement-suggestions { margin-top: 20px; }
                    .suggestion { border: 1px solid #ccc; padding: 10px; margin: 5px 0; }
                    .statistics { margin-top: 30px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>群组财务报告</h1>
                    <p>生成时间: ${new Date().toLocaleString()}</p>
                </div>
                
                <h2>余额详情</h2>
                <div class="balance-grid">
                    ${Object.values(this.balances).map(balance => `
                        <div class="balance-card">
                            <h3>${balance.userName}</h3>
                            <div class="balance-amount ${balance.netBalance >= 0 ? 'positive' : 'negative'}">
                                ${balance.netBalance >= 0 ? '+' : ''}¥${balance.netBalance.toFixed(2)}
                            </div>
                            <div>总支出: ¥${balance.totalPaid.toFixed(2)}</div>
                            <div>应支付: ¥${balance.totalOwed.toFixed(2)}</div>
                            <div>已收到: ¥${balance.totalReceived.toFixed(2)}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="settlement-suggestions">
                    <h2>结算建议</h2>
                    ${this.settlementSuggestions.length > 0 ? 
                        this.settlementSuggestions.map(s => `
                            <div class="suggestion">
                                ${s.description} - ¥${s.amount.toFixed(2)}
                            </div>
                        `).join('') : 
                        '<p>所有成员余额已结清</p>'
                    }
                </div>
                
                <div class="statistics">
                    <h2>统计信息</h2>
                    <p>总支出: ¥${statistics.totalExpenses.toFixed(2)}</p>
                    <p>总支付: ¥${statistics.totalPayments.toFixed(2)}</p>
                    <p>成员数量: ${this.groupMembers.length}</p>
                    <p>支出记录数: ${this.expenses.length}</p>
                    <p>支付记录数: ${this.payments.length}</p>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * 获取财务统计信息
     */
    getFinancialStatistics() {
        return {
            totalExpenses: this.expenses.reduce((sum, e) => sum + e.amount, 0),
            totalPayments: this.payments.reduce((sum, p) => sum + p.amount, 0),
            averageExpense: this.expenses.length > 0 ? 
                this.expenses.reduce((sum, e) => sum + e.amount, 0) / this.expenses.length : 0,
            memberCount: this.groupMembers.length,
            expenseCount: this.expenses.length,
            paymentCount: this.payments.length,
            unsettledAmount: Object.values(this.balances).reduce((sum, b) => 
                sum + Math.abs(b.netBalance), 0) / 2
        };
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
}

// 创建全局实例
window.balanceManager = new BalanceManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BalanceManager;
}