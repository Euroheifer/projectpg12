// app/static/js/api/expense.js
// expense.js - 费用相关的CRUD操作、分摊计算、表单处理
//import { getTodayDate, requireAdmin } from '../ui/utils.js';
import { getTodayDate, requireAdmin, getAuthToken, showCustomAlert } from '../ui/utils.js'; //update by sunzhe 03 Nov

// --- 全局状态 ---
let selectedParticipants = new Set();
let currentSplitMethod = 'equal';
let memberSplits = [];
let currentEditingExpense = null;

// ----------- changed by sunzhe 03 Nov ---------------- //
export function initializeExpenseForm() {
    const today = getTodayDate();
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.value = today;

    // 从 group_page_en.js 获取已加载的成员列表
    const members = window.groupMembers || []; 
    
    // 1. 从 groups.html 获取表单元素
    const payerSelect = document.getElementById('payer'); //
    const participantsContainer = document.querySelector('#participants-section .grid'); //

    if (!payerSelect || !participantsContainer) {
        console.error('Expense form elements (payer or participants-section) not found!');
        return;
    }

    // 2. 清除旧选项
    payerSelect.innerHTML = '';
    participantsContainer.innerHTML = '';

    if (members.length === 0) {
        console.warn('initializeExpenseForm: window.groupMembers is empty. Dropdowns will be empty.');
        payerSelect.innerHTML = '<option value="">No members found</option>';
        return;
    }

    // 3. 填充 "谁支付了?" (Payer) 下拉框
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.user_id; //
        option.textContent = member.user.username || member.nickname || `User ${member.user_id}`;
        
        // 将当前用户设为默认付款人
        if (member.user_id === window.CURRENT_USER_ID) {
            option.selected = true;
        }
        payerSelect.appendChild(option);
    });

    // 4. 填充 "参与者" (Participants) 复选框
    selectedParticipants = new Set(); // 重置参与者 Set
    members.forEach(member => {
        selectedParticipants.add(member.user_id); // 默认选中所有人
        
        const label = document.createElement('label');
        label.className = 'flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-300 shadow-sm';
        
        // *** 修正 ***: 使用 username
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
        
        // 添加事件监听器以便在取消勾选时更新 Set
        label.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedParticipants.add(parseInt(e.target.value));
            } else {
                selectedParticipants.delete(parseInt(e.target.value));
            }
            console.log('Participants updated:', selectedParticipants);
        });
        participantsContainer.appendChild(label);
    });

    console.log('Expense form initialized with members. Default participants:', selectedParticipants);
}
// --------------------- end --------------------------------- //

// ------------------- [START MODIFIED BLOCK: handleSaveExpense] -------------------

/**
 * Replaces the old stubbed function.
 * Reads form data, validates, and sends to the backend API using FormData.
 * 🚨 MODIFIED: Now uses FormData to support file upload.
 */
