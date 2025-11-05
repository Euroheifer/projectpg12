// audit_log.js - 审计日志功能模块（完整实现版本）

import { 
    getTodayDate, 
    showCustomAlert, 
    getAuthToken, 
    requireAdmin,
    setupModalCloseHandlers 
} from '../ui/utils.js';

// --- 全局状态 ---
let auditLogsData = [];
let currentAuditPage = 1;
let auditPageSize = 20;
let auditFilters = {
    action_type: '', // 操作类型过滤
    user_id: '',     // 用户过滤
    date_from: '',   // 开始日期
    date_to: ''      // 结束日期
};

// 操作类型映射
const ACTION_TYPES = {
    'create_expense': { label: '创建费用', icon: '💰', color: 'success' },
    'update_expense': { label: '更新费用', icon: '✏️', color: 'info' },
    'delete_expense': { label: '删除费用', icon: '🗑️', color: 'danger' },
    'create_payment': { label: '创建支付', icon: '💳', color: 'success' },
    'update_payment': { label: '更新支付', icon: '✏️', color: 'info' },
    'delete_payment': { label: '删除支付', icon: '🗑️', color: 'danger' },
    'create_recurring': { label: '创建定期费用', icon: '🔄', color: 'success' },
    'update_recurring': { label: '更新定期费用', icon: '✏️', color: 'info' },
    'delete_recurring': { label: '删除定期费用', icon: '🗑️', color: 'danger' },
    'enable_recurring': { label: '启用定期费用', icon: '▶️', color: 'success' },
    'disable_recurring': { label: '禁用定期费用', icon: '⏸️', color: 'warning' },
    'invite_member': { label: '邀请成员', icon: '👤', color: 'info' },
    'accept_invitation': { label: '接受邀请', icon: '✅', color: 'success' },
    'reject_invitation': { label: '拒绝邀请', icon: '❌', color: 'danger' },
    'remove_member': { label: '移除成员', icon: '🚫', color: 'danger' },
    'update_role': { label: '更新角色', icon: '👥', color: 'info' },
    'settlement': { label: '执行结算', icon: '💰', color: 'primary' },
    'group_create': { label: '创建群组', icon: '🏠', color: 'primary' },
    'group_update': { label: '更新群组', icon: '🏠', color: 'info' },
    'group_delete': { label: '删除群组', icon: '🏠', color: 'danger' }
};

/**
 * 加载审计日志
 */
export function loadAuditLogs() {
    console.log('加载审计日志');
    
    // 显示加载状态
    showAuditLogsLoading();
    
    // 获取审计日志数据
    fetchAuditLogs().then(logs => {
        auditLogsData = logs;
        
        // 渲染审计日志列表
        renderAuditLogList();
        
        // 更新分页信息
        updateAuditPagination();
        
        // 初始化过滤器和事件
        initializeAuditFilters();
        
    }).catch(error => {
        console.error('加载审计日志失败:', error);
        showCustomAlert('加载审计日志失败: ' + error.message);
        showAuditLogsError();
    });
}

/**
 * 显示加载状态
 */
