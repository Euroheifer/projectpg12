# ProjectPG12 - Expense Management System

A comprehensive web-based expense management platform designed for group expense tracking and settlement, similar to Splitwise.

## 📋 Table of Contents

* [System Architecture](#system-architecture)

* [Object-Oriented Design](#object-oriented-design)

* [Testing Strategy](#testing-strategy)

* [Version Control](#version-control)

* [Code Quality](#code-quality)

* [Security](#security)

* [Error Handling](#error-handling)

* [Extensibility](#extensibility)

* [Usability](#usability)

* [Deployment](#deployment)

* [API Documentation](#api-documentation)

## 🏗️ System Architecture

### Technology Stack

* **Backend**: FastAPI (Python 3.9+) with SQLAlchemy ORM

* **Database**: SQLite for development, PostgreSQL-ready for production

* **Frontend**: Native JavaScript ES6 modules with HTML5 templates

* **Authentication**: OAuth2 with JWT tokens

* **Deployment**: Docker with docker-compose

* **Background Jobs**: APScheduler for recurring expense processing

### Architecture Pattern

The application follows a **layered architecture** pattern with clear separation of concerns:

```
├── Presentation Layer (Frontend)
│   ├── HTML Templates (Jinja2)
│   ├── CSS Styling (Responsive Design)
│   └── JavaScript Modules (ES6)
├── API Layer (FastAPI)
│   ├── Route Handlers
│   ├── Request/Response Schemas (Pydantic)
│   └── Authentication Middleware
├── Business Logic Layer
│   ├── CRUD Operations
│   ├── Business Rules
│   └── Data Validation
├── Data Access Layer
│   ├── SQLAlchemy Models
│   ├── Database Sessions
│   └── Query Optimization
└── Infrastructure Layer
    ├── Database Configuration
    ├── Authentication System
    └── Background Job Scheduler
```

## 🎯 Object-Oriented Design
 ```mermaid
graph LR
   A --> B
   A -->C
   C -->D
``` 
### Core Domain Models

#### 1. User Management

```python
class User(Base):
    - Attributes: id, email, username, hashed_password
    - Relationships: groups_created, memberships, payments_made, payments_received
    - Responsibilities: User authentication, profile management
```

#### 2. Group Management

```python
class Group(Base):
    - Attributes: id, name, description, admin_id, created_at
    - Relationships: admin, members, expenses, recurring_expenses
    - Responsibilities: Group lifecycle, member coordination
```

#### 3. Financial Entities

```python
class Expense(Base):
    - Attributes: id, group_id, payer_id, amount, description, category, date
    - Relationships: group, payer, splits, payments
    - Responsibilities: Expense tracking, cost distribution

class Payment(Base):
    - Attributes: id, expense_id, from_user_id, to_user_id, amount
    - Relationships: expense, from_user, to_user
    - Responsibilities: Settlement tracking, debt resolution
```

### Design Principles Applied

#### 1. **Single Responsibility Principle (SRP)**

* Each model class handles a single domain concept

* CRUD operations separated into dedicated modules

* Authentication logic isolated in auth.py

#### 2. **Open/Closed Principle (OCP)**

* Schema validation through Pydantic models

* Extensible API endpoints through FastAPI routing

* Plugin-ready background job system

#### 3. **Dependency Inversion Principle (DIP)**

* Database abstraction through SQLAlchemy ORM

* Dependency injection for database sessions

* Interface-based authentication system

#### 4. **Composition over Inheritance**

* User-Group relationships through association tables

* Expense splitting through separate ExpenseSplit entities

* Flexible permission system through role-based access

## 🧪 Testing Strategy

### 1. **Automated Testing**

```bash
# Syntax validation for all Python files
python final_verification.py

# End-to-end API testing
./teststage-all.sh        # Development environment
./testprod-allhttps.sh    # Production HTTPS testing
./testiter2.sh            # Iteration 2 specific features
```

### 2. **Integration Testing**

* **Database Integration**: SQLAlchemy model validation

* **API Integration**: Full request/response cycle testing

* **Authentication Flow**: Token-based security validation

* **File Upload**: Image handling and storage testing

### 3. **Manual Testing Protocol**

1. **User Journey Testing**

   * Registration → Login → Group Creation → Expense Addition → Payment Settlement
2. **Cross-browser Compatibility**

   * Chrome, Firefox, Safari, Edge testing
3. **Responsive Design Testing**

   * Desktop (1920x1080), Tablet (768px), Mobile (375px)
4. **Performance Testing**

   * < 2 seconds response time validation

   * Concurrent user simulation

### 4. **Error Scenario Testing**

* Invalid authentication attempts

* Malformed API requests

* File upload edge cases

* Database constraint violations

## 📝 Version Control

### Git Strategy

* **Main Branch**: Production-ready code

* **Feature Branches**: Individual feature development

* **Hotfix Branches**: Critical bug fixes

### Commit Convention

```
feat: add payment settlement algorithm
fix: resolve JavaScript initialization timing
refactor: improve error handling in payment module
docs: update API documentation
test: add expense calculation unit tests
```

### Version History

* **v2025.11.10.001**: JavaScript initialization fixes, improved error handling

* **v1.0.0**: Core expense management functionality implementation

## 💎 Code Quality

### 1. **Python Standards (PEP 8)**

* Consistent indentation (4 spaces)

* Descriptive variable and function names

* Comprehensive docstrings for all modules

* Type hints for better code maintainability

### 2. **JavaScript Standards (ES6+)**

* Modular architecture with ES6 imports

* Consistent naming conventions (camelCase)

* Error handling with try-catch blocks

* Async/await for API communication

### 3. **Code Organization**

```
app/
├── main.py              # Application entry point
├── models.py            # Database models (203 lines)
├── schemas.py           # Pydantic validation schemas
├── crud.py              # Database operations
├── auth.py              # Authentication logic
├── dependencies.py      # Dependency injection
├── static/
│   ├── js/
│   │   ├── api/         # API communication modules
│   │   ├── page/        # Page-specific logic
│   │   └── utils/       # Utility functions
│   └── css/             # Styling
└── templates/           # HTML templates
```

### 4. **Code Metrics**

* **Backend**: 1,339 lines (main.py), well-structured API endpoints

* **Frontend**: Modular JavaScript with clear separation of concerns

* **Database**: Normalized schema with proper relationships

## 🔒 Security

### 1. **Authentication & Authorization**

* **JWT Token-based Authentication**: Secure, stateless authentication

* **Password Hashing**: bcrypt for secure password storage

* **Role-based Access Control**: Admin/member permissions

* **Session Management**: Secure token lifecycle

### 2. **Data Protection**

* **SQL Injection Prevention**: SQLAlchemy ORM parameterized queries

* **XSS Protection**: Input sanitization and validation

* **CSRF Protection**: Token-based request validation

* **File Upload Security**: Type validation and secure storage

### 3. **API Security**

* **Input Validation**: Pydantic schema validation

* **Rate Limiting**: Protection against abuse

* **HTTPS Enforcement**: Secure data transmission

* **Error Information Disclosure**: Sanitized error messages

### 4. **Data Privacy**

* **Monetary Precision**: Integer storage to prevent floating-point errors

* **Audit Trail**: Complete action logging for accountability

* **Data Isolation**: Group-based data segregation

## ⚠️ Error Handling

### 1. **Frontend Error Handling**

```javascript
// Graceful API error handling
async function handleApiCall(apiFunction, ...args) {
    try {
        return await apiFunction(...args);
    } catch (error) {
        showErrorMessage('Operation failed. Please try again.');
        console.error('API Error:', error);
        return null;
    }
}
```

### 2. **Backend Error Handling**

```python
# Custom exception handling
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid input data", "errors": exc.errors()}
    )
```

### 3. **Error Recovery Mechanisms**

* **Automatic Retry**: Failed API calls with exponential backoff

* **Graceful Degradation**: Fallback UI when data is unavailable

* **User Feedback**: Clear error messages with suggested actions

* **State Recovery**: Preservation of user input during errors

### 4. **Monitoring & Logging**

* **Application Logs**: Comprehensive error tracking

* **Database Auditing**: All financial transactions logged

* **Performance Monitoring**: Response time tracking

## 🚀 Extensibility

### 1. **Modular Architecture**

* **Plugin System**: Easy integration of new features

* **API Versioning**: Backward compatibility support

* **Database Migrations**: Schema evolution support

* **Microservice Ready**: Loosely coupled components

### 2. **Configuration Management**

```python
# Environment-based configuration
class Settings:
    DATABASE_URL: str = "sqlite:///./app.db"
    JWT_SECRET_KEY: str = "your-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30
```

### 3. **Feature Flags**

* **Conditional Features**: Enable/disable features dynamically

* **A/B Testing**: Multiple implementation paths

* **Gradual Rollout**: Phased feature deployment

### 4. **Integration Points**

* **Payment Gateways**: Stripe, PayPal integration ready

* **Notification Services**: Email, SMS, push notifications

* **External APIs**: Bank account integration, receipt OCR

* **Import/Export**: CSV, Excel data exchange

### 5. **Cross-Platform Support**

* **Docker Deployment**: Consistent across environments

* **Database Abstraction**: PostgreSQL, MySQL compatibility

* **Cloud Native**: AWS, Azure, GCP deployment ready

## 👥 Usability

### 1. **User Interface Design**

* **Responsive Layout**: Seamless desktop and tablet experience

* **Intuitive Navigation**: Clear information architecture

* **Visual Feedback**: Loading states, success/error indicators

* **Accessibility**: WCAG 2.1 compliance considerations

### 2. **User Experience**

* **Performance**: Sub-2-second response times

* **Progressive Enhancement**: Works without JavaScript

* **Offline Capability**: Local storage for temporary data

* **Mobile First**: Touch-friendly interface design

### 3. **Feature Usability**

* **Quick Actions**: One-click expense addition

* **Smart Defaults**: Auto-populated forms based on context

* **Bulk Operations**: Multi-expense selection and actions

* **Search & Filter**: Efficient data discovery

### 4. **User Onboarding**

* **Guided Tutorial**: First-time user walkthrough

* **Context Help**: Inline documentation

* **Examples**: Sample data for learning

* **Progressive Disclosure**: Advanced features when needed

## 🚀 Deployment

### Production Deployment

```bash
# Clone repository
git clone https://github.com/tcx2004/project-pg12
cd projectpg12

# Environment setup
cp .env.example .env
# Configure environment variables

# Docker deployment
docker-compose up -d

# Access application
https://172.25.76.174:443/
```

### Environment Requirements

* **Python 3.9+**

* **Docker & Docker Compose**

* **SQLite 3.x** (development) / **PostgreSQL 12+** (production)

* **SSL Certificate** (HTTPS requirement)

### Health Checks

```bash
# Application health
curl -f http://localhost:8000/health || exit 1

# Database connectivity
python -c "from app.database import engine; engine.connect()"
```

## 📚 API Documentation

### Authentication Endpoints

```
POST /users/signup          # User registration
POST /token                 # Login (OAuth2)
POST /auth/logout           # Logout
GET  /me                    # Current user profile
```

### Group Management

```
POST   /groups/             # Create group
GET    /groups/{id}         # Get group details
PUT    /groups/{id}         # Update group
DELETE /groups/{id}         # Delete group
POST   /groups/{id}/invite  # Send invitation
```

### Expense Management

```
POST   /groups/{id}/expenses        # Create expense
GET    /groups/{id}/expenses        # List expenses
PUT    /groups/{id}/expenses/{id}   # Update expense
DELETE /groups/{id}/expenses/{id}   # Delete expense
```

### Payment & Settlement

```
POST   /expenses/{id}/payments      # Record payment
GET    /expenses/{id}/payments      # List payments
GET    /groups/{id}/settlement      # Calculate balances
```

### Response Format

```json
{
  "id": 1,
  "amount": 2500,
  "description": "Restaurant dinner",
  "category": "Food",
  "date": "2025-11-12",
  "created_at": "2025-11-12T16:44:54Z"
}
```

## 📊 Project Statistics

* **Backend Code**: 1,339 lines (main.py), 203 lines (models.py)

* **Frontend Code**: Modular JavaScript architecture

* **Database Tables**: 9 entities with proper relationships

* **API Endpoints**: 25+ RESTful endpoints

* **Test Coverage**: Integration tests for all major workflows

* **Documentation**: Comprehensive inline and external documentation

## 🤝 Contributing

### Development Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Database setup
python app/create_tables.py

# Development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Code Standards

* Follow PEP 8 for Python code

* Use ESLint for JavaScript validation

* Write descriptive commit messages

* Include tests for new features

***

**Version**: 2025.11.10.001\
**Deployment**: <https://172.25.76.174:443/>\
**Repository**: <https://github.com/tcx2004/project-pg12>\
**Development Team**: Group12
