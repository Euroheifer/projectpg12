// file: app/static/js/page/home_page.js
import { createNewGroup, handleCreateGroup, closeCreateGroupModal, getUserGroups } from '../api/groups.js';
import { acceptInvitation, declineInvitation, getPendingInvitations } from '../api/invitations.js';
import { getAuthToken } from '../ui/utils.js';

// Current user information
let currentUser = null;

// Page initialization - get and render data
async function initializeHomePage() {
    console.log('Starting homepage initialization...');

    // Get current user information
    await getCurrentUserInfo();

    // Get and render data
    await loadAndRenderData();

    // Bind event listeners
    bindEventListeners();

    console.log('Homepage initialization completed');
}

// Get current user information - using correct API endpoint
async function getCurrentUserInfo() {
    try {
        const token = getAuthToken();
        if (!token) {
            console.warn('Authentication token not found');
            return;
        }

        console.log('Getting user information from API...');
        const response = await fetch('/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            currentUser = await response.json();
            console.log('User information from API:', currentUser);

        } else {
            console.error('Failed to get user information, status code:', response.status);
            const errorText = await response.text();
            console.error('Error message:', errorText);
        }
    } catch (error) {
        console.error('Failed to get user information:', error);
    }
}

// Get and render data
async function loadAndRenderData() {
    try {
        console.log('Starting data loading...');
        
        // Get group and invitation data in parallel
        const [groups, invitations] = await Promise.all([
            getUserGroups().catch(error => {
                console.error('Failed to get group data:', error);
                return [];
            }),
            getPendingInvitations().catch(error => {
                console.error('Failed to get invitation data:', error);
                return [];
            })
        ]);

        console.log('Retrieved data:', { groups, invitations });
        console.log('Current user information:', currentUser);
        
        // Ensure data is arrays
        const groupsArray = Array.isArray(groups) ? groups : [];
        const invitationsArray = Array.isArray(invitations) ? invitations : [];
        
        console.log('Processed data:', {
            groupsCount: groupsArray.length,
            invitationsCount: invitationsArray.length
        });

        // Check group data structure
        if (groupsArray.length > 0) {
            console.log('First group complete data structure:', groupsArray[0]);
        }
        
        // Check invitation data structure
        if (invitationsArray.length > 0) {
            console.log('First invitation complete data structure:', invitationsArray[0]);
        }

        // Render data to page
        renderGroups(groupsArray);
        renderInvitations(invitationsArray);

    } catch (error) {
        console.error('Failed to load data:', error);
        showErrorStates();
    }
}

