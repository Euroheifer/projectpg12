// File: app/static/js/api/invitations.js
// Version: 2025.11.06.001
const JS_CACHE_VERSION = '2025.11.06.001';

// Import utility functions
import { getAuthToken } from '../ui/utils.js';

/**
 * Get pending invitation list
 */
export async function getPendingInvitations() {
    try {
        const token = getAuthToken();
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
        console.log('Invitation count:', Array.isArray(data) ? data.length : 'Data is not an array');

        return data;

    } catch (error) {
        console.error('Error getting invitation list:', error);
        throw error;
    }
}

/**
 * Accept group invitation
 */
export async function acceptInvitation(invitationId) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('User not logged in');
        }

        console.log('Accepting invitation:', invitationId);

        const response = await fetch(`/invitations/${invitationId}/accept`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showCustomAlert('Successfully joined the group!', false);
            // Delay page refresh to let user see success message
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            return true;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to accept invitation');
        }
    } catch (error) {
        console.error('Accept invitation error:', error);
        showCustomAlert(error.message || 'Failed to accept invitation, please try again');
        return false;
    }
}

/**
 * Decline group invitation
 */
export async function declineInvitation(invitationId) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('User not logged in');
        }

        console.log('Declining invitation:', invitationId);

        const response = await fetch(`/invitations/${invitationId}/decline`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showCustomAlert('Invitation declined', false);
            // Delay page refresh to let user see success message
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            return true;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to decline invitation');
        }
    } catch (error) {
        console.error('Decline invitation error:', error);
        showCustomAlert(error.message || 'Failed to decline invitation, please try again');
        return false;
    }
}

/**
 * Send group invitation
 */
export async function sendGroupInvitation(groupId, inviteeEmail) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('User not logged in');
        }

        console.log('Sending invitation:', { groupId, inviteeEmail });

        const requestBody = {
            invitee_email: inviteeEmail  // Ensure field name matches backend expectations
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
        console.error('Send invitation error:', error);
        showCustomAlert(error.message || 'Failed to send invitation, please try again');
        return false;
    }
}

// Expose functions to global for onclick calls in HTML
window.acceptInvitation = acceptInvitation;
window.declineInvitation = declineInvitation;
window.sendGroupInvitation = sendGroupInvitation;
