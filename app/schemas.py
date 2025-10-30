from pydantic import BaseModel, EmailStr, Field
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

    class Config:
        from_attributes = True


# ---------- Group Member Schemas -----------
class GroupMemberBase(BaseModel):
    user_id: int
    is_admin: bool
    nickname: Optional[str] = None
    remarks: Optional[str]


class GroupMember(GroupMemberBase):
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

class ExpenseBase(BaseModel):
    description: str
    amount: int
    payer_id: int
    image_url: Optional[str] = None  

class ExpenseCreate(ExpenseBase):
    date: Optional[date] = None # For INPUT, date is optional

class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[int] = None
    payer_id: Optional[int] = None
    date: Optional[date] = None
    image_url: Optional[str] = None 
    split_type: Optional[str] = None
    splits: Optional[List['ExpenseSplitCreate']] = None # Use string forward reference

class Expense(ExpenseBase):
    id: int
    group_id: int
    creator_id: int
    date: date # For OUTPUT, date is required and will always be present

    split_type: str 
    class Config:
        from_attributes = True


# ----------- Recurring Expense Schemas (US8) -----------
class RecurringExpenseBase(BaseModel):
    description: str
    amount: int
    frequency: str # e.g., 'daily', 'weekly', 'monthly'
    start_date: date
    payer_id: int 
    split_type: str = "equal"  # add by sunzhe 22 Oct for payment update with splits

class RecurringExpenseCreate(RecurringExpenseBase):
    date: Optional[date] = None
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
    amount: Optional[int] = None

ExpenseUpdate.model_rebuild() # add by sunzhe 22 Oct to payment update with splits
RecurringExpenseUpdate.model_rebuild()
RecurringExpenseCreate.model_rebuild() 

class ExpenseSplit(ExpenseSplitBase):
    id: int
    expense_id: int
    amount: int
    share_type: str
    
    class Config:
        from_attributes = True
class ExpenseCreateWithSplits(ExpenseCreate):
    splits: List[ExpenseSplitCreate]
    split_type: str = "equal"
    date: Optional[date] = None #test 23 oct

class ExpenseWithSplits(Expense):
    splits: List[ExpenseSplit] = []
    split_type: str


# ----------- Payment Schemas -----------
class PaymentBase(BaseModel):
    from_user_id: int  
    to_user_id: int   
    amount: int
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
    balance: int  # positive means owe money to others, negative means gets money from others

class ExpenseBalance(BaseModel):
    expense: Expense
    balances: Dict[int, int]  # user_id -> balance

class SettlementTransaction(BaseModel):
    from_user_id: int  
    to_user_id: int   
    amount: int

class BalanceSummary(BaseModel):
    detailed_balance: List[UserBalance]
    simplified_transactions: List[SettlementTransaction]
    

# ************************************************************************ # 
# ----------- Audit Log Schemas -----------
class AuditLog(BaseModel):
    id: int
    group_id: int
    user_id: int
    timestamp: datetime
    action: str
    details: Optional[dict] = None

    class Config:
        from_attributes = True
