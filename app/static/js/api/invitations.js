import { getAuthToken } from '../ui/utils.js';

/**
 * API 调用 (READ): 获取我的待处理邀请
 * 对应: @app.get("/invitations/me", ...)
 */
export async function getPendingInvitations() {
    const token = getAuthToken();
    const response = await fetch('/invitations/me', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        throw new Error('获取邀请列表失败');
    }
    return await response.json();
}

/**
 * API 调用 (UPDATE): 响应邀请 (接受/拒绝)
 * 对应: @app.post("/invitations/{invitation_id}/respond", ...)
 */
export async function respondToInvitation(invitationId, action) {
    const token = getAuthToken();
    const response = await fetch(`/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        // schema.InvitationAction
        body: JSON.stringify({ "action": action }) // "action" 必须是 "accept" 或 "reject"
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '响应邀请失败');
    }
    return await response.json();
}