function showAuditLogsLoading() {
    const container = document.getElementById('audit-logs-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <div class="loading-text">正在加载审计日志...</div>
        </div>
    `;
}

/**
 * 显示错误状态
 */
function showAuditLogsError() {
    const container = document.getElementById('audit-logs-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-state">
            <div class="error-icon">❌</div>
            <div class="error-text">加载审计日志失败</div>
            <button onclick="loadAuditLogs()" class="retry-btn">重试</button>
        </div>
    `;
}

/**
 * 获取审计日志数据
 */
async function fetchAuditLogs() {
    try {
        const token = getAuthToken();
        const params = new URLSearchParams({
            page: currentAuditPage.toString(),
            per_page: auditPageSize.toString()
        });
        
        // 添加过滤条件
        if (auditFilters.action_type) {
            params.append('action_type', auditFilters.action_type);
        }
        if (auditFilters.user_id) {
            params.append('user_id', auditFilters.user_id);
        }
        if (auditFilters.date_from) {
            params.append('date_from', auditFilters.date_from);
        }
        if (auditFilters.date_to) {
            params.append('date_to', auditFilters.date_to);
        }
        
        const response = await fetch(`/api/groups/${window.currentGroupId}/audit-logs?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取审计日志失败');
        }
        
        const data = await response.json();
        
        // 如果返回的是数组，直接使用；如果是对象，提取logs字段
        if (Array.isArray(data)) {
            return data;
        } else if (data.logs) {
            return data.logs;
        } else {
            return [];
        }
        
    } catch (error) {
        console.error('获取审计日志失败:', error);
        throw error;
    }
}

/**
 * 渲染审计日志列表
 */
export function renderAuditLogList() {
    console.log('渲染审计日志列表');
    
    const container = document.getElementById('audit-logs-container');
    if (!container) return;
    
    if (!auditLogsData || auditLogsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-text">暂无审计日志</div>
                <div class="empty-subtitle">当用户执行操作时，审计日志将自动记录</div>
            </div>
        `;
        return;
    }
    
    const logsHTML = auditLogsData.map(log => renderAuditLogItem(log)).join('');
    
    container.innerHTML = `
        <div class="audit-logs-list">
            ${logsHTML}
        </div>
        <div id="audit-pagination-container"></div>
    `;
}

/**
 * 渲染单个审计日志项目
 */
function renderAuditLogItem(log) {
    const actionInfo = ACTION_TYPES[log.action_type] || {
        label: log.action_type || '未知操作',
        icon: '❓',
        color: 'secondary'
    };
    
    const user = log.user ? log.user : 
                 window.groupMembers.find(m => m.id === log.user_id) || 
                 { username: '未知用户' };
    
    const timestamp = new Date(log.created_at).toLocaleString('zh-CN');
    const relativeTime = getRelativeTime(log.created_at);
    
    const details = log.details ? JSON.stringify(log.details, null, 2) : '';
    
    return `
        <div class="audit-log-item">
            <div class="audit-log-header">
                <div class="audit-log-icon ${actionInfo.color}">
                    ${actionInfo.icon}
                </div>
                <div class="audit-log-info">
                    <div class="audit-log-action">
                        <span class="action-label">${actionInfo.label}</span>
                        <span class="action-user">by ${user.username}</span>
                    </div>
                    <div class="audit-log-time">
                        <span class="timestamp">${timestamp}</span>
                        <span class="relative-time">${relativeTime}</span>
                    </div>
                </div>
                <div class="audit-log-details-toggle">
                    <button onclick="toggleAuditLogDetails(${log.id})" class="details-btn">
                        <span class="details-text">详情</span>
                        <span class="details-icon">▼</span>
                    </button>
                </div>
            </div>
            <div class="audit-log-details" id="audit-log-details-${log.id}" style="display: none;">
                <div class="details-content">
                    <div class="details-item">
                        <span class="details-label">操作ID:</span>
                        <span class="details-value">${log.id}</span>
                    </div>
                    <div class="details-item">
                        <span class="details-label">操作类型:</span>
                        <span class="details-value">${log.action_type}</span>
                    </div>
                    <div class="details-item">
                        <span class="details-label">用户ID:</span>
                        <span class="details-value">${log.user_id}</span>
                    </div>
                    <div class="details-item">
                        <span class="details-label">IP地址:</span>
                        <span class="details-value">${log.ip_address || '未知'}</span>
                    </div>
                    <div class="details-item">
                        <span class="details-label">用户代理:</span>
                        <span class="details-value">${log.user_agent ? truncateString(log.user_agent, 50) : '未知'}</span>
                    </div>
                    ${details ? `
                        <div class="details-item">
                            <span class="details-label">详细信息:</span>
                            <pre class="details-json">${details}</pre>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * 切换审计日志详情显示
 */
export function toggleAuditLogDetails(logId) {
    const detailsElement = document.getElementById(`audit-log-details-${logId}`);
    const button = detailsElement?.parentElement.querySelector('.details-btn');
    const icon = button?.querySelector('.details-icon');
    
    if (!detailsElement || !button || !icon) return;
    
    const isVisible = detailsElement.style.display !== 'none';
    
    if (isVisible) {
        detailsElement.style.display = 'none';
        icon.textContent = '▼';
        button.querySelector('.details-text').textContent = '详情';
    } else {
        detailsElement.style.display = 'block';
        icon.textContent = '▲';
        button.querySelector('.details-text').textContent = '收起';
    }
}

/**
 * 初始化审计日志过滤器
 */
function initializeAuditFilters() {
    // 操作类型过滤器
    initializeActionTypeFilter();
    
    // 用户过滤器
    initializeUserFilter();
    
    // 日期过滤器
    initializeDateFilters();
    
    // 绑定过滤器事件
    bindFilterEvents();
}

/**
 * 初始化操作类型过滤器
 */
function initializeActionTypeFilter() {
    const filter = document.getElementById('audit-action-filter');
    if (!filter) return;
    
    filter.innerHTML = '<option value="">所有操作</option>';
    
    Object.entries(ACTION_TYPES).forEach(([key, info]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = info.label;
        filter.appendChild(option);
    });
}

/**
 * 初始化用户过滤器
 */
function initializeUserFilter() {
    const filter = document.getElementById('audit-user-filter');
    if (!filter || !window.groupMembers) return;
    
    filter.innerHTML = '<option value="">所有用户</option>';
    
    window.groupMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.username;
        filter.appendChild(option);
    });
}

/**
 * 初始化日期过滤器
 */
function initializeDateFilters() {
    const fromFilter = document.getElementById('audit-date-from-filter');
    const toFilter = document.getElementById('audit-date-to-filter');
    
    if (fromFilter) {
        fromFilter.value = auditFilters.date_from;
    }
    if (toFilter) {
        toFilter.value = auditFilters.date_to;
    }
}

/**
 * 绑定过滤器事件
 */
function bindFilterEvents() {
    // 操作类型过滤
    const actionFilter = document.getElementById('audit-action-filter');
    if (actionFilter) {
        actionFilter.addEventListener('change', (e) => {
            auditFilters.action_type = e.target.value;
            currentAuditPage = 1;
            loadAuditLogs();
        });
    }
    
    // 用户过滤
    const userFilter = document.getElementById('audit-user-filter');
    if (userFilter) {
        userFilter.addEventListener('change', (e) => {
            auditFilters.user_id = e.target.value;
            currentAuditPage = 1;
            loadAuditLogs();
        });
    }
    
    // 日期范围过滤
    const fromFilter = document.getElementById('audit-date-from-filter');
    const toFilter = document.getElementById('audit-date-to-filter');
    
    if (fromFilter) {
        fromFilter.addEventListener('change', (e) => {
            auditFilters.date_from = e.target.value;
            currentAuditPage = 1;
            loadAuditLogs();
        });
    }
    
    if (toFilter) {
        toFilter.addEventListener('change', (e) => {
            auditFilters.date_to = e.target.value;
            currentAuditPage = 1;
            loadAuditLogs();
        });
    }
}

/**
 * 更新审计日志分页
 */
function updateAuditPagination() {
    // 如果数据量小于等于页面大小，不显示分页
    if (!auditLogsData || auditLogsData.length < auditPageSize) {
        const paginationContainer = document.getElementById('audit-pagination-container');
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }
        return;
    }
    
    const paginationContainer = document.getElementById('audit-pagination-container');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(auditLogsData.length / auditPageSize);
    
    paginationContainer.innerHTML = `
        <div class="audit-pagination">
            <button onclick="changeAuditPage(${currentAuditPage - 1})" 
                    ${currentAuditPage === 1 ? 'disabled' : ''} 
                    class="pagination-btn">
                上一页
            </button>
            <span class="pagination-info">
                第 ${currentAuditPage} 页，共 ${totalPages} 页
            </span>
            <button onclick="changeAuditPage(${currentAuditPage + 1})" 
                    ${currentAuditPage === totalPages ? 'disabled' : ''} 
                    class="pagination-btn">
                下一页
            </button>
        </div>
    `;
}

