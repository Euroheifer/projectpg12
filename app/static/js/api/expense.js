// expense.js - 费用相关的CRUD操作、分摊计算、表单处理
// 防止缓存版本: 2025.11.10.007 (Gemini 修复版)
const JS_CACHE_VERSION = '2025.11.10.007';

// 🔴 修复：导入必须在顶层
import { 
    getTodayDate, 
    requireAdmin, 
    getAuthToken, 
    showCustomAlert, 
    amountToCents as importedAmountToCents, // 🔴 修复：重命名导入
    centsToAmountString as importedCentsToAmountString // 🔴 修复：重命名导入
} from '../ui/utils.js';
// 🔴 修复：amount_utils.js 不存在，utils.js 已经包含了这些函数
// import { centsToAmountString } from './amount_utils.js'; 

// --- 🔴 修复：使用从 utils.js 导入的函数 ---
const centsToAmountString = importedCentsToAmountString;
const amountToCents = importedAmountToCents;

// --- 全局状态 ---
let selectedParticipants = new Set();
let currentSplitMethod = 'equal';
let memberSplits = []; // 存储分摊详情 (金额单位：分)
let currentEditingExpense = null;
let currentEditingExpenseId = null; //for update function 04 Nov

// 🔴 修复：为“详情”弹窗添加独立的状态
let detailMemberSplits = []; // (金额单位：分)


// =================================================================
// --- 🔴 修复：将所有辅助函数移动到文件顶部以解决提升问题 ---
// =================================================================

/**
 * 核心：计算 "添加费用" 弹窗的分摊
 * 🔴 修复：所有金额统一使用 "分" (cents)
 */
export function updateSplitCalculation() {
    const amountInput = document.getElementById('amount');
    if (!amountInput || !amountInput.value) {
        memberSplits = [];
        renderSplitDetails();
        updateSplitSummary();
        return;
    }
    
    // 1. 获取总金额 (分)
    const totalAmountInCents = amountToCents(amountInput.value);
    if (isNaN(totalAmountInCents) || totalAmountInCents <= 0) {
        memberSplits = [];
        renderSplitDetails();
        updateSplitSummary();
        return;
    }

    // 2. 获取选中的参与者
    const selectedMemberIds = Array.from(selectedParticipants);
    if (selectedMemberIds.length === 0) {
        memberSplits = [];
        renderSplitDetails();
        updateSplitSummary();
        return;
    }
    
    // 3. 初始化/更新分摊数据
    // 保留旧的自定义金额
    const oldSplits = [...memberSplits];
    memberSplits = selectedMemberIds.map(userId => {
        const member = window.groupMembers.find(m => m.user_id === userId);
        const existingSplit = oldSplits.find(s => s.user_id === userId);
        return {
            user_id: userId,
            // 🔴 修复：存储 "分"
            amount: existingSplit && currentSplitMethod === 'custom' ? existingSplit.amount : 0, 
            member_name: member ? (member.user.username || member.nickname) : `User ${userId}`
        };
    });

    // 4. 根据方式计算
    if (currentSplitMethod === 'equal') {
        const count = selectedMemberIds.length;
        const baseAmountInCents = Math.floor(totalAmountInCents / count);
        const remainderInCents = totalAmountInCents % count;
        
        memberSplits.forEach((split, index) => {
            split.amount = baseAmountInCents;
            if (index < remainderInCents) {
                split.amount += 1;
            }
        });
    } else {
        // 自定义分摊
        const sumCurrentSplits = memberSplits.reduce((sum, s) => sum + s.amount, 0);
        
        // 如果自定义总和不等于总金额 (或为0)，重新初始化为等额
        if (Math.abs(sumCurrentSplits - totalAmountInCents) > 1 || sumCurrentSplits === 0) {
            const count = selectedMemberIds.length;
            const baseAmountInCents = Math.floor(totalAmountInCents / count);
            const remainderInCents = totalAmountInCents % count;
            
            memberSplits.forEach((split, index) => {
                split.amount = baseAmountInCents;
                if (index < remainderInCents) {
                    split.amount += 1;
                }
            });
        }
    }

    // 5. 重新渲染UI
    renderSplitDetails();
    updateSplitSummary();
    
    console.log('分摊计算完成 (分):', memberSplits);
}

/**
 * 渲染 "添加费用" 弹窗的分摊详情列表
 * 🔴 修复：所有金额统一使用 "分" (cents)
 */
