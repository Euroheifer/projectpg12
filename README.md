# 费用分摊管理系统

一个基于 FastAPI 和现代前端技术的群组费用分摊管理平台，类似于 Splitwise 的功能实现。

## 🚀 项目特性

### 核心功能
- **🏠 群组管理** - 创建和管理费用分摊群组
- **👥 成员管理** - 添加、移除群组成员，设置管理员权限
- **💰 费用追踪** - 记录群组成员的花费，自动计算分摊
- **💳 支付管理** - 记录成员间的转账和支付
- **📊 智能计算** - 自动计算每个成员的余额和应付款项
- **🔄 定期费用** - 支持每月、每周等定期费用自动分摊
- **📧 邀请系统** - 通过邮箱邀请新成员加入群组
- **📱 响应式设计** - 支持手机、平板、桌面设备

### 技术特性
- **🔐 JWT 认证** - 安全的用户认证和授权
- **📋 审计日志** - 完整的操作记录和变更跟踪
- **🗄️ 关系型数据库** - 使用 PostgreSQL 存储数据
- **⚡ 缓存支持** - Redis 提供高速数据缓存
- **🔄 异步处理** - FastAPI 异步框架提升性能
- **📖 API 文档** - 自动生成的 Swagger/OpenAPI 文档
- **🐳 容器化部署** - Docker + Docker Compose 一键部署
- **🔒 HTTPS 支持** - 内置 SSL 证书生成和管理

## 🏗️ 技术架构

### 后端技术栈
- **FastAPI** - 现代 Python Web 框架
- **SQLAlchemy** - Python SQL 工具包和 ORM
- **PostgreSQL 15** - 关系型数据库
- **Redis 7** - 内存数据结构存储
- **JWT** - JSON Web Token 认证
- **Pydantic** - 数据验证和设置管理
- **Alembic** - 数据库迁移工具
- **APScheduler** - 任务调度器

### 前端技术栈
- **原生 HTML5/CSS3/JavaScript** - 现代前端开发
- **ES6+ 模块化** - 代码组织和模块化
- **响应式设计** - Bootstrap 5 + 自定义 CSS
- **Fetch API** - 异步 HTTP 请求
- **Web Storage** - 客户端数据存储
- **History API** - 单页应用路由

### 部署技术栈
- **Docker & Docker Compose** - 容器化部署
- **Nginx** - 反向代理和静态文件服务
- **Let's Encrypt** - SSL 证书管理
- **PostgreSQL** - 生产级数据库
- **Redis** - 生产级缓存

## 📁 项目结构

```
project/
├── app/                     # 后端应用代码
│   ├── main.py             # FastAPI 应用入口
│   ├── database.py         # 数据库连接配置
│   ├── models.py           # SQLAlchemy 数据模型
│   ├── schemas.py          # Pydantic 数据模型
│   ├── auth.py             # JWT 认证系统
│   ├── crud.py             # 数据库 CRUD 操作
│   ├── dependencies.py     # 依赖注入
│   └── pages.py            # 页面路由
├── frontend/               # 前端代码
│   ├── index.html          # 主页面
│   ├── styles.css          # 样式文件
│   ├── app.js              # 主应用文件
│   ├── dashboard.html      # 仪表板页面
│   ├── js/                 # JavaScript 模块
│   │   ├── auth.js         # 认证模块
│   │   ├── groups.js       # 群组管理
│   │   ├── expenses.js     # 费用管理
│   │   ├── payments.js     # 支付管理
│   │   ├── navigation.js   # 导航模块
│   │   └── utils.js        # 工具函数
│   └── tests/              # 前端测试
├── deployment/             # 部署配置
│   ├── docker-compose.dev.yml    # 开发环境
│   ├── nginx/nginx.dev.conf      # Nginx 配置
│   ├── docker/db/postgresql.dev.conf    # PostgreSQL 配置
│   ├── docker/redis/redis.dev.conf      # Redis 配置
│   └── scripts/
│       ├── generate-ssl.sh       # SSL 证书生成
│       └── start-dev.sh          # 开发环境启动
├── requirements.txt        # Python 依赖
├── Dockerfile             # Docker 构建文件
├── docker-compose.yml     # 生产环境配置
├── .env.example           # 环境变量模板
├── .gitignore            # Git 忽略文件
└── README.md             # 项目文档
```

## 🚀 快速开始

### 系统要求
- Docker >= 20.10
- Docker Compose >= 2.0
- 至少 4GB 可用内存
- 端口 8000, 8080, 5432, 6379, 5050, 8443

### 1. 克隆项目
```bash
# 如果有Git仓库
git clone <repository-url>
cd project

# 或者解压下载的项目包
tar -xzf project-complete.tar.gz
cd project
```

### 2. 启动开发环境
```bash
# 使脚本可执行
chmod +x deployment/scripts/*.sh

# 一键启动所有服务
./deployment/scripts/start-dev.sh
```

### 3. 访问应用
- **前端页面**: http://localhost:8080
- **API 文档**: http://localhost:8000/docs
- **pgAdmin**: http://localhost:5050
  - 用户名: `admin@expense.local`
  - 密码: `admin123`
- **Redis 管理**: http://localhost:8081

### 4. 停止服务
```bash
docker-compose -f deployment/docker-compose.dev.yml down
```

