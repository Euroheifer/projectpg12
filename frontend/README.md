# 共享费用管理平台

一个现代化的共享费用管理前端应用，帮助用户轻松管理群组费用、追踪支出、计算分摊和支付结算。

## 📋 目录

- [项目介绍](#项目介绍)
- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [安装指南](#安装指南)
- [配置说明](#配置说明)
- [API文档](#api文档)
- [使用示例](#使用示例)
- [部署指南](#部署指南)
- [开发指南](#开发指南)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

## 🚀 项目介绍

共享费用管理平台是一个基于现代Web技术构建的费用管理应用，主要用于解决群体活动中费用分摊的复杂问题。该平台提供了完整的费用管理流程，从创建群组、记录费用到最终的结算支付，为用户提供了直观、高效的费用管理体验。

### 技术架构

- **前端框架**: 纯JavaScript ES6+
- **模块化设计**: 支持模块化开发和依赖注入
- **路由管理**: 单页应用(SPA)路由系统
- **状态管理**: 基于事件的轻量级状态管理
- **API通信**: RESTful API客户端
- **响应式设计**: 支持多种设备尺寸

## ✨ 功能特性

### 🏠 核心功能

- **用户认证系统**
  - 用户注册/登录
  - JWT Token管理
  - 自动Token刷新
  - 权限控制

- **群组管理**
  - 创建和管理费用群组
  - 成员邀请和管理
  - 群组角色权限
  - 群组设置和配置

- **费用管理**
  - 添加/编辑/删除费用记录
  - 支持多种费用分类
  - 收据图片上传
  - 定期费用设置

- **支付管理**
  - 记录支付信息
  - 支付凭证管理
  - 支付状态跟踪

- **余额计算**
  - 自动计算各成员余额
  - 最优结算方案推荐
  - 余额概览和统计

### 🎨 用户体验

- **响应式设计**: 适配桌面和移动设备
- **实时通知**: 操作反馈和状态提示
- **离线支持**: 基础功能离线可用
- **暗色主题**: 支持暗色/亮色主题切换
- **多语言**: 支持中文和英文

### 🔧 技术特性

- **模块化架构**: 松耦合的模块设计
- **依赖注入**: 灵活的依赖管理
- **错误处理**: 完善的错误捕获和处理
- **性能优化**: 防抖、节流等性能优化
- **安全防护**: XSS防护、CSRF保护

## 🚀 快速开始

### 环境要求

- 现代浏览器 (Chrome 80+, Firefox 75+, Safari 13+)
- Node.js 16+ (开发环境)
- Web服务器 (Apache/Nginx/或其他)

### 直接使用

1. 克隆或下载项目文件
2. 将 `frontend/` 目录部署到Web服务器
3. 访问 `index.html` 开始使用

### 开发环境

```bash
# 克隆项目
git clone <repository-url>
cd shared-expense-frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

## 📦 安装指南

### 1. 下载项目

```bash
# 从GitHub下载
git clone https://github.com/your-username/shared-expense-frontend.git

# 或直接下载ZIP包并解压
```

### 2. 文件结构

```
frontend/
├── index.html              # 主页
├── dashboard.html          # 仪表板页面
├── group-detail.html       # 群组详情页面
├── app.js                  # 核心功能模块
├── styles.css              # 全局样式
├── js/
│   ├── main.js             # 主入口文件
│   ├── router.js           # 路由管理
│   ├── auth.js             # 认证模块
│   ├── groups.js           # 群组管理
│   ├── expenses.js         # 费用管理
│   ├── payments.js         # 支付管理
│   ├── balances.js         # 余额计算
│   └── README.md           # 模块文档
└── tests/                  # 测试文件
```

### 3. 安装依赖

```bash
# 使用npm安装
npm install

# 或使用yarn
yarn install

# 安装开发依赖
npm install --save-dev
```

### 4. 启动开发服务器

```bash
# 使用npm scripts
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run test             # 运行测试
npm run lint             # 代码检查

# 或使用本地Web服务器
python -m http.server 3000
# 或
npx serve .
```

## ⚙️ 配置说明

### 环境配置

在 `app.js` 中修改配置常量：

```javascript
const CONFIG = {
    // API配置
    API_BASE_URL: 'https://your-domain.com/api/v1',
    API_TIMEOUT: 10000,
    
    // 认证配置
    JWT_STORAGE_KEY: 'auth_token',
    REFRESH_TOKEN_KEY: 'refresh_token',
    TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5分钟
    
    // 应用配置
    APP_NAME: '共享费用管理',
    DEFAULT_CURRENCY: 'CNY',
    
    // UI配置
    TOAST_DURATION: 3000,
    MODAL_FADE_DURATION: 300,
    
    // 文件上传配置
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
};
```

### API端点配置

确保后端API提供以下端点：

```javascript
// 认证相关
POST /api/v1/auth/login      // 用户登录
POST /api/v1/auth/register   // 用户注册
POST /api/v1/auth/refresh    // 刷新Token
GET  /api/v1/auth/me         // 获取当前用户

// 群组相关
GET  /api/v1/groups                    // 获取群组列表
POST /api/v1/groups                    // 创建群组
GET  /api/v1/groups/:id                // 获取群组详情
PUT  /api/v1/groups/:id                // 更新群组
DELETE /api/v1/groups/:id              // 删除群组

// 费用相关
GET  /api/v1/groups/:id/expenses       // 获取费用列表
POST /api/v1/groups/:id/expenses       // 创建费用
PUT  /api/v1/groups/:id/expenses/:expenseId  // 更新费用
DELETE /api/v1/groups/:id/expenses/:expenseId // 删除费用

// 支付相关
GET  /api/v1/groups/:id/payments       // 获取支付列表
POST /api/v1/groups/:id/payments       // 创建支付
PUT  /api/v1/groups/:id/payments/:paymentId   // 更新支付
DELETE /api/v1/groups/:id/payments/:paymentId // 删除支付

// 余额相关
GET  /api/v1/groups/:id/balances       // 获取群组余额
GET  /api/v1/balances                  // 获取用户余额概览
POST /api/v1/groups/:id/balances/calculate // 计算结算方案
```

### 本地化配置

支持中文和英文切换：

```javascript
// 在main.js中配置语言
const LOCALIZATION = {
    zh: {
        appName: '共享费用管理',
        loading: '加载中...',
        error: '错误',
        success: '成功'
    },
    en: {
        appName: 'Shared Expense Manager',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success'
    }
};
```

## 📚 API文档

### 核心模块API

#### Auth 模块 - 用户认证

```javascript
// 用户登录
const result = await Auth.login(email, password);
// 返回: { access_token, refresh_token, user }

// 用户注册
const result = await Auth.register({
    email: 'user@example.com',
    password: 'password',
    fullName: '张三'
});

// 获取当前用户信息
const user = await Auth.getCurrentUser();

// 检查是否已认证
const isAuth = Auth.isAuthenticated();

// 登出
Auth.logout();
```

#### Groups 模块 - 群组管理

```javascript
// 获取群组列表
const groups = await Groups.getGroups({
    page: 1,
    limit: 20,
    search: '旅游'
});

// 获取单个群组
const group = await Groups.getGroup(groupId);

// 创建群组
const newGroup = await Groups.create({
    name: '日本旅游',
    description: '2024年春季日本旅游费用',
    currency: 'CNY'
});

// 更新群组
const updated = await Groups.update(groupId, {
    name: '日本旅游-2024',
    description: '更新后的描述'
});

// 获取群组成员
const members = await Groups.getMembers(groupId);

// 邀请成员
await Groups.inviteMember(groupId, 'friend@example.com');

// 接受邀请
await Groups.acceptInvitation(invitationId);
```

#### Expenses 模块 - 费用管理

```javascript
// 获取费用列表
const expenses = await Expenses.getExpenses(groupId, {
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    category: 'food'
});

// 创建费用
const expense = await Expenses.create(groupId, {
    amount: '150.50',
    currency: 'CNY',
    description: '午餐费用',
    date: '2024-03-15',
    payerId: 'user123',
    category: 'meal',
    splits: [
        { user_id: 'user123', amount: '50.17' },
        { user_id: 'user456', amount: '50.17' },
        { user_id: 'user789', amount: '50.16' }
    ]
});

// 上传收据
await Expenses.uploadReceipt(groupId, expenseId, file);

// 创建定期费用
const recurring = await Expenses.createRecurringExpense(groupId, {
    amount: '100.00',
    description: '房租分摊',
    frequency: 'monthly',
    start_date: '2024-01-01',
    end_date: '2024-12-31'
});
```

#### Payments 模块 - 支付管理

```javascript
// 获取支付列表
const payments = await Payments.getPayments(groupId, {
    start_date: '2024-01-01',
    end_date: '2024-12-31'
});

// 创建支付
const payment = await Payments.create(groupId, {
    amount: '200.00',
    currency: 'CNY',
    payerId: 'user123',
    payeeId: 'user456',
    date: '2024-03-15',
    description: '转账还款',
    proofImage: file
});

// 上传支付凭证
await Payments.uploadProof(groupId, paymentId, file);
```

#### Balances 模块 - 余额计算

```javascript
// 获取群组余额
const balances = await Balances.getGroupBalances(groupId);
// 返回: [
//   { user_id: 'user123', balance: 1500 }, // 应收1500元
//   { user_id: 'user456', balance: -800 }, // 应付800元
//   { user_id: 'user789', balance: -700 }  // 应付700元
// ]

// 获取用户所有群组余额概览
const userBalances = await Balances.getUserBalances();

// 计算最优结算方案
const settlement = await Balances.calculateSettlement(groupId);
// 返回最优转账方案
```

#### Utils 模块 - 工具函数

```javascript
// 格式化日期
Utils.formatDate('2024-03-15T10:30:00'); // '2024-03-15 10:30:00'
Utils.formatDate('2024-03-15', 'YYYY年MM月DD日'); // '2024年03月15日'

// 格式化金额
Utils.formatAmount(15000); // '¥150.00'
Utils.formatAmount(15000, 'USD'); // '$150.00'

// 金额转换（分转元）
Utils.parseAmountToCents('150.50'); // 15050

// 生成UUID
Utils.generateUUID(); // '550e8400-e29b-41d4-a716-446655440000'

// 防抖函数
const debouncedSearch = Utils.debounce((query) => {
    performSearch(query);
}, 300);

// 节流函数
const throttledScroll = Utils.throttle(() => {
    handleScroll();
}, 100);
```

#### Forms 模块 - 表单处理

```javascript
// 创建表单处理器
const formHandler = Forms.createHandler({
    validate: (formData) => {
        const errors = {};
        if (!formData.email) errors.email = '邮箱不能为空';
        if (!Utils.isValidEmail(formData.email)) errors.email = '邮箱格式不正确';
        return errors;
    },
    submit: async (formData) => {
        // 提交表单数据
        const result = await API.post('/endpoint', formData);
        return result;
    },
    beforeSubmit: async () => {
        // 提交前处理
        return true; // 返回false可阻止提交
    },
    showSuccess: true,
    resetAfterSuccess: true
});

// 绑定到表单
document.getElementById('myForm').addEventListener('submit', formHandler);
```

#### Modals 模块 - 模态框

```javascript
// 打开模态框
Modals.open('myModal', { data: '传递给模态框的数据' });

// 关闭模态框
Modals.close('myModal');

// 关闭所有模态框
Modals.closeAll();

// 创建动态模态框
const modalId = Modals.create({
    title: '确认删除',
    content: '确定要删除这个项目吗？',
    size: 'small',
    buttons: [
        {
            text: '取消',
            class: 'btn-secondary',
            action: 'cancel',
            callback: () => console.log('用户取消了操作')
        },
        {
            text: '删除',
            class: 'btn-danger',
            action: 'confirm',
            callback: () => console.log('用户确认了操作')
        }
    ]
});
```

#### Notifications 模块 - 通知系统

```javascript
// 显示成功通知
Notifications.success('操作成功完成！');

// 显示错误通知
Notifications.error('操作失败，请重试');

// 显示警告通知
Notifications.warning('您的会话即将过期');

// 显示信息通知
Notifications.info('新功能已上线');

// 显示确认对话框
Notifications.confirm(
    '确定要删除这个群组吗？此操作不可撤销。',
    '确认删除',
    () => {
        // 用户点击确认
        deleteGroup();
    },
    () => {
        // 用户点击取消
        console.log('用户取消了删除操作');
    }
);
```

### 路由API

```javascript
// 添加路由
Router.add('/group/:id', (params) => {
    loadGroupDetail(params.id);
});

// 导航到路由
Router.navigate('/group/123');

// 获取当前路由信息
const currentPath = Router.getCurrentPath();
const currentParams = Router.getCurrentParams();

// 监听路由变化
document.addEventListener('route:changed', (event) => {
    console.log('路由变化:', event.detail);
});
```

## 💻 使用示例

### 基础使用示例

#### 1. 初始化应用

```javascript
// 在HTML中引入脚本
<script src="app.js"></script>
<script src="js/main.js"></script>

// 应用会自动初始化
```

#### 2. 用户认证流程

```javascript
// 登录示例
async function loginUser() {
    try {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const result = await Auth.login(email, password);
        console.log('登录成功:', result.user);
        
        // 重定向到仪表板
        Router.navigate('/');
        
    } catch (error) {
        console.error('登录失败:', error.message);
        Notifications.error('登录失败: ' + error.message);
    }
}

// 注册示例
async function registerUser() {
    try {
        const userData = {
            email: 'newuser@example.com',
            password: 'securePassword123',
            fullName: '新用户'
        };
        
        await Auth.register(userData);
        Notifications.success('注册成功，请登录');
        
    } catch (error) {
        console.error('注册失败:', error.message);
        Notifications.error('注册失败: ' + error.message);
    }
}
```

#### 3. 群组管理示例

```javascript
// 创建群组
async function createGroup() {
    try {
        const groupData = {
            name: '周末聚餐',
            description: '2024年3月聚餐费用分摊',
            currency: 'CNY'
        };
        
        const newGroup = await Groups.create(groupData);
        console.log('群组创建成功:', newGroup);
        
        // 跳转到群组详情页
        Router.navigate(`/group/${newGroup.id}`);
        
    } catch (error) {
        console.error('创建群组失败:', error);
        Notifications.error('创建群组失败');
    }
}

// 邀请成员
async function inviteMember(groupId, email) {
    try {
        await Groups.inviteMember(groupId, email);
        Notifications.success('邀请邮件已发送');
        
    } catch (error) {
        console.error('邀请成员失败:', error);
        Notifications.error('邀请成员失败');
    }
}
```

#### 4. 费用记录示例

```javascript
// 添加费用记录
async function addExpense(groupId) {
    try {
        const expenseData = {
            amount: document.getElementById('amount').value,
            description: document.getElementById('description').value,
            date: document.getElementById('date').value,
            payerId: getCurrentUserId(), // 当前用户ID
            category: document.getElementById('category').value,
            splits: getSelectedSplits() // 分摊设置
        };
        
        const expense = await Expenses.create(groupId, expenseData);
        console.log('费用记录添加成功:', expense);
        
        // 刷新费用列表
        refreshExpenseList(groupId);
        
        // 清空表单
        document.getElementById('expenseForm').reset();
        
    } catch (error) {
        console.error('添加费用失败:', error);
        Notifications.error('添加费用失败');
    }
}

// 上传收据
async function uploadReceipt(groupId, expenseId, fileInput) {
    const file = fileInput.files[0];
    if (!file) return;
    
    try {
        // 验证文件
        const validation = FileUpload.validate(file);
        if (!validation.isValid) {
            Notifications.error(validation.errors.join(', '));
            return;
        }
        
        // 压缩图片（可选）
        const compressedFile = await FileUpload.compressImage(file);
        
        // 上传收据
        const result = await Expenses.uploadReceipt(groupId, expenseId, compressedFile);
        Notifications.success('收据上传成功');
        
    } catch (error) {
        console.error('收据上传失败:', error);
        Notifications.error('收据上传失败');
    }
}
```

#### 5. 支付管理示例

```javascript
// 记录支付
async function recordPayment(groupId) {
    try {
        const paymentData = {
            amount: document.getElementById('paymentAmount').value,
            payerId: document.getElementById('payerId').value,
            payeeId: document.getElementById('payeeId').value,
            date: document.getElementById('paymentDate').value,
            description: document.getElementById('paymentDescription').value,
            proofImage: document.getElementById('proofFile').files[0]
        };
        
        const payment = await Payments.create(groupId, paymentData);
        console.log('支付记录添加成功:', payment);
        
        // 刷新支付列表
        refreshPaymentList(groupId);
        
    } catch (error) {
        console.error('支付记录失败:', error);
        Notifications.error('支付记录失败');
    }
}

// 查看结算方案
async function showSettlement(groupId) {
    try {
        const settlement = await Balances.calculateSettlement(groupId);
        
        // 显示结算方案
        displaySettlementPlan(settlement);
        
    } catch (error) {
        console.error('计算结算方案失败:', error);
        Notifications.error('计算结算方案失败');
    }
}
```

#### 6. 响应式设计示例

```javascript
// 响应式处理
function handleResponsive() {
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        // 移动端适配
        document.body.classList.add('mobile');
        
        // 调整导航菜单
        const nav = document.querySelector('.main-nav');
        if (nav) {
            nav.classList.add('mobile-nav');
        }
        
        // 调整表格显示
        const tables = document.querySelectorAll('.data-table');
        tables.forEach(table => {
            table.classList.add('responsive-table');
        });
        
    } else {
        // 桌面端
        document.body.classList.remove('mobile');
    }
}

// 监听窗口大小变化
window.addEventListener('resize', Utils.throttle(handleResponsive, 250));

// 页面加载时执行
handleResponsive();
```

#### 7. 离线功能示例

```javascript
// 离线数据缓存
class OfflineCache {
    constructor() {
        this.storage = new Map();
        this.setupServiceWorker();
    }
    
    // 缓存数据
    async cache(key, data, expiry = 3600000) { // 默认1小时过期
        const cacheData = {
            data: data,
            timestamp: Date.now(),
            expiry: expiry
        };
        
        try {
            await Storage.set(`offline_${key}`, cacheData);
        } catch (error) {
            console.error('缓存失败:', error);
        }
    }
    
    // 获取缓存数据
    async get(key) {
        try {
            const cached = await Storage.get(`offline_${key}`);
            
            if (!cached) return null;
            
            // 检查是否过期
            if (Date.now() - cached.timestamp > cached.expiry) {
                await Storage.remove(`offline_${key}`);
                return null;
            }
            
            return cached.data;
            
        } catch (error) {
            console.error('获取缓存失败:', error);
            return null;
        }
    }
    
    // 设置Service Worker
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker 注册成功');
                })
                .catch(error => {
                    console.error('Service Worker 注册失败:', error);
                });
        }
    }
}

// 使用离线缓存
const cache = new OfflineCache();

// 离线版本的API调用
async function getExpensesWithOffline(groupId) {
    const cacheKey = `expenses_${groupId}`;
    
    try {
        // 优先从缓存获取
        const cached = await cache.get(cacheKey);
        if (cached) {
            console.log('使用离线数据');
            return cached;
        }
        
        // 在线获取数据
        const expenses = await Expenses.getExpenses(groupId);
        
        // 缓存数据
        await cache.cache(cacheKey, expenses);
        
        return expenses;
        
    } catch (error) {
        console.log('网络请求失败，尝试使用缓存');
        
        // 尝试使用缓存
        const cached = await cache.get(cacheKey);
        if (cached) {
            Notifications.warning('使用离线数据，网络连接恢复后将同步更新');
            return cached;
        }
        
        throw error;
    }
}
```

## 🚀 部署指南

### 1. 生产环境构建

```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 构建结果将输出到 dist/ 目录
```

### 2. Web服务器配置

#### Apache配置 (.htaccess)

```apache
# 启用压缩
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# 设置缓存
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>

# 单页应用路由支持
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # Handle Angular and Vue routes
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>

# 安全头
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
</IfModule>
```

#### Nginx配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/frontend;
    index index.html;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 单页应用路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}

# HTTPS配置
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # 其他配置与HTTP相同...
}
```

### 3. 部署检查清单

- [ ] 生产环境配置已更新
- [ ] API端点已正确配置
- [ ] 静态资源路径正确
- [ ] 压缩和缓存已启用
- [ ] SSL证书已安装
- [ ] 安全头已配置
- [ ] 错误监控已设置
- [ ] 性能监控已配置

### 4. 性能优化

```javascript
// 代码分割示例
const loadModule = async (moduleName) => {
    switch (moduleName) {
        case 'expenses':
            return import('./js/expenses.js');
        case 'payments':
            return import('./js/payments.js');
        case 'balances':
            return import('./js/balances.js');
        default:
            throw new Error(`Unknown module: ${moduleName}`);
    }
};

// 懒加载模块
async function loadExpensesModule() {
    const { Expenses } = await loadModule('expenses');
    return Expenses;
}

// 预加载关键资源
const preloadResources = () => {
    // 预加载关键CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'preload';
    cssLink.href = '/styles/critical.css';
    cssLink.as = 'style';
    document.head.appendChild(cssLink);
    
    // 预加载关键JavaScript
    const jsScript = document.createElement('link');
    jsScript.rel = 'preload';
    jsScript.href = '/js/app.js';
    jsScript.as = 'script';
    document.head.appendChild(jsScript);
};

// 页面加载完成后预加载
document.addEventListener('DOMContentLoaded', preloadResources);
```

### 5. 监控和分析

```javascript
// 性能监控
const PerformanceMonitor = {
    init() {
        // 监控页面加载时间
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            this.logMetric('pageLoadTime', loadTime);
        });
        
        // 监控API响应时间
        this.interceptAPI();
    },
    
    logMetric(name, value) {
        // 发送到监控服务
        if (typeof gtag !== 'undefined') {
            gtag('event', name, {
                event_category: 'Performance',
                value: Math.round(value)
            });
        }
        
        console.log(`Metric: ${name} = ${value}`);
    },
    
    interceptAPI() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const start = performance.now();
            try {
                const response = await originalFetch(...args);
                const end = performance.now();
                this.logMetric('apiResponseTime', end - start);
                return response;
            } catch (error) {
                const end = performance.now();
                this.logMetric('apiErrorTime', end - start);
                throw error;
            }
        };
    }
};

// 错误监控
const ErrorMonitor = {
    init() {
        window.addEventListener('error', (event) => {
            this.logError('JavaScript Error', {
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.logError('Unhandled Promise Rejection', {
                reason: event.reason
            });
        });
    },
    
    logError(type, details) {
        // 发送到错误监控服务
        console.error(`[${type}]`, details);
        
        // 可以集成Sentry、LogRocket等服务
        // Sentry.captureException(new Error(type), { extra: details });
    }
};

// 初始化监控
PerformanceMonitor.init();
ErrorMonitor.init();
```

## 🛠️ 开发指南

### 项目结构

```
frontend/
├── index.html                    # 应用入口HTML
├── dashboard.html               # 仪表板页面
├── group-detail.html            # 群组详情页
├── app.js                       # 核心功能模块
├── styles.css                   # 全局样式
├── js/
│   ├── main.js                  # 主入口文件
│   ├── router.js                # 路由管理
│   ├── auth.js                  # 认证模块
│   ├── groups.js                # 群组管理
│   ├── expenses.js              # 费用管理
│   ├── payments.js              # 支付管理
│   ├── balances.js              # 余额计算
│   ├── upload.js                # 文件上传
│   ├── navigation.js            # 导航组件
│   ├── members.js               # 成员管理
│   ├── invitations.js           # 邀请管理
│   ├── README.md                # JS模块文档
│   └── README.md                # JS目录文档
├── examples/                    # 示例文件
│   └── 认证路由模块示例.html     # 认证路由示例
└── tests/                       # 测试文件
    ├── auth.test.js             # 认证模块测试
    ├── groups.test.js           # 群组模块测试
    ├── expenses.test.js         # 费用模块测试
    └── utils.test.js            # 工具函数测试
```

### 开发环境设置

#### 1. IDE配置

推荐使用VS Code，配置以下扩展：

```json
{
    "recommendations": [
        "ms-vscode.vscode-typescript-next",
        "bradlc.vscode-tailwindcss",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-eslint",
        "ms-vscode.vscode-json"
    ]
}
```

#### 2. 代码规范

使用ESLint和Prettier进行代码格式化：

```javascript
// .eslintrc.js
module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module'
    },
    rules: {
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'no-unused-vars': 'warn',
        'no-console': 'warn'
    }
};
```

```json
// .prettierrc
{
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "printWidth": 80,
    "tabWidth": 4
}
```

#### 3. Git工作流

```bash
# 1. 创建功能分支
git checkout -b feature/新功能名称

# 2. 开发并提交代码
git add .
git commit -m "feat: 添加新功能描述"

# 3. 推送到远程仓库
git push origin feature/新功能名称

# 4. 创建Pull Request
# 代码审查后合并到主分支

# 5. 合并后删除分支
git branch -d feature/新功能名称
```

### 代码规范

#### 1. 命名约定

- **变量和函数**: 使用驼峰命名法 (camelCase)
- **常量**: 使用大写字母和下划线 (UPPER_SNAKE_CASE)
- **类**: 使用帕斯卡命名法 (PascalCase)
- **私有属性**: 以下划线开头 (_privateProperty)
- **CSS类**: 使用连字符分隔 (kebab-case)

```javascript
// 变量和函数
const userName = '张三';
const getUserProfile = () => {};

// 常量
const API_BASE_URL = 'https://api.example.com';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 类
class UserManager {
    constructor() {
        this._privateProperty = 'private';
        this.publicProperty = 'public';
    }
}

// CSS类
.user-profile-card {
    /* 样式定义 */
}
```

#### 2. 代码注释

```javascript
/**
 * 计算两个用户之间的结算方案
 * @param {string} payerId - 付款人用户ID
 * @param {string} payeeId - 收款人用户ID
 * @param {number} amount - 金额（分）
 * @returns {Object} 结算方案对象
 * @throws {Error} 当金额无效时抛出错误
 */
function calculateSettlement(payerId, payeeId, amount) {
    if (!amount || amount <= 0) {
        throw new Error('金额必须大于0');
    }
    
    return {
        from: payerId,
        to: payeeId,
        amount: amount,
        currency: 'CNY',
        method: 'transfer'
    };
}

/**
 * 群组数据模型
 * @typedef {Object} Group
 * @property {string} id - 群组唯一标识
 * @property {string} name - 群组名称
 * @property {string} description - 群组描述
 * @property {string} currency - 默认货币
 * @property {Array<Member>} members - 成员列表
 * @property {Array<Expense>} expenses - 费用列表
 */
```

#### 3. 错误处理

```javascript
// 使用try-catch处理异步操作
async function fetchUserData(userId) {
    try {
        const user = await API.get(`/users/${userId}`);
        return user;
    } catch (error) {
        // 记录错误
        console.error('获取用户数据失败:', error);
        
        // 显示用户友好的错误信息
        if (error.message.includes('Network')) {
            throw new Error('网络连接失败，请检查网络设置');
        } else if (error.message.includes('404')) {
            throw new Error('用户不存在');
        } else {
            throw new Error('获取用户数据失败，请稍后重试');
        }
    }
}

// 使用错误边界处理组件错误
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    
    componentDidCatch(error, errorInfo) {
        console.error('组件错误:', error, errorInfo);
        // 发送错误到监控系统
        ErrorMonitor.logError('Component Error', { error, errorInfo });
    }
    
    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <h2>出现了错误</h2>
                    <p>{this.state.error?.message}</p>
                    <button onClick={() => window.location.reload()}>
                        重新加载页面
                    </button>
                </div>
            );
        }
        
        return this.props.children;
    }
}
```

### 测试指南

#### 1. 单元测试

```javascript
// tests/utils.test.js
import { Utils } from '../app.js';

describe('Utils工具函数测试', () => {
    test('formatAmount应该正确格式化金额', () => {
        expect(Utils.formatAmount(1500)).toBe('¥15.00');
        expect(Utils.formatAmount(0)).toBe('¥0.00');
        expect(Utils.formatAmount(100000)).toBe('¥1000.00');
    });
    
    test('generateUUID应该生成有效的UUID', () => {
        const uuid = Utils.generateUUID();
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(uuid).toMatch(uuidRegex);
    });
    
    test('formatDate应该正确格式化日期', () => {
        const date = '2024-03-15T10:30:00';
        const formatted = Utils.formatDate(date);
        expect(formatted).toContain('2024');
        expect(formatted).toContain('03');
        expect(formatted).toContain('15');
    });
});

// 运行测试
// npm test
```

#### 2. 集成测试

```javascript
// tests/integration/auth.test.js
import { Auth } from '../app.js';

describe('认证模块集成测试', () => {
    beforeEach(() => {
        // 清除本地存储
        localStorage.clear();
    });
    
    test('用户登录流程', async () => {
        // 模拟API响应
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                access_token: 'fake-token',
                refresh_token: 'fake-refresh-token',
                user: { id: '123', email: 'test@example.com' }
            })
        });
        
        // 执行登录
        const result = await Auth.login('test@example.com', 'password');
        
        // 验证结果
        expect(result.access_token).toBe('fake-token');
        expect(result.user.email).toBe('test@example.com');
        
        // 验证Token已存储
        expect(localStorage.getItem('auth_token')).toBe('fake-token');
    });
    
    test('Token过期应该自动刷新', async () => {
        // 设置已过期的Token
        localStorage.setItem('auth_token', 'expired-token');
        
        // 模拟刷新Token API
        global.fetch = jest.fn()
            .mockRejectedValueOnce(new Error('Token expired'))
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    access_token: 'new-token',
                    refresh_token: 'new-refresh-token'
                })
            });
        
        // 尝试API调用
        await Auth.getCurrentUser();
        
        // 验证Token已刷新
        expect(localStorage.getItem('auth_token')).toBe('new-token');
    });
});
```

### 调试技巧

#### 1. 浏览器开发者工具

```javascript
// 调试信息输出
const DEBUG = {
    log: (message, data) => {
        if (window.location.hostname === 'localhost') {
            console.log(`[DEBUG] ${message}`, data);
        }
    },
    
    warn: (message, data) => {
        if (window.location.hostname === 'localhost') {
            console.warn(`[DEBUG] ${message}`, data);
        }
    },
    
    error: (message, data) => {
        console.error(`[DEBUG] ${message}`, data);
    }
};

// 使用示例
DEBUG.log('用户登录成功', { userId: '123', timestamp: Date.now() });
```

#### 2. 网络调试

```javascript
// 拦截API请求进行调试
const debugAPI = () => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const [url, options] = args;
        
        DEBUG.log('API Request', {
            url: url,
            method: options?.method || 'GET',
            headers: options?.headers,
            body: options?.body
        });
        
        try {
            const response = await originalFetch(...args);
            
            DEBUG.log('API Response', {
                url: url,
                status: response.status,
                ok: response.ok
            });
            
            return response;
        } catch (error) {
            DEBUG.error('API Error', { url: url, error: error.message });
            throw error;
        }
    };
};

// 只在开发环境启用
if (window.location.hostname === 'localhost') {
    debugAPI();
}
```

#### 3. 状态调试

```javascript
// 应用状态调试工具
const DebugTools = {
    state: new Map(),
    
    setState(key, value) {
        this.state.set(key, {
            value: value,
            timestamp: Date.now(),
            stack: new Error().stack
        });
    },
    
    getState(key) {
        return this.state.get(key);
    },
    
    listStates() {
        const states = [];
        for (const [key, data] of this.state) {
            states.push({
                key: key,
                value: data.value,
                age: Date.now() - data.timestamp,
                stack: data.stack
            });
        }
        return states;
    },
    
    clear() {
        this.state.clear();
    },
    
    renderPanel() {
        // 创建调试面板
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            height: 400px;
            background: #2c3e50;
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            overflow-y: auto;
            z-index: 10000;
        `;
        
        const updatePanel = () => {
            const states = this.listStates();
            panel.innerHTML = `
                <h3>Debug Panel</h3>
                <button onclick="DebugTools.clear()">Clear</button>
                <div id="state-list">
                    ${states.map(s => `
                        <div style="margin: 5px 0; padding: 5px; background: #34495e; border-radius: 3px;">
                            <strong>${s.key}</strong> (${Math.round(s.age)}ms ago)<br>
                            <code>${JSON.stringify(s.value, null, 2)}</code>
                        </div>
                    `).join('')}
                </div>
            `;
        };
        
        updatePanel();
        document.body.appendChild(panel);
        
        // 定期更新面板
        setInterval(updatePanel, 1000);
    }
};

