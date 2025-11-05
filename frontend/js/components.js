/**
 * UI组件库 - 可复用的前端组件
 * 提供统一的组件配置、状态管理和无障碍支持
 */

class UIComponent {
    constructor(element, options = {}) {
        this.element = element;
        this.options = { ...this.defaults, ...options };
        this.state = this.initialState();
        this.events = {};
        this.init();
    }

    // 默认配置
    defaults = {
        className: '',
        disabled: false,
        loading: false,
        variant: 'default',
        size: 'medium'
    };

    // 初始状态
    initialState() {
        return {
            isLoading: false,
            isDisabled: false,
            hasError: false,
            errorMessage: '',
            isEmpty: false,
            isVisible: true
        };
    }

    // 初始化组件
    init() {
        this.bindEvents();
        this.updateUI();
        this.setupAccessibility();
        this.applyTheme();
    }

    // 绑定事件
    bindEvents() {
        if (this.options.onClick) {
            this.element.addEventListener('click', this.options.onClick);
        }
        if (this.options.onChange) {
            this.element.addEventListener('change', this.options.onChange);
        }
        if (this.options.onFocus) {
            this.element.addEventListener('focus', this.options.onFocus);
        }
    }

    // 设置无障碍支持
    setupAccessibility() {
        if (this.options.ariaLabel) {
            this.element.setAttribute('aria-label', this.options.ariaLabel);
        }
        if (this.options.role) {
            this.element.setAttribute('role', this.options.role);
        }
        if (this.options.disabled) {
            this.element.setAttribute('disabled', 'true');
            this.element.setAttribute('aria-disabled', 'true');
        }
    }

    // 应用主题
    applyTheme() {
        const theme = ThemeManager.getCurrentTheme();
        this.element.classList.add(`theme-${theme}`);
    }

    // 更新UI
    updateUI() {
        const classList = ['ui-component'];
        
        if (this.options.className) classList.push(this.options.className);
        if (this.options.variant !== 'default') classList.push(`variant-${this.options.variant}`);
        if (this.options.size !== 'medium') classList.push(`size-${this.options.size}`);
        if (this.state.isLoading) classList.push('is-loading');
        if (this.state.isDisabled) classList.push('is-disabled');
        if (this.state.hasError) classList.push('has-error');
        if (this.state.isEmpty) classList.push('is-empty');
        
        this.element.className = classList.join(' ');
    }

    // 事件系统
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    // 状态管理
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.updateUI();
        this.emit('stateChange', this.state);
    }

    setLoading(isLoading) {
        this.setState({ isLoading });
        if (isLoading) {
            this.element.setAttribute('aria-busy', 'true');
        } else {
            this.element.removeAttribute('aria-busy');
        }
    }

    setError(message = '') {
        this.setState({ hasError: !!message, errorMessage: message });
        if (message) {
            this.element.setAttribute('aria-describedby', `${this.element.id}-error`);
        } else {
            this.element.removeAttribute('aria-describedby');
        }
    }

    setDisabled(disabled = true) {
        this.setState({ isDisabled: disabled });
        this.element.disabled = disabled;
        this.element.setAttribute('aria-disabled', disabled.toString());
    }

    show() {
        this.setState({ isVisible: true });
        this.element.style.display = '';
    }

    hide() {
        this.setState({ isVisible: false });
        this.element.style.display = 'none';
    }

    destroy() {
        this.element.removeEventListener('click', this.options.onClick);
        this.element.removeEventListener('change', this.options.onChange);
        this.element.removeEventListener('focus', this.options.onFocus);
    }
}

// 按钮组件
class Button extends UIComponent {
    constructor(element, options = {}) {
        super(element, {
            variant: 'primary',
            size: 'medium',
            ...options
        });
    }

    updateUI() {
        super.updateUI();
        this.element.innerHTML = this.getButtonContent();
    }

    getButtonContent() {
        const { isLoading } = this.state;
        const { text, icon, loadingText } = this.options;
        
        let content = '';
        if (isLoading) {
            content = `
                <span class="loading-spinner"></span>
                <span class="button-text">${loadingText || '加载中...'}</span>
            `;
        } else {
            content = `
                ${icon ? `<span class="button-icon">${icon}</span>` : ''}
                <span class="button-text">${text}</span>
            `;
        }
        
        return content;
    }
}

