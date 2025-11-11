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

        console.log('Getting invitation list...');
        const response = await fetch('/invitations/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('邀请API响应状态:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('获取邀请列表失败:', response.status, errorText);
            throw new Error(`获取邀请列表失败: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('获取到的邀请数据:', data);
        console.log('邀请数量:', Array.isArray(data) ? data.length : '数据不是数组');
        
        return data;
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

        console.log('发送邀请:', { groupId, inviteeEmail });
        
        const requestBody = {
            invitee_email: inviteeEmail  // 确保字段名与后端期望一致
        };
        
        console.log('请求体:', requestBody);

        const response = await fetch(`/groups/${groupId}/invite`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('邀请API响应状态:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('邀请发送成功:', result);
            showCustomAlert('邀请发送成功！');
            return result;
        } else {
            const errorData = await response.json();
            console.error('邀请发送失败:', response.status, errorData);
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
