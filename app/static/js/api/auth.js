// /static/js/api/auth.js
// Version: 2025.11.06
const JS_CACHE_VERSION = '2025.11.06.001';

// ----------------------------------------------------------------
// --- This is a complete, fixed file. Please copy and replace your old file.---
// ----------------------------------------------------------------

// --- Import getAuthToken, because all real API calls need it ---
import { getAuthToken } from '../ui/utils.js';

/**
 * API call: Registration (from user.js)
 * API route: @app.post("/users/signup", ...)
 */
export async function handleSignup(username, email, password) {
    const response = await fetch('/users/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username,
            email,
            password
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
    }

    return response.json();
}

/**
 * API call: Login (from user.js)
 * API route: @app.post("/token", ...)
 */
export async function handleLogin(email, password) {
    const response = await fetch('/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            username: email,  // For OAuth2PasswordRequestForm compatibility
            password: password
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
    }

    const tokenData = await response.json();
    // Key: Save Token in local storage!
    localStorage.setItem('access_token', tokenData.access_token);
    return tokenData;
}

/**
 * API call: Logout (from home.js)
 * API route: @app.post("/auth/logout", ...)
 */
export async function handleLogout() {
    const token = getAuthToken();
    if (!token) {
        console.warn('No token found, redirecting to login');
        window.location.href = '/login';
        return;
    }

    const response = await fetch('/auth/logout', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        console.error('Logout request failed');
    }

    // Clear local storage
    localStorage.removeItem('access_token');
    // Redirect to login
    window.location.href = '/login';
}

/**
 * API call: Get current user (from home.js)
 * API route: @app.get("/me", ...)
 */
export async function getCurrentUser() {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found');
    }

    const response = await fetch('/me', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Unable to verify user identity');
    }

    return response.json();
}

/**
 * Clear local storage (from home.js)
 */
export function clearLocalStorage() {
    localStorage.removeItem('access_token');
}

// ----------------------------------------------------------------
// --- Group data related API calls (Fixed - removed MOCK) ---
// ----------------------------------------------------------------

/**
 * API call: Get group data (real version)
 * API route: @app.get("/groups/{group_id}", ...)
 */
export async function getGroupData(groupId) {
    const token = getAuthToken();
    if (!token) throw new Error('No authentication token found, please login again');

    console.log('Requesting group data, URL:', `/groups/${groupId}`);

    const response = await fetch(`/groups/${groupId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    console.log('API response status:', response.status, response.statusText);

    // First check response content type
    const contentType = response.headers.get('content-type');
    console.log('Response content type:', contentType);

    if (!response.ok) {
        let errorText = '';
        try {
            errorText = await response.text();
            console.error('Group data API error:', response.status, errorText);
        } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            errorText = 'Unknown error';
        }

        if (response.status === 403) {
            throw new Error('You do not have permission to access this group');
        } else if (response.status === 404) {
            throw new Error('Group not found');
        } else {
            throw new Error(`Failed to get group data: ${response.status} - ${errorText}`);
        }
    }

    let data;
    try {
        data = await response.json();
        console.log('Group data received:', data);
    } catch (parseError) {
        console.error('Failed to parse group data:', parseError);
        throw new Error('Invalid group data format received');
    }

    return data;
}

// Expose all functions to global scope for onclick handlers
window.handleSignup = handleSignup;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.getCurrentUser = getCurrentUser;
window.getGroupData = getGroupData;

console.log('auth.js loaded, all functions exposed to global');
