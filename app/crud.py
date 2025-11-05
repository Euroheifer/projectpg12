from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, timedelta
import uuid

from .models import *
from .schemas import *
from .auth import get_password_hash

# 用户相关CRUD
def create_user(db: Session, user_data: UserCreate) -> User:
    """创建用户"""
    # 检查邮箱是否已存在
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise ValueError("邮箱已被注册")
    
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        avatar_url=user_data.avatar_url
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """根据ID获取用户"""
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """根据邮箱获取用户"""
    return db.query(User).filter(User.email == email).first()

def update_user(db: Session, user_id: int, user_data: UserUpdate) -> User:
    """更新用户信息"""
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        raise ValueError("用户不存在")
    
    update_data = user_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

# 群组相关CRUD
def create_group(db: Session, group_data: GroupCreate, creator_id: int) -> Group:
    """创建群组"""
    db_group = Group(
        name=group_data.name,
        description=group_data.description,
        created_by_id=creator_id
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    
    # 创建者为群组管理员
    admin_member = GroupMember(
        group_id=db_group.id,
        user_id=creator_id,
        role=GroupRole.ADMIN
    )
    db.add(admin_member)
    db.commit()
    
    return db_group

def get_group(db: Session, group_id: int) -> Optional[Group]:
    """获取群组"""
    return db.query(Group).filter(Group.id == group_id).first()

def get_user_groups(db: Session, user_id: int) -> List[Group]:
    """获取用户的所有群组"""
    return db.query(Group).join(GroupMember).filter(
        GroupMember.user_id == user_id,
        GroupMember.is_active == True,
        Group.is_active == True
    ).order_by(Group.created_at.desc()).all()

def update_group_info(db: Session, group_id: int, group_data: GroupUpdate) -> Group:
    """更新群组信息"""
    db_group = get_group(db, group_id)
    if not db_group:
        raise ValueError("群组不存在")
    
    update_data = group_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_group, field, value)
    
    db.commit()
    db.refresh(db_group)
    return db_group

def delete_group_info(db: Session, group_id: int):
    """删除群组"""
    db_group = get_group(db, group_id)
    if not db_group:
        raise ValueError("群组不存在")
    
    # 软删除
    db_group.is_active = False
    db.commit()

def get_group_members(db: Session, group_id: int) -> List[GroupMember]:
    """获取群组成员"""
    return db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.is_active == True
    ).join(User).all()

def add_group_member(db: Session, group_id: int, user_id: int) -> GroupMember:
    """添加群组成员"""
    # 检查用户是否已在群组中
    existing_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
        GroupMember.is_active == True
    ).first()
    
    if existing_member:
        raise ValueError("用户已在群组中")
    
    db_member = GroupMember(
        group_id=group_id,
        user_id=user_id,
        role=GroupRole.MEMBER
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

def remove_group_member(db: Session, group_id: int, member_id: int):
    """移除群组成员"""
    db_member = db.query(GroupMember).filter(
        GroupMember.id == member_id,
        GroupMember.group_id == group_id,
        GroupMember.is_active == True
    ).first()
    
    if not db_member:
        raise ValueError("成员不存在")
    
    # 软删除
    db_member.is_active = False
    db.commit()

def check_group_access(db: Session, user_id: int, group_id: int) -> bool:
    """检查用户是否有群组访问权限"""
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
        GroupMember.is_active == True
    ).first()
    return member is not None

def check_group_admin(db: Session, user_id: int, group_id: int) -> bool:
    """检查用户是否为群组管理员"""
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
        GroupMember.role == GroupRole.ADMIN,
        GroupMember.is_active == True
    ).first()
    return member is not None

# 费用相关CRUD
def create_expense_in_group(db: Session, group_id: int, expense_data: ExpenseCreate, payer_id: int) -> Expense:
    """在群组中创建费用"""
    # 创建费用记录
    db_expense = Expense(
        group_id=group_id,
        payer_id=payer_id,
        title=expense_data.title,
        description=expense_data.description,
        amount=expense_data.amount,
        category=expense_data.category,
        expense_date=expense_data.expense_date or datetime.now()
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    
    # 创建费用分摊记录
    for user_id, share_amount in expense_data.splits.items():
        db_split = ExpenseSplit(
            expense_id=db_expense.id,
            user_id=user_id,
            share_amount=share_amount
        )
        db.add(db_split)
    
    db.commit()
    db.refresh(db_expense)
    return db_expense

def get_group_expenses(db: Session, group_id: int) -> List[Expense]:
    """获取群组的所有费用"""
    return db.query(Expense).filter(
        Expense.group_id == group_id,
        Expense.is_active == True
    ).order_by(Expense.expense_date.desc()).all()

def get_expense(db: Session, expense_id: int) -> Optional[Expense]:
    """获取费用详情"""
    return db.query(Expense).filter(Expense.id == expense_id, Expense.is_active == True).first()

def update_expense_info(db: Session, expense_id: int, expense_data: ExpenseUpdate, updater_id: int) -> Expense:
    """更新费用信息"""
    db_expense = get_expense(db, expense_id)
    if not db_expense:
        raise ValueError("费用不存在")
    
    update_data = expense_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_expense, field, value)
    
    db.commit()
    db.refresh(db_expense)
    return db_expense