/**
 * 改变审计日志页面
 */
export function changeAuditPage(page) {
    if (page < 1) return;
    
    currentAuditPage = page;
    loadAuditLogs();
}

/**
 * 刷新审计日志
 */
export function refreshAuditLogs() {
    console.log('刷新审计日志');
    currentAuditPage = 1;
    loadAuditLogs();
}

/**
 * 导出审计日志
 */
export function exportAuditLogs() {
    try {
        if (!auditLogsData || auditLogsData.length === 0) {
            showCustomAlert('暂无审计日志可导出');
            return;
        }
        
        // 准备导出数据
        const exportData = {
            group_id: window.currentGroupId,
            export_date: new Date().toISOString(),
            filters: auditFilters,
            logs: auditLogsData.map(log => ({
                id: log.id,
                action_type: log.action_type,
                user_id: log.user_id,
                user_name: log.user?.username || getUsernameById(log.user_id),
                description: log.description,
                created_at: log.created_at,
                ip_address: log.ip_address,
                details: log.details
            }))
        };
        
        // 创建下载链接
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${window.currentGroupId}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showCustomAlert('审计日志导出成功', false);
        
    } catch (error) {
        console.error('导出审计日志失败:', error);
        showCustomAlert('导出审计日志失败: ' + error.message);
    }
}

