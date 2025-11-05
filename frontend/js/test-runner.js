/**
 * 测试运行器 - 自动化测试系统
 * 支持单元测试、集成测试、端到端测试、性能测试、无障碍测试
 */

class TestRunner {
    constructor() {
        this.tests = [];
        this.results = [];
        this.categories = {
            unit: '单元测试',
            integration: '集成测试',
            e2e: '端到端测试',
            performance: '性能测试',
            accessibility: '无障碍测试',
            security: '安全测试',
            compatibility: '兼容性测试'
        };
        this.currentTestIndex = 0;
        this.startTime = null;
        this.stats = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0
        };
        this.mockData = this.initializeMockData();
        this.testStubs = this.initializeTestStubs();
        this.performanceThresholds = {
            loadTime: 3000,
            responseTime: 500,
            memoryUsage: 50 * 1024 * 1024
        };
    }

    /**
     * 添加测试用例
     */
    addTest(testConfig) {
        const test = {
            id: this.tests.length + 1,
            name: testConfig.name,
            test: testConfig.test,
            category: testConfig.category || 'unit',
            priority: testConfig.priority || 'normal',
            timeout: testConfig.timeout || 5000,
            container: testConfig.container,
            retries: testConfig.retries || 0,
            setup: testConfig.setup || null,
            teardown: testConfig.teardown || null
        };

        this.tests.push(test);
        return test.id;
    }

    /**
     * 初始化模拟数据
     */
    initializeMockData() {
        return {
            users: [
                {id: 1, username: 'testuser', email: 'test@example.com', role: 'user'},
                {id: 2, username: 'admin', email: 'admin@example.com', role: 'admin'},
                {id: 3, username: 'moderator', email: 'mod@example.com', role: 'moderator'}
            ],
            groups: [
                {id: 1, name: '测试群组1', description: '第一个测试群组', memberCount: 5},
                {id: 2, name: '测试群组2', description: '第二个测试群组', memberCount: 3},
                {id: 3, name: '私人群组', description: '私人测试群组', memberCount: 2, isPrivate: true}
            ],
            expenses: [
                {id: 1, amount: 25.50, description: '午餐', category: '餐饮', date: '2025-11-05'},
                {id: 2, amount: 150.00, description: '购物', category: '购物', date: '2025-11-04'},
                {id: 3, amount: 75.25, description: '交通费', category: '交通', date: '2025-11-03'}
            ],
            payments: [
                {id: 1, from: 1, to: 2, amount: 50.00, status: 'completed', date: '2025-11-05'},
                {id: 2, from: 2, to: 3, amount: 25.00, status: 'pending', date: '2025-11-04'}
            ],
            files: [
                {id: 1, name: 'receipt1.jpg', size: 1024 * 1024, type: 'image/jpeg'},
                {id: 2, name: 'document.pdf', size: 512 * 1024, type: 'application/pdf'}
            ]
        };
    }

    /**
     * 初始化测试桩数据
     */
    initializeTestStubs() {
        return {
            // 模拟网络请求
            fetch: (url, options = {}) => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        if (url.includes('/api/auth/login')) {
                            resolve({
                                ok: true,
                                json: () => Promise.resolve({
                                    success: true,
                                    token: 'mock-token-' + Date.now(),
                                    user: {id: 1, username: 'testuser'}
                                })
                            });
                        } else if (url.includes('/api/groups')) {
                            resolve({
                                ok: true,
                                json: () => Promise.resolve({
                                    success: true,
                                    data: this.mockData.groups
                                })
                            });
                        } else if (url.includes('/api/expenses')) {
                            resolve({
                                ok: true,
                                json: () => Promise.resolve({
                                    success: true,
                                    data: this.mockData.expenses
                                })
                            });
                        } else {
                            resolve({
                                ok: true,
                                json: () => Promise.resolve({success: true})
                            });
                        }
                    }, Math.random() * 100 + 50); // 模拟网络延迟
                });
            },

            // 模拟定时器
            setTimeout: (fn, delay) => {
                return setTimeout(fn, Math.random() * delay);
            },

            // 模拟DOM操作
            createElement: (tag, attributes = {}) => {
                const element = document.createElement(tag);
                Object.keys(attributes).forEach(key => {
                    if (key === 'className') {
                        element.className = attributes[key];
                    } else if (key === 'textContent') {
                        element.textContent = attributes[key];
                    } else {
                        element.setAttribute(key, attributes[key]);
                    }
                });
                return element;
            },

            // 模拟本地存储
            localStorage: {
                getItem: (key) => {
                    if (key === 'authToken') return 'mock-token';
                    if (key === 'userId') return '1';
                    return null;
                },
                setItem: (key, value) => {
                    console.log(`Storage set: ${key} = ${value}`);
                    return true;
                },
                removeItem: (key) => {
                    console.log(`Storage remove: ${key}`);
                    return true;
                }
            },

            // 模拟文件API
            FileReader: class {
                constructor() {
                    this.result = null;
                    this.onload = null;
                }
                readAsDataURL(file) {
                    setTimeout(() => {
                        this.result = 'data:' + file.type + ';base64,' + btoa('mock file content');
                        if (this.onload) this.onload();
                    }, 100);
                }
            },

            // 模拟Canvas API
            HTMLCanvasElement: {
                getContext: (type) => {
                    if (type === '2d') {
                        return {
                            fillRect: () => {},
                            clearRect: () => {},
                            getImageData: () => ({data: new Uint8ClampedArray(100)}),
                            putImageData: () => {},
                            createImageData: () => ({data: new Uint8ClampedArray(100)}),
                            setTransform: () => {},
                            drawImage: () => {},
                            save: () => {},
                            fillText: () => {},
                            restore: () => {},
                            beginPath: () => {},
                            moveTo: () => {},
                            lineTo: () => {},
                            closePath: () => {},
                            stroke: () => {},
                            fill: () => {},
                            measureText: () => ({width: 100}),
                            transform: () => {},
                            scale: () => {}
                        };
                    }
                    return null;
                }
            }
        };
    }

    /**
     * 运行单个测试
     */
    async runTest(test) {
        const startTime = performance.now();
        const result = {
            id: test.id,
            name: test.name,
            category: test.category,
            status: 'pending',
            duration: 0,
            error: null,
            timestamp: new Date().toISOString()
        };

        try {
            // 执行setup
            if (test.setup) {
                await test.setup();
            }

            // 执行测试，支持重试
            let retryCount = 0;
            while (retryCount <= test.retries) {
                try {
                    const testResult = await Promise.race([
                        test.test(),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('测试超时')), test.timeout)
                        )
                    ]);

                    if (testResult) {
                        result.status = 'passed';
                        break;
                    } else {
                        throw new Error('测试返回false');
                    }
                } catch (error) {
                    retryCount++;
                    if (retryCount > test.retries) {
                        throw error;
                    }
                    console.log(`测试 "${test.name}" 重试 ${retryCount}/${test.retries}`);
                    await new Promise(resolve => setTimeout(resolve, 100)); // 重试间隔
                }
            }

            // 执行teardown
            if (test.teardown) {
                await test.teardown();
            }

        } catch (error) {
            result.status = 'failed';
            result.error = error.message;
            console.error(`测试失败: ${test.name}`, error);
        }

        result.duration = performance.now() - startTime;
        this.results.push(result);
        this.updateTestDisplay(result);
        this.updateStats();

        return result;
    }

    /**
     * 更新测试显示
     */
    updateTestDisplay(result) {
        if (!result.container) return;

        const testElement = document.getElementById(`test-${result.id}`);
        if (testElement) {
            testElement.remove();
        }

        const testDiv = this.createTestElement(result);
        result.container.appendChild(testDiv);
    }

    /**
     * 创建测试元素
     */
    createTestElement(result) {
        const testDiv = document.createElement('div');
        testDiv.className = `test-result test-${result.status}`;
        testDiv.id = `test-${result.id}`;

        const statusIcon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏳';
        const durationText = `${result.duration.toFixed(2)}ms`;

        testDiv.innerHTML = `
            <span class="test-status-icon">${statusIcon}</span>
            <span class="test-name">${result.name}</span>
            <span class="test-category">[${this.categories[result.category] || result.category}]</span>
            <span class="test-duration">${durationText}</span>
            ${result.error ? `<div class="test-error">错误: ${result.error}</div>` : ''}
        `;

        return testDiv;
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const total = this.results.length;

        document.getElementById('totalTests').textContent = total;
        document.getElementById('passedTests').textContent = passed;
        document.getElementById('failedTests').textContent = failed;

        const coverage = total > 0 ? Math.round((passed / total) * 100) : 0;
        document.getElementById('testCoverage').textContent = coverage + '%';

        // 更新进度条
        const progress = total > 0 ? (passed / total) * 100 : 0;
        document.getElementById('progressBar').style.width = progress + '%';
    }

    /**
     * 运行所有测试
     */
    async runAll() {
        this.clearResults();
        this.startTime = performance.now();

        console.log('开始运行所有测试...');

        for (const test of this.tests) {
            await this.runTest(test);
            // 添加小延迟以观察测试进度
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        this.generatePerformanceMetrics();
        this.generateAccessibilityReport();
        console.log('所有测试完成');
    }

    /**
     * 按分类运行测试
     */
    async runByCategory(category) {
        const categoryTests = this.tests.filter(test => test.category === category);
        if (categoryTests.length === 0) {
            alert(`没有找到${this.categories[category] || category}测试用例`);
            return;
        }

        this.clearResults();
        this.startTime = performance.now();

        console.log(`开始运行${this.categories[category] || category}...`);

        for (const test of categoryTests) {
            await this.runTest(test);
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        this.generatePerformanceMetrics();
        console.log(`${this.categories[category] || category}完成`);
    }

    /**
     * 生成性能指标
     */
    generatePerformanceMetrics() {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        const renderTime = performance.timing.domContentLoadedEventEnd - performance.timing.domContentLoadedEventStart;
        
        let memoryUsage = 0;
        if (performance.memory) {
            memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024); // MB
        }

        document.getElementById('loadTime').textContent = `${loadTime}ms`;
        document.getElementById('renderTime').textContent = `${renderTime}ms`;
        document.getElementById('memoryUsage').textContent = `${memoryUsage.toFixed(2)}MB`;

        // 计算平均响应时间
        const responseTimes = this.results.map(r => r.duration);
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        document.getElementById('responseTime').textContent = `${avgResponseTime.toFixed(2)}ms`;
    }

    /**
     * 生成无障碍报告
     */
    generateAccessibilityReport() {
        const accessibilityResults = this.results.filter(r => r.category === 'accessibility');
        const accessibilityContainer = document.getElementById('accessibilityTests');
        
        if (accessibilityContainer && accessibilityResults.length > 0) {
            const passed = accessibilityResults.filter(r => r.status === 'passed').length;
            const total = accessibilityResults.length;
            
            const report = document.createElement('div');
            report.className = 'accessibility-summary';
            report.innerHTML = `
                <h3>无障碍测试摘要</h3>
                <p>通过: ${passed}/${total} (${((passed/total) * 100).toFixed(1)}%)</p>
                <div class="accessibility-status">
                    <span class="status-indicator ${passed === total ? 'status-pass' : 'status-warning'}"></span>
                    <span>${passed === total ? '无障碍合规' : '需要改进'}</span>
                </div>
            `;
            
            accessibilityContainer.appendChild(report);
        }
    }

    /**
     * 生成测试报告
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.results.length,
                passed: this.results.filter(r => r.status === 'passed').length,
                failed: this.results.filter(r => r.status === 'failed').length,
                duration: performance.now() - this.startTime
            },
            results: this.results,
            performance: this.getPerformanceData(),
            coverage: this.calculateCoverage(),
            recommendations: this.generateRecommendations()
        };

        // 创建报告文件
        const reportContent = JSON.stringify(report, null, 2);
        const blob = new Blob([reportContent], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);

        // 在控制台输出摘要
        console.log('=== 测试报告摘要 ===');
        console.log(`总测试数: ${report.summary.total}`);
        console.log(`通过: ${report.summary.passed}`);
        console.log(`失败: ${report.summary.failed}`);
        console.log(`成功率: ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%`);
        console.log(`执行时间: ${report.summary.duration.toFixed(2)}ms`);

        return report;
    }

    /**
     * 获取性能数据
     */
    getPerformanceData() {
        return {
            loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
            renderTime: performance.timing.domContentLoadedEventEnd - performance.timing.domContentLoadedEventStart,
            memoryUsage: performance.memory ? performance.memory.usedJSHeapSize / (1024 * 1024) : 0,
            avgResponseTime: this.results.length > 0 ? 
                this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length : 0
        };
    }

    /**
     * 计算覆盖率
     */
    calculateCoverage() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.status === 'passed').length;
        return total > 0 ? (passed / total) * 100 : 0;
    }

    /**
     * 生成建议
     */
    generateRecommendations() {
        const recommendations = [];
        const failedTests = this.results.filter(r => r.status === 'failed');

        if (failedTests.length > 0) {
            recommendations.push(`修复 ${failedTests.length} 个失败的测试用例`);
        }

        const slowTests = this.results.filter(r => r.duration > 1000);
        if (slowTests.length > 0) {
            recommendations.push(`优化 ${slowTests.length} 个耗时较长的测试用例`);
        }

        const accessibilityTests = this.results.filter(r => r.category === 'accessibility');
        const accessibilityFailed = accessibilityTests.filter(r => r.status === 'failed');
        if (accessibilityFailed.length > 0) {
            recommendations.push('改善无障碍功能以提高用户体验');
        }

        return recommendations;
    }

    /**
     * 清除结果
     */
    clearResults() {
        this.results = [];
        this.stats = {total: 0, passed: 0, failed: 0, skipped: 0};
        
        // 清除所有测试容器
        const containers = ['authTests', 'groupTests', 'paymentTests', 'uploadTests', 
                          'responsiveTests', 'performanceTests', 'accessibilityTests', 
                          'compatibilityTests', 'securityTests'];
        
        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = '';
            }
        });
    }

    /**
     * 模拟用户交互
     */
    simulateUserInteraction(element, eventType = 'click') {
        const events = {
            click: () => element.click(),
            submit: () => element.dispatchEvent(new Event('submit')),
            change: () => element.dispatchEvent(new Event('change')),
            input: () => element.dispatchEvent(new Event('input')),
            focus: () => element.dispatchEvent(new Event('focus')),
            blur: () => element.dispatchEvent(new Event('blur'))
        };

        if (events[eventType]) {
            events[eventType]();
        }
    }

    /**
     * 等待元素出现
     */
    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkElement = () => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`元素 ${selector} 在 ${timeout}ms 内未出现`));
                } else {
                    setTimeout(checkElement, 100);
                }
            };
            checkElement();
        });
    }

    /**
     * 浏览器兼容性检查
     */
    checkBrowserCompatibility() {
        const features = {
            fetch: typeof fetch === 'function',
            promise: typeof Promise === 'function',
            es6: (() => {
                try {
                    eval('class Test {}');
                    return true;
                } catch (e) {
                    return false;
                }
            })(),
            localStorage: typeof Storage !== 'undefined',
            canvas: !!(document.createElement('canvas').getContext),
            webWorker: typeof Worker !== 'undefined',
            serviceWorker: 'serviceWorker' in navigator
        };

        return features;
    }

    /**
     * 内存泄漏检测
     */
    detectMemoryLeaks() {
        if (!performance.memory) {
            return {supported: false, message: '浏览器不支持内存监控'};
        }

        const initialMemory = performance.memory.usedJSHeapSize;
        
        // 强制垃圾回收
        if (window.gc) {
            window.gc();
        }

        const afterGC = performance.memory.usedJSHeapSize;
        const memoryLeak = afterGC > initialMemory * 1.1; // 10%增长阈值

        return {
            supported: true,
            initialMemory: initialMemory / (1024 * 1024), // MB
            afterGC: afterGC / (1024 * 1024), // MB
            memoryLeak,
            message: memoryLeak ? '检测到潜在内存泄漏' : '内存使用正常'
        };
    }

    /**
     * 网络性能测试
     */
    async testNetworkPerformance() {
        const tests = [
            {url: '/api/users', expectedStatus: 200},
            {url: '/api/groups', expectedStatus: 200},
            {url: '/api/expenses', expectedStatus: 200}
        ];

        const results = [];
        
        for (const test of tests) {
            const startTime = performance.now();
            
            try {
                const response = await fetch(test.url);
                const endTime = performance.now();
                
                results.push({
                    url: test.url,
                    status: response.status,
                    expectedStatus: test.expectedStatus,
                    duration: endTime - startTime,
                    passed: response.status === test.expectedStatus
                });
            } catch (error) {
                results.push({
                    url: test.url,
                    status: 0,
                    expectedStatus: test.expectedStatus,
                    duration: performance.now() - startTime,
                    passed: false,
                    error: error.message
                });
            }
        }

        return results;
    }
}

// 导出测试运行器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestRunner;
}

// 全局可访问
window.TestRunner = TestRunner;