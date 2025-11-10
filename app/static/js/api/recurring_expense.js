// recurring_expense.js - 定期费用相关的CRUD操作、频率设置
// 防止缓存版本: 2025.11.07.004 - 修复无限递归
const JS_CACHE_VERSION = '2025.11.07.004';

// 🔴 修复：import 必须在顶层
import { centsToAmountString as importedCentsToAmountString } from '../ui/utils.js';

// 从 ui/utils.js 导入金额转换函数
let centsToAmountString;
if (typeof importedCentsToAmountString === 'function') {
    centsToAmountString = importedCentsToAmountString;
} else {
    console.warn('Failed to import from ../ui/utils.js, defining fallback');
    // 如果上面的路径失败，定义一个简单的替代函数
    centsToAmountString = function(cents) {
        return (cents / 100).toFixed(2);
    };
    window.centsToAmountString = centsToAmountString;
}


// --- 全局状态 ---
let recurringExpenseState = {
    isRecurring: false,
    frequency: 'daily',
    startDate: '',
    endDate: '',
};
let recurringSelectedParticipants = new Set();
let recurringSplitMethod = 'equal';
let recurringMemberSplits = [];
let currentEditingRecurringExpense = null;

// 🔴 v12.0修复：防止重复初始化
let isRecurringFormInitialized = false;

/**
 * 初始化定期费用表单
 */
export function initializeRecurringExpenseForm() {
    console.log('定期费用模块开始初始化...');
    
    // 🔴 v12.0修复：防止重复初始化
    if (isRecurringFormInitialized) {
        console.log('定期费用表单已初始化，跳过重复执行');
        return;
    }
    
    console.log('初始化定期费用表单 - v2025.11.07.002修复版本');

    // 设置默认日期 - 修复：正确使用repeat-start和repeat-end
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
        // 设置默认结束日期为一个月后
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        endDateInput.value = nextMonth.toISOString().split('T')[0];
        recurringExpenseState.endDate = endDateInput.value;
        console.log('设置结束日期:', endDateInput.value);
    } else {
        console.error('找不到结束日期输入框 repeat-end');
    }

    // 检查组员数据是否已加载
    if (!window.groupMembers || window.groupMembers.length === 0) {
        console.warn('组员数据尚未加载，定期费用表单可能无法正常初始化');
        // 延迟初始化，等待组员数据加载
        const checkGroupMembers = () => {
            if (window.groupMembers && window.groupMembers.length > 0) {
                console.log('检测到组员数据已加载，初始化付款人选择器和参与者选择');
                // 🔴 v6.3修复：确保在延迟初始化时也调用updateRecurringFormMembers
                // 🔴 修复：此处不应调用 updateRecurringFormMembers()，而是直接调用初始化函数
                initializePayerSelector();
                initializeParticipantSelection();
                setupEventListeners();
                isRecurringFormInitialized = true;
            } else {
                // 继续等待
                console.log('等待组员数据加载中...');
                setTimeout(checkGroupMembers, 1000);
            }
        };
        checkGroupMembers();
        return;
    }

    // 🔴 v6.3修复：确保在初始化时调用updateRecurringFormMembers
    // updateRecurringFormMembers(); // 🔴 修复：移除此行，它会导致无限递归
    
    // 初始化付款人选择器和参与者选择
    initializePayerSelector();
    initializeParticipantSelection();
    setupEventListeners();
    
    isRecurringFormInitialized = true;
}

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
            option.value = member.user_id; // 修复：使用正确的user_id
            option.textContent = member.user?.username || member.nickname || `User ${member.user_id}`;
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
    
    // 找到网格容器
    const gridContainer = container.querySelector('.grid');
    if (!gridContainer) {
        console.error('找不到参与者网格容器 .grid');
        return;
    }
    
    console.log('初始化参与者选择，组员数据:', window.groupMembers);
    
    // 清空现有内容
    gridContainer.innerHTML = '';
    
    if (window.groupMembers && window.groupMembers.length > 0) {
        window.groupMembers.forEach(member => {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex items-center space-x-2 p-2 bg-gray-50 rounded-lg';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `participant-${member.user_id}`;
            checkbox.value = member.user_id;
            checkbox.className = 'rounded border-gray-300 text-indigo-600 focus:ring-indigo-500';
            
            const label = document.createElement('label');
            label.htmlFor = `participant-${member.user_id}`;
            label.className = 'text-sm font-medium text-gray-700 cursor-pointer';
            label.textContent = member.user?.username || member.nickname || `User ${member.user_id}`;
            
            // 添加事件监听器
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    recurringSelectedParticipants.add(member.user_id);
                } else {
                    recurringSelectedParticipants.delete(member.user_id);
                }
                console.log('参与者选择变化:', Array.from(recurringSelectedParticipants));
                updateRecurringSplitCalculation();
            });
            
            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            gridContainer.appendChild(wrapper);
            
            // 默认选中所有参与者
            checkbox.checked = true;
            recurringSelectedParticipants.add(member.user_id);
        });
        console.log(`参与者选择器已初始化，共 ${window.groupMembers.length} 个成员`);
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
    
    // 金额输入框事件
    const amountInput = document.getElementById('recurring-amount');
    if (amountInput) {
        // 移除旧的事件监听器
        amountInput.removeEventListener('input', handleRecurringAmountChange);
        // 添加新的事件监听器
        amountInput.addEventListener('input', handleRecurringAmountChange);
        console.log('已设置金额输入框事件监听器');
    } else {
        console.error('找不到金额输入框 recurring-amount');
    }
    
    // 开始日期事件
    const startDateInput = document.getElementById('repeat-start');
    if (startDateInput) {
        startDateInput.addEventListener('change', function() {
            recurringExpenseState.startDate = this.value;
            console.log('开始日期变化:', this.value);
            updateRecurringPreview();
        });
    }
    
    // 结束日期事件
    const endDateInput = document.getElementById('repeat-end');
    if (endDateInput) {
        endDateInput.addEventListener('change', function() {
            recurringExpenseState.endDate = this.value;
            console.log('结束日期变化:', this.value);
            updateRecurringPreview();
        });
    }
    
    // 付款人选择事件
    const payerSelect = document.getElementById('recurring-payer');
    if (payerSelect) {
        payerSelect.addEventListener('change', function() {
            console.log('付款人已选择:', this.value);
        });
    }
    
    console.log('定期费用表单事件监听器设置完成');
}

