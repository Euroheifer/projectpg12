// recurring_expense.js - CRUD operations, frequency settings for recurring expenses
// Cache buster: 2025.11.10.003 - Fix split button
const JS_CACHE_VERSION = '2025.11.10.003';

// 🔴 Fix: import must be at top level
import { 
    centsToAmountString as importedCentsToAmountString, 
    amountToCents as importedAmountToCents 
} from '../ui/utils.js';

// Import amount conversion functions from ui/utils.js
let centsToAmountString;
let amountToCents;

if (typeof importedCentsToAmountString === 'function') {
    centsToAmountString = importedCentsToAmountString;
} else {
    console.warn('Failed to import centsToAmountString from ../ui/utils.js, defining fallback');
    centsToAmountString = function(cents) {
        return (cents / 100).toFixed(2);
    };
    window.centsToAmountString = centsToAmountString;
}

if (typeof importedAmountToCents === 'function') {
    amountToCents = importedAmountToCents;
} else {
    console.warn('Failed to import amountToCents from ../ui/utils.js, defining fallback');
    amountToCents = function(amountString) {
        if (!amountString) return 0;
        const amount = parseFloat(amountString);
        if (isNaN(amount)) return 0;
        return Math.round(amount * 100);
    };
    window.amountToCents = amountToCents;
}


// --- Global State ---
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

let isRecurringFormInitialized = false;

/**
 * Initialize recurring expense form
 */
export function initializeRecurringExpenseForm() {
    console.log('Initializing recurring expense module...'); // Translated
    
    if (isRecurringFormInitialized) {
        console.log('Recurring expense form already initialized, skipping.'); // Translated
        return;
    }
    
    console.log('Initializing recurring expense form - v2025.11.10.002 fixed version'); // Translated

    // Set default date
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('repeat-start');
    if (startDateInput) {
        startDateInput.value = today;
        recurringExpenseState.startDate = today;
        console.log('Setting start date:', today);
} else {
        console.error('Could not find start date input: repeat-start'); // Translated
    }
    
    const endDateInput = document.getElementById('repeat-end');
    if (endDateInput) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        endDateInput.value = nextMonth.toISOString().split('T')[0];
        recurringExpenseState.endDate = endDateInput.value;
        console.log('Setting end date:', endDateInput.value);
    } else {
        console.error('Could not find end date input: repeat-end'); // Translated
    }

    // Check if group members data is loaded
    if (!window.groupMembers || window.groupMembers.length === 0) {
        console.warn('Group members data not yet loaded, recurring expense form may not initialize correctly'); // Translated
        const checkGroupMembers = () => {
            if (window.groupMembers && window.groupMembers.length > 0) {
                console.log('Detected group members loaded, initializing payer selector and participant selection'); // Translated
                initializePayerSelector();
                initializeParticipantSelection();
                setupEventListeners();
                isRecurringFormInitialized = true;
            } else {
                console.log('Waiting for group members data to load...'); // Translated
                setTimeout(checkGroupMembers, 1000);
            }
        };
        checkGroupMembers();
        return;
    }
    
    // Initialize payer selector and participant selection
    initializePayerSelector();
    initializeParticipantSelection();
    setupEventListeners();
    
    isRecurringFormInitialized = true;
}

/**
 * Initialize payer selector
 */
function initializePayerSelector() {
    const payerSelect = document.getElementById('recurring-payer');
    if (!payerSelect) {
        console.error('Could not find payer selector element: recurring-payer'); // Translated
        return;
    }
    
    console.log('Initializing payer selector, member data:', window.groupMembers); // Translated
    
    if (window.groupMembers && window.groupMembers.length > 0) {
        payerSelect.innerHTML = '<option value="">Please select a payer</option>'; // Translated
        window.groupMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.user_id; 
            option.textContent = member.user?.username || member.nickname || `User ${member.user_id}`;
            payerSelect.appendChild(option);
        });
        console.log(`Payer selector initialized with ${window.groupMembers.length} members`); // Translated
    } else {
        console.warn('Group members data is empty, cannot initialize payer selector'); // Translated
        payerSelect.innerHTML = '<option value="">No payers available to select</option>'; // Translated
    }
}

/**
 * Initialize participant selection
 */
