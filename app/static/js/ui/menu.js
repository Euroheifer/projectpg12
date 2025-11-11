// Menu.js - Menu and user interface related functions
// Date: 2025-11-10
// Version: 2025.11.10.001

// Toggle user dropdown menu
function toggleUserMenu() {
    const dropdown = document.getElementById('logout-dropdown');
    const caretIcon = document.getElementById('caret-icon');
    
    if (dropdown) {
        dropdown.classList.toggle('hidden');
        // Toggle caret icon rotation
        if (caretIcon) {
            if (dropdown.classList.contains('hidden')) {
                caretIcon.classList.remove('rotate-180');
            } else {
                caretIcon.classList.add('rotate-180');
            }
        }
    }
}

// Close user menu (used when clicking outside)
function closeUserMenu() {
    const dropdown = document.getElementById('logout-dropdown');
    const caretIcon = document.getElementById('caret-icon');
    
    if (dropdown) {
        dropdown.classList.add('hidden');
        if (caretIcon) {
            caretIcon.classList.remove('rotate-180');
        }
    }
}

// Display user information
function displayUserInfo(userInfo) {
    const userDisplay = document.getElementById('user-display');
    if (userDisplay && userInfo) {
        userDisplay.textContent = userInfo.username || 'User';
    }
}

// Handle my profile
function handleMyProfile() {
    // TODO: Implement profile page logic
    console.log('My Profile clicked');
    showCustomAlert('Profile page will be implemented in the future', 'info');
}

// Handle back to dashboard
function handleBackToDashboard() {
    window.location.href = '/home';
}

// Show logout confirmation
function showLogoutConfirmation() {
    const modal = document.getElementById('logout-confirm-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Close logout confirmation
function closeLogoutConfirm() {
    const modal = document.getElementById('logout-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Confirm logout
async function confirmLogout() {
    try {
        // Clear local storage
        localStorage.removeItem('access_token');
        
        // Redirect to login page
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout error:', error);
        showCustomAlert('Logout failed, please try again', 'error');
    }
}

// Custom alert popup
function showCustomAlert(message, type = 'info') {
    const modal = document.getElementById('custom-alert-modal');
    const messageElement = document.getElementById('alert-message');
    
    if (modal && messageElement) {
        // Set message
        messageElement.textContent = message;
        
        // Set color based on type
        if (type === 'success') {
            messageElement.className = 'text-lg font-medium mb-4 text-center text-green-600';
        } else if (type === 'error') {
            messageElement.className = 'text-lg font-medium mb-4 text-center text-red-600';
        } else {
            messageElement.className = 'text-lg font-medium mb-4 text-center text-blue-600';
        }
        
        // Show modal
        modal.classList.remove('hidden');
    }
}

// Close custom alert
function closeCustomAlert() {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Get current user information
async function getCurrentUser() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.warn('Authentication token not found');
            return null;
        }

        const response = await fetch('/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const userInfo = await response.json();
            displayUserInfo(userInfo);
            return userInfo;
        } else {
            console.error('Failed to get user information, status code:', response.status);
            return null;
        }
    } catch (error) {
        console.error('Failed to get user information:', error);
        return null;
    }
}

// Initialize menu
async function initializeMenu() {
    console.log('Menu initialization starting...');
    
    // Get current user information
    const userInfo = await getCurrentUser();
    
    if (!userInfo) {
        console.log('User not logged in, redirecting to login page');
        window.location.href = '/login';
        return;
    }
    
    console.log('Menu initialization complete, current user:', userInfo);
}

// Bind event listeners
function bindEventListeners() {
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('logout-dropdown');
        const userButton = document.getElementById('user-display-button');
        
        if (dropdown && userButton) {
            if (!dropdown.contains(event.target) && !userButton.contains(event.target)) {
                closeUserMenu();
            }
        }
    });
    
    // Close modal when clicking on backdrop
    document.addEventListener('click', function(event) {
        // Custom alert modal
        const customAlertModal = document.getElementById('custom-alert-modal');
        if (customAlertModal && event.target === customAlertModal) {
            closeCustomAlert();
        }
        
        // Logout confirmation modal
        const logoutModal = document.getElementById('logout-confirm-modal');
        if (logoutModal && event.target === logoutModal) {
            closeLogoutConfirm();
        }
    });
    
    // ESC key to close modals
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeCustomAlert();
            closeLogoutConfirm();
            closeUserMenu();
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Menu DOM loaded, starting initialization...');
    
    // Bind event listeners
    bindEventListeners();
    
    // Initialize menu
    initializeMenu();
});

// Expose functions to global scope for onclick handlers
window.toggleUserMenu = toggleUserMenu;
window.handleMyProfile = handleMyProfile;
window.handleBackToDashboard = handleBackToDashboard;
window.showLogoutConfirmation = showLogoutConfirmation;
window.closeLogoutConfirm = closeLogoutConfirm;
window.confirmLogout = confirmLogout;
window.closeCustomAlert = closeCustomAlert;

console.log('Menu module loaded, all functions exposed to global scope');