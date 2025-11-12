// file: app/static/js/api/invitations.js
// Prevent caching version: 2025.11.06
const JS_CACHE_VERSION = '2025.11.06.001';

import { showCustomAlert } from '../ui/utils.js';

/**
 * Get the list of pending invitations
 */
export async function getPendingInvitations() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('User not logged in');
        }

        console.log('Getting invitation list...');
        const response = await fetch('/invitations/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Invitation API response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to get invitation list:', response.status, errorText);
            throw new Error(`Failed to get invitation list: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Invitation data received:', data);
        console.log('Number of invitations:', Array.isArray(data) ? data.length : 'Data is not an array');
        
        return data;
    } catch (error) {
        console.error('Error getting invitation list:', error);
        throw error;
    }
}

/**
 * Accept a group invitation
 */
export async function acceptInvitation(invitationId) {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('User not logged in');
        }

        const response = await fetch(`/invitations/${invitationId}/respond`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: "accept"
            })
        });

        if (response.ok) {
            showCustomAlert('Successfully joined the group!', false);
            // Delay page refresh to allow the user to see the success message
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            return true;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to accept invitation');
        }
    } catch (error) {
        console.error('Error accepting invitation:', error);
        showCustomAlert(error.message || 'Failed to accept invitation, please try again');
        return false;
    }
}

/**
 * Decline a group invitation
 */
export async function declineInvitation(invitationId) {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('User not logged in');
        }

        const response = await fetch(`/invitations/${invitationId}/respond`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: "reject"
            })
        });

        if (response.ok) {
            showCustomAlert('Invitation declined', false);
            // Delay page refresh to allow the user to see the success message
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            return true;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to decline invitation');
        }
    } catch (error) {
        console.error('Error declining invitation:', error);
        showCustomAlert(error.message || 'Failed to decline invitation, please try again');
        return false;
    }
}

/**
 * Send a group invitation
 */
export async function sendInvitation(groupId, inviteeEmail) {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('User not logged in');
        }

        console.log('Sending invitation:', { groupId, inviteeEmail });
        
        const requestBody = {
            invitee_email: inviteeEmail  // Ensure the field name matches the backend expectation
        };
        
        console.log('Request body:', requestBody);

        const response = await fetch(`/groups/${groupId}/invite`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Invitation API response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Invitation sent successfully:', result);
            showCustomAlert('Invitation sent successfully!');
            return result;
        } else {
            const errorData = await response.json();
            console.error('Failed to send invitation:', response.status, errorData);
            throw new Error(errorData.detail || 'Failed to send invitation');
        }
    } catch (error) {
        console.error('Error sending invitation:', error);
        showCustomAlert(error.message || 'Failed to send invitation, please try again');
        return false;
    }
}

// Expose functions to global scope for onclick calls in HTML
window.acceptInvitation = acceptInvitation;
window.declineInvitation = declineInvitation;
window.sendInvitation = sendInvitation;
window.getPendingInvitations = getPendingInvitations;