/**
 * 清除审计日志过滤器
 */
export function clearAuditFilters() {
    auditFilters = {
        action_type: '',
        user_id: '',
        date_from: '',
        date_to: ''
    };
    
    // 重置过滤器UI
    const actionFilter = document.getElementById('audit-action-filter');
    const userFilter = document.getElementById('audit-user-filter');
    const fromFilter = document.getElementById('audit-date-from-filter');
    const toFilter = document.getElementById('audit-date-to-filter');
    
    if (actionFilter) actionFilter.value = '';
    if (userFilter) userFilter.value = '';
    if (fromFilter) fromFilter.value = '';
    if (toFilter) toFilter.value = '';
    
    // 重新加载数据
    currentAuditPage = 1;
    loadAuditLogs();
}

/**
 * 根据用户ID获取用户名
 */
function getUsernameById(userId) {
    const member = window.groupMembers.find(m => m.id === userId);
    return member?.username || '未知用户';
}

/**
 * 获取相对时间
 */
function getRelativeTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) {
        return '刚刚';
    } else if (diffMins < 60) {
        return `${diffMins}分钟前`;
    } else if (diffHours < 24) {
        return `${diffHours}小时前`;
    } else if (diffDays < 30) {
        return `${diffDays}天前`;
    } else {
        return time.toLocaleDateString('zh-CN');
    }
}

/**
 * 截断字符串
 */
function truncateString(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}

/**
 * 记录审计日志
 */
export async function logAuditAction(actionType, description, details = null) {
    try {
        const token = getAuthToken();
        const logData = {
            action_type: actionType,
            description: description,
            details: details,
            user_id: window.CURRENT_USER_ID,
            ip_address: await getClientIP(),
            user_agent: navigator.userAgent
        };
        
        const response = await fetch(`/api/groups/${window.currentGroupId}/audit-logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(logData)
        });
        
        if (response.ok) {
            console.log('审计日志记录成功:', logData);
            
            // 如果当前正在显示审计日志页面，刷新数据
            const auditTab = document.getElementById('tab-audit');
            if (auditTab && auditTab.classList.contains('active')) {
                refreshAuditLogs();
            }
        } else {
            console.warn('审计日志记录失败:', response.status);
        }
        
    } catch (error) {
        console.warn('记录审计日志失败:', error);
        // 不抛出错误，避免影响主要业务流程
    }
}

/**
 * 获取客户端IP地址
 */
async function getClientIP() {
    try {
        // 这里可以调用一个获取IP的服务，或者从服务器返回
        // 为了简化，暂时返回空字符串
        return '';
    } catch (error) {
        return '';
    }
}

// 暴露函数到全局
window.loadAuditLogs = loadAuditLogs;
window.renderAuditLogList = renderAuditLogList;
window.toggleAuditLogDetails = toggleAuditLogDetails;
window.changeAuditPage = changeAuditPage;
window.refreshAuditLogs = refreshAuditLogs;
window.exportAuditLogs = exportAuditLogs;
window.clearAuditFilters = clearAuditFilters;
window.logAuditAction = logAuditAction;

console.log('审计日志模块已加载，所有函数已暴露到全局');