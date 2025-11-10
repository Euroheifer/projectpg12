// expense.js - 费用相关的CRUD操作、分摊计算、表单处理
// 防止缓存版本: 2025.11.10.004 - 修复详情页分摊
const JS_CACHE_VERSION = '2025.11.10.004';

import { getTodayDate, requireAdmin, getAuthToken, showCustomAlert, amountToCents } from '../ui/utils.js';
import { centsToAmountString } from './amount_utils.js';

// --- 全局状态 ---
// "添加费用" 模态框的状态
let selectedParticipants = new Set();
let currentSplitMethod = 'equal';
let memberSplits = [];
let currentEditingExpense = null;

// 🔴 修复：为 "费用详情" 模态框添加独立的状态
let detailSelectedParticipants = new Set();
let detailCurrentSplitMethod = 'equal';
let detailMemberSplits = [];
let currentEditingExpenseId = null;

// ----------- 初始化费用表单 ---------------- //
export function initializeExpenseForm() {
    const today = getTodayDate();
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.value = today;

    const members = window.groupMembers || []; 
    
    const payerSelect = document.getElementById('payer');
    const participantsContainer = document.querySelector('#participants-section .grid');

    if (!payerSelect || !participantsContainer) {
        console.error('Expense form elements (payer or participants-section) not found!');
        return;
    }

    payerSelect.innerHTML = '';
    participantsContainer.innerHTML = '';

    if (members.length === 0) {
        console.warn('initializeExpenseForm: window.groupMembers is empty. Dropdowns will be empty.');
        payerSelect.innerHTML = '<option value="">No members found</option>';
        return;
    }

    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.user_id;
        option.textContent = member.user.username || member.nickname || `User ${member.user_id}`;
        
        if (member.user_id === window.CURRENT_USER_ID) {
            option.selected = true;
        }
        payerSelect.appendChild(option);
    });

    selectedParticipants = new Set(); 
    members.forEach(member => {
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
            
            setTimeout(() => {
                updateSplitCalculation();
            }, 100);
        });
        participantsContainer.appendChild(label);
    });

    console.log('Expense form initialized with members. Default participants:', selectedParticipants);
    
    // 初始化分摊详情和摘要显示
    currentSplitMethod = 'equal';
    setSplitMethod('equal', false); // 设为 false，避免重复计算
    updateSplitCalculation(); // 手动调用一次
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

    const amountInCents = amountToCents(amountString); // 🔴 使用导入的函数

    if (selectedParticipants.size === 0) {
        showCustomAlert('Error', 'You must split the expense with at least one person.');
        return;
    }

    // 🔴 确保分摊计算在保存前是同步的
    updateSplitCalculation(); // 确保 memberSplits 是最新的

    if (currentSplitMethod === 'custom') {
        const validation = validateSplitAmounts();
        if (!validation.isValid) {
            showCustomAlert('Error', `分摊金额验证失败: ${validation.message}`);
            return;
        }
    }

    const splits = Array.from(selectedParticipants).map(userId => {
        const splitRecord = memberSplits.find(s => s.user_id === userId);
        // 🔴 修复：amount 已经是分
        return { 
            user_id: userId, 
            amount: splitRecord ? splitRecord.amount : 0 
        };
    });

    const formData = new FormData();
    formData.append('description', description);
    formData.append('amount', amountInCents);
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
        window.handleCancel(); 

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
		const amountDisplay = window.centsToAmountString ? window.centsToAmountString(expense.amount) : (expense.amount / 100).toFixed(2);
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

// 🔴 修复：currentEditingExpenseId 在此文件顶部声明
// let currentEditingExpenseId = null; 

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