// 使用示例
// DebugTools.setState('currentUser', { id: '123', name: '张三' });
// DebugTools.setState('currentGroup', { id: '456', name: '测试群组' });
// DebugTools.renderPanel(); // 在开发环境显示调试面板
```

## 💡 最佳实践

### 1. 性能优化

#### 1.1 代码分割

```javascript
// 按需加载模块
const ModuleLoader = {
    modules: new Map(),
    
    async load(moduleName) {
        if (this.modules.has(moduleName)) {
            return this.modules.get(moduleName);
        }
        
        try {
            const module = await import(`./js/${moduleName}.js`);
            this.modules.set(moduleName, module);
            return module;
        } catch (error) {
            console.error(`Failed to load module ${moduleName}:`, error);
            throw error;
        }
    },
    
    // 预加载关键模块
    preload(keyModules) {
        keyModules.forEach(moduleName => {
            this.load(moduleName).catch(console.error);
        });
    }
};

// 使用示例
// 预加载核心模块
ModuleLoader.preload(['auth', 'groups', 'router']);

// 按需加载其他模块
const Expenses = await ModuleLoader.load('expenses');
const Balances = await ModuleLoader.load('balances');
```

#### 1.2 防抖和节流

```javascript
// 搜索功能防抖
const searchInput = document.getElementById('search');
const debouncedSearch = Utils.debounce((query) => {
    performSearch(query);
}, 300);

searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
});

// 滚动事件节流
const handleScroll = Utils.throttle(() => {
    updateScrollPosition();
}, 100);

window.addEventListener('scroll', handleScroll);
```

#### 1.3 虚拟滚动

```javascript
// 大列表虚拟滚动
class VirtualList {
    constructor(container, itemHeight, renderItem) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.renderItem = renderItem;
        this.visibleRange = { start: 0, end: 0 };
        
        this.container.addEventListener('scroll', this.handleScroll.bind(this));
        this.render();
    }
    
    setItems(items) {
        this.items = items;
        this.container.style.height = `${items.length * this.itemHeight}px`;
        this.render();
    }
    
    handleScroll() {
        const scrollTop = this.container.scrollTop;
        const containerHeight = this.container.clientHeight;
        const startIndex = Math.floor(scrollTop / this.itemHeight);
        const endIndex = Math.min(
            startIndex + Math.ceil(containerHeight / this.itemHeight) + 1,
            this.items.length
        );
        
        if (startIndex !== this.visibleRange.start || endIndex !== this.visibleRange.end) {
            this.visibleRange = { start: startIndex, end: endIndex };
            this.render();
        }
    }
    
    render() {
        const { start, end } = this.visibleRange;
        const offsetY = start * this.itemHeight;
        
        let html = '';
        for (let i = start; i < end; i++) {
            html += this.renderItem(this.items[i], i);
        }
        
        this.container.innerHTML = `
            <div style="transform: translateY(${offsetY}px)">
                ${html}
            </div>
        `;
    }
}
```

### 2. 安全最佳实践

#### 2.1 XSS防护

```javascript
// 安全处理用户输入
const SafeText = {
    escape(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    
    // 安全设置文本内容
    setText(element, text) {
        element.textContent = this.escape(text);
    },
    
    // 安全设置HTML内容（仅限可信内容）
    setHTML(element, html) {
        // 严格验证HTML内容
        if (this.isValidHTML(html)) {
            element.innerHTML = html;
        } else {
            console.warn('Unsafe HTML blocked:', html);
            element.textContent = html; // 退回到文本显示
        }
    },
    
    isValidHTML(html) {
        // 简单的HTML验证，实际应用中需要更严格的验证
        const allowedTags = /^[a-zA-Z0-9\s\-\_\.\:\;\,\!\?\(\)\[\]\{\}\/\\\=\+\*\&\$\#\@\~\`\'\"\n\r\t]*$/;
        return allowedTags.test(html);
    }
};
```

#### 2.2 CSRF防护

```javascript
// CSRF Token管理
const CSRF = {
    token: null,
    
    init() {
        // 从meta标签获取CSRF token
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) {
            this.token = meta.getAttribute('content');
        }
    },
    
    getToken() {
        return this.token;
    },
    
    // 在API请求中包含CSRF token
    addToHeaders(headers = {}) {
        if (this.token) {
            headers['X-CSRF-Token'] = this.token;
        }
        return headers;
    }
};

// 修改APIClient以自动包含CSRF token
const APIClient = {
    async request(config) {
        const headers = {
            ...CSRF.addToHeaders(),
            'Content-Type': 'application/json',
            ...config.headers
        };
        
        return fetch(config.url, {
            ...config,
            headers
        });
    }
};
```

#### 2.3 内容安全策略

```html
<!-- 在HTML头部添加CSP头部 -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               font-src 'self' data:;
               connect-src 'self' https://api.example.com;">
```

### 3. 用户体验优化

#### 3.1 加载状态管理

```javascript
// 全局加载状态管理
const LoadingManager = {
    currentLoaders: new Set(),
    
    show(name = 'default', message = '加载中...') {
        this.currentLoaders.add(name);
        this.updateUI();
        
        // 显示加载指示器
        Loading.show(message);
    },
    
    hide(name = 'default') {
        this.currentLoaders.delete(name);
        this.updateUI();
        
        if (this.currentLoaders.size === 0) {
            Loading.hide();
        }
    },
    
    updateUI() {
        // 更新页面元素状态
        const spinner = document.querySelector('.global-spinner');
        if (spinner) {
            spinner.style.display = this.currentLoaders.size > 0 ? 'block' : 'none';
        }
    }
};

// 使用示例
async function loadData() {
    LoadingManager.show('data-loading', '正在加载数据...');
    
    try {
        const data = await API.get('/data');
        return data;
    } finally {
        LoadingManager.hide('data-loading');
    }
}
```

#### 3.2 表单验证优化

```javascript
// 实时表单验证
class RealTimeForm {
    constructor(formElement) {
        this.form = formElement;
        this.validators = new Map();
        this.setupValidation();
    }
    
    addField(name, validator) {
        this.validators.set(name, validator);
        
        const field = this.form.querySelector(`[name="${name}"]`);
        if (field) {
            field.addEventListener('blur', () => this.validateField(name));
            field.addEventListener('input', Utils.debounce(() => this.validateField(name), 300));
        }
    }
    
    async validateField(name) {
        const field = this.form.querySelector(`[name="${name}"]`);
        const validator = this.validators.get(name);
        
        if (!field || !validator) return;
        
        try {
            const result = await validator(field.value);
            
            if (result.isValid) {
                this.showSuccess(field);
            } else {
                this.showError(field, result.message);
            }
            
            return result.isValid;
            
        } catch (error) {
            this.showError(field, error.message);
            return false;
        }
    }
    
    showError(field, message) {
        this.clearFieldState(field);
        field.classList.add('error');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }
    
    showSuccess(field) {
        this.clearFieldState(field);
        field.classList.add('success');
    }
    
    clearFieldState(field) {
        field.classList.remove('error', 'success');
        const errorDiv = field.parentNode.querySelector('.field-error');
        if (errorDiv) errorDiv.remove();
    }
}

// 使用示例
const form = new RealTimeForm(document.getElementById('userForm'));

form.addField('email', async (value) => {
    if (!value) return { isValid: false, message: '邮箱不能为空' };
    
    if (!Utils.isValidEmail(value)) {
        return { isValid: false, message: '邮箱格式不正确' };
    }
    
    // 异步验证邮箱是否已存在
    const exists = await API.post('/check-email', { email: value });
    if (exists) {
        return { isValid: false, message: '该邮箱已被使用' };
    }
    
    return { isValid: true };
});

form.addField('password', (value) => {
    if (!value || value.length < 8) {
        return { isValid: false, message: '密码至少需要8个字符' };
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        return { isValid: false, message: '密码必须包含大小写字母和数字' };
    }
    
    return { isValid: true };
});
```

#### 3.3 离线支持

```javascript
// 离线数据同步
class OfflineSync {
    constructor() {
        this.pendingActions = [];
        this.isOnline = navigator.onLine;
        
        this.setupEventListeners();
        this.loadPendingActions();
    }
    
    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncPendingActions();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }
    
    // 缓存操作，等待网络恢复后同步
    async cacheAction(action) {
        this.pendingActions.push({
            ...action,
            timestamp: Date.now(),
            id: Utils.generateUUID()
        });
        
        await Storage.set('pending_actions', this.pendingActions);
    }
    
    // 同步待处理的操作
    async syncPendingActions() {
        if (!this.isOnline || this.pendingActions.length === 0) {
            return;
        }
        
        console.log(`同步 ${this.pendingActions.length} 个待处理操作`);
        
        for (const action of [...this.pendingActions]) {
            try {
                switch (action.type) {
                    case 'CREATE_EXPENSE':
                        await Expenses.create(action.groupId, action.data);
                        break;
                    case 'UPDATE_GROUP':
                        await Groups.update(action.groupId, action.data);
                        break;
                    case 'RECORD_PAYMENT':
                        await Payments.create(action.groupId, action.data);
                        break;
                }
                
                // 移除已同步的操作
                this.pendingActions = this.pendingActions.filter(a => a.id !== action.id);
                
            } catch (error) {
                console.error('同步操作失败:', error);
                // 保持操作在队列中，稍后重试
            }
        }
        
        await Storage.set('pending_actions', this.pendingActions);
    }
    
    async loadPendingActions() {
        this.pendingActions = await Storage.get('pending_actions', []);
    }
    
    // 创建离线操作
    createExpenseOffline(groupId, expenseData) {
        return this.cacheAction({
            type: 'CREATE_EXPENSE',
            groupId,
            data: expenseData
        });
    }
}

