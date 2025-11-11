// File: app/static/js/page/auth_page.js
// (Complete new content)

import { handleSignup, handleLogin } from '../api/auth.js';
// Note: We did not import customAlert because this page has its own showMessage helper

/**
 * Helper function: Display message on form
 * @param {string} formId - 'login-form' or 'signup-form'
 * @param {string} message - Message to display
 * @param {string} type - 'error' (red) or 'success' (green)
 */
function showMessage(formId, message, type = 'error') {
    // Find message-box within specific form
    const messageBox = document.querySelector(`#${formId} #message-box`);
    if (!messageBox) return;

    messageBox.textContent = message;
    messageBox.className = `p-3 mb-4 rounded-lg text-sm text-center ${
        type === 'error'
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
    }`;
    messageBox.classList.remove('hidden');
}

/**
 * Wrapper: Ensure DOM is loaded before execution
 */
document.addEventListener('DOMContentLoaded', () => {

    // === 1. Registration page logic ===
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        // Listen to "Sign Up Now" button submit
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent form's default POST behavior
            
            const signupButton = document.getElementById('signup-button');
            signupButton.disabled = true;
            signupButton.textContent = 'Signing up...';

            // Get data from form
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Client-side validation
            if (!username || !email || !password || !confirmPassword) {
                showMessage('signup-form', 'All fields are required', 'error');
                signupButton.disabled = false;
                signupButton.textContent = 'Sign Up Now';
                return;
            }
            if (password !== confirmPassword) {
                showMessage('signup-form', 'Passwords do not match', 'error');
                signupButton.disabled = false;
                signupButton.textContent = 'Sign Up Now';
                return;
            }

            try {
                // Call API (from api/auth.js)
                // Ensure API route is /users/signup
                await handleSignup(username, email, password);
                showMessage('signup-form', 'Account created successfully! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = '/login'; // Registration successful, redirect to login
                }, 2000);
            } catch (error) {
                showMessage('signup-form', error.message, 'error');
                signupButton.disabled = false;
                signupButton.textContent = 'Sign Up Now';
            }
        });

        // Listen to "Go to Login" link (using ID we added)
        const loginLink = document.getElementById('login-redirect-link');
        if (loginLink) {
            loginLink.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent <a> tag's default redirect
                window.location.href = '/login';
            });
        }
    }

    // === 2. Login page logic ===
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        // Listen to "Login Now" button submit
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent form's default POST behavior
            
            const loginButton = document.getElementById('login-button');
            loginButton.disabled = true;
            loginButton.textContent = 'Logging in...';

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                // Call API (from api/auth.js)
                // Ensure API route is /token
                await handleLogin(email, password);
                showMessage('login-form', 'Login successful! Redirecting...', 'success');
                window.location.href = '/home'; // Login successful, redirect to home
            } catch (error) {
                showMessage('login-form', error.message, 'error');
                loginButton.disabled = false;
                loginButton.textContent = 'Login Now';
            }
        });

        // Listen to "Go to Registration" link (using ID we added)
        const signupLink = document.getElementById('signup-redirect-link');
        if (signupLink) {
            signupLink.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent <a> tag's default redirect
                window.location.href = '/signup';
            });
        }
    }
});