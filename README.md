[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/_63RRTUw)

A backend system for shared expense management

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