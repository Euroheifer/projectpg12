/**
 * 成员管理功能模块
 * 处理群组成员的管理、角色分配和权限控制
 */

class MemberManager {
    constructor() {
        this.apiBase = '/api';
        this.members = [];
        this.currentGroupId = null;
        this.init();
    }

    /**
     * 初始化成员管理器
     */
    init() {
        this.bindEvents();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 成员管理相关按钮事件
        document.addEventListener('click', (e) => {
            if (e.target.matches('.add-member-btn')) {
                this.showAddMemberModal(e.target.dataset.groupId);
            }
            if (e.target.matches('.remove-member-btn')) {
                this.removeMember(e.target.dataset.memberId, e.target.dataset.groupId);
            }
            if (e.target.matches('.change-role-btn')) {
                this.showChangeRoleModal(e.target.dataset.memberId, e.target.dataset.groupId);
            }
            if (e.target.matches('.view-member-btn')) {
                this.viewMemberDetail(e.target.dataset.memberId);
            }
            if (e.target.matches('.promote-member-btn')) {
                this.promoteMember(e.target.dataset.memberId, e.target.dataset.groupId);
            }
            if (e.target.matches('.demote-member-btn')) {
                this.demoteMember(e.target.dataset.memberId, e.target.dataset.groupId);
            }
            if (e.target.matches('.ban-member-btn')) {
                this.banMember(e.target.dataset.memberId, e.target.dataset.groupId);
            }
            if (e.target.matches('.unban-member-btn')) {
                this.unbanMember(e.target.dataset.memberId, e.target.dataset.groupId);
            }
        });

        // 表单提交事件
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#addMemberForm')) {
                e.preventDefault();
                this.handleAddMember(e.target);
            }
            if (e.target.matches('#changeRoleForm')) {
                e.preventDefault();
                this.handleChangeRole(e.target);
            }
            if (e.target.matches('#batchAddMembersForm')) {
                e.preventDefault();
                this.handleBatchAddMembers(e.target);
            }
        });
    }

    /**
     * 加载群组成员列表
     * @param {string} groupId 群组ID
     * @returns {Promise<Array>} 成员列表
     */
    async loadMembers(groupId) {
        try {
            this.currentGroupId = groupId;
            this.showLoading(true);
            
            const response = await fetch(`${this.apiBase}/groups/${groupId}/members`, {
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
            this.members = data.members || data;
            this.renderMembersList();
            return this.members;
        } catch (error) {
            console.error('加载群组成员失败:', error);
            this.showError('加载群组成员失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 添加群组成员
     * @param {Object} memberData 成员数据
     * @returns {Promise<Object>} 添加的成员信息
     */
    async addMember(memberData) {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/groups/${memberData.group_id}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({
                    user_id: memberData.user_id,
                    email: memberData.email,
                    role: memberData.role || 'member'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '添加成员失败');
            }

            const newMember = await response.json();
            this.members.unshift(newMember);
            this.renderMembersList();
            this.showSuccess('成员添加成功');
            return newMember;
        } catch (error) {
            console.error('添加成员失败:', error);
            this.showError(error.message || '添加成员失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 批量添加成员
     * @param {string} groupId 群组ID
     * @param {Array} membersData 成员数据数组
     * @returns {Promise<Object>} 添加结果
     */
    async batchAddMembers(groupId, membersData) {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/groups/${groupId}/members/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({ members: membersData })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '批量添加成员失败');
            }

            const result = await response.json();
            await this.loadMembers(groupId);
            this.showSuccess(`成功添加 ${result.success_count} 个成员`);
            return result;
        } catch (error) {
            console.error('批量添加成员失败:', error);
            this.showError(error.message || '批量添加成员失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 移除群组成员
     * @param {string} memberId 成员ID
     * @param {string} groupId 群组ID
     * @returns {Promise<boolean>} 是否移除成功
     */
    async removeMember(memberId, groupId) {
        try {
            if (!confirm('确定要移除这个成员吗？')) {
                return false;
            }

            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/groups/${groupId}/members/${memberId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '移除成员失败');
            }

            // 从本地成员列表中移除
            this.members = this.members.filter(m => m.id !== memberId);
            this.renderMembersList();
            this.showSuccess('成员移除成功');
            return true;
        } catch (error) {
            console.error('移除成员失败:', error);
            this.showError(error.message || '移除成员失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 更改成员角色
     * @param {string} memberId 成员ID
     * @param {string} groupId 群组ID
     * @param {string} newRole 新角色
     * @returns {Promise<Object>} 更新后的成员信息
     */
    async changeMemberRole(memberId, groupId, newRole) {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/groups/${groupId}/members/${memberId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '更改角色失败');
            }

            const updatedMember = await response.json();
            
            // 更新本地成员列表
            const index = this.members.findIndex(m => m.id === memberId);
            if (index !== -1) {
                this.members[index] = updatedMember;
            }
            
            this.renderMembersList();
            this.showSuccess('角色更改成功');
            return updatedMember;
        } catch (error) {
            console.error('更改角色失败:', error);
            this.showError(error.message || '更改角色失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 提升成员为管理员
     * @param {string} memberId 成员ID
     * @param {string} groupId 群组ID
     * @returns {Promise<Object>} 更新后的成员信息
     */
    async promoteMember(memberId, groupId) {
        return this.changeMemberRole(memberId, groupId, 'admin');
    }

    /**
     * 降级成员为普通成员
     * @param {string} memberId 成员ID
     * @param {string} groupId 群组ID
     * @returns {Promise<Object>} 更新后的成员信息
     */
    async demoteMember(memberId, groupId) {
        return this.changeMemberRole(memberId, groupId, 'member');
    }

    /**
     * 封禁成员
     * @param {string} memberId 成员ID
     * @param {string} groupId 群组ID
     * @returns {Promise<Object>} 更新后的成员信息
     */
    async banMember(memberId, groupId) {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/groups/${groupId}/members/${memberId}/ban`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '封禁成员失败');
            }

            const bannedMember = await response.json();
            
            // 更新本地成员列表
            const index = this.members.findIndex(m => m.id === memberId);
            if (index !== -1) {
                this.members[index] = bannedMember;
            }
            
            this.renderMembersList();
            this.showSuccess('成员已封禁');
            return bannedMember;
        } catch (error) {
            console.error('封禁成员失败:', error);
            this.showError(error.message || '封禁成员失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 解除成员封禁
     * @param {string} memberId 成员ID
     * @param {string} groupId 群组ID
     * @returns {Promise<Object>} 更新后的成员信息
     */
    async unbanMember(memberId, groupId) {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/groups/${groupId}/members/${memberId}/unban`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '解除封禁失败');
            }

            const unbannedMember = await response.json();
            
            // 更新本地成员列表
            const index = this.members.findIndex(m => m.id === memberId);
            if (index !== -1) {
                this.members[index] = unbannedMember;
            }
            
            this.renderMembersList();
            this.showSuccess('成员已解除封禁');
            return unbannedMember;
        } catch (error) {
            console.error('解除封禁失败:', error);
            this.showError(error.message || '解除封禁失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 获取成员详情
     * @param {string} memberId 成员ID
     * @returns {Promise<Object>} 成员详情
     */
    async getMemberDetail(memberId) {
        try {
            const response = await fetch(`${this.apiBase}/members/${memberId}`, {
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
            console.error('获取成员详情失败:', error);
            throw error;
        }
    }

    /**
     * 搜索群组成员
     * @param {string} query 搜索关键词
     * @returns {Array} 搜索结果
     */
    searchMembers(query) {
        if (!query) return this.members;
        
        return this.members.filter(member => 
            member.name.toLowerCase().includes(query.toLowerCase()) ||
            member.email.toLowerCase().includes(query.toLowerCase()) ||
            member.role.toLowerCase().includes(query.toLowerCase())
        );
    }

    /**
     * 按角色过滤成员
     * @param {string} role 角色过滤
     * @returns {Array} 过滤后的成员列表
     */
    filterMembersByRole(role) {
        if (!role || role === 'all') return this.members;
        return this.members.filter(member => member.role === role);
    }

    /**
     * 获取成员角色文本
     * @param {string} role 角色代码
     * @returns {string} 角色文本
     */
    getRoleText(role) {
        const roleMap = {
            'owner': '群主',
            'admin': '管理员',
            'moderator': '版主',
            'member': '成员',
            'guest': '访客'
        };
        return roleMap[role] || role;
    }

    /**
     * 获取成员状态文本
     * @param {string} status 状态代码
     * @returns {string} 状态文本
     */
    getStatusText(status) {
        const statusMap = {
            'active': '正常',
            'banned': '已封禁',
            'suspended': '已暂停',
            'pending': '待验证'
        };
        return statusMap[status] || status;
    }

    /**
     * 渲染成员列表
     */
    renderMembersList() {
        const container = document.getElementById('membersList');
        if (!container) return;

        if (this.members.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无群组成员</div>';
            return;
        }

        container.innerHTML = this.members.map(member => `
            <div class="member-card" data-member-id="${member.id}">
                <div class="member-info">
                    <div class="member-avatar">
                        <img src="${member.avatar_url || '/assets/default-avatar.png'}" alt="${member.name}">
                    </div>
                    <div class="member-details">
                        <h4 class="member-name">${member.name}</h4>
                        <p class="member-email">${member.email}</p>
                        <div class="member-meta">
                            <span class="member-role role-${member.role}">${this.getRoleText(member.role)}</span>
                            <span class="member-status status-${member.status}">${this.getStatusText(member.status)}</span>
                            <span class="join-time">加入时间: ${this.formatDate(member.joined_at)}</span>
                        </div>
                    </div>
                </div>
                <div class="member-actions">
                    <button class="btn btn-sm btn-info view-member-btn" data-member-id="${member.id}">
                        查看
                    </button>
                    ${this.canManageMember(member) ? `
                        <button class="btn btn-sm btn-warning change-role-btn" data-member-id="${member.id}" data-group-id="${this.currentGroupId}">
                            角色
                        </button>
                        ${member.role !== 'owner' ? `
                            <button class="btn btn-sm btn-danger remove-member-btn" data-member-id="${member.id}" data-group-id="${this.currentGroupId}">
                                移除
                            </button>
                        ` : ''}
                        ${member.status === 'active' ? `
                            <button class="btn btn-sm btn-dark ban-member-btn" data-member-id="${member.id}" data-group-id="${this.currentGroupId}">
                                封禁
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-success unban-member-btn" data-member-id="${member.id}" data-group-id="${this.currentGroupId}">
                                解封
                            </button>
                        `}
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    /**
     * 检查是否可以管理指定成员
     * @param {Object} member 成员对象
     * @returns {boolean} 是否可以管理
     */
    canManageMember(member) {
        const currentUserRole = this.getCurrentUserRole();
        const currentUserId = this.getCurrentUserId();
        
        // 群主可以管理所有成员
        if (currentUserRole === 'owner') return true;
        
        // 管理员可以管理普通成员和版主
        if (currentUserRole === 'admin') {
            return member.role === 'member' || member.role === 'moderator';
        }
        
        // 版主只能管理普通成员
        if (currentUserRole === 'moderator') {
            return member.role === 'member';
        }
        
        // 不能管理自己和其他具有更高权限的成员
        return member.id !== currentUserId && 
               ['owner', 'admin'].includes(member.role) === false;
    }

    /**
     * 显示添加成员模态框
     * @param {string} groupId 群组ID
     */
    showAddMemberModal(groupId) {
        const modal = this.createModal('添加成员', `
            <form id="addMemberForm" data-group-id="${groupId}">
                <div class="form-group">
                    <label for="memberEmail">成员邮箱 *</label>
                    <input type="email" id="memberEmail" name="email" required class="form-control" placeholder="请输入成员邮箱">
                </div>
                <div class="form-group">
                    <label for="memberRole">成员角色</label>
                    <select id="memberRole" name="role" class="form-control">
                        <option value="member">成员</option>
                        <option value="moderator">版主</option>
                        <option value="admin">管理员</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
                    <button type="submit" class="btn btn-primary">添加成员</button>
                </div>
            </form>
        `);
        document.body.appendChild(modal);
    }

    /**
     * 显示批量添加成员模态框
     * @param {string} groupId 群组ID
     */
    showBatchAddMembersModal(groupId) {
        const modal = this.createModal('批量添加成员', `
            <form id="batchAddMembersForm" data-group-id="${groupId}">
                <div class="form-group">
                    <label for="batchMemberEmails">成员邮箱（每行一个）*</label>
                    <textarea id="batchMemberEmails" name="emails" required class="form-control" rows="5" placeholder="请输入多个邮箱地址，每行一个"></textarea>
                </div>
                <div class="form-group">
                    <label for="batchMemberRole">默认角色</label>
                    <select id="batchMemberRole" name="role" class="form-control">
                        <option value="member">成员</option>
                        <option value="moderator">版主</option>
                        <option value="admin">管理员</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
                    <button type="submit" class="btn btn-primary">批量添加</button>
                </div>
            </form>
        `);
        document.body.appendChild(modal);
    }

    /**
     * 显示更改角色模态框
     * @param {string} memberId 成员ID
     * @param {string} groupId 群组ID
     */
    showChangeRoleModal(memberId, groupId) {
        const member = this.members.find(m => m.id === memberId);
        if (!member) {
            this.showError('成员不存在');
            return;
        }

        const modal = this.createModal('更改成员角色', `
            <form id="changeRoleForm" data-member-id="${memberId}" data-group-id="${groupId}">
                <div class="form-group">
                    <label>成员信息</label>
                    <div class="member-summary">
                        <strong>${member.name}</strong> (${member.email})
                    </div>
                </div>
                <div class="form-group">
                    <label for="newRole">新角色 *</label>
                    <select id="newRole" name="role" required class="form-control">
                        <option value="member" ${member.role === 'member' ? 'selected' : ''}>成员</option>
                        <option value="moderator" ${member.role === 'moderator' ? 'selected' : ''}>版主</option>
                        <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>管理员</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
                    <button type="submit" class="btn btn-primary">更改角色</button>
                </div>
            </form>
        `);
        document.body.appendChild(modal);
    }

    /**
     * 查看成员详情
     * @param {string} memberId 成员ID
     */
    async viewMemberDetail(memberId) {
        try {
            const memberDetail = await this.getMemberDetail(memberId);
            const modal = this.createModal('成员详情', `
                <div class="member-detail">
                    <div class="member-avatar-large">
                        <img src="${memberDetail.avatar_url || '/assets/default-avatar.png'}" alt="${memberDetail.name}">
                    </div>
                    <div class="member-info-grid">
                        <div class="info-item">
                            <label>姓名:</label>
                            <span>${memberDetail.name}</span>
                        </div>
                        <div class="info-item">
                            <label>邮箱:</label>
                            <span>${memberDetail.email}</span>
                        </div>
                        <div class="info-item">
                            <label>角色:</label>
                            <span>${this.getRoleText(memberDetail.role)}</span>
                        </div>
                        <div class="info-item">
                            <label>状态:</label>
                            <span>${this.getStatusText(memberDetail.status)}</span>
                        </div>
                        <div class="info-item">
                            <label>加入时间:</label>
                            <span>${this.formatDate(memberDetail.joined_at)}</span>
                        </div>
                        <div class="info-item">
                            <label>最后活跃:</label>
                            <span>${this.formatDate(memberDetail.last_active)}</span>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">关闭</button>
                </div>
            `);
            document.body.appendChild(modal);
        } catch (error) {
            this.showError('获取成员详情失败');
        }
    }

    /**
     * 处理添加成员表单提交
     * @param {HTMLFormElement} form 表单元素
     */
    async handleAddMember(form) {
        const formData = new FormData(form);
        const memberData = {
            group_id: form.dataset.groupId,
            email: formData.get('email'),
            role: formData.get('role')
        };

        try {
            await this.addMember(memberData);
            form.closest('.modal').remove();
        } catch (error) {
            // 错误已在addMember方法中处理
        }
    }

    /**
     * 处理批量添加成员表单提交
     * @param {HTMLFormElement} form 表单元素
     */
    async handleBatchAddMembers(form) {
        const formData = new FormData(form);
        const emailsText = formData.get('emails');
        const emails = emailsText.split('\n').filter(email => email.trim());
        const role = formData.get('role');
        const groupId = form.dataset.groupId;

        const membersData = emails.map(email => ({ email, role }));

        try {
            await this.batchAddMembers(groupId, membersData);
            form.closest('.modal').remove();
        } catch (error) {
            // 错误已在batchAddMembers方法中处理
        }
    }

    /**
     * 处理更改角色表单提交
     * @param {HTMLFormElement} form 表单元素
     */
    async handleChangeRole(form) {
        const formData = new FormData(form);
        const newRole = formData.get('role');
        const memberId = form.dataset.memberId;
        const groupId = form.dataset.groupId;

        try {
            await this.changeMemberRole(memberId, groupId, newRole);
            form.closest('.modal').remove();
        } catch (error) {
            // 错误已在changeMemberRole方法中处理
        }
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
     * 获取当前用户ID
     * @returns {string} 当前用户ID
     */
    getCurrentUserId() {
        const token = this.getToken();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.user_id;
            } catch (error) {
                console.error('解析token失败:', error);
            }
        }
        return '';
    }

    /**
     * 获取当前用户角色
     * @returns {string} 当前用户角色
     */
    getCurrentUserRole() {
        const token = this.getToken();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.role || 'member';
            } catch (error) {
                console.error('解析token失败:', error);
            }
        }
        return 'member';
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
}

// 创建全局成员管理器实例
const memberManager = new MemberManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MemberManager;
}