export function renderSplitDetails() {
    const container = document.getElementById('split-list') || document.getElementById('split-details-container');
    if (!container) {
        console.warn('分摊详情容器未找到');
        return;
    }
    
    if (memberSplits.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-gray-500"><p>请选择参与者</p></div>`;
        return;
    }
    
    container.innerHTML = memberSplits.map(split => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                    ${split.member_name.charAt(0).toUpperCase()}
                </div>
                <span class="font-medium text-gray-800">${split.member_name}</span>
            </div>
            <div class="flex items-center space-x-2">
                ${currentSplitMethod === 'custom' ? `
                    <div class="flex items-center space-x-1">
                        <span class="text-gray-500">$</span>
                        <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value="${centsToAmountString(split.amount)}"
                            class="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            onchange="handleCustomAmountChange(this, ${split.user_id})"
                        >
                    </div>
                ` : `
                    <span class="font-semibold text-primary">$${centsToAmountString(split.amount)}</span>
                `}
            </div>
        </div>
    `).join('');
}

/**
 * 更新 "添加费用" 弹窗的分摊摘要
 * 🔴 修复：所有金额统一使用 "分" (cents)
 */
export function updateSplitSummary() {
    const summaryContainer = document.getElementById('split-summary') || document.getElementById('split-summary-container');
    if (!summaryContainer) {
        console.warn('分摊摘要容器未找到');
        return;
    }
    
    const amountInput = document.getElementById('amount');
    const totalAmountInCents = amountToCents(amountInput ? amountInput.value : '0');
    
    const validation = validateSplitAmounts();
    const participantCount = memberSplits.length;
    
    const averageSplitInCents = participantCount > 0 ? totalAmountInCents / participantCount : 0;
    
    summaryContainer.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-blue-800">分摊摘要</span>
                <span class="text-xs text-blue-600">${currentSplitMethod === 'equal' ? '等额分摊' : '自定义分摊'}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="text-center">
                    <div class="text-lg font-bold text-blue-900">$${centsToAmountString(totalAmountInCents)}</div>
                    <div class="text-blue-600">总金额</div>
                </div>
                <div class="text-center">
                    <div class="text-lg font-bold text-blue-900">${participantCount}</div>
                    <div class="text-blue-600">参与人数</div>
                </div>
            </div>
            
            ${currentSplitMethod === 'equal' ? `
                <div class="text-center border-t border-blue-200 pt-2">
                    <div class="text-sm text-blue-700">
                        每人平均: <span class="font-semibold">$${centsToAmountString(averageSplitInCents)}</span>
                        ${(totalAmountInCents % participantCount !== 0) ? '<span class="text-xs">(已自动平分余数)</span>' : ''}
                    </div>
                </div>
            ` : ''}
            
            <div class="border-t border-blue-200 pt-2">
                <div class="flex justify-between items-center text-xs">
                    <span class="text-blue-700">分摊验证:</span>
                    <span class="font-medium ${
                        validation.isValid ? 'text-green-600' : 'text-red-600'
                    }">
                        ${validation.message}
                    </span>
                </div>
                ${!validation.isValid && validation.difference ? `
                    <div class="mt-1 text-xs text-gray-600">
                        当前分摊总和: $${centsToAmountString(validation.sumSplits)}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    const amountInputElement = document.getElementById('amount');
    if (amountInputElement) {
        if (validation.isValid) {
            amountInputElement.classList.remove('border-red-500', 'ring-red-500');
            amountInputElement.classList.add('border-green-500', 'ring-green-500');
        } else {
            amountInputElement.classList.remove('border-green-500', 'ring-green-500');
            amountInputElement.classList.add('border-red-500', 'ring-red-500');
        }
    }
}

/**
 * 验证 "添加费用" 弹窗的分摊金额
 * 🔴 修复：所有金额统一使用 "分" (cents)
 */
export function validateSplitAmounts() {
    const amountInput = document.getElementById('amount');
    if (!amountInput || !amountInput.value) {
        return { isValid: false, message: '请输入总金额' };
    }
    
    const totalAmountInCents = amountToCents(amountInput.value);
    if (isNaN(totalAmountInCents) || totalAmountInCents <= 0) {
        return { isValid: false, message: '请输入有效的总金额' };
    }
    
    const sumSplitsInCents = memberSplits.reduce((sum, split) => sum + (split.amount || 0), 0);
    const differenceInCents = totalAmountInCents - sumSplitsInCents;
    
    // 允许 1 分的误差范围（处理浮点数精度问题）
    if (Math.abs(differenceInCents) <= 1) { 
        if (differenceInCents !== 0 && memberSplits.length > 0) {
             memberSplits[0].amount += differenceInCents;
             console.log(`自动调整 ${differenceInCents} 分钱差异给 ${memberSplits[0].member_name}`);
        }
        return { isValid: true, message: '分摊金额匹配', sumSplits: totalAmountInCents };
    } else {
        const status = sumSplitsInCents > totalAmountInCents ? '超出' : '不足';
        return { 
            isValid: false, 
            message: `分摊金额${status} ¥${(Math.abs(differenceInCents) / 100).toFixed(2)}`,
            sumSplits: sumSplitsInCents,
            difference: differenceInCents
        };
    }
}

/**
 * 核心：计算 "费用详情" 弹窗的分摊
 * 🔴 修复：所有金额统一使用 "分" (cents)
 */
export function updateDetailSplitCalculation() {
    const form = document.querySelector('#expense-detail-modal #expense-detail-form');
    if (!form) {
        console.warn('详情表单未找到，无法计算分摊');
        return;
    }

    const amountInput = form.querySelector('#detail-amount');
    if (!amountInput || !amountInput.value) {
        detailMemberSplits = [];
        renderDetailSplitDetails();
        updateDetailSplitSummary();
        return;
    }

    const totalAmountInCents = amountToCents(amountInput.value);
    if (isNaN(totalAmountInCents) || totalAmountInCents <= 0) {
        detailMemberSplits = [];
        renderDetailSplitDetails();
        updateDetailSplitSummary();
        return;
    }

    // 获取选中的参与者
    const checkedInputs = form.querySelectorAll('#detail-participants-container input:checked');
    const participants = Array.from(checkedInputs).map(input => parseInt(input.value));
    
    if (participants.length === 0) {
        detailMemberSplits = [];
        renderDetailSplitDetails();
        updateDetailSplitSummary();
        return;
    }
    
    // 获取当前分摊方式
    const isEqualSplit = form.querySelector('#detail-split-equal').classList.contains('active');
    const method = isEqualSplit ? 'equal' : 'custom';

    // 初始化/更新分摊数据
    const oldSplits = [...detailMemberSplits];
    detailMemberSplits = participants.map(userId => {
        const member = window.groupMembers.find(m => m.user_id === userId);
        const existingSplit = oldSplits.find(s => s.user_id === userId); // 保留自定义金额
        return {
            user_id: userId,
            amount: existingSplit && method === 'custom' ? existingSplit.amount : 0, // 🔴 amount 存储分
            member_name: member ? (member.user.username || member.nickname) : `User ${userId}`
        };
    });

    if (method === 'equal') {
        const baseAmountInCents = Math.floor(totalAmountInCents / participants.length);
        const remainderInCents = totalAmountInCents % participants.length;
        
        detailMemberSplits.forEach((split, index) => {
            split.amount = baseAmountInCents;
            if (index < remainderInCents) {
                split.amount += 1;
            }
        });
    } else {
        // 自定义分摊
        const sumCurrentSplits = detailMemberSplits.reduce((sum, s) => sum + s.amount, 0);
        
        // 如果自定义总和不等于总金额 (或为0)，重新初始化为等额
        if (Math.abs(sumCurrentSplits - totalAmountInCents) > 1 || sumCurrentSplits === 0) {
            const baseAmountInCents = Math.floor(totalAmountInCents / participants.length);
            const remainderInCents = totalAmountInCents % participants.length;
            
            detailMemberSplits.forEach((split, index) => {
                split.amount = baseAmountInCents;
                if (index < remainderInCents) {
                    split.amount += 1;
                }
            });
        }
    }

    // 重新渲染UI
    renderDetailSplitDetails();
    updateDetailSplitSummary();
    
    console.log('详情分摊计算完成 (分):', detailMemberSplits);
}

/**
 * 渲染 "费用详情" 弹窗的分摊详情列表
 * 🔴 修复：所有金额统一使用 "分" (cents)
 */
export function renderDetailSplitDetails() {
    const container = document.getElementById('detail-split-list');
    if (!container) {
        console.warn('详情分摊容器未找到');
        return;
    }
    
    if (detailMemberSplits.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-gray-500"><p>请选择参与者</p></div>`;
        return;
    }
    
    const method = document.querySelector('#detail-split-equal').classList.contains('active') ? 'equal' : 'custom';
    
    container.innerHTML = detailMemberSplits.map(split => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                    ${split.member_name.charAt(0).toUpperCase()}
                </div>
                <span class="font-medium text-gray-800">${split.member_name}</span>
            </div>
            <div class="flex items-center space-x-2">
                ${method === 'custom' ? `
                    <div class="flex items-center space-x-1">
                        <span class="text-gray-500">$</span>
                        <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value="${centsToAmountString(split.amount)}"
                            class="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            onchange="handleDetailCustomAmountChange(this, ${split.user_id})"
                        >
                    </div>
                ` : `
                    <span class="font-semibold text-primary">$${centsToAmountString(split.amount)}</span>
                `}
            </div>
        </div>
    `).join('');
}

/**
 * 更新 "费用详情" 弹窗的分摊摘要
 * 🔴 修复：所有金额统一使用 "分" (cents)
 */
export function updateDetailSplitSummary() {
    const summaryContainer = document.getElementById('detail-split-summary');
    if (!summaryContainer) {
        console.warn('详情分摊摘要容器未找到');
        return;
    }
    
    const amountInput = document.getElementById('detail-amount');
    const totalAmountInCents = amountToCents(amountInput ? amountInput.value : '0');
    
    const validation = validateDetailSplitAmounts();
    const participantCount = detailMemberSplits.length;
    
    const averageSplitInCents = participantCount > 0 ? totalAmountInCents / participantCount : 0;
    
    summaryContainer.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-blue-800">分摊摘要</span>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="text-center">
                    <div class="text-lg font-bold text-blue-900">$${centsToAmountString(totalAmountInCents)}</div>
                    <div class="text-blue-600">总金额</div>
                </div>
                <div class="text-center">
                    <div class="text-lg font-bold text-blue-900">${participantCount}</div>
                    <div class="text-blue-600">参与人数</div>
                </div>
            </div>
            <div class="border-t border-blue-200 pt-2">
                <div class="flex justify-between items-center text-xs">
                    <span class="text-blue-700">分摊验证:</span>
                    <span class="font-medium ${
                        validation.isValid ? 'text-green-600' : 'text-red-600'
                    }">
                        ${validation.message}
                    </span>
                </div>
            </div>
        </div>
    `;
}

/**
 * 验证 "费用详情" 弹窗的分摊金额
 * 🔴 修复：所有金额统一使用 "分" (cents)
 */
export function validateDetailSplitAmounts() {
    const amountInput = document.getElementById('detail-amount');
    if (!amountInput || !amountInput.value) {
        return { isValid: false, message: '请输入总金额' };
    }
    
    const totalAmountInCents = amountToCents(amountInput.value);
    if (isNaN(totalAmountInCents) || totalAmountInCents <= 0) {
        return { isValid: false, message: '请输入有效的总金额' };
    }
    
    const sumSplitsInCents = detailMemberSplits.reduce((sum, split) => sum + (split.amount || 0), 0);
    const differenceInCents = totalAmountInCents - sumSplitsInCents;
    
    if (Math.abs(differenceInCents) <= 1) {
        if (differenceInCents !== 0 && detailMemberSplits.length > 0) {
             detailMemberSplits[0].amount += differenceInCents;
        }
        return { isValid: true, message: '分摊金额匹配' };
    } else {
        const status = sumSplitsInCents > totalAmountInCents ? '超出' : '不足';
        return { 
            isValid: false, 
            message: `分摊金额${status} ¥${(Math.abs(differenceInCents) / 100).toFixed(2)}`
        };
    }
}

/**
 * 处理 "添加费用" 弹窗中的自定义金额变化
 * 🔴 修复：所有金额统一使用 "分" (cents)
 */
export function handleCustomAmountChange(input, memberId) {
    const newValueInCents = amountToCents(input.value);
    
    const splitIndex = memberSplits.findIndex(s => s.user_id === memberId);
    if (splitIndex !== -1) {
        memberSplits[splitIndex].amount = newValueInCents;
    }
    
    validateSplitAmounts();
    updateSplitSummary();
    
    console.log('自定义金额更新 (分):', memberId, newValueInCents, memberSplits);
}

/**
 * 处理 "费用详情" 弹窗中的自定义金额变化
 * 🔴 修复：所有金额统一使用 "分" (cents)
 */
export function handleDetailCustomAmountChange(input, memberId) {
    const newValueInCents = amountToCents(input.value);
    
    const splitIndex = detailMemberSplits.findIndex(s => s.user_id === memberId);
    if (splitIndex !== -1) {
        detailMemberSplits[splitIndex].amount = newValueInCents;
    }
    
    validateDetailSplitAmounts();
    updateDetailSplitSummary();
    
    console.log('详情自定义金额更新 (分):', memberId, newValueInCents, detailMemberSplits);
}

// =================================================================
// --- 页面功能函数 (初始化、事件处理等) ---
// =================================================================

// ----------- 初始化费用表单 ---------------- //
export function initializeExpenseForm() {
    const today = getTodayDate();
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.value = today;

    if (!window.groupMembers || window.groupMembers.length === 0) {
        console.warn('initializeExpenseForm: groupMembers 未加载，500毫秒后重试...');
        setTimeout(initializeExpenseForm, 500);
        return;
    }
    console.log('initializeExpenseForm: groupMembers 已加载，开始填充表单。');
    
    const payerSelect = document.getElementById('payer');
    const participantsContainer = document.querySelector('#participants-section .grid');

    if (!payerSelect || !participantsContainer) {
        console.error('Expense form elements (payer or participants-section) not found!');
        return;
    }

    payerSelect.innerHTML = '';
    participantsContainer.innerHTML = '';

    if (window.groupMembers.length === 0) {
        console.warn('initializeExpenseForm: window.groupMembers is empty. Dropdowns will be empty.');
        payerSelect.innerHTML = '<option value="">No members found</option>';
        return;
    }

    window.groupMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.user_id;
        option.textContent = member.user.username || member.nickname || `User ${member.user_id}`;
        
        if (member.user_id === window.CURRENT_USER_ID) {
            option.selected = true;
        }
        payerSelect.appendChild(option);
    });

    selectedParticipants = new Set();
    window.groupMembers.forEach(member => {
        selectedParticipants.add(member.user_id);
        
        const label = document.createElement('label');
        label.className = 'flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-300 shadow-sm';
        
        const memberName = member.user.username || member.nickname || `User ${member.user_id}`;
		
        label.innerHTML = `
            <input 
                type="checkbox" 
                value="${member.user_id}" 
                class="participant-checkbox h-5 w-5 rounded text-primary focus:ring-primary" 
                checked
            >
            <span class="font-medium text-gray-800">${memberName}</span>
        `;
        
        label.querySelector('input').addEventListener('change', (e) => {
            const userId = parseInt(e.target.value, 10);
            if (e.target.checked) {
                selectedParticipants.add(userId);
            } else {
                selectedParticipants.delete(userId);
            }
            console.log('Participants updated:', selectedParticipants);
            
            // 🔴 修复：内部调用
            setTimeout(updateSplitCalculation, 100);
        });
        participantsContainer.appendChild(label);
    });

    console.log('Expense form initialized with members. Default participants:', selectedParticipants);
    
    // 🔴 修复：内部调用
    updateSplitCalculation();
    setSplitMethod('equal', false);
}
// --------------------- end --------------------------------- //

