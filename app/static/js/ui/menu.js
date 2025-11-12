// file: app/static/js/ui/menu.js

// 保护性检查 - 防止重复声明
if (typeof window.menuInitialized === 'undefined') {
    window.menuInitialized = true;

    let currentUser = null;
    let isMenuOpen = false;

    // 初始化用户信息
    async function initializeUser() {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                handleUnauthenticated();
                return;
            }

            const response = await fetch('/me', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                currentUser = await response.json();
                updateUserUI();
            } else {
                handleUnauthenticated();
            }
        } catch (error) {
            console.error('Failed to initialize user information:', error); // Translated
            handleUnauthenticated();
        }
    }

    function updateUserUI() {
        const userDisplay = document.getElementById('user-display');
        if (userDisplay && currentUser) {
            userDisplay.textContent = currentUser.username || currentUser.email;
        }
    }

    function handleUnauthenticated() {
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) {
            userDisplay.textContent = 'Not logged in'; // Translated
        }
    }

    // 切换用户菜单
    function toggleUserMenu() {
        isMenuOpen = !isMenuOpen;
        const dropdown = document.getElementById('logout-dropdown');
        const caretIcon = document.getElementById('caret-icon');

        if (dropdown && caretIcon) {
            if (isMenuOpen) {
                dropdown.classList.remove('hidden');
                caretIcon.classList.add('rotate-180');
            } else {
                dropdown.classList.add('hidden');
                caretIcon.classList.remove('rotate-180');
            }
        }
    }

    // 显示退出确认
    function showLogoutConfirmation() {
        toggleUserMenu();
        const modal = document.getElementById('logout-confirm-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    // 关闭退出确认
    function closeLogoutConfirm() {
        const modal = document.getElementById('logout-confirm-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // 确认退出
    async function confirmLogout() {
        closeLogoutConfirm();
        const token = localStorage.getItem('access_token');

        try {
            if (token) {
                await fetch('/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        } catch (error) {
            console.error('Logout request failed:', error); // Translated
        } finally {
            localStorage.removeItem('access_token');
            localStorage.removeItem('current_user');
            currentUser = null;

            showCustomAlert('Logout successful, redirecting...', false); // Translated
            setTimeout(() => {
                window.location.href = '/login';
            }, 1000);
        }
    }

    // 我的资料
    function handleMyProfile() {
        console.log('Redirecting to My Profile page'); // Translated
        // window.location.href = '/profile';
    }

    // 返回主页
    function handleBackToDashboard() {
        window.location.href = '/home';
    }

    // 显示自定义提示
    function showCustomAlert(message, showConfirmButton = true) {
        const alertModal = document.getElementById('custom-alert-modal');
        const alertMessage = document.getElementById('alert-message');
        const alertButton = document.querySelector('#custom-alert-modal button');

        if (alertModal && alertMessage && alertButton) {
            alertMessage.textContent = message;

            if (showConfirmButton) {
                alertButton.style.display = 'block';
            } else {
                alertButton.style.display = 'none';
                setTimeout(() => {
                    closeCustomAlert();
                }, 800);
            }

            alertModal.classList.remove('hidden');
        }
    }

    // 关闭自定义提示
    function closeCustomAlert() {
        const alertModal = document.getElementById('custom-alert-modal');
        if (alertModal) {
            alertModal.classList.add('hidden');
        }
    }

    // 页面加载时初始化
    document.addEventListener('DOMContentLoaded', function () {
        console.log('menu.js: Initializing...'); // Translated
        initializeUser();

        // 点击页面其他地方关闭菜单
        document.addEventListener('click', function (event) {
            const userMenuContainer = document.getElementById('user-menu-container');
            const logoutDropdown = document.getElementById('logout-dropdown');
            const caretIcon = document.getElementById('caret-icon');

            if (userMenuContainer && logoutDropdown && caretIcon && 
                !userMenuContainer.contains(event.target)) {
                logoutDropdown.classList.add('hidden');
                caretIcon.classList.remove('rotate-180');
                isMenuOpen = false;
            }
        });
    });

    // ！！！重要：全局暴露必须在 if 语句内部 ！！！
    window.initializeUser = initializeUser;
    window.toggleUserMenu = toggleUserMenu;
    window.showLogoutConfirmation = showLogoutConfirmation;
    window.closeLogoutConfirm = closeLogoutConfirm;
    window.confirmLogout = confirmLogout;
    window.handleMyProfile = handleMyProfile;
    window.handleBackToDashboard = handleBackToDashboard;
    window.showCustomAlert = showCustomAlert;
    window.closeCustomAlert = closeCustomAlert;

    console.log('menu.js: All functions exposed to global scope'); // Translated

} else {
    console.warn('menu.js has already been initialized, skipping duplicate execution'); // Translated
}