// 表单组件
class Form extends UIComponent {
    constructor(element, options = {}) {
        super(element, {
            validateOnChange: false,
            ...options
        });
    }

    getFormData() {
        const formData = new FormData(this.element);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        return data;
    }

    validate() {
        const inputs = this.element.querySelectorAll('input, textarea, select');
        let isValid = true;
        let errors = [];

        inputs.forEach(input => {
            const validation = this.validateField(input);
            if (!validation.isValid) {
                isValid = false;
                errors.push({
                    field: input.name || input.id,
                    message: validation.message
                });
            }
        });

        this.setState({ hasError: !isValid, errorMessage: errors });
        this.emit('validation', { isValid, errors });
        
        return { isValid, errors };
    }

    validateField(field) {
        const value = field.value.trim();
        const required = field.hasAttribute('required');
        
        if (required && !value) {
            return { isValid: false, message: `${field.name}是必填项` };
        }

        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return { isValid: false, message: '请输入有效的邮箱地址' };
            }
        }

        return { isValid: true, message: '' };
    }

    reset() {
        this.element.reset();
        this.setState({ hasError: false, errorMessage: '' });
        this.emit('reset');
    }

    submit() {
        const validation = this.validate();
        if (validation.isValid) {
            const formData = this.getFormData();
            this.emit('submit', formData);
        }
    }
}

// 卡片组件
class Card extends UIComponent {
    constructor(element, options = {}) {
        super(element, {
            collapsible: false,
            ...options
        });
        this.setupCardFeatures();
    }

    setupCardFeatures() {
        const { collapsible } = this.options;
        
        if (collapsible) {
            this.element.innerHTML = `
                <div class="card-header">
                    <h3 class="card-title">${this.options.title || ''}</h3>
                    <button class="card-toggle" aria-expanded="false">展开</button>
                </div>
                <div class="card-content" style="display: none;">
                    ${this.element.innerHTML}
                </div>
            `;
            
            const toggle = this.element.querySelector('.card-toggle');
            const content = this.element.querySelector('.card-content');
            
            toggle.addEventListener('click', () => {
                const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
                toggle.setAttribute('aria-expanded', !isExpanded);
                toggle.textContent = isExpanded ? '展开' : '收起';
                content.style.display = isExpanded ? 'none' : '';
                this.emit('toggle', !isExpanded);
            });
        }
    }

    setContent(content) {
        const contentElement = this.element.querySelector('.card-content') || this.element;
        contentElement.innerHTML = content;
    }
}

// 模态框组件
class Modal extends UIComponent {
    constructor(element, options = {}) {
        super(element, {
            size: 'medium',
            closable: true,
            backdropClose: true,
            ...options
        });
        this.setupModal();
    }

    setupModal() {
        this.createModalStructure();
        this.setupEventListeners();
    }

    createModalStructure() {
        if (!this.element.classList.contains('modal-overlay')) {
            this.element.innerHTML = `
                <div class="modal-backdrop" aria-hidden="true"></div>
                <div class="modal-container" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                    <div class="modal-header">
                        <h2 id="modal-title" class="modal-title">${this.options.title || ''}</h2>
                        ${this.options.closable ? '<button class="modal-close" aria-label="关闭">×</button>' : ''}
                    </div>
                    <div class="modal-content">
                        ${this.element.innerHTML}
                    </div>
                    <div class="modal-footer">
                        ${this.options.footer || ''}
                    </div>
                </div>
            `;
        }
    }

    setupEventListeners() {
        const { backdropClose, closable } = this.options;
        
        if (backdropClose) {
            const backdrop = this.element.querySelector('.modal-backdrop');
            backdrop.addEventListener('click', () => this.close());
        }

        if (closable) {
            const closeBtn = this.element.querySelector('.modal-close');
            closeBtn.addEventListener('click', () => this.close());
            
            // ESC键关闭
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.state.isVisible) {
                    this.close();
                }
            });
        }
    }

    open() {
        this.show();
        document.body.style.overflow = 'hidden';
        this.emit('open');
        
        // 焦点管理
        const firstFocusable = this.element.querySelector('input, button, select, textarea');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    close() {
        this.hide();
        document.body.style.overflow = '';
        this.emit('close');
    }
}

// 加载指示器组件
class LoadingIndicator extends UIComponent {
    constructor(element, options = {}) {
        super(element, {
            type: 'spinner', // spinner, dots, pulse
            text: '加载中...',
            ...options
        });
    }