// Render group list - fixed version
function renderGroups(groups) {
    const container = document.getElementById('my-groups-list');
    if (!container) return;

    console.log('Rendering group data:', groups);

    if (!groups || groups.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center p-8 text-gray-500 bg-gray-50 rounded-lg">
                <i class="fa-solid fa-users text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-lg font-medium text-gray-600 mb-2">No groups joined yet</h3>
                <p class="text-sm text-gray-500 mb-4">Create or accept invitations to start managing group expenses</p>
                <button onclick="handleCreateGroup()"
                    class="inline-flex items-center space-x-1 py-2 px-4 rounded-lg text-white bg-emerald-500 hover:bg-emerald-600 transition duration-150">
                    <i class="fa-solid fa-plus w-4 h-4"></i>
                    <span>Create First Group</span>
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = groups.map(group => {
        console.log('Processing group:', group);

        // Calculate balance information - fixed version
        const balance = group.balance || group.user_balance || 0;
        const owes = balance < 0;
        const balanceAmount = Math.abs(balance).toFixed(2);
        const balanceColor = owes ? 'text-red-400' : 'text-emerald-500';
        const balanceText = owes ? `You owe ¥${balanceAmount}` : `You are owed ¥${balanceAmount}`;

        // Determine if admin - fixed version
        let isAdmin = false;
        if (group.is_admin !== undefined) {
            isAdmin = group.is_admin;
        } else if (group.admin_id && currentUser && currentUser.id) {
            isAdmin = group.admin_id === currentUser.id;
        } else if (group.role === 'admin') {
            isAdmin = true;
        }

        console.log(`Group ${group.name} admin status:`, {
            isAdmin,
            groupAdminId: group.admin_id,
            currentUserId: currentUser?.id,
            groupRole: group.role,
            groupIsAdmin: group.is_admin
        });

        // Get member count - fixed version
        let memberCount = '0';
        if (group.member_count !== undefined) {
            memberCount = group.member_count.toString();
        } else if (group.members && Array.isArray(group.members)) {
            memberCount = group.members.length.toString();
        } else if (group.member_count !== undefined) {
            memberCount = group.member_count.toString();
        }

        // Get group description - fixed version
        const description = group.description || group.group_description || 'No description';

        // Safely handle group name
        const safeGroupName = group.name || group.group_name || 'Unnamed Group';
        const safeGroupId = group.id || group.group_id || 'Unknown';

        return `
        <div class="group-card bg-white p-5 rounded-xl border border-gray-200 shadow-md hover:bg-gray-50 fade-in"
             onclick="redirectToGroupDetail(${safeGroupId}, '${safeGroupName.replace(/'/g, "\\'")}')">
            <div class="mb-3">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-bold text-gray-900 truncate">${safeGroupName}</h3>
                    ${isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
                </div>
            </div>
            <!-- Add group description -->
            <p class="text-sm text-gray-500 mb-2 line-clamp-2">${description}</p>
            <p class="text-sm text-gray-500 mb-2">Members: ${memberCount} people</p>
            <div class="flex items-center space-x-2 pt-2 border-t border-gray-100">
                <span class="${balanceColor} font-bold text-base">Balance: ${balanceText}</span>
                <svg class="w-5 h-5 ${balanceColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="${owes ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'}"></path>
                </svg>
            </div>
        </div>
        `;
    }).join('');
}

// Render invitation list - fixed version
function renderInvitations(invitations) {
    const container = document.getElementById('invitation-list-container');
    if (!container) {
        console.error('Cannot find invitation list container element: invitation-list-container');
        return;
    }

    console.log('Starting to render invitation data:', invitations);
    console.log('Data type:', typeof invitations);
    console.log('Is array:', Array.isArray(invitations));
    console.log('Invitation count:', invitations ? invitations.length : 'Invitation data is empty');

    if (!invitations || invitations.length === 0) {
        console.log('No invitation data, showing empty state');
        container.innerHTML = `
            <div class="text-center p-6 text-gray-500">
                <i class="fa-solid fa-inbox text-5xl text-gray-300 mb-3"></i>
                <p class="mt-2">You currently have no pending invitations.</p>
            </div>
        `;
        return;
    }

    console.log('Starting to render', invitations.length, 'invitations');
    
    try {
        container.innerHTML = invitations.map((invitation, index) => {
            console.log(`Processing invitation ${index + 1}:`, invitation);
            
            // Safely get invitation data
            const invitationId = invitation.id || invitation.invitation_id;
            const groupName = invitation.group?.name || invitation.group_name || invitation.group?.group_name || 'Unknown Group';
            const inviterName = invitation.inviter?.username || invitation.inviter_name || invitation.inviter?.name || 'Unknown User';
            const groupId = invitation.group?.id || invitation.group_id;
            
            if (!invitationId) {
                console.warn('Invitation data missing ID, skipping:', invitation);
                return `
                    <div class="bg-red-50 border border-red-200 p-4 mb-3 rounded-lg">
                        <p class="text-red-600">Invalid invitation data format, missing ID</p>
                        <pre class="text-xs text-red-500 mt-2">${JSON.stringify(invitation, null, 2)}</pre>
                    </div>
                `;
            }

            console.log(`Invitation ${invitationId} parsing result:`, { groupName, inviterName, groupId });

            return `
            <div class="invitation-card bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm hover:shadow-md transition duration-200"
                data-invitation-id="${invitationId}">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-medium text-gray-800 text-lg">
                        ${groupName}
                    </h4>
                </div>
                <p class="text-sm text-gray-600 mb-3">
                    <i class="fa-solid fa-user-tag mr-1"></i>
                    Invited by:
                    ${inviterName}
                </p>
                <div class="flex space-x-2">
                    <button class="accept-invitation-btn flex-1 py-2 px-3 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition duration-150 flex items-center justify-center space-x-1">
                        <i class="fa-solid fa-check w-3 h-3"></i>
                        <span>Accept</span>
                    </button>
                    <button class="decline-invitation-btn flex-1 py-2 px-3 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition duration-150 flex items-center justify-center space-x-1">
                        <i class="fa-solid fa-times w-3 h-3"></i>
                        <span>Decline</span>
                    </button>
                </div>
            </div>
            `;
        }).join('');

        console.log('Invitation rendering completed, binding event handlers...');
        
        // Bind accept/decline invitation event handlers
        bindInvitationEvents();
        
    } catch (error) {
        console.error('Error occurred when rendering invitations:', error);
        container.innerHTML = `
            <div class="text-center p-6 text-red-500">
                <i class="fa-solid fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Error occurred when rendering invitation list</p>
                <p class="text-sm text-red-400 mt-1">${error.message}</p>
                <button onclick="loadAndRenderData()" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Reload
                </button>
            </div>
        `;
    }
}

/**
 * Bind invitation event handlers - new function
 */
function bindInvitationEvents() {
    // Use event delegation to handle invitation acceptance
    document.addEventListener('click', function(event) {
        if (event.target.closest('.accept-invitation-btn')) {
            event.preventDefault();
            const invitationCard = event.target.closest('.invitation-card');
            const invitationId = invitationCard?.dataset.invitationId;
            if (invitationId) {
                console.log('Accepting invitation:', invitationId);
                handleAcceptInvitation(parseInt(invitationId), invitationCard);
            }
        }

        if (event.target.closest('.decline-invitation-btn')) {
            event.preventDefault();
            const invitationCard = event.target.closest('.invitation-card');
            const invitationId = invitationCard?.dataset.invitationId;
            if (invitationId) {
                console.log('Declining invitation:', invitationId);
                handleDeclineInvitation(parseInt(invitationId), invitationCard);
            }
        }
    });
}

/**
 * Handle invitation acceptance - new function
 */
async function handleAcceptInvitation(invitationId, invitationCard) {
    try {
        // Disable buttons to prevent double-clicking
        const buttons = invitationCard.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);

        console.log('Starting to accept invitation:', invitationId);
        
        // Call accept invitation API
        await acceptInvitation(invitationId);
        
        // Show success message
        showNotification('Invitation accepted', 'success');
        
        // Refresh data
        await loadAndRenderData();
        
    } catch (error) {
        console.error('Failed to accept invitation:', error);
        showNotification(error.message || 'Failed to accept invitation, please try again', 'error');
        
        // Restore button state
        const buttons = invitationCard.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = false);
    }
}