/**
 * 更新表单成员数据
 */
export function updateRecurringFormMembers() {
    console.log('更新定期费用表单成员数据');
    if (!isRecurringFormInitialized) {
        // 如果尚未初始化，则初始化
        initializeRecurringExpenseForm();
    } else {
        // 如果已经初始化，则重新初始化付款人选择器和参与者选择
        initializePayerSelector();
        initializeParticipantSelection();
    }
}

/**
 * 选择频率
 */
export function selectFrequency(frequency) {
    console.log('选择频率:', frequency);
    
    // 更新频率状态
    recurringExpenseState.frequency = frequency;
    
    // 更新UI选中状态
    const frequencyButtons = document.querySelectorAll('.frequency-option');
    frequencyButtons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.getAttribute('data-frequency') === frequency || btn.getAttribute('onclick')?.includes(`'${frequency}'`)) {
            btn.classList.add('selected');
        }
    });
    
    // 更新预览信息
    updateRecurringPreview();
}

/**
 * 设置定期费用分摊方式 - 修复：防止无限递归
 */
export function setRecurringSplitMethod(method) {
    console.log('设置定期费用分摊方式:', method);
    
    recurringSplitMethod = method;
    
    // 更新UI选中状态
    const methodButtons = document.querySelectorAll('.split-method-option');
    methodButtons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.getAttribute('data-method') === method) {
            btn.classList.add('selected');
        }
    });
    
    // 重新计算分摊金额
    updateRecurringSplitCalculation();
    
    // 更新分摊详情显示和摘要信息
    updateSplitDetailDisplay();
    updateRecurringSummary();
    
    // 更新预览信息
    updateRecurringPreview();
}

