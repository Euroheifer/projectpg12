// recurring_expense.js - 定期费用相关的CRUD操作、频率设置
// 防止缓存版本: 2025.11.10.004 (Gemini 修复版)
const JS_CACHE_VERSION = '2025.11.10.004';

// 🔴 修复：导入必须在顶层
import { 
    getAuthToken,
    showCustomAlert,
    centsToAmountString as importedCentsToAmountString, 
    amountToCents as importedAmountToCents 
} from '../ui/utils.js';

// --- 🔴 修复：使用从 utils.js 导入的函数 ---
const centsToAmountString = importedCentsToAmountString;
const amountToCents = importedAmountToCents;

// --- 全局状态 ---
let recurringExpenseState = {
    isRecurring: false,
    frequency: 'daily',
    startDate: '',
    endDate: '',
};
let recurringSelectedParticipants = new Set();
let recurringSplitMethod = 'equal';
let recurringMemberSplits = []; // 🔴 存储分 (cents)
let currentEditingRecurringExpense = null;
let isRecurringFormInitialized = false; // 🔴 修复：防止重复初始化

// =================================================================
// --- 🔴 修复：将所有辅助函数移动到文件顶部 ---
// =================================================================

/**
 * 辅助函数：根据ID获取成员名称
 */
function getMemberNameById(userId) {
    if (!window.groupMembers) return `用户 ${userId}`;
    const member = window.groupMembers.find(m => m.user_id === userId);
    if (member) {
        return member.user?.username || member.nickname || `用户 ${userId}`;
    }
    return `用户 ${userId}`;
}

/**
 * 渲染定期费用列表
 * 🔴 修复：金额以分为单位
 */
function renderRecurringExpenseList(expenses) {
    const container = document.getElementById('recurring-list');
    if (!container) {
        console.error('找不到定期费用列表容器');
        return;
    }
    
    container.innerHTML = '';
    
    if (!expenses || expenses.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">暂无定期费用</p>';
        return;
    }
    
    expenses.forEach(expense => {
        const expenseItem = document.createElement('div');
        expenseItem.className = 'bg-white p-4 rounded-lg border border-gray-200 shadow-sm';
        
        const header = document.createElement('div');
        header.className = 'flex justify-between items-start mb-2';
        
        const title = document.createElement('h3');
        title.className = 'text-lg font-medium text-gray-900';
        title.textContent = expense.description || `定期费用 ${expense.frequency}`;
        
        const status = document.createElement('span');
        status.className = `px-2 py-1 text-xs font-medium rounded-full ${
            expense.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`;
        status.textContent = expense.is_active ? '启用' : '禁用';
        
        header.appendChild(title);
        header.appendChild(status);
        
        const details = document.createElement('div');
        details.className = 'text-sm text-gray-600 space-y-1';
        
        const amount = document.createElement('p');
        const displayAmount = centsToAmountString(expense.amount);
        amount.textContent = `金额: ¥${displayAmount}`;
        
        const frequency = document.createElement('p');
        const frequencyLabels = {
            'daily': '每日',
            'weekly': '每周',
            'monthly': '每月',
            'yearly': '每年'
        };
        frequency.textContent = `频率: ${frequencyLabels[expense.frequency] || expense.frequency}`;
        
        const dateRange = document.createElement('p');
        dateRange.textContent = `开始于: ${expense.start_date} (下次: ${expense.next_due_date})`;
        
        const payer = document.createElement('p');
        const payerName = getMemberNameById(expense.payer_id);
        payer.textContent = `付款人: ${payerName}`;
        
        details.appendChild(amount);
        details.appendChild(frequency);
        details.appendChild(dateRange);
        details.appendChild(payer);
        
        const actions = document.createElement('div');
        actions.className = 'mt-3 flex space-x-2';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600';
        editBtn.textContent = '编辑';
        editBtn.onclick = () => handleEditRecurringExpense(expense.id);
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = `px-3 py-1 text-sm rounded ${
            expense.is_active 
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-green-500 text-white hover:bg-green-600'
        }`;
        toggleBtn.textContent = expense.is_active ? '禁用' : '启用';
        toggleBtn.onclick = () => {
            if (expense.is_active) {
                handleDisableRecurringExpense(expense.id);
            } else {
                handleEnableRecurringExpense(expense.id);
            }
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600';
        deleteBtn.textContent = '删除';
        deleteBtn.onclick = () => handleDeleteRecurringExpense(expense.id);
        
        actions.appendChild(editBtn);
        actions.appendChild(toggleBtn);
        actions.appendChild(deleteBtn);
        
        expenseItem.appendChild(header);
        expenseItem.appendChild(details);
        expenseItem.appendChild(actions);
        
        container.appendChild(expenseItem);
    });
}

/**
 * 生成定期费用预览数据
 * 🔴 修复：totalAmountInCents 是以分为单位的
 */
function generateRecurringPreview(startDate, endDate, frequency, totalAmountInCents) {
    const previewData = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        previewData.push({
            date: dateStr,
            amount: totalAmountInCents, // 🔴 存储分
            frequency: frequency
        });
        
        switch (frequency) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
            case 'yearly':
                currentDate.setFullYear(currentDate.getFullYear() + 1);
                break;
            default:
                currentDate.setDate(currentDate.getDate() + 1);
        }
    }
    
    return previewData;
}