// ------------------- [START MODIFIED BLOCK: handleSaveExpense] -------------------
export async function handleSaveExpense(event) {
    event.preventDefault();
    console.log('Attempting to save expense...');

    const form = event.target;

    const description = form.querySelector('#description').value;
    const amountString = form.querySelector('#amount').value;
    const payer_id = parseInt(form.querySelector('#payer').value);
    const date = form.querySelector('#date').value;
    const receiptFile = form.querySelector('#receipt-file').files[0];

    const amountFloat = parseFloat(amountString);
    if (isNaN(amountFloat) || amountFloat <= 0) {
        showCustomAlert('Error', 'Please enter a valid, positive amount.');
        return;
    }
    const amountInCents = amountToCents(amountString); // 🔴 修复：使用转换函数

    if (selectedParticipants.size === 0) {
        showCustomAlert('Error', 'You must split the expense with at least one person.');
        return;
    }

    if (currentSplitMethod === 'custom') {
        const validation = validateSplitAmounts();
        if (!validation.isValid) {
            showCustomAlert('Error', `分摊金额验证失败: ${validation.message}`);
            return;
        }
    }

    // 🔴 修复：确保分摊计算在保存前是同步的
    updateSplitCalculation();
    
    const splits = Array.from(selectedParticipants).map(userId => {
        const splitRecord = memberSplits.find(s => s.user_id === userId);
        return { 
            user_id: userId, 
            amount: splitRecord ? splitRecord.amount : 0 // 🔴 amount 已经是分
        };
    });

    const formData = new FormData();
    formData.append('description', description);
    formData.append('amount', amountInCents); // 🔴 修复：发送 "分"
    formData.append('payer_id', payer_id);
    formData.append('date', date);
    formData.append('split_type', currentSplitMethod);
    formData.append('splits', JSON.stringify(splits)); 

    if (receiptFile) {
        formData.append('image_file', receiptFile); 
    }

    console.log('Sending expense data (FormData):', {
        description: description,
        amount: amountInCents,
        payer_id: payer_id,
        date: date,
        split_type: currentSplitMethod,
        splits: JSON.stringify(splits),
        hasFile: !!receiptFile
    });


    const token = getAuthToken();
    const groupId = window.currentGroupId; 

    try {
        const response = await fetch(`/groups/${groupId}/expenses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            let errorMessage = 'Failed to add expense. Unknown error.';

            if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    errorMessage = errorData.detail.map(err => {
                        let field = err.loc.length > 1 ? err.loc[err.loc.length - 1] : err.loc.join(' -> ');
                        return `${field}: ${err.msg}`;
                    }).join('; ');
                } else if (typeof errorData.detail === 'object') {
                    errorMessage = JSON.stringify(errorData.detail);
                }
            }
            console.error('Error response from server:', errorData);
            throw new Error(errorMessage);
        }

        const newExpense = await response.json();
        console.log('Expense added successfully:', newExpense);
        showCustomAlert('Success', 'Expense added successfully');

        form.reset();
        handleCancel(); // 🔴 修复：内部调用

        await window.loadExpensesList(); 

    } catch (error) {
        console.error('Error saving expense:', error);
        showCustomAlert('Error', error.message);
    }
}
// ------------------- [END MODIFIED BLOCK: handleSaveExpense] -------------------

export async function getGroupExpenses(groupId) {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`/groups/${groupId}/expenses`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('获取支出列表失败');
    }
    return await response.json();
}

export function refreshExpensesList() {
    const container = document.getElementById('expenses-list');
    if (!container) return;

    if (window.expensesList.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>暂无费用记录</p>
            </div>
        `;
        return;
    }

    container.innerHTML = window.expensesList.map(expense => {
		const payerMember = window.groupMembers.find(m => m.user_id === expense.payer_id);
        const payerName = payerMember ? (payerMember.user.username || payerMember.nickname) : 'Unknown User';
        const isOwnExpense = expense.payer_id === window.CURRENT_USER_ID;
		const amountDisplay = centsToAmountString(expense.amount); // 🔴 修复：使用转换函数
		return `
            <div class="expense-item flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition duration-150 cursor-pointer ${isOwnExpense ? 'border-l-4 border-l-primary' : ''}"
                 onclick="openExpenseDetail(${expense.id})">
                
                ${expense.image_url ? `
                    <div class="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 mr-4">
                        <img src="${expense.image_url}" alt="费用收据图片" 
                             class="w-full h-full object-cover">
                    </div>
                ` : `
                    <div class="flex-shrink-0 w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center text-lg font-bold mr-4">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5h6"></path>
                        </svg>
                    </div>
                `}

                <div class="flex-grow">
                    <p class="font-medium text-gray-800 truncate">${expense.description}</p>
                    <p class="text-xs text-gray-500">日期: ${expense.date} | 付款人: ${payerName}</p>
                </div>
                <div class="text-right">
                    <p class="text-lg font-semibold text-primary">$${amountDisplay}</p>
                    <p class="text-xs text-gray-500">${isOwnExpense ? '您支付的' : ''}</p>
                </div>
            </div>
        `;
    }).join('');
}

export function openExpenseDetail(expenseId) {
    const expense = window.expensesList.find(e => e.id === expenseId);
    if (!expense) {
        showCustomAlert('错误', '未找到费用详情！');
        return;
    }
    
    currentEditingExpenseId = expenseId;
    window.selectedExpenseId = expenseId;
    window.currentExpenseId = expenseId;
    console.log('设置当前费用ID:', expenseId);

    const modal = document.getElementById('expense-detail-modal');
    const title = document.getElementById('expense-detail-title');

    if (modal && title) {
        title.textContent = `费用详情 - ${expense.description}`;
        modal.classList.remove('hidden');
        initializeExpenseDetailForm(expense); 
    }
}

export function initializeExpenseDetailForm(expense) {
    const form = document.querySelector('#expense-detail-modal #expense-detail-form'); 
    if (!form) {
        console.error('无法在 #expense-detail-modal 内部找到 #expense-detail-form。');
        return;
    }

    form.querySelector('#detail-description').value = expense.description;
    form.querySelector('#detail-amount').value = centsToAmountString(expense.amount); // 🔴 修复：转换
    form.querySelector('#detail-date').value = expense.date;
    
    const payerSelect = form.querySelector('#detail-payer');
    payerSelect.innerHTML = '';
    window.groupMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.user_id;
        option.textContent = member.user.username || member.nickname;
        if (member.user_id === expense.payer_id) {
            option.selected = true;
        }
        payerSelect.appendChild(option);
    });

    const participantsContainer = form.querySelector('#detail-participants-container');
    if (participantsContainer) {
        participantsContainer.innerHTML = '';
        const currentSplitUserIds = new Set(expense.splits.map(s => s.user_id));
        
        // 🔴 修复：初始化详情页的分摊数据
        detailMemberSplits = [];

        window.groupMembers.forEach(member => {
            const isParticipating = currentSplitUserIds.has(member.user_id);
            const memberName = member.user.username || member.nickname;
            
            if (isParticipating) {
                // 🔴 修复：从 expense.splits 填充
                const splitData = expense.splits.find(s => s.user_id === member.user_id);
                detailMemberSplits.push({
                    user_id: member.user_id,
                    amount: splitData ? splitData.amount : 0, // 🔴 存储分
                    member_name: memberName
                });
            }

            const label = document.createElement('label');
            label.className = 'flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-300 shadow-sm';
            
            label.innerHTML = `
                <input 
                    type="checkbox" 
                    value="${member.user_id}" 
                    class="participant-checkbox h-5 w-5 rounded text-primary focus:ring-primary" 
                    ${isParticipating ? 'checked' : ''}
                >
                <span class="font-medium text-gray-800">${memberName}</span>
            `;
            label.querySelector('input').addEventListener('change', (e) => {
                console.log('详情弹窗参与者变化');
                // 🔴 修复：内部调用
                updateDetailSplitCalculation();
            });
            participantsContainer.appendChild(label);
        });
    }

    const splitEqualBtn = form.querySelector('#detail-split-equal');
    const splitExactBtn = form.querySelector('#detail-split-exact');
    
    if (expense.split_type === 'equal') {
        splitEqualBtn.classList.add('active');
        splitExactBtn.classList.remove('active');
    } else {
        splitEqualBtn.classList.remove('active');
        splitExactBtn.classList.add('active');
    }

    const previewContainer = form.querySelector('#detail-current-receipt-preview');
    const previewLink = form.querySelector('#detail-current-receipt-link');
    const previewImg = form.querySelector('#detail-current-receipt-img');

    if (expense.image_url) {
        if (previewImg) previewImg.src = expense.image_url;
        if (previewLink) previewLink.href = expense.image_url;
        if (previewContainer) previewContainer.classList.remove('hidden');
    } else {
        if (previewContainer) previewContainer.classList.add('hidden');
    }
    
    // 🔴 修复：在表单填充最后，调用分摊计算
    updateDetailSplitCalculation();
}

