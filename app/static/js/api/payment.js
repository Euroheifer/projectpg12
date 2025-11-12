// payment.js - Payment-related CRUD operations, form processing
// Prevent caching version: 2025.11.10.003 - Fix module exports
const JS_CACHE_VERSION = '2025.11.10.003';

import { 
    getTodayDate, 
    getAuthToken, 
    amountToCents, 
    centsToAmountString, 
    showCustomAlert,
    requireAdmin 
} from '../ui/utils.js';

// --- Global State ---
let currentEditingPayment = null;

/**
 * Initialize payment form
 * 🔴 Fix: This function will now populate all dropdown menus
 */
export function initializePaymentForm() {
    console.log('Initializing payment form');

    // Set default date
    const dateInput = document.getElementById('payment-date');
    if (dateInput) {
        dateInput.value = getTodayDate();
    }

    // Get group member list
    const members = window.groupMembers || [];
    
    // Initialize payer selector ("Who paid?")
    const payerSelect = document.getElementById('payment-payer');
    if (payerSelect) {
        payerSelect.innerHTML = '';
        
        if (members.length === 0) {
            payerSelect.innerHTML = '<option value="">No members found</option>';
        } else {
            payerSelect.innerHTML = '<option value="">Please select a payer</option>'; // 🔴 Add default prompt
            members.forEach(member => {
                const option = document.createElement('option');
                // 🔴 Fix: Use correct member ID and username
                const memberId = member.user_id;
                option.value = memberId;
                const memberName = member.user?.username || member.nickname || `User ${memberId}`;
                option.textContent = memberName;
                
                // Set the current user as the default payer
                if (memberId === window.CURRENT_USER_ID) {
                    option.selected = true;
                }
                payerSelect.appendChild(option);
            });
        }
    }

    // 🔴 Fix: Initialize payee selector ("Pay to whom?")
    const payeeSelect = document.getElementById('payment-to'); // 🔴 Fix: ID is 'payment-to'
    if (payeeSelect) {
        payeeSelect.innerHTML = '';
        
        if (members.length === 0) {
            payeeSelect.innerHTML = '<option value="">No members found</option>';
        } else {
            payeeSelect.innerHTML = '<option value="">Please select a payee</option>'; // 🔴 Add default prompt
            members.forEach(member => {
                const option = document.createElement('option');
                // 🔴 Fix: Use correct member ID and username
                const memberId = member.user_id;
                option.value = memberId;
                const memberName = member.user?.username || member.nickname || `User ${memberId}`;
                option.textContent = memberName;
                payeeSelect.appendChild(option);
            });
        }
    } else {
        console.error('❌ Could not find payee selector #payment-to'); // 🔴 Fix: Update error log
    }

    // 🔴 Fix: Populate "For which expense"
    const expenseSelect = document.getElementById('payment-for-expense');
    const expenses = window.expensesList || []; // Get expense list from global
    if (expenseSelect) {
        expenseSelect.innerHTML = '<option value="">Please select an expense</option>'; // Reset
        if (expenses.length === 0) {
            expenseSelect.innerHTML = '<option value="">No expenses yet</option>';
        } else {
            expenses.forEach(expense => {
                const option = document.createElement('option');
                option.value = expense.id;
                // 🔴 Fix: Use centsToAmountString 
                option.textContent = `[¥${centsToAmountString(expense.amount)}] ${expense.description}`;
                expenseSelect.appendChild(option);
            });
        }
        console.log(`✅ Expense dropdown initialized with ${expenses.length} expenses`);
    } else {
        console.error('❌ Could not find expense selector #payment-for-expense');
    }


    // Bind event listeners
    bindPaymentFormEvents();
}

/**
 * Bind payment form event listeners
 */
function bindPaymentFormEvents() {
    // File upload event
    const fileInput = document.getElementById('payment-receipt-file'); // 🔴 Fix: Use correct ID
    if (fileInput) {
        fileInput.addEventListener('change', () => updatePaymentFileNameDisplay(fileInput));
    }

    // Form submission event (already bound via onsubmit in groups.html)
}