// 🔴 修复：重写此函数
export function initializeExpenseDetailForm(expense) {
    
    const form = document.querySelector('#expense-detail-modal #expense-detail-form'); 
    
    if (!form) {
        console.error('无法在 #expense-detail-modal 内部找到 #expense-detail-form。');
        return;
    }

    // 1. 填充基础字段
    form.querySelector('#detail-description').value = expense.description;
    form.querySelector('#detail-amount').value = centsToAmountString(expense.amount); 
    form.querySelector('#detail-date').value = expense.date;
    
    // 2. 填充付款人下拉框
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

    // 3. 🔴 修复：填充参与者复选框并设置状态
    const participantsContainer = form.querySelector('#detail-participants-container');
    participantsContainer.innerHTML = '';
    const currentSplitUserIds = new Set(expense.splits.map(s => s.user_id));
    detailSelectedParticipants = new Set(); // 🔴 重置详情状态

    window.groupMembers.forEach(member => {
        const isParticipating = currentSplitUserIds.has(member.user_id);
        if (isParticipating) {
            detailSelectedParticipants.add(member.user_id); // 🔴 初始化详情状态
        }
        
        const memberName = member.user.username || member.nickname;
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
        
        // 🔴 修复：添加事件监听器以更新详情状态
        label.querySelector('input').addEventListener('change', (e) => {
            const userId = parseInt(e.target.value, 10);
            if (e.target.checked) {
                detailSelectedParticipants.add(userId);
            } else {
                detailSelectedParticipants.delete(userId);
            }
            console.log('Detail Participants updated:', detailSelectedParticipants);
            // 🔴 修复：调用详情的计算和渲染
            updateDetailSplitCalculation(); 
        });
        participantsContainer.appendChild(label);
    });

    // 4. 🔴 修复：设置分摊方式按钮和状态
    detailCurrentSplitMethod = expense.split_type || 'equal'; // 🔴 初始化详情状态
    setDetailSplitMethod(detailCurrentSplitMethod, false); // 🔴 false = 不触发计算

    // 5. 🔴 修复：计算并渲染分摊详情
    updateDetailSplitCalculation(false); // 🔴 false = 不触发自定义输入框更新

    // 6. 🔴 修复：显示图片
    const previewContainer = form.querySelector('#detail-current-receipt-preview');
    const previewImg = form.querySelector('#detail-current-receipt-img');
    const previewLink = form.querySelector('#detail-current-receipt-link');

    if (expense.image_url) {
        if (previewImg) previewImg.src = expense.image_url;
        if (previewLink) previewLink.href = expense.image_url;
        if (previewContainer) previewContainer.classList.remove('hidden');
    } else {
        if (previewContainer) previewContainer.classList.add('hidden');
    }
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
        updateSplitCalculation();
    }
}

// HTML中调用的函数：
export function handleAddNewExpense() {
    console.log('打开添加费用弹窗');
}


export function handleDeleteExpense() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        const msg = document.getElementById('delete-confirm-message');
        msg.textContent = 'Confirm Detele?';
        modal.classList.remove('hidden');
    }
}

// 🔴 已废弃 (被 initializeExpenseForm 中的内联监听器取代)
export function handleParticipantSelection(checkbox, containerId) {}

// 🔴 修复：重写此函数
export function setDetailSplitMethod(method, triggerUpdate = true) {
    console.log('设置详情分摊方式:', method);
    
    const form = document.querySelector('#expense-detail-modal #expense-detail-form');
    if (!form) {
        console.error('详情表单未找到');
        return;
    }
    
    detailCurrentSplitMethod = method; // 🔴 更新详情状态
    
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
    
    // 🔴 修复：触发详情的计算和渲染
    if (triggerUpdate) {
        updateDetailSplitCalculation();
    }
}

// 🔴 修复：重写此函数 (分摊计算)
export function updateSplitCalculation() {
    const amountInput = document.getElementById('amount');
    if (!amountInput || !amountInput.value) {
        memberSplits = []; 
        renderSplitDetails(); 
        updateSplitSummary(); 
        return;
    }
    
    const totalAmountInCents = amountToCents(amountInput.value);
    if (isNaN(totalAmountInCents) || totalAmountInCents <= 0) {
        memberSplits = [];
        renderSplitDetails();
        updateSplitSummary();
        return;
    }
    
    const participants = Array.from(selectedParticipants);
    if (participants.length === 0) {
        memberSplits = [];
        renderSplitDetails();
        updateSplitSummary();
        return;
    }
    
    memberSplits = participants.map(userId => {
        const member = window.groupMembers.find(m => m.user_id === userId);
        const existingSplit = memberSplits.find(s => s.user_id === userId); 
        return {
            user_id: userId,
            amount: existingSplit && currentSplitMethod === 'custom' ? existingSplit.amount : 0, 
            member_name: member ? (member.user.username || member.nickname) : `User ${userId}`
        };
    });
    
    if (currentSplitMethod === 'equal') {
        const baseAmountInCents = Math.floor(totalAmountInCents / participants.length);
        const remainderInCents = totalAmountInCents % participants.length;
        
        memberSplits.forEach((split, index) => {
            split.amount = baseAmountInCents;
            if (index < remainderInCents) {
                split.amount += 1; 
            }
        });
    } else {
        const sumCurrentSplits = memberSplits.reduce((sum, s) => sum + s.amount, 0);
        
        if (Math.abs(sumCurrentSplits - totalAmountInCents) > 1 || sumCurrentSplits === 0) {
            const baseAmountInCents = Math.floor(totalAmountInCents / participants.length);
            const remainderInCents = totalAmountInCents % participants.length;
            
            memberSplits.forEach((split, index) => {
                split.amount = baseAmountInCents;
                if (index < remainderInCents) {
                    split.amount += 1;
                }
            });
        }
    }
    
    renderSplitDetails();
    updateSplitSummary();
    
    console.log('分摊计算完成 (分):', memberSplits);
}

