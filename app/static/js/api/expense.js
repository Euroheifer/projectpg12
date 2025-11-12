// expense.js - Expense-related CRUD operations, split calculation, form processing
// Prevent caching version: 2025.11.10.007 - Fix missing updateSplitCalculation
const JS_CACHE_VERSION = '2025.11.10.007';

// expense.js - Expense-related CRUD operations, split calculation, form processing
import { getTodayDate, requireAdmin, getAuthToken, showCustomAlert, amountToCents } from '../ui/utils.js'; // 🔴 Fix: import amountToCents
import { centsToAmountString } from './amount_utils.js';

// --- Global State ---
let selectedParticipants = new Set();
let currentSplitMethod = 'equal';
let memberSplits = [];
let currentEditingExpense = null;

// 🔴 Fix: Add independent state for "Details" modal
let detailMemberSplits = [];

// ----------- Initialize Expense Form ---------------- //
export function initializeExpenseForm() {
    const today = getTodayDate();
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.value = today;

    // 🔴 Fix: Add retry logic to ensure groupMembers is loaded
    if (!window.groupMembers || window.groupMembers.length === 0) {
        console.warn('initializeExpenseForm: groupMembers not loaded, retrying in 500ms...');
        setTimeout(initializeExpenseForm, 500);
        return;
    }
    console.log('initializeExpenseForm: groupMembers loaded, starting to populate form.');
    
    // 1. Get form elements from groups.html
    const payerSelect = document.getElementById('payer'); //
    const participantsContainer = document.querySelector('#participants-section .grid'); //

    if (!payerSelect || !participantsContainer) {
        console.error('Expense form elements (payer or participants-section) not found!');
        return;
    }

    // 2. Clear old options
    payerSelect.innerHTML = '';
    participantsContainer.innerHTML = '';

    if (window.groupMembers.length === 0) {
        console.warn('initializeExpenseForm: window.groupMembers is empty. Dropdowns will be empty.');
        payerSelect.innerHTML = '<option value="">No members found</option>';
        return;
    }

    // 3. Populate "Who paid?" (Payer) dropdown
    window.groupMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.user_id; //
        option.textContent = member.user.username || member.nickname || `User ${member.user_id}`;
        
        // Set the current user as the default payer
        if (member.user_id === window.CURRENT_USER_ID) {
            option.selected = true;
        }
        payerSelect.appendChild(option);
    });

    // 4. Populate "Participants" checkboxes
    selectedParticipants = new Set(); // Reset participants Set
    window.groupMembers.forEach(member => {
        selectedParticipants.add(member.user_id); // Select everyone by default
        
        const label = document.createElement('label');
        label.className = 'flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-300 shadow-sm';
        
        // *** Fix ***: Use username
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
        
        // Add event listener to update the Set when unchecked
        label.querySelector('input').addEventListener('change', (e) => {
            const userId = parseInt(e.target.value, 10);
            if (e.target.checked) {
                selectedParticipants.add(userId);
            } else {
                selectedParticipants.delete(userId);
            }
            console.log('Participants updated:', selectedParticipants);
            
            // 🔴 Fix: Explicitly call window.updateSplitCalculation
            setTimeout(() => {
                if (window.updateSplitCalculation) {
                    window.updateSplitCalculation();
                }
            }, 100);
        });
        participantsContainer.appendChild(label);
    });

    console.log('Expense form initialized with members. Default participants:', selectedParticipants);
    
    // Initialize split details and summary display - fix selector issue
    renderSplitDetails();
    updateSplitSummary();
    
    // Set default split method to equal
    currentSplitMethod = 'equal';
    setSplitMethod('equal', false); // Do not trigger recalculation, as it was just initialized
}
// --------------------- end --------------------------------- //

// ------------------- [START MODIFIED BLOCK: handleSaveExpense] -------------------

/**
 * Replaces the old stubbed function.
 * Reads form data, validates, and sends to the backend API using FormData.
 * 🚨 MODIFIED: Now uses FormData to support file upload.
 */