/**
 * Form validation
 */
function validatePaymentForm(formData) {
    const errors = [];

    // 🔴 Fix: Use correct form field names
    const payerId = formData.get('payment-payer');
    const payeeId = formData.get('payment-to');

    // Validate payer
    if (!payerId) {
        errors.push('Please select a payer');
    }

    // Validate payee
    if (!payeeId) {
        errors.push('Please select a payee');
    }

    // Validate that payer and payee are not the same
    if (payerId === payeeId) {
        errors.push('Payer and payee cannot be the same person');
    }

    // Validate amount
    const amount = formData.get('payment-amount');
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        errors.push('Please enter a valid amount');
    }

    // Validate date
    if (!formData.get('payment-date')) {
        errors.push('Please select a date');
    }
    
    // Validate expense
    if (!formData.get('payment-for-expense')) {
        errors.push('Please select an associated expense');
    }

    return errors;
}

/**
 * Save payment - Fixed version
 */
// 🔴 Fix: Add export
export async function handleSavePayment(event) {
    event.preventDefault();
    console.log('Saving payment');

    const form = document.getElementById('payment-form');
    if (!form) {
        console.error('Could not find payment form');
        showCustomAlert('Error', 'Payment form does not exist');
        return;
    }

    try {
        // Get form data
        const formData = new FormData(form);
        
        // 🔴 Fix: When creating FormData, the 'name' attribute of the HTML input is key.
        // We need to convert from the 'name' attribute to the backend
        const paymentData = {
            description: formData.get('payment-description'),
            amount: amountToCents(formData.get('payment-amount')),
            to_user_id: parseInt(formData.get('payment-to'), 10),
            from_user_id: parseInt(formData.get('payment-payer'), 10),
            date: formData.get('payment-date'),
            // expense_id will be obtained from the URL, image_url will be added via FormData
        };
        
        // 🔴 Fix: Use new FormData for API submission
        const apiFormData = new FormData();
        apiFormData.append('description', paymentData.description);
        apiFormData.append('amount', paymentData.amount);
        apiFormData.append('to_user_id', paymentData.to_user_id);
        apiFormData.append('from_user_id', paymentData.from_user_id);
        // apiFormData.append('date', paymentData.date); // Payment date is set by the backend
        
        const receiptFile = formData.get('payment-receipt-file');
        if (receiptFile && receiptFile.size > 0) {
             apiFormData.append('image_file', receiptFile);
        }

        // Validation (use paymentData for validation)
        const errors = [];
        if (!paymentData.from_user_id) errors.push('Please select a payer');
        if (!paymentData.to_user_id) errors.push('Please select a payee');
        if (paymentData.from_user_id === paymentData.to_user_id) errors.push('Payer and payee cannot be the same person');
        if (paymentData.amount <= 0) errors.push('Please enter a valid amount');
        
        const expenseId = formData.get('payment-for-expense'); // 🔴
        if (!expenseId) errors.push('Please select an associated expense');
        
        if (errors.length > 0) {
            showCustomAlert('Form validation failed', errors.join('<br>'));
            return;
        }

        // Get authentication token
        const token = getAuthToken();
        if (!token) {
            showCustomAlert('Error', 'User not logged in, please log in again');
            return;
        }
        
        console.log('Saving payment record, Expense ID:', expenseId);

        // API call
        const response = await fetch(`/expenses/${expenseId}/payments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // 'Content-Type' 'multipart/form-data' is set automatically by the browser
            },
            body: apiFormData // 🔴 Send apiFormData
        });

        if (!response.ok) {
            const errorData = await response.json();
            let errorMessage = 'Failed to save payment';

            if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    errorMessage = errorData.detail.map(err => {
                        let field = err.loc && err.loc.length > 1 ? err.loc[err.loc.length - 1] : 'Unknown field';
                        return `${field}: ${err.msg}`;
                    }).join('<br>');
                } else {
                    errorMessage = JSON.stringify(errorData.detail);
                }
            }

            throw new Error(errorMessage);
        }

        // Handle success
        showCustomAlert('Success', 'Payment record saved successfully');
        
        // Close modal
        const modal = document.getElementById('add-payment-modal');
        if (modal) {
            modal.classList.add('hidden');
        }

        // Reset form
        form.reset();
        initializePaymentForm();

        // Refresh payment list
        await refreshPaymentsList();

    } catch (error) {
        console.error('Error saving payment:', error);
        showCustomAlert('Error', error.message || 'An unknown error occurred while saving the payment');
    }
}

/**
 * Update payment - Fixed version
 * 🔴 [START] REPLACED FUNCTION
 * This function now sends application/json and does NOT support file upload on update,
 * to match the backend's expectation.
 */
export async function handleUpdatePayment(event) {
    event.preventDefault();
    console.log('Updating payment (using JSON fix)');

    const form = document.getElementById('payment-detail-form');
    if (!currentEditingPayment) { 
        console.error('No payment is being edited');
        return;
    }

    try {
        const formData = new FormData(form);
        
        // 1. 🔴 Create a plain JavaScript object, NOT FormData
        const paymentData = {
            description: formData.get('payment-detail-description'),
            amount: amountToCents(formData.get('payment-detail-amount')),
            to_user_id: parseInt(formData.get('payment-detail-to'), 10),
            from_user_id: parseInt(formData.get('payment-detail-payer'), 10),
            date: formData.get('payment-detail-date'),
            // 🚨 NOTE: File upload on update is not supported by this fix,
            // to match the backend's expectation of application/json.
            // The 'image_file' field is intentionally omitted.
        };

        // 2. 🔴 Validation
        const errors = [];
        if (!paymentData.from_user_id) errors.push('Please select a payer');
        if (!paymentData.to_user_id) errors.push('Please select a payee');
        if (paymentData.from_user_id === paymentData.to_user_id) errors.push('Payer and payee cannot be the same person');
        if (paymentData.amount <= 0) errors.push('Please enter a valid amount');
        
        const expenseId = formData.get('payment-detail-for-expense');
        if (!expenseId) errors.push('Please select an associated expense');
        
        if (errors.length > 0) {
            showCustomAlert('Form validation failed', errors.join('<br>'));
            return;
        }

        const token = getAuthToken();
        if (!token) {
            showCustomAlert('Error', 'User not logged in, please log in again');
            return;
        }

        const paymentId = currentEditingPayment.id;
        console.log('Updating payment record (JSON):', { expenseId, paymentId, data: paymentData });

        // 3. 🔴 API call with JSON
        const response = await fetch(`/payments/${paymentId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' // <--- SET CONTENT-TYPE
            },
            body: JSON.stringify(paymentData) // <--- SEND JSON STRING
        });

        if (!response.ok) {
            const errorData = await response.json();
            let errorMessage = 'Failed to update payment';

            if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    errorMessage = errorData.detail.map(err => {
                        let field = err.loc && err.loc.length > 1 ? err.loc[err.loc.length - 1] : 'Unknown field';
                        return `${field}: ${err.msg}`;
                    }).join('<br>');
                } else {
                    errorMessage = JSON.stringify(errorData.detail);
                }
            }

            throw new Error(errorMessage);
        }

        // Handle success
        showCustomAlert('Success', 'Payment record updated successfully');
        
        // Close modal