/**
 * 更新预览列表
 * 🔴 修复：item.amount 是以分为单位的
 */
function updatePreviewList(previewData) {
    const previewList = document.getElementById('recurring-preview-list');
    if (!previewList) {
        console.error('找不到预览列表元素');
        return;
    }
    
    previewList.innerHTML = '';
    
    previewData.forEach(item => {
        const listItem = document.createElement('div');
        listItem.className = 'flex justify-between items-center p-2 bg-gray-50 rounded';
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'text-sm text-gray-600';
        dateSpan.textContent = item.date;
        
        const amountSpan = document.createElement('span');
        amountSpan.className = 'text-sm font-medium text-gray-900';
        
        const displayAmount = centsToAmountString(item.amount);
        amountSpan.textContent = `¥${displayAmount}`;
        
        listItem.appendChild(dateSpan);
        listItem.appendChild(amountSpan);
        previewList.appendChild(listItem);
    });
}

/**
 * 更新预览摘要
 * 🔴 修复：previewData 中的 amount 是以分为单位的
 */
function updatePreviewSummary(previewData) {
    const totalCount = previewData.length;
    const totalAmountInCents = previewData.reduce((sum, item) => sum + item.amount, 0);
    
    const summaryElement = document.getElementById('recurring-preview-summary');
    if (summaryElement) {
        const participantCount = recurringSelectedParticipants.size;
        const amountPerPersonInCents = participantCount > 0 ? totalAmountInCents / participantCount : 0;
        
        const displayTotal = centsToAmountString(totalAmountInCents);
        const displayPerPerson = centsToAmountString(amountPerPersonInCents);
        
        summaryElement.textContent = `共 ${totalCount} 次，合计 ¥${displayTotal}，每人约 ¥${displayPerPerson}`;
    }
}

/**
 * 更新定期费用预览 (供事件调用)
 */
export function updateRecurringPreview() {
    console.log('更新定期费用预览');
    
    const startDate = document.getElementById('repeat-start')?.value;
    const endDate = document.getElementById('repeat-end')?.value;
    const amountInput = document.getElementById('recurring-amount');
    
    if (!startDate || !endDate || !amountInput) {
        console.warn('缺少必要的预览数据元素');
        return;
    }
    
    const totalAmountInCents = amountToCents(amountInput.value);
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    if (startDateTime > endDateTime) {
        console.warn('开始日期不能晚于结束日期');
        return;
    }
    
    const previewData = generateRecurringPreview(
        startDate,
        endDate,
        recurringExpenseState.frequency,
        totalAmountInCents 
    );
    
    updatePreviewList(previewData);
    updatePreviewSummary(previewData);
}

/**
 * 更新分摊详情显示 (内部辅助)
 * 🔴 修复：split.amount 是以分为单位的
 */