export async function handleSaveExpense(event) {
    event.preventDefault(); // Stop the form's default submission
    console.log('Attempting to save expense...');

    const form = event.target;

    // 1. Read data from the form
    const description = form.querySelector('#description').value;
    const amountString = form.querySelector('#amount').value;
    const payer_id = parseInt(form.querySelector('#payer').value);
    const date = form.querySelector('#date').value;
    
    // 🚨 New: Get the file object
    const receiptFile = form.querySelector('#receipt-file').files[0];

    // 2. Validate and convert data
    const amountFloat = parseFloat(amountString);
    if (isNaN(amountFloat) || amountFloat <= 0) {
        showCustomAlert('Error', 'Please enter a valid, positive amount.');
        return;
    }

    // Convert amount to cents to match the backend
    const amountInCents = Math.round(amountFloat * 100);

    if (selectedParticipants.size === 0) {
        showCustomAlert('Error', 'You must split the expense with at least one person.');
        return;
    }

    // Validate split amounts (only for custom split)
    if (currentSplitMethod === 'custom') {
        const validation = validateSplitAmounts();
        if (!validation.isValid) {
            showCustomAlert('Error', `Split amount validation failed: ${validation.message}`);
            return;
        }
    }

    // 3. Construct splits array
    // 🔴 Fix: Ensure split calculation is synchronous before saving
    updateSplitCalculation(); // Ensure memberSplits is up-to-date
    
    const splits = Array.from(selectedParticipants).map(userId => {
        const splitRecord = memberSplits.find(s => s.user_id === userId);
        if (currentSplitMethod === 'equal') {
            return { 
                user_id: userId, 
                amount: splitRecord ? splitRecord.amount : null // 🔴 amount is already in cents
            };
        } else {
            // For custom split, use the value from memberSplits
            return { 
                user_id: userId, 
                amount: splitRecord ? splitRecord.amount : 0 // 🔴 amount is already in cents
            };
        }
    });

    // 4. 🚨 New: Construct FormData object
    const formData = new FormData();
    formData.append('description', description);
    formData.append('amount', amountInCents);
    formData.append('payer_id', payer_id);
    formData.append('date', date);
    formData.append('split_type', currentSplitMethod);
    // The splits array must be converted to a JSON string to be sent in FormData
    formData.append('splits', JSON.stringify(splits)); 

    // 🚨 New: Add the file
    if (receiptFile) {
        // The backend will receive this file as 'image_file'
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
    // 🚨 Fix: Use window.currentGroupId to access the global ID
    const groupId = window.currentGroupId; 

    // 5. --- Fixed try...catch block ---
    try {
        const response = await fetch(`/groups/${groupId}/expenses`, {
            method: 'POST',
            // 🚨 Key change: Remove Content-Type header, let the browser set multipart/form-data automatically
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData // 🚨 Send the FormData object directly
        });

        if (!response.ok) {
            // This is the new, fixed error handling section
            const errorData = await response.json();

            let errorMessage = 'Failed to add expense. Unknown error.';

            if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                    // If the error is a simple string
                    errorMessage = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    // If it's a Pydantic 422 error list
                    errorMessage = errorData.detail.map(err => {
                        // err.loc is an array, e.g., ['body', 'date']
                        let field = err.loc.length > 1 ? err.loc[err.loc.length - 1] : err.loc.join(' -> ');
                        return `${field}: ${err.msg}`; // e.g., "date: invalid date format"
                    }).join('; ');
                } else if (typeof errorData.detail === 'object') {
                    // Other types of object errors
                    errorMessage = JSON.stringify(errorData.detail);
                }
            }

            // Print the full error object to the console for debugging
            console.error('Error response from server:', errorData);
            throw new Error(errorMessage);
        }

        // 6. Handle success
        const newExpense = await response.json();
        console.log('Expense added successfully:', newExpense);
        showCustomAlert('Success', 'Expense added successfully');

        form.reset(); // Clear the form
        window.handleCancel(); // Close the modal (from group_page_en.js)

        // Refresh the expense list on the page
        await window.loadExpensesList(); // (from group_page_en.js)

    } catch (error) {
        // This catch block will now receive a meaningful error string
        console.error('Error saving expense:', error);
        showCustomAlert('Error', error.message); // The modal will now show the real error
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
        throw new Error('Failed to get expense list');
    }
    return await response.json();
}