const modal = document.getElementById('payment-detail-modal');
        if (modal) {
            modal.classList.add('hidden');
        }

        // Refresh payment list
        await refreshPaymentsList();

    } catch (error) {
        console.error('Error updating payment:', error);
        showCustomAlert('Error', error.message || 'An unknown error occurred while updating the payment');
    }
}
/** * 🔴 [END] REPLACED FUNCTION
 */


/**
 * Delete payment - Fixed version
 */
// 🔴 Fix: Add export
export async function handleDeletePayment(paymentId) {
    if (!paymentId) {
        // 🔴 Try to get from currentEditingPayment
        if (currentEditingPayment) {
            paymentId = currentEditingPayment.id;
        } else {
            showCustomAlert('Error', 'Payment ID does not exist');
            return;
        }
    }

    // Confirm deletion
    const confirmed = confirm('Are you sure you want to delete this payment record? This action cannot be undone.');
    if (!confirmed) return;

    try {
        const token = getAuthToken();
        if (!token) {
            showCustomAlert('Error', 'User not logged in, please log in again');
            return;
        }

        console.log('Deleting payment record:', { paymentId });

        // API call
        const response = await fetch(`/payments/${paymentId}`, { // 🔴 Fix: Use /payments/{payment_id}
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
             // 🔴 Fix: Backend returns 204 on successful DELETE
            if (response.status === 204) {
                 // This is actually a success
            } else {
                const errorData = await response.json();
                let errorMessage = 'Failed to delete payment';

                if (errorData.detail) {
                    if (typeof errorData.detail === 'string') {
                        errorMessage = errorData.detail;
                    } else {
                        errorMessage = JSON.stringify(errorData.detail);
                    }
                }
                throw new Error(errorMessage);
            }
        }

        // Handle success
        showCustomAlert('Success', 'Payment record deleted successfully');

        // Close related modals
        const detailModal = document.getElementById('payment-detail-modal');
        if (detailModal) {
            detailModal.classList.add('hidden');
        }

        // Refresh payment list
        await refreshPaymentsList();

    } catch (error) {
        console.error('Error deleting payment:', error);
        showCustomAlert('Error', error.message || 'An unknown error occurred while deleting the payment');
    }
}

/**
 * Confirm payment deletion (for confirmation modal)
 */
// 🔴 Fix: Add export
export async function confirmDeletePayment() { // 🔴 Fix: No paymentId needed
    console.log('Confirming payment deletion');
    
    if (!currentEditingPayment) { // 🔴 Fix: Get from global state
        showCustomAlert('Error', 'Payment ID does not exist');
        return;
    }

    // Call delete function
    await handleDeletePayment(currentEditingPayment.id);

    // Close confirmation modal
    const confirmModal = document.getElementById('delete-payment-confirm-modal');
    if (confirmModal) {
        confirmModal.classList.add('hidden');
    }
}

/**
 * Populate payment detail form - Fixed version
 */
// 🔴 Fix: Add export
export function populatePaymentDetailForm(payment) {
    console.log('Populating payment detail form', payment);

    if (!payment) return;

    const form = document.getElementById('payment-detail-form');
    if (!form) {
        console.error('Could not find payment detail form');
        return;
    }

    // Populate basic information
    const amountField = document.getElementById('payment-detail-amount');
    if (amountField) {
        amountField.value = centsToAmountString(payment.amount);
    }

    const dateField = document.getElementById('payment-detail-date');
    if (dateField) {
        // 🔴 Fix: Backend payment_date is a date, not datetime
        dateField.value = payment.payment_date ? payment.payment_date.split('T')[0] : getTodayDate();
    }

    const descriptionField = document.getElementById('payment-detail-description');
    if (descriptionField) {
        descriptionField.value = payment.description || '';
    }

    // 🔴 Fix: Populate member dropdowns
    const members = window.groupMembers || [];
    const payerSelect = document.getElementById('payment-detail-payer');
    const payeeSelect = document.getElementById('payment-detail-to'); // 🔴 Fix: ID

    if (payerSelect) {
        payerSelect.innerHTML = '<option value="">Please select a payer</option>';
        members.forEach(member => {
            const option = document.createElement('option');
            const memberId = member.user_id;
            option.value = memberId;
            option.textContent = member.user?.username || member.nickname || `User ${memberId}`;
            if (memberId === payment.from_user_id) option.selected = true; // 🔴 Fix: from_user_id
            payerSelect.appendChild(option);
        });
    }

    if (payeeSelect) {
        payeeSelect.innerHTML = '<option value="">Please select a payee</option>';
        members.forEach(member => {
            const option = document.createElement('option');
            const memberId = member.user_id;
            option.value = memberId;
            option.textContent = member.user?.username || member.nickname || `User ${memberId}`;
            if (memberId === payment.to_user_id) option.selected = true; // 🔴 Fix: to_user_id
            payeeSelect.appendChild(option);
        });
    }
    
    // 🔴 Fix: Populate expense dropdown
    const expenseSelect = document.getElementById('payment-detail-for-expense');
    const expenses = window.expensesList || [];
    if (expenseSelect) {
        expenseSelect.innerHTML = '<option value="">Please select an expense</option>';
        expenses.forEach(expense => {
            const option = document.createElement('option');
            option.value = expense.id;
            // 🔴 Fix: Use centsToAmountString 
            option.textContent = `[$${centsToAmountString(expense.amount)}] ${expense.description}`;
            expenseSelect.appendChild(option);
        });
    }


    // Set form editable state (based on permissions)
    const isAdmin = window.IS_CURRENT_USER_ADMIN;
    // 🔴 Fix: The creator of the payment is creator_id
    const isOwner = payment.creator_id === window.CURRENT_USER_ID; 

    // Only admins or the payment creator can edit
    const canEdit = isAdmin || isOwner;

    Array.from(form.elements).forEach(element => {
        if (element.tagName === 'BUTTON') return; // Skip buttons
        element.disabled = !canEdit;
    });

    // 🔴 Fix: Hide/show buttons
    const deleteButton = form.querySelector('button[onclick="handleDeletePayment()"]');
    const saveButton = form.querySelector('button[type="submit"]');

    if (deleteButton) deleteButton.style.display = canEdit ? 'inline-block' : 'none';
    if (saveButton) saveButton.style.display = canEdit ? 'inline-block' : 'none';
}

/**
 * Refresh payment list - Fixed version
 */
// 🔴 Fix: Add export
export async function refreshPaymentsList() {
    console.log('Refreshing payment list');

    try {
        // 🔴 v12.0 Fix: Handle gracefully when expense ID does not exist
        // 🔴 Fix: Payments are retrieved by group, not by expense
        const groupId = window.currentGroupId;
        if (!groupId) {
            console.log('Group ID does not exist, showing empty payment list');
            updatePaymentsDisplay([]);
            return;
        }

        const token = getAuthToken();
        if (!token) {
            console.warn('Authentication token not found');
            updatePaymentsDisplay([]);
            return;
        }

        console.log('Getting payment list, Group ID:', groupId);

        // 🔴 Fix: Payment API should get by group (assumption)
        // Oh, wait, auth.js (line 212) does aggregate by group.
        // `getGroupPayments` (in auth.js) will get all expenses, then get payments for each expense
        const payments = await window.getGroupPayments(groupId);
        window.paymentsList = payments; // Update global payment list

        // Render payment list UI
        renderPaymentsList(payments);

    } catch (error) {
        console.warn('Failed to refresh payment list, showing empty list:', error);
        updatePaymentsDisplay([]);
    }
}

// 🔴 v12.0 New: Unified helper function to update payment display
function updatePaymentsDisplay(payments) {
    const container = document.getElementById('payments-list');
    if (container) {
        if (payments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>No payment records yet</p>
                    <small>Click the Add Payment button to create a new payment</small>
                </div>
            `;
        } else {
            renderPaymentsList(payments);
        }
    }
}

/**
 * Render payment list UI - Fixed version
 */
function renderPaymentsList(payments) {
    const container = document.getElementById('payments-list');
    if (!container) {
        console.error('Payment list container not found');
        return;
    }

    container.innerHTML = '';

    if (!payments || payments.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>No payment records yet</p>
            </div>
        `;
        return;
    }

    payments.forEach(payment => {
        const paymentCard = createPaymentCard(payment);
        container.appendChild(paymentCard);
    });
}

/**
 * Create payment record card - Fixed version
 */
function createPaymentCard(payment) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow p-4 border border-gray-200';

    const amountDisplay = centsToAmountString(payment.amount);
    
    // 🔴 Fix: Use getMemberNameById
    const payerName = getMemberNameById(payment.from_user_id);
    const payeeName = getMemberNameById(payment.to_user_id);

    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                    <h3 class="font-semibold text-lg text-gray-900">
                        $${amountDisplay}
                    </h3>
                    ${payment.image_url ? '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Attachment</span>' : ''}
                </div>
                <p class="text-sm text-gray-600 mb-1">
                    ${payerName} → ${payeeName}
                </p>
                <p class="text-sm text-gray-500">
                    ${payment.payment_date ? payment.payment_date.split('T')[0] : ''}
                </p>
                ${payment.description ? `<p class="text-sm text-gray-700 mt-2">${payment.description}</p>` : ''}
            </div>
            <div class="flex gap-2">
                <button 
                    class="text-blue-600 hover:text-blue-800 text-sm"
                    onclick="openPaymentDetail(${payment.id})"
                >
                    View
                </button>
                ${(window.IS_CURRENT_USER_ADMIN || payment.creator_id === window.CURRENT_USER_ID) ? `
                    <button 
                        class="text-red-600 hover:text-red-800 text-sm"
                        onclick="handleDeletePayment(${payment.id})"
                    >
                        Delete
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    return card;
}

/**
 * Get member name by ID - Fixed version
 */
function getMemberNameById(userId) {
    const members = window.groupMembers || [];
    const member = members.find(m => {
        // Try matching multiple ID fields
        return m.user_id === userId || 
               m.id === userId || 
               (m.user && m.user.id === userId);
    });
    
    if (member) {
        // 🔴 Fix: Use correct username retrieval logic
        return member.user?.username || 
               member.nickname || 
               `User ${userId}`;
    }
    
    return `User ${userId}`;
}

/**
 * Open payment details - Fixed version
 */
// 🔴 Fix: Add export
export function openPaymentDetail(paymentId) {
    console.log('Opening payment details', paymentId);

    // Find payment record
    const payment = window.paymentsList?.find(p => p.id === paymentId);
    
    if (!payment) {
        showCustomAlert('Error', 'Payment record not found');
        return;
    }

    // Set current editing payment
    currentEditingPayment = payment;

    // Populate detail form
    populatePaymentDetailForm(payment);

    // Initialize payment detail form
    initializePaymentDetailForm(payment);

    // Open detail modal
    const modal = document.getElementById('payment-detail-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * Update payment file name display
 */
// 🔴 Fix: Add export
export function updatePaymentFileNameDisplay(input) {
    console.log('Updating payment file name display', input.files[0]?.name);

    const fileNameSpan = document.getElementById('payment-file-name-display'); // 🔴 Fix ID
    if (fileNameSpan) {
        if (input.files && input.files[0]) {
            fileNameSpan.textContent = `Selected: ${input.files[0].name}`;
            fileNameSpan.className = 'text-sm text-green-600';
        } else {
            fileNameSpan.textContent = 'Click to upload payment proof image (Max 1MB)';
            fileNameSpan.className = 'text-gray-700';
        }
    }
}

/**
 * Update payment detail file name display
 */
// 🔴 Fix: Add export
export function updatePaymentDetailFileNameDisplay(input) {
    console.log('Updating payment detail file name display', input.files[0]?.name);

    const fileNameSpan = document.getElementById('payment-detail-file-name-display');
    if (fileNameSpan) {
        if (input.files && input.files[0]) {
            fileNameSpan.textContent = `Selected new file: ${input.files[0].name}`;
            fileNameSpan.className = 'text-sm text-green-600';
        } else {
            fileNameSpan.textContent = 'Click to upload payment proof image (Max 1MB)';
            fileNameSpan.className = 'text-gray-700';
        }
    }
}

/**
 * Initialize payment detail form
 */
// 🔴 Fix: Add export
export function initializePaymentDetailForm(payment) {
    console.log('Initializing payment detail form:', payment);

    // Bind event listeners
    bindPaymentDetailFormEvents();
}

/**
 * Bind payment detail form events
 */
function bindPaymentDetailFormEvents() {
    // Detail form file upload event
    const detailFileInput = document.getElementById('payment-detail-receipt-file'); // 🔴 Fix ID
    if (detailFileInput) {
        detailFileInput.addEventListener('change', () => updatePaymentDetailFileNameDisplay(detailFileInput));
    }

    // Detail form submission event (already bound via onsubmit in groups.html)
}

/**
 * Handle adding a new payment
 */
// 🔴 Fix: Add export
export function handleAddNewPayment() {
    console.log('add new payment');
    
    // Reset current editing payment
    currentEditingPayment = null;

    // Initialize form
    initializePaymentForm();

    // Clear file selection
    const fileInput = document.getElementById('payment-receipt-file'); // 🔴 Fix ID
    if (fileInput) {
        fileInput.value = '';
        updatePaymentFileNameDisplay(fileInput);
    }

    // Open add payment modal
    const modal = document.getElementById('add-payment-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * Handle payment cancellation
 */
// 🔴 Fix: Add export
export function handlePaymentCancel() {
    console.log('cancel payment form');

    // Close add payment modal
    const modal = document.getElementById('add-payment-modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    // Reset form
    const form = document.getElementById('payment-form');
    if (form) {
        form.reset();
    }
}

/**
 * Handle payment detail cancellation
 */
// 🔴 Fix: Add export
export function handlePaymentDetailCancel() {
    console.log('cancel payment detail');

    // Close detail modal
    const modal = document.getElementById('payment-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    // Clear current editing payment
    currentEditingPayment = null;
}

/**
 * Close delete payment confirmation modal
 */
// 🔴 Fix: Add export
export function closeDeletePaymentConfirm() {
    const modal = document.getElementById('delete-payment-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Expose all payment-related functions to the global window object
window.handleSavePayment = handleSavePayment;
window.handleUpdatePayment = handleUpdatePayment;
window.handleDeletePayment = handleDeletePayment;
window.confirmDeletePayment = confirmDeletePayment;
window.handleAddNewPayment = handleAddNewPayment;
window.handlePaymentCancel = handlePaymentCancel;
window.handlePaymentDetailCancel = handlePaymentDetailCancel;
window.openPaymentDetail = openPaymentDetail;
window.updatePaymentFileNameDisplay = updatePaymentFileNameDisplay;
window.updatePaymentDetailFileNameDisplay = updatePaymentDetailFileNameDisplay;
window.populatePaymentDetailForm = populatePaymentDetailForm;
window.initializePaymentForm = initializePaymentForm;
window.initializePaymentDetailForm = initializePaymentDetailForm;
window.refreshPaymentsList = refreshPaymentsList;
window.closeDeletePaymentConfirm = closeDeletePaymentConfirm;

console.log('Payment module loaded, all functions exposed to global');

// 🔴 v6.1 Fix: Immediately bind event listeners (instead of inline event handlers)
initializePaymentEventListeners();

/**
 * 🔴 v6.1 Fix: Initialize payment event listeners
 * Replaces inline event handlers in HTML to avoid timing issues
 */
function initializePaymentEventListeners() {
    console.log('Initializing payment event listeners...');
    
    // Bind main payment form events
    bindPaymentFormEvents();
    
    // Bind payment detail form events
    bindPaymentDetailFormEvents();
    
    console.log('Payment event listeners initialized');
}

console.log('Payment module loaded, all functions exposed to global');