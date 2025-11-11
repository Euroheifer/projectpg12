// File: app/static/js/page/auth_page.js
// (Complete new content)

import { handleSignup, handleLogin } from '../api/auth.js';
// Note: We didn't import customAlert because this page has its own showMessage helper

/**
 * Helper function: Display messages on the form
 * @param {string} formId - 'login-form' or 'signup-form'
 * @param {string} message - Message to display
 * @param {string} type - 'error' (red) or 'success' (green)
 */
function showMessage(formId, message, type = 'error') {
    // Find the message-box within the specific form
    const messageBox = document.querySelector(`#${formId} #message-box`);
    if (!messageBox) return;

    messageBox.className = `p-3 mb-4 rounded-lg text-sm text-center ${type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
    messageBox.textContent = message;
    messageBox.classList.remove('hidden');
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {

    // === 1. Registration page logic ===
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        // Listen for "Register Now" button submission
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent form's default POST behavior

            const signupButton = document.getElementById('signup-button');
            signupButton.disabled = true;
            signupButton.textContent = 'Registering...';

            // Get data from form
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const confirmPassword = document.getElementById('confirm-password').value.trim();

            // Client-side validation
            if (!username || !email || !password || !confirmPassword) {
                showMessage('signup-form', 'All fields are required', 'error');
                signupButton.disabled = false;
                signupButton.textContent = 'Register Now';
                return;
            }

            if (password !== confirmPassword) {
                showMessage('signup-form', 'Passwords do not match', 'error');
                signupButton.disabled = false;
                signupButton.textContent = 'Register Now';
                return;
            }

            try {
                // Call API (from api/auth.js)
                // Make sure API route is /users/signup
                await handleSignup(username, email, password);
                showMessage('signup-form', 'Account registered successfully! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = '/login'; // Registration successful, redirect to login
                }, 2000);
            } catch (error) {
                console.error('Registration error:', error);
                showMessage('signup-form', error.message || 'Registration failed, please try again', 'error');
                signupButton.disabled = false;
                signupButton.textContent = 'Register Now';
            }
        });

        // Listen for "Go to Login" link (using the ID we added)
        const loginLink = document.getElementById('login-redirect-link');
        if (loginLink) {
            loginLink.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent <a> tag's default jump
                window.location.href = '/login';
            });
        }
    }

    // === 2. Login page logic ===
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        // Listen for "Sign In Now" button submission
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent form's default POST behavior

            const loginButton = document.getElementById('login-button');
            loginButton.disabled = true;
            loginButton.textContent = 'Signing in...';

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();

            try {
                // Call API (from api/auth.js)
                // Make sure API route is /token
                await handleLogin(email, password);
                showMessage('login-form', 'Login successful! Redirecting...', 'success');
                window.location.href = '/home'; // Login successful, redirect to home
            } catch (error) {
                console.error('Login error:', error);
                showMessage('login-form', error.message || 'Login failed, please check your credentials', 'error');
                loginButton.disabled = false;
                loginButton.textContent = 'Sign In Now';
            }
        });

        // Listen for "Go to Registration" link (using the ID we added)
        const signupLink = document.getElementById('signup-redirect-link');
        if (signupLink) {
            signupLink.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent <a> tag's default jump
                window.location.href = '/signup';
            });
        }
    }
});