def delete_expense_info(db: Session, expense_id: int):
    """删除费用"""
    db_expense = get_expense(db, expense_id)
    if not db_expense:
        raise ValueError("费用不存在")
    
    # 软删除
    db_expense.is_active = False
    db.commit()

def get_group_balance_summary(db: Session, group_id: int) -> List[Dict[str, Any]]:
    """获取群组余额摘要"""
    members = get_group_members(db, group_id)
    balances = []
    
    for member in members:
        user_id = member.user_id
        
        # 计算用户应付的总金额
        total_payable = db.query(func.sum(ExpenseSplit.share_amount)).join(Expense).filter(
            ExpenseSplit.user_id == user_id,
            Expense.group_id == group_id,
            Expense.is_active == True,
            ExpenseSplit.is_paid == False
        ).scalar() or 0.0
        
        # 计算用户已付的金额
        total_paid = db.query(func.sum(ExpenseSplit.paid_amount)).join(Expense).filter(
            ExpenseSplit.user_id == user_id,
            Expense.group_id == group_id,
            Expense.is_active == True
        ).scalar() or 0.0
        
        # 计算用户应收的金额（作为付款人）
        total_receivable = db.query(func.sum(Expense.amount)).filter(
            Expense.payer_id == user_id,
            Expense.group_id == group_id,
            Expense.is_active == True
        ).scalar() or 0.0
        
        # 计算用户实际应承担的费用
        actual_share = db.query(func.sum(ExpenseSplit.share_amount)).join(Expense).filter(
            ExpenseSplit.user_id == user_id,
            Expense.group_id == group_id,
            Expense.is_active == True
        ).scalar() or 0.0
        
        # 计算净余额
        net_balance = total_receivable - actual_share
        
        balances.append({
            'user_id': user_id,
            'user': member.user,
            'balance': round(net_balance, 2)
        })
    
    return balances

# 支付相关CRUD
def create_payment_record(db: Session, group_id: int, payment_data: PaymentCreate, payer_id: int) -> Payment:
    """创建支付记录"""
    db_payment = Payment(
        group_id=group_id,
        expense_id=payment_data.expense_id,
        payer_id=payer_id,
        receiver_id=payment_data.receiver_id,
        amount=payment_data.amount,
        description=payment_data.description,
        payment_date=payment_data.payment_date or datetime.now()
    )
    db.add(db_payment)
    
    # 如果有关联的费用，更新费用分摊状态
    if payment_data.expense_id:
        expense = get_expense(db, payment_data.expense_id)
        if expense:
            # 更新付款人的费用状态
            split = db.query(ExpenseSplit).filter(
                ExpenseSplit.expense_id == payment_data.expense_id,
                ExpenseSplit.user_id == payer_id
            ).first()
            if split:
                split.paid_amount += payment_data.amount
                if split.paid_amount >= split.share_amount:
                    split.is_paid = True
    
    db.commit()
    db.refresh(db_payment)
    return db_payment

def get_group_payments(db: Session, group_id: int) -> List[Payment]:
    """获取群组的所有支付记录"""
    return db.query(Payment).filter(
        Payment.group_id == group_id
    ).order_by(Payment.payment_date.desc()).all()

def get_payment(db: Session, payment_id: int) -> Optional[Payment]:
    """获取支付记录"""
    return db.query(Payment).filter(Payment.id == payment_id).first()

def delete_payment_record(db: Session, payment_id: int):
    """删除支付记录"""
    db_payment = get_payment(db, payment_id)
    if not db_payment:
        raise ValueError("支付记录不存在")
    
    db.delete(db_payment)
    db.commit()

# 定期费用相关CRUD
def create_recurring_expense_in_group(db: Session, group_id: int, recurring_data: RecurringExpenseCreate, creator_id: int) -> RecurringExpense:
    """在群组中创建定期费用"""
    db_recurring = RecurringExpense(
        group_id=group_id,
        created_by_id=creator_id,
        title=recurring_data.title,
        description=recurring_data.description,
        amount=recurring_data.amount,
        category=recurring_data.category,
        frequency=recurring_data.frequency,
        next_execution_date=recurring_data.next_execution_date
    )
    db.add(db_recurring)
    db.commit()
    db.refresh(db_recurring)
    
    return db_recurring

