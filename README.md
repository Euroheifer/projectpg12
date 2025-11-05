# 群组支出管理系统 - 精简版

## 项目简介

这是一个完整的群组支出管理系统，提供用户认证、群组管理、支出追踪、支付记录和余额结算等功能。

## 技术栈

### 后端
- **FastAPI** - Python Web框架
- **SQLAlchemy** - ORM数据库操作
- **PostgreSQL** - 主数据库
- **Redis** - 缓存和会话管理
- **JWT** - 用户认证

### 前端
- **原生JavaScript** - 模块化架构
- **HTML5 + CSS3** - 响应式设计
- **Nginx** - 反向代理

## 核心功能

- ✅ 用户注册和登录
- ✅ 创建和管理群组
- ✅ 添加和追踪支出
- ✅ 记录支付信息
- ✅ 自动计算余额
- ✅ 群组邀请管理
- ✅ 响应式UI设计

## 快速开始

### 方式一：Docker Compose (推荐)

```bash
# 启动所有服务
docker-compose up -d

# 访问应用
# 前端: http://localhost:8080
# 后端API: http://localhost:8000
# API文档: http://localhost:8000/docs
```

### 方式二：开发环境

```bash
# 1. 安装Python依赖
pip install -r requirements.txt

# 2. 启动后端服务
cd app
uvicorn main:app --reload --port 8000

# 3. 启动前端服务
# 使用任何静态文件服务器托管frontend目录
# 例如: python -m http.server 8080 --directory frontend
```

## 项目结构

```
├── app/                 # 后端Python代码
│   ├── main.py         # FastAPI主应用
│   ├── models.py       # 数据库模型
│   ├── crud.py         # 数据库操作
│   ├── auth.py         # 认证相关
│   ├── schemas.py      # Pydantic模式
│   ├── dependencies.py # 依赖注入
│   └── pages.py        # HTML页面路由
├── frontend/            # 前端静态文件
│   ├── index.html      # 主页面
│   ├── dashboard.html  # 仪表板
│   ├── styles.css      # 样式文件
│   ├── app.js          # 应用入口
│   └── js/             # JavaScript模块
├── deployment/          # 部署配置
│   ├── docker-compose.dev.yml
│   ├── nginx/          # Nginx配置
│   └── scripts/        # 部署脚本
├── requirements.txt     # Python依赖
├── docker-compose.yml  # Docker配置
└── README.md          # 项目说明
```

## 主要API端点

- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `GET /groups` - 获取群组列表
- `POST /groups` - 创建群组
- `GET /expenses` - 获取支出列表
- `POST /expenses` - 添加支出
- `GET /payments` - 获取支付列表
- `POST /payments` - 记录支付

## 默认端口

- 前端: 8080
- 后端API: 8000
- PostgreSQL: 5432
- Redis: 6379
- Nginx: 80

## 注意事项

- 首次启动会自动创建数据库表
- 建议在生产环境中修改默认密码
- 前端已包含所有必要的JavaScript模块
- 支持移动端响应式设计

## 许可证

MIT License