from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from app.models import InvitationStatus

# ----------- User Schemas -----------
class UserBase(BaseModel):
    email: EmailStr
    username: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int

    class Config:
        from_attributes = True


# ----------- Token Schemas -----------
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):

    email: Optional[str] = None


# ----------- Expense Group Schemas -----------


class GroupBase(BaseModel):
    name: str
    description: str = ""


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class Group(GroupBase):
    id: int
    admin_id: int
    
    # --- 🔴 修复：添加这些字段以匹配前端 group_page.js 的期望 ---
    user_balance_owed: Optional[float] = 0.0
    user_balance_owing: Optional[float] = 0.0
    settlement_summary: Optional[str] = "暂无数据"
    # --- 修复结束 ---

    class Config:
        from_attributes = True


# ---------- Group Member Schemas -----------
class GroupMemberBase(BaseModel):
    user_id: int
    is_admin: bool
    nickname: Optional[str] = None
    remarks: Optional[str]


class GroupMember(GroupMemberBase):
    user: User # add by sunzhe 03 Nov for load username

    class Config:
        from_attributes = True


class GroupMemberInfo(BaseModel):
    user_id: int
    is_admin: bool
    nickname: Optional[str] = None
    remarks: Optional[str]


class GroupWithMembers(BaseModel):
    user_ids_to_add: List[int]
    group_id: int
    group_name: str
    members: List[GroupMemberInfo]


class GroupMemberUpdate(BaseModel):
    nickname: Optional[str]


class GroupMemberAdminUpdate(BaseModel):
    is_admin: bool

# ----------- Group Invitation Schemas -----------

class GroupInvitationCreate(BaseModel):
    invitee_email: EmailStr


class InvitationAction(BaseModel):
    action: str  # must be "accept" or "reject"


class GroupInvitation(BaseModel):
    id: int
    group_id: int
    inviter_id: int
    invitee_id: int
    status: InvitationStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GroupInvitationResponse(BaseModel):
    id: int
    status: InvitationStatus
    group: Group
    inviter: User
    invitee: User
    created_at: datetime

    class Config:
        from_attributes = True

# ----------- Expense Schemas (US7, US9) -----------

# class ExpenseBase(BaseModel):
    # description: str
    # amount: int  # 03 Nov
    # payer_id: int
    # image_url: Optional[str] = None
class ExpenseBase(BaseModel):
    description: str
    amount: int
    payer_id: int
    image_url: Optional[str] = None

# class ExpenseCreate(ExpenseBase):
    # date: Optional[date] = None # For INPUT, date is optional
class ExpenseCreate(BaseModel):
    description: str
    amount: int
    payer_id: int
    image_url: Optional[str] = None
    #date: Optional[date] = None  # 明确声明为可选
    date: Optional[date] = None # 🔴 修复：从 str 改回 date
    
# class ExpenseUpdate(BaseModel):
    # description: Optional[str] = None
    # amount: Optional[int] = None # 03 Nov
    # payer_id: Optional[int] = None
    # date: Optional[date] = None
    # image_url: Optional[str] = None
    # split_type: Optional[str] = None
    # splits: Optional[List['ExpenseSplitCreate']] = None # Use string forward reference
class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[int] = None
    payer_id: Optional[int] = None
    #date: Optional[date] = None
    date: Optional[date] = None # 🔴 修复：从 str 改回 date
    image_url: Optional[str] = None
    split_type: Optional[str] = None
    splits: Optional[List['ExpenseSplitCreate']] = None


# class Expense(ExpenseBase):
    # id: int
    # group_id: int
    # creator_id: int
    # date: date # For OUTPUT, date is required and will always be present

    # split_type: str
    # class Config:
        # from_attributes = True
class Expense(ExpenseBase):
    id: int
    group_id: int
    creator_id: int
    date: date
    split_type: str
    
    class Config:
        from_attributes = True


# ----------- Recurring Expense Schemas (US8) -----------
# class RecurringExpenseBase(BaseModel):
    # description: str
    # amount: int    # 03 Nov
    # frequency: str # e.g., 'daily', 'weekly', 'monthly'
    # start_date: date
    # payer_id: int
    # split_type: str = "equal"  # add by sunzhe 22 Oct for payment update with splits
class RecurringExpenseBase(BaseModel):  # ✅ 取消注释
    description: str
    amount: int
    frequency: str # e.g., 'daily', 'weekly', 'monthly'
    start_date: date
    payer_id: int
    split_type: str = "equal"
    
class RecurringExpenseCreate(RecurringExpenseBase):
    # date: Optional[date] = None      #03 Nov
    splits: List['ExpenseSplitCreate'] # add by sunzhe 22 Oct for payment update with splits


class RecurringExpenseUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[int] = None
    frequency: Optional[str] = None
    start_date: Optional[date] = None
    is_active: Optional[bool] = None
    payer_id: Optional[int] = None
    split_type: Optional[str] = None
    splits: Optional[List['ExpenseSplitCreate']] = None

