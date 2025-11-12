// member_management.js - Member management, invitation, role setting
// Prevent caching version: 2025.11.06
const JS_CACHE_VERSION = '2025.11.06.001';

import { requireAdmin, isValidEmail, getAuthToken } from '../ui/utils.js';

// --- Global State ---

// Member management state
let memberToRemove = null;
let memberToUpdateRole = null;

// --- Helper Functions ---

/**
 * Extract group ID from the URL
 * @returns {number|null} Group ID, or null if it cannot be retrieved
 */
function getGroupIdFromURL() {
    try {
        const path = window.location.pathname;
        // Try to extract group ID from the path: /group/{group_id}/details
        const match = path.match(/\/group\/(\d+)\/details/);
        if (match) {
            return parseInt(match[1]);
        }
        
        // Try to get from query parameters: ?group_id={id}
        const urlParams = new URLSearchParams(window.location.search);
        const groupIdFromQuery = urlParams.get('group_id');
        if (groupIdFromQuery) {
            return parseInt(groupIdFromQuery);
        }
        
        // Try to get from page element
        const groupIdElement = document.getElementById('current-group-id');
        if (groupIdElement) {
            return parseInt(groupIdElement.value);
        }
        
        console.warn('Could not get group ID from URL:', path);
        return null;
    } catch (error) {
        console.error('An error occurred while getting the group ID:', error);
        return null;
    }
}

/**
 * Show loading state
 * @param {string} type - Operation type ('update-role' | 'remove-member')
 */
function showLoadingState(type) {
    const modal = type === 'update-role' ? 
        document.getElementById('role-update-modal') : 
        document.getElementById('remove-modal');
    
    if (modal) {
        const loadingElement = modal.querySelector('.loading-spinner') || 
                              modal.querySelector('[class*="loading"]');
        
        if (loadingElement) {
            loadingElement.classList.remove('hidden');
        }
        
        // Disable button
        const confirmButton = modal.querySelector('button[onclick*="confirm"]');
        if (confirmButton) {
            confirmButton.disabled = true;
            confirmButton.textContent = 'Processing...';
        }
    }
}

/**
 * Hide loading state
 * @param {string} type - Operation type ('update-role' | 'remove-member')
 */
function hideLoadingState(type) {
    const modal = type === 'update-role' ? 
        document.getElementById('role-update-modal') : 
        document.getElementById('remove-modal');
    
    if (modal) {
        const loadingElement = modal.querySelector('.loading-spinner') || 
                              modal.querySelector('[class*="loading"]');
        
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
        
        // Restore button
        const confirmButton = modal.querySelector('button[onclick*="confirm"]');
        if (confirmButton) {
            confirmButton.disabled = false;
            confirmButton.textContent = type === 'update-role' ? 'Confirm Update' : 'Confirm Remove';
        }
    }
}

/**
 * Safely get username - Fixed version
 * @param {Object} member - Member object
 * @returns {string} Username
 */
function getSafeUsername(member) {
    // Try various ways to get the username
    return member.username || 
           member.user?.username || 
           member.nickname || 
           member.name || 
           `User ${member.user_id || member.id || 'Unknown'}`;
}

/**
 * Safely get email - Fixed version
 * @param {Object} member - Member object
 * @returns {string} Email
 */
function getSafeEmail(member) {
    return member.email || 
           member.user?.email || 
           'No email';
}

/**
 * Safely get member ID - Fixed version
 * @param {Object} member - Member object
 * @returns {number} Member ID
 */
function getSafeMemberId(member) {
    return member.user_id || member.id;
}