function updateSplitDetailDisplay() {
    const splitDetailContainer = document.getElementById('recurring-split-list');
    if (!splitDetailContainer) {
        console.error('找不到分摊详情容器');
        return;
    }
    
    splitDetailContainer.innerHTML = '';
    
    if (recurringMemberSplits.length === 0) {
        splitDetailContainer.innerHTML = '<p class="text-gray-500">请选择参与者</p>';
        return;
    }
    
    recurringMemberSplits.forEach(split => {
        const detailItem = document.createElement('div');
        detailItem.className = 'flex justify-between items-center p-2 bg-gray-50 rounded';
        
        const memberName = document.createElement('span');
        memberName.className = 'text-sm text-gray-700';
        memberName.textContent = split.user?.username || '未知用户';
        
        const amountSpan = document.createElement('span');
        amountSpan.className = 'text-sm font-medium text-gray-900';
        
        const displayAmount = centsToAmountString(split.amount);
        amountSpan.textContent = `¥${displayAmount}`;
        
        detailItem.appendChild(memberName);
        detailItem.appendChild(amountSpan);
        splitDetailContainer.appendChild(detailItem);
    });
}

/**
 * 更新定期费用摘要 (内部辅助)
 * 🔴 修复：使用分进行计算
 */
function updateRecurringSummary() {
    const amountInput = document.getElementById('recurring-amount');
    if (!amountInput) return;
    
    const totalAmountInCents = amountToCents(amountInput.value);
    const participantCount = recurringSelectedParticipants.size;
    
    const amountPerPersonInCents = participantCount > 0 ? totalAmountInCents / participantCount : 0;

    const summaryElement = document.getElementById('recurring-split-summary');
    if (summaryElement) {
        const displayTotal = centsToAmountString(totalAmountInCents);
        const displayPerPerson = centsToAmountString(amountPerPersonInCents);
        
        summaryElement.innerHTML = `
            <div class="flex justify-between text-sm">
                <span>总金额:</span>
                <span class="font-medium">¥${displayTotal}</span>
            </div>
            <div class="flex justify-between text-sm">
                <span>参与者:</span>
                <span class="font-medium">${participantCount} 人</span>
            </div>
            <div class="flex justify-between text-sm">
                <span>每人约:</span>
                <span class="font-medium">¥${displayPerPerson}</span>
            </div>
        `;
    }
}


/**
 * 更新分摊计算 (内部辅助)
 * 🔴 修复：使用分进行计算
 */
function updateRecurringSplitCalculation() {
    const amountInput = document.getElementById('recurring-amount');
    if (!amountInput || !amountInput.value) {
        recurringMemberSplits = [];
        updateSplitDetailDisplay();
        updateRecurringSummary();
        return;
    }
    
    const totalAmountInCents = amountToCents(amountInput.value);
    const selectedMemberIds = Array.from(recurringSelectedParticipants);

    if (selectedMemberIds.length === 0) {
        recurringMemberSplits = [];
        updateSplitDetailDisplay();
        updateRecurringSummary();
        return;
    }
    
    recurringMemberSplits = selectedMemberIds.map(userId => {
        const member = window.groupMembers.find(m => m.user_id === userId);
        if (!member) return null;
        
        const count = selectedMemberIds.length;
        const baseAmount = Math.floor(totalAmountInCents / count);
        const remainder = totalAmountInCents % count;
        
        let splitAmountInCents = baseAmount;
        const memberIndex = selectedMemberIds.indexOf(userId);
        if (memberIndex < remainder) {
            splitAmountInCents += 1;
        }
        
        return {
            user_id: userId,
            user: member.user,
            amount: splitAmountInCents // 🔴 存储分
        };
    }).filter(split => split !== null);
    
    const sum = recurringMemberSplits.reduce((acc, s) => acc + s.amount, 0);
    console.log(`分摊计算完成 (分): 总额 ${totalAmountInCents}, 分摊总和 ${sum}`);
    
    updateSplitDetailDisplay();
    updateRecurringSummary();
}


/**
 * 验证表单 (内部辅助)
 */
function validateRecurringExpenseForm() {
    const amountInput = document.getElementById('recurring-amount');
    const payerSelect = document.getElementById('recurring-payer');
    const startDateInput = document.getElementById('repeat-start');
    const endDateInput = document.getElementById('repeat-end');
    
    if (!amountInput || !payerSelect || !startDateInput || !endDateInput) {
        return { isValid: false, message: '表单元素缺失' };
    }
    
    const amountInCents = amountToCents(amountInput.value);
    if (amountInCents <= 0) {
        return { isValid: false, message: '请输入有效的金额' };
    }
    
    if (!payerSelect.value) {
        return { isValid: false, message: '请选择付款人' };
    }
    
    if (recurringSelectedParticipants.size === 0) {
        return { isValid: false, message: '请至少选择一位参与者' };
    }
    
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);
    
    if (startDate > endDate) {
        return { isValid: false, message: '开始日期不能晚于结束日期' };
    }
    
    return { isValid: true };
}