// 🔴 修复：重写此函数 (详情分摊计算)
export function updateDetailSplitCalculation(updateInputs = true) {
    const form = document.querySelector('#expense-detail-modal #expense-detail-form');
    if (!form) return;
    
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
    
    const participants = Array.from(detailSelectedParticipants);
    if (participants.length === 0) {
        detailMemberSplits = [];
        renderDetailSplitDetails();
        updateDetailSplitSummary();
        return;
    }
    
    detailMemberSplits = participants.map(userId => {
        const member = window.groupMembers.find(m => m.user_id === userId);
        const existingSplit = detailMemberSplits.find(s => s.user_id === userId);
        return {
            user_id: userId,
            amount: existingSplit && detailCurrentSplitMethod === 'custom' ? existingSplit.amount : 0, 
            member_name: member ? (member.user.username || member.nickname) : `User ${userId}`
        };
    });
    
    if (detailCurrentSplitMethod === 'equal') {
        const baseAmountInCents = Math.floor(totalAmountInCents / participants.length);
        const remainderInCents = totalAmountInCents % participants.length;
        
        detailMemberSplits.forEach((split, index) => {
            split.amount = baseAmountInCents;
            if (index < remainderInCents) {
                split.amount += 1;
            }
        });
    } else {
        const sumCurrentSplits = detailMemberSplits.reduce((sum, s) => sum + s.amount, 0);
        
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
    
    // 🔴 修复：调用新的渲染函数
    renderDetailSplitDetails(updateInputs); 
    updateDetailSplitSummary();
    
    console.log('详情分摊计算完成 (分):', detailMemberSplits);
}


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

// 🔴 修复：添加详情模态框的自定义金额处理
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

export function handleAmountChange() {
    console.log('金额发生变化，重新计算分摊');
    
    setTimeout(() => {
        updateSplitCalculation();
    }, 100);
}

// 🔴 修复：重写此函数 (详情金额变化)
export function handleDetailAmountChange() {
    console.log('详情金额发生变化，重新计算分摊');
    
    setTimeout(() => {
        updateDetailSplitCalculation();
    }, 100);
}


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
    const differenceInCents = Math.abs(sumSplitsInCents - totalAmountInCents);
    
    if (differenceInCents <= 1) { 
        if (differenceInCents === 1 && memberSplits.length > 0) {
             memberSplits[0].amount += (totalAmountInCents - sumSplitsInCents);
             console.log(`自动调整 1 分钱差异给 ${memberSplits[0].member_name}`);
        }
        return { isValid: true, message: '分摊金额匹配', sumSplits: sumSplitsInCents };
    } else {
        const status = sumSplitsInCents > totalAmountInCents ? '超出' : '不足';
        return { 
            isValid: false, 
            message: `分摊金额${status} ¥${centsToAmountString(differenceInCents)}`,
            sumSplits: sumSplitsInCents,
            difference: differenceInCents
        };
    }
}

// 🔴 修复：添加详情模态框的验证函数
export function validateDetailSplitAmounts() {
    const amountInput = document.getElementById('detail-amount'); // 🔴
    if (!amountInput || !amountInput.value) {
        return { isValid: false, message: '请输入总金额' };
    }
    
    const totalAmountInCents = amountToCents(amountInput.value); // 🔴
    if (isNaN(totalAmountInCents) || totalAmountInCents <= 0) {
        return { isValid: false, message: '请输入有效的总金额' };
    }
    
    const sumSplitsInCents = detailMemberSplits.reduce((sum, split) => sum + (split.amount || 0), 0); // 🔴
    const differenceInCents = Math.abs(sumSplitsInCents - totalAmountInCents);
    
    if (differenceInCents <= 1) { 
        if (differenceInCents === 1 && detailMemberSplits.length > 0) { // 🔴
             detailMemberSplits[0].amount += (totalAmountInCents - sumSplitsInCents); // 🔴
             console.log(`(Detail) 自动调整 1 分钱差异给 ${detailMemberSplits[0].member_name}`); // 🔴
        }
        return { isValid: true, message: '分摊金额匹配', sumSplits: sumSplitsInCents };
    } else {
        const status = sumSplitsInCents > totalAmountInCents ? '超出' : '不足';
        return { 
            isValid: false, 
            message: `分摊金额${status} ¥${centsToAmountString(differenceInCents)}`,
            sumSplits: sumSplitsInCents,
            difference: differenceInCents
        };
    }
}