// 使用示例
const offlineSync = new OfflineSync();

// 在费用记录中支持离线操作
async function addExpense(groupId, expenseData) {
    try {
        const expense = await Expenses.create(groupId, expenseData);
        Notifications.success('费用记录成功');
        return expense;
    } catch (error) {
        if (!navigator.onLine) {
            // 离线状态，缓存操作
            await offlineSync.createExpenseOffline(groupId, expenseData);
            Notifications.info('网络离线，操作已缓存，恢复网络后将自动同步');
        } else {
            throw error;
        }
    }
}
```

### 4. 可访问性最佳实践

#### 4.1 键盘导航

```javascript
// 键盘导航支持
class KeyboardNavigation {
    constructor() {
        this.focusableElements = [];
        this.currentFocusIndex = 0;
        this.setupListeners();
    }
    
    setupListeners() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Tab':
                    this.handleTabNavigation(e);
                    break;
                case 'Enter':
                case ' ':
                    this.handleActivate(e);
                    break;
                case 'Escape':
                    this.handleEscape(e);
                    break;
                case 'ArrowDown':
                case 'ArrowUp':
                case 'ArrowLeft':
                case 'ArrowRight':
                    this.handleArrowNavigation(e);
                    break;
            }
        });
        
        // 监听动态内容变化
        const observer = new MutationObserver(() => {
            this.updateFocusableElements();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    updateFocusableElements() {
        this.focusableElements = Array.from(
            document.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
        ).filter(el => !el.hasAttribute('disabled'));
    }
    
    handleTabNavigation(e) {
        this.updateFocusableElements();
        
        if (e.shiftKey) {
            // Shift+Tab: 反向导航
            this.currentFocusIndex = Math.max(0, this.currentFocusIndex - 1);
        } else {
            // Tab: 正向导航
            this.currentFocusIndex = Math.min(
                this.focusableElements.length - 1,
                this.currentFocusIndex + 1
            );
        }
        
        const focusedElement = this.focusableElements[this.currentFocusIndex];
        if (focusedElement) {
            focusedElement.focus();
            e.preventDefault();
        }
    }
    
    handleActivate(e) {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.click) {
            activeElement.click();
            e.preventDefault();
        }
    }
    
    handleEscape(e) {
        // 关闭打开的模态框、菜单等
        Modals.closeAll();
        
        const openDropdowns = document.querySelectorAll('.dropdown.show');
        openDropdowns.forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }
}

