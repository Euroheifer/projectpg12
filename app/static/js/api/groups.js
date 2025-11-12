// file: app/static/js/api/groups.js
// Prevent caching version: 2025.11.06
const JS_CACHE_VERSION = '2025.11.06.001';

import { showCustomAlert } from '../ui/utils.js';
import { getAuthToken } from '../ui/utils.js';


// Open create group modal (unchanged)
export function handleCreateGroup() {
    console.log('handleCreateGroup called');
    const modal = document.getElementById('create-group-modal');
    const groupNameInput = document.getElementById('group-name');
    const groupDescriptionInput = document.getElementById('group-description');

    if (modal && groupNameInput) {
        groupNameInput.value = '';
        if (groupDescriptionInput) {
            groupDescriptionInput.value = '';
        }
        modal.classList.remove('hidden');
        groupNameInput.focus();
    } else {
        console.error('Could not find necessary DOM elements');
    }
}

// Close create group modal (unchanged)
export function closeCreateGroupModal() {
    console.log('closeCreateGroupModal called');
    const modal = document.getElementById('create-group-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Create new group (force page refresh on success to have the backend re-render)
export async function createNewGroup() {
    console.log('createNewGroup called');
    const groupName = document.getElementById('group-name').value;
    const groupDescription = document.getElementById('group-description').value;

    if (!groupName.trim()) {
        showCustomAlert('Please enter a group name');
        return;
    }

    try {
        console.log('Starting to create group...');
        const response = await fetch('/groups/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                name: groupName,
                description: groupDescription
            })
        });

        if (response.ok) {
            console.log('Group created successfully');
            closeCreateGroupModal();
            showCustomAlert('Group created successfully');

            // Key: Force page refresh to trigger backend to re-render the entire page
            window.location.reload();

        } else {
            const errorData = await response.json();
            console.error('Failed to create group:', errorData);
            throw new Error(errorData.detail || 'Failed to create group');
        }
    } catch (error) {
        console.error('Error creating group:', error);
        showCustomAlert(error.message || 'Failed to create group, please try again');
    }
}

// ==============
// The following are core API wrappers, not involving UI rendering
// ==============

export async function createGroup(groupName, description = "") {
    const token = getAuthToken();
    const response = await fetch('/groups/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            "name": groupName,
            "description": description
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create group');
    }
    return await response.json();
}

export async function getUserGroups() {
    const token = getAuthToken();
    const response = await fetch('/groups/', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        throw new Error('Failed to get group list');
    }
    return await response.json();
}