export function renderSplitDetails() {
    const container = document.getElementById('split-list');
    if (!container) {
        console.warn('分摊详情容器未找到');
        return;
    }
    
    if (memberSplits.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <p>请选择参与者</p>
            </div>
        `;
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

// 🔴 修复：添加详情模态框的渲染函数
export function renderDetailSplitDetails(updateInputs = true) {
    const container = document.getElementById('detail-split-list'); // 🔴
    if (!container) {
        console.warn('详情分摊详情容器未找到');
        return;
    }
    
    if (detailMemberSplits.length === 0) { // 🔴
        container.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <p>请选择参与者</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = detailMemberSplits.map(split => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                    ${split.member_name.charAt(0).toUpperCase()}
                </div>
                <span class="font-medium text-gray-800">${split.member_name}</span>
            </div>
            <div class="flex items-center space-x-2">
                ${detailCurrentSplitMethod === 'custom' ? `
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


export function updateSplitSummary() {
    const summaryContainer = document.getElementById('split-summary');
    if (!summaryContainer) {
        console.warn('分摊摘要容器未找到');
        return;
    }
    
    const amountInput = document.getElementById('amount');
    const totalAmountInCents = amountToCents(amountInput.value);
    
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

// 🔴 修复：添加详情模态框的摘要函数
export function updateDetailSplitSummary() {
    const summaryContainer = document.getElementById('detail-split-summary'); // 🔴
    if (!summaryContainer) {
        console.warn('详情分摊摘要容器未找到');
        return;
    }
    
    const amountInput = document.getElementById('detail-amount'); // 🔴
    const totalAmountInCents = amountToCents(amountInput.value);
    
    const validation = validateDetailSplitAmounts(); // 🔴
    const participantCount = detailMemberSplits.length; // 🔴
    
    const averageSplitInCents = participantCount > 0 ? totalAmountInCents / participantCount : 0;
    
    summaryContainer.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-blue-800">分摊摘要</span>
                <span class="text-xs text-blue-600">${detailCurrentSplitMethod === 'equal' ? '等额分摊' : '自定义分摊'}</span>
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
            
            ${detailCurrentSplitMethod === 'equal' ? `
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
    
    const amountInputElement = document.getElementById('detail-amount'); // 🔴
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


// 🔴 修复：重写此函数 (详情更新)
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
    const date = form.querySelector('#detail-date').value;
    
    const amountInCents = amountToCents(amountString);

    // 🔴 修复：使用详情的状态
    if (detailSelectedParticipants.size === 0) { 
        showCustomAlert('Error', 'You must split the expense with at least one person.');
        return;
    }

    // 🔴 修复：确保详情分摊已计算
    updateDetailSplitCalculation(false); 

    if (detailCurrentSplitMethod === 'custom') {
        const validation = validateDetailSplitAmounts(); // 🔴
        if (!validation.isValid) {
            showCustomAlert('Error', `分摊金额验证失败: ${validation.message}`);
            return;
        }
    }
    
    // 🔴 修复：使用详情的分摊数据
    const updatedSplits = Array.from(detailSelectedParticipants).map(userId => {
        const splitRecord = detailMemberSplits.find(s => s.user_id === userId);
        return { 
            user_id: userId, 
            amount: splitRecord ? splitRecord.amount : 0 
        }; 
    });

    const updateData = {
        description: description,
        amount: amountInCents,
        payer_id: payer_id,
        date: date,
        split_type: detailCurrentSplitMethod, // 🔴
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
}



export function updateFileNameDisplay(input) {
    console.log('更新文件名显示', input.files[0]?.name);
}

export function updateDetailFileNameDisplay(input) {
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
window.handleDetailCustomAmountChange = handleDetailCustomAmountChange; // 🔴
window.handleParticipantSelection = handleParticipantSelection;
window.updateFileNameDisplay = updateFileNameDisplay;
window.updateDetailFileNameDisplay = updateDetailFileNameDisplay;
window.populateExpenseDetailForm = populateExpenseDetailForm;
window.initializeExpenseForm = initializeExpenseForm;
window.initializeExpenseDetailForm = initializeExpenseDetailForm;
window.refreshExpensesList = refreshExpensesList;
window.closeDeleteConfirm = closeDeleteConfirm;
window.showCustomAlert = showCustomAlert;

// 新增的分摊计算相关函数
window.renderSplitDetails = renderSplitDetails;
window.updateSplitSummary = updateSplitSummary;
window.validateSplitAmounts = validateSplitAmounts;
window.renderDetailSplitDetails = renderDetailSplitDetails; // 🔴
window.updateDetailSplitSummary = updateDetailSplitSummary; // 🔴
window.validateDetailSplitAmounts = validateDetailSplitAmounts; // 🔴


if (typeof window.closeCustomAlert !== 'function') {
    window.closeCustomAlert = function () {
        const modal = document.getElementById('custom-alert-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };
}

console.log('费用模块已加载，所有函数已暴露到全局');

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