## 📚 API 文档

启动应用后，可以访问以下 URL 查看 API 文档：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 主要 API 端点

#### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息
- `PUT /api/auth/me` - 更新用户信息

#### 群组管理
- `GET /api/groups` - 获取用户群组列表
- `POST /api/groups` - 创建群组
- `GET /api/groups/{group_id}` - 获取群组详情
- `PUT /api/groups/{group_id}` - 更新群组信息
- `DELETE /api/groups/{group_id}` - 删除群组

#### 费用管理
- `GET /api/groups/{group_id}/expenses` - 获取群组费用列表
- `POST /api/groups/{group_id}/expenses` - 创建费用
- `GET /api/expenses/{expense_id}` - 获取费用详情
- `PUT /api/expenses/{expense_id}` - 更新费用
- `DELETE /api/expenses/{expense_id}` - 删除费用

#### 成员管理
- `POST /api/groups/{group_id}/members` - 添加成员
- `DELETE /api/groups/{group_id}/members/{member_id}` - 移除成员
- `GET /api/groups/{group_id}/balances` - 获取群组余额

#### 支付管理
- `GET /api/groups/{group_id}/payments` - 获取支付记录
- `POST /api/groups/{group_id}/payments` - 创建支付记录
- `DELETE /api/payments/{payment_id}` - 删除支付记录

#### 邀请系统
- `GET /api/invitations` - 获取用户邀请
- `POST /api/groups/{group_id}/invitations` - 发送邀请
- `POST /api/invitations/{invitation_id}/accept` - 接受邀请

## 🔧 开发指南

### 本地开发设置

1. **安装 Python 依赖**
```bash
pip install -r requirements.txt
```

2. **设置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件设置数据库连接等
```

3. **启动开发服务**
```bash
# 启动数据库和缓存
docker-compose -f deployment/docker-compose.dev.yml up postgres redis -d

# 启动后端服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 启动前端服务 (如果需要独立的开发服务器)
cd frontend && python -m http.server 8080
```

### 代码规范

- **Python**: 使用 Black 格式化，Flake8 检查
- **JavaScript**: 使用 ESLint 检查，Prettier 格式化
- **数据库**: 使用 Alembic 进行数据库迁移

### 测试

```bash
# 后端测试
pytest

# 前端测试
cd frontend && npm test
```

## 🏭 生产部署

### 使用 Docker Compose
```bash
# 启动生产环境
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 环境变量配置

生产环境需要配置以下环境变量：
- `DATABASE_URL` - PostgreSQL 连接字符串
- `SECRET_KEY` - JWT 密钥
- `REDIS_URL` - Redis 连接字符串
- `SMTP_*` - 邮件服务配置

### SSL 证书配置

项目包含自动 SSL 证书生成脚本：
```bash
./deployment/scripts/generate-ssl.sh
```

## 📊 数据库设计

### 主要表结构

#### 用户表 (users)
- `id` - 用户ID
- `email` - 邮箱地址
- `full_name` - 全名
- `hashed_password` - 密码哈希
- `is_active` - 是否活跃
- `created_at` - 创建时间

#### 群组表 (groups)
- `id` - 群组ID
- `name` - 群组名称
- `description` - 群组描述
- `created_by_id` - 创建者ID
- `created_at` - 创建时间

#### 费用表 (expenses)
- `id` - 费用ID
- `group_id` - 群组ID
- `payer_id` - 付款人ID
- `title` - 费用标题
- `amount` - 费用金额
- `expense_date` - 费用日期

#### 费用分摊表 (expense_splits)
- `id` - 分摊ID
- `expense_id` - 费用ID
- `user_id` - 用户ID
- `share_amount` - 分摊金额
- `is_paid` - 是否已付款

## 🔐 安全特性

- **JWT 认证** - 无状态的用户认证
- **密码哈希** - 使用 bcrypt 安全存储密码
- **CORS 配置** - 跨域资源共享控制
- **SQL 注入防护** - 使用 SQLAlchemy ORM
- **输入验证** - Pydantic 数据验证
- **HTTPS 支持** - 强制使用安全连接
- **权限控制** - 基于角色的访问控制

## 🚧 常见问题

### Q: 如何重置数据库？
A: 
```bash
docker-compose -f deployment/docker-compose.dev.yml down -v
docker-compose -f deployment/docker-compose.dev.yml up -d
```

### Q: 如何查看应用日志？
A:
```bash
docker-compose -f deployment/docker-compose.dev.yml logs -f backend
```

### Q: 如何修改端口配置？
A: 编辑 `deployment/docker-compose.dev.yml` 文件中的端口映射。

### Q: 如何备份数据库？
A:
```bash
docker-compose -f deployment/docker-compose.dev.yml exec postgres pg_dump -U postgres expense_dev > backup.sql
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👥 作者

- **MiniMax Agent** - *初始开发* - [MiniMax](https://github.com/minimax-agent)

## 🙏 致谢

- [FastAPI](https://fastapi.tiangolo.com/) - 现代化的 Python Web 框架
- [SQLAlchemy](https://www.sqlalchemy.org/) - Python SQL 工具包
- [Bootstrap](https://getbootstrap.com/) - CSS 框架
- [Docker](https://www.docker.com/) - 容器化平台