export async function handleSaveExpense(event) {
    event.preventDefault(); // 停止表单的默认提交
    console.log('Attempting to save expense...');

    const form = event.target;

    // 1. 从表单 读取数据
    const description = form.querySelector('#description').value;
    const amountString = form.querySelector('#amount').value;
    const payer_id = parseInt(form.querySelector('#payer').value);
    const date = form.querySelector('#date').value;
    
    // 🚨 新增：获取文件对象
    const receiptFile = form.querySelector('#receipt-file').files[0];

    // 2. 验证和转换数据
    const amountFloat = parseFloat(amountString);
    if (isNaN(amountFloat) || amountFloat <= 0) {
        showCustomAlert('Error', 'Please enter a valid, positive amount.');
        return;
    }

    // 将金额转换为美分 (cents) 以匹配后端
    const amountInCents = Math.round(amountFloat * 100);

    if (selectedParticipants.size === 0) {
        showCustomAlert('Error', 'You must split the expense with at least one person.');
        return;
    }

    // 3. 构造分摊(splits)数组
    const splits = Array.from(selectedParticipants).map(userId => {
        return { user_id: userId, amount: null }; // 对于 'equal' 模式, amount 可以是 null
    });

    // 4. 🚨 新增：构造 FormData 对象
    const formData = new FormData();
    formData.append('description', description);
    formData.append('amount', amountInCents);
    formData.append('payer_id', payer_id);
    formData.append('date', date);
    formData.append('split_type', currentSplitMethod);
    // 必须将 splits 数组转换为 JSON 字符串才能在 FormData 中传输
    formData.append('splits', JSON.stringify(splits)); 

    // 🚨 新增：添加文件
    if (receiptFile) {
        // 后端将接收这个文件作为 'image_file'
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
    // 🚨 修正：使用 window.currentGroupId 访问全局 ID
    const groupId = window.currentGroupId; 

    // 5. --- 已修复的 try...catch 块 ---
    try {
        const response = await fetch(`/groups/${groupId}/expenses`, {
            method: 'POST',
            // 🚨 关键修改：移除 Content-Type header，让浏览器自动设置 multipart/form-data
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData // 🚨 直接发送 FormData 对象
        });

        if (!response.ok) {
            // 这是新的、已修复的错误处理部分
            const errorData = await response.json();

            let errorMessage = 'Failed to add expense. Unknown error.';

            if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                    // 如果错误是一个简单的字符串
                    errorMessage = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    // 如果是 Pydantic 422 错误列表
                    errorMessage = errorData.detail.map(err => {
                        // err.loc 是一个数组, e.g., ['body', 'date']
                        let field = err.loc.length > 1 ? err.loc[err.loc.length - 1] : err.loc.join(' -> ');
                        return `${field}: ${err.msg}`; // e.g., "date: invalid date format"
                    }).join('; ');
                } else if (typeof errorData.detail === 'object') {
                    // 其他类型的对象错误
                    errorMessage = JSON.stringify(errorData.detail);
                }
            }

            // 打印完整的错误对象到控制台，方便调试
            console.error('Error response from server:', errorData);
            throw new Error(errorMessage);
        }

        // 6. 处理成功
        const newExpense = await response.json();
        console.log('Expense added successfully:', newExpense);
        showCustomAlert('Success', 'Expense added successfully');

        form.reset(); // 清空表单
        window.handleCancel(); // 关闭弹窗 (来自 group_page_en.js)

        // 刷新页面上的费用列表
        await window.loadExpensesList(); // (来自 group_page_en.js)

    } catch (error) {
        // 这个 catch 块现在会收到一个有意义的错误字符串
        console.error('Error saving expense:', error);
        showCustomAlert('Error', error.message); // 弹窗现在会显示真正的错误
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
		// --- add for display img 
		const payerMember = window.groupMembers.find(m => m.user_id === expense.payer_id);
        const payerName = payerMember ? (payerMember.user.username || payerMember.nickname) : 'Unknown User';
		// ---- END
        const isOwnExpense = expense.payer === window.CURRENT_USER_ID;
        //const payerName = window.groupMembers.find(m => m.id === expense.payer)?.name || expense.payer;
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

let currentEditingExpenseId = null;  //for update function 04 Nov

export function openExpenseDetail(expenseId) {
    // 找到当前费用列表中的数据
    const expense = window.expensesList.find(e => e.id === expenseId);
    if (!expense) {
        showCustomAlert('错误', '未找到费用详情！');
        return;
    }
    
    // 存储正在编辑的ID
    currentEditingExpenseId = expenseId;

    const modal = document.getElementById('expense-detail-modal');
    const title = document.getElementById('expense-detail-title');

    if (modal && title) {
        title.textContent = `费用详情 - ${expense.description}`;
        modal.classList.remove('hidden');

        // --- 🔴 FIX START 🔴 ---
        // 之后: 将我们刚刚找到的 'modal' 元素传递进去
        initializeExpenseDetailForm(expense); 
        // --- 🔴 FIX END 🔴 ---
    }
}
/* export function openExpenseDetail(expenseId) {
    const expense = window.expensesList.find(e => e.id === expenseId);
    if (!expense) return;

    const modal = document.getElementById('expense-detail-modal');
    const title = document.getElementById('expense-detail-title');

    if (modal && title) {
        title.textContent = `费用详情 - ${expense.description}`;
        modal.classList.remove('hidden');
        initializeExpenseDetailForm(expense);
    }
} */

/* export function initializeExpenseDetailForm(expense) {
    // TODO: 实现初始化费用详情表单逻辑
    console.log('初始化费用详情表单:', expense);
} */

/* export function initializeExpenseDetailForm(expense) {
    const form = document.getElementById('expense-detail-form');
    if (!form) {
        console.error('Expense detail form not found.');
        return;
    } */
// --- 🔴 最终修复方案 🔴 ---
// 1. 保持只接受 'expense'
export function initializeExpenseDetailForm(expense) {
    
    // 2. 使用 querySelector 定位嵌套在 modal 内部的 form。
    //    这比 getElementById 更健壮，以防有缓存或重复ID问题。
    const form = document.querySelector('#expense-detail-modal #expense-detail-form'); 
    
    if (!form) {
        // 3. 更新错误消息，使其更具体
        console.error('无法在 #expense-detail-modal 内部找到 #expense-detail-form。请检查 groups.html 的 ID 是否正确。');
        return;
    }
// --- 🔴 修复结束 🔴 ---

    // 1. 填充基础字段
    form.querySelector('#detail-description').value = expense.description;
    // 🚨 转换为 $X.YY 格式
    form.querySelector('#detail-amount').value = (expense.amount / 100).toFixed(2); 
    form.querySelector('#detail-date').value = expense.date; // 日期应为 YYYY-MM-DD 格式
    
    // 2. 填充付款人下拉框
    const payerSelect = form.querySelector('#detail-payer');
    payerSelect.innerHTML = ''; // 清空选项
    window.groupMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.user_id;
        option.textContent = member.user.username || member.nickname;
        if (member.user_id === expense.payer_id) {
            option.selected = true;
        }
        payerSelect.appendChild(option);
    });

    // 3. 填充参与者复选框 (这里需要一个复杂的子函数来处理 splits)
    // 🚨 简单实现：默认勾选所有参与者，并选中原有的参与者。
    const participantsContainer = form.querySelector('#detail-participants-container');
    if (participantsContainer) {
        participantsContainer.innerHTML = '';
        const currentSplitUserIds = new Set(expense.splits.map(s => s.user_id));

        window.groupMembers.forEach(member => {
            const isParticipating = currentSplitUserIds.has(member.user_id);
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
            // TODO: 为这些复选框添加事件监听器来更新 split 数据结构
            participantsContainer.appendChild(label);
        });
    }

    // 4. 设置分摊方式按钮
    const splitEqualBtn = form.querySelector('#detail-split-equal');
    const splitExactBtn = form.querySelector('#detail-split-exact');
    
    if (expense.split_type === 'equal') {
        splitEqualBtn.classList.add('active');
        splitExactBtn.classList.remove('active');
    } else {
        splitEqualBtn.classList.remove('active');
        splitExactBtn.classList.add('active');
    }
	// 🚨 关键：添加图片预览和文件上传重置逻辑 (新代码)
    const previewContainer = form.querySelector('#detail-current-receipt-preview');
    const previewImg = form.querySelector('#detail-current-receipt-img');
    const fileNameDisplay = form.querySelector('#detail-file-name-display');

    if (expense.image_url) {
        // 如果存在图片 URL，显示预览
        if (previewImg) previewImg.src = expense.image_url;
        if (previewContainer) previewContainer.classList.remove('hidden');
        if (fileNameDisplay) fileNameDisplay.textContent = '当前收据已上传。点击选择替换';
    } else {
        // 如果没有图片，隐藏预览
        if (previewContainer) previewContainer.classList.add('hidden');
        if (fileNameDisplay) fileNameDisplay.textContent = '点击上传收据图片 (最大 1MB)';
    }
    
    // 确保文件输入框被重置
    const fileInput = form.querySelector('#detail-receipt-file');
    if (fileInput) fileInput.value = ""; 
}

    // 5. 显示当前图片 URL 或文件名 (可选)