function initializeParticipantSelection() {
    const container = document.getElementById('recurring-participants-section');
    if (!container) {
        console.error('Could not find participant container: recurring-participants-section'); // Translated
        return;
    }
    
    const gridContainer = container.querySelector('.grid');
    if (!gridContainer) {
        console.error('Could not find participant grid container .grid'); // Translated
        return;
    }
    
    console.log('Initializing participant selection, member data:', window.groupMembers); // Translated
    
    gridContainer.innerHTML = '';
recurringSelectedParticipants.clear(); // 🔴 Clear Set
    
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
            
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    recurringSelectedParticipants.add(parseInt(this.value, 10)); // 🔴 Ensure number
                } else {
                    recurringSelectedParticipants.delete(parseInt(this.value, 10)); // 🔴 Ensure number
                }
                console.log('Participant selection changed:', Array.from(recurringSelectedParticipants)); // Translated
                updateRecurringSplitCalculation();
            });
            
            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            gridContainer.appendChild(wrapper);
            
            // Default select all participants
            checkbox.checked = true;
            recurringSelectedParticipants.add(member.user_id);
        });
        console.log(`Participant selector initialized with ${window.groupMembers.length} members`); // Translated
    } else {
        console.warn('Group members data is empty, cannot initialize participant selection'); // Translated
        gridContainer.innerHTML = '<p class="text-gray-500">No participants available to select</p>'; // Translated
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    console.log('Setting up recurring expense form event listeners'); // Translated
    
    const amountInput = document.getElementById('recurring-amount');
    if (amountInput) {
        amountInput.removeEventListener('input', handleRecurringAmountChange);
        amountInput.addEventListener('input', handleRecurringAmountChange);
        console.log('Amount input event listener set'); // Translated
    } else {
        console.error('Could not find amount input: recurring-amount'); // Translated
    }
    
    const startDateInput = document.getElementById('repeat-start');
    if (startDateInput) {
        startDateInput.addEventListener('change', function() {
            recurringExpenseState.startDate = this.value;
            console.log('Start date changed:', this.value); // Translated
            updateRecurringPreview();
        });
    }
    
    const endDateInput = document.getElementById('repeat-end');
    if (endDateInput) {
        endDateInput.addEventListener('change', function() {
            recurringExpenseState.endDate = this.value;
            console.log('End date changed:', this.value); // Translated
            updateRecurringPreview();
        });
    }
    
    const payerSelect = document.getElementById('recurring-payer');
    if (payerSelect) {
        payerSelect.addEventListener('change', function() {
            console.log('Payer selected:', this.value); // Translated
        });
    }
    
    console.log('Recurring expense form event listeners set up complete'); // Translated
}

/**
 * Update form member data
 */
export function updateRecurringFormMembers() {
    console.log('Updating recurring expense form member data'); // Translated
    if (!isRecurringFormInitialized) {
        initializeRecurringExpenseForm();
    } else {
        initializePayerSelector();
        initializeParticipantSelection();
    }
}

/**
 * Select frequency
 */
export function selectFrequency(frequency) {
    console.log('Selected frequency:', frequency); // Translated
    
    recurringExpenseState.frequency = frequency;
    
    const frequencyButtons = document.querySelectorAll('.frequency-option');
    frequencyButtons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.getAttribute('data-frequency') === frequency || btn.getAttribute('onclick')?.includes(`'${frequency}'`)) {
            btn.classList.add('selected');
        }
    });
    
    updateRecurringPreview();
}

/**
 * Set recurring expense split method
 */
