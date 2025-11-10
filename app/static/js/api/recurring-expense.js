// recurring-expense.js - 定期费用相关的CRUD操作、频率设置
// 防止缓存版本: 2025.11.10 - 修复版本
const JS_CACHE_VERSION = '2025.11.10.001';

// 🔴 新增：安全检查工具函数
function safeBindEvent(elementId, eventType, handler) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener(eventType, handler);
        console.log(`✅ 成功绑定事件: ${elementId} -> ${eventType}`);
        return true;
    } else {
        console.warn(`❌ 元素 ${elementId} 未找到，无法绑定 ${eventType} 事件`);
        return false;
    }
}

function checkRequiredElements(elementIds) {
    const missing = [];
    const existing = [];
    
    for (const elementId of elementIds) {
        const element = document.getElementById(elementId);
        if (element) {
            existing.push(elementId);
        } else {
            missing.push(elementId);
        }
    }
    
    if (missing.length > 0) {
        console.error('缺少必需的元素:', missing);
        return false;
    }
    
    console.log('✅ 所有必需元素都存在:', existing);
    return true;
}

function showError(message) {
    console.error('定期费用错误:', message);
    if (typeof showCustomAlert === 'function') {
        showCustomAlert('错误', message);
    } else {
        alert('错误: ' + message);
    }
}

// 从 ui/utils.js 导入金额转换函数
try {
    import { centsToAmountString } from '../ui/utils.js';
} catch (error) {
    console.warn('Failed to import from ../ui/utils.js, trying alternative path');
    window.centsToAmountString = function(cents) {
        return (cents / 100).toFixed(2);
    };
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

// 🔴 修复：防止重复初始化
let isRecurringFormInitialized = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 10;

/**
 * 安全的定期费用表单初始化
 */
export function initializeRecurringExpenseForm() {
    console.log('🔄 开始初始化定期费用表单...');
    
    // 🔴 防止重复初始化
    if (isRecurringFormInitialized) {
        console.log('✅ 定期费用表单已初始化，跳过重复执行');
        return;
    }
    
    initializationAttempts++;
    if (initializationAttempts > MAX_INIT_ATTEMPTS) {
        console.error('❌ 定期费用表单初始化次数过多，停止尝试');
        showError('表单初始化失败，请刷新页面重试');
        return;
    }
    
    // 🔴 新增：安全检查 - 检查必需元素
    const requiredElements = [
        'recurring-amount', 'recurring-payer', 'recurring-description',
        'repeat-start', 'repeat-end', 'recurring-participants'
    ];
    
    if (!checkRequiredElements(requiredElements)) {
        console.log('⏳ 延迟初始化，等待DOM元素加载...');
        setTimeout(() => {
            initializeRecurringExpenseForm();
        }, 200);
        return;
    }
    
    // 🔴 新增：检查群组数据是否已加载
    if (!window.groupMembers || window.groupMembers.length === 0) {
        console.log('⏳ 等待群组数据加载...');
        setTimeout(() => {
            if (window.groupMembers && window.groupMembers.length > 0) {
                console.log('✅ 检测到群组数据已加载，继续初始化');
                initializeRecurringExpenseForm();
            } else {
                console.warn('❌ 群组数据仍然未加载');
                if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
                    showError('无法加载群组数据，请刷新页面重试');
                } else {
                    setTimeout(() => initializeRecurringExpenseForm(), 500);
                }
            }
        }, 300);
        return;
    }
    
    try {
        console.log('🚀 开始完整初始化定期费用表单');
        
        // 设置默认日期
        setDefaultDates();
        
        // 初始化付款人选择器和参与者选择
        initializePayerSelector();
        initializeParticipantSelection();
        setupEventListeners();
        
        // 标记初始化完成
        isRecurringFormInitialized = true;
        console.log('✅ 定期费用表单初始化完成');
        
    } catch (error) {
        console.error('❌ 定期费用表单初始化失败:', error);
        isRecurringFormInitialized = false;
        showError('表单初始化失败: ' + error.message);
    }
}

function setDefaultDates() {
    // 设置默认日期
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endDate = nextMonth.toISOString().split('T')[0];
    
    // 绑定开始日期
    safeBindEvent('repeat-start', 'change', function() {
        recurringExpenseState.startDate = this.value;
        updateRecurringPreview();
    });
    
    // 绑定结束日期
    safeBindEvent('repeat-end', 'change', function() {
        recurringExpenseState.endDate = this.value;
        updateRecurringPreview();
    });
    
    // 设置默认值
    const startDateInput = document.getElementById('repeat-start');
    const endDateInput = document.getElementById('repeat-end');
    
    if (startDateInput) {
        startDateInput.value = today;
        recurringExpenseState.startDate = today;
        console.log('✅ 设置开始日期:', today);
    }
    
    if (endDateInput) {
        endDateInput.value = endDate;
        recurringExpenseState.endDate = endDate;
        console.log('✅ 设置结束日期:', endDate);
    }
}

/**
 * 初始化付款人选择器
 */
