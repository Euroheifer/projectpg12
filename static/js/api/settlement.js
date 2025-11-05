// settlement.js - 结算功能模块
// 处理群组内债务结算的核心功能

import { BaseAPI } from './base-api.js';

/**
 * SettlementAPI - 结算功能API类
 * 继承BaseAPI，提供统一的结算操作接口
 */
class SettlementAPI extends BaseAPI {
    constructor() {
        super('/groups');
    }

    /**
     * 处理一键结算所有欠款
     * @param {number} groupId - 群组ID
     * @returns {Promise<Object>} 结算结果
     */
    async handleSettleUp(groupId) {
        if (!this._validateGroupId(groupId)) {
            throw new Error('无效的群组ID');
        }

        try {
            // 显示加载状态
            this._showLoadingMessage('正在计算结算方案...');

            // 1. 获取群组成员信息
            const members = await this._getGroupMembers(groupId);
            if (!members || members.length === 0) {
                throw new Error('群组成员信息获取失败');
            }

            // 2. 计算每个人的净余额
            const netBalances = await this._calculateNetBalances(groupId, members);
            
            // 3. 生成最优结算方案
            const settlementPlan = this._generateSettlementPlan(netBalances);
            
            // 4. 如果没有需要结算的金额
            if (settlementPlan.settlements.length === 0) {
                this._hideLoadingMessage();
                return {
                    success: true,
                    message: '暂无需要结算的金额',
                    settlements: [],
                    total_amount: 0
                };
            }

            // 5. 显示结算确认对话框
            await this._showSettlementConfirmation(settlementPlan);
            
            // 6. 等待用户确认
            const confirmed = await this._waitForUserConfirmation();
            if (!confirmed) {
                this._hideLoadingMessage();
                return { success: false, message: '用户取消结算' };
            }

            // 7. 执行结算
            this._showLoadingMessage('正在执行结算...');
            const result = await this._executeSettlement(groupId, settlementPlan.settlements);
            
            this._hideLoadingMessage();
            
            if (result.success) {
                this._showSuccessMessage('结算成功！', 1500);
                // 延迟刷新页面以显示更新后的余额
                setTimeout(() => {
                    if (typeof window !== 'undefined' && window.location) {
                        window.location.reload();
                    }
                }, 1500);
            }

            return result;
        } catch (error) {
            this._hideLoadingMessage();
            console.error('结算处理错误:', error);
            this._showErrorMessage('结算失败: ' + error.message);
            throw error;
        }
    }

    /**
     * 获取结算计划预览（不执行结算）
     * @param {number} groupId - 群组ID
     * @returns {Promise<Object>} 结算计划
     */
    async getSettlementPreview(groupId) {
        if (!this._validateGroupId(groupId)) {
            throw new Error('无效的群组ID');
        }

        try {
            const members = await this._getGroupMembers(groupId);
            const netBalances = await this._calculateNetBalances(groupId, members);
            const settlementPlan = this._generateSettlementPlan(netBalances);
            
            return {
                success: true,
                settlements: settlementPlan.settlements,
                total_amount: settlementPlan.total_amount,
                transaction_count: settlementPlan.settlements.length,
                optimized: settlementPlan.optimized,
                message: `预计需要 ${settlementPlan.settlements.length} 笔交易，总金额 ¥${settlementPlan.total_amount.toFixed(2)}`
            };
        } catch (error) {
            console.error('获取结算预览失败:', error);
            throw error;
        }
    }

    /**
     * 获取结算历史
     * @param {number} groupId - 群组ID
     * @param {number} limit - 限制数量
     * @returns {Promise<Array>} 结算历史列表
     */
    async getSettlementHistory(groupId, limit = 20) {
        if (!this._validateGroupId(groupId)) {
            throw new Error('无效的群组ID');
        }

        try {
            const endpoint = `${this._getGroupEndpoint(groupId)}/settlements/history?limit=${limit}`;
            const response = await this.get(endpoint);
            return response;
        } catch (error) {
            console.error('获取结算历史失败:', error);
            throw error;
        }
    }

