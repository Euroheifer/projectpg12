// /static/js/api/auth.js
// Prevent caching version: 2025.11.06
const JS_CACHE_VERSION = '2025.11.06.001';

// ----------------------------------------------------------------
// --- This is a complete, fixed file. Please copy and replace your old file. ---
// ----------------------------------------------------------------

// --- Import getAuthToken, as all real API calls need it ---
import { getAuthToken } from '../ui/utils.js';

/**
 * API Call: Register (from user.js)
 * API Route: @app.post("/users/signup", ...)
 */
export async function handleSignup(username, email, password) {
    const response = await fetch('/users/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
    }
    return await response.json();
}

/**
 * API Call: Login (from user.js)
 * API Route: @app.post("/token", ...)
 */
export async function handleLogin(email, password) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
    }

    const tokenData = await response.json();
    // Key: Save the Token in local storage!
    localStorage.setItem('access_token', tokenData.access_token);
    return tokenData;
}

/**
 * API Call: Logout (from home.js)
 * API Route: @app.post("/auth/logout", ...)
 */
export async function handleLogout(token) {
    if (token) {
        await fetch('/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }
}

/**
 * API Call: Get current user (from home.js)
 * API Route: @app.get("/me", ...)
 */
export async function getCurrentUser(token) {
    const response = await fetch('/me', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        throw new Error('Unable to verify user identity');
    }
    return await response.json();
}

/**
 * Clear local storage (from home.js)
 */
export function clearAuthData() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
}

// ----------------------------------------------------------------
// --- Group data related API calls (Fixed - MOCK removed) ---
// ----------------------------------------------------------------

/**
 * API Call: Get group data (Real version)
 * API Route: @app.get("/groups/{group_id}", ...)
 */
export async function getGroupData(groupId) {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found, please log in again');

    console.log('Requesting group data, URL:', `/groups/${groupId}`);
    
    const response = await fetch(`/api/groups/${groupId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    console.log('API response status:', response.status, response.statusText);

    // First check the response content type
    const contentType = response.headers.get('content-type');
    console.log('Response content type:', contentType);

    if (!response.ok) {
        let errorText;
        try {
            errorText = await response.text();
            console.error('API error response content:', errorText);
        } catch (e) {
            errorText = 'Unable to read error message';
        }
        
        if (response.status === 401) throw new Error('Authentication failed, please log in again');
        if (response.status === 403) throw new Error('You are not a member of this group');
        if (response.status === 404) throw new Error('Group not found');
        throw new Error(`Server error: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    // Validate response content type
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Server returned non-JSON response:', text.substring(0, 200));
        
        // Key: If the backend returns HTML due to routing order issues, throw a clear error
        if (text.trim().startsWith('<!DOCTYPE')) {
            throw new Error('Server returned an HTML page instead of JSON. Please check the route order in main.py.');
        }
        
        throw new Error('Server returned invalid JSON data');
    }

    try {
        const data = await response.json();
        console.log('Successfully parsed group data:', data);
        return data;
    } catch (error) {
        console.error('Failed to parse JSON:', error);
        throw new Error('Failed to parse group data');
    }
}


/**
 * API Call: Get group members (Real version)
 * API Route: @app.get("/groups/{group_id}/members", ...)
 */
export async function getGroupMembers(groupId) {
    console.log('Getting group member data, Group ID:', groupId);
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/groups/${groupId}/members`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to get group members, status code:', response.status, 'error message:', errorText);
        throw new Error('Failed to get group members');
    }
    
    return await response.json();
}

/**
 * API Call: Get group expenses (Real version)
 * API Route: @app.get("/groups/{group_id}/expenses", ...)
 */
export async function getGroupExpenses(groupId) {
    console.log('Getting group expense data, Group ID:', groupId);
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/groups/${groupId}/expenses`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to get group expenses, status code:', response.status, 'error message:', errorText);
        throw new Error('Failed to get group expenses');
    }
    
    return await response.json();
}

/**
 * API Call: Get group payments (Fixed version)
 * Fix: Implement real backend API call
 */
export async function getGroupPayments(groupId) {
    console.log('Getting group payment data, Group ID:', groupId);
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    try {
        // 🔴 v12.0 Fix: First get all expenses, then aggregate payment records
        const expenses = await getGroupExpenses(groupId);
        let allPayments = [];
        
        console.log(`Group ${groupId} has ${expenses.length} expenses, starting to aggregate payment records...`);
        
        for (const expense of expenses) {
            try {
                const response = await fetch(`/expenses/${expense.id}/payments`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const payments = await response.json();
                    allPayments = allPayments.concat(payments);
                    console.log(`Payment records for expense ${expense.id}: ${payments.length}`);
                }
            } catch (error) {
                console.warn(`Failed to get payment records for expense ${expense.id}:`, error);
            }
        }
        
        console.log(`Successfully got all payment records for group ${groupId}, total ${allPayments.length}`);
        return allPayments;
        
    } catch (error) {
        console.error('Failed to get group payment data:', error);
        return [];
    }
}