export function setSplitMethod(method, triggerUpdate = true) {
    console.log('切换分摊方式:', method);
    currentSplitMethod = method;
    
    const equalBtn = document.getElementById('split-equal');
    const customBtn = document.getElementById('split-exact');
    
    if (equalBtn && customBtn) {
        if (method === 'equal') {
            equalBtn.classList.add('active');
            customBtn.classList.remove('active');
        } else {
            equalBtn.classList.remove('active');
            customBtn.classList.add('active');
        }
    }
    
    if (triggerUpdate) {
        // 🔴 修复：内部调用
        updateSplitCalculation();
    }
    
    // 🔴 修复：内部调用
    renderSplitDetails();
}

// HTML中调用的函数：
export function handleAddNewExpense() {
    console.log('Show add expense modal');
	initializeExpenseForm();
    const modal = document.getElementById('add-expense-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

export function handleDeleteExpense() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        const msg = document.getElementById('delete-confirm-message');
        msg.textContent = '您确定要删除这个费用吗？此操作无法撤销。'; // 🔴 修复：使用中文
        modal.classList.remove('hidden');
    }
}

export function handleParticipantSelection(checkbox, containerId) {
    const userId = parseInt(checkbox.value);
    
    if (checkbox.checked) {
        selectedParticipants.add(userId);
    } else {
        selectedParticipants.delete(userId);
    }
    
    console.log('处理参与者选择', userId, containerId, '当前选中:', selectedParticipants);
    
    setTimeout(() => {
        // 🔴 修复：内部调用
        updateSplitCalculation();
    }, 100);
}