export function setRecurringSplitMethod(method) {
    console.log('Setting recurring expense split method:', method); // Translated
    
    recurringSplitMethod = method;
    
    // 🔴 Fix: Use correct IDs
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
 * Handle recurring expense amount change
 */
export function handleRecurringAmountChange() {
    console.log('Handling recurring expense amount change'); // Translated
    
    updateRecurringSplitCalculation();
    updateRecurringPreview();
    updateAmountDisplay();
}

/**
 * Update recurring expense preview
 */
export function updateRecurringPreview() {
    console.log('Updating recurring preview'); // Translated
    
    const startDate = document.getElementById('repeat-start')?.value;
    const endDate = document.getElementById('repeat-end')?.value;
    const amountInput = document.getElementById('recurring-amount');
    
    if (!startDate || !endDate || !amountInput) {
        console.warn('Missing necessary preview data elements'); // Translated
        return;
    }
    
    // 🔴 Fix: Immediately convert to cents
    const totalAmountInCents = amountToCents(amountInput.value);
    
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    if (startDateTime > endDateTime) {
        console.warn('Start date cannot be later than end date'); // Translated
        return;
    }
    
    // 🔴 Fix: Pass cents
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
 * Generate recurring expense preview data
 * 🔴 Fix: totalAmountInCents is in cents
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
            amount: totalAmountInCents, // 🔴 Store cents
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
 * Update preview list
 * 🔴 Fix: item.amount is in cents
 */
function updatePreviewList(previewData) {
    const previewList = document.getElementById('recurring-preview-list');
    if (!previewList) {
        console.error('Could not find preview list element'); // Translated
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
        
        // 🔴 Fix: item.amount is already cents, centsToAmountString will handle it
        const displayAmount = centsToAmountString ? centsToAmountString(item.amount) : (item.amount / 100).toFixed(2);
        amountSpan.textContent = `$${displayAmount}`;
        
        listItem.appendChild(dateSpan);
        listItem.appendChild(amountSpan);
        previewList.appendChild(listItem);
    });
}

/**
 * Update preview summary
 * 🔴 Fix: amount in previewData is in cents
 */
function updatePreviewSummary(previewData) {
    // 🔴 Fix: totalAmountInCents is in cents
    const totalCount = previewData.length;
    const totalAmountInCents = previewData.reduce((sum, item) => sum + item.amount, 0);
    
    const summaryElement = document.getElementById('recurring-preview-summary');
    if (summaryElement) {
        const participantCount = recurringSelectedParticipants.size;
        // 🔴 Fix: amountPerPersonInCents is in cents
        const amountPerPersonInCents = participantCount > 0 ? totalAmountInCents / participantCount : 0;
        
        // 🔴 Fix: Use centsToAmountString to display
        const displayTotal = centsToAmountString ? centsToAmountString(totalAmountInCents) : (totalAmountInCents / 100).toFixed(2);
        const displayPerPerson = centsToAmountString ? centsToAmountString(amountPerPersonInCents) : (amountPerPersonInCents / 100).toFixed(2);
        
        summaryElement.textContent = `Total ${totalCount} times, $${displayTotal} total, $${displayPerPerson} per person`; // Translated
    }
}

/**
 * Update split calculation
 * 🔴 Fix: Use cents for calculation
 */
function updateRecurringSplitCalculation() {
    const amountInput = document.getElementById('recurring-amount');
    if (!amountInput || !amountInput.value) { // 🔴
        recurringMemberSplits = []; // 🔴 Clear
        renderSplitDetails(); // 🔴 Render empty state
        updateRecurringSummary(); // 🔴 Update summary
        return;
    }
    
    // 🔴 Fix: Immediately convert to cents
    const totalAmountInCents = amountToCents(amountInput.value);
    const selectedMemberIds = Array.from(recurringSelectedParticipants);

    if (selectedMemberIds.length === 0) { // 🔴
        recurringMemberSplits = [];
        renderSplitDetails();
        updateRecurringSummary();
        return;
    }
    
    // Recalculate split amount for each member
    recurringMemberSplits = selectedMemberIds.map(userId => {
        const member = window.groupMembers.find(m => m.user_id === userId);
        if (!member) return null;
        
        // 🔴 Fix: Calculate in cents
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
            amount: splitAmountInCents // 🔴 Store cents
        };
    }).filter(split => split !== null);
    
    // Validate sum
    const sum = recurringMemberSplits.reduce((acc, s) => acc + s.amount, 0);
    console.log(`Split calculation complete (cents): Total ${totalAmountInCents}, Split Sum ${sum}`); // Translated
    
    // Update details and summary
    updateSplitDetailDisplay();
    updateRecurringSummary();
}

/**
 * Update split detail display
 * 🔴 Fix: split.amount is in cents
 */
function updateSplitDetailDisplay() {
    // 🔴 Fix: Use correct ID
    const splitDetailContainer = document.getElementById('recurring-split-list');
    if (!splitDetailContainer) {
        console.error('Could not find split detail container'); // Translated
        return;
    }
    
    splitDetailContainer.innerHTML = '';
    
    if (recurringMemberSplits.length === 0) {
        splitDetailContainer.innerHTML = '<p class="text-gray-500">Please select participants</p>'; // Translated
        return;
    }
    
    recurringMemberSplits.forEach(split => {
        const detailItem = document.createElement('div');
        detailItem.className = 'flex justify-between items-center p-2 bg-gray-50 rounded';
        
        const memberName = document.createElement('span');
        memberName.className = 'text-sm text-gray-700';
        memberName.textContent = split.user?.username || 'Unknown User'; // Translated
        
        const amountSpan = document.createElement('span');
        amountSpan.className = 'text-sm font-medium text-gray-900';
        
        // 🔴 Fix: split.amount is already cents
        const displayAmount = centsToAmountString ? centsToAmountString(split.amount) : (split.amount / 100).toFixed(2);
        amountSpan.textContent = `$${displayAmount}`;
        
        detailItem.appendChild(memberName);
        detailItem.appendChild(amountSpan);
        splitDetailContainer.appendChild(detailItem);
    });
}