/*     const fileNameDisplay = form.querySelector('#detail-file-name-display');
    if (fileNameDisplay) {
        if (expense.image_url) {
            fileNameDisplay.textContent = `当前收据已上传`; // 简化显示
        } else {
             fileNameDisplay.textContent = '点击上传收据图片 (最大 1MB)';
        }
    } */
//}

export function setSplitMethod(method, triggerUpdate = true) {
    // TODO: 实现设置分摊方式逻辑
}

// HTML中调用的函数：
export function handleAddNewExpense() {
    // TODO: 打开添加费用弹窗
    console.log('打开添加费用弹窗');
}


export function handleDeleteExpense() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        // 可选：您可以在这里自定义消息
        const msg = document.getElementById('delete-confirm-message');
        msg.textContent = 'Confirm Detele?';
        modal.classList.remove('hidden');
    }
}

export function handleParticipantSelection(checkbox, containerId) {
    // TODO: 实现参与者选择处理逻辑
    console.log('处理参与者选择', checkbox.value, containerId);
}



export function setDetailSplitMethod(method) {
    // TODO: 实现详情分摊方式设置逻辑
    console.log('设置详情分摊方式:', method);
}

export function updateSplitCalculation() {
    // TODO: 实现分摊计算逻辑
    console.log('更新分摊计算');
}