    updateUI() {
        super.updateUI();
        this.element.innerHTML = this.getLoadingContent();
    }

    getLoadingContent() {
        const { type, text } = this.options;
        
        let loaderContent = '';
        switch (type) {
            case 'dots':
                loaderContent = '<div class="loading-dots"><span></span><span></span><span></span></div>';
                break;
            case 'pulse':
                loaderContent = '<div class="loading-pulse"></div>';
                break;
            default:
                loaderContent = '<div class="loading-spinner"></div>';
        }

        return `
            <div class="loading-content">
                ${loaderContent}
                ${text ? `<span class="loading-text">${text}</span>` : ''}
            </div>
        `;
    }
}

// 空状态组件
class EmptyState extends UIComponent {
    constructor(element, options = {}) {
        super(element, {
            icon: '📭',
            title: '暂无数据',
            description: '暂时没有可用内容',
            action: null,
            ...options
        });
    }

    updateUI() {
        super.updateUI();
        this.element.innerHTML = this.getEmptyStateContent();
        
        if (this.options.action) {
            const actionBtn = this.element.querySelector('.empty-state-action');
            actionBtn.addEventListener('click', this.options.action.onClick);
        }
    }

    getEmptyStateContent() {
        const { icon, title, description, action } = this.options;
        
        return `
            <div class="empty-state-content">
                <div class="empty-state-icon">${icon}</div>
                <h3 class="empty-state-title">${title}</h3>
                <p class="empty-state-description">${description}</p>
                ${action ? `<button class="empty-state-action btn btn-primary">${action.text}</button>` : ''}
            </div>
        `;
    }
}

// 通知组件
class Notification extends UIComponent {
    constructor(element, options = {}) {
        super(element, {
            type: 'info', // success, error, warning, info
            duration: 5000,
            closable: true,
            ...options
        });
    }

    updateUI() {
        super.updateUI();
        this.element.innerHTML = this.getNotificationContent();
        this.setupNotification();
    }

    getNotificationContent() {
        const { type, title, message, closable } = this.options;
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        return `
            <div class="notification-content">
                <div class="notification-icon">${icons[type] || icons.info}</div>
                <div class="notification-text">
                    ${title ? `<div class="notification-title">${title}</div>` : ''}
                    <div class="notification-message">${message}</div>
                </div>
                ${closable ? '<button class="notification-close" aria-label="关闭">×</button>' : ''}
            </div>
        `;
    }

    setupNotification() {
        if (this.options.closable) {
            const closeBtn = this.element.querySelector('.notification-close');
            closeBtn.addEventListener('click', () => this.hide());
        }

        // 自动关闭
        if (this.options.duration > 0) {
            setTimeout(() => this.hide(), this.options.duration);
        }
    }

    static show(options) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
        
        const instance = new Notification(notification, options);
        instance.show();
        
        setTimeout(() => {
            instance.hide();
            document.body.removeChild(notification);
        }, options.duration || 5000);
        
        return instance;
    }
}

// 组件工厂
class ComponentFactory {
    static create(type, element, options = {}) {
        switch (type.toLowerCase()) {
            case 'button':
                return new Button(element, options);
            case 'form':
                return new Form(element, options);
            case 'card':
                return new Card(element, options);
            case 'modal':
                return new Modal(element, options);
            case 'loading':
            case 'loadingindicator':
                return new LoadingIndicator(element, options);
            case 'empty':
            case 'emptystate':
                return new EmptyState(element, options);
            case 'notification':
                return new Notification(element, options);
            default:
                return new UIComponent(element, options);
        }
    }

    static initAll(selector = '[data-component]') {
        const elements = document.querySelectorAll(selector);
        const components = [];
        
        elements.forEach(element => {
            const type = element.getAttribute('data-component');
            const options = JSON.parse(element.getAttribute('data-options') || '{}');
            const component = ComponentFactory.create(type, element, options);
            components.push(component);
        });
        
        return components;
    }
}

// 导出类和函数
window.UIComponent = UIComponent;
window.Button = Button;
window.Form = Form;
window.Card = Card;
window.Modal = Modal;
window.LoadingIndicator = LoadingIndicator;
window.EmptyState = EmptyState;
window.Notification = Notification;
window.ComponentFactory = ComponentFactory;

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    ComponentFactory.initAll();
});