// 初始化键盘导航
const keyboardNav = new KeyboardNavigation();
```

#### 4.2 屏幕阅读器支持

```javascript
// 屏幕阅读器辅助功能
class AccessibilityHelper {
    // 动态更新页面标题
    updatePageTitle(title, description = '') {
        const fullTitle = description 
            ? `${title} - ${description}`
            : title;
        
        document.title = fullTitle;
        
        // 更新ARIA live region
        this.announce(`页面标题已更新为: ${fullTitle}`);
    }
    
    // 宣布状态变化
    announce(message, priority = 'polite') {
        let announcer = document.getElementById('sr-announcer');
        
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'sr-announcer';
            announcer.setAttribute('aria-live', priority);
            announcer.setAttribute('aria-atomic', 'true');
            announcer.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
            document.body.appendChild(announcer);
        }
        
        announcer.setAttribute('aria-live', priority);
        announcer.textContent = message;
    }
    
    // 设置表格描述
    setTableDescription(table, description) {
        table.setAttribute('aria-describedby', description);
    }
    
    // 设置表单错误描述
    setFormErrors(form, errors) {
        // 清除之前的错误
        const existingErrors = form.querySelectorAll('[role="alert"]');
        existingErrors.forEach(error => error.remove());
        
        // 显示新错误
        if (Object.keys(errors).length > 0) {
            const errorSummary = document.createElement('div');
            errorSummary.setAttribute('role', 'alert');
            errorSummary.setAttribute('aria-labelledby', 'error-summary-heading');
            errorSummary.style.cssText = `
                border: 2px solid #d73527;
                border-radius: 4px;
                padding: 15px;
                margin-bottom: 20px;
                background-color: #fef1f0;
            `;
            
            errorSummary.innerHTML = `
                <h2 id="error-summary-heading">表单验证错误</h2>
                <ul>
                    ${Object.values(errors).map(error => `<li>${error}</li>`).join('')}
                </ul>
            `;
            
            form.insertBefore(errorSummary, form.firstChild);
            
            // 宣布错误
            this.announce(`表单验证失败，发现 ${Object.keys(errors).length} 个错误`, 'assertive');
            
            // 聚焦到错误摘要
            errorSummary.focus();
        }
    }
    
    // 创建跳转链接
    createSkipLink() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = '跳转到主内容';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: #000;
            color: #fff;
            padding: 8px;
            text-decoration: none;
            border-radius: 0 0 4px 4px;
            z-index: 1000;
            transition: top 0.3s;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '0';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }
}

