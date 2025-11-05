from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, Group, GroupMember
from .auth import get_current_user

# 数据库依赖
DatabaseDependency = Session

# 用户相关依赖
UserDependency = User

def get_current_user_dependency(current_user: User = Depends(get_current_user)) -> User:
    """获取当前用户依赖"""
    return current_user

def get_current_active_user_dependency(current_user: User = Depends(get_current_user)) -> User:
    """获取当前活跃用户依赖"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

def get_current_verified_user_dependency(current_user: User = Depends(get_current_user)) -> User:
    """获取当前已验证用户依赖"""
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not verified"
        )
    return current_user

# 群组相关依赖
def get_group_dependency(group_id: int, db: Session = Depends(get_db)) -> Group:
    """获取群组依赖"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    if not group.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group is inactive"
        )
    return group

def get_group_with_access_dependency(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Group:
    """获取有访问权限的群组依赖"""
    group = get_group_dependency(group_id, db)
    
    # 检查用户是否是群组成员
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this group"
        )
    
    return group

def get_group_admin_dependency(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Group:
    """获取群组管理员权限的群组依赖"""
    group = get_group_with_access_dependency(group_id, current_user, db)
    
    # 检查用户是否是群组管理员
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.role == "admin",
        GroupMember.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return group

# 成员相关依赖
def get_group_member_dependency(
    member_id: int,
    group_id: int,
    db: Session = Depends(get_db)
) -> GroupMember:
    """获取群组成员依赖"""
    member = db.query(GroupMember).filter(
        GroupMember.id == member_id,
        GroupMember.group_id == group_id,
        GroupMember.is_active == True
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group member not found"
        )
    
    return member

def get_group_member_with_admin_dependency(
    member_id: int,
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> GroupMember:
    """获取群组管理员权限的成员依赖"""
    member = get_group_member_dependency(member_id, group_id, db)
    
    # 检查当前用户是否是群组管理员
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.role == "admin",
        GroupMember.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return member

# 费用相关依赖
def get_expense_dependency(
    expense_id: int,
    group_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """获取费用依赖"""
    from .models import Expense
    
    query = db.query(Expense).filter(Expense.id == expense_id)
    
    if group_id:
        query = query.filter(Expense.group_id == group_id)
    
    expense = query.first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    if not expense.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expense is inactive"
        )
    
    return expense

def get_expense_with_access_dependency(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取有访问权限的费用依赖"""
    expense = get_expense_dependency(expense_id, db=db)
    
    # 检查用户是否是费用所属群组成员
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == expense.group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this expense"
        )
    
    return expense

def get_expense_with_admin_or_owner_dependency(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取有管理员或所有者权限的费用依赖"""
    expense = get_expense_with_access_dependency(expense_id, current_user, db)
    
    # 检查用户是否是费用付款人或群组管理员
    is_owner = expense.payer_id == current_user.id
    
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == expense.group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.role == "admin",
        GroupMember.is_active == True
    ).first()
    
    is_admin = membership is not None
    
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or owner access required"
        )
    
    return expense

# 支付相关依赖
def get_payment_dependency(
    payment_id: int,
    group_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """获取支付依赖"""
    from .models import Payment
    
    query = db.query(Payment).filter(Payment.id == payment_id)
    
    if group_id:
        query = query.filter(Payment.group_id == group_id)
    
    payment = query.first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    return payment

def get_payment_with_access_dependency(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取有访问权限的支付依赖"""
    payment = get_payment_dependency(payment_id, db=db)
    
    # 检查用户是否是支付所属群组成员
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == payment.group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this payment"
        )
    
    return payment

def get_payment_with_admin_or_owner_dependency(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取有管理员或所有者权限的支付依赖"""
    payment = get_payment_with_access_dependency(payment_id, current_user, db)
    
    # 检查用户是否是支付付款人或群组管理员
    is_owner = payment.payer_id == current_user.id
    
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == payment.group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.role == "admin",
        GroupMember.is_active == True
    ).first()
    
    is_admin = membership is not None
    
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or owner access required"
        )
    
    return payment

# 定期费用相关依赖
def get_recurring_expense_dependency(
    recurring_id: int,
    group_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """获取定期费用依赖"""
    from .models import RecurringExpense
    
    query = db.query(RecurringExpense).filter(RecurringExpense.id == recurring_id)
    
    if group_id:
        query = query.filter(RecurringExpense.group_id == group_id)
    
    recurring = query.first()
    
    if not recurring:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring expense not found"
        )
    
    if not recurring.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recurring expense is inactive"
        )
    
    return recurring

def get_recurring_expense_with_access_dependency(
    recurring_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取有访问权限的定期费用依赖"""
    recurring = get_recurring_expense_dependency(recurring_id, db=db)
    
    # 检查用户是否是定期费用所属群组成员
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == recurring.group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.is_active == True
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this recurring expense"
        )
    
    return recurring

def get_recurring_expense_with_admin_or_creator_dependency(
    recurring_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取有管理员或创建者权限的定期费用依赖"""
    recurring = get_recurring_expense_with_access_dependency(recurring_id, current_user, db)
    
    # 检查用户是否是定期费用创建者或群组管理员
    is_creator = recurring.created_by_id == current_user.id
    
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == recurring.group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.role == "admin",
        GroupMember.is_active == True
    ).first()
    
    is_admin = membership is not None
    
    if not (is_creator or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or creator access required"
        )
    
    return recurring

# 邀请相关依赖
def get_invitation_dependency(invitation_id: int, db: Session = Depends(get_db)):
    """获取邀请依赖"""
    from .models import GroupInvitation
    
    invitation = db.query(GroupInvitation).filter(GroupInvitation.id == invitation_id).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    # 检查邀请是否过期
    from datetime import datetime
    if invitation.expires_at <= datetime.now() and invitation.status == "pending":
        invitation.status = "expired"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired"
        )
    
    return invitation

def get_invitation_for_current_user_dependency(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取属于当前用户的邀请依赖"""
    invitation = get_invitation_dependency(invitation_id, db)
    
    if invitation.email != current_user.email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation does not belong to the current user"
        )
    
    return invitation

# 权限检查辅助函数
def check_group_access(db: Session, user_id: int, group_id: int) -> bool:
    """检查用户是否有群组访问权限"""
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
        GroupMember.is_active == True
    ).first()
    return membership is not None

def check_group_admin(db: Session, user_id: int, group_id: int) -> bool:
    """检查用户是否为群组管理员"""
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
        GroupMember.role == "admin",
        GroupMember.is_active == True
    ).first()
    return membership is not None