/**
 * Update recurring expense summary
 * 🔴 Fix: Use cents for calculation
 */
function updateRecurringSummary() {
    const amountInput = document.getElementById('recurring-amount');
    if (!amountInput) return;
    
    // 🔴 Fix: Immediately convert to cents
    const totalAmountInCents = amountToCents(amountInput.value);
    const participantCount = recurringSelectedParticipants.size;
    
    // 🔴 Fix: Calculate in cents
    const amountPerPersonInCents = participantCount > 0 ? Math.floor(totalAmountInCents / participantCount) : 0;
    // (Note: Simple average may be inaccurate due to remainder, but good enough for summary)

    // 🔴 Fix: Use correct ID
    const summaryElement = document.getElementById('recurring-split-summary');
    if (summaryElement) {
        // 🔴 Fix: Use centsToAmountString to display
        const displayTotal = centsToAmountString ? centsToAmountString(totalAmountInCents) : (totalAmountInCents / 100).toFixed(2);
        const displayPerPerson = centsToAmountString ? centsToAmountString(amountPerPersonInCents) : (amountPerPersonInCents / 100).toFixed(2);
        
        // 🔴 Fix: Provide richer summary
        summaryElement.innerHTML = `
            <div class="flex justify-between text-sm">
                <span>Total Amount:</span> <!-- Translated -->
                <span class="font-medium">$${displayTotal}</span>
            </div>
            <div class="flex justify-between text-sm">
                <span>Participants:</span> <!-- Translated -->
                <span class="font-medium">${participantCount} people</span> <!-- Translated -->
            </div>
            <div class="flex justify-between text-sm">
                <span>Per Person</span>
                <span class="font-medium">$${displayPerPerson}</span>
            </div>
        `;
    }
}

/**
 * Update amount display
 */
function updateAmountDisplay() {
    const amountInput = document.getElementById('recurring-amount');
    if (!amountInput) return;
    
    console.log('Amount updated (in Yuan):', amountInput.value); // Translated
}

/**
 * Validate form
 */
function validateRecurringExpenseForm() {
    const amountInput = document.getElementById('recurring-amount');
    const payerSelect = document.getElementById('recurring-payer');
    const startDateInput = document.getElementById('repeat-start');
    const endDateInput = document.getElementById('repeat-end');
    
    if (!amountInput || !payerSelect || !startDateInput || !endDateInput) {
        return { isValid: false, message: 'Form elements are missing' }; // Translated
    }
    
    // 🔴 Fix: Use amountToCents to validate
    const amountInCents = amountToCents(amountInput.value);
    if (amountInCents <= 0) {
        return { isValid: false, message: 'Please enter a valid amount' }; // Translated
    }
    
    if (!payerSelect.value) {
        return { isValid: false, message: 'Please select a payer' }; // Translated
    }
    
    if (recurringSelectedParticipants.size === 0) {
        return { isValid: false, message: 'Please select at least one participant' }; // Translated
    }
    
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);
    
    if (startDate > endDate) {
        return { isValid: false, message: 'Start date cannot be later than end date' }; // Translated
    }
    
    return { isValid: true };
}

/**
 * Collect form data
 * 🔴 Fix: Ensure all amounts are in cents
 */
function collectRecurringExpenseFormData() {
    const amountInput = document.getElementById('recurring-amount');
    const payerSelect = document.getElementById('recurring-payer');
    const startDateInput = document.getElementById('repeat-start');
    const endDateInput = document.getElementById('repeat-end');
    
    // 🔴 Ensure split calculation is up-to-date
    updateRecurringSplitCalculation(); 

    return {
        amount: amountToCents(amountInput.value), // 🔴 Convert to cents
        currency: 'CNY',
        payer_id: payerSelect.value,
        participants: Array.from(recurringSelectedParticipants),
        frequency: recurringExpenseState.frequency,
        start_date: startDateInput.value,
        end_date: endDateInput.value,
        split_method: recurringSplitMethod,
        member_splits: recurringMemberSplits.map(split => ({ // 🔴 recurringMemberSplits is already in cents
            user_id: split.user_id,
            amount: split.amount 
        }))
    };
}