/**
 * 处理定期费用金额变化 - 修复：统一函数实现
 */
export function handleRecurringAmountChange() {
    console.log('处理定期费用金额变化');
    
    // 重新计算分摊金额
    updateRecurringSplitCalculation();
    
    // 更新预览信息
    updateRecurringPreview();
    
    // 更新UI显示
    updateAmountDisplay();
}

/**
 * 更新定期费用预览
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
    
    const totalAmount = parseFloat(amountInput.value) || 0;
    
    // 验证日期范围
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    if (startDateTime > endDateTime) {
        console.warn('开始日期不能晚于结束日期');
        return;
    }
    
    // 根据频率和日期生成预览
    const previewData = generateRecurringPreview(
        startDate,
        endDate,
        recurringExpenseState.frequency,
        totalAmount
    );
    
    // 更新预览列表
    updatePreviewList(previewData);
    
    // 更新预览摘要
    updatePreviewSummary(previewData);
}

/**
 * 生成定期费用预览数据
 */
function generateRecurringPreview(startDate, endDate, frequency, totalAmount) {
    const previewData = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        previewData.push({
            date: dateStr,
            amount: totalAmount,
            frequency: frequency
        });
        
        // 根据频率递增日期
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
        const displayAmount = centsToAmountString ? centsToAmountString(item.amount) : (item.amount / 100).toFixed(2);
        amountSpan.textContent = `¥${displayAmount}`;
        
        listItem.appendChild(dateSpan);
        listItem.appendChild(amountSpan);
        previewList.appendChild(listItem);
    });
}

/**
 * 更新预览摘要
 */
function updatePreviewSummary(previewData) {
    const totalCount = previewData.length;
    const totalAmount = previewData.reduce((sum, item) => sum + item.amount, 0);
    
    const summaryElement = document.getElementById('recurring-preview-summary');
    if (summaryElement) {
        const participantCount = recurringSelectedParticipants.size;
        const amountPerPerson = participantCount > 0 ? totalAmount / participantCount : 0;
        const displayTotal = centsToAmountString ? centsToAmountString(totalAmount) : (totalAmount / 100).toFixed(2);
        const displayPerPerson = centsToAmountString ? centsToAmountString(amountPerPerson) : (amountPerPerson / 100).toFixed(2);
        
        summaryElement.textContent = `共 ${totalCount} 次，合计 ¥${displayTotal}，每人 ¥${displayPerPerson}`;
    }
}

/**
 * 更新分摊计算
 */
function updateRecurringSplitCalculation() {
    const amountInput = document.getElementById('recurring-amount');
    if (!amountInput) return;
    
    const totalAmount = parseFloat(amountInput.value) || 0;
    const selectedMemberIds = Array.from(recurringSelectedParticipants);
    
    // 重新计算每个成员的分摊金额
    recurringMemberSplits = selectedMemberIds.map(userId => {
        const member = window.groupMembers.find(m => m.user_id === userId);
        if (!member) return null;
        
        const splitAmount = selectedMemberIds.length > 0 ? totalAmount / selectedMemberIds.length : 0;
        
        return {
            user_id: userId,
            user: member.user,
            amount: splitAmount
        };
    }).filter(split => split !== null);
}

/**
 * 更新分摊详情显示
 */
function updateSplitDetailDisplay() {
    const splitDetailContainer = document.getElementById('recurring-split-detail');
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
        const displayAmount = centsToAmountString ? centsToAmountString(split.amount) : (split.amount / 100).toFixed(2);
        amountSpan.textContent = `¥${displayAmount}`;
        
        detailItem.appendChild(memberName);
        detailItem.appendChild(amountSpan);
        splitDetailContainer.appendChild(detailItem);
    });
}

/**
 * 更新定期费用摘要
 */
