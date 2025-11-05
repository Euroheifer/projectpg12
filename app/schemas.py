from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
from decimal import Decimal

# 用户相关模型
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime]
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# 群组相关模型
class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class GroupResponse(GroupBase):
    id: int
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    is_active: bool
    
    class Config:
        from_attributes = True

class MemberResponse(BaseModel):
    id: int
    group_id: int
    user_id: int
    role: str
    joined_at: datetime
    is_active: bool
    
    # 用户信息
    user: UserResponse
    
    class Config:
        from_attributes = True

class GroupDetailResponse(GroupResponse):
    members: List[MemberResponse]
    total_expenses: float
    total_members: int

# 成员相关模型
class GroupMemberCreate(BaseModel):
    user_id: int
    role: Optional[str] = "member"

class BalanceResponse(BaseModel):
    user_id: int
    user: UserResponse
    balance: float  # 正数表示别人欠你，负数表示你欠别人

class InvitationResponse(BaseModel):
    id: int
    group_id: int
    group: GroupResponse
    email: str
    status: str
    created_at: datetime
    expires_at: datetime
    accepted_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class GroupInvitationCreate(BaseModel):
    email: EmailStr

# 费用相关模型
class ExpenseBase(BaseModel):
    title: str
    description: Optional[str] = None
    amount: float
    category: Optional[str] = "other"
    expense_date: Optional[datetime] = None

class ExpenseCreate(ExpenseBase):
    splits: Dict[int, float]  # user_id: share_amount
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('金额必须大于0')
        return v

class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    expense_date: Optional[datetime] = None

class ExpenseResponse(ExpenseBase):
    id: int
    group_id: int
    payer_id: int
    expense_date: datetime
    created_at: datetime
    updated_at: Optional[datetime]
    is_active: bool
    
    # 关联信息
    payer: UserResponse
    group: GroupResponse
    splits: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True

class ExpenseSplitResponse(BaseModel):
    id: int
    user_id: int
    share_amount: float
    is_paid: bool
    paid_amount: float
    
    # 用户信息
    user: UserResponse
    
    class Config:
        from_attributes = True

# 支付相关模型
class PaymentBase(BaseModel):
    receiver_id: int
    amount: float
    description: Optional[str] = None
    payment_date: Optional[datetime] = None

class PaymentCreate(PaymentBase):
    expense_id: Optional[int] = None
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('金额必须大于0')
        return v

class PaymentResponse(PaymentBase):
    id: int
    group_id: int
    expense_id: Optional[int]
    payer_id: int
    payment_date: datetime
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    
    # 关联信息
    payer: UserResponse
    receiver: UserResponse
    group: GroupResponse
    
    class Config:
        from_attributes = True

# 定期费用相关模型
class RecurringExpenseBase(BaseModel):
    title: str
    description: Optional[str] = None
    amount: float
    category: Optional[str] = "other"
    frequency: str
    next_execution_date: datetime

class RecurringExpenseCreate(RecurringExpenseBase):
    splits: Dict[int, float]  # user_id: share_amount

class RecurringExpenseResponse(RecurringExpenseBase):
    id: int
    group_id: int
    created_by_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    # 关联信息
    creator: UserResponse
    group: GroupResponse
    
    class Config:
        from_attributes = True

# 统计相关模型
class GroupStatistics(BaseModel):
    total_expenses: float
    total_members: int
    my_expenses: float
    i_owe: float
    owed_to_me: float
    net_balance: float

class UserStatistics(BaseModel):
    total_groups: int
    total_expenses: float
    total_paid: float
    total_received: float
    net_balance: float
    groups: List[GroupStatistics]

# 通知相关模型
class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime
    related_id: Optional[int] = None
    related_type: Optional[str] = None

# API响应模型
class MessageResponse(BaseModel):
    message: str

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None

# 分页相关模型
class PaginationResponse(BaseModel):
    page: int
    per_page: int
    total: int
    pages: int

class PaginatedResponse(BaseModel):
    data: List[Any]
    pagination: PaginationResponse

# 搜索相关模型
class SearchRequest(BaseModel):
    query: str
    group_id: Optional[int] = None
    type: Optional[str] = None  # 'expenses', 'groups', 'users'

class SearchResponse(BaseModel):
    expenses: List[ExpenseResponse]
    groups: List[GroupResponse]
    users: List[UserResponse]