/**
 * 收集表单数据 (内部辅助)
 * 🔴 修复：确保所有金额都是分
 */
function collectRecurringExpenseFormData() {
    const amountInput = document.getElementById('recurring-amount');
    const payerSelect = document.getElementById('recurring-payer');
    const startDateInput = document.getElementById('repeat-start');
    const endDateInput = document.getElementById('repeat-end');
    
    updateRecurringSplitCalculation(); 

    return {
        amount: amountToCents(amountInput.value), // 🔴 转换为分
        currency: 'CNY',
        payer_id: payerSelect.value,
        participants: Array.from(recurringSelectedParticipants),
        frequency: recurringExpenseState.frequency,
        start_date: startDateInput.value,
        end_date: endDateInput.value,
        split_method: recurringSplitMethod,
        member_splits: recurringMemberSplits.map(split => ({
            user_id: split.user_id,
            amount: split.amount 
        }))
    };
}


/**
 * 填充定期费用详情表单
 * 🔴 修复：金额以分为单位
 */
function populateRecurringDetailForm(expense) {
    const amountInput = document.getElementById('recurring-amount');
    const payerSelect = document.getElementById('recurring-payer');
    const startDateInput = document.getElementById('repeat-start');
    const endDateInput = document.getElementById('repeat-end');
    
    if (amountInput) amountInput.value = centsToAmountString(expense.amount); // 🔴 转换
    if (payerSelect) payerSelect.value = expense.payer_id;
    if (startDateInput) startDateInput.value = expense.start_date;
    if (endDateInput) endDateInput.value = expense.end_date || ''; // 🔴
    
    selectFrequency(expense.frequency || 'daily');
    setRecurringSplitMethod(expense.split_type || 'equal');
    
    recurringSelectedParticipants.clear();
    if (expense.splits_definition) {
        const participantIds = expense.splits_definition.map(s => s.user_id);
        participantIds.forEach(id => recurringSelectedParticipants.add(id));
        
        const allCheckboxes = document.querySelectorAll('#recurring-participants-section input[type="checkbox"]');
        allCheckboxes.forEach(cb => {
            cb.checked = recurringSelectedParticipants.has(parseInt(cb.value, 10));
        });
    }
    
    updateRecurringPreview();
    updateRecurringSplitCalculation();
}

/**
 * 重置表单
 */
function resetRecurringForm() {
    const form = document.getElementById('recurring-expense-form');
    if (form) form.reset();

    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('repeat-start');
    if (startDateInput) startDateInput.value = today;
    
    const endDateInput = document.getElementById('repeat-end');
    if (endDateInput) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        endDateInput.value = nextMonth.toISOString().split('T')[0];
    }
    
    initializeParticipantSelection();
    
    recurringExpenseState = {
        isRecurring: false,
        frequency: 'daily',
        startDate: '',
        endDate: '',
    };
    recurringSplitMethod = 'equal';
    selectFrequency('daily');
    setRecurringSplitMethod('equal');
}

/**
 * 关闭模态框
 */
