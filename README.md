# 记账应用完整修复版本

一个用于群组共享支出的后端系统，已完全修复所有已知问题。

## 🚀 快速开始

### 方法一：一键部署
```bash
bash 快速部署.sh
```

### 方法二：手动部署
```bash
docker-compose down --remove-orphans
docker-compose up -d --build
# 访问: https://localhost:8443
```

## 🔧 修复内容 (2025-11-05)

### ✅ 已修复的关键问题:
1. **escapeHtml函数未定义** - 已修复为全局函数 `window.escapeHtml`
2. **邀请功能占位符** - 已完整实现所有邀请功能（加载/接受/拒绝）
3. **API函数命名不一致** - 已统一函数命名
4. **消息提示功能缺失** - 已添加 `showMessage` 函数
5. **群组详情页硬编码数据** - 已清除演示数据，改为动态加载

### 🧪 验证修复:
```bash
bash 快速测试.sh
```

或使用详细验证：
```bash
bash validate_fix.sh
bash validate_group_fix.sh
```

```bash
PROJECT-PG12/
├── app/
│   ├── main.py             # FastAPI app entry point and all routes
│   ├── database.py         # Database connection and session management
│   ├── models.py           # SQLAlchemy ORM models
│   ├── schemas.py          # Pydantic Schemas for request and response models
│   ├── crud.py             # CRUD operations for database models
│   ├── auth.py             # User authentication and JWT handling
│   └── dependencies.py     # Common dependencies, e.g.,get current user DB session
├── Dockerfile              # Docker image build file
├── docker-compose.yml      # Docker container orchestration file
├── requirements.txt        # Python dependencies
└── README.md               # Project documentation


app/static/js/
├── api/
│   ├── auth.js              # 认证相关 API
│   ├── expense.js           # 支出相关 API
│   ├── groups.js            # 群组相关 API
│   ├── invitations.js       # 邀请相关 API
│   ├── payment.js           # 支付相关 API
│   └── recurring-expense.js # 定期支出相关 API
├── ui/
│   ├── menu.js              # 顶部菜单和用户信息管理
│   └── utils.js             # 通用 UI 工具函数
├── pages/
    ├── auth_page.js         # 登录/注册页面逻辑
    ├── group_page.js        # 群组页面逻辑
    └── home_page.js         # 主页特定逻辑