/**
 * Handle invitation decline - new function
 */
async function handleDeclineInvitation(invitationId, invitationCard) {
    try {
        // Disable buttons to prevent double-clicking
        const buttons = invitationCard.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);

        console.log('Starting to decline invitation:', invitationId);
        
        // Call decline invitation API
        await declineInvitation(invitationId);
        
        // Show success message
        showNotification('Invitation declined', 'info');
        
        // Refresh data
        await loadAndRenderData();
        
    } catch (error) {
        console.error('Failed to decline invitation:', error);
        showNotification(error.message || 'Failed to decline invitation, please try again', 'error');
        
        // Restore button state
        const buttons = invitationCard.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = false);
    }
}

/**
 * Show notification - new function
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Show error states (can be removed)
function showErrorStates() {
    const groupsContainer = document.getElementById('my-groups-list');
    const invitesContainer = document.getElementById('invitation-list-container');

    if (groupsContainer) {
        groupsContainer.innerHTML = `
            <div class="col-span-full text-center p-6 text-red-500">
                <i class="fa-solid fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load groups, please refresh the page and try again</p>
                <button onclick="loadAndRenderData()" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Reload
                </button>
            </div>
        `;
    }

    if (invitesContainer) {
        invitesContainer.innerHTML = `
            <div class="text-center p-6 text-red-500">
                <i class="fa-solid fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load invitations, please refresh the page and try again</p>
                <button onclick="loadAndRenderData()" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Reload
                </button>
            </div>
        `;
    }
}

// Bind event listeners
function bindEventListeners() {
    console.log('Binding event listeners...');

    // Modal related events
    const createGroupModal = document.getElementById('create-group-modal');
    const groupNameInput = document.getElementById('group-name');

    if (createGroupModal) {
        createGroupModal.addEventListener('click', function (event) {
            if (event.target === createGroupModal) {
                closeCreateGroupModal();
            }
        });

        if (groupNameInput) {
            groupNameInput.addEventListener('keypress', function (event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    createNewGroup();
                }
            });
        }

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !createGroupModal.classList.contains('hidden')) {
                closeCreateGroupModal();
            }
        });
    }

    // Auto refresh data (optional)
    setInterval(async () => {
        // Only refresh when user is active
        if (document.visibilityState === 'visible') {
            console.log('Periodically refreshing homepage data...');
            await loadAndRenderData();
        }
    }, 30000); // Refresh every 30 seconds

    console.log('Event listeners binding completed');
}

// Redirect to group detail page
function redirectToGroupDetail(groupId, groupName) {
    console.log(`Redirecting to group detail page: ${groupName} (ID: ${groupId})`);
    window.location.href = `/groups/${groupId}`;
}

// Initialize after page loads
document.addEventListener('DOMContentLoaded', function () {
    initializeHomePage();
});

// Expose functions to global for onclick usage
window.redirectToGroupDetail = redirectToGroupDetail;

// Expose data loading function
window.loadAndRenderData = loadAndRenderData;

console.log('Homepage module loaded, all functions exposed to global');
