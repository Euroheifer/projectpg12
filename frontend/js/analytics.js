/**
 * 用户行为分析模块 (User Analytics Module)
 * 提供页面访问、用户行为跟踪、错误监控等功能
 */

class AnalyticsManager {
    constructor(config = {}) {
        this.config = {
            apiEndpoint: config.apiEndpoint || '/api/analytics',
            autoTrack: config.autoTrack !== false,
            sessionTimeout: config.sessionTimeout || 1800000, // 30分钟
            batchSize: config.batchSize || 10,
            sendInterval: config.sendInterval || 10000, // 10秒
            ...config
        };
        
        this.events = [];
        this.sessionId = this.generateSessionId();
        this.userId = this.loadUserId();
        this.pageViews = [];
        this.performanceMetrics = {};
        this.userJourney = [];
        this.errorLog = [];
        
        this.init();
    }

    /**
     * 初始化分析管理器
     */
    init() {
        if (this.config.autoTrack) {
            this.setupAutoTracking();
        }
        
        this.setupPeriodicFlush();
        this.setupVisibilityChange();
        this.setupBeforeUnload();
        this.setupErrorHandling();
        this.setupPerformanceTracking();
        
        console.log('Analytics Manager initialized');
    }

    /**
     * 生成会话ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 加载用户ID
     */
    loadUserId() {
        let userId = localStorage.getItem('analytics_user_id');
        if (!userId) {
            userId = this.generateUserId();
            localStorage.setItem('analytics_user_id', userId);
        }
        return userId;
    }

    /**
     * 生成用户ID
     */
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 设置自动跟踪
     */
    setupAutoTracking() {
        // 页面访问跟踪
        this.trackPageView();
        
        // 页面卸载前清理
        window.addEventListener('beforeunload', () => {
            this.flushEvents();
        });
    }

    /**
     * 跟踪页面访问
     */
    trackPageView(pageData = {}) {
        const pageView = {
            type: 'page_view',
            sessionId: this.sessionId,
            userId: this.userId,
            url: window.location.href,
            title: document.title,
            referrer: document.referrer,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            ...pageData
        };
        
        this.pageViews.push(pageView);
        this.addEvent(pageView);
        
        // 更新用户旅程
        this.updateUserJourney(pageView);
        
        console.log('Page view tracked:', pageView);
    }

    /**
     * 跟踪用户行为
     */
    trackEvent(eventName, eventData = {}) {
        const event = {
            type: 'user_event',
            sessionId: this.sessionId,
            userId: this.userId,
            eventName,
            timestamp: Date.now(),
            url: window.location.href,
            ...eventData
        };
        
        this.addEvent(event);
        console.log('Event tracked:', event);
    }

    /**
     * 跟踪用户交互
     */
    trackInteraction(element, action, additionalData = {}) {
        const interaction = {
            type: 'user_interaction',
            sessionId: this.sessionId,
            userId: this.userId,
            element: {
                tagName: element.tagName,
                id: element.id,
                className: element.className,
                text: element.textContent?.substring(0, 100) // 限制文本长度
            },
            action, // click, hover, focus, blur等
            timestamp: Date.now(),
            position: {
                x: additionalData.x,
                y: additionalData.y
            },
            url: window.location.href,
            ...additionalData
        };
        
        this.addEvent(interaction);
        this.updateUserJourney(interaction);
        
        console.log('Interaction tracked:', interaction);
    }

    /**
     * 跟踪表单提交
     */
    trackFormSubmission(form, formData = {}) {
        const formSubmission = {
            type: 'form_submission',
            sessionId: this.sessionId,
            userId: this.userId,
            form: {
                id: form.id,
                name: form.name,
                action: form.action,
                method: form.method
            },
            formData, // 注意：这里应该脱敏敏感数据
            timestamp: Date.now(),
            url: window.location.href
        };
        
        this.addEvent(formSubmission);
        this.updateUserJourney(formSubmission);
        
        console.log('Form submission tracked:', formSubmission);
    }

    /**
     * 跟踪功能使用
     */
    trackFeatureUsage(featureName, usageData = {}) {
        const featureUsage = {
            type: 'feature_usage',
            sessionId: this.sessionId,
            userId: this.userId,
            featureName,
            usageData,
            timestamp: Date.now(),
            url: window.location.href
        };
        
        this.addEvent(featureUsage);
        console.log('Feature usage tracked:', featureUsage);
    }