// ==============
// Add missing group detail API functions
// ==============
export async function getGroupDetails(groupId) {
    try {
        const token = getAuthToken();
        const response = await fetch(`/api/groups/${groupId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to get group details:', error);
        throw error;
    }
}

export async function getGroupMembers(groupId) {
    const token = getAuthToken();
    const response = await fetch(`/groups/${groupId}/members`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get group members');
    }
    return await response.json();
}

export async function getGroupExpenses(groupId) {
    const token = getAuthToken();
    const response = await fetch(`/groups/${groupId}/expenses`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get group expenses');
    }
    return await response.json();
}

/**
 * Note: This function is deprecated
 * The payment API is based on expenses, not groups
 * Please use getExpensePayments(expenseId) instead
 * 
 * API Route: /groups/{group_id}/payments does not exist
 * Correct Route: /expenses/{expense_id}/payments
 */
export async function getGroupPayments(groupId) {
    console.warn('getGroupPayments is deprecated - please use getExpensePayments(expenseId)');
    const token = getAuthToken();
    
    // Return an empty array to avoid crashing the frontend
    return [];
}

export async function getGroupRecurringExpenses(groupId) {
    const token = getAuthToken();
    const response = await fetch(`/groups/${groupId}/recurring-expenses`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get group recurring expenses');
    }
    return await response.json();
}


// ==============
// Group settings management functions
// ==============

// Reset group settings
export function resetGroupSettings() {
    console.log('Resetting group settings');
    
    // Reset form fields
    const groupNameInput = document.getElementById('group-name-settings');
    const groupDescriptionInput = document.getElementById('group-description-settings');
    
    if (groupNameInput) {
        // Reset from current group data
        const currentName = groupNameInput.getAttribute('data-original-name') || '';
        groupNameInput.value = currentName;
    }
    
    if (groupDescriptionInput) {
        const currentDescription = groupDescriptionInput.getAttribute('data-original-description') || '';
        groupDescriptionInput.value = currentDescription;
    }
    
    showCustomAlert('Group settings have been reset');
}

// Update group settings
export async function updateGroupSettings(groupId, settings = null) {
    try {
        console.log(`Updating group settings, Group ID: ${groupId}`);
        
        // If settings are not passed, get them from the form
        if (!settings) {
            const groupNameInput = document.getElementById('group-name-settings');
            const groupDescriptionInput = document.getElementById('group-description-settings');
            
            if (!groupNameInput) {
                throw new Error('Could not find group name input');
            }
            
            settings = {
                name: groupNameInput.value.trim(),
                description: groupDescriptionInput ? groupDescriptionInput.value.trim() : ''
            };
        }
        
        if (!settings.name) {
            showCustomAlert('Group name cannot be empty');
            return;
        }
        
        const response = await fetch(`/groups/${groupId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            const updatedGroup = await response.json();
            console.log('Group settings updated successfully:', updatedGroup);
            showCustomAlert('Group settings updated successfully');
            
            // Update the original values in the form
            const groupNameInput = document.getElementById('group-name-settings');
            const groupDescriptionInput = document.getElementById('group-description-settings');
            
            if (groupNameInput) {
                groupNameInput.setAttribute('data-original-name', updatedGroup.name);
            }
            if (groupDescriptionInput) {
                groupDescriptionInput.setAttribute('data-original-description', updatedGroup.description || '');
            }
            
            return updatedGroup;
        } else {
            const errorData = await response.json();
            console.error('Failed to update group settings:', errorData);
            throw new Error(errorData.detail || 'Failed to update group settings');
        }
    } catch (error) {
        console.error('Error updating group settings:', error);
        showCustomAlert(error.message || 'Failed to update group settings, please try again');
        throw error;
    }
}

// Delete group
export async function deleteGroup(groupId, groupName) {
    try {
        console.log(`Deleting group: ${groupName} (ID: ${groupId})`);
        
        // Confirm deletion
        const confirmMessage = `Are you sure you want to delete the group "${groupName}"?\n\nThis action cannot be undone and will delete all data for the group.`;
        if (!confirm(confirmMessage)) {
            return;
        }
        
        const response = await fetch(`/groups/${groupId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        if (response.ok) {
            console.log('Group deleted successfully');
            showCustomAlert('Group deleted successfully');
            
            // Redirect to the group list page
            setTimeout(() => {
                window.location.href = '/groups';
            }, 1000);
            
            return true;
        } else {
            const errorData = await response.json();
            console.error('Failed to delete group:', errorData);
            throw new Error(errorData.detail || 'Failed to delete group');
        }
    } catch (error) {
        console.error('Error deleting group:', error);
        showCustomAlert(error.message || 'Failed to delete group, please try again');
        throw error;
    }
}

// ==============
// Audit log management functions
// ==============

// Get audit log data
export async function loadAuditLog(groupId, page = 1, limit = 50) {
    try {
        console.log(`Loading audit log, Group ID: ${groupId}`);
        
        const response = await fetch(`/groups/${groupId}/audit-trail?page=${page}&limit=${limit}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to get audit log');
        }
        
        const auditLogs = await response.json();
        console.log('Audit log data retrieved successfully:', auditLogs);
        
        // Render audit log
        renderAuditLog(auditLogs);
        
        return auditLogs;
    } catch (error) {
        console.error('Error loading audit log:', error);
        showCustomAlert(error.message || 'Failed to load audit log');
        throw error;
    }
}

// Render audit log display
export function renderAuditLog(auditLogs) {
    try {
        console.log('Rendering audit log:', auditLogs);
        
        const auditLogContainer = document.getElementById('audit-log-container');
        if (!auditLogContainer) {
            console.warn('Could not find audit log container element');
            return;
        }
        
        if (!auditLogs || auditLogs.length === 0) {
            auditLogContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-history text-4xl mb-4"></i>
                    <p>No audit log records yet</p>
                </div>
            `;
            return;
        }
        
        // Render audit log list
        const auditLogHtml = auditLogs.map(log => {
            const timestamp = new Date(log.timestamp).toLocaleString('en-US');
            const action = getAuditActionText(log.action);
            const actionIcon = getAuditActionIcon(log.action);
            
            return `
                <div class="audit-log-item border-l-4 border-blue-400 bg-blue-50 p-4 mb-3">
                    <div class="flex items-start space-x-3">
                        <div class="audit-icon text-blue-600 text-lg">
                            ${actionIcon}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between">
                                <h4 class="text-sm font-medium text-gray-900">
                                    ${action}
                                </h4>
                                <time class="text-xs text-gray-500" datetime="${log.timestamp}">
                                    ${timestamp}
                                </time>
                            </div>
                            <div class="mt-1 text-sm text-gray-600">
                                <p>Operating User ID: ${log.user_id}</p>
                                <p>Record ID: ${log.id}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        auditLogContainer.innerHTML = `
            <div class="audit-logs-header mb-4">
                <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                    <i class="fas fa-shield-alt mr-2 text-blue-600"></i>
                    Audit Log
                    <span class="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        ${auditLogs.length} records
                    </span>
                </h3>
            </div>
            <div class="audit-logs-list">
                ${auditLogHtml}
            </div>
        `;
        
        // Add scrolling and animation effects
        auditLogContainer.classList.add('audit-log-container');
        auditLogContainer.scrollTop = 0;
        
    } catch (error) {
        console.error('Error rendering audit log:', error);
        showCustomAlert('Failed to render audit log');
    }
}

// Get audit action text
function getAuditActionText(action) {
    const actionMap = {
        'create': 'Create Group',
        'update': 'Update Group',
        'delete': 'Delete Group',
        'add_member': 'Add Member',
        'remove_member': 'Remove Member',
        'add_expense': 'Add Expense',
        'update_expense': 'Update Expense',
        'delete_expense': 'Delete Expense',
        'add_payment': 'Add Payment',
        'delete_payment': 'Delete Payment',
        'invite_user': 'Invite User',
        'accept_invitation': 'Accept Invitation',
        'decline_invitation': 'Decline Invitation'
    };
    
    return actionMap[action] || `Unknown action: ${action}`;
}

// Get audit action icon
function getAuditActionIcon(action) {
    const iconMap = {
        'create': '<i class="fas fa-plus-circle"></i>',
        'update': '<i class="fas fa-edit"></i>',
        'delete': '<i class="fas fa-trash-alt"></i>',
        'add_member': '<i class="fas fa-user-plus"></i>',
        'remove_member': '<i class="fas fa-user-minus"></i>',
        'add_expense': '<i class="fas fa-receipt"></i>',
        'update_expense': '<i class="fas fa-receipt"></i>',
        'delete_expense': '<i class="fas fa-receipt"></i>',
        'add_payment': '<i class="fas fa-credit-card"></i>',
        'delete_payment': '<i class="fas fa-credit-card"></i>',
        'invite_user': '<i class="fas fa-envelope"></i>',
        'accept_invitation': '<i class="fas fa-check"></i>',
        'decline_invitation': '<i class="fas fa-times"></i>'
    };
    
    return iconMap[action] || '<i class="fas fa-info-circle"></i>';
}

// The full implementation of loadAuditLogs is at the end of the file

export function renderAuditLogList() {
    console.log('Rendering audit log list');
    // Leave empty to be compatible with existing code, actual handling is in loadAuditLog
}

// Get current group ID
export function getCurrentGroupId() {
    // Extract group ID from the URL
    const urlParts = window.location.pathname.split('/');
    if (urlParts.length >= 3 && urlParts[1] === 'groups') {
        const groupId = parseInt(urlParts[2]);
        return isNaN(groupId) ? null : groupId;
    }
    
    // Get from page element
    const groupIdElement = document.getElementById('current-group-id');
    if (groupIdElement) {
        return parseInt(groupIdElement.value);
    }
    
    return null;
}

export function redirectToGroupDetail(groupId, groupName) {
    console.log(`Redirecting to group detail page: ${groupName} (ID: ${groupId})`);

    // Use the correct URL format to navigate to the group page
    window.location.href = `/groups/${groupId}`;
}

// Try to expose functions to global
try {
    window.handleCreateGroup = handleCreateGroup;
    window.closeCreateGroupModal = closeCreateGroupModal;
    window.createNewGroup = createNewGroup;
    window.redirectToGroupDetail = redirectToGroupDetail;

    window.getGroupDetails = getGroupDetails;
    window.getGroupMembers = getGroupMembers;
    window.getGroupExpenses = getGroupExpenses;
    window.getGroupPayments = getGroupPayments;
    window.getGroupRecurringExpenses = getGroupRecurringExpenses;
    
    // New group management functions
    window.updateGroupSettings = updateGroupSettings;
    window.deleteGroup = deleteGroup;
    window.resetGroupSettings = resetGroupSettings;
    window.saveGroupSettings = updateGroupSettings;
    
    // Audit log functions
    window.loadAuditLog = loadAuditLog;
    window.renderAuditLog = renderAuditLog;
    window.renderAuditLogList = renderAuditLogList;
    window.getCurrentGroupId = getCurrentGroupId;
    // loadAuditLogs will be exposed at the end of the file

    console.log('groups.js: Global exposure complete');
} catch (error) {
    console.warn('groups.js: Global exposure failed, possibly in a module environment:', error);
}

// Add CSS styles (if needed)
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        .audit-log-container {
            max-height: 600px;
            overflow-y: auto;
            scroll-behavior: smooth;
        }
        
        .audit-log-item {
            transition: all 0.2s ease;
        }
        
        .audit-log-item:hover {
            background-color: rgba(59, 130, 246, 0.05);
            border-left-color: #2563eb;
        }
        
        .audit-icon {
            width: 24px;
            text-align: center;
        }
        
        .audit-logs-header {
            position: sticky;
            top: 0;
            background-color: white;
            padding-bottom: 1rem;
            z-index: 10;
            border-bottom: 1px solid #e5e7eb;
        }
    `;
    document.head.appendChild(style);
}

// ==================== Group Management Functions ====================

/**
 * Save group settings
 */
export async function saveGroupSettings() {
    const groupNameInput = document.getElementById('group-name-input');
    const groupDescriptionInput = document.getElementById('group-description-input');
    const messageElement = document.getElementById('save-group-settings-message');
    
    if (!groupNameInput || !groupDescriptionInput) {
        showCustomAlert('Error', 'Could not find group settings form elements');
        return;
    }
    
    const groupName = groupNameInput.value.trim();
    const groupDescription = groupDescriptionInput.value.trim();
    
    if (!groupName) {
        if (messageElement) {
            messageElement.textContent = 'Group name cannot be empty';
            messageElement.className = 'mt-2 p-2 text-sm rounded bg-red-100 text-red-700';
            messageElement.classList.remove('hidden');
        }
        return;
    }
    
    try {
        const token = getAuthToken();
        if (!token) {
            showCustomAlert('Error', 'User not logged in, please log in again');
            return;
        }
        
        const groupId = window.currentGroupId;
        if (!groupId) {
            showCustomAlert('Error', 'Could not determine current group ID');
            return;
        }
        
        // Show loading status
        if (messageElement) {
            messageElement.textContent = 'Saving...';
            messageElement.className = 'mt-2 p-2 text-sm rounded bg-blue-100 text-blue-700';
            messageElement.classList.remove('hidden');
        }
        
        const response = await fetch(`/groups/${groupId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: groupName,
                description: groupDescription
            })
        });
        
        if (response.ok) {
            const updatedGroup = await response.json();
            console.log('Group settings updated:', updatedGroup);
            
            // Update global group data
            window.currentGroup = updatedGroup;
            
            // Update page display
            if (window.currentGroup) {
                const nameDisplay = document.getElementById('group-name-display');
                const descriptionDisplay = document.getElementById('group-description-display');
                
                if (nameDisplay) nameDisplay.textContent = updatedGroup.name;
                if (descriptionDisplay) descriptionDisplay.textContent = updatedGroup.description || 'No description';
            }
            
            // Show success message
            if (messageElement) {
                messageElement.textContent = 'Group settings saved successfully!';
                messageElement.className = 'mt-2 p-2 text-sm rounded bg-green-100 text-green-700';
            }
            
            showCustomAlert('Success', 'Group settings saved successfully!', 'success');
            
            // Hide message after 3 seconds
            setTimeout(() => {
                if (messageElement) {
                    messageElement.classList.add('hidden');
                }
            }, 3000);
            
        } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.detail || `Save failed (status code: ${response.status})`;
            
            console.error('Failed to save group settings:', errorMessage);
            
            if (messageElement) {
                messageElement.textContent = `Save failed: ${errorMessage}`;
                messageElement.className = 'mt-2 p-2 text-sm rounded bg-red-100 text-red-700';
            }
            
            showCustomAlert('Error', `Save failed: ${errorMessage}`);
        }
        
    } catch (error) {
        console.error('An error occurred while saving group settings:', error);
        
        if (messageElement) {
            messageElement.textContent = 'A network error occurred while saving, please check your network connection';
            messageElement.className = 'mt-2 p-2 text-sm rounded bg-red-100 text-red-700';
        }
        
        showCustomAlert('Error', 'A network error occurred while saving, please check your network connection');
    }
}

