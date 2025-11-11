// /static/js/page/home_page.js
// Version: 2025.11.10.001
// Update home page functionality and rendering

// Current user information
let currentUser = null;

// Page initialization - Get and render data
async function initializeHomePage() {
    console.log('Starting home page initialization...');

    // Get current user information
    await getCurrentUserInfo();

    // Get and render data
    await loadAndRenderData();

    // Bind event listeners
    bindEventListeners();

    console.log('Home page initialization complete');
}

// Get current user information - Use correct API endpoint
async function getCurrentUserInfo() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.warn('Authentication token not found');
            return;
        }

        console.log('Getting user information from API...');
        const response = await fetch('/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
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

        // Get groups and invitations data in parallel
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

        console.log('Data retrieved:', { groups, invitations });
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
            console.log('First group full data structure:', groupsArray[0]);
        }

        // Check invitation data structure
        if (invitationsArray.length > 0) {
            console.log('First invitation full data structure:', invitationsArray[0]);
        }

        // Render data to page
        renderGroups(groupsArray);
        renderInvitations(invitationsArray);

    } catch (error) {
        console.error('Data loading failed:', error);
        showErrorStates();
    }
}

// Render group list - Fixed version
function renderGroups(groups) {
    const container = document.getElementById('my-groups-list');
    if (!container) {
        console.error('Group list container not found');
        return;
    }

    console.log('Rendering group data:', groups);

    if (groups.length === 0) {
        console.log('No groups found, displaying empty state');
        container.innerHTML = `
            <div class="col-span-full text-center p-8 text-gray-500">
                <i class="fa-solid fa-users text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-lg font-medium text-gray-600 mb-2">No groups joined yet</h3>
                <p class="text-sm text-gray-500 mb-4">Create or accept invitations to start managing group expenses</p>
                <button onclick="handleCreateGroup()"
                    class="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition duration-150">
                    <i class="fa-solid fa-plus w-4 h-4"></i>
                    <span>Create First Group</span>
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = groups.map(group => {
        console.log('Processing group:', group);

        // Calculate balance information - Fixed version
        const balance = group.balance || group.user_balance || 0;
        const balanceAmount = Math.abs(balance).toFixed(2);
        const owes = balance < 0;
        const balanceColor = owes ? 'text-red-400' : 'text-emerald-500';
        const balanceText = owes ? `You owe $${balanceAmount}` : `You are owed $${balanceAmount}`;

        // Check if user is admin - Fixed version
        let isAdmin = false;
        try {
            if (group.members && Array.isArray(group.members)) {
                const currentUserMember = group.members.find(m => m.user_id === currentUser?.id);
                if (currentUserMember) {
                    isAdmin = currentUserMember.role === 'admin';
                }
            } else if (group.user_role) {
                isAdmin = group.user_role === 'admin';
            } else if (group.is_admin !== undefined) {
                isAdmin = group.is_admin;
            }
        } catch (error) {
            console.warn('Error checking admin status:', error);
        }

        console.log(`Group ${group.name} admin status:`, {
            isAdmin,
            userRole: group.user_role,
            isAdminField: group.is_admin
        });

        // Get member count - Fixed version
        let memberCount = '0';
        try {
            if (group.members && Array.isArray(group.members)) {
                memberCount = group.members.length.toString();
            } else if (group.member_count !== undefined) {
                memberCount = group.member_count.toString();
            }
        } catch (error) {
            console.warn('Error getting member count:', error);
        }

        // Get group description - Fixed version
        const description = group.description || group.group_description || 'No description';

        // Safely handle group name
        const safeGroupName = group.name || group.group_name || 'Unnamed Group';
        const safeGroupId = group.id || group.group_id || 'unknown';

        return `
            <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100 group-card" onclick="redirectToGroupDetail('${safeGroupId}', '${encodeURIComponent(safeGroupName)}')">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex-1 min-w-0">
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
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                    </svg>
                </div>
            </div>
        `;
    }).join('');

    console.log('Group rendering complete, binding events...');

    // Bind group card click events
    bindGroupCardEvents();
}

// Render invitation list - Fixed version
function renderInvitations(invitations) {
    const container = document.getElementById('invitation-list-container');
    if (!container) {
        console.error('Invitation list container element not found: invitation-list-container');
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
                        <p class="text-red-600">Invitation data format error, missing ID</p>
                        <pre class="text-xs text-red-500 mt-2">${JSON.stringify(invitation, null, 2)}</pre>
                    </div>
                `;
            }

            console.log(`Invitation ${invitationId} parsing result:`, { groupName, inviterName, groupId });

            return `
                <div class="bg-white p-4 rounded-lg shadow-md border border-gray-100 mb-3" data-invitation-id="${invitationId}">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="text-lg font-semibold text-gray-800">${groupName}</h4>
                        <span class="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">Pending</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-600 mb-3">
                        <i class="fa-solid fa-user-tag mr-1"></i>
                        Inviter:
                        ${inviterName}
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="acceptInvitation('${invitationId}', this.closest('.bg-white'))"
                            class="flex-1 flex items-center justify-center space-x-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition duration-150 text-sm">
                            <i class="fa-solid fa-check w-3 h-3"></i>
                            <span>Accept Invitation</span>
                        </button>
                        <button onclick="declineInvitation('${invitationId}', this.closest('.bg-white'))"
                            class="flex-1 flex items-center justify-center space-x-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-150 text-sm">
                            <i class="fa-solid fa-times w-3 h-3"></i>
                            <span>Decline</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        console.log('Invitation rendering complete, binding event handling...');

        // Bind accept/decline invitation event handling
        bindInvitationEvents();
    } catch (error) {
        console.error('Error occurred while rendering invitations:', error);
        container.innerHTML = `
            <div class="text-center p-6 text-gray-500">
                <i class="fa-solid fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Error occurred while rendering invitation list</p>
                <p class="text-sm text-red-400 mt-1">${error.message}</p>
                <button onclick="loadAndRenderData()" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Reload
                </button>
            </div>
        `;
    }
}

/**
 * Bind invitation event handling - New function
 */
function bindInvitationEvents() {
    // Use event delegation to handle accept invitation
    document.addEventListener('click', function(event) {
        if (event.target.closest('[onclick*="acceptInvitation"]')) {
            const button = event.target.closest('button');
            const invitationCard = button.closest('[data-invitation-id]');
            const invitationId = invitationCard?.dataset?.invitationId;
            
            if (invitationId) {
                console.log('Accepting invitation:', invitationId);
                handleAcceptInvitation(parseInt(invitationId), invitationCard);
            }
        }
        
        if (event.target.closest('[onclick*="declineInvitation"]')) {
            const button = event.target.closest('button');
            const invitationCard = button.closest('[data-invitation-id]');
            const invitationId = invitationCard?.dataset?.invitationId;
            
            if (invitationId) {
                console.log('Declining invitation:', invitationId);
                handleDeclineInvitation(parseInt(invitationId), invitationCard);
            }
        }
    });
}

/**
 * Handle accept invitation - New function
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
 * Handle decline invitation - New function
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
 * Show notification - New function
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Show error states (can be removed)
function showErrorStates() {
    const groupsContainer = document.getElementById('my-groups-list');
    const invitationsContainer = document.getElementById('invitation-list-container');

    if (groupsContainer) {
        groupsContainer.innerHTML = `
            <div class="col-span-full text-center p-6 text-gray-500">
                <i class="fa-solid fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load groups, please refresh the page and try again</p>
                <button onclick="loadAndRenderData()" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Reload
                </button>
            </div>
        `;
    }

    if (invitationsContainer) {
        invitationsContainer.innerHTML = `
            <div class="text-center p-6 text-gray-500">
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
    if (createGroupModal) {
        // Modal close events
        createGroupModal.addEventListener('click', function(event) {
            if (event.target === createGroupModal) {
                closeCreateGroupModal();
            }
        });
    }

    // Auto refresh data (optional)
    setInterval(async () => {
        // Only refresh when user is active
        if (document.visibilityState === 'visible') {
            console.log('Regular refresh of home page data...');
            await loadAndRenderData();
        }
    }, 30000); // Refresh every 30 seconds

    console.log('Event listener binding complete');
}

// Redirect to group detail page
function redirectToGroupDetail(groupId, groupName) {
    console.log(`Redirecting to group detail page: ${groupName} (ID: ${groupId})`);
    window.location.href = `/groups/${groupId}`;
}

// Initialize after page load
document.addEventListener('DOMContentLoaded', function () {
    console.log('Home page DOM loaded, starting initialization...');
    initializeHomePage();
});

// Expose functions to global for onclick usage
window.redirectToGroupDetail = redirectToGroupDetail;

// Expose data loading function
window.loadAndRenderData = loadAndRenderData;

console.log('Home page module loaded, all functions exposed to global');