export function setDetailSplitMethod(method) {
    console.log('设置详情分摊方式:', method);
    
    const form = document.querySelector('#expense-detail-modal #expense-detail-form');
    if (!form) {
        console.error('详情表单未找到');
        return;
    }
    
    const equalBtn = form.querySelector('#detail-split-equal');
    const customBtn = form.querySelector('#detail-split-exact');
    
    if (equalBtn && customBtn) {
        if (method === 'equal') {
            equalBtn.classList.add('active');
            customBtn.classList.remove('active');
        } else {
            equalBtn.classList.remove('active');
            customBtn.classList.add('active');
        }
    }
    
    // 🔴 修复：内部调用
    updateDetailSplitCalculation();
}

export function handleAmountChange() {
    console.log('金额发生变化，重新计算分摊');
    
    setTimeout(() => {
        // 🔴 修复：内部调用
        updateSplitCalculation();
    }, 100);
}

export function handleDetailAmountChange() {
    console.log('详情金额发生变化，重新计算分摊');
    
    setTimeout(() => {
        // 🔴 修复：内部调用
        updateDetailSplitCalculation();
    }, 100);
}

export async function handleUpdateExpense(event) {
    event.preventDefault(); 
    console.log('Attempting to update expense via JSON...');

    const form = event.target;

    const expenseId = currentEditingExpenseId;
    if (!expenseId) {
         showCustomAlert('Error', '无法找到正在编辑的费用ID。');
         return;
    }
    
    const description = form.querySelector('#detail-description').value;
    const amountString = form.querySelector('#detail-amount').value;
    const payer_id = parseInt(form.querySelector('#detail-payer').value);
    
    // 🔴 修复：不发送 date 字段，除非后端支持
    // const date = form.querySelector('#detail-date').value;

    const amountFloat = parseFloat(amountString);
    if (isNaN(amountFloat) || amountFloat <= 0) {
        showCustomAlert('Error', 'Please enter a valid, positive amount.');
        return;
    }
    const amountInCents = amountToCents(amountString); // 🔴 修复：使用 "分"

    // 🔴 修复：使用 detailMemberSplits
    updateDetailSplitCalculation();
        
    if (detailMemberSplits.length === 0) {
        showCustomAlert('Error', 'You must split the expense with at least one person.');
        return;
    }
    
    const updatedSplits = detailMemberSplits.map(split => {
        return { user_id: split.user_id, amount: split.amount }; // 已经是分
    });
    
    const split_type = form.querySelector('#detail-split-equal').classList.contains('active') ? 'equal' : 'custom';

    // 🔴 修复：构造 JSON 对象
    const updateData = {
        description: description,
        amount: amountInCents, // 🔴 修复：发送 "分"
        payer_id: payer_id,
        // date: date, // 🔴 修复：移除 date
        split_type: split_type,
        splits: updatedSplits
    };

    const token = getAuthToken();
    const groupId = window.currentGroupId; 

    try {
        const response = await fetch(`/groups/${groupId}/expenses/${expenseId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(updateData) 
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMsg = errorData.detail ? (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)) : '更新费用失败';
            throw new Error(errorMsg);
        }

        const updatedExpense = await response.json();
        console.log('Expense updated successfully (via JSON):', updatedExpense);
        showCustomAlert('Success', 'Expense updated successfully');

        handleDetailCancel(); 
        await window.loadExpensesList(); 

    } catch (error) {
        console.error('Error updating expense:', error);
        showCustomAlert('Error', error.message);
    }
}

export async function confirmDeleteExpense() {
    if (!currentEditingExpenseId) {
        showCustomAlert('Error', 'Cannot find the expense ID');
        return;
    }

    const token = getAuthToken();
    const groupId = window.currentGroupId; 
    const expenseId = currentEditingExpenseId;

    try {
        const response = await fetch(`/groups/${groupId}/expenses/${expenseId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 204) { 
            showCustomAlert('Success', 'The Expense has been Successfully Deleted');
            
            closeDeleteConfirm();
            handleDetailCancel();
            
            await window.loadExpensesList();
            
            currentEditingExpenseId = null;

        } else {
            const errorData = await response.json();
            const errorMsg = errorData.detail ? (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)) : '删除失败';
            throw new Error(errorMsg);
        }

    } catch (error) {
        console.error('Error deleting expense:', error);
        showCustomAlert('Error', error.message);
        closeDeleteConfirm();
    }
}

