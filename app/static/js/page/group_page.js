// 这是一个占位符入口，您可以从这里开始构建群组详情页的逻辑
// 它会加载和 `home_page.js` 相同的辅助函数

import { getAuthToken, centsToAmountString, customAlert, closeCustomAlert } from '../ui/utils.js';
import { getCurrentUser, handleLogout, clearAuthData } from '../api/auth.js';
// TODO: import { getGroupMembers, getGroupExpenses } from '../api/groups.js';

let currentUser = null;
let currentGroupId = null;

/**
 * 页面加载时的总入口
 */
async function initializePage() {
    // 1. 验证用户身份
    try {
        currentUser = await getCurrentUser(getAuthToken());
        if (!currentUser) {
            window.location.href = '/login';
            return;
        }
    } catch (error) {
        clearAuthData();
        window.location.href = '/login';
        return;
    }

    // 2. 填充通用 UI (导航栏)
    document.getElementById('user-display').textContent = currentUser.username;

    // 3. 获取 URL 中的 Group ID
    const params = new URLSearchParams(window.location.search);
    currentGroupId = params.get('id');

    if (!currentGroupId) {
        customAlert('错误', '未在 URL 中找到群组 ID');
        setTimeout(() => window.location.href = '/home', 1500);
        return;
    }

    // 4. 加载此页面特定的动态内容
    console.log(`正在为群组 ${currentGroupId} 加载数据...`);
    // TODO: 在 api/groups.js 中创建这些函数并在这里调用它们
    // const members = await getGroupMembers(currentGroupId);
    // renderMembers(members);
    // const expenses = await getGroupExpenses(currentGroupId);
    // renderExpenses(expenses);

    // 5. 绑定所有静态按钮的事件
    // (绑定导航栏、弹窗等... 逻辑与 home_page.js 类似)
    document.getElementById('user-display-button').addEventListener('click', () => { /* TODO: toggleUserMenu */ });
    // ...
}

// 页面加载时执行
document.addEventListener('DOMContentLoaded', initializePage);