def get_group_recurring_expenses(db: Session, group_id: int) -> List[RecurringExpense]:
    """获取群组的定期费用"""
    return db.query(RecurringExpense).filter(
        RecurringExpense.group_id == group_id,
        RecurringExpense.is_active == True
    ).all()

def get_recurring_expense(db: Session, recurring_id: int) -> Optional[RecurringExpense]:
    """获取定期费用"""
    return db.query(RecurringExpense).filter(
        RecurringExpense.id == recurring_id,
        RecurringExpense.is_active == True
    ).first()

def delete_recurring_expense_info(db: Session, recurring_id: int):
    """删除定期费用"""
    db_recurring = get_recurring_expense(db, recurring_id)
    if not db_recurring:
        raise ValueError("定期费用不存在")
    
    # 软删除
    db_recurring.is_active = False
    db.commit()

# 邀请相关CRUD
def create_group_invitation(db: Session, group_id: int, invitation_data: GroupInvitationCreate, inviter_id: int) -> GroupInvitation:
    """创建群组邀请"""
    db_invitation = GroupInvitation(
        group_id=group_id,
        email=invitation_data.email,
        invited_by_id=inviter_id,
        expires_at=datetime.now() + timedelta(days=7)  # 7天过期
    )
    db.add(db_invitation)
    db.commit()
    db.refresh(db_invitation)
    return db_invitation

def get_user_group_invitations(db: Session, user_email: str) -> List[GroupInvitation]:
    """获取用户的群组邀请"""
    return db.query(GroupInvitation).filter(
        GroupInvitation.email == user_email,
        GroupInvitation.status == InvitationStatus.PENDING,
        GroupInvitation.expires_at > datetime.now()
    ).order_by(GroupInvitation.created_at.desc()).all()

def get_invitation(db: Session, invitation_id: int) -> Optional[GroupInvitation]:
    """获取邀请"""
    return db.query(GroupInvitation).filter(
        GroupInvitation.id == invitation_id
    ).first()

def accept_group_invitation(db: Session, invitation_id: int, user_id: int):
    """接受群组邀请"""
    invitation = get_invitation(db, invitation_id)
    if not invitation:
        raise ValueError("邀请不存在")
    
    if invitation.status != InvitationStatus.PENDING:
        raise ValueError("邀请已处理")
    
    if invitation.expires_at <= datetime.now():
        raise ValueError("邀请已过期")
    
    # 添加用户到群组
    add_group_member(db, invitation.group_id, user_id)
    
    # 更新邀请状态
    invitation.status = InvitationStatus.ACCEPTED
    invitation.accepted_at = datetime.now()
    
    db.commit()

def reject_group_invitation(db: Session, invitation_id: int):
    """拒绝群组邀请"""
    invitation = get_invitation(db, invitation_id)
    if not invitation:
        raise ValueError("邀请不存在")
    
    invitation.status = InvitationStatus.EXPIRED
    db.commit()

# 统计相关CRUD
def get_user_statistics(db: Session, user_id: int) -> Dict[str, Any]:
    """获取用户统计信息"""
    groups = get_user_groups(db, user_id)
    group_stats = []
    
    total_net_balance = 0
    total_expenses = 0
    total_paid = 0
    total_received = 0
    
    for group in groups:
        group_balances = get_group_balance_summary(db, group.id)
        user_balance = next((b for b in group_balances if b['user_id'] == user_id), None)
        
        # 群组总费用
        group_total = db.query(func.sum(Expense.amount)).filter(
            Expense.group_id == group.id,
            Expense.is_active == True
        ).scalar() or 0.0
        
        if user_balance:
            total_net_balance += user_balance['balance']
            group_stats.append({
                'group': group,
                'total_expenses': group_total,
                'net_balance': user_balance['balance']
            })
        
        # 用户在该群组的费用
        user_expenses = db.query(func.sum(Expense.amount)).filter(
            Expense.payer_id == user_id,
            Expense.group_id == group.id,
            Expense.is_active == True
        ).scalar() or 0.0
        
        total_expenses += user_expenses
        total_paid += db.query(func.sum(Payment.amount)).filter(
            Payment.payer_id == user_id,
            Payment.group_id == group.id
        ).scalar() or 0.0
        
        total_received += db.query(func.sum(Payment.amount)).filter(
            Payment.receiver_id == user_id,
            Payment.group_id == group.id
        ).scalar() or 0.0
    
    return {
        'total_groups': len(groups),
        'total_expenses': total_expenses,
        'total_paid': total_paid,
        'total_received': total_received,
        'net_balance': round(total_net_balance, 2),
        'groups': group_stats
    }