function closeRecurringExpenseModal() {
    const modal = document.getElementById('add-recurring-expense-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentEditingRecurringExpense = null;
    resetRecurringForm();
}

function closeRecurringDetailModal() {
    const modal = document.getElementById('recurring-detail-modal');
    if (modal) {
        modal.classList.add('hidden'); // 🔴 修复：使用 hidden
    }
}

/**
 * 打开添加定期费用模态框
 */
function openAddRecurringModal() {
    const modal = document.getElementById('add-recurring-expense-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
    
    console.log('🔧 打开定期费用模态框，初始化表单数据...');
    currentEditingRecurringExpense = null;
    resetRecurringForm();
    updateRecurringFormMembers();
}

/**
 * 打开定期费用详情模态框
 */
export function openRecurringDetail(expenseId) {
    // 🔴 修复：此函数是占位符，实际逻辑应在 handleEditRecurringExpense 中
    console.warn(`openRecurringDetail(${expenseId}) 已被调用，但已被 handleEditRecurringExpense 替代`);
    handleEditRecurringExpense(expenseId); // 🔴 修复：重定向到编辑
}


// =================================================================
// --- 🔴 修复：将初始化函数移到辅助函数之后 ---
// =================================================================

/**
 * 初始化付款人选择器
 */
function initializePayerSelector() {
    const payerSelect = document.getElementById('recurring-payer');
    if (!payerSelect) {
        console.error('找不到付款人选择器元素 recurring-payer');
        return;
    }
    
    console.log('初始化付款人选择器，组员数据:', window.groupMembers);
    
    if (window.groupMembers && window.groupMembers.length > 0) {
        payerSelect.innerHTML = '<option value="">请选择付款人</option>';
        window.groupMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.user_id; 
            option.textContent = member.user?.username || member.nickname || `User ${member.user_id}`;
            
            // 🔴 修复：设置默认付款人
            if (member.user_id === window.CURRENT_USER_ID) {
                option.selected = true;
            }
            
            payerSelect.appendChild(option);
        });
        console.log(`付款人选择器已初始化，共 ${window.groupMembers.length} 个成员`);
    } else {
        console.warn('组员数据为空，无法初始化付款人选择器');
        payerSelect.innerHTML = '<option value="">暂无可选择的付款人</option>';
    }
}

/**
 * 初始化参与者选择
 */
function initializeParticipantSelection() {
    const container = document.getElementById('recurring-participants-section');
    if (!container) {
        console.error('找不到参与者容器 recurring-participants-section');
        return;
    }
    
    const gridContainer = container.querySelector('.grid');
    if (!gridContainer) {
        console.error('找不到参与者网格容器 .grid');
        return;
    }
    
    console.log('初始化参与者选择，组员数据:', window.groupMembers);
    
    gridContainer.innerHTML = '';
    recurringSelectedParticipants.clear();
    
    if (window.groupMembers && window.groupMembers.length > 0) {
        window.groupMembers.forEach(member => {
            const wrapper = document.createElement('label'); // 🔴 修复：使用 label
            wrapper.className = 'flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border'; // 🔴 修复：样式
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `recurring-participant-${member.user_id}`;
            checkbox.value = member.user_id;
            checkbox.className = 'rounded border-gray-300 text-indigo-600 focus:ring-indigo-500';
            
            const label = document.createElement('span'); // 🔴 修复：使用 span
            label.className = 'text-sm font-medium text-gray-700 cursor-pointer';
            label.textContent = member.user?.username || member.nickname || `User ${member.user_id}`;
            
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    recurringSelectedParticipants.add(parseInt(this.value, 10));
                } else {
                    recurringSelectedParticipants.delete(parseInt(this.value, 10));
                }
                console.log('参与者选择变化:', Array.from(recurringSelectedParticipants));
                updateRecurringSplitCalculation();
            });
            
            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            gridContainer.appendChild(wrapper);
            
            checkbox.checked = true;
            recurringSelectedParticipants.add(member.user_id);
        });
        console.log(`参与者选择器已初始化，共 ${window.groupMembers.length} 个成员`);
        
        // 🔴 修复：初始化后立即计算
        updateRecurringSplitCalculation();
        
    } else {
        console.warn('组员数据为空，无法初始化参与者选择');
        gridContainer.innerHTML = '<p class="text-gray-500">暂无可选择的参与者</p>';
    }
}


/**
 * 设置事件监听器
 */
function setupEventListeners() {
    console.log('设置定期费用表单事件监听器');
    
    const amountInput = document.getElementById('recurring-amount');
    if (amountInput) {
        amountInput.removeEventListener('input', handleRecurringAmountChange);
        amountInput.addEventListener('input', handleRecurringAmountChange);
        console.log('已设置金额输入框事件监听器');
    } else {
        console.error('找不到金额输入框 recurring-amount');
    }
    
    const startDateInput = document.getElementById('repeat-start');
    if (startDateInput) {
        startDateInput.addEventListener('change', function() {
            recurringExpenseState.startDate = this.value;
            console.log('开始日期变化:', this.value);
            updateRecurringPreview();
        });
    }
    
    const endDateInput = document.getElementById('repeat-end');
    if (endDateInput) {
        endDateInput.addEventListener('change', function() {
            recurringExpenseState.endDate = this.value;
            console.log('结束日期变化:', this.value);
            updateRecurringPreview();
        });
    }
    
    const payerSelect = document.getElementById('recurring-payer');
    if (payerSelect) {
        payerSelect.addEventListener('change', function() {
            console.log('付款人已选择:', this.value);
        });
    }
    
    console.log('定期费用表单事件监听器设置完成');
}

