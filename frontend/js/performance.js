/**
 * 性能优化模块 (Performance Optimization Module)
 * 提供代码分割、懒加载、内存管理、图片优化等功能
 */

class PerformanceManager {
    constructor() {
        this.cache = new Map();
        this.observers = new Map();
        this.performanceMetrics = {};
        this.init();
    }

    /**
     * 初始化性能监控
     */
    init() {
        this.initPerformanceObserver();
        this.initMemoryMonitoring();
        this.initImageLazyLoading();
        this.monitorNetworkRequests();
        this.collectCoreWebVitals();
        this.setupCodeSplitting();
        console.log('Performance Manager initialized');
    }

    /**
     * 初始化性能观察器
     */
    initPerformanceObserver() {
        // 监听性能指标
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.handlePerformanceEntry(entry);
                }
            });
            
            // 观察多种性能指标
            observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input'] });
            this.observers.set('main', observer);
        }
    }

    /**
     * 处理性能条目
     */
    handlePerformanceEntry(entry) {
        switch (entry.entryType) {
            case 'navigation':
                this.performanceMetrics.navigation = {
                    loadTime: entry.loadEventEnd - entry.loadEventStart,
                    domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                    firstByte: entry.responseStart - entry.requestStart
                };
                break;
            case 'paint':
                if (entry.name === 'first-contentful-paint') {
                    this.performanceMetrics.fcp = entry.startTime;
                }
                break;
            case 'largest-contentful-paint':
                this.performanceMetrics.lcp = entry.startTime;
                break;
            case 'first-input':
                this.performanceMetrics.fid = entry.processingStart - entry.startTime;
                break;
        }
    }

    /**
     * 收集核心Web Vitals指标
     */
    collectCoreWebVitals() {
        // LCP (Largest Contentful Paint)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.performanceMetrics.lcp = lastEntry.startTime;
            console.log('LCP:', lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // FID (First Input Delay)
        new PerformanceObserver((entryList) => {
            const firstInput = entryList.getEntries()[0];
            if (firstInput) {
                this.performanceMetrics.fid = firstInput.processingStart - firstInput.startTime;
                console.log('FID:', this.performanceMetrics.fid);
            }
        }).observe({ entryTypes: ['first-input'] });

        // CLS (Cumulative Layout Shift)
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            this.performanceMetrics.cls = clsValue;
            console.log('CLS:', clsValue);
        }).observe({ entryTypes: ['layout-shift'] });
    }

    /**
     * 初始化内存监控
     */
    initMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                this.performanceMetrics.memory = {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit
                };
            }, 5000);
        }
    }

    /**
     * 检测内存泄漏
     */
    detectMemoryLeaks() {
        if ('memory' in performance) {
            const before = performance.memory.usedJSHeapSize;
            // 执行一些操作
            setTimeout(() => {
                const after = performance.memory.usedJSHeapSize;
                const diff = after - before;
                
                if (diff > 1024 * 1024) { // 1MB
                    console.warn('Potential memory leak detected:', diff / (1024 * 1024), 'MB');
                    this.reportMemoryLeak(diff);
                }
            }, 1000);
        }
    }

    /**
     * 报告内存泄漏
     */
    reportMemoryLeak(size) {
        const report = {
            type: 'memory-leak',
            size: size,
            timestamp: Date.now(),
            url: window.location.href
        };
        
        // 发送到分析服务
        this.sendToAnalytics('memory-leak', report);
    }

    /**
     * 清理缓存和监听器
     */
    cleanup() {
        // 清理缓存
        this.cache.clear();
        
        // 清理观察器
        this.observers.forEach((observer, key) => {
            observer.disconnect();
        });
        this.observers.clear();
        
        console.log('Performance Manager cleaned up');
    }

    /**
     * 图片懒加载
     */
    initImageLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        this.loadImage(img);
                        observer.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => imageObserver.observe(img));
            this.observers.set('images', imageObserver);
        } else {
            // 后备方案：直接加载所有图片
            images.forEach(img => this.loadImage(img));
        }
    }

    /**
     * 加载图片
     */
    loadImage(img) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                resolve(image);
            };
            image.onerror = reject;
            image.src = img.dataset.src;
        });
    }

    /**
     * 监控网络请求
     */
    monitorNetworkRequests() {
        const originalFetch = window.fetch;
        const requests = new Map();
        
        window.fetch = async (...args) => {
            const start = performance.now();
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;
            
            try {
                const response = await originalFetch(...args);
                const duration = performance.now() - start;
                
                this.logNetworkRequest({
                    url,
                    method: args[1]?.method || 'GET',
                    status: response.status,
                    duration,
                    timestamp: Date.now()
                });
                
                return response;
            } catch (error) {
                const duration = performance.now() - start;
                this.logNetworkRequest({
                    url,
                    method: args[1]?.method || 'GET',
                    error: error.message,
                    duration,
                    timestamp: Date.now()
                });
                throw error;
            }
        };
    }

    /**
     * 记录网络请求
     */
    logNetworkRequest(requestData) {
        this.performanceMetrics.networkRequests = this.performanceMetrics.networkRequests || [];
        this.performanceMetrics.networkRequests.push(requestData);
        
        // 只保留最近100个请求
        if (this.performanceMetrics.networkRequests.length > 100) {
            this.performanceMetrics.networkRequests.shift();
        }
        
        console.log('Network Request:', requestData);
    }

    /**
     * 设置代码分割
     */
    setupCodeSplitting() {
        // 动态导入模块
        window.dynamicImport = (moduleName) => {
            return import(moduleName).then(module => {
                console.log(`Module ${moduleName} loaded dynamically`);
                return module;
            }).catch(error => {
                console.error(`Failed to load module ${moduleName}:`, error);
                throw error;
            });
        };
    }

    /**
     * 懒加载组件
     */
    lazyLoadComponent(element, loader) {
        return new Promise((resolve, reject) => {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    observer.disconnect();
                    loader().then(resolve).catch(reject);
                }
            });
            
            observer.observe(element);
        });
    }

    /**
     * 获取性能指标
     */
    getMetrics() {
        return {
            ...this.performanceMetrics,
            timestamp: Date.now(),
            url: window.location.href
        };
    }

    /**
     * 发送数据到分析服务
     */
    sendToAnalytics(event, data) {
        // 这里可以发送到分析服务，比如 Google Analytics、自建分析服务等
        if (typeof gtag !== 'undefined') {
            gtag('event', event, {
                custom_parameter: JSON.stringify(data)
            });
        }
        
        // 发送到自定义分析接口
        fetch('/api/analytics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event,
                data,
                timestamp: Date.now()
            })
        }).catch(err => console.warn('Failed to send analytics:', err));
    }

    /**
     * 优化滚动性能
     */
    optimizeScrolling() {
        let ticking = false;
        
        const updateScroll = () => {
            // 执行滚动相关的更新
            ticking = false;
        };
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateScroll);
                ticking = true;
            }
        });
    }

    /**
     * 预加载资源
     */
    preloadResource(url, type = 'fetch') {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = url;
        link.as = type;
        document.head.appendChild(link);
    }

    /**
     * 缓存API响应
     */
    cacheApiResponse(key, response, ttl = 300000) { // 5分钟TTL
        const cacheData = {
            data: response,
            timestamp: Date.now(),
            ttl
        };
        
        this.cache.set(key, cacheData);
        
        // 自动清理过期缓存
        setTimeout(() => {
            this.cache.delete(key);
        }, ttl);
    }

    /**
     * 获取缓存的API响应
     */
    getCachedApiResponse(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > cached.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
}

// 性能优化工具函数
const PerformanceUtils = {
    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
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
     * 深度冻结对象
     */
    deepFreeze(obj) {
        Object.freeze(obj);
        Object.getOwnPropertyNames(obj).forEach(prop => {
            if (obj[prop] !== null &&
                (typeof obj[prop] === "object" || typeof obj[prop] === "function") &&
                !Object.isFrozen(obj[prop])) {
                this.deepFreeze(obj[prop]);
            }
        });
        return obj;
    },

    /**
     * 计算函数执行时间
     */
    timeFunction(fn, ...args) {
        const start = performance.now();
        const result = fn(...args);
        const end = performance.now();
        console.log(`Function ${fn.name} took ${end - start} milliseconds`);
        return result;
    }
};

// 创建全局性能管理器实例
window.performanceManager = new PerformanceManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceManager, PerformanceUtils };
}