/**
 * Load audit logs
 */
export async function loadAuditLogs() {
    const container = document.getElementById('audit-log-content');
    if (!container) return;
    
    try {
        const token = getAuthToken();
        if (!token) {
            container.innerHTML = '<p class="text-center text-gray-500">User not logged in</p>';
            return;
        }
        
        const groupId = window.currentGroupId;
        if (!groupId) {
            container.innerHTML = '<p class="text-center text-gray-500">Could not determine current group</p>';
            return;
        }
        
        // Show loading status
        container.innerHTML = '<div class="text-center text-gray-500">Loading audit logs...</div>';
        
        const response = await fetch(`/groups/${groupId}/audit-logs`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const logs = await response.json();
            
            if (!logs || logs.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500">No audit logs yet</p>';
                return;
            }
            
            // Render audit logs
            const logsHTML = logs.map(log => {
                const timestamp = new Date(log.created_at).toLocaleString('en-US');
                const username = log.user?.username || log.username || 'Unknown user';
                const action = log.action || 'Unknown action';
                const details = log.details || '';
                
                return `
                    <div class="p-3 bg-white rounded border border-gray-200 hover:border-gray-300 transition duration-150">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <p class="text-sm text-gray-600">${timestamp}</p>
                                <p class="text-base font-medium text-gray-900 mt-1">User ${username} ${action}</p>
                                ${details ? `<p class="text-sm text-gray-500 mt-1">${details}</p>` : ''}
                            </div>
                            <div class="text-right">
                                <span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                    Audit Log
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = logsHTML;
            
        } else {
            console.log('Audit log API not yet implemented, returning empty data');
            container.innerHTML = '<p class="text-center text-gray-500">Audit log feature not yet implemented</p>';
            return [];
        }
        
    } catch (error) {
        console.error('An error occurred while loading audit logs:', error);
        container.innerHTML = '<p class="text-center text-red-500">An error occurred while loading audit logs</p>';
    }
}

// Expose to global
window.saveGroupSettings = saveGroupSettings;
window.loadAuditLogs = loadAuditLogs;


