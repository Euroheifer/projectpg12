/**
 * 邀请功能模块
 * 处理群组邀请的发送、接收、响应和管理
 */

class InvitationManager {
    constructor() {
        this.apiBase = '/api';
        this.invitations = [];
        this.pendingInvitations = [];
        this.init();
    }

    /**
     * 初始化邀请管理器
     */
    init() {
        this.bindEvents();
        this.loadInvitations();
        this.loadPendingInvitations();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 邀请相关按钮事件
        document.addEventListener('click', (e) => {
            if (e.target.matches('.send-invitation-btn')) {
                this.showSendInvitationModal(e.target.dataset.groupId);
            }
            if (e.target.matches('.accept-invitation-btn')) {
                this.acceptInvitation(e.target.dataset.invitationId);
            }
            if (e.target.matches('.reject-invitation-btn')) {
                this.rejectInvitation(e.target.dataset.invitationId);
            }
            if (e.target.matches('.view-invitation-history-btn')) {
                this.showInvitationHistory();
            }
        });

        // 表单提交事件
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#sendInvitationForm')) {
                e.preventDefault();
                this.handleSendInvitation(e.target);
            }
        });
    }

    /**
     * 发送群组邀请
     * @param {Object} invitationData 邀请数据
     * @returns {Promise<Object>} 发送的邀请信息
     */
    async sendInvitation(invitationData) {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/groups/${invitationData.group_id}/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({
                    email: invitationData.email,
                    message: invitationData.message
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '发送邀请失败');
            }

            const newInvitation = await response.json();
            this.showSuccess('邀请发送成功');
            return newInvitation;
        } catch (error) {
            console.error('发送邀请失败:', error);
            this.showError(error.message || '发送邀请失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 批量发送邀请
     * @param {string} groupId 群组ID
     * @param {Array} emails 邮箱地址数组
     * @param {string} message 邀请消息
     * @returns {Promise<Array>} 发送的邀请列表
     */
    async sendBatchInvitations(groupId, emails, message) {
        try {
            this.showLoading(true);
            const results = [];
            const errors = [];

            for (const email of emails) {
                try {
                    const invitation = await this.sendInvitation({
                        group_id: groupId,
                        email: email,
                        message: message
                    });
                    results.push(invitation);
                } catch (error) {
                    errors.push({ email, error: error.message });
                }
            }

            if (errors.length > 0) {
                this.showError(`部分邀请发送失败: ${errors.map(e => e.email).join(', ')}`);
            }

            if (results.length > 0) {
                this.showSuccess(`成功发送 ${results.length} 个邀请`);
            }

            return { success: results, errors };
        } catch (error) {
            console.error('批量发送邀请失败:', error);
            this.showError('批量发送邀请失败');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 获取待处理邀请列表
     * @returns {Promise<Array>} 待处理邀请列表
     */
    async loadPendingInvitations() {
        try {
            const response = await fetch(`${this.apiBase}/invitations/pending`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.pendingInvitations = data.invitations || data;
            this.renderPendingInvitations();
            return this.pendingInvitations;
        } catch (error) {
            console.error('获取待处理邀请失败:', error);
            this.showError('获取待处理邀请失败');
            throw error;
        }
    }

    /**
     * 获取邀请历史记录
     * @returns {Promise<Array>} 邀请历史记录
     */
    async loadInvitationHistory() {
        try {
            const response = await fetch(`${this.apiBase}/invitations/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.invitations = data.invitations || data;
            return this.invitations;
        } catch (error) {
            console.error('获取邀请历史失败:', error);
            this.showError('获取邀请历史失败');
            throw error;
        }
    }

    /**
     * 接受邀请
     * @param {string} invitationId 邀请ID
     * @returns {Promise<boolean>} 是否接受成功
     */
    async acceptInvitation(invitationId) {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/invitations/${invitationId}/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '接受邀请失败');
            }

            // 从待处理邀请列表中移除
            this.pendingInvitations = this.pendingInvitations.filter(inv => inv.id !== invitationId);
            this.renderPendingInvitations();
            this.showSuccess('邀请接受成功');
            return true;
        } catch (error) {
            console.error('接受邀请失败:', error);
            this.showError(error.message || '接受邀请失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 拒绝邀请
     * @param {string} invitationId 邀请ID
     * @returns {Promise<boolean>} 是否拒绝成功
     */
    async rejectInvitation(invitationId) {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/invitations/${invitationId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '拒绝邀请失败');
            }

            // 从待处理邀请列表中移除
            this.pendingInvitations = this.pendingInvitations.filter(inv => inv.id !== invitationId);
            this.renderPendingInvitations();
            this.showSuccess('邀请已拒绝');
            return true;
        } catch (error) {
            console.error('拒绝邀请失败:', error);
            this.showError(error.message || '拒绝邀请失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 取消邀请
     * @param {string} invitationId 邀请ID
     * @returns {Promise<boolean>} 是否取消成功
     */
    async cancelInvitation(invitationId) {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/invitations/${invitationId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '取消邀请失败');
            }

            // 从邀请历史中移除
            this.invitations = this.invitations.filter(inv => inv.id !== invitationId);
            this.showSuccess('邀请已取消');
            return true;
        } catch (error) {
            console.error('取消邀请失败:', error);
            this.showError(error.message || '取消邀请失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 获取邀请详情
     * @param {string} invitationId 邀请ID
     * @returns {Promise<Object>} 邀请详情
     */
    async getInvitationDetail(invitationId) {
        try {
            const response = await fetch(`${this.apiBase}/invitations/${invitationId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('获取邀请详情失败:', error);
            throw error;
        }
    }

    /**
     * 重新发送邀请
     * @param {string} invitationId 邀请ID
     * @returns {Promise<Object>} 重新发送的邀请
     */
    async resendInvitation(invitationId) {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/invitations/${invitationId}/resend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '重新发送邀请失败');
            }

            const resentInvitation = await response.json();
            this.showSuccess('邀请重新发送成功');
            return resentInvitation;
        } catch (error) {
            console.error('重新发送邀请失败:', error);
            this.showError(error.message || '重新发送邀请失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 渲染待处理邀请列表
     */
    renderPendingInvitations() {
        const container = document.getElementById('pendingInvitationsList');
        if (!container) return;

        if (this.pendingInvitations.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无待处理邀请</div>';
            return;
        }

        container.innerHTML = this.pendingInvitations.map(invitation => `
            <div class="invitation-card pending">
                <div class="invitation-info">
                    <h4 class="group-name">${invitation.group_name}</h4>
                    <p class="inviter-info">邀请人: ${invitation.inviter_name}</p>
                    <p class="invitation-message">${invitation.message || '无附加消息'}</p>
                    <span class="invitation-time">${this.formatDate(invitation.created_at)}</span>
                </div>
                <div class="invitation-actions">
                    <button class="btn btn-sm btn-success accept-invitation-btn" data-invitation-id="${invitation.id}">
                        接受
                    </button>
                    <button class="btn btn-sm btn-danger reject-invitation-btn" data-invitation-id="${invitation.id}">
                        拒绝
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * 显示发送邀请模态框
     * @param {string} groupId 群组ID
     */
    showSendInvitationModal(groupId) {
        const modal = this.createModal('发送邀请', `
            <form id="sendInvitationForm" data-group-id="${groupId}">
                <div class="form-group">
                    <label for="inviteEmail">邮箱地址 *</label>
                    <input type="email" id="inviteEmail" name="email" required class="form-control" placeholder="请输入邮箱地址">
                </div>
                <div class="form-group">
                    <label for="inviteMessage">邀请消息</label>
                    <textarea id="inviteMessage" name="message" class="form-control" rows="3" placeholder="请输入邀请消息（可选）"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
                    <button type="submit" class="btn btn-primary">发送邀请</button>
                </div>
            </form>
        `);
        document.body.appendChild(modal);
    }

    /**
     * 显示批量发送邀请模态框
     * @param {string} groupId 群组ID
     */
    showBatchSendInvitationModal(groupId) {
        const modal = this.createModal('批量发送邀请', `
            <form id="batchSendInvitationForm" data-group-id="${groupId}">
                <div class="form-group">
                    <label for="batchInviteEmails">邮箱地址（每行一个）*</label>
                    <textarea id="batchInviteEmails" name="emails" required class="form-control" rows="5" placeholder="请输入多个邮箱地址，每行一个"></textarea>
                </div>
                <div class="form-group">
                    <label for="batchInviteMessage">邀请消息</label>
                    <textarea id="batchInviteMessage" name="message" class="form-control" rows="3" placeholder="请输入邀请消息（可选）"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
                    <button type="submit" class="btn btn-primary">批量发送邀请</button>
                </div>
            </form>
        `);
        document.body.appendChild(modal);
    }

    /**
     * 显示邀请历史记录
     */
    async showInvitationHistory() {
        try {
            await this.loadInvitationHistory();
            const modal = this.createModal('邀请历史记录', `
                <div class="invitation-history">
                    ${this.invitations.map(invitation => `
                        <div class="invitation-card history">
                            <div class="invitation-info">
                                <h4 class="group-name">${invitation.group_name}</h4>
                                <p class="invitee-info">被邀请人: ${invitation.invitee_email}</p>
                                <p class="invitation-status status-${invitation.status}">状态: ${this.getStatusText(invitation.status)}</p>
                                <span class="invitation-time">${this.formatDate(invitation.created_at)}</span>
                            </div>
                            <div class="invitation-actions">
                                ${invitation.status === 'pending' ? `
                                    <button class="btn btn-sm btn-secondary resend-invitation-btn" data-invitation-id="${invitation.id}">
                                        重新发送
                                    </button>
                                    <button class="btn btn-sm btn-danger cancel-invitation-btn" data-invitation-id="${invitation.id}">
                                        取消邀请
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `);
            document.body.appendChild(modal);
        } catch (error) {
            this.showError('加载邀请历史失败');
        }
    }

    /**
     * 处理发送邀请表单提交
     * @param {HTMLFormElement} form 表单元素
     */
    async handleSendInvitation(form) {
        const formData = new FormData(form);
        const invitationData = {
            group_id: form.dataset.groupId,
            email: formData.get('email'),
            message: formData.get('message')
        };

        try {
            await this.sendInvitation(invitationData);
            form.closest('.modal').remove();
        } catch (error) {
            // 错误已在sendInvitation方法中处理
        }
    }

    /**
     * 处理批量发送邀请表单提交
     * @param {HTMLFormElement} form 表单元素
     */
    async handleBatchSendInvitation(form) {
        const formData = new FormData(form);
        const emailsText = formData.get('emails');
        const emails = emailsText.split('\n').filter(email => email.trim());
        const message = formData.get('message');
        const groupId = form.dataset.groupId;

        try {
            await this.sendBatchInvitations(groupId, emails, message);
            form.closest('.modal').remove();
        } catch (error) {
            // 错误已在sendBatchInvitations方法中处理
        }
    }

    /**
     * 获取状态文本
     * @param {string} status 状态码
     * @returns {string} 状态文本
     */
    getStatusText(status) {
        const statusMap = {
            'pending': '待处理',
            'accepted': '已接受',
            'rejected': '已拒绝',
            'expired': '已过期',
            'cancelled': '已取消'
        };
        return statusMap[status] || status;
    }

    /**
     * 创建模态框
     * @param {string} title 标题
     * @param {string} content 内容HTML
     * @returns {HTMLElement} 模态框元素
     */
    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        // 关闭模态框事件
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        return modal;
    }

    /**
     * 获取认证令牌
     * @returns {string} 认证令牌
     */
    getToken() {
        return localStorage.getItem('authToken') || '';
    }

    /**
     * 格式化日期
     * @param {string|Date} date 日期
     * @returns {string} 格式化后的日期字符串
     */
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleString('zh-CN');
    }

    /**
     * 显示加载状态
     * @param {boolean} isLoading 是否加载中
     */
    showLoading(isLoading) {
        const loadingElements = document.querySelectorAll('.loading');
        loadingElements.forEach(el => {
            el.style.display = isLoading ? 'block' : 'none';
        });
    }

    /**
     * 显示成功消息
     * @param {string} message 消息内容
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * 显示错误消息
     * @param {string} message 消息内容
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * 显示通知消息
     * @param {string} message 消息内容
     * @param {string} type 消息类型
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 自动移除通知
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * 搜索邀请记录
     * @param {string} query 搜索关键词
     * @returns {Array} 搜索结果
     */
    searchInvitations(query) {
        if (!query) return this.invitations;
        
        return this.invitations.filter(invitation => 
            invitation.group_name.toLowerCase().includes(query.toLowerCase()) ||
            invitation.invitee_email.toLowerCase().includes(query.toLowerCase()) ||
            (invitation.message && invitation.message.toLowerCase().includes(query.toLowerCase()))
        );
    }

    /**
     * 过滤邀请记录
     * @param {string} status 状态过滤
     * @returns {Array} 过滤后的邀请记录
     */
    filterInvitationsByStatus(status) {
        if (!status || status === 'all') return this.invitations;
        return this.invitations.filter(invitation => invitation.status === status);
    }
}

// 创建全局邀请管理器实例
const invitationManager = new InvitationManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InvitationManager;
}