class RecurringExpense(RecurringExpenseBase):
    id: int
    group_id: int
    creator_id: int
    next_due_date: date
    is_active: bool

    splits_definition: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True

# ************************************************************************ #
# ----------- Expense Split Schemas -----------
class ExpenseSplitBase(BaseModel):
    user_id: int

class ExpenseSplitCreate(ExpenseSplitBase):
    amount: Optional[int] = None   #03 Nov

#  removed  3 lines 03 Nov
#ExpenseUpdate.model_rebuild() # add by sunzhe 22 Oct to payment update with splits
#RecurringExpenseUpdate.model_rebuild()
#RecurringExpenseCreate.model_rebuild()

class ExpenseSplit(ExpenseSplitBase):
    id: int
    expense_id: int
    amount: int
    share_type: str

    class Config:
        from_attributes = True

#class ExpenseCreateWithSplits(ExpenseBase): #03 Nov
# class ExpenseCreateWithSplits(ExpenseCreate):
    # splits: List[ExpenseSplitCreate]
    # split_type: str = "equal"

class ExpenseCreateWithSplits(ExpenseCreate):
    splits: List[ExpenseSplitCreate]
    split_type: str = "equal"
    #date: Optional[date] = None #03 Nov
    # 🔴 修复：删除下面这行多余的定义，这导致了 422 错误
    # date: Optional[date] = None
    
class ExpenseWithSplits(Expense):
    splits: List[ExpenseSplit] = []
    split_type: str

#ExpenseCreateWithSplits.model_rebuild()  # sunzhe 03 Nov

# ----------- Payment Schemas -----------
class PaymentBase(BaseModel):
    from_user_id: int
    to_user_id: int
    amount: int # 03 Nov
    description: Optional[str] = None
    image_url: Optional[str] = None
    #payment_date: date

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(PaymentBase):
    pass

class Payment(PaymentBase):
    id: int
    expense_id: int
    created_at: datetime
    creator_id: int

    class Config:
        from_attributes = True

# ----------- Balance Schemas -----------
class UserBalance(BaseModel):
    user_id: int
    balance: float  # positive means owe money to others, negative means gets money from others

class ExpenseBalance(BaseModel):
    expense: Expense
    balances: Dict[int, float]  # user_id -> balance

class SettlementTransaction(BaseModel):
    from_user_id: int
    to_user_id: int
    amount: int

class BalanceSummary(BaseModel):
    detailed_balance: List[UserBalance]
    simplified_transactions: List[SettlementTransaction]


# ************************************************************************ #
# ----------- Settlement Schemas -----------
class SettlementBalance(BaseModel):
    """(🔴 修复) 单个群组成员的结算余额信息"""
    user_id: int
    username: str
    total_expenses: Optional[float] = None  # 🔴 修复：设为可选
    total_payments_made: Optional[float] = None  # 🔴 修复：设为可选
    total_payments_received: Optional[float] = None  # 🔴 修复：设为可选
    balance: float  # 最终余额 (这是 crud.py 唯一返回的)
    status: str  # 状态：' creditor'（债权方）、'debtor'（债务方）、'settled'（已结清）

class SettlementMember(BaseModel):
    """群组结算成员信息"""
    user_id: int
    username: str
    nickname: Optional[str] = None
    is_admin: bool

class SettlementTransaction(BaseModel):
    """(🔴 修复) 推荐支付路径"""
    from_user_id: int
    to_user_id: int
    amount: float # 🔴 修复：crud.py 生成的是 float
    description: str

class SettlementSummary(BaseModel):
    """群组结算汇总信息"""
    group_id: int
    group_name: str
    total_amount: float  # 群组总支出
    member_count: int
    balances: List[SettlementBalance]
    transactions: List[SettlementTransaction]  # 推荐的支付路径
    last_updated: datetime

class SettlementCreate(BaseModel):
    """创建结算的请求模型"""
    description: Optional[str] = None
    force_settlement: bool = False  # 是否强制结算（即使有未结清的余额）

class SettlementResponse(BaseModel):
    """结算操作响应模型"""
    success: bool
    message: str
    settlement_summary: Optional[SettlementSummary] = None
    created_at: datetime

# ----------- Audit Log Schemas (🔴 修复) -----------
class AuditLog(BaseModel):
    id: int
    group_id: int
    user_id: int
    timestamp: datetime # 🔴 修复：确保字段名与 models.py 一致
    action: str
    details: Optional[dict] = None
    user: User  # 🔴 修复：添加 user 字段以接收关联的用户对象

    class Config:
        from_attributes = True
# --- 修复结束 ---

# --- 把这些粘贴到文件的最末尾 03 Nov ---
ExpenseUpdate.model_rebuild()
RecurringExpenseUpdate.model_rebuild()
RecurringExpenseCreate.model_rebuild()
ExpenseCreateWithSplits.model_rebuild()
# --- 粘贴结束 ---