// settlement.js - 结算功能
// 防止缓存版本: 2025.11.10
const JS_CACHE_VERSION = '2025.11.10.001';

import { getAuthToken, centsToAmountString, showCustomAlert, closeCustomAlert } from '../ui/utils.js';

// --- 全局状态 ---
let currentSettlementData = null;

/**
 * 获取群组的结算信息 - 修复版本
 * @param {number} groupId - 群组ID
 * @returns {Promise<Object>} 结算信息
 */
export async function getSettlementInfo(groupId) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('未找到认证token');
        }

        console.log('获取群组结算信息:', groupId);
        
        // 使用正确的API端点
        const endpoint = `/groups/${groupId}/settlement`;
        console.log('调用API端点:', endpoint);
        
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('结算信息:', data);
            return data;
        } else {
            const errorText = await response.text();
            console.error('API调用失败:', response.status, errorText);
            
            // 根据状态码返回不同的错误信息
            if (response.status === 404) {
                return {
                    balances: [],
                    group_id: groupId,
                    message: '该群组暂无结算数据'
                };
            } else if (response.status === 401) {
                return {
                    balances: [],
                    group_id: groupId,
                    error: '认证失败，请重新登录',
                    message: '认证失败，请重新登录'
                };
            } else {
                return {
                    balances: [],
                    group_id: groupId,
                    error: `服务器错误 (${response.status})`,
                    message: '获取结算信息失败，请稍后再试'
                };
            }
        }
        
    } catch (error) {
        console.error('获取结算信息失败:', error);
        
        // 网络错误或其他异常
        return {
            balances: [],
            group_id: groupId,
            error: error.message,
            message: '网络连接失败，请检查网络后重试'
        };
    }
}

/**
 * 计算结算金额
 * @param {Object} settlementData - 结算数据
 * @returns {Object} 计算后的结算信息
 */
export function calculateSettlementAmounts(settlementData) {
    if (!settlementData) {
        return {
            totalOwedByMe: 0,
            totalOwedToMe: 0,
            settlementCount: 0,
            details: [],
            error: '没有结算数据',
            message: '暂无结算数据'
        };
    }

    // 处理错误情况
    if (settlementData.error) {
        return {
            totalOwedByMe: 0,
            totalOwedToMe: 0,
            settlementCount: 0,
            details: [],
            error: settlementData.error,
            message: settlementData.message || '获取结算信息失败'
        };
    }

    // 获取余额数据，支持不同的数据格式
    let balances = [];
    
    if (settlementData.balances && Array.isArray(settlementData.balances)) {
        // 标准格式：{ balances: [...] }
        balances = settlementData.balances;
    } else if (settlementData.settlements && Array.isArray(settlementData.settlements)) {
        // 备选格式：{ settlements: [...] }
        balances = settlementData.settlements;
    } else {
        // 返回空结果
        return {
            totalOwedByMe: 0,
            totalOwedToMe: 0,
            settlementCount: 0,
            details: [],
            error: null,
            message: settlementData.message || '暂无结算数据'
        };
    }

    let totalOwedByMe = 0; // 我欠别人的总金额
    let totalOwedToMe = 0; // 别人欠我的总金额
    let settlementCount = 0; // 待结算笔数
    const details = [];

    for (const balance of balances) {
        // 确保balance是有效对象
        if (!balance || typeof balance !== 'object') {
            console.warn('跳过无效的余额记录:', balance);
            continue;
        }

        // 获取金额，处理不同的字段名
        const amount = balance.amount || balance.balance || balance.total || 0;
        const memberId = balance.member_id || balance.user_id || balance.id;
        const memberName = balance.member_name || balance.user_name || balance.name || getMemberNameById(memberId);

        if (amount > 0) {
            // 别人欠我钱
            totalOwedToMe += amount;
            details.push({
                type: 'owed_to_me',
                memberId: memberId,
                memberName: memberName,
                amount: amount,
                description: `${memberName} 欠我 ¥${centsToAmountString(amount)}`
            });
        } else if (amount < 0) {
            // 我欠别人钱
            const owedAmount = Math.abs(amount);
            totalOwedByMe += owedAmount;
            settlementCount++;
            details.push({
                type: 'owed_by_me',
                memberId: memberId,
                memberName: memberName,
                amount: owedAmount,
                description: `我欠 ${memberName} ¥${centsToAmountString(owedAmount)}`
            });
        }
    }

    return {
        totalOwedByMe,
        totalOwedToMe,
        settlementCount,
        details,
        netBalance: totalOwedToMe - totalOwedByMe,
        error: null,
        message: null
    };
}