/**
 * Save recurring expense
 */
export async function handleSaveRecurringExpense(event) {
    event.preventDefault();
    console.log('Saving recurring expense'); // Translated
    
    try {
        const validationResult = validateRecurringExpenseForm();
        if (!validationResult.isValid) {
            if (window.showCustomAlert) {
                window.showCustomAlert(validationResult.message, 'error');
            } else {
                alert(validationResult.message);
            }
            return;
        }
        
        const formData = collectRecurringExpenseFormData();
        
        // 🔴 Fix: Ensure backend API field names match (schemas.py)
        const apiData = {
            description: document.getElementById('recurring-description').value || 'Recurring Expense', // Translated
            amount: formData.amount, // Cents
            frequency: formData.frequency,
            start_date: formData.start_date,
            payer_id: parseInt(formData.payer_id, 10), // Ensure number
            split_type: formData.split_method,
            splits: formData.member_splits.map(s => ({ // 🔴 Match ExpenseSplitCreate
                user_id: s.user_id,
                amount: s.amount // Cents
            }))
            // end_date is not part of RecurringExpenseCreate, but used logically
        };
        
        console.log("Data sent to API:", apiData); // Translated

        const url = currentEditingRecurringExpense 
            ? `/groups/${window.currentGroupId}/recurring-expenses/${currentEditingRecurringExpense.id}`
            : `/groups/${window.currentGroupId}/recurring-expenses`;
            
        const response = await fetch(url, {
            method: currentEditingRecurringExpense ? 'PATCH' : 'POST', // 🔴 Fix: Update uses PATCH
headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}` // 🔴 Fix: Add Token
            },
            body: JSON.stringify(apiData) // 🔴 Fix: Send apiData
        });
        
        if (response.ok) {
            const result = await response.json();
            if (window.showCustomAlert) {
                window.showCustomAlert(currentEditingRecurringExpense ? 'Recurring expense updated' : 'Recurring expense created', 'success'); // Translated
            } else {
                alert(currentEditingRecurringExpense ? 'Recurring expense updated' : 'Recurring expense created'); // Translated
            }
            
            closeRecurringExpenseModal();
            
            // Refresh recurring expense list
            if (window.refreshRecurringList) {
                window.refreshRecurringList();
            } else {
                console.warn('refreshRecurringList not found on window');
            }
        } else {
            const error = await response.json();
            const errorMsg = error.detail ? (typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail)) : 'Save failed'; // Translated
            if (window.showCustomAlert) {
                window.showCustomAlert(errorMsg, 'error');
            } else {
                alert(errorMsg);
            }
        }
    } catch (error) {
        console.error('Failed to save recurring expense:', error); // Translated
        if (window.showCustomAlert) {
            window.showCustomAlert('Save failed, please try again later', 'error'); // Translated
        } else {
            alert('Save failed, please try again later'); // Translated
        }
    }
}

/**
 * Close modal
 */
function closeRecurringExpenseModal() {
    const modal = document.getElementById('add-recurring-expense-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentEditingRecurringExpense = null;
    resetRecurringForm();
}

/**
 * Reset form
 */
function resetRecurringForm() {
    const form = document.getElementById('recurring-expense-form');
    if (form) form.reset();

    // Manually reset dates
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('repeat-start');
    if (startDateInput) startDateInput.value = today;
    
    const endDateInput = document.getElementById('repeat-end');
    if (endDateInput) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        endDateInput.value = nextMonth.toISOString().split('T')[0];
    }
    
    // Reset participant selection
    initializeParticipantSelection();
    
    // Reset state
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

// ==================== API related functions ====================

/**
 * Disable recurring expense
 */
export async function handleDisableRecurringExpense(expenseId) {
    try {
        const response = await fetch(`/groups/${window.currentGroupId}/recurring-expenses/${expenseId}`, { // 🔴 Fix: Use PATCH
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ is_active: false }) // 🔴 Fix: Send
        });
        
        if (response.ok) {
            if (window.showCustomAlert) window.showCustomAlert('Recurring expense disabled', 'success'); // Translated
            await refreshRecurringList();
        } else {
            const error = await response.json();
            if (window.showCustomAlert) window.showCustomAlert(error.detail || 'Operation failed', 'error'); // Translated
        }
    } catch (error) {
        console.error('Failed to disable recurring expense:', error); // Translated
        if (window.showCustomAlert) window.showCustomAlert('Operation failed, please try again later', 'error'); // Translated
    }
}

/**
 * Enable recurring expense
 */
export async function handleEnableRecurringExpense(expenseId) {
    try {
        const response = await fetch(`/groups/${window.currentGroupId}/recurring-expenses/${expenseId}`, { // 🔴 Fix: Use PATCH
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ is_active: true }) // 🔴 Fix: Send
        });
        
        if (response.ok) {
            if (window.showCustomAlert) window.showCustomAlert('Recurring expense enabled', 'success'); // Translated
            await refreshRecurringList();
        } else {
            const error = await response.json();
            if (window.showCustomAlert) window.showCustomAlert(error.detail || 'Operation failed', 'error'); // Translated
        }
    } catch (error) {
        console.error('Failed to enable recurring expense:', error); // Translated
        if (window.showCustomAlert) window.showCustomAlert('Operation failed, please try again later', 'error'); // Translated
    }
}

/**
 * Delete recurring expense
 */
export async function handleDeleteRecurringExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this recurring expense?')) { // Translated
        return;
    }
    
    try {
        const response = await fetch(`/groups/${window.currentGroupId}/recurring-expenses/${expenseId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` } // 🔴 Fix: Add Token
        });
        
        if (response.status === 204) { // 🔴 Fix: Check 204
            if (window.showCustomAlert) window.showCustomAlert('Recurring expense deleted', 'success'); // Translated
            await refreshRecurringList();
        } else {
            const error = await response.json();
            if (window.showCustomAlert) window.showCustomAlert(error.detail || 'Delete failed', 'error'); // Translated
        }
    } catch (error) {
        console.error('Failed to delete recurring expense:', error); // Translated
        if (window.showCustomAlert) window.showCustomAlert('Delete failed, please try again later', 'error'); // Translated
    }
}

/**
 * Edit recurring expense
 */
export async function handleEditRecurringExpense(expenseId) {
    try {
        const response = await fetch(`/groups/${window.currentGroupId}/recurring-expenses/${expenseId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` } // 🔴 Fix: Add Token
        });
        
        if (response.ok) {
            const expense = await response.json();
            
            populateRecurringDetailForm(expense);
            currentEditingRecurringExpense = expense;
            
            // 🔴 Fix: Open the main modal, not the detail modal
            openAddRecurringModal(); 
        } else {
            const error = await response.json();
            if (window.showCustomAlert) window.showCustomAlert(error.detail || 'Failed to get recurring expense info', 'error'); // Translated
        }
    } catch (error) {
        console.error('Failed to get recurring expense info:', error); // Translated
        if (window.showCustomAlert) window.showCustomAlert('Failed to get info, please try again later', 'error'); // Translated
    }
}

/**
 * Populate recurring expense detail form
 * 🔴 Fix: Amount is in cents
 */
function populateRecurringDetailForm(expense) {
    const amountInput = document.getElementById('recurring-amount');
    const payerSelect = document.getElementById('recurring-payer');
    const startDateInput = document.getElementById('repeat-start');
    const endDateInput = document.getElementById('repeat-end'); // 🔴 Assuming there is an end date
    
    if (amountInput) amountInput.value = centsToAmountString(expense.amount); // 🔴 Convert
    if (payerSelect) payerSelect.value = expense.payer_id;
    if (startDateInput) startDateInput.value = expense.start_date;
    if (endDateInput) endDateInput.value = expense.end_date || ''; // 🔴
    
    selectFrequency(expense.frequency || 'daily');
    setRecurringSplitMethod(expense.split_type || 'equal');
    
    // 🔴 Fix: Set participants from splits_definition
    recurringSelectedParticipants.clear();
    if (expense.splits_definition) {
        const participantIds = expense.splits_definition.map(s => s.user_id);
        participantIds.forEach(id => recurringSelectedParticipants.add(id));
        
        // Update checkboxes
        const allCheckboxes = document.querySelectorAll('#recurring-participants-section input[type="checkbox"]');
        allCheckboxes.forEach(cb => {
            cb.checked = recurringSelectedParticipants.has(parseInt(cb.value, 10));
        });
    }
    
    updateRecurringPreview();
    updateRecurringSplitCalculation(); // 🔴 Ensure split is calculated
}

/**
 * Refresh recurring expense list
 */
export async function refreshRecurringList() {
    try {
        const response = await fetch(`/groups/${window.currentGroupId}/recurring-expenses`, {
             headers: { 'Authorization': `Bearer ${getAuthToken()}` } // 🔴 Fix: Add Token
        });
        
        if (response.ok) {
            const expenses = await response.json();
            renderRecurringExpenseList(expenses);
        } else {
            console.error('Failed to get recurring expense list'); // Translated
            renderRecurringExpenseList([]); // 🔴 Show empty list
        }
    } catch (error) {
        console.error('Failed to get recurring expense list:', error); // Translated
        renderRecurringExpenseList([]); // 🔴 Show empty list
    }
}

/**
 * Render recurring expense list
 * 🔴 Fix: Amount is in cents
 */
function renderRecurringExpenseList(expenses) {
    const container = document.getElementById('recurring-list'); // 🔴 Fix: Use correct ID
    if (!container) {
        console.error('Could not find recurring expense list container'); // Translated
        return;
    }
    
    container.innerHTML = '';
    
    if (!expenses || expenses.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No recurring expenses found</p>'; // Translated
        return;
    }
    
    expenses.forEach(expense => {
        const expenseItem = document.createElement('div');
        expenseItem.className = 'bg-white p-4 rounded-lg border border-gray-200 shadow-sm';
        
        const header = document.createElement('div');
        header.className = 'flex justify-between items-start mb-2';
        
        const title = document.createElement('h3');
        title.className = 'text-lg font-medium text-gray-900';
        title.textContent = expense.description || `Recurring Expense ${expense.frequency}`; // Translated
        
        const status = document.createElement('span');
        status.className = `px-2 py-1 text-xs font-medium rounded-full ${
            expense.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`;
        status.textContent = expense.is_active ? 'Active' : 'Disabled'; // Translated
        
        header.appendChild(title);
        header.appendChild(status);
        
        const details = document.createElement('div');
        details.className = 'text-sm text-gray-600 space-y-1';
        
        const amount = document.createElement('p');
        // 🔴 Fix: Amount is in cents
        const displayAmount = centsToAmountString ? centsToAmountString(expense.amount) : (expense.amount / 100).toFixed(2);
        amount.textContent = `Amount: $${displayAmount}`; // Translated
        
        const frequency = document.createElement('p');
        const frequencyLabels = {
            'daily': 'Daily', // Translated
            'weekly': 'Weekly', // Translated
            'monthly': 'Monthly', // Translated
            'yearly': 'Yearly' // Translated
        };
        frequency.textContent = `Frequency: ${frequencyLabels[expense.frequency] || expense.frequency}`; // Translated
        
        const dateRange = document.createElement('p');
        // 🔴 Fix: next_due_date
        dateRange.textContent = `Starts: ${expense.start_date} (Next: ${expense.next_due_date})`; // Translated
        
        const payer = document.createElement('p');
        // 🔴 Fix: Find payer name from groupMembers
        const payerName = getMemberNameById(expense.payer_id);
        payer.textContent = `Payer: ${payerName}`; // Translated
        
        details.appendChild(amount);
        details.appendChild(frequency);
        details.appendChild(dateRange);
        details.appendChild(payer);
        
        const actions = document.createElement('div');
        actions.className = 'mt-3 flex space-x-2';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600';
        editBtn.textContent = 'Edit'; // Translated
        editBtn.onclick = () => handleEditRecurringExpense(expense.id);
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = `px-3 py-1 text-sm rounded ${
            expense.is_active 
                ? 'bg-yellow-500 text-white hover:bg-yellow-600' // 🔴 Changed to yellow
                : 'bg-green-500 text-white hover:bg-green-600'
        }`;
        toggleBtn.textContent = expense.is_active ? 'Disable' : 'Enable'; // Translated
        toggleBtn.onclick = () => {
            if (expense.is_active) {
                handleDisableRecurringExpense(expense.id);
            } else {
                handleEnableRecurringExpense(expense.id);
            }
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600';
        deleteBtn.textContent = 'Delete'; // Translated
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

/** 🔴 Helper function: Get member name by ID **/
function getMemberNameById(userId) {
    if (!window.groupMembers) return `User ${userId}`;
    const member = window.groupMembers.find(m => m.user_id === userId);
    if (member) {
        return member.user?.username || member.nickname || `User ${userId}`;
    }
    return `User ${userId}`;
}


/**
 * Open recurring expense detail modal
 */
export function openRecurringDetail(expenseId) {
    openRecurringDetailModal();
}

/**
 * Open add recurring expense modal
 */
function openAddRecurringModal() {
    const modal = document.getElementById('add-recurring-expense-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
    
    console.log('🔧 Opening recurring expense modal, initializing form data...'); // Translated
    currentEditingRecurringExpense = null; // 🔴 Ensure reset
    resetRecurringForm(); // 🔴 Reset form
    updateRecurringFormMembers();
}

/**
 * Open recurring expense detail modal
 */
function openRecurringDetailModal() {
    const modal = document.getElementById('recurring-detail-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * Close recurring expense detail modal
 */
function closeRecurringDetailModal() {
    const modal = document.getElementById('recurring-detail-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Get frequency label
 */
function getFrequencyLabel(frequency) {
    const labels = {
        'daily': 'Daily', // Translated
        'weekly': 'Weekly', // Translated
        'monthly': 'Monthly', // Translated
        'yearly': 'Yearly' // Translated
    };
    return labels[frequency] || frequency;
}

// ==================== Global function binding ====================

console.log('Exposing recurring expense functions to global...'); // Translated

window.handleSaveRecurringExpense = handleSaveRecurringExpense;
window.selectFrequency = selectFrequency;
window.setRecurringSplitMethod = setRecurringSplitMethod;
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

console.log('Recurring expense module loaded, all functions exposed to global - v2025.11.10.002'); // Translated

initializeEventListeners();

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    console.log('Initializing recurring expense event listeners...'); // Translated
    
    const amountInput = document.getElementById('recurring-amount');
    if (amountInput) {
        amountInput.removeAttribute('oninput');
        amountInput.addEventListener('input', handleRecurringAmountChange);
        console.log('✅ Amount input event listener bound'); // Translated
    } else {
        console.error('❌ Could not find amount input: recurring-amount'); // Translated
    }
    
    const frequencyButtons = document.querySelectorAll('.frequency-option');
    frequencyButtons.forEach(button => {
        button.removeAttribute('onclick');
        button.addEventListener('click', function() {
            const frequency = this.getAttribute('data-frequency');
            if (frequency) {
                console.log('✅ Selected frequency:', frequency); // Translated
                selectFrequency(frequency);
            }
        });
    });
    console.log(`✅ ${frequencyButtons.length} repeat frequency button event listeners bound`); // Translated
    
    const payerSelect = document.getElementById('recurring-payer');
    if (payerSelect) {
        payerSelect.addEventListener('change', () => {
            console.log('Payer selection changed'); // Translated
        });
    }

    // 🔴 [START] New code
    // Bind "Equally Split" / "Custom Amount" buttons in "Add Recurring Expense" modal
    const recSplitMethodContainer = document.getElementById('recurring-split-method-selection');
    if (recSplitMethodContainer) {
        recSplitMethodContainer.addEventListener('click', (event) => {
            const button = event.target.closest('.split-toggle-btn');
            if (button && button.dataset.method) {
                const method = button.dataset.method; // 'equal' or 'custom'
                setRecurringSplitMethod(method); // Call existing function in recurring_expense.js
                console.log(`✅ "Add Recurring Expense" Modal: Split method switched to ${method}`); // Translated
            }
        });
        console.log('✅ "Add Recurring Expense" Modal: Split button event listener bound'); // Translated
    } else {
        console.error('❌ Could not find split button container for "Add Recurring Expense" modal: #recurring-split-method-selection'); // Translated
    }
    // 🔴 [END] New code
    
    console.log('Recurring expense event listener initialization complete'); // Translated
}

// ==================== Modal control functions ====================

function handleRecurringCancel() {
    closeRecurringExpenseModal();
}

function handleRecurringDetailCancel() {
    closeRecurringDetailModal();
}

function saveRecurringExpenseHandler(event) {
    return handleSaveRecurringExpense(event);
}

function showMessage(message, type = 'info') {
    if (window.showCustomAlert) {
        window.showCustomAlert(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

initializeEventListeners();

setTimeout(() => {
    console.log('Verifying function exposure status:'); // Translated
    console.log('handleRecurringAmountChange:', typeof window.handleRecurringAmountChange);
    console.log('selectFrequency:', typeof window.selectFrequency);
    console.log('setRecurringSplitMethod:', typeof window.setRecurringSplitMethod);
}, 1000);