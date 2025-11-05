from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
from datetime import datetime
from typing import List, Optional

from .database import engine, get_db
from .models import Base, User, Group, GroupMember, Expense, Payment, RecurringExpense
from .auth import get_current_user, create_access_token
from .schemas import *
from .crud import *
from .dependencies import *
from .pages import router as pages_router

# 创建数据库表
Base.metadata.create_all(bind=engine)

# 初始化FastAPI应用
app = FastAPI(
    title="费用分摊管理系统",
    description="基于FastAPI的费用分摊管理后端API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(pages_router)

# 认证相关路由
@app.post("/api/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """用户注册"""
    try:
        user = create_user(db, user_data)
        return UserResponse.from_orm(user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """用户登录"""
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    
    access_token = create_access_token(data={"sub": user.email})
    return TokenResponse(access_token=access_token, token_type="bearer")

@app.post("/api/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """用户登出"""
    return {"message": "登出成功"}

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return UserResponse.from_orm(current_user)

@app.put("/api/auth/me", response_model=UserResponse)
async def update_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新用户信息"""
    updated_user = update_user(db, current_user.id, user_data)
    return UserResponse.from_orm(updated_user)

# 群组管理路由
@app.get("/api/groups", response_model=List[GroupResponse])
async def get_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户的群组列表"""
    groups = get_user_groups(db, current_user.id)
    return [GroupResponse.from_orm(group) for group in groups]

@app.post("/api/groups", response_model=GroupResponse)
async def create_group(
    group_data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建群组"""
    group = create_group(db, group_data, current_user.id)
    return GroupResponse.from_orm(group)

@app.get("/api/groups/{group_id}", response_model=GroupDetailResponse)
async def get_group_details(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取群组详情"""
    group = get_group(db, group_id)
    check_group_access(db, current_user.id, group_id)
    return GroupDetailResponse.from_orm(group)

@app.put("/api/groups/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    group_data: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新群组信息"""
    check_group_admin(db, current_user.id, group_id)
    group = update_group_info(db, group_id, group_data)
    return GroupResponse.from_orm(group)

@app.delete("/api/groups/{group_id}")
async def delete_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除群组"""
    check_group_admin(db, current_user.id, group_id)
    delete_group_info(db, group_id)
    return {"message": "群组删除成功"}

@app.post("/api/groups/{group_id}/members", response_model=MemberResponse)
async def add_member(
    group_id: int,
    member_data: GroupMemberCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """添加群组成员"""
    check_group_admin(db, current_user.id, group_id)
    member = add_group_member(db, group_id, member_data.user_id)
    return MemberResponse.from_orm(member)

@app.delete("/api/groups/{group_id}/members/{member_id}")
async def remove_member(
    group_id: int,
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """移除群组成员"""
    check_group_admin(db, current_user.id, group_id)
    remove_group_member(db, group_id, member_id)
    return {"message": "成员移除成功"}

@app.get("/api/groups/{group_id}/balances", response_model=List[BalanceResponse])
async def get_group_balances(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取群组余额"""
    check_group_access(db, current_user.id, group_id)
    balances = get_group_balance_summary(db, group_id)
    return [BalanceResponse.from_orm(balance) for balance in balances]

# 费用管理路由
@app.get("/api/groups/{group_id}/expenses", response_model=List[ExpenseResponse])
async def get_group_expenses(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取群组费用列表"""
    check_group_access(db, current_user.id, group_id)
    expenses = get_group_expenses(db, group_id)
    return [ExpenseResponse.from_orm(expense) for expense in expenses]

@app.post("/api/groups/{group_id}/expenses", response_model=ExpenseResponse)
async def create_expense(
    group_id: int,
    expense_data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建费用"""
    check_group_access(db, current_user.id, group_id)
    expense = create_expense_in_group(db, group_id, expense_data, current_user.id)
    return ExpenseResponse.from_orm(expense)

@app.get("/api/expenses/{expense_id}", response_model=ExpenseResponse)
async def get_expense_details(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取费用详情"""
    expense = get_expense(db, expense_id)
    check_group_access(db, current_user.id, expense.group_id)
    return ExpenseResponse.from_orm(expense)

@app.put("/api/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    expense_data: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新费用"""
    expense = get_expense(db, expense_id)
    check_group_access(db, current_user.id, expense.group_id)
    updated_expense = update_expense_info(db, expense_id, expense_data, current_user.id)
    return ExpenseResponse.from_orm(updated_expense)

@app.delete("/api/expenses/{expense_id}")
async def delete_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除费用"""
    expense = get_expense(db, expense_id)
    check_group_access(db, current_user.id, expense.group_id)
    if expense.payer_id != current_user.id:
        check_group_admin(db, current_user.id, expense.group_id)
    delete_expense_info(db, expense_id)
    return {"message": "费用删除成功"}

# 支付路由
@app.get("/api/groups/{group_id}/payments", response_model=List[PaymentResponse])
async def get_group_payments(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取群组支付记录"""
    check_group_access(db, current_user.id, group_id)
    payments = get_group_payments(db, group_id)
    return [PaymentResponse.from_orm(payment) for payment in payments]

@app.post("/api/groups/{group_id}/payments", response_model=PaymentResponse)
async def create_payment(
    group_id: int,
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建支付记录"""
    check_group_access(db, current_user.id, group_id)
    payment = create_payment_record(db, group_id, payment_data, current_user.id)
    return PaymentResponse.from_orm(payment)

@app.delete("/api/payments/{payment_id}")
async def delete_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除支付记录"""
    payment = get_payment(db, payment_id)
    check_group_access(db, current_user.id, payment.group_id)
    if payment.payer_id != current_user.id:
        check_group_admin(db, current_user.id, payment.group_id)
    delete_payment_record(db, payment_id)
    return {"message": "支付记录删除成功"}

# 定期费用路由
@app.get("/api/groups/{group_id}/recurring-expenses", response_model=List[RecurringExpenseResponse])
async def get_group_recurring_expenses(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取群组定期费用"""
    check_group_access(db, current_user.id, group_id)
    recurring_expenses = get_group_recurring_expenses(db, group_id)
    return [RecurringExpenseResponse.from_orm(re) for re in recurring_expenses]

@app.post("/api/groups/{group_id}/recurring-expenses", response_model=RecurringExpenseResponse)
async def create_recurring_expense(
    group_id: int,
    recurring_data: RecurringExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建定期费用"""
    check_group_access(db, current_user.id, group_id)
    recurring = create_recurring_expense_in_group(db, group_id, recurring_data, current_user.id)
    return RecurringExpenseResponse.from_orm(recurring)

@app.delete("/api/recurring-expenses/{recurring_id}")
async def delete_recurring_expense(
    recurring_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除定期费用"""
    recurring = get_recurring_expense(db, recurring_id)
    check_group_access(db, current_user.id, recurring.group_id)
    if recurring.created_by_id != current_user.id:
        check_group_admin(db, current_user.id, recurring.group_id)
    delete_recurring_expense_info(db, recurring_id)
    return {"message": "定期费用删除成功"}

# 邀请系统路由
@app.get("/api/invitations", response_model=List[InvitationResponse])
async def get_user_invitations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户的邀请"""
    invitations = get_user_group_invitations(db, current_user.id)
    return [InvitationResponse.from_orm(invitation) for invitation in invitations]

@app.post("/api/groups/{group_id}/invitations", response_model=InvitationResponse)
async def send_invitation(
    group_id: int,
    invitation_data: GroupInvitationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """发送群组邀请"""
    check_group_admin(db, current_user.id, group_id)
    invitation = create_group_invitation(db, group_id, invitation_data, current_user.id)
    return InvitationResponse.from_orm(invitation)

@app.post("/api/invitations/{invitation_id}/accept")
async def accept_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """接受邀请"""
    invitation = get_invitation(db, invitation_id)
    if invitation.email != current_user.email:
        raise HTTPException(status_code=403, detail="此邀请不属于当前用户")
    
    accept_group_invitation(db, invitation_id, current_user.id)
    return {"message": "邀请已接受"}

@app.delete("/api/invitations/{invitation_id}")
async def reject_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """拒绝邀请"""
    invitation = get_invitation(db, invitation_id)
    if invitation.email != current_user.email:
        raise HTTPException(status_code=403, detail="此邀请不属于当前用户")
    
    reject_group_invitation(db, invitation_id)
    return {"message": "邀请已拒绝"}

# 健康检查
@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# 主页路由
@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "费用分摊管理系统API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)