export function updateDetailSplitCalculation() {
    // TODO: 实现详情分摊计算逻辑
    console.log('更新详情分摊计算');
}

export function handleCustomAmountChange(input, memberId, splitsArray) {
    // TODO: 实现自定义金额变化处理逻辑
    console.log('处理自定义金额变化', memberId, input.value);
}

export function handleAmountChange() {
    // TODO: 实现金额变化处理逻辑
    console.log('处理金额变化');
}

export function handleDetailAmountChange() {
    // TODO: 实现详情金额变化处理逻辑
    console.log('处理详情金额变化');
}



/* export function handleUpdateExpense(event) {
    // TODO: 实现费用更新逻辑
    event.preventDefault();
    console.log('更新费用');
} */
// app/static/js/api/expense.js

/* export async function handleUpdateExpense(event) {
    event.preventDefault(); 
    console.log('Attempting to update expense...');

    const form = event.target;

    // 1. 获取 ID 和基础数据
    const expenseId = currentEditingExpenseId; // 从全局状态获取 ID
    if (!expenseId) {
         showCustomAlert('Error', '无法找到正在编辑的费用ID。');
         return;
    }
    
    const description = form.querySelector('#detail-description').value;
    const amountString = form.querySelector('#detail-amount').value;
    const payer_id = parseInt(form.querySelector('#detail-payer').value);
    const date = form.querySelector('#detail-date').value;
    
    // 🚨 获取文件对象 (如果用户选择了新文件)
    const receiptFile = form.querySelector('#detail-receipt-file').files[0];

    // 2. 验证和转换金额
    const amountFloat = parseFloat(amountString);
    if (isNaN(amountFloat) || amountFloat <= 0) {
        showCustomAlert('Error', 'Please enter a valid, positive amount.');
        return;
    }
    const amountInCents = Math.round(amountFloat * 100);

    // 3. 构造 splits (这里需要读取 detail-participants-container 的勾选状态)
    const updatedParticipants = Array.from(form.querySelectorAll('#detail-participants-container input:checked'))
        .map(input => parseInt(input.value));
        
    if (updatedParticipants.length === 0) {
        showCustomAlert('Error', 'You must split the expense with at least one person.');
        return;
    }

    const updatedSplits = updatedParticipants.map(userId => {
        return { user_id: userId, amount: null }; 
    });


    // 4. 构造 FormData
    const formData = new FormData();
    formData.append('description', description);
    formData.append('amount', amountInCents);
    formData.append('payer_id', payer_id);
    formData.append('date', date);
    formData.append('split_type', 'equal'); // 简化：假设只处理 equal split
    formData.append('splits', JSON.stringify(updatedSplits)); 

    // 🚨 添加文件 (如果文件存在，后端会覆盖旧文件)
    if (receiptFile) {
        formData.append('image_file', receiptFile); 
    }

    const token = getAuthToken();
    const groupId = window.currentGroupId; 

    // 5. 发送 PATCH 请求
    try {
        const response = await fetch(`/groups/${groupId}/expenses/${expenseId}`, {
            method: 'PATCH', // 🚨 使用 PATCH 方法
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData 
        });

        if (!response.ok) {
            // ... (错误处理与 handleSaveExpense 类似) ...
            const errorData = await response.json();
            throw new Error(errorData.detail ? JSON.stringify(errorData.detail) : '更新费用失败');
        }

        const updatedExpense = await response.json();
        console.log('Expense updated successfully:', updatedExpense);
        showCustomAlert('Success', 'Expense updated successfully');

        // 关闭弹窗并刷新列表
        handleDetailCancel(); 
        await window.loadExpensesList(); 

    } catch (error) {
        console.error('Error updating expense:', error);
        showCustomAlert('Error', error.message);
    }
} */

