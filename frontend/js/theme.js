/**
 * 主题系统 - 暗黑/亮色主题切换和自定义主题管理
 * 支持系统主题检测、本地存储和动画过渡效果
 */

class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.availableThemes = {
            light: {
                name: '亮色主题',
                colors: {
                    // 主色调
                    primary: '#3b82f6',
                    primaryHover: '#2563eb',
                    primaryLight: '#dbeafe',
                    
                    // 中性色
                    background: '#ffffff',
                    surface: '#f8fafc',
                    surfaceHover: '#f1f5f9',
                    border: '#e2e8f0',
                    borderHover: '#cbd5e1',
                    
                    // 文本色
                    text: '#1e293b',
                    textSecondary: '#64748b',
                    textMuted: '#94a3b8',
                    textInverse: '#ffffff',
                    
                    // 状态色
                    success: '#10b981',
                    successLight: '#d1fae5',
                    error: '#ef4444',
                    errorLight: '#fee2e2',
                    warning: '#f59e0b',
                    warningLight: '#fef3c7',
                    info: '#06b6d4',
                    infoLight: '#cffafe',
                    
                    // 阴影
                    shadow: 'rgba(0, 0, 0, 0.1)',
                    shadowHover: 'rgba(0, 0, 0, 0.15)'
                },
                animation: {
                    duration: '0.3s',
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
                }
            },
            dark: {
                name: '暗黑主题',
                colors: {
                    // 主色调
                    primary: '#60a5fa',
                    primaryHover: '#3b82f6',
                    primaryLight: '#1e3a8a',
                    
                    // 中性色
                    background: '#0f172a',
                    surface: '#1e293b',
                    surfaceHover: '#334155',
                    border: '#334155',
                    borderHover: '#475569',
                    
                    // 文本色
                    text: '#f8fafc',
                    textSecondary: '#cbd5e1',
                    textMuted: '#94a3b8',
                    textInverse: '#1e293b',
                    
                    // 状态色
                    success: '#34d399',
                    successLight: '#064e3b',
                    error: '#f87171',
                    errorLight: '#7f1d1d',
                    warning: '#fbbf24',
                    warningLight: '#78350f',
                    info: '#22d3ee',
                    infoLight: '#164e63',
                    
                    // 阴影
                    shadow: 'rgba(0, 0, 0, 0.3)',
                    shadowHover: 'rgba(0, 0, 0, 0.4)'
                },
                animation: {
                    duration: '0.3s',
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
                }
            }
        };
        
        this.init();
    }

    // 初始化主题管理器
    init() {
        this.detectSystemTheme();
        this.loadSavedTheme();
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
        this.setupCSSVariables();
        this.createThemeToggleButton();
    }

    // 检测系统主题
    detectSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    // 加载保存的主题
    loadSavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && this.availableThemes[savedTheme]) {
            this.currentTheme = savedTheme;
        } else {
            // 使用系统主题作为默认主题
            this.currentTheme = this.detectSystemTheme();
        }
    }

    // 设置事件监听
    setupEventListeners() {
        // 监听系统主题变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.setTheme(e.matches ? 'dark' : 'light', false);
            }
        });

        // 监听主题变化事件
        document.addEventListener('themeChange', (event) => {
            this.handleThemeChange(event.detail);
        });
    }

    // 设置CSS变量
    setupCSSVariables() {
        const root = document.documentElement;
        const theme = this.getThemeData(this.currentTheme);
        
        // 设置颜色变量
        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
        });

        // 设置动画变量
        Object.entries(theme.animation).forEach(([key, value]) => {
            root.style.setProperty(`--animation-${key}`, value);
        });
    }

    // 创建主题切换按钮
    createThemeToggleButton() {
        const button = document.createElement('button');
        button.className = 'theme-toggle';
        button.setAttribute('aria-label', '切换主题');
        button.innerHTML = this.getThemeIcon();
        
        button.addEventListener('click', () => {
            this.toggleTheme();
        });

        // 添加到导航栏（如果存在）
        const nav = document.querySelector('nav');
        if (nav) {
            nav.appendChild(button);
        } else {
            // 添加到页面右上角
            document.body.appendChild(button);
        }
    }

    // 获取主题图标
    getThemeIcon() {
        return this.currentTheme === 'dark' ? '☀️' : '🌙';
    }

    // 应用主题
    applyTheme(themeName, animate = true) {
        if (!this.availableThemes[themeName]) {
            console.warn(`主题 "${themeName}" 不存在`);
            return;
        }

        const previousTheme = this.currentTheme;
        this.currentTheme = themeName;
        this.setupCSSVariables();
        
        // 添加主题类名
        document.body.classList.remove(`theme-${previousTheme}`);
        document.body.classList.add(`theme-${themeName}`);
        
        // 更新切换按钮图标
        const toggleButton = document.querySelector('.theme-toggle');
        if (toggleButton) {
            toggleButton.innerHTML = this.getThemeIcon();
        }

        // 触发动画
        if (animate) {
            this.animateThemeTransition(previousTheme, themeName);
        }

        // 保存主题到本地存储
        localStorage.setItem('theme', themeName);

        // 触发自定义事件
        document.dispatchEvent(new CustomEvent('themeChanged', {
            detail: {
                previousTheme,
                newTheme: themeName,
                theme: this.getThemeData(themeName)
            }
        }));
    }

    // 主题切换动画
    animateThemeTransition(fromTheme, toTheme) {
        const duration = this.getThemeData(toTheme).animation.duration;
        
        // 创建过渡效果
        document.body.style.transition = `
            background-color ${duration},
            color ${duration},
            border-color ${duration}
        `;

        // 清除过渡效果
        setTimeout(() => {
            document.body.style.transition = '';
        }, this.parseDuration(duration));
    }

    // 解析持续时间
    parseDuration(duration) {
        const match = duration.match(/(\d+(?:\.\d+)?)(ms|s)/);
        if (!match) return 300;
        
        const value = parseFloat(match[1]);
        const unit = match[2];
        
        return unit === 's' ? value * 1000 : value;
    }

    // 切换主题
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    // 设置主题
    setTheme(themeName, animate = true) {
        this.applyTheme(themeName, animate);
    }

    // 获取当前主题
    getCurrentTheme() {
        return this.currentTheme;
    }

    // 获取主题数据
    getThemeData(themeName) {
        return this.availableThemes[themeName];
    }

    // 添加自定义主题
    addCustomTheme(name, themeData) {
        this.availableThemes[name] = {
            name: themeData.name || name,
            colors: { ...this.availableThemes.light.colors, ...themeData.colors },
            animation: { ...this.availableThemes.light.animation, ...themeData.animation }
        };
    }

    // 获取主题列表
    getAvailableThemes() {
        return Object.keys(this.availableThemes).map(key => ({
            key,
            name: this.availableThemes[key].name
        }));
    }

    // 监听主题变化
    onThemeChange(callback) {
        document.addEventListener('themeChanged', callback);
    }

    // 移除主题变化监听
    offThemeChange(callback) {
        document.removeEventListener('themeChanged', callback);
    }

    // 获取主题颜色
    getColor(colorKey, themeName = this.currentTheme) {
        const theme = this.getThemeData(themeName);
        return theme.colors[colorKey];
    }

    // 创建主题选择器
    createThemeSelector() {
        const selector = document.createElement('select');
        selector.className = 'theme-selector';
        selector.setAttribute('aria-label', '选择主题');
        
        // 添加主题选项
        this.getAvailableThemes().forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.key;
            option.textContent = theme.name;
            option.selected = theme.key === this.currentTheme;
            selector.appendChild(option);
        });
        
        selector.addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });

        return selector;
    }

    // 导出主题配置
    exportTheme(themeName = this.currentTheme) {
        const theme = this.getThemeData(themeName);
        const config = {
            name: theme.name,
            colors: theme.colors,
            animation: theme.animation,
            version: '1.0.0',
            createdAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(config, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `theme-${themeName}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    // 导入主题配置
    importTheme(configFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                const themeName = config.name.toLowerCase().replace(/\s+/g, '-');
                this.addCustomTheme(themeName, config);
                this.setTheme(themeName);
                Notification.show({
                    type: 'success',
                    title: '主题导入成功',
                    message: `主题 "${config.name}" 已成功导入`
                });
            } catch (error) {
                Notification.show({
                    type: 'error',
                    title: '主题导入失败',
                    message: '无法解析主题配置文件'
                });
            }
        };
        reader.readAsText(configFile);
    }

    // 重置为默认主题
    resetToDefault() {
        localStorage.removeItem('theme');
        this.setTheme(this.detectSystemTheme());
    }

    // 销毁主题管理器
    destroy() {
        const toggleButton = document.querySelector('.theme-toggle');
        if (toggleButton) {
            toggleButton.remove();
        }
    }
}

// 主题相关工具函数
const ThemeUtils = {
    // 获取对比色
    getContrastColor(hexColor) {
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    },

    // 调整颜色亮度
    adjustBrightness(hexColor, percent) {
        const num = parseInt(hexColor.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    },

    // 生成主题调色板
    generatePalette(baseColor) {
        const palette = {
            50: this.adjustBrightness(baseColor, 95),
            100: this.adjustBrightness(baseColor, 90),
            200: this.adjustBrightness(baseColor, 80),
            300: this.adjustBrightness(baseColor, 70),
            400: this.adjustBrightness(baseColor, 60),
            500: baseColor,
            600: this.adjustBrightness(baseColor, -10),
            700: this.adjustBrightness(baseColor, -20),
            800: this.adjustBrightness(baseColor, -30),
            900: this.adjustBrightness(baseColor, -40)
        };
        
        return palette;
    },

    // 检查是否为暗色主题
    isDarkTheme(themeName, themeManager) {
        const theme = themeManager.getThemeData(themeName);
        const bgColor = theme.colors.background;
        const brightness = (parseInt(bgColor.substr(1, 2), 16) * 299 +
                          parseInt(bgColor.substr(3, 2), 16) * 587 +
                          parseInt(bgColor.substr(5, 2), 16) * 114) / 1000;
        return brightness < 128;
    }
};

// 创建全局主题管理器实例
window.themeManager = new ThemeManager();
window.ThemeManager = ThemeManager;
window.ThemeUtils = ThemeUtils;

// 自动应用保存的主题
document.addEventListener('DOMContentLoaded', () => {
    // 确保主题在页面加载时正确应用
    window.themeManager.applyTheme(window.themeManager.getCurrentTheme());
});