// 初始化可访问性助手
const a11y = new AccessibilityHelper();
a11y.createSkipLink();
```

## ❓ 常见问题

### 安装和配置问题

**Q: 如何更新API端点配置？**

A: 在 `app.js` 文件中修改 `CONFIG.API_BASE_URL` 配置：

```javascript
const CONFIG = {
    API_BASE_URL: 'https://your-new-api-domain.com/api/v1',
    // 其他配置...
};
```

**Q: 如何解决CORS跨域问题？**

A: 确保后端API设置了正确的CORS头：

```javascript
// 后端服务器需要设置以下响应头
Access-Control-Allow-Origin: https://your-frontend-domain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

**Q: Token自动刷新不工作怎么办？**

A: 检查以下配置：

1. 确认后端API支持Token刷新端点
2. 检查 `TOKEN_REFRESH_THRESHOLD` 设置
3. 确认刷新Token已正确存储
4. 查看浏览器控制台是否有错误日志

### 使用问题

**Q: 如何处理网络断线情况？**

A: 应用已内置离线支持：

```javascript
// 监听网络状态
window.addEventListener('online', () => {
    Notifications.success('网络连接已恢复');
});

window.addEventListener('offline', () => {
    Notifications.warning('网络连接已断开，使用离线模式');
});
```