    /**
     * 手动创建结算记录
     * @param {number} groupId - 群组ID
     * @param {Object} settlement - 结算信息
     * @returns {Promise<Object>} 创建结果
     */
    async createManualSettlement(groupId, settlement) {
        if (!this._validateGroupId(groupId)) {
            throw new Error('无效的群组ID');
        }

        // 验证结算信息
        const validation = this._validateSettlement(settlement);
        if (!validation.isValid) {
            throw new Error('结算信息验证失败: ' + validation.errors.join(', '));
        }

        try {
            const endpoint = `${this._getGroupEndpoint(groupId)}/settlements/manual`;
            const response = await this.post(endpoint, settlement);
            return response;
        } catch (error) {
            console.error('创建手动结算失败:', error);
            throw error;
        }
    }

    // ==================== 私有方法 ====================

    /**
     * 验证群组ID
     * @param {number} groupId - 群组ID
     * @returns {boolean} 是否有效
     */
    _validateGroupId(groupId) {
        return groupId && Number.isInteger(groupId) && groupId > 0;
    }

    /**
     * 获取群组成员（假设有members API）
     * @param {number} groupId - 群组ID
     * @returns {Promise<Array>} 成员列表
     */
    async _getGroupMembers(groupId) {
        try {
            // 如果有members API，使用它
            if (typeof window !== 'undefined' && window.membersAPI) {
                return await window.membersAPI.getGroupMembers(groupId);
            }
            
            // 否则直接从API获取
            const response = await this.get(`${this._getGroupEndpoint(groupId)}/members`);
            return response.members || response;
        } catch (error) {
            console.error('获取群组成员失败:', error);
            throw new Error('获取群组成员信息失败');
        }
    }

    /**
     * 计算每个成员的净余额
     * @param {number} groupId - 群组ID
     * @param {Array} members - 成员列表
     * @returns {Promise<Array>} 净余额列表
     */
    async _calculateNetBalances(groupId, members) {
        try {
            const balances = [];
            
            for (const member of members) {
                // 获取该成员的所有费用和支付
                const expenses = await this._getMemberExpenses(groupId, member.id);
                const payments = await this._getMemberPayments(groupId, member.id);
                
                // 计算净余额 (支付总额 - 分摊金额)
                const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
                const totalShare = expenses.reduce((sum, expense) => {
                    const memberShare = expense.splits?.find(s => s.user_id === member.id);
                    return sum + (memberShare ? memberShare.amount : 0);
                }, 0);
                
                const balance = totalPaid - totalShare;
                
                balances.push({
                    user_id: member.id,
                    username: member.username,
                    balance: balance,
                    total_paid: totalPaid,
                    total_owed: totalShare,
                    is_creditor: balance > 0.01,
                    is_debtor: balance < -0.01
                });
            }
            
            return balances;
        } catch (error) {
            console.error('计算净余额失败:', error);
            throw new Error('计算成员余额失败');
        }
    }

    /**
     * 获取成员的费用分摊
     * @param {number} groupId - 群组ID
     * @param {number} userId - 用户ID
     * @returns {Promise<Array>} 费用列表
     */
    async _getMemberExpenses(groupId, userId) {
        try {
            const endpoint = `${this._getGroupEndpoint(groupId)}/expenses?user_id=${userId}`;
            const response = await this.get(endpoint);
            return response.expenses || response;
        } catch (error) {
            console.warn(`获取用户${userId}的费用失败:`, error);
            return [];
        }
    }

    /**
     * 获取成员的支付记录
     * @param {number} groupId - 群组ID
     * @param {number} userId - 用户ID
     * @returns {Promise<Array>} 支付列表
     */
    async _getMemberPayments(groupId, userId) {
        try {
            const endpoint = `${this._getGroupEndpoint(groupId)}/payments?user_id=${userId}`;
            const response = await this.get(endpoint);
            return response.payments || response;
        } catch (error) {
            console.warn(`获取用户${userId}的支付失败:`, error);
            return [];
        }
    }