/**
 * 根据ID获取成员名称
 * @param {number} memberId - 成员ID
 * @returns {string} 成员名称
 */
function getMemberNameById(memberId) {
    const members = window.groupMembers || [];
    const member = members.find(m => {
        return m.user_id === memberId || 
               m.id === memberId || 
               (m.user && m.user.id === memberId);
    });
    
    if (member) {
        return member.user?.username || 
               member.username || 
               member.nickname || 
               member.name || 
               `用户 ${memberId}`;
    }
    
    return `用户 ${memberId}`;
}

/**
 * 更新结算摘要显示 - 修复版本
 * @param {Object} calculation - 计算结果
 */
export function updateSettlementSummary(calculation) {
    const summaryElement = document.getElementById('settlement-summary-text');
    if (!summaryElement) return;

    // 处理错误情况
    if (calculation.error) {
        summaryElement.textContent = '结算功能暂时不可用';
        summaryElement.className = 'text-xl font-bold text-gray-500 mt-1';
        return;
    }

    // 正常情况
    if (calculation.settlementCount === 0) {
        summaryElement.textContent = '暂无待结算项目';
        summaryElement.className = 'text-xl font-bold text-gray-500 mt-1';
    } else {
        summaryElement.textContent = `总计 ${calculation.settlementCount} 笔待清算`;
        summaryElement.className = 'text-xl font-bold text-gray-900 mt-1';
    }
}

/**
 * 显示结算确认弹窗 - 修复版本
 * @param {Object} calculation - 计算结果
 */
export function showSettlementConfirmation(calculation) {
    // 处理错误情况
    if (calculation.error) {
        showCustomAlert('提示', calculation.message || '结算功能暂时不可用，请稍后再试');
        return;
    }

    if (calculation.settlementCount === 0) {
        showCustomAlert('提示', '当前没有需要结算的项目');
        return;
    }

    // 创建结算详情内容
    let detailsHtml = '';
    calculation.details.forEach(detail => {
        if (detail.type === 'owed_by_me') {
            detailsHtml += `<li class="mb-2 text-sm">• ${detail.description}</li>`;
        }
    });

    const message = `
        <div class="text-left">
            <p class="mb-3 font-medium">即将结算以下项目：</p>
            <ul class="mb-4">
                ${detailsHtml}
            </ul>
            <p class="text-lg font-bold text-red-600">
                预计支出：¥${centsToAmountString(calculation.totalOwedByMe)}
            </p>
        </div>
    `;

    showCustomAlert('确认结算', message);
    
    // 添加确认按钮事件
    const modal = document.getElementById('custom-alert-modal');
    if (modal) {
        // 移除旧的事件监听器
        const newModal = modal.cloneNode(true);
        modal.parentNode.replaceChild(newModal, modal);
        
        // 添加确认按钮
        const confirmButton = document.createElement('button');
        confirmButton.textContent = '确认结算';
        confirmButton.className = 'mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition duration-150';
        confirmButton.onclick = () => {
            closeCustomAlert();
            executeSettlement();
        };
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.className = 'mt-4 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition duration-150 ml-2';
        cancelButton.onclick = () => closeCustomAlert();
        
        const messageElement = document.getElementById('alert-message');
        if (messageElement) {
            messageElement.innerHTML = message;
            messageElement.appendChild(confirmButton);
            messageElement.appendChild(cancelButton);
        }
    }
}