    /**
     * 跟踪错误
     */
    trackError(error, errorContext = {}) {
        const errorEvent = {
            type: 'error',
            sessionId: this.sessionId,
            userId: this.userId,
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context: {
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: Date.now(),
                ...errorContext
            },
            timestamp: Date.now()
        };
        
        this.errorLog.push(errorEvent);
        this.addEvent(errorEvent);
        
        console.error('Error tracked:', errorEvent);
    }

    /**
     * 跟踪性能指标
     */
    trackPerformance(metricName, value, metadata = {}) {
        const performanceEvent = {
            type: 'performance',
            sessionId: this.sessionId,
            userId: this.userId,
            metricName,
            value,
            metadata,
            timestamp: Date.now(),
            url: window.location.href
        };
        
        this.performanceMetrics[metricName] = {
            value,
            timestamp: Date.now(),
            ...metadata
        };
        
        this.addEvent(performanceEvent);
        console.log('Performance tracked:', performanceEvent);
    }

    /**
     * 设置用户属性
     */
    setUserProperties(properties) {
        const userProperties = {
            type: 'user_properties',
            sessionId: this.sessionId,
            userId: this.userId,
            properties,
            timestamp: Date.now(),
            url: window.location.href
        };
        
        this.addEvent(userProperties);
        console.log('User properties set:', properties);
    }

    /**
     * 跟踪用户满意度
     */
    trackUserSatisfaction(score, feedback = {}) {
        const satisfaction = {
            type: 'user_satisfaction',
            sessionId: this.sessionId,
            userId: this.userId,
            score, // 1-5分
            feedback,
            timestamp: Date.now(),
            url: window.location.href
        };
        
        this.addEvent(satisfaction);
        this.updateUserJourney(satisfaction);
        
        console.log('User satisfaction tracked:', satisfaction);
    }

    /**
     * A/B测试跟踪
     */
    trackABTest(testName, variant, conversion = false) {
        const abTest = {
            type: 'ab_test',
            sessionId: this.sessionId,
            userId: this.userId,
            testName,
            variant,
            conversion,
            timestamp: Date.now(),
            url: window.location.href
        };
        
        this.addEvent(abTest);
        console.log('A/B test tracked:', abTest);
    }

    /**
     * 添加事件到队列
     */
    addEvent(event) {
        this.events.push(event);
        
        // 自动发送
        if (this.events.length >= this.config.batchSize) {
            this.flushEvents();
        }
    }

    /**
     * 刷新事件队列
     */
    async flushEvents() {
        if (this.events.length === 0) return;
        
        const eventsToSend = [...this.events];
        this.events = [];
        
        try {
            await this.sendEvents(eventsToSend);
            console.log(`Sent ${eventsToSend.length} events`);
        } catch (error) {
            console.error('Failed to send events:', error);
            // 将事件重新加入队列
            this.events.unshift(...eventsToSend);
        }
    }