    /**
     * 生成最优结算方案
     * @param {Array} netBalances - 净余额列表
     * @returns {Object} 结算方案
     */
    _generateSettlementPlan(netBalances) {
        // 分离债权人和债务人
        const creditors = netBalances
            .filter(b => b.balance > 0.01)
            .sort((a, b) => b.balance - a.balance);
            
        const debtors = netBalances
            .filter(b => b.balance < -0.01)
            .sort((a, b) => a.balance - b.balance);

        const settlements = [];
        let i = 0, j = 0;

        // 贪心算法生成最少交易次数的结算方案
        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];
            
            const settlementAmount = Math.min(-debtor.balance, creditor.balance);
            
            if (settlementAmount > 0.01) {  // 忽略小于1分的结算
                settlements.push({
                    from_user_id: debtor.user_id,
                    to_user_id: creditor.user_id,
                    from_username: debtor.username,
                    to_username: creditor.username,
                    amount: Number(settlementAmount.toFixed(2)),
                    description: `群组结算 - ${debtor.username} 向 ${creditor.username} 支付`
                });
            }
            
            debtor.balance += settlementAmount;
            creditor.balance -= settlementAmount;
            
            if (Math.abs(debtor.balance) < 0.01) i++;
            if (creditor.balance < 0.01) j++;
        }

        const totalAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
        
        // 计算优化效果（原为 n-1 笔交易，优化后为实际笔数）
        const originalTransactions = Math.max(creditors.length, debtors.length) - 1;
        const optimized = settlements.length < originalTransactions;

        return {
            settlements,
            total_amount: Number(totalAmount.toFixed(2)),
            optimized,
            original_estimated: originalTransactions,
            actual_transactions: settlements.length
        };
    }

    /**
     * 显示结算确认对话框
     * @param {Object} settlementPlan - 结算方案
     */
    async _showSettlementConfirmation(settlementPlan) {
        return new Promise((resolve) => {
            // 尝试使用全局函数
            if (typeof window !== 'undefined') {
                // 设置全局确认回调
                window._settlementConfirmationResolve = resolve;
                
                // 如果有全局确认函数，调用它
                if (typeof window.showSettlementConfirmation === 'function') {
                    window.showSettlementConfirmation(settlementPlan);
                    return;
                }
                
                // 否则使用自定义对话框
                this._createCustomConfirmationDialog(settlementPlan);
                return;
            }
            
            // 如果没有window对象，直接解析为true
            resolve(true);
        });
    }

    /**
     * 创建自定义确认对话框
     * @param {Object} settlementPlan - 结算方案
     */
    _createCustomConfirmationDialog(settlementPlan) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 class="text-lg font-semibold mb-4">确认结算</h3>
                <div class="mb-4">
                    <p class="text-sm text-gray-600 mb-2">
                        将执行 ${settlementPlan.settlements.length} 笔交易，总金额 ¥${settlementPlan.total_amount.toFixed(2)}
                        ${settlementPlan.optimized ? `（已优化，减少了 ${settlementPlan.original_estimated - settlementPlan.actual_transactions} 笔交易）` : ''}
                    </p>
                    <div class="max-h-40 overflow-y-auto border rounded p-2">
                        ${settlementPlan.settlements.map(s => 
                            `<div class="text-sm py-1">${s.from_username} → ${s.to_username}: ¥${s.amount.toFixed(2)}</div>`
                        ).join('')}
                    </div>
                </div>
                <div class="flex gap-2 justify-end">
                    <button onclick="window._settlementConfirmationResolve(false); document.body.removeChild(this.closest('.fixed'))" 
                            class="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50">
                        取消
                    </button>
                    <button onclick="window._settlementConfirmationResolve(true); document.body.removeChild(this.closest('.fixed'))" 
                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        确认结算
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * 等待用户确认
     * @returns {Promise<boolean>} 用户是否确认
     */
    _waitForUserConfirmation() {
        return new Promise((resolve) => {
            // 设置超时，避免无限等待
            setTimeout(() => {
                if (typeof window !== 'undefined' && window._settlementConfirmationResolve) {
                    resolve(false);
                    delete window._settlementConfirmationResolve;
                }
            }, 300000); // 5分钟超时
        });
    }

    /**
     * 执行结算
     * @param {number} groupId - 群组ID
     * @param {Array} settlements - 结算列表
     * @returns {Promise<Object>} 执行结果
     */
    async _executeSettlement(groupId, settlements) {
        try {
            const endpoint = `${this._getGroupEndpoint(groupId)}/settlements`;
            const response = await this.post(endpoint, { settlements });
            return response;
        } catch (error) {
            console.error('执行结算失败:', error);
            throw error;
        }
    }

    /**
     * 验证结算信息
     * @param {Object} settlement - 结算信息
     * @returns {Object} 验证结果
     */
    _validateSettlement(settlement) {
        const errors = [];
        
        if (!settlement.from_user_id || !Number.isInteger(settlement.from_user_id)) {
            errors.push('无效的付款人ID');
        }
        
        if (!settlement.to_user_id || !Number.isInteger(settlement.to_user_id)) {
            errors.push('无效的收款人ID');
        }
        
        if (settlement.from_user_id === settlement.to_user_id) {
            errors.push('付款人和收款人不能是同一人');
        }
        
        if (!settlement.amount || typeof settlement.amount !== 'number' || settlement.amount <= 0) {
            errors.push('无效的结算金额');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * 获取群组端点
     * @param {number} groupId - 群组ID
     * @returns {string} 端点路径
     */
    _getGroupEndpoint(groupId) {
        return `${this.baseEndpoint}/${groupId}`;
    }

    /**
     * 显示加载消息
     * @param {string} message - 消息内容
     */
    _showLoadingMessage(message) {
        if (typeof window !== 'undefined' && typeof window.showCustomAlert === 'function') {
            window.showCustomAlert(message, false);
        } else {
            console.log('加载:', message);
        }
    }

    /**
     * 隐藏加载消息
     */
    _hideLoadingMessage() {
        // 静默处理
    }

    /**
     * 显示成功消息
     * @param {string} message - 消息内容
     * @param {number} timeout - 超时时间
     */
    _showSuccessMessage(message, timeout = 3000) {
        if (typeof window !== 'undefined' && typeof window.showCustomAlert === 'function') {
            window.showCustomAlert(message, false);
        } else {
            console.log('成功:', message);
        }
    }

    /**
     * 显示错误消息
     * @param {string} message - 消息内容
     */
    _showErrorMessage(message) {
        if (typeof window !== 'undefined' && typeof window.showCustomAlert === 'function') {
            window.showCustomAlert(message, true);
        } else {
            console.error('错误:', message);
        }
    }
}

// 创建全局实例
const settlementAPI = new SettlementAPI();

// 导出API实例和主要函数
export { SettlementAPI, settlementAPI };
export { settlementAPI as default };

// 全局函数暴露（用于HTML事件绑定）
if (typeof window !== 'undefined') {
    window.settlementAPI = settlementAPI;
    window.handleSettleUp = (groupId) => settlementAPI.handleSettleUp(groupId);
    window.getSettlementPreview = (groupId) => settlementAPI.getSettlementPreview(groupId);
    window.getSettlementHistory = (groupId, limit) => settlementAPI.getSettlementHistory(groupId, limit);
}

// 暴露函数到全局
window.handleSettleUp = handleSettleUp;
window.confirmSettlement = confirmSettlement;
window.cancelSettlement = cancelSettlement;
window.showSettlementHistory = showSettlementHistory;
window.closeSettlementHistory = closeSettlementHistory;
window.clearSettlementHistory = clearSettlementHistory;
window.exportSettlementData = exportSettlementData;

console.log('结算模块已加载，所有函数已暴露到全局');