function updateRecurringSummary() {
    const amountInput = document.getElementById('recurring-amount');
    if (!amountInput) return;
    
    const totalAmount = parseFloat(amountInput.value) || 0;
    const participantCount = recurringSelectedParticipants.size;
    const amountPerPerson = participantCount > 0 ? totalAmount / participantCount : 0;
    
    const summaryElement = document.getElementById('recurring-summary');
    if (summaryElement) {
        const displayTotal = centsToAmountString ? centsToAmountString(totalAmount) : (totalAmount / 100).toFixed(2);
        const displayPerPerson = centsToAmountString ? centsToAmountString(amountPerPerson) : (amountPerPerson / 100).toFixed(2);
        summaryElement.textContent = `总金额: ¥${displayTotal}，参与者: ${participantCount}人，每人: ¥${displayPerPerson}`;
    }
}

/**
 * 更新金额显示
 */
function updateAmountDisplay() {
    const amountInput = document.getElementById('recurring-amount');
    if (!amountInput) return;
    
    // 可以在这里添加金额格式化显示逻辑
    console.log('金额已更新:', amountInput.value);
}

/**
 * 验证表单
 */
function validateRecurringExpenseForm() {
    const amountInput = document.getElementById('recurring-amount');
    const payerSelect = document.getElementById('recurring-payer');
    const startDateInput = document.getElementById('repeat-start');
    const endDateInput = document.getElementById('repeat-end');
    
    if (!amountInput || !payerSelect || !startDateInput || !endDateInput) {
        return { isValid: false, message: '表单元素缺失' };
    }
    
    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) {
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
 * 收集表单数据
 */
function collectRecurringExpenseFormData() {
    const amountInput = document.getElementById('recurring-amount');
    const payerSelect = document.getElementById('recurring-payer');
    const startDateInput = document.getElementById('repeat-start');
    const endDateInput = document.getElementById('repeat-end');
    
    return {
        amount: Math.round(parseFloat(amountInput.value) * 100), // 转换为分
        currency: 'CNY',
        payer_id: payerSelect.value,
        participants: Array.from(recurringSelectedParticipants),
        frequency: recurringExpenseState.frequency,
        start_date: startDateInput.value,
        end_date: endDateInput.value,
        split_method: recurringSplitMethod,
        member_splits: recurringMemberSplits.map(split => ({
            user_id: split.user_id,
            amount: Math.round(split.amount * 100) // 转换为分
        }))
    };
}

/**
 * 保存定期费用
 */
export async function handleSaveRecurringExpense(event) {
    event.preventDefault();
    console.log('保存定期费用');
    
    try {
        // 表单验证
        const validationResult = validateRecurringExpenseForm();
        if (!validationResult.isValid) {
            if (window.showCustomAlert) {
                window.showCustomAlert(validationResult.message, 'error');
            } else {
                alert(validationResult.message);
            }
            return;
        }
        
        // 数据组装
        const formData = collectRecurringExpenseFormData();
        
        // API调用保存定期费用
        const url = currentEditingRecurringExpense 
            ? `/groups/${window.currentGroupId}/recurring-expenses/${currentEditingRecurringExpense.id}`
            : `/groups/${window.currentGroupId}/recurring-expenses`;
            
        const response = await fetch(url, {
            method: currentEditingRecurringExpense ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        // 处理响应
        if (response.ok) {
            const result = await response.json();
            if (window.showCustomAlert) {
                window.showCustomAlert(currentEditingRecurringExpense ? '定期费用更新成功' : '定期费用创建成功', 'success');
            } else {
                alert(currentEditingRecurringExpense ? '定期费用更新成功' : '定期费用创建成功');
            }
            
            // 关闭弹窗
            closeRecurringExpenseModal();
            
            // 刷新定期费用列表
            await refreshRecurringList();
        } else {
            const error = await response.json();
            if (window.showCustomAlert) {
                window.showCustomAlert(error.message || '保存失败', 'error');
            } else {
                alert(error.message || '保存失败');
            }
        }
    } catch (error) {
        console.error('保存定期费用失败:', error);
        if (window.showCustomAlert) {
            window.showCustomAlert('保存失败，请稍后重试', 'error');
        } else {
            alert('保存失败，请稍后重试');
        }
    }
}

/**
 * 关闭模态框
 */
function closeRecurringExpenseModal() {
    const modal = document.getElementById('add-recurring-expense-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // 重置编辑状态
    currentEditingRecurringExpense = null;
    
    // 重置表单
    resetRecurringForm();
}

/**
 * 重置表单
 */
function resetRecurringForm() {
    const amountInput = document.getElementById('recurring-amount');
    const payerSelect = document.getElementById('recurring-payer');
    const startDateInput = document.getElementById('repeat-start');
    const endDateInput = document.getElementById('repeat-end');
    
    if (amountInput) amountInput.value = '';
    if (payerSelect) payerSelect.value = '';
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    
    // 重置参与者选择
    recurringSelectedParticipants.clear();
    initializeParticipantSelection();
    
    // 重置状态
    recurringExpenseState = {
        isRecurring: false,
        frequency: 'daily',
        startDate: '',
        endDate: '',
    };
}

// ==================== API相关函数 ====================

/**
 * 禁用定期费用
 */
export async function handleDisableRecurringExpense(expenseId) {
    try {
        const response = await fetch(`/groups/${window.currentGroupId}/recurring-expenses/${expenseId}/disable`, {
            method: 'POST',
        });
        
        if (response.ok) {
            if (window.showCustomAlert) {
                window.showCustomAlert('定期费用已禁用', 'success');
            } else {
                alert('定期费用已禁用');
            }
            await refreshRecurringList();
        } else {
            const error = await response.json();
            if (window.showCustomAlert) {
                window.showCustomAlert(error.message || '操作失败', 'error');
            } else {
                alert(error.message || '操作失败');
            }
        }
    } catch (error) {
        console.error('禁用定期费用失败:', error);
        if (window.showCustomAlert) {
            window.showCustomAlert('操作失败，请稍后重试', 'error');
        } else {
            alert('操作失败，请稍后重试');
        }
    }
}

/**
 * 启用定期费用
 */
export async function handleEnableRecurringExpense(expenseId) {
    try {
        const response = await fetch(`/groups/${window.currentGroupId}/recurring-expenses/${expenseId}/enable`, {
            method: 'POST',
        });
        
        if (response.ok) {
            if (window.showCustomAlert) {
                window.showCustomAlert('定期费用已启用', 'success');
            } else {
                alert('定期费用已启用');
            }
            await refreshRecurringList();
        } else {
            const error = await response.json();
            if (window.showCustomAlert) {
                window.showCustomAlert(error.message || '操作失败', 'error');
            } else {
                alert(error.message || '操作失败');
            }
        }
    } catch (error) {
        console.error('启用定期费用失败:', error);
        if (window.showCustomAlert) {
            window.showCustomAlert('操作失败，请稍后重试', 'error');
        } else {
            alert('操作失败，请稍后重试');
        }
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
        });
        
        if (response.ok) {
            if (window.showCustomAlert) {
                window.showCustomAlert('定期费用已删除', 'success');
            } else {
                alert('定期费用已删除');
            }
            await refreshRecurringList();
        } else {
            const error = await response.json();
            if (window.showCustomAlert) {
                window.showCustomAlert(error.message || '删除失败', 'error');
            } else {
                alert(error.message || '删除失败');
            }
        }
    } catch (error) {
        console.error('删除定期费用失败:', error);
        if (window.showCustomAlert) {
            window.showCustomAlert('删除失败，请稍后重试', 'error');
        } else {
            alert('删除失败，请稍后重试');
        }
    }
}

/**
 * 编辑定期费用
 */
export async function handleEditRecurringExpense(expenseId) {
    try {
        const response = await fetch(`/groups/${window.currentGroupId}/recurring-expenses/${expenseId}`);
        
        if (response.ok) {
            const expense = await response.json();
            
            // 填充表单
            populateRecurringDetailForm(expense);
            
            // 设置编辑状态
            currentEditingRecurringExpense = expense;
            
            // 打开编辑模态框
            openRecurringDetailModal();
        } else {
            const error = await response.json();
            if (window.showCustomAlert) {
                window.showCustomAlert(error.message || '获取定期费用信息失败', 'error');
            } else {
                alert(error.message || '获取定期费用信息失败');
            }
        }
    } catch (error) {
        console.error('获取定期费用信息失败:', error);
        if (window.showCustomAlert) {
            window.showCustomAlert('获取信息失败，请稍后重试', 'error');
        } else {
            alert('获取信息失败，请稍后重试');
        }
    }
}

/**
 * 填充定期费用详情表单
 */
function populateRecurringDetailForm(expense) {
    const amountInput = document.getElementById('recurring-amount');
    const payerSelect = document.getElementById('recurring-payer');
    const startDateInput = document.getElementById('repeat-start');
    const endDateInput = document.getElementById('repeat-end');
    
    if (amountInput) amountInput.value = (expense.amount / 100).toFixed(2);
    if (payerSelect) payerSelect.value = expense.payer_id;
    if (startDateInput) startDateInput.value = expense.start_date;
    if (endDateInput) endDateInput.value = expense.end_date;
    
    // 设置频率
    selectFrequency(expense.frequency || 'daily');
    
    // 设置分摊方式
    setRecurringSplitMethod(expense.split_method || 'equal');
    
    // 设置参与者
    recurringSelectedParticipants.clear();
    if (expense.participants) {
        expense.participants.forEach(participant => {
            recurringSelectedParticipants.add(participant.user_id);
        });
        initializeParticipantSelection();
    }
    
    // 更新预览
    updateRecurringPreview();
}

/**
 * 刷新定期费用列表
 */
export async function refreshRecurringList() {
    try {
        const response = await fetch(`/groups/${window.currentGroupId}/recurring-expenses`);
        
        if (response.ok) {
            const expenses = await response.json();
            renderRecurringExpenseList(expenses);
        } else {
            console.error('获取定期费用列表失败');
        }
    } catch (error) {
        console.error('获取定期费用列表失败:', error);
    }
}

/**
 * 渲染定期费用列表
 */
function renderRecurringExpenseList(expenses) {
    const container = document.getElementById('recurring-expenses-list');
    if (!container) {
        console.error('找不到定期费用列表容器');
        return;
    }
    
    container.innerHTML = '';
    
    if (expenses.length === 0) {
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
        const displayAmount = centsToAmountString ? centsToAmountString(expense.amount) : (expense.amount / 100).toFixed(2);
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
        dateRange.textContent = `时间: ${expense.start_date} 至 ${expense.end_date}`;
        
        const payer = document.createElement('p');
        const payerName = expense.payer?.user?.username || expense.payer?.nickname || '未知';
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
                ? 'bg-red-500 text-white hover:bg-red-600' 
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
 * 打开定期费用详情模态框
 */
export function openRecurringDetail(expenseId) {
    openRecurringDetailModal();
}

/**
 * 打开添加定期费用模态框
 */
function openAddRecurringModal() {
    const modal = document.getElementById('add-recurring-expense-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
    
    // 🔴 v6.2修复：确保在显示模态框时初始化表单数据
    console.log('🔧 打开定期费用模态框，初始化表单数据...');
    updateRecurringFormMembers();
    
    // 重置编辑状态
    currentEditingRecurringExpense = null;
}

/**
 * 打开定期费用详情模态框
 */
function openRecurringDetailModal() {
    const modal = document.getElementById('recurring-detail-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * 关闭定期费用详情模态框
 */
function closeRecurringDetailModal() {
    const modal = document.getElementById('recurring-detail-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 获取频率标签
 */
function getFrequencyLabel(frequency) {
    const labels = {
        'daily': '每日',
        'weekly': '每周',
        'monthly': '每月',
        'yearly': '每年'
    };
    return labels[frequency] || frequency;
}

// ==================== 全局函数绑定 ====================

// 将函数绑定到window对象，使其可以在HTML中直接调用
console.log('开始暴露定期费用函数到全局...');

window.handleSaveRecurringExpense = handleSaveRecurringExpense;
window.selectFrequency = selectFrequency;
window.setRecurringSplitMethod = setRecurringSplitMethod;  // 修复：直接绑定函数，不通过group_page.js
window.handleRecurringAmountChange = handleRecurringAmountChange;
window.saveRecurringExpenseHandler = saveRecurringExpenseHandler;
window.openAddRecurringModal = openAddRecurringModal;
window.openRecurringDetail = openRecurringDetail;
window.handleRecurringCancel = handleRecurringCancel;
window.handleRecurringDetailCancel = handleRecurringDetailCancel;
window.handleDisableRecurringExpense = handleDisableRecurringExpense;
window.handleEnableRecurringExpense = handleEnableRecurringExpense;
window.handleDeleteRecurringExpense = handleDeleteRecurringExpense;
window.handleEditRecurringExpense = handleEditRecurringExpense;
window.refreshRecurringList = refreshRecurringList;
window.initializeRecurringExpenseForm = initializeRecurringExpenseForm;
window.updateRecurringFormMembers = updateRecurringFormMembers;
window.showMessage = showMessage;

console.log('定期费用模块已加载，所有函数已暴露到全局 - v2025.11.07.002');

// 🔴 v12.1修复：立即绑定事件监听器（替代内联事件处理器）
initializeEventListeners();

/**
 * 🔴 v12.1修复：初始化事件监听器
 * 替代HTML中的内联事件处理器，避免时序问题
 */
function initializeEventListeners() {
    console.log('初始化定期费用事件监听器...');
    
    // 绑定金额输入框事件
    const amountInput = document.getElementById('recurring-amount');
    if (amountInput) {
        // 移除可能存在的内联事件处理器
        amountInput.removeAttribute('oninput');
        // 添加事件监听器
        amountInput.addEventListener('input', handleRecurringAmountChange);
        console.log('✅ 金额输入框事件监听器已绑定');
    } else {
        console.error('❌ 找不到金额输入框 recurring-amount');
    }
    
    // 🔴 v6.2修复：绑定重复频率按钮事件
    const frequencyButtons = document.querySelectorAll('.frequency-option');
    frequencyButtons.forEach(button => {
        // 移除可能存在的内联onclick处理器
        button.removeAttribute('onclick');
        // 添加事件监听器
        button.addEventListener('click', function() {
            const frequency = this.getAttribute('data-frequency');
            if (frequency) {
                console.log('✅ 选择频率:', frequency);
                selectFrequency(frequency);
            }
        });
    });
    console.log(`✅ ${frequencyButtons.length} 个重复频率按钮事件监听器已绑定`);
    
    // 绑定其他可能的表单事件
    const payerSelect = document.getElementById('recurring-payer');
    if (payerSelect) {
        payerSelect.addEventListener('change', () => {
            console.log('支付人选择已更改');
        });
    }
    
    console.log('定期费用事件监听器初始化完成');
}

// ==================== 模态框控制函数 ====================

/**
 * 取消定期费用操作
 */
function handleRecurringCancel() {
    closeRecurringExpenseModal();
}

/**
 * 定期费用详情取消
 */
function handleRecurringDetailCancel() {
    closeRecurringDetailModal();
}

/**
 * 定期费用表单提交处理
 */
function saveRecurringExpenseHandler(event) {
    return handleSaveRecurringExpense(event);
}

/**
 * 显示消息
 */
function showMessage(message, type = 'info') {
    // 使用全局消息函数
    if (window.showCustomAlert) {
        window.showCustomAlert(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// 🔴 v6.3修复：确保事件监听器被正确初始化
initializeEventListeners();

// 再次确保函数被正确暴露
setTimeout(() => {
    console.log('验证函数暴露状态:');
    console.log('handleRecurringAmountChange:', typeof window.handleRecurringAmountChange);
    console.log('selectFrequency:', typeof window.selectFrequency);
    console.log('setRecurringSplitMethod:', typeof window.setRecurringSplitMethod);
}, 1000);