export function populateExpenseDetailForm(expense) {
    console.log('填充费用详情表单', expense);
    // 🔴 修复：这个函数是 initializeExpenseDetailForm 的别名
    initializeExpenseDetailForm(expense);
}

export function updateFileNameDisplay(input) {
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileNameDisplay && input.files && input.files.length > 0) {
        fileNameDisplay.textContent = `已选择: ${input.files[0].name}`; // 🔴 修复：添加 "已选择"
    } else if (fileNameDisplay) {
        fileNameDisplay.textContent = '点击上传收据图片 (最大 1MB)'; // 🔴 修复：重置文本
    }
}

export function updateDetailFileNameDisplay(input) {
    // 🔴 修复：此功能在详情页未实现
    console.log('更新详情文件名显示', input.files[0]?.name);
}

// 弹窗关闭函数
export function handleCancel() {
    const modal = document.getElementById('add-expense-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

export function handleDetailCancel() {
    const modal = document.getElementById('expense-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
export function closeDeleteConfirm() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// 暴露所有需要全局访问的函数
window.handleAddNewExpense = handleAddNewExpense;
window.handleSaveExpense = handleSaveExpense;
window.handleCancel = handleCancel;
window.handleDeleteExpense = handleDeleteExpense;
window.handleUpdateExpense = handleUpdateExpense;
window.confirmDeleteExpense = confirmDeleteExpense;
window.handleDetailCancel = handleDetailCancel;
window.openExpenseDetail = openExpenseDetail;
window.setSplitMethod = setSplitMethod;
window.setDetailSplitMethod = setDetailSplitMethod;
window.handleAmountChange = handleAmountChange;
window.handleDetailAmountChange = handleDetailAmountChange;
window.updateSplitCalculation = updateSplitCalculation;
window.updateDetailSplitCalculation = updateDetailSplitCalculation;
window.handleCustomAmountChange = handleCustomAmountChange;
window.handleParticipantSelection = handleParticipantSelection;
window.updateFileNameDisplay = updateFileNameDisplay;
window.updateDetailFileNameDisplay = updateDetailFileNameDisplay;
window.populateExpenseDetailForm = populateExpenseDetailForm;
window.initializeExpenseForm = initializeExpenseForm;
window.initializeExpenseDetailForm = initializeExpenseDetailForm;
window.refreshExpensesList = refreshExpensesList;
window.closeDeleteConfirm = closeDeleteConfirm;
window.showCustomAlert = showCustomAlert;
window.renderSplitDetails = renderSplitDetails;
window.updateSplitSummary = updateSplitSummary;
window.validateSplitAmounts = validateSplitAmounts;
window.renderDetailSplitDetails = renderDetailSplitDetails;
window.updateDetailSplitSummary = updateDetailSplitSummary;
window.validateDetailSplitAmounts = validateDetailSplitAmounts;
window.handleDetailCustomAmountChange = handleDetailCustomAmountChange;

if (typeof window.closeCustomAlert !== 'function') {
    window.closeCustomAlert = function () {
        const modal = document.getElementById('custom-alert-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };
}

console.log('费用模块已加载，所有函数已暴露到全局');

// 🔴 v6.1修复：立即绑定事件监听器
initializeExpenseEventListeners();

function initializeExpenseEventListeners() {
    console.log('初始化费用事件监听器...');
    
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.removeAttribute('oninput');
        amountInput.addEventListener('input', handleAmountChange);
        console.log('✅ 主要费用金额输入框事件监听器已绑定');
    } else {
        console.error('❌ 找不到主要费用金额输入框 amount');
    }
    
    const detailAmountInput = document.getElementById('detail-amount');
    if (detailAmountInput) {
        detailAmountInput.removeAttribute('oninput');
        detailAmountInput.addEventListener('input', handleDetailAmountChange);
        console.log('✅ 费用详情金额输入框事件监听器已绑定');
    } else {
        console.error('❌ 找不到费用详情金额输入框 detail-amount');
    }

    const splitMethodContainer = document.getElementById('split-method-selection');
    if (splitMethodContainer) {
        splitMethodContainer.addEventListener('click', (event) => {
            const button = event.target.closest('.split-toggle-btn');
            if (button && button.dataset.method) {
                const method = button.dataset.method;
                setSplitMethod(method);
                console.log(`✅ "添加费用" 模态框: 分摊方式切换为 ${method}`);
            }
        });
        console.log('✅ "添加费用" 模态框: 分摊按钮事件监听器已绑定');
    } else {
        console.error('❌ 找不到 "添加费用" 模态框的分摊按钮容器 #split-method-selection');
    }

    const detailSplitMethodContainer = document.getElementById('detail-split-method-selection');
    if (detailSplitMethodContainer) {
        detailSplitMethodContainer.addEventListener('click', (event) => {
            const button = event.target.closest('.split-toggle-btn');
            if (button && button.dataset.method) {
                const method = button.dataset.method;
                setDetailSplitMethod(method);
                console.log(`✅ "费用详情" 模态框: 分摊方式切换为 ${method}`);
            }
        });
        console.log('✅ "费用详情" 模态框: 分摊按钮事件监听器已绑定');
    } else {
        console.error('❌ 找不到 "费用详情" 模态框的分摊按钮容器 #detail-split-method-selection');
    }
    
    console.log('费用事件监听器初始化完成');
}