export function refreshExpensesList() {
    const container = document.getElementById('expenses-list');
    if (!container) return;

    if (window.expensesList.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>No expense records yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = window.expensesList.map(expense => {
		// --- add for display img 
		const payerMember = window.groupMembers.find(m => m.user_id === expense.payer_id);
        const payerName = payerMember ? (payerMember.user.username || payerMember.nickname) : 'Unknown User';
		// ---- END
        const isOwnExpense = expense.payer_id === window.CURRENT_USER_ID;
        //const payerName = window.groupMembers.find(m => m.id === expense.payer)?.name || expense.payer;
		const amountDisplay = window.centsToAmountString ? window.centsToAmountString(expense.amount) : (expense.amount / 100).toFixed(2);
		return `
            <div class="expense-item flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition duration-150 cursor-pointer ${isOwnExpense ? 'border-l-4 border-l-primary' : ''}"
                 onclick="openExpenseDetail(${expense.id})">
                
                ${expense.image_url ? `
                    <div class="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 mr-4">
                        <img src="${expense.image_url}" alt="Expense receipt image" 
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
                    <p class="text-xs text-gray-500">Date: ${expense.date} | Payer: ${payerName}</p>
                </div>
                <div class="text-right">
                    <p class="text-lg font-semibold text-primary">$${amountDisplay}</p>
                    <p class="text-xs text-gray-500">${isOwnExpense ? 'You paid' : ''}</p>
                </div>
            </div>
        `;
    }).join('');
}

let currentEditingExpenseId = null;  //for update function 04 Nov

export function openExpenseDetail(expenseId) {
    // Find the data in the current expense list
    const expense = window.expensesList.find(e => e.id === expenseId);
    if (!expense) {
        showCustomAlert('Error', 'Expense details not found!');
        return;
    }
    
    // Store the ID being edited
    currentEditingExpenseId = expenseId;
    
    // Set the global expense ID for payment functions
    window.selectedExpenseId = expenseId;
    window.currentExpenseId = expenseId;
    console.log('Setting current expense ID:', expenseId);

    const modal = document.getElementById('expense-detail-modal');
    const title = document.getElementById('expense-detail-title');

    if (modal && title) {
        title.textContent = `Expense Details - ${expense.description}`;
        modal.classList.remove('hidden');

        // --- 🔴 FIX START 🔴 ---
        // After: Pass the 'modal' element we just found
        initializeExpenseDetailForm(expense); 
        // --- 🔴 FIX END 🔴 ---
    }
}

// --- 🔴 Final fix solution 🔴 ---
// 1. Keep accepting only 'expense'
export function initializeExpenseDetailForm(expense) {
    
    // 2. Use querySelector to locate the form nested inside the modal.
    //    This is more robust than getElementById in case of caching or duplicate ID issues.
    const form = document.querySelector('#expense-detail-modal #expense-detail-form'); 
    
    if (!form) {
        // 3. Update the error message to be more specific
        console.error('Could not find #expense-detail-form inside #expense-detail-modal. Please check if the ID in groups.html is correct.');
        return;
    }
// --- 🔴 Fix end 🔴 ---

    // 1. Populate basic fields
    form.querySelector('#detail-description').value = expense.description;
    // 🚨 Convert to $X.YY format
    form.querySelector('#detail-amount').value = (expense.amount / 100).toFixed(2); 
    form.querySelector('#detail-date').value = expense.date; // Date should be in YYYY-MM-DD format
    
    // 2. Populate payer dropdown
    const payerSelect = form.querySelector('#detail-payer');
    payerSelect.innerHTML = ''; // Clear options
    window.groupMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.user_id;
        option.textContent = member.user.username || member.nickname;
        if (member.user_id === expense.payer_id) {
            option.selected = true;
        }
        payerSelect.appendChild(option);
    });

    // 3. Populate participant checkboxes (this requires a complex sub-function to handle splits)
    // 🚨 Simple implementation: default to checking all participants, and check the original participants.
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
            // 🔴 Fix: Add event listener for checkboxes in the details modal
            label.querySelector('input').addEventListener('change', (e) => {
                console.log('Details modal participant changed');
                // 🔴 Fix: Explicitly call window.updateDetailSplitCalculation
                if (window.updateDetailSplitCalculation) {
                    window.updateDetailSplitCalculation();
                }
            });
            participantsContainer.appendChild(label);
        });
    }

    // 4. Set split method buttons
    const splitEqualBtn = form.querySelector('#detail-split-equal');
    const splitExactBtn = form.querySelector('#detail-split-exact');
    
    if (expense.split_type === 'equal') {
        splitEqualBtn.classList.add('active');
        splitExactBtn.classList.remove('active');
    } else {
        splitEqualBtn.classList.remove('active');
        splitExactBtn.classList.add('active');
    }
	// 🚨 Key: Add image preview and file upload reset logic (new code)
    const previewContainer = form.querySelector('#detail-current-receipt-preview');
    const previewLink = form.querySelector('#detail-current-receipt-link'); // 🔴 Fix: Get the A tag
    const previewImg = form.querySelector('#detail-current-receipt-img');
    const fileNameDisplay = form.querySelector('#detail-file-name-display'); // 🔴 Fix: This is for new file uploads

    if (expense.image_url) {
        // If an image URL exists, show the preview
        if (previewImg) previewImg.src = expense.image_url;
        if (previewLink) previewLink.href = expense.image_url; // 🔴 Fix: Set the link
        if (previewContainer) previewContainer.classList.remove('hidden');
        // if (fileNameDisplay) fileNameDisplay.textContent = 'Current receipt uploaded. Click to select a replacement';
    } else {
        // If there is no image, hide the preview
        if (previewContainer) previewContainer.classList.add('hidden');
        // if (fileNameDisplay) fileNameDisplay.textContent = 'Click to upload receipt image (Max 1MB)';
    }
    
    // Ensure the file input is reset (this feature is temporarily not supported in the details page)
    // const fileInput = form.querySelector('#detail-receipt-file');
    // if (fileInput) fileInput.value = ""; 

    // 🔴 Fix: Call split calculation at the end of form population
    updateDetailSplitCalculation();
}

export function setSplitMethod(method, triggerUpdate = true) {
    console.log('Switching split method:', method);
    
    currentSplitMethod = method;
    
    // Update button state
    const equalBtn = document.getElementById('split-equal');
    const customBtn = document.getElementById('split-exact'); // 🔴 Fix: ID is split-exact
    
    if (equalBtn && customBtn) {
        if (method === 'equal') {
            equalBtn.classList.add('active');
            customBtn.classList.remove('active');
        } else {
            equalBtn.classList.remove('active');
            customBtn.classList.add('active');
        }
    }
    
    // If an update needs to be triggered, recalculate the split
    if (triggerUpdate) {
        updateSplitCalculation();
    }
    
    // Re-render split details
    renderSplitDetails();
}

// Function called in HTML:
export function handleAddNewExpense() {
    // TODO: Open add expense modal
    console.log('Open add expense modal');
}


export function handleDeleteExpense() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        // Optional: You can customize the message here
        const msg = document.getElementById('delete-confirm-message');
        msg.textContent = 'Confirm Detele?';
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
    
    console.log('Handling participant selection', userId, containerId, 'currently selected:', selectedParticipants);
    
    // Recalculate split
    setTimeout(() => {
        // 🔴 Fix: Explicitly call window.updateSplitCalculation
        if (window.updateSplitCalculation) {
            window.updateSplitCalculation();
        }
    }, 100);
}


// 🔴 Fix: Add missing updateSplitCalculation function
// This function serves the "Add Expense" modal
export function updateSplitCalculation() {
    // 1. 🔴 Change selector to "add-expense-modal"
    const form = document.querySelector('#add-expense-modal #expense-form'); 
    if (!form) {
        console.warn('Add expense form not found, cannot calculate split');
        return;
    }

    // 2. 🔴 Change selector to '#amount'
    const amountInput = form.querySelector('#amount');
    if (!amountInput || !amountInput.value) {
        memberSplits = []; // 🔴 Change to memberSplits
        renderSplitDetails();
        updateSplitSummary();
        return;
    }

    const totalAmountInCents = amountToCents(amountInput.value);
    if (isNaN(totalAmountInCents) || totalAmountInCents <= 0) {
        memberSplits = []; // 🔴 Change to memberSplits
        renderSplitDetails();
        updateSplitSummary();
        return;
    }

    // 3. 🔴 Change selector to '#participants-section'
    const checkedInputs = form.querySelectorAll('#participants-section input:checked');
    const participants = Array.from(checkedInputs).map(input => parseInt(input.value));
    
    if (participants.length === 0) {
        memberSplits = []; // 🔴 Change to memberSplits
        renderSplitDetails();
        updateSplitSummary();
        return;
    }
    
    // 4. 🔴 Change selector to '#split-equal'
    const isEqualSplit = form.querySelector('#split-equal').classList.contains('active');
    const method = isEqualSplit ? 'equal' : 'custom';

    // 5. 🔴 Change to memberSplits
    memberSplits = participants.map(userId => {
        const member = window.groupMembers.find(m => m.user_id === userId);
        const existingSplit = memberSplits.find(s => s.user_id === userId); 
        return {
            user_id: userId,
            amount: existingSplit && method === 'custom' ? existingSplit.amount : 0, 
            member_name: member ? (member.user.username || member.nickname) : `User ${userId}`
        };
    });

    if (method === 'equal') {
        const baseAmountInCents = Math.floor(totalAmountInCents / participants.length);
        const remainderInCents = totalAmountInCents % participants.length;
        
        memberSplits.forEach((split, index) => { // 🔴 Change to memberSplits
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
            
            memberSplits.forEach((split, index) => { // 🔴 Change to memberSplits
                split.amount = baseAmountInCents;
                if (index < remainderInCents) {
                    split.amount += 1;
                }
            });
        }
    }

    // 6. 🔴 Call renderSplitDetails and updateSplitSummary
    renderSplitDetails();
    updateSplitSummary();
    
    console.log('Main form split calculation complete (cents):', memberSplits);
}


export function setDetailSplitMethod(method) {
    console.log('Setting detail split method:', method);
    
    const form = document.querySelector('#expense-detail-modal #expense-detail-form');
    if (!form) {
        console.error('Detail form not found');
        return;
    }
    
    // Update button state
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
    
    // 🔴 Fix: Call detail split calculation
    updateDetailSplitCalculation();
}

// 🔴 Fix: Rewrite `updateDetailSplitCalculation`
export function updateDetailSplitCalculation() {
    const form = document.querySelector('#expense-detail-modal #expense-detail-form');
    if (!form) {
        console.warn('Detail form not found, cannot calculate split');
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

    // Get selected participants
    const checkedInputs = form.querySelectorAll('#detail-participants-container input:checked');
    const participants = Array.from(checkedInputs).map(input => parseInt(input.value));
    
    if (participants.length === 0) {
        detailMemberSplits = [];
        renderDetailSplitDetails();
        updateDetailSplitSummary();
        return;
    }
    
    // Get current split method
    const isEqualSplit = form.querySelector('#detail-split-equal').classList.contains('active');
    const method = isEqualSplit ? 'equal' : 'custom';

    // Initialize/update split data
    detailMemberSplits = participants.map(userId => {
        const member = window.groupMembers.find(m => m.user_id === userId);
        const existingSplit = detailMemberSplits.find(s => s.user_id === userId); // Preserve custom amount
        return {
            user_id: userId,
            amount: existingSplit && method === 'custom' ? existingSplit.amount : 0, // 🔴 amount stores cents
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
        // Custom split
        const sumCurrentSplits = detailMemberSplits.reduce((sum, s) => sum + s.amount, 0);
        
        // If the custom total does not equal the total amount (or is 0), re-initialize to equal
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

    // Re-render UI
    renderDetailSplitDetails();
    updateDetailSplitSummary();
    
    console.log('Detail split calculation complete (cents):', detailMemberSplits);
}

// 🔴 Fix: Add `renderDetailSplitDetails`
export function renderDetailSplitDetails() {
    const container = document.getElementById('detail-split-list');
    if (!container) {
        console.warn('Detail split container not found');
        return;
    }
    
    if (detailMemberSplits.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-gray-500"><p>Please select participants</p></div>`;
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

// 🔴 Fix: Add `updateDetailSplitSummary`
export function updateDetailSplitSummary() {
    const summaryContainer = document.getElementById('detail-split-summary');
    if (!summaryContainer) {
        console.warn('Detail split summary container not found');
        return;
    }
    
    const amountInput = document.getElementById('detail-amount');
    const totalAmountInCents = amountToCents(amountInput.value);
    
    const validation = validateDetailSplitAmounts();
    const participantCount = detailMemberSplits.length;
    
    const averageSplitInCents = participantCount > 0 ? totalAmountInCents / participantCount : 0;
    
    summaryContainer.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-blue-800">Split Summary</span>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="text-center">
                    <div class="text-lg font-bold text-blue-900">$${centsToAmountString(totalAmountInCents)}</div>
                    <div class="text-blue-600">Total Amount</div>
                </div>
                <div class="text-center">
                    <div class="text-lg font-bold text-blue-900">${participantCount}</div>
                    <div class="text-blue-600">Participants</div>
                </div>
            </div>
            <div class="border-t border-blue-200 pt-2">
                <div class="flex justify-between items-center text-xs">
                    <span class="text-blue-700">Split Validation:</span>
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

// 🔴 Fix: Add `validateDetailSplitAmounts`
export function validateDetailSplitAmounts() {
    const amountInput = document.getElementById('detail-amount');
    if (!amountInput || !amountInput.value) {
        return { isValid: false, message: 'Please enter total amount' };
    }
    
    const totalAmountInCents = amountToCents(amountInput.value);
    if (isNaN(totalAmountInCents) || totalAmountInCents <= 0) {
        return { isValid: false, message: 'Please enter a valid total amount' };
    }
    
    const sumSplitsInCents = detailMemberSplits.reduce((sum, split) => sum + (split.amount || 0), 0);
    const differenceInCents = Math.abs(sumSplitsInCents - totalAmountInCents);
    
    if (differenceInCents <= 1) {
        if (differenceInCents === 1 && detailMemberSplits.length > 0) {
             detailMemberSplits[0].amount += (totalAmountInCents - sumSplitsInCents);
        }
        return { isValid: true, message: 'Split amounts match' };
    } else {
        const status = sumSplitsInCents > totalAmountInCents ? 'over' : 'under';
        return { 
            isValid: false, 
            message: `Split amounts are ${status} by ¥${(differenceInCents / 100).toFixed(2)}`
        };
    }
}

// 🔴 Fix: Add `handleDetailCustomAmountChange`
export function handleDetailCustomAmountChange(input, memberId) {
    const newValueInCents = amountToCents(input.value);
    
    const splitIndex = detailMemberSplits.findIndex(s => s.user_id === memberId);
    if (splitIndex !== -1) {
        detailMemberSplits[splitIndex].amount = newValueInCents;
    }
    
    validateDetailSplitAmounts();
    updateDetailSplitSummary();
    
    console.log('Detail custom amount updated (cents):', memberId, newValueInCents, detailMemberSplits);
}


export function handleCustomAmountChange(input, memberId) {
    // 🔴 Fix: Convert the input dollars to cents for storage
    const newValueInCents = amountToCents(input.value);
    
    // Update the corresponding split record
    const splitIndex = memberSplits.findIndex(s => s.user_id === memberId);
    if (splitIndex !== -1) {
        memberSplits[splitIndex].amount = newValueInCents;
    }
    
    // Validate split amounts
    validateSplitAmounts();
    
    // Update summary
    updateSplitSummary();
    
    console.log('Custom amount updated (cents):', memberId, newValueInCents, memberSplits);
}

export function handleAmountChange() {
    console.log('Amount changed, recalculating split');
    
    // Delay execution to ensure DOM is updated
    setTimeout(() => {
        // 🔴 Fix: Explicitly call window.updateSplitCalculation
        if (window.updateSplitCalculation) {
            window.updateSplitCalculation();
        }
    }, 100);
}

export function validateSplitAmounts() {
    const amountInput = document.getElementById('amount');
    if (!amountInput || !amountInput.value) {
        return { isValid: false, message: 'Please enter total amount' };
    }
    
    // 🔴 Fix: Compare in cents
    const totalAmountInCents = amountToCents(amountInput.value);
    if (isNaN(totalAmountInCents) || totalAmountInCents <= 0) {
        return { isValid: false, message: 'Please enter a valid total amount' };
    }
    
    const sumSplitsInCents = memberSplits.reduce((sum, split) => sum + (split.amount || 0), 0);
    const differenceInCents = Math.abs(sumSplitsInCents - totalAmountInCents);
    
    // Allow a 1-cent margin of error (to handle floating point precision issues)
    if (differenceInCents <= 1) {
        // 🔴 Fix: If it matches, force the sum to equal the total (to handle 1-cent difference)
        if (differenceInCents === 1 && memberSplits.length > 0) {
             memberSplits[0].amount += (totalAmountInCents - sumSplitsInCents);
             console.log(`Automatically adjusted 1-cent difference for ${memberSplits[0].member_name}`);
        }
        return { isValid: true, message: 'Split amounts match', sumSplits: sumSplitsInCents };
    } else {
        const status = sumSplitsInCents > totalAmountInCents ? 'over' : 'under';
        // 🔴 Fix: Show dollars
        return { 
            isValid: false, 
            message: `Split amounts are ${status} by ¥${(differenceInCents / 100).toFixed(2)}`,
            sumSplits: sumSplitsInCents,
            difference: differenceInCents
        };
    }
}

export function renderSplitDetails() {
    // Fix selector: Use the correct container ID
    const container = document.getElementById('split-list') || document.getElementById('split-details-container');
    if (!container) {
        console.warn('Split details container not found');
        return;
    }
    
    if (memberSplits.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <p>Please select participants</p>
            </div>
        `;
        return;
    }
    
    // 🔴 Fix: Amount is in cents
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

export function updateSplitSummary() {
    // Fix selector: Use the correct container ID
    const summaryContainer = document.getElementById('split-summary') || document.getElementById('split-summary-container');
    if (!summaryContainer) {
        console.warn('Split summary container not found');
        return;
    }
    
    // 🔴 Fix: In cents
    const amountInput = document.getElementById('amount');
    const totalAmountInCents = amountToCents(amountInput.value);
    
    const validation = validateSplitAmounts();
    const participantCount = memberSplits.length;
    
    // 🔴 Fix: In cents
    const averageSplitInCents = participantCount > 0 ? totalAmountInCents / participantCount : 0;
    
    summaryContainer.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-blue-800">Split Summary</span>
                <span class="text-xs text-blue-600">${currentSplitMethod === 'equal' ? 'Equal Split' : 'Custom Split'}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="text-center">
                    <div class="text-lg font-bold text-blue-900">$${centsToAmountString(totalAmountInCents)}</div>
                    <div class="text-blue-600">Total Amount</div>
                </div>
                <div class="text-center">
                    <div class="text-lg font-bold text-blue-900">${participantCount}</div>
                    <div class="text-blue-600">Participants</div>
                </div>
            </div>
            
            ${currentSplitMethod === 'equal' ? `
                <div class="text-center border-t border-blue-200 pt-2">
                    <div class="text-sm text-blue-700">
                        Average per person: <span class="font-semibold">$${centsToAmountString(averageSplitInCents)}</span>
                        ${(totalAmountInCents % participantCount !== 0) ? '<span class="text-xs">(remainder automatically split)</span>' : ''}
                    </div>
                </div>
            ` : ''}
            
            <div class="border-t border-blue-200 pt-2">
                <div class="flex justify-between items-center text-xs">
                    <span class="text-blue-700">Split Validation:</span>
                    <span class="font-medium ${
                        validation.isValid ? 'text-green-600' : 'text-red-600'
                    }">
                        ${validation.message}
                    </span>
                </div>
                ${!validation.isValid && validation.difference ? `
                    <div class="mt-1 text-xs text-gray-600">
                        Current split sum: $${centsToAmountString(validation.sumSplits)}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Add/remove error style based on validation result
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

export function handleDetailAmountChange() {
    console.log('Detail amount changed, recalculating split');
    
    setTimeout(() => {
        // 🔴 Fix: Explicitly call window.updateDetailSplitCalculation
        if (window.updateDetailSplitCalculation) {
            window.updateDetailSplitCalculation();
        }
    }, 100);
}



// app/static/js/api/expense.js

export async function handleUpdateExpense(event) {
    event.preventDefault(); 
    console.log('Attempting to update expense via JSON...');

    const form = event.target;

    // 1. Get ID and basic data
    const expenseId = currentEditingExpenseId;
    if (!expenseId) {
         showCustomAlert('Error', 'Could not find the ID of the expense being edited.');
         return;
    }
    
    const description = form.querySelector('#detail-description').value;
    const amountString = form.querySelector('#detail-amount').value;
    const payer_id = parseInt(form.querySelector('#detail-payer').value);
    
    // 🔴 Fix: Do not send the date field
    // const date = form.querySelector('#detail-date').value;
    
    // 🚨 Note: File update is disabled in this fix (see below)
    // const receiptFile = form.querySelector('#detail-receipt-file').files[0];

    // 2. Validate and convert amount
    const amountFloat = parseFloat(amountString);
    if (isNaN(amountFloat) || amountFloat <= 0) {
        showCustomAlert('Error', 'Please enter a valid, positive amount.');
        return;
    }
    const amountInCents = Math.round(amountFloat * 100);

    // 3. Construct splits (🔴 Fix: Use detailMemberSplits)
    // Ensure split data is synchronous
    updateDetailSplitCalculation();
        
    if (detailMemberSplits.length === 0) {
        showCustomAlert('Error', 'You must split the expense with at least one person.');
        return;
    }
    
    // 🔴 Fix: Build from `detailMemberSplits` instead of `updatedParticipants`
    const updatedSplits = detailMemberSplits.map(split => {
        return { user_id: split.user_id, amount: split.amount }; // Already in cents
    });
    
    // 🔴 Fix: Get the current split method
    const split_type = form.querySelector('#detail-split-equal').classList.contains('active') ? 'equal' : 'custom';

    // 4. 🔴 Change: Construct a plain JS object, not FormData
    // 🔴 Fix: Remove date field
    const updateData = {
        description: description,
        amount: amountInCents,
        payer_id: payer_id,
        // date: date, // <-- 🔴 Remove this line to fix 422 error
        split_type: split_type, // 🔴 Fix: Send the correct split method
        splits: updatedSplits
        // 'image_file' is intentionally omitted
    };

    const token = getAuthToken();
    const groupId = window.currentGroupId; 

    // 5. 🔴 Change: Send PATCH request with application/json
    try {
        const response = await fetch(`/groups/${groupId}/expenses/${expenseId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                // 🔴 Key: Set Content-Type to JSON
                'Content-Type': 'application/json' 
            },
            // 🔴 Key: Send JSON string
            body: JSON.stringify(updateData) 
        });

        if (!response.ok) {
            const errorData = await response.json();
            // Error handling should now correctly parse JSON errors
            const errorMsg = errorData.detail ? (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)) : 'Failed to update expense';
            throw new Error(errorMsg);
        }

        const updatedExpense = await response.json();
        console.log('Expense updated successfully (via JSON):', updatedExpense);
        showCustomAlert('Success', 'Expense updated successfully');

        // Close modal and refresh list
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

        // On successful deletion, the backend should return 204 No Content
        if (response.status === 204) { 
            showCustomAlert('Success', 'The Expense has been Successfully Deleted');
            
            closeDeleteConfirm();     // 1. Close confirmation modal
            handleDetailCancel();     // 2. Close detail modal
            
            await window.loadExpensesList(); // 3. Refresh list
            
            currentEditingExpenseId = null; // Clear ID

        } else {
            // Handle non-204 errors
            const errorData = await response.json();
            const errorMsg = errorData.detail ? (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)) : 'Deletion failed';
            throw new Error(errorMsg);
        }

    } catch (error) {
        console.error('Error deleting expense:', error);
        showCustomAlert('Error', error.message);
        closeDeleteConfirm(); // Also close the confirmation box on failure
    }
}

export function populateExpenseDetailForm(expense) {
    // TODO: Implement expense detail form population logic
    console.log('Populating expense detail form', expense);
}



export function updateFileNameDisplay(input) {
    // TODO: Implement file name display update logic
    console.log('Updating file name display', input.files[0]?.name);
}

export function updateDetailFileNameDisplay(input) {
    // TODO: Implement detail file name display update logic
    console.log('Updating detail file name display', input.files[0]?.name);
}

// Modal close functions
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



// Expose all functions that need to be accessed globally
window.handleAddNewExpense = handleAddNewExpense;
window.handleSaveExpense = handleSaveExpense;
window.handleCancel = handleCancel;
window.handleDeleteExpense = handleDeleteExpense;
// Export handleUpdateExpense for global access
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

// New split calculation related functions
window.renderSplitDetails = renderSplitDetails;
window.updateSplitSummary = updateSplitSummary;
window.validateSplitAmounts = validateSplitAmounts;

// 🔴 Fix: Expose detail modal calculation/rendering functions
window.renderDetailSplitDetails = renderDetailSplitDetails;
window.updateDetailSplitSummary = updateDetailSplitSummary;
window.validateDetailSplitAmounts = validateDetailSplitAmounts;
window.handleDetailCustomAmountChange = handleDetailCustomAmountChange;


// If these functions are already defined elsewhere, make sure not to redefine them
if (typeof window.closeCustomAlert !== 'function') {
    window.closeCustomAlert = function () {
        const modal = document.getElementById('custom-alert-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };
}

console.log('Expense module loaded, all functions exposed to global');

// 🔴 v6.1 Fix: Immediately bind event listeners (instead of inline event handlers)
initializeExpenseEventListeners();

/**
 * 🔴 v6.1 Fix: Initialize expense event listeners
 * Replaces inline event handlers in HTML to avoid timing issues
 */
function initializeExpenseEventListeners() {
    console.log('Initializing expense event listeners...');
    
    // Bind main expense form amount input event
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        // Remove any existing inline event handlers
        amountInput.removeAttribute('oninput');
        // Add event listener
        amountInput.addEventListener('input', handleAmountChange);
        console.log('✅ Main expense amount input event listener bound');
    } else {
        console.error('❌ Could not find main expense amount input amount');
    }
    
    // Bind expense detail form amount input event
    const detailAmountInput = document.getElementById('detail-amount');
    if (detailAmountInput) {
        // Remove any existing inline event handlers
        detailAmountInput.removeAttribute('oninput');
        // Add event listener
        detailAmountInput.addEventListener('input', handleDetailAmountChange);
        console.log('✅ Expense detail amount input event listener bound');
    } else {
        console.error('❌ Could not find expense detail amount input detail-amount');
    }

    // 🔴 [START] New code
            
    // Bind "Equally Split" / "Custom Amount" buttons in "Add Expense" modal
    const splitMethodContainer = document.getElementById('split-method-selection');
    if (splitMethodContainer) {
        splitMethodContainer.addEventListener('click', (event) => {
            const button = event.target.closest('.split-toggle-btn');
            if (button && button.dataset.method) {
                const method = button.dataset.method; // 'equal' or 'custom'
                setSplitMethod(method); // Call the existing function in expense.js
                console.log(`✅ "Add Expense" modal: Split method switched to ${method}`);
            }
        });
        console.log('✅ "Add Expense" modal: Split button event listener bound');
    } else {
        console.error('❌ Could not find split button container #split-method-selection in "Add Expense" modal');
    }

    // Bind "Equally Split" / "Custom Amount" buttons in "Expense Details" modal
    const detailSplitMethodContainer = document.getElementById('detail-split-method-selection');
    if (detailSplitMethodContainer) {
        detailSplitMethodContainer.addEventListener('click', (event) => {
            const button = event.target.closest('.split-toggle-btn');
            if (button && button.dataset.method) {
                const method = button.dataset.method; // 'equal' or 'custom'
                setDetailSplitMethod(method); // Call the existing function in expense.js
                console.log(`✅ "Expense Details" modal: Split method switched to ${method}`);
            }
        });
        console.log('✅ "Expense Details" modal: Split button event listener bound');
    } else {
        console.error('❌ Could not find split button container #detail-split-method-selection in "Expense Details" modal');
    }
    // 🔴 [END] New code
    
    console.log('Expense event listeners initialized');
}

// === Split Calculation Feature Summary ===

/*
Implemented split calculation features:

1. setSplitMethod(method, triggerUpdate = true)
   - Switch between equal/custom split methods
   - Automatically update button state
   - Trigger recalculation of split

2. updateSplitCalculation()
   - Core split calculation logic
   - Supports equal split (automatically distributes remainder)
   - Supports custom split
   - Handles floating point precision issues (converts to cents for calculation)

3. handleAmountChange()
   - Listens for changes in the total amount
   - Automatically recalculates the split

4. handleCustomAmountChange(input, memberId, splitsArray)
   - Handles changes in custom split amounts
   - Real-time validation of split match

5. renderSplitDetails()
   - Renders the split details list
   - Equal mode: only shows the amount
   - Custom mode: shows an editable input box

6. updateSplitSummary()
   - Updates the split summary information
   - Shows total amount, number of participants, average split
   - Real-time validation status prompt

7. validateSplitAmounts()
   - Validates that the sum of split amounts matches the total amount
   - Allows a 0.01 dollar margin of error
   - Returns detailed validation results

8. Remainder distribution logic
   - When splitting equally, the remaining amount (in cents) is distributed to the first N people
   - Ensures the total amount matches exactly

Split calculation features:
- Supports multi-person split (no limit on the number of people)
- Calculation accurate to the cent (handles floating point precision issues)
- Automatic remainder distribution algorithm
- Real-time validation and UI feedback
- Compatible with both equal and custom modes
*/