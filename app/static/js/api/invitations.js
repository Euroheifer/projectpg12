// file: app/static/js/api/invitations.js
// 防止缓存版本: 2025.11.06
const JS_CACHE_VERSION = '2025.11.06.001';

import { showCustomAlert } from '../ui/utils.js';

/**
 * 获取待处理的邀请列表
 */
export async function getPendingInvitations() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('用户未登录');
        }

        const response = await fetch('/invitations/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('获取邀请列表失败');
        }

        return await response.json();
    } catch (error) {
        console.error('获取邀请列表错误:', error);
        throw error;
    }
}

/**
 * 接受群组邀请
 */
export async function acceptInvitation(invitationId) {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('用户未登录');
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
            showCustomAlert('已成功加入群组！', false);
            // 延迟刷新页面，让用户看到成功消息
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            return true;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || '接受邀请失败');
        }
    } catch (error) {
        console.error('接受邀请错误:', error);
        showCustomAlert(error.message || '接受邀请失败，请重试');
        return false;
    }
}

/**
 * 拒绝群组邀请
 */
export async function declineInvitation(invitationId) {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('用户未登录');
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
            showCustomAlert('已拒绝邀请', false);
            // 延迟刷新页面，让用户看到成功消息
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            return true;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || '拒绝邀请失败');
        }
    } catch (error) {
        console.error('拒绝邀请错误:', error);
        showCustomAlert(error.message || '拒绝邀请失败，请重试');
        return false;
    }
}

/**
 * 发送群组邀请
 */
export async function sendInvitation(groupId, inviteeEmail) {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('用户未登录');
        }

        const response = await fetch(`/groups/${groupId}/invite`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                invitee_email: inviteeEmail  // 注意字段名是 invitee_email
            })
        });

        if (response.ok) {
            showCustomAlert('邀请发送成功！');
            return await response.json();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || '发送邀请失败');
        }
    } catch (error) {
        console.error('发送邀请错误:', error);
        showCustomAlert(error.message || '发送邀请失败，请重试');
        return false;
    }
}

// 暴露函数到全局，供HTML中的onclick调用
window.acceptInvitation = acceptInvitation;
window.declineInvitation = declineInvitation;
window.sendInvitation = sendInvitation;
window.getPendingInvitations = getPendingInvitations;