export function renderMemberList() {
    const container = document.getElementById('member-list-container');
    const activeMemberCount = document.getElementById('active-member-count');
    const memberCount = document.getElementById('member-count');

    if (!container) {
        console.error('Could not find member list container');
        return;
    }

    console.log('Starting to render member list, data:', window.groupMembers);

    container.innerHTML = '';

    if (activeMemberCount) activeMemberCount.textContent = window.groupMembers.length;
    if (memberCount) memberCount.textContent = window.groupMembers.length;

    if (!window.groupMembers || window.groupMembers.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>No members yet</p>
            </div>
        `;
        return;
    }

    window.groupMembers.forEach(member => {
        try {
            // --- Fix start ---
            // Get safe username and email
            const safeUsername = getSafeUsername(member);
            const safeEmail = getSafeEmail(member);
            // --- Fix end ---

            const isAdmin = member.role === 'admin' || member.is_admin === true; // Also check for is_admin
            const isSelf = parseInt(getSafeMemberId(member)) === parseInt(window.CURRENT_USER_ID); // Use safely obtained ID
            
            // Clean up username, remove parentheses and their content
            const displayName = safeUsername.replace(/\s*\(.*\)/, '').trim();
            const displayInitial = displayName ? displayName[0].toUpperCase() : '?'; // Ensure displayName is not empty

            // --- Fix: Check if member.balance exists ---
            const balance = member.balance || 0;
            let balanceText;
            let balanceColorClass;

            if (balance > 0.01) {
                balanceText = `Owed ¥${balance.toFixed(2)}`;
                balanceColorClass = 'text-success font-semibold';
            } else if (balance < -0.01) {
                balanceText = `Owes ¥${Math.abs(balance).toFixed(2)}`;
                balanceColorClass = 'text-danger font-semibold';
            } else {
                balanceText = 'Settled';
                balanceColorClass = 'text-gray-500';
            }
            
            // --- Fix: Ensure the correct member ID is used ---
            const memberId = getSafeMemberId(member);
            if (!memberId) {
                console.error('Member data is missing a valid ID', member);
                return; // Skip this malformed member
            }

            const memberCard = document.createElement('div');
            memberCard.className = 'flex items-center justify-between p-4 bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition duration-150';
            memberCard.innerHTML = `
                <div class="flex items-center space-x-4 flex-1 min-w-0">
                    <div class="w-10 h-10 flex items-center justify-center bg-primary/10 text-primary rounded-full font-bold text-lg flex-shrink-0">
                        ${displayInitial}
                    </div>
                    <div class="min-w-0">
                        <p class="text-base font-semibold text-gray-900 truncate flex items-center">
                            ${displayName}
                            ${isAdmin ? '<span class="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full font-medium">Admin</span>' : ''}
                            ${isSelf ? '<span class="ml-2 text-xs bg-gray-400 text-white px-2 py-0.5 rounded-full font-medium">You</span>' : ''}
                        </p>
                        <p class="text-sm text-gray-500 truncate">${safeEmail}</p>
                    </div>
                </div>
                
                <div class="flex items-center space-x-4 flex-shrink-0">
                    <span class="text-right text-sm w-28 ${balanceColorClass}">
                        ${balanceText}
                    </span>
                    
                    ${window.IS_CURRENT_USER_ADMIN && !isSelf ? `
                        <div class="relative">
                            <button onclick="toggleMemberManagementMenu(event, ${memberId})" 
                                class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition duration-150">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                                </svg>
                            </button>
                            
                            <div id="member-menu-${memberId}" 
                                class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 hidden">
                                <button onclick="handleUpdateRole(${memberId}, '${displayName.replace(/'/g, "\\'")}')" 
                                    class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition duration-150">
                                    ${isAdmin ? 'Revoke Admin' : 'Make Admin'}
                                </button>
                                <button onclick="handleRemoveMember(${memberId}, '${displayName.replace(/'/g, "\\'")}')" 
                                    class="w-full text-left px-4 py-2 text-sm text-danger hover:bg-red-50 transition duration-150">
                                    Remove Member
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            container.appendChild(memberCard);
        } catch (error) {
            console.error('An error occurred while rendering a member item:', error, member);
            // Continue processing other members, do not let an error with a single member affect the entire list
        }
    });
}

export function toggleMemberManagementMenu(event, memberId) {
    event.stopPropagation();

    // Close all other menus
    const allMenus = document.querySelectorAll('[id^="member-menu-"]');
    allMenus.forEach(menu => {
        if (menu.id !== `member-menu-${memberId}`) {
            menu.classList.add('hidden');
        }
    });

    // Toggle the current menu
    const currentMenu = document.getElementById(`member-menu-${memberId}`);
    if (currentMenu) {
        currentMenu.classList.toggle('hidden');
    }
}

export const handleUpdateRole = requireAdmin(function (memberId, memberName) {
    const roleModal = document.getElementById('role-update-modal');
    const roleMessage = document.getElementById('role-update-message');

    if (roleModal && roleMessage) {
        // Find member, supporting multiple ID fields
        const member = window.groupMembers.find(m => 
            parseInt(getSafeMemberId(m)) === parseInt(memberId)
        );
        
        if (member) {
            // Check admin status, supporting multiple fields
            const isAdmin = member.is_admin === true || member.role === 'admin';
            const action = isAdmin ? 'Revoke Admin' : 'Make Admin';
            const warningText = isAdmin ? '' : '(Admins can manage all group settings)';
            
            roleMessage.innerHTML = `
                Are you sure you want to ${action} for member "${memberName}"?<br>
                <small class="text-gray-500">${warningText}</small>
            `;
            
            roleModal.classList.remove('hidden');
            roleModal.dataset.memberId = memberId;
            
            console.log('Opening role update modal:', {
                memberId,
                memberName,
                isAdmin,
                member: member
            });
        } else {
            console.error('Could not find member to update role:', memberId);
            if (window.showCustomAlert) {
                window.showCustomAlert('Error', 'Could not find this member');
            }
        }
    } else {
        console.error('Could not find role update modal elements');
    }
});

export const handleRemoveMember = requireAdmin(function (memberId, memberName) {
    const removeModal = document.getElementById('remove-modal');
    const removeMessage = document.getElementById('remove-message');

    if (removeModal && removeMessage) {
        // Find member, supporting multiple ID fields
        const member = window.groupMembers.find(m => 
            parseInt(getSafeMemberId(m)) === parseInt(memberId)
        );
        
        if (member) {
            // Check if admin, supporting multiple fields
            const isAdmin = member.is_admin === true || member.role === 'admin';
            
            if (isAdmin) {
                if (window.showCustomAlert) {
                    window.showCustomAlert('Error', 'Cannot remove a group admin');
                }
                return;
            }
            
            // Reconfirm removal
            removeMessage.innerHTML = `
                Are you sure you want to remove member "${memberName}" from the group?<br>
                <small class="text-red-500">This action cannot be undone, and the member will no longer be able to view this group's expense information.</small>
            `;
            
            removeModal.classList.remove('hidden');
            removeModal.dataset.memberId = memberId;
            
            console.log('Opening remove member modal:', {
                memberId,
                memberName,
                member: member
            });
        } else {
            console.error('Could not find member to remove:', memberId);
            if (window.showCustomAlert) {
                window.showCustomAlert('Error', 'Could not find this member');
            }
        }
    } else {
        console.error('Could not find remove member modal elements');
    }
});

export async function confirmUpdateRole() {
    const modal = document.getElementById('role-update-modal');
    const memberId = modal?.dataset?.memberId;
    
    if (!memberId) {
        if (window.showCustomAlert) {
            window.showCustomAlert('Error', 'Could not find member to update');
        }
        return;
    }

    // Show loading state
    showLoadingState('update-role');

    try {
        // Get current group ID
        const groupId = window.CURRENT_GROUP_ID || window.currentGroupId || getGroupIdFromURL();
        if (!groupId) {
            throw new Error('Could not get group ID');
        }

        // Get member information
        const member = window.groupMembers.find(m => 
            parseInt(getSafeMemberId(m)) === parseInt(memberId)
        );
        
        if (!member) {
            throw new Error('Could not find this member');
        }

        // Decide the new admin status (inverse)
        const currentIsAdmin = member.is_admin === true || member.role === 'admin';
        const newAdminStatus = !currentIsAdmin;
        
        console.log('Updating member role:', {
            memberId,
            groupId,
            currentIsAdmin,
            newAdminStatus
        });

        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication token not found, please log in again');
        }

        // Call the update admin status API
        const response = await fetch(`/groups/${groupId}/members/${memberId}/admin`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                is_admin: newAdminStatus
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Role updated successfully:', result);
            
            const action = newAdminStatus ? 'made an admin' : 'had admin permissions revoked';
            if (window.showCustomAlert) {
                window.showCustomAlert('Success', `Member role has been ${action}`);
            }
            
            cancelUpdateRole();
            
            // Reload member list
            if (window.loadMembersList) {
                await window.loadMembersList();
            } else {
                // If loadMembersList function is not available, refresh the page
                setTimeout(() => window.location.reload(), 1000);
            }
        } else {
            const errorData = await response.json();
            console.error('API error response:', errorData);
            
            let errorMessage = 'Failed to update role';
            if (errorData.detail) {
                if (errorData.detail.includes('not a member')) {
                    errorMessage = 'This user is not a member of the group';
                } else if (errorData.detail.includes('Only admin')) {
                    errorMessage = 'Only admins can modify permissions';
                } else {
                    errorMessage = errorData.detail;
                }
            }
            
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Error updating role:', error);
        if (window.showCustomAlert) {
            window.showCustomAlert('Error', error.message || 'Failed to update role, please try again');
        }
    } finally {
        // Hide loading state
        hideLoadingState('update-role');
    }
}

export async function confirmRemoveMember() {
    const modal = document.getElementById('remove-modal');
    const memberId = modal?.dataset?.memberId;
    
    if (!memberId) {
        if (window.showCustomAlert) {
            window.showCustomAlert('Error', 'Could not find member to remove');
        }
        return;
    }

    // Final confirmation dialog
    if (!window.confirm('Are you sure you want to remove this member from the group? This action cannot be undone.')) {
        return;
    }

    // Show loading state
    showLoadingState('remove-member');

    try {
        // Get current group ID
        const groupId = window.CURRENT_GROUP_ID || window.currentGroupId || getGroupIdFromURL();
        if (!groupId) {
            throw new Error('Could not get group ID');
        }

        console.log('Removing member:', {
            memberId,
            groupId
        });

        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication token not found, please log in again');
        }

        // Call the remove member API
        const response = await fetch(`/groups/${groupId}/members/${memberId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            console.log('Member removed successfully');
            
            if (window.showCustomAlert) {
                window.showCustomAlert('Success', 'Member has been removed from the group');
            }
            
            cancelRemoveMember();
            
            // Reload member list
            if (window.loadMembersList) {
                await window.loadMembersList();
            } else {
                // If loadMembersList function is not available, refresh the page
                setTimeout(() => window.location.reload(), 1000);
            }
        } else {
            const errorData = await response.json();
            console.error('API error response:', errorData);
            
            let errorMessage = 'Failed to remove member';
            if (errorData.detail) {
                if (errorData.detail.includes('Cannot remove the group admin')) {
                    errorMessage = 'Cannot remove a group admin';
                } else if (errorData.detail.includes('not a member')) {
                    errorMessage = 'This user is not a member of the group';
                } else {
                    errorMessage = errorData.detail;
                }
            }
            
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Error removing member:', error);
        if (window.showCustomAlert) {
            window.showCustomAlert('Error', error.message || 'Failed to remove member, please try again');
        }
    } finally {
        // Hide loading state
        hideLoadingState('remove-member');
    }
}

export function cancelUpdateRole() {
    const modal = document.getElementById('role-update-modal');
    if (modal) {
        modal.classList.add('hidden');
        // Reset loading state
        hideLoadingState('update-role');
        // Clean up data
        delete modal.dataset.memberId;
    }
}

export function cancelRemoveMember() {
    const modal = document.getElementById('remove-modal');
    if (modal) {
        modal.classList.add('hidden');
        // Reset loading state
        hideLoadingState('remove-member');
        // Clean up data
        delete modal.dataset.memberId;
    }
}

// Invite member function - Fixed version
export function clearInviteForm() {
    const emailInput = document.getElementById('invite-user-email-input');
    if (emailInput) emailInput.value = '';
}

export async function inviteNewMember() {
    const emailInput = document.getElementById('invite-user-email-input');
    const loadingMessage = document.getElementById('invite-loading-message');
    const submitButton = document.getElementById('invite-submit-button');

    if (!emailInput || !loadingMessage || !submitButton) {
        console.error('Could not find invitation form elements');
        return;
    }

    const email = emailInput.value.trim();

    if (!email) {
        if (window.showCustomAlert) {
            window.showCustomAlert('Error', 'Please enter an email address');
        }
        return;
    }

    if (!isValidEmail(email)) {
        if (window.showCustomAlert) {
            window.showCustomAlert('Error', 'Please enter a valid email address');
        }
        return;
    }

    loadingMessage.classList.remove('hidden');
    submitButton.disabled = true;

    try {
        // Get current group ID
        const groupId = window.CURRENT_GROUP_ID || window.currentGroupId || getGroupIdFromURL();
        if (!groupId) {
            throw new Error('Could not get group ID');
        }

        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication token not found, please log in again');
        }

        console.log('Sending invitation:', { email, groupId });

        // Call the invitation API
        const response = await fetch(`/groups/${groupId}/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ invitee_email: email })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Invitation sent successfully:', result);
            
            if (window.showCustomAlert) {
                window.showCustomAlert('Success', `Invitation sent to ${email}`);
            }
            clearInviteForm();
        } else {
            const errorData = await response.json();
            let errorMessage = 'Failed to send invitation';
            
            if (errorData.detail) {
                errorMessage = errorData.detail;
            }
            
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Failed to send invitation:', error);
        if (window.showCustomAlert) {
            window.showCustomAlert('Error', error.message || 'Failed to send invitation, please try again');
        }
    } finally {
        loadingMessage.classList.add('hidden');
        submitButton.disabled = false;
    }
}

// Keyboard event handling
document.addEventListener('keydown', function(event) {
    // ESC key closes modals
    if (event.key === 'Escape') {
        const roleModal = document.getElementById('role-update-modal');
        const removeModal = document.getElementById('remove-modal');
        
        if (roleModal && !roleModal.classList.contains('hidden')) {
            cancelUpdateRole();
        }
        
        if (removeModal && !removeModal.classList.contains('hidden')) {
            cancelRemoveMember();
        }
    }
});

// Expose all member management related functions to the global window object
window.renderMemberList = renderMemberList;
window.toggleMemberManagementMenu = toggleMemberManagementMenu;
window.handleUpdateRole = handleUpdateRole;
window.handleRemoveMember = handleRemoveMember;
window.confirmUpdateRole = confirmUpdateRole;
window.confirmRemoveMember = confirmRemoveMember;
window.cancelUpdateRole = cancelUpdateRole;
window.cancelRemoveMember = cancelRemoveMember;
window.clearInviteForm = clearInviteForm;
window.inviteNewMember = inviteNewMember;
window.getGroupIdFromURL = getGroupIdFromURL;
window.isValidEmail = isValidEmail;

console.log('Member management module loaded, all functions exposed to global');
