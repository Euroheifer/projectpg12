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
