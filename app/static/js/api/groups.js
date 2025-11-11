// /static/js/api/groups.js
// Version: 2025.11.10.001
const JS_CACHE_VERSION = '2025.11.10.001';

// Import utility functions
import { getAuthToken } from '../ui/utils.js';

/**
 * Get user groups
 */
export async function getUserGroups() {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('User not logged in');
        }

        console.log('Getting user groups...');
        const response = await fetch('/groups/my', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('User groups API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to get user groups:', response.status, errorText);
            throw new Error(`Failed to get user groups: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('User groups data received:', data);
        console.log('Groups count:', Array.isArray(data) ? data.length : 'Data is not an array');

        return data;

    } catch (error) {
        console.error('Error getting user groups:', error);
        throw error;
    }
}

/**
 * Create new group
 */
export async function createGroup(groupData) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('User not logged in');
        }

        console.log('Creating new group:', groupData);

        const response = await fetch('/groups', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(groupData)
        });

        console.log('Create group API response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to create group:', errorData);
            throw new Error(errorData.detail || 'Failed to create group');
        }

        const result = await response.json();
        console.log('Group created successfully:', result);
        return result;

    } catch (error) {
        console.error('Error creating group:', error);
        throw error;
    }
}

/**
 * Update group
 */
export async function updateGroup(groupId, groupData) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('User not logged in');
        }

        console.log('Updating group:', groupId, groupData);

        const response = await fetch(`/groups/${groupId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(groupData)
        });

        console.log('Update group API response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to update group:', errorData);
            throw new Error(errorData.detail || 'Failed to update group');
        }

        const result = await response.json();
        console.log('Group updated successfully:', result);
        return result;

    } catch (error) {
        console.error('Error updating group:', error);
        throw error;
    }
}

/**
 * Delete group
 */
export async function deleteGroup(groupId) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('User not logged in');
        }

        console.log('Deleting group:', groupId);

        const response = await fetch(`/groups/${groupId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Delete group API response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to delete group:', errorData);
            throw new Error(errorData.detail || 'Failed to delete group');
        }

        const result = await response.json();
        console.log('Group deleted successfully:', result);
        return result;

    } catch (error) {
        console.error('Error deleting group:', error);
        throw error;
    }
}

/**
 * Get group details
 */
export async function getGroupDetails(groupId) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('User not logged in');
        }

        console.log('Getting group details:', groupId);

        const response = await fetch(`/groups/${groupId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Group details API response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to get group details:', errorData);
            throw new Error(errorData.detail || 'Failed to get group details');
        }

        const result = await response.json();
        console.log('Group details received successfully:', result);
        return result;

    } catch (error) {
        console.error('Error getting group details:', error);
        throw error;
    }
}

/**
 * Leave group
 */
export async function leaveGroup(groupId) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('User not logged in');
        }

        console.log('Leaving group:', groupId);

        const response = await fetch(`/groups/${groupId}/leave`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Leave group API response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to leave group:', errorData);
            throw new Error(errorData.detail || 'Failed to leave group');
        }

        const result = await response.json();
        console.log('Left group successfully:', result);
        return result;

    } catch (error) {
        console.error('Error leaving group:', error);
        throw error;
    }
}

// Expose functions to global scope for onclick handlers
window.getUserGroups = getUserGroups;
window.createGroup = createGroup;
window.updateGroup = updateGroup;
window.deleteGroup = deleteGroup;
window.getGroupDetails = getGroupDetails;
window.leaveGroup = leaveGroup;

console.log('groups.js loaded, all functions exposed to global');
