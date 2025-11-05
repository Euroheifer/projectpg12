/**
 * 群组管理功能模块
 * 处理群组的创建、编辑、删除、列表获取和详情显示
 */

class GroupManager {
    constructor() {
        this.apiBase = '/api';
        this.groups = [];
        this.currentGroup = null;
        this.init();
    }

    /**
     * 初始化群组管理器
     */
    init() {
        this.bindEvents();
        this.loadGroups();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 创建群组按钮
        document.addEventListener('click', (e) => {
            if (e.target.matches('#createGroupBtn')) {
                this.showCreateGroupModal();
            }
            if (e.target.matches('.edit-group-btn')) {
                this.showEditGroupModal(e.target.dataset.groupId);
            }
            if (e.target.matches('.delete-group-btn')) {
                this.deleteGroup(e.target.dataset.groupId);
            }
            if (e.target.matches('.group-card')) {
                this.viewGroupDetail(e.target.dataset.groupId);
            }
        });

        // 表单提交事件
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#createGroupForm')) {
                e.preventDefault();
                this.handleCreateGroup(e.target);
            }
            if (e.target.matches('#editGroupForm')) {
                e.preventDefault();
                this.handleEditGroup(e.target);
            }
        });
    }

    /**
     * 获取群组列表
     * @returns {Promise<Array>} 群组列表
     */
    async loadGroups() {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/groups/`, {
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
            this.groups = data.groups || data;
            this.renderGroupsList();
            return this.groups;
        } catch (error) {
            console.error('获取群组列表失败:', error);
            this.showError('获取群组列表失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 创建群组
     * @param {Object} groupData 群组数据
     * @returns {Promise<Object>} 创建的群组信息
     */
    async createGroup(groupData) {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/groups/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify(groupData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '创建群组失败');
            }

            const newGroup = await response.json();
            this.groups.unshift(newGroup);
            this.renderGroupsList();
            this.showSuccess('群组创建成功');
            return newGroup;
        } catch (error) {
            console.error('创建群组失败:', error);
            this.showError(error.message || '创建群组失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 获取群组详情
     * @param {string} groupId 群组ID
     * @returns {Promise<Object>} 群组详情
     */
    async getGroupDetail(groupId) {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/groups/${groupId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const groupDetail = await response.json();
            this.currentGroup = groupDetail;
            return groupDetail;
        } catch (error) {
            console.error('获取群组详情失败:', error);
            this.showError('获取群组详情失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 更新群组信息
     * @param {string} groupId 群组ID
     * @param {Object} groupData 更新的群组数据
     * @returns {Promise<Object>} 更新后的群组信息
     */
    async updateGroup(groupId, groupData) {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/groups/${groupId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify(groupData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '更新群组信息失败');
            }

            const updatedGroup = await response.json();
            
            // 更新本地群组列表
            const index = this.groups.findIndex(g => g.id === groupId);
            if (index !== -1) {
                this.groups[index] = updatedGroup;
            }
            
            this.renderGroupsList();
            this.showSuccess('群组信息更新成功');
            return updatedGroup;
        } catch (error) {
            console.error('更新群组信息失败:', error);
            this.showError(error.message || '更新群组信息失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 删除群组
     * @param {string} groupId 群组ID
     * @returns {Promise<boolean>} 删除是否成功
     */
    async deleteGroup(groupId) {
        try {
            if (!confirm('确定要删除这个群组吗？此操作不可恢复。')) {
                return false;
            }

            this.showLoading(true);
            const response = await fetch(`${this.apiBase}/groups/${groupId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '删除群组失败');
            }

            // 从本地群组列表中移除
            this.groups = this.groups.filter(g => g.id !== groupId);
            this.renderGroupsList();
            this.showSuccess('群组删除成功');
            return true;
        } catch (error) {
            console.error('删除群组失败:', error);
            this.showError(error.message || '删除群组失败，请重试');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 获取群组统计信息
     * @param {string} groupId 群组ID
     * @returns {Promise<Object>} 群组统计信息
     */
    async getGroupStats(groupId) {
        try {
            const response = await fetch(`${this.apiBase}/groups/${groupId}/stats`, {
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
            console.error('获取群组统计信息失败:', error);
            throw error;
        }
    }

    /**
     * 渲染群组列表
     */
    renderGroupsList() {
        const container = document.getElementById('groupsList');
        if (!container) return;

        if (this.groups.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无群组</div>';
            return;
        }

        container.innerHTML = this.groups.map(group => `
            <div class="group-card" data-group-id="${group.id}">
                <div class="group-info">
                    <h3 class="group-name">${group.name}</h3>
                    <p class="group-description">${group.description || '暂无描述'}</p>
                    <div class="group-meta">
                        <span class="member-count">成员: ${group.member_count || 0}</span>
                        <span class="create-time">创建时间: ${this.formatDate(group.created_at)}</span>
                    </div>
                </div>
                <div class="group-actions">
                    <button class="btn btn-sm btn-secondary edit-group-btn" data-group-id="${group.id}">
                        编辑
                    </button>
                    <button class="btn btn-sm btn-danger delete-group-btn" data-group-id="${group.id}">
                        删除
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * 显示创建群组模态框
     */
    showCreateGroupModal() {
        const modal = this.createModal('创建群组', `
            <form id="createGroupForm">
                <div class="form-group">
                    <label for="groupName">群组名称 *</label>
                    <input type="text" id="groupName" name="name" required class="form-control">
                </div>
                <div class="form-group">
                    <label for="groupDescription">群组描述</label>
                    <textarea id="groupDescription" name="description" class="form-control" rows="3"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
                    <button type="submit" class="btn btn-primary">创建群组</button>
                </div>
            </form>
        `);
        document.body.appendChild(modal);
    }

    /**
     * 显示编辑群组模态框
     * @param {string} groupId 群组ID
     */
    async showEditGroupModal(groupId) {
        try {
            const group = this.groups.find(g => g.id === groupId);
            if (!group) {
                this.showError('群组不存在');
                return;
            }

            const modal = this.createModal('编辑群组', `
                <form id="editGroupForm">
                    <div class="form-group">
                        <label for="editGroupName">群组名称 *</label>
                        <input type="text" id="editGroupName" name="name" value="${group.name}" required class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="editGroupDescription">群组描述</label>
                        <textarea id="editGroupDescription" name="description" class="form-control" rows="3">${group.description || ''}</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
                        <button type="submit" class="btn btn-primary">保存更改</button>
                    </div>
                </form>
            `);
            document.body.appendChild(modal);
        } catch (error) {
            this.showError('加载群组信息失败');
        }
    }

    /**
     * 处理创建群组表单提交
     * @param {HTMLFormElement} form 表单元素
     */
    async handleCreateGroup(form) {
        const formData = new FormData(form);
        const groupData = {
            name: formData.get('name'),
            description: formData.get('description')
        };

        try {
            await this.createGroup(groupData);
            form.closest('.modal').remove();
        } catch (error) {
            // 错误已在createGroup方法中处理
        }
    }

    /**
     * 处理编辑群组表单提交
     * @param {HTMLFormElement} form 表单元素
     */
    async handleEditGroup(form) {
        const formData = new FormData(form);
        const groupData = {
            name: formData.get('name'),
            description: formData.get('description')
        };

        const groupId = this.groups.find(g => g.name === formData.get('name'))?.id || 
                       this.groups.find(g => g.description === formData.get('description'))?.id;

        try {
            // 这里需要从DOM中获取群组ID，或者通过其他方式传递
            const groupCard = form.closest('.modal').previousElementSibling;
            const groupId = groupCard?.dataset?.groupId;
            
            if (groupId) {
                await this.updateGroup(groupId, groupData);
                form.closest('.modal').remove();
            }
        } catch (error) {
            // 错误已在updateGroup方法中处理
        }
    }

    /**
     * 查看群组详情
     * @param {string} groupId 群组ID
     */
    async viewGroupDetail(groupId) {
        try {
            const groupDetail = await this.getGroupDetail(groupId);
            // 跳转到群组详情页面或显示详情
            window.location.href = `/group-detail.html?id=${groupId}`;
        } catch (error) {
            // 错误已在getGroupDetail方法中处理
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
     * 格式化日期
     * @param {string|Date} date 日期
     * @returns {string} 格式化后的日期字符串
     */
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('zh-CN');
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
     * 搜索群组
     * @param {string} query 搜索关键词
     * @returns {Array} 搜索结果
     */
    searchGroups(query) {
        if (!query) return this.groups;
        
        return this.groups.filter(group => 
            group.name.toLowerCase().includes(query.toLowerCase()) ||
            (group.description && group.description.toLowerCase().includes(query.toLowerCase()))
        );
    }

    /**
     * 获取我的群组
     * @returns {Array} 我的群组列表
     */
    getMyGroups() {
        const currentUserId = this.getCurrentUserId();
        return this.groups.filter(group => group.owner_id === currentUserId);
    }

    /**
     * 获取当前用户ID
     * @returns {string} 当前用户ID
     */
    getCurrentUserId() {
        // 这里应该从用户状态或JWT token中获取
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
}

// 创建全局群组管理器实例
const groupManager = new GroupManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GroupManager;
}