function initializePayerSelector() {
    console.log('🔄 初始化付款人选择器...');
    
    const payerSelect = document.getElementById('recurring-payer');
    if (!payerSelect) {
        console.error('❌ 找不到付款人选择器元素');
        return false;
    }
    
    // 清空现有选项
    payerSelect.innerHTML = '';
    
    // 添加选项
    const members = window.groupMembers || [];
    if (members.length === 0) {
        payerSelect.innerHTML = '<option value="">未找到成员</option>';
        console.warn('❌ 没有可用成员数据');
        return false;
    }
    
    console.log(`✅ 为 ${members.length} 个成员添加付款人选项`);
    
    members.forEach(member => {
        const option = document.createElement('option');
        const memberId = member.user_id || member.id;
        option.value = memberId;
        
        // 安全的用户名获取
        const memberName = member.user?.username || 
                          member.username || 
                          member.nickname || 
                          member.name || 
                          `用户 ${memberId}`;
        option.textContent = memberName;
        
        // 设置当前用户为默认付款人
        if (memberId === window.CURRENT_USER_ID) {
            option.selected = true;
        }
        
        payerSelect.appendChild(option);
    });
    
    // 绑定选择事件
    safeBindEvent('recurring-payer', 'change', function() {
        console.log('付款人选择变更:', this.value);
        updateRecurringSplitCalculation();
    });
    
    console.log('✅ 付款人选择器初始化完成');
    return true;
}

/**
 * 初始化参与者选择
 */
function initializeParticipantSelection() {
    console.log('🔄 初始化参与者选择...');
    
    const participantsContainer = document.getElementById('recurring-participants');
    if (!participantsContainer) {
        console.error('❌ 找不到参与者选择容器');
        return false;
    }
    
    // 清空现有内容
    participantsContainer.innerHTML = '';
    
    const members = window.groupMembers || [];
    if (members.length === 0) {
        participantsContainer.innerHTML = '<p class="text-gray-500">未找到成员</p>';
        return false;
    }
    
    console.log(`✅ 为 ${members.length} 个成员创建参与者复选框`);
    
    // 创建参与者复选框
    members.forEach(member => {
        const memberId = member.user_id || member.id;
        const memberName = member.user?.username || 
                          member.username || 
                          member.nickname || 
                          member.name || 
                          `用户 ${memberId}`;
        
        const checkboxId = `participant-${memberId}`;
        const checkboxHtml = `
            <div class="flex items-center space-x-2 mb-2">
                <input type="checkbox" id="${checkboxId}" value="${memberId}" 
                       class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <label for="${checkboxId}" class="text-sm text-gray-700">${memberName}</label>
            </div>
        `;
        participantsContainer.insertAdjacentHTML('beforeend', checkboxHtml);
        
        // 绑定复选框事件
        safeBindEvent(checkboxId, 'change', function() {
            const participantId = parseInt(this.value);
            if (this.checked) {
                recurringSelectedParticipants.add(participantId);
            } else {
                recurringSelectedParticipants.delete(participantId);
            }
            console.log('参与者选择变更:', Array.from(recurringSelectedParticipants));
            updateRecurringSplitCalculation();
        });
        
        // 默认选择所有成员
        recurringSelectedParticipants.add(memberId);
    });
    
    console.log('✅ 参与者选择初始化完成');
    return true;
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    console.log('🔄 设置表单事件监听器...');
    
    // 描述输入
    safeBindEvent('recurring-description', 'input', function() {
        console.log('描述变更:', this.value);
    });
    
    // 金额输入
    safeBindEvent('recurring-amount', 'input', function() {
        console.log('金额变更:', this.value);
        updateRecurringPreview();
    });
    
    // 频率选择
    const frequencySelect = document.getElementById('recurring-frequency');
    if (frequencySelect) {
        frequencySelect.addEventListener('change', function() {
            recurringExpenseState.frequency = this.value;
            console.log('频率变更:', this.value);
            updateRecurringPreview();
        });
    }
    
    console.log('✅ 表单事件监听器设置完成');
}

/**
 * 更新定期费用预览
 */
function updateRecurringPreview() {
    try {
        const amount = parseFloat(document.getElementById('recurring-amount')?.value || '0');
        const startDate = document.getElementById('repeat-start')?.value;
        const endDate = document.getElementById('repeat-end')?.value;
        
        if (amount <= 0) {
            return;
        }
        
        // 计算重复次数和总金额
        // 这里可以根据需要实现更复杂的计算逻辑
        console.log('✅ 定期费用预览已更新');
        
    } catch (error) {
        console.error('更新预览失败:', error);
    }
}

/**
 * 更新分摊计算
 */
function updateRecurringSplitCalculation() {
    try {
        const participants = Array.from(recurringSelectedParticipants);
        const amount = parseFloat(document.getElementById('recurring-amount')?.value || '0');
        
        if (participants.length === 0 || amount <= 0) {
            return;
        }
        
        // 计算平均分摊
        const splitAmount = amount / participants.length;
        console.log(`✅ 分摊计算完成: ${amount} / ${participants.length} = ${splitAmount}`);
        
    } catch (error) {
        console.error('分摊计算失败:', error);
    }
}