/**
 * 刷新定期费用列表
 */
export async function refreshRecurringList() {
    try {
        const response = await fetch(`/groups/${window.currentGroupId}/recurring-expenses`, {
             headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        
        if (response.ok) {
            const expenses = await response.json();
            window.recurringExpensesList = expenses; // 🔴 修复：更新全局列表
            renderRecurringExpenseList(expenses);
        } else {
            console.error('获取定期费用列表失败');
            renderRecurringExpenseList([]);
        }
    } catch (error) {
        console.error('获取定期费用列表失败:', error);
        renderRecurringExpenseList([]);
    }
}

// =================================================================
// --- 🔴 修复：将主初始化函数移到最后 ---
// =================================================================

/**
 * 初始化定期费用表单 (主函数)
 */
export function initializeRecurringExpenseForm() {
    console.log('定期费用模块开始初始化...');
    
    if (isRecurringFormInitialized) {
        console.log('定期费用表单已初始化，跳过重复执行');
        // 🔴 修复：即使已初始化，也应更新成员列表
        updateRecurringFormMembers(true); 
        return;
    }
    
    console.log('初始化定期费用表单 - v2025.11.10.004修复版本');

    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('repeat-start');
    if (startDateInput) {
        startDateInput.value = today;
        recurringExpenseState.startDate = today;
        console.log('设置开始日期:', today);
    } else {
        console.error('找不到开始日期输入框 repeat-start');
    }
    
    const endDateInput = document.getElementById('repeat-end');
    if (endDateInput) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        endDateInput.value = nextMonth.toISOString().split('T')[0];
        recurringExpenseState.endDate = endDateInput.value;
        console.log('设置结束日期:', endDateInput.value);
    } else {
        console.error('找不到结束日期输入框 repeat-end');
    }

    if (!window.groupMembers || window.groupMembers.length === 0) {
        console.warn('组员数据尚未加载，定期费用表单可能无法正常初始化');
        const checkGroupMembers = () => {
            if (window.groupMembers && window.groupMembers.length > 0) {
                console.log('检测到组员数据已加载，初始化付款人选择器和参与者选择');
                initializePayerSelector();
                initializeParticipantSelection();
                setupEventListeners(); // 🔴 修复：在这里调用
                isRecurringFormInitialized = true;
            } else {
                console.log('等待组员数据加载中...');
                setTimeout(checkGroupMembers, 1000);
            }
        };
        checkGroupMembers();
        return;
    }
    
    initializePayerSelector();
    initializeParticipantSelection();
    setupEventListeners(); // 🔴 修复：在这里调用
    
    isRecurringFormInitialized = true;
}

/**
 * 更新表单成员数据
 */
export function updateRecurringFormMembers(force = false) {
    console.log('更新定期费用表单成员数据');
    if (!isRecurringFormInitialized || force) {
        // initializeRecurringExpenseForm(); // 🔴 修复：不应再次调用主初始化
        initializePayerSelector();
        initializeParticipantSelection();
    }
}


// =================================================================
// --- 页面功能函数 (供 HTML 调用) ---
// =================================================================

/**
 * 选择频率
 */
export function selectFrequency(frequency) {
    console.log('选择频率:', frequency);
    
    recurringExpenseState.frequency = frequency;
    
    const frequencyButtons = document.querySelectorAll('.frequency-option');
    frequencyButtons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.getAttribute('data-frequency') === frequency) { // 🔴 修复：简化
            btn.classList.add('selected');
        }
    });
    
    updateRecurringPreview();
}

/**
 * 设置定期费用分摊方式
 */
export function setRecurringSplitMethod(method) {
    console.log('设置定期费用分摊方式:', method);
    
    recurringSplitMethod = method;
    
    const equalBtn = document.getElementById('recurring-split-equal');
    const customBtn = document.getElementById('recurring-split-exact');
    
    if (equalBtn && customBtn) {
        if (method === 'equal') {
            equalBtn.classList.add('active');
            customBtn.classList.remove('active');
        } else {
            equalBtn.classList.remove('active');
            customBtn.classList.add('active');
        }
    }
    
    updateRecurringSplitCalculation();
    updateSplitDetailDisplay();
    updateRecurringSummary();
    updateRecurringPreview();
}