**Q: 文件上传失败如何排查？**

A: 检查以下项目：

1. 文件大小是否超过限制（默认5MB）
2. 文件类型是否支持（支持 jpg, png, gif, webp）
3. 网络连接是否正常
4. 服务器端文件上传接口是否正常

**Q: 移动端显示异常怎么办？**

A: 添加响应式样式支持：

```css
/* 在styles.css中添加移动端样式 */
@media (max-width: 768px) {
    .desktop-only {
        display: none !important;
    }
    
    .mobile-menu {
        display: block !important;
    }
    
    .data-table {
        font-size: 14px;
    }
    
    .form-group {
        margin-bottom: 15px;
    }
}
```

### 性能问题

**Q: 页面加载缓慢如何优化？**

A: 可以采取以下优化措施：

1. **启用压缩**：在Web服务器启用Gzip/Brotli压缩
2. **缓存策略**：设置静态资源长期缓存
3. **代码分割**：按需加载JavaScript模块
4. **图片优化**：压缩图片大小，使用WebP格式
5. **CDN部署**：使用CDN加速静态资源

```javascript
// 启用代码分割
const ExpenseModule = await import('./js/expenses.js');
const PaymentModule = await import('./js/payments.js');
```

**Q: 大量数据列表渲染缓慢怎么办？**