/**
 * API Call: Get group recurring expenses (Real version)
 * API Route: @app.get("/groups/{group_id}/recurring-expenses", ...)
 */
export async function getGroupRecurringExpenses(groupId) {
    console.log('Getting group recurring expense data, Group ID:', groupId);
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/groups/${groupId}/recurring-expenses`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to get group recurring expenses, status code:', response.status, 'error message:', errorText);
        throw new Error('Failed to get group recurring expenses');
    }
    
    return await response.json();
}

// ----------------------------------------------------------------
// --- Invitation related API calls ---
// ----------------------------------------------------------------

/**
 * API Call: Invite member to group
 * API Route: @app.post("/groups/{group_id}/invite", ...)
 */
export async function inviteMemberToGroup(groupId, inviteeEmail) {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/groups/${groupId}/invite`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invitee_email: inviteeEmail })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to invite member');
    }
    
    return await response.json();
}

/**
 * API Call: Get my pending invitations
 * API Route: @app.get("/invitations/me", ...)
 */
export async function getMyPendingInvitations() {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch('/invitations/me', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        throw new Error('Failed to get invitation list');
    }
    
    return await response.json();
}

/**
 * API Call: Respond to invitation
 * API Route: @app.post("/invitations/{invitation_id}/respond", ...)
 */
export async function respondToInvitation(invitationId, action) {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: action })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to respond to invitation');
    }
    
    return await response.json();
}

// ----------------------------------------------------------------
// --- Expense related API calls ---
// ----------------------------------------------------------------

/**
 * API Call: Create expense
 * API Route: @app.post("/groups/{group_id}/expenses", ...)
 */
export async function createExpense(groupId, expenseData) {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/groups/${groupId}/expenses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(expenseData)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create expense');
    }
    
    return await response.json();
}

/**
 * API Call: Update expense
 * API Route: @app.patch("/groups/{group_id}/expenses/{expense_id}", ...)
 */
export async function updateExpense(groupId, expenseId, expenseData) {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/groups/${groupId}/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(expenseData)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update expense');
    }
    
    return await response.json();
}

/**
 * API Call: Delete expense
 * API Route: @app.delete("/groups/{group_id}/expenses/{expense_id}", ...)
 */
export async function deleteExpense(groupId, expenseId) {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/groups/${groupId}/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        // Try to parse JSON error, if it fails, return a generic error
        try {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to delete expense');
        } catch (e) {
            throw new Error(`Failed to delete expense (status: ${response.status})`);
        }
    }
    
    // DELETE usually returns 204 No Content, no body
    return { success: true };
}

// ----------------------------------------------------------------
// --- Payment related API calls ---
// ----------------------------------------------------------------

/**
 * API Call: Create payment
 * API Route: @app.post("/expenses/{expense_id}/payments", ...)
 */
export async function createPayment(expenseId, paymentData) {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/expenses/${expenseId}/payments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create payment');
    }
    
    return await response.json();
}

/**
 * API Call: Get expense payments
 * API Route: @app.get("/expenses/{expense_id}/payments", ...)
 */
export async function getExpensePayments(expenseId) {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`/expenses/${expenseId}/payments`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        throw new Error('Failed to get payment list');
    }
    
    return await response.json();
}

// ----------------------------------------------------------------
// --- Expose functions to global ---
// ----------------------------------------------------------------

window.handleSignup = handleSignup;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.getCurrentUser = getCurrentUser;
window.clearAuthData = clearAuthData;
window.getGroupData = getGroupData;
window.getGroupMembers = getGroupMembers;
window.getGroupExpenses = getGroupExpenses;
window.getGroupPayments = getGroupPayments;
window.getGroupRecurringExpenses = getGroupRecurringExpenses;
window.inviteMemberToGroup = inviteMemberToGroup;
window.getMyPendingInvitations = getMyPendingInvitations;
window.respondToInvitation = respondToInvitation;
window.createExpense = createExpense;
window.updateExpense = updateExpense;
window.deleteExpense = deleteExpense;
window.createPayment = createPayment;
window.getExpensePayments = getExpensePayments;

console.log('auth.js loaded, all API functions exposed to global');