/**
 * 处理定期费用金额变化
 */
export function handleRecurringAmountChange() {
    console.log('处理定期费用金额变化');
    
    updateRecurringSplitCalculation();
    updateRecurringPreview();
}

/**
 * 保存定期费用
 */
export async function handleSaveRecurringExpense(event) {
    event.preventDefault();
    console.log('保存定期费用');
    
    try {
        const validationResult = validateRecurringExpenseForm();
        if (!validationResult.isValid) {
            showCustomAlert(validationResult.message, 'error');
            return;
        }
        
        const formData = collectRecurringExpenseFormData();
        
        const apiData = {
            description: document.getElementById('recurring-description').value || '定期费用',
            amount: formData.amount, // 分
            frequency: formData.frequency,
            start_date: formData.start_date,
            payer_id: parseInt(formData.payer_id, 10),
            split_type: formData.split_method,
            splits: formData.member_splits.map(s => ({
                user_id: s.user_id,
                amount: s.amount // 分
            }))
        };
        
        console.log("发送到API的数据:", apiData);

        const url = currentEditingRecurringExpense 
            ? `/groups/${window.currentGroupId}/recurring-expenses/${currentEditingRecurringExpense.id}`
            : `/groups/${window.currentGroupId}/recurring-expenses`;
            
        const response = await fetch(url, {
            method: currentEditingRecurringExpense ? 'PATCH' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(apiData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showCustomAlert(currentEditingRecurringExpense ? '定期费用更新成功' : '定期费用创建成功', 'success');
            
            closeRecurringExpenseModal();
            
            if (window.refreshRecurringList) {
                window.refreshRecurringList();
            } else {
                await refreshRecurringList(); // 🔴 修复：调用此文件中的
            }
        } else {
            const error = await response.json();
            const errorMsg = error.detail ? (typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail)) : '保存失败';
            showCustomAlert(errorMsg, 'error');
        }
    } catch (error) {
        console.error('保存定期费用失败:', error);
        showCustomAlert('保存失败，请稍后重试', 'error');
    }
}

/**
 * 禁用定期费用
 */
export async function handleDisableRecurringExpense(expenseId) {
    try {
        const response = await fetch(`/groups/${window.currentGroupId}/recurring-expenses/${expenseId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ is_active: false })
        });
        
        if (response.ok) {
            showCustomAlert('定期费用已禁用', 'success');
            await refreshRecurringList();
        } else {
            const error = await response.json();
            showCustomAlert(error.detail || '操作失败', 'error');
        }
    } catch (error) {
        console.error('禁用定期费用失败:', error);
        showCustomAlert('操作失败，请稍后重试', 'error');
    }
}

/**
 * 启用定期费用
 */
export async function handleEnableRecurringExpense(expenseId) {
    try {
        const response = await fetch(`/groups/${window.currentGroupId}/recurring-expenses/${expenseId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ is_active: true })
        });
        
        if (response.ok) {
            showCustomAlert('定期费用已启用', 'success');
            await refreshRecurringList();
        } else {
            const error = await response.json();
            showCustomAlert(error.detail || '操作失败', 'error');
        }
    } catch (error) {
        console.error('启用定期费用失败:', error);
        showCustomAlert('操作失败，请稍后重试', 'error');
    }
}

/**
 * 删除定期费用
 */