A: 使用虚拟滚动优化：

```javascript
// 实现虚拟滚动（见最佳实践章节）
const virtualList = new VirtualList(container, itemHeight, renderItem);
```

### 开发问题

**Q: 如何调试JavaScript错误？**

A: 使用以下调试方法：

1. **浏览器开发者工具**：F12打开开发者工具查看Console
2. **断点调试**：在Sources面板设置断点
3. **网络调试**：在Network面板查看API请求
4. **性能分析**：在Performance面板分析性能瓶颈

```javascript
// 添加调试日志
console.log('Debug: 用户操作', { userId: '123', action: 'login' });
```

**Q: 如何测试API接口？**

A: 使用Postman或curl测试：

```bash
# 使用curl测试登录接口
curl -X POST https://your-api.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

## 🤝 贡献指南

### 贡献流程

1. **Fork项目** - 点击右上角的Fork按钮
2. **克隆仓库** - `git clone https://github.com/your-username/shared-expense-frontend.git`
3. **创建分支** - `git checkout -b feature/your-feature-name`
4. **提交更改** - `git commit -am 'Add some feature'`
5. **推送分支** - `git push origin feature/your-feature-name`
6. **创建PR** - 在GitHub上创建Pull Request

### 开发规范

#### 代码风格

- 使用4个空格缩进
- 使用单引号字符串
- 使用有意义的变量名
- 添加适当的注释
- 遵循ESLint规则

#### 提交信息规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型(type)：
- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(auth): 添加用户注册功能

实现用户注册表单，包括邮箱验证、密码强度检查和错误处理。

Closes #123
```

### Bug报告

提交Bug报告时请包含以下信息：

1. **问题描述** - 详细描述问题现象
2. **复现步骤** - 逐步说明如何复现问题
3. **预期结果** - 描述预期的正常行为
4. **实际结果** - 描述实际发生的错误行为
5. **环境信息** - 浏览器版本、操作系统等
6. **相关截图** - 如果适用，添加截图

```markdown
## Bug报告

### 问题描述
用户登录时出现500错误

### 复现步骤
1. 访问登录页面
2. 输入有效邮箱和密码
3. 点击登录按钮

### 预期结果
应该成功登录并跳转到仪表板

### 实际结果
显示"服务器错误"消息

### 环境信息
- 浏览器: Chrome 120.0
- 操作系统: macOS 14.0
- 网络: 正常连接

### 附加信息
控制台错误信息：...
```

### 功能请求

提交功能请求时请说明：

1. **功能描述** - 详细描述想要的功能
2. **使用场景** - 说明这个功能的用途
3. **替代方案** - 描述是否考虑过其他解决方案
4. **额外信息** - 其他相关信息

### 代码贡献要求

#### 1. 测试要求

- 新功能必须包含相应的测试
- Bug修复需要添加回归测试
- 确保所有测试通过

```javascript
// 测试示例
describe('新功能测试', () => {
    test('应该正确处理输入', () => {
        // 测试代码
        expect(result).toBe(expected);
    });
});
```

#### 2. 文档要求

- 新功能需要更新API文档
- 复杂的算法需要添加代码注释
- 重要变更需要更新README

#### 3. 性能要求

- 新功能不应该显著降低性能
- 大数据集操作需要考虑优化
- 内存使用需要合理控制

### 发布流程

1. **版本规划** - 确定新版本的功能和修复
2. **代码冻结** - 在发布前冻结新功能开发
3. **测试阶段** - 全面测试和回归测试
4. **发布准备** - 更新版本号和文档
5. **正式发布** - 合并到主分支并标记发布
6. **后续监控** - 监控发布后的状态

### 维护者

项目维护者负责：
- 代码审查和合并
- Bug报告处理
- 社区管理
- 版本发布

### 社区指南

- 友善和尊重他人
- 积极参与讨论
- 帮助新手用户
- 分享经验和知识
- 维护项目质量

## 📄 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

```
MIT License

Copyright (c) 2024 Shared Expense Management Platform

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 📞 联系我们

- **项目主页**: [GitHub Repository](https://github.com/your-username/shared-expense-frontend)
- **问题反馈**: [GitHub Issues](https://github.com/your-username/shared-expense-frontend/issues)
- **讨论交流**: [GitHub Discussions](https://github.com/your-username/shared-expense-frontend/discussions)
- **邮件联系**: support@sharedexpense.com

## 🙏 致谢

感谢以下项目和开源社区的支持：

- **JavaScript** - 现代Web开发的基石
- **CSS3** - 强大的样式和动画能力
- **Fetch API** - 简洁的HTTP请求接口
- **LocalStorage** - 便捷的客户端存储
- **所有贡献者** - 感谢代码和文档的贡献者

---

**版本**: 1.0.0  
**最后更新**: 2024年3月15日  
**维护者**: Shared Expense Development Team