// app/static/js/api/expense.js

export async function handleUpdateExpense(event) {
    event.preventDefault(); 
    console.log('Attempting to update expense via JSON...');

    const form = event.target;

    // 1. 获取 ID 和基础数据
    const expenseId = currentEditingExpenseId;
    if (!expenseId) {
         showCustomAlert('Error', '无法找到正在编辑的费用ID。');
         return;
    }
    
    const description = form.querySelector('#detail-description').value;
    const amountString = form.querySelector('#detail-amount').value;
    const payer_id = parseInt(form.querySelector('#detail-payer').value);
    const date = form.querySelector('#detail-date').value;
    
    // 🚨 注意：文件更新在此修复中被禁用 (见下文)
    // const receiptFile = form.querySelector('#detail-receipt-file').files[0];

    // 2. 验证和转换金额
    const amountFloat = parseFloat(amountString);
    if (isNaN(amountFloat) || amountFloat <= 0) {
        showCustomAlert('Error', 'Please enter a valid, positive amount.');
        return;
    }
    const amountInCents = Math.round(amountFloat * 100);

    // 3. 构造 splits
    const updatedParticipants = Array.from(form.querySelectorAll('#detail-participants-container input:checked'))
        .map(input => parseInt(input.value));
        
    if (updatedParticipants.length === 0) {
        showCustomAlert('Error', 'You must split the expense with at least one person.');
        return;
    }

    const updatedSplits = updatedParticipants.map(userId => {
        return { user_id: userId, amount: null }; 
    });

    // 4. 🔴 更改：构造一个普通的 JS 对象，而不是 FormData
    const updateData = {
        description: description,
        amount: amountInCents,
        payer_id: payer_id,
        date: date,
        split_type: 'equal', // 简化
        splits: updatedSplits
        // 故意省略 'image_file'
    };

    const token = getAuthToken();
    const groupId = window.currentGroupId; 

    // 5. 🔴 更改：发送 PATCH 请求，使用 application/json
    try {
        const response = await fetch(`/groups/${groupId}/expenses/${expenseId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                // 🔴 关键：设置 Content-Type 为 JSON
                'Content-Type': 'application/json' 
            },
            // 🔴 关键：发送 JSON 字符串
            body: JSON.stringify(updateData) 
        });

        if (!response.ok) {
            const errorData = await response.json();
            // 错误处理现在应该能正确解析 JSON 错误
            const errorMsg = errorData.detail ? (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)) : '更新费用失败';
            throw new Error(errorMsg);
        }

        const updatedExpense = await response.json();
        console.log('Expense updated successfully (via JSON):', updatedExpense);
        showCustomAlert('Success', 'Expense updated successfully');

        // 关闭弹窗并刷新列表
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

        // 成功删除时，后端应返回 204 No Content
        if (response.status === 204) { 
            showCustomAlert('Success', 'The Expense has been Successfully Deleted');
            
            closeDeleteConfirm();     // 1. 关闭确认弹窗
            handleDetailCancel();     // 2. 关闭详情弹窗
            
            await window.loadExpensesList(); // 3. 刷新列表
            
            currentEditingExpenseId = null; // 清理ID

        } else {
            // 处理非 204 的错误
            const errorData = await response.json();
            const errorMsg = errorData.detail ? (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)) : '删除失败';
            throw new Error(errorMsg);
        }

    } catch (error) {
        console.error('Error deleting expense:', error);
        showCustomAlert('Error', error.message);
        closeDeleteConfirm(); // 即使失败了也关闭确认框
    }
}

export function populateExpenseDetailForm(expense) {
    // TODO: 实现费用详情表单填充逻辑
    console.log('填充费用详情表单', expense);
}




export function updateFileNameDisplay(input) {
    // TODO: 实现文件名显示更新逻辑
    console.log('更新文件名显示', input.files[0]?.name);
}

export function updateDetailFileNameDisplay(input) {
    // TODO: 实现详情文件名显示更新逻辑
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

// 如果这些函数在其他地方已经定义，确保不会重复定义
if (typeof window.closeCustomAlert !== 'function') {
    window.closeCustomAlert = function () {
        const modal = document.getElementById('custom-alert-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };
}

console.log('费用模块已加载，所有函数已暴露到全局');