export async function handleDeleteRecurringExpense(expenseId) {
    if (!confirm('确定要删除这个定期费用吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/groups/${window.currentGroupId}/recurring-expenses/${expenseId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        
        if (response.status === 204) {
            showCustomAlert('定期费用已删除', 'success');
            await refreshRecurringList();
        } else {
            const error = await response.json();
            showCustomAlert(error.detail || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除定期费用失败:', error);
        showCustomAlert('删除失败，请稍后重试', 'error');
    }
}

/**
 * 编辑定期费用
 */
export async function handleEditRecurringExpense(expenseId) {
    try {
        const response = await fetch(`/groups/${window.currentGroupId}/recurring-expenses/${expenseId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        
        if (response.ok) {
            const expense = await response.json();
            
            openAddRecurringModal(); // 🔴 修复：打开主模态框
            
            // 🔴 修复：需要一点延迟以确保模态框已打开且 DOM 元素已准备好
            setTimeout(() => {
                populateRecurringDetailForm(expense);
                currentEditingRecurringExpense = expense;
            }, 100); 
            
        } else {
            const error = await response.json();
            showCustomAlert(error.detail || '获取定期费用信息失败', 'error');
        }
    } catch (error) {
        console.error('获取定期费用信息失败:', error);
        showCustomAlert('获取信息失败，请稍后重试', 'error');
    }
}

// ==================== 全局函数绑定 ====================

console.log('开始暴露定期费用函数到全局...');

window.handleSaveRecurringExpense = handleSaveRecurringExpense;
window.selectFrequency = selectFrequency;
window.setRecurringSplitMethod = setRecurringSplitMethod;
window.handleRecurringAmountChange = handleRecurringAmountChange;
window.saveRecurringExpenseHandler = handleSaveRecurringExpense; // 🔴 修复：别名
window.openAddRecurringModal = openAddRecurringModal;
window.openRecurringDetail = openRecurringDetail;
window.handleRecurringCancel = closeRecurringExpenseModal; // 🔴 修复：别名
window.handleRecurringDetailCancel = closeRecurringDetailModal; // 🔴 修复：别名
window.handleDisableRecurringExpense = handleDisableRecurringExpense;
window.handleEnableRecurringExpense = handleEnableRecurringExpense;
window.handleDeleteRecurringExpense = handleDeleteRecurringExpense;
window.handleEditRecurringExpense = handleEditRecurringExpense;
window.refreshRecurringList = refreshRecurringList;
window.initializeRecurringExpenseForm = initializeRecurringExpenseForm;
window.updateRecurringFormMembers = updateRecurringFormMembers;

console.log('定期费用模块已加载，所有函数已暴露到全局 - v2025.11.10.004');

// 🔴 修复：立即绑定事件监听器
initializeEventListeners();

/**
 * 初始化事件监听器
 */
function initializeEventListeners() {
    console.log('初始化定期费用事件监听器...');
    
    const amountInput = document.getElementById('recurring-amount');
    if (amountInput) {
        amountInput.removeAttribute('oninput');
        amountInput.addEventListener('input', handleRecurringAmountChange);
        console.log('✅ 金额输入框事件监听器已绑定');
    } else {
        console.error('❌ 找不到金额输入框 recurring-amount');
    }
    
    const frequencyButtons = document.querySelectorAll('.frequency-option');
    frequencyButtons.forEach(button => {
        button.removeAttribute('onclick');
        button.addEventListener('click', function() {
            const frequency = this.getAttribute('data-frequency');
            if (frequency) {
                console.log('✅ 选择频率:', frequency);
                selectFrequency(frequency);
            }
        });
    });
    console.log(`✅ ${frequencyButtons.length} 个重复频率按钮事件监听器已绑定`);
    
    const payerSelect = document.getElementById('recurring-payer');
    if (payerSelect) {
        payerSelect.addEventListener('change', () => {
            console.log('支付人选择已更改');
        });
    }

    const recSplitMethodContainer = document.getElementById('recurring-split-method-selection');
    if (recSplitMethodContainer) {
        recSplitMethodContainer.addEventListener('click', (event) => {
            const button = event.target.closest('.split-toggle-btn');
            if (button && button.dataset.method) {
                const method = button.dataset.method;
                setRecurringSplitMethod(method);
                console.log(`✅ "添加定期费用" 模态框: 分摊方式切换为 ${method}`);
            }
        });
        console.log('✅ "添加定期费用" 模态框: 分摊按钮事件监听器已绑定');
    } else {
        console.error('❌ 找不到 "添加定期费用" 模态框的分摊按钮容器 #recurring-split-method-selection');
    }
    
    console.log('定期费用事件监听器初始化完成');
}

// 🔴 修复：确保在 utils.js 加载后再调用
if (window.showCustomAlert) {
    // 立即调用
    initializeEventListeners();
} else {
    // 延迟调用
    document.addEventListener('DOMContentLoaded', initializeEventListeners);
}