    /**
     * 发送事件到服务器
     */
    async sendEvents(events) {
        const payload = {
            sessionId: this.sessionId,
            userId: this.userId,
            events,
            timestamp: Date.now(),
            userAgent: navigator.userAgent
        };
        
        const response = await fetch(this.config.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to send events: ${response.status}`);
        }
        
        return response.json();
    }

    /**
     * 设置定期刷新
     */
    setupPeriodicFlush() {
        setInterval(() => {
            this.flushEvents();
        }, this.config.sendInterval);
    }

    /**
     * 设置页面可见性变化处理
     */
    setupVisibilityChange() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.flushEvents();
            }
        });
    }

    /**
     * 设置页面卸载处理
     */
    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            // 使用sendBeacon确保数据发送
            if (navigator.sendBeacon && this.events.length > 0) {
                const payload = {
                    sessionId: this.sessionId,
                    userId: this.userId,
                    events: this.events,
                    timestamp: Date.now(),
                    userAgent: navigator.userAgent
                };
                
                navigator.sendBeacon(
                    this.config.apiEndpoint,
                    JSON.stringify(payload)
                );
            }
        });
    }

    /**
     * 设置错误处理
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            this.trackError(event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError(new Error(event.reason), {
                type: 'unhandled_promise_rejection'
            });
        });
    }

    /**
     * 设置性能跟踪
     */
    setupPerformanceTracking() {
        // 使用Performance Observer跟踪导航时序
        if ('PerformanceObserver' in window) {
            const navigationObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    this.trackNavigationTiming(entry);
                });
            });
            
            navigationObserver.observe({ entryTypes: ['navigation'] });
            
            // 跟踪FCP
            const paintObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.name === 'first-contentful-paint') {
                        this.trackPerformance('fcp', entry.startTime);
                    }
                });
            });
            
            paintObserver.observe({ entryTypes: ['paint'] });
        }
    }

    /**
     * 跟踪导航时序
     */
    trackNavigationTiming(entry) {
        const timing = {
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            tcp: entry.connectEnd - entry.connectStart,
            ssl: entry.connectEnd - entry.secureConnectionStart,
            ttfb: entry.responseStart - entry.requestStart,
            download: entry.responseEnd - entry.responseStart,
            dom: entry.domContentLoadedEventEnd - entry.responseEnd,
            load: entry.loadEventEnd - entry.loadEventStart
        };
        
        Object.entries(timing).forEach(([name, value]) => {
            if (value > 0) {
                this.trackPerformance(name, value, { source: 'navigation-timing' });
            }
        });
    }

    /**
     * 更新用户旅程
     */
    updateUserJourney(event) {
        this.userJourney.push({
            ...event,
            sessionStep: this.userJourney.length + 1
        });
        
        // 保持最近50步
        if (this.userJourney.length > 50) {
            this.userJourney.shift();
        }
    }

    /**
     * 获取分析报告
     */
    getAnalyticsReport() {
        return {
            sessionId: this.sessionId,
            userId: this.userId,
            pageViews: this.pageViews,
            events: this.events,
            errorLog: this.errorLog,
            performanceMetrics: this.performanceMetrics,
            userJourney: this.userJourney,
            generatedAt: Date.now()
        };
    }

    /**
     * 重置分析数据
     */
    resetAnalytics() {
        this.events = [];
        this.pageViews = [];
        this.errorLog = [];
        this.userJourney = [];
        this.performanceMetrics = {};
        
        // 生成新的会话ID
        this.sessionId = this.generateSessionId();
        
        console.log('Analytics data reset');
    }

    /**
     * 销毁分析管理器
     */
    destroy() {
        this.flushEvents();
        window.removeEventListener('beforeunload', () => {});
        console.log('Analytics Manager destroyed');
    }
}

// 用户行为分析工具函数
const AnalyticsUtils = {
    /**
     * 自动跟踪点击事件
     */
    setupClickTracking() {
        document.addEventListener('click', (event) => {
            if (window.analyticsManager) {
                window.analyticsManager.trackInteraction(
                    event.target,
                    'click',
                    {
                        x: event.clientX,
                        y: event.clientY
                    }
                );
            }
        });
    },

    /**
     * 自动跟踪表单提交
     */
    setupFormTracking() {
        document.addEventListener('submit', (event) => {
            if (window.analyticsManager) {
                const formData = new FormData(event.target);
                const data = {};
                for (let [key, value] of formData.entries()) {
                    // 脱敏敏感数据
                    if (key.toLowerCase().includes('password') || 
                        key.toLowerCase().includes('credit') ||
                        key.toLowerCase().includes('card')) {
                        data[key] = '[REDACTED]';
                    } else {
                        data[key] = value;
                    }
                }
                
                window.analyticsManager.trackFormSubmission(event.target, data);
            }
        });
    },

    /**
     * 自动跟踪页面滚动
     */
    setupScrollTracking() {
        let maxScroll = 0;
        const trackScroll = () => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
            );
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                if (window.analyticsManager && scrollPercent % 25 === 0) {
                    window.analyticsManager.trackEvent('scroll_depth', {
                        percent: scrollPercent
                    });
                }
            }
        };
        
        window.addEventListener('scroll', AnalyticsUtils.throttle(trackScroll, 1000));
    },

    /**
     * 节流函数
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * 深度克隆对象
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== "object") return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === "object") {
            const copy = {};
            Object.keys(obj).forEach(key => {
                copy[key] = this.deepClone(obj[key]);
            });
            return copy;
        }
    }
};

// 创建全局分析管理器实例
window.analyticsManager = new AnalyticsManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnalyticsManager, AnalyticsUtils };
}