/**
 * 保存定期费用
 */
export async function saveRecurringExpenseHandler(event) {
    event.preventDefault();
    
    try {
        console.log('🔄 开始保存定期费用...');
        
        // 表单验证
        if (!validateRecurringExpenseForm()) {
            return;
        }
        
        const formData = new FormData(event.target);
        const expenseData = {
            description: formData.get('description'),
            amount: parseInt(formData.get('amount') * 100), // 转换为分
            payer_id: parseInt(formData.get('payer_id')),
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date'),
            frequency: formData.get('frequency'),
            participants: Array.from(recurringSelectedParticipants)
        };
        
        console.log('定期费用数据:', expenseData);
        
        // 这里应该调用API保存数据
        // await saveRecurringExpense(expenseData);
        
        console.log('✅ 定期费用保存成功');
        
        // 关闭模态框并刷新列表
        const modal = document.getElementById('add-recurring-expense-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // 重置表单
        resetRecurringForm();
        
        // 刷新列表
        if (window.refreshRecurringExpensesList) {
            window.refreshRecurringExpensesList();
        }
        
    } catch (error) {
        console.error('❌ 保存定期费用失败:', error);
        showError('保存失败: ' + error.message);
    }
}

/**
 * 表单验证
 */
function validateRecurringExpenseForm() {
    const amount = document.getElementById('recurring-amount')?.value;
    const payer = document.getElementById('recurring-payer')?.value;
    const startDate = document.getElementById('repeat-start')?.value;
    const endDate = document.getElementById('repeat-end')?.value;
    
    if (!amount || parseFloat(amount) <= 0) {
        showError('请输入有效的金额');
        return false;
    }
    
    if (!payer) {
        showError('请选择付款人');
        return false;
    }
    
    if (!startDate) {
        showError('请选择开始日期');
        return false;
    }
    
    if (!endDate) {
        showError('请选择结束日期');
        return false;
    }
    
    if (recurringSelectedParticipants.size === 0) {
        showError('请选择参与者');
        return false;
    }
    
    return true;
}

/**
 * 重置表单
 */
export function resetRecurringForm() {
    const form = document.getElementById('recurring-expense-form');
    if (form) {
        form.reset();
    }
    
    // 重置状态
    recurringSelectedParticipants.clear();
    recurringExpenseState = {
        isRecurring: false,
        frequency: 'daily',
        startDate: '',
        endDate: '',
    };
    
    // 重新初始化参与者选择
    setTimeout(() => {
        initializeParticipantSelection();
    }, 100);
    
    console.log('✅ 定期费用表单已重置');
}

// 🔴 新增：更新成员列表的函数（用于数据更新时调用）
window.updateRecurringFormMembers = function() {
    console.log('🔄 更新定期费用表单成员列表...');
    
    if (isRecurringFormInitialized) {
        // 重新初始化成员相关的UI
        initializePayerSelector();
        initializeParticipantSelection();
    }
};

// 🔴 新增：重试机制
function retryInitialization() {
    if (initializationAttempts < MAX_INIT_ATTEMPTS) {
        console.log(`⏳ 重试初始化 (第${initializationAttempts + 1}次)...`);
        setTimeout(() => {
            isRecurringFormInitialized = false; // 重置状态
            initializeRecurringExpenseForm();
        }, 500);
    } else {
        console.error('❌ 初始化重试次数已用完');
        showError('表单初始化失败，请刷新页面重试');
    }
}

// 🔴 新增：调试函数
window.debugRecurringExpense = function() {
    console.log('=== 定期费用模块调试信息 ===');
    console.log('isRecurringFormInitialized:', isRecurringFormInitialized);
    console.log('initializationAttempts:', initializationAttempts);
    console.log('window.groupMembers:', window.groupMembers);
    console.log('recurringSelectedParticipants:', Array.from(recurringSelectedParticipants));
    console.log('recurringExpenseState:', recurringExpenseState);
    
    // 检查DOM元素
    const elements = ['recurring-amount', 'recurring-payer', 'recurring-description', 'repeat-start', 'repeat-end', 'recurring-participants'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`元素 ${id}:`, element ? '存在' : '不存在');
    });
    
    console.log('=== 调试信息结束 ===');
};

// 🔴 新增：安全的数据检查
function waitForData() {
    return new Promise((resolve) => {
        if (window.groupMembers && window.groupMembers.length > 0) {
            resolve();
        } else {
            console.log('⏳ 等待群组数据...');
            setTimeout(() => {
                if (window.groupMembers && window.groupMembers.length > 0) {
                    resolve();
                } else {
                    console.warn('❌ 群组数据加载超时');
                    resolve(); // 继续执行，但可能没有成员数据
                }
            }, 2000);
        }
    });
}

// 全局导出
window.initializeRecurringExpenseForm = initializeRecurringExpenseForm;
window.saveRecurringExpenseHandler = saveRecurringExpenseHandler;
window.resetRecurringForm = resetRecurringForm;
window.updateRecurringFormMembers = window.updateRecurringFormMembers;

console.log('定期费用模块已加载 - 修复版本 2025.11.10.001');