/**
 * 执行结算操作 - 修复版本
 */
export async function executeSettlement() {
    if (!currentSettlementData || !currentSettlementData.group_id) {
        showCustomAlert('错误', '缺少必要参数，无法执行结算');
        return;
    }

    try {
        showCustomAlert('处理中', '正在执行结算，请稍候...');
        
        const token = getAuthToken();
        if (!token) {
            throw new Error('未找到认证token');
        }

        console.log('执行结算操作:', currentSettlementData.group_id);
        
        // 使用正确的结算API端点
        const endpoint = `/groups/${currentSettlementData.group_id}/settlement`;
        console.log('调用结算API端点:', endpoint);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                group_id: currentSettlementData.group_id
            })
        });

        if (response.ok) {
            const responseData = await response.json();
            console.log('结算成功响应:', responseData);
            showCustomAlert('结算成功', '结算操作已成功完成！');
            
            // 刷新页面以更新所有数据
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            return responseData;
        } else {
            let errorMessage = '结算操作失败';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.detail || errorMessage;
            } catch (e) {
                errorMessage = `服务器错误 (${response.status})`;
            }
            
            console.error('结算失败:', errorMessage);
            throw new Error(errorMessage);
        }
        
    } catch (error) {
        console.error('结算失败:', error);
        
        // 根据错误类型显示不同的错误信息
        if (error.message.includes('认证') || error.message.includes('token')) {
            showCustomAlert('认证失败', '请重新登录后重试');
        } else if (error.message.includes('网络')) {
            showCustomAlert('网络错误', '网络连接失败，请检查网络后重试');
        } else {
            showCustomAlert('结算失败', error.message || '结算操作失败，请重试');
        }
    }
}

/**
 * 处理结算所有欠款 - 主要入口函数
 */
export async function handleSettleUp() {
    try {
        console.log('处理结算所有欠款');
        
        // 获取当前群组ID
        const currentGroupId = window.CURRENT_GROUP_ID || window.currentGroupId;
        if (!currentGroupId) {
            showCustomAlert('错误', '无法获取当前群组信息');
            return;
        }

        // 显示加载状态
        showCustomAlert('处理中', '正在计算待结算金额...');
        
        // 获取结算信息
        const settlementData = await getSettlementInfo(currentGroupId);
        currentSettlementData = settlementData;
        
        // 计算结算金额
        const calculation = calculateSettlementAmounts(settlementData);
        
        // 更新显示
        updateSettlementSummary(calculation);
        
        // 关闭加载提示
        closeCustomAlert();
        
        // 显示确认弹窗
        showSettlementConfirmation(calculation);
        
    } catch (error) {
        console.error('处理结算失败:', error);
        showCustomAlert('错误', error.message || '获取结算信息失败');
    }
}

/**
 * 刷新结算记录列表 - 修复版本
 */
export function refreshSettlementRecords() {
    try {
        const currentGroupId = window.CURRENT_GROUP_ID || window.currentGroupId;
        if (!currentGroupId) {
            console.warn('无法获取当前群组ID');
            return;
        }

        // 获取结算信息并刷新显示
        getSettlementInfo(currentGroupId).then(settlementData => {
            currentSettlementData = settlementData;
            const calculation = calculateSettlementAmounts(settlementData);
            updateSettlementSummary(calculation);
        }).catch(error => {
            console.error('刷新结算记录失败:', error);
            // 显示友好的错误状态
            const summaryElement = document.getElementById('settlement-summary-text');
            if (summaryElement) {
                summaryElement.textContent = '结算功能暂时不可用';
                summaryElement.className = 'text-xl font-bold text-gray-500 mt-1';
            }
        });
        
    } catch (error) {
        console.error('刷新结算记录失败:', error);
    }
}

/**
 * 获取结算历史记录 - 修复版本
 * @param {number} groupId - 群组ID
 * @param {number} page - 页码
 * @param {number} limit - 每页数量
 * @returns {Promise<Object>} 结算历史记录
 */
export async function getSettlementHistory(groupId, page = 1, limit = 10) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('未找到认证token');
        }

        console.log('获取结算历史记录:', { groupId, page, limit });
        
        // 使用正确的API端点
        const endpoint = `/groups/${groupId}/settlement/history?page=${page}&limit=${limit}`;
        console.log('调用结算历史API端点:', endpoint);
        
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('结算历史记录:', data);
            return data;
        } else {
            console.error('结算历史API调用失败:', response.status);
            return { 
                records: [], 
                total: 0, 
                page: 1, 
                limit: limit, 
                error: `获取历史记录失败 (${response.status})`
            };
        }
        
    } catch (error) {
        console.error('获取结算历史失败:', error);
        return { 
            records: [], 
            total: 0, 
            page: 1, 
            limit: limit, 
            error: error.message 
        };
    }
}

/**
 * 显示结算历史记录 - 修复版本
 * @param {Array} history - 历史记录
 */
export function displaySettlementHistory(history) {
    const container = document.getElementById('settlement-history-container');
    if (!container) return;

    // 处理错误情况
    if (history.error) {
        container.innerHTML = `
            <div class="text-center p-6 text-gray-500">
                <i class="fa-solid fa-exclamation-triangle text-5xl text-gray-300 mb-3"></i>
                <p>结算历史功能暂时不可用</p>
                <p class="text-sm text-gray-400 mt-2">${history.error}</p>
            </div>
        `;
        return;
    }

    if (!history.records || history.records.length === 0) {
        container.innerHTML = `
            <div class="text-center p-6 text-gray-500">
                <i class="fa-solid fa-history text-5xl text-gray-300 mb-3"></i>
                <p>暂无结算历史记录</p>
            </div>
        `;
        return;
    }

    container.innerHTML = history.records.map(record => `
        <div class="bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm">
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-medium text-gray-800">结算记录 #${record.id}</h4>
                <span class="text-sm text-gray-500">${new Date(record.created_at).toLocaleString('zh-CN')}</span>
            </div>
            <p class="text-sm text-gray-600 mb-2">
                群组：${record.group_name || '未知群组'}
            </p>
            <p class="text-sm text-gray-600 mb-2">
                结算金额：¥${centsToAmountString(record.amount)}
            </p>
            <p class="text-sm text-gray-600">
                状态：<span class="${record.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}">
                    ${record.status === 'completed' ? '已完成' : '处理中'}
                </span>
            </p>
        </div>
    `).join('');
}

// 初始化结算模块 - 修复版本
export function initializeSettlementModule() {
    console.log('结算模块初始化');
    
    // 绑定结算按钮事件（如果存在）
    const settleUpButton = document.querySelector('button[onclick="handleSettleUp()"]');
    if (settleUpButton) {
        settleUpButton.addEventListener('click', handleSettleUp);
    }
    
    // 加载当前结算状态
    if (window.CURRENT_GROUP_ID || window.currentGroupId) {
        refreshSettlementRecords();
    }
}

// 暴露所有结算相关函数到全局 window 对象
window.handleSettleUp = handleSettleUp;
window.handleSettleUpFromSettlement = handleSettleUp; // 供group_page.js调用的别名
window.getSettlementInfo = getSettlementInfo;
window.calculateSettlementAmounts = calculateSettlementAmounts;
window.updateSettlementSummary = updateSettlementSummary;
window.showSettlementConfirmation = showSettlementConfirmation;
window.executeSettlement = executeSettlement;
window.refreshSettlementRecords = refreshSettlementRecords;
window.getSettlementHistory = getSettlementHistory;
window.displaySettlementHistory = displaySettlementHistory;
window.initializeSettlementModule = initializeSettlementModule;

console.log('结算模块已加载，所有函数已暴露到全局');
