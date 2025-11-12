// File: app/static/js/page/auth_page.js
// (Full new content)

import { handleSignup, handleLogin } from '../api/auth.js';
// Note: We did not import customAlert because this page has its own showMessage helper

/**
 * Helper function: display a message on the form
 * @param {string} formId - 'login-form' or 'signup-form'
 * @param {string} message - The message to display
 * @param {string} type - 'error' (red) or 'success' (green)
 */
function showMessage(formId, message, type = 'error') {
    // Find the message-box within the specific form
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
 * Wrapper: ensure that the DOM is loaded before executing
 */
document.addEventListener('DOMContentLoaded', () => {

    // === 1. Registration page logic ===
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        // Listen for the submission of the "Register Now" button
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent the form's default POST behavior
            
            const signupButton = document.getElementById('signup-button');
            signupButton.disabled = true;
            signupButton.textContent = 'Registering...'; // Translated

            // Get data from the form
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Client-side validation
            if (!username || !email || !password || !confirmPassword) {
                showMessage('signup-form', 'All fields are required', 'error'); // Translated
                signupButton.disabled = false;
                signupButton.textContent = 'Sign Up Now'; // Translated
                return;
            }
            if (password !== confirmPassword) {
                showMessage('signup-form', 'The two passwords do not match', 'error'); // Translated
                signupButton.disabled = false;
                signupButton.textContent = 'Sign Up Now'; // Translated
                return;
            }

            try {
                // Call the API (from api/auth.js)
                // Make sure the API route is /users/signup
                await handleSignup(username, email, password);
                showMessage('signup-form', 'Account registered successfully! Redirecting to login...', 'success'); // Translated
                setTimeout(() => {
                    window.location.href = '/login'; // Registration is successful, redirect to login
                }, 2000);
            } catch (error) {
                showMessage('signup-form', error.message, 'error');
                signupButton.disabled = false;
                signupButton.textContent = 'Sign Up Now'; // Translated
            }
        });

        // Listen for the "Go to Login" link (using the ID we added)
        const loginLink = document.getElementById('login-redirect-link');
        if (loginLink) {
            loginLink.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent the default jump of the <a> tag
                window.location.href = '/login';
            });
        }
    }

    // === 2. Login page logic ===
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        // Listen for the submission of the "Login Now" button
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent the form's default POST behavior
            
            const loginButton = document.getElementById('login-button');
            loginButton.disabled = true;
            loginButton.textContent = 'Logging in...'; // Translated

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                // Call the API (from api/auth.js)
                // Make sure the API route is /token
                await handleLogin(email, password);
                showMessage('login-form', 'Login successful! Redirecting...', 'success'); // Translated
                window.location.href = '/home'; // Login is successful, redirect to the home page
            } catch (error) {
                showMessage('login-form', error.message, 'error');
                loginButton.disabled = false;
                loginButton.textContent = 'Log In Now'; // Translated
            }
        });

        // Listen for the "Go to Register" link (using the ID we added)
        const signupLink = document.getElementById('signup-redirect-link');
        if (signupLink) {
            signupLink.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent the default jump of the <a> tag
                window.location.href = '/signup';
            });
        }
    }
});