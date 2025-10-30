from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    ForeignKey,
    DateTime,
    Integer,
    Table,
    Enum,
    Date,
    Text,
    func,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy import JSON 
from datetime import date, datetime
import enum # add for iter2 28 Oct

class InvitationStatus(enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)

    groups_created = relationship("Group", back_populates="admin")  # groups created by this user
    memberships = relationship("GroupMember", back_populates="user", cascade="all, delete-orphan")  # groups joined by this user
    
    # * add for payment
    payments_made = relationship("Payment", foreign_keys="Payment.from_user_id", back_populates="from_user")
    payments_received = relationship("Payment", foreign_keys="Payment.to_user_id", back_populates="to_user")
    sent_invitations = relationship("GroupInvitation", foreign_keys="GroupInvitation.inviter_id", back_populates="inviter")
    received_invitations = relationship("GroupInvitation", foreign_keys="GroupInvitation.invitee_id", back_populates="invitee")


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # creator of group

    admin = relationship("User", back_populates="groups_created")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    invitations = relationship("GroupInvitation", back_populates="group", cascade="all, delete-orphan")

   


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    is_admin = Column(Boolean, default=False)
    nickname = Column(String, nullable=True)
    remarks = Column(Text)  # default record when user join the group and who invite them

    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="memberships")
    __table_args__ = (UniqueConstraint('group_id', 'user_id', name='_group_user_uc'),)


class GroupInvitation(Base):
    __tablename__ = "group_invitations"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    inviter_id = Column(Integer, ForeignKey("users.id"), nullable=False)  
    invitee_id = Column(Integer, ForeignKey("users.id"), nullable=False) 

    status = Column(Enum(InvitationStatus), default=InvitationStatus.PENDING, nullable=False)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    group = relationship("Group", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[inviter_id], back_populates="sent_invitations")
    invitee = relationship("User", foreign_keys=[invitee_id], back_populates="received_invitations")

    __table_args__ = (
        UniqueConstraint('group_id', 'invitee_id', 'status', name='_group_invitee_pending_uc'),
    )


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    amount = Column(Integer, nullable=False)
    date = Column(Date, nullable=False, default=func.current_date())

    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False) # The user who created the expense
    payer_id = Column(Integer, ForeignKey("users.id"), nullable=False) # The user who paid for the expense

    split_type = Column(String, default="equal") # add by sunzhe for payment update 22 oct
    
    image_url = Column(String, nullable=True)

    group = relationship("Group")
    creator = relationship("User", foreign_keys=[creator_id])
    payer = relationship("User", foreign_keys=[payer_id])

    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan") # * new added line for Expense splits
    payments = relationship("Payment", back_populates="expense", cascade="all, delete-orphan") # * new added line for Expense payments
    


class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    amount = Column(Integer, nullable=False)
    frequency = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    next_due_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)

    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    payer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    split_type = Column(String, nullable=False, default="equal")
    splits_definition = Column(JSON, nullable=True) 
    
    group = relationship("Group")
    creator = relationship("User", foreign_keys=[creator_id])
    payer = relationship("User", foreign_keys=[payer_id])

# ************************************************************************ # 
class ExpenseSplit(Base):
    __tablename__ = "expense_splits"
    
    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    amount = Column(Integer, nullable=False)
    share_type = Column(String, default="equal")

    balance = Column(Integer, nullable=False, default=0.0) 
    last_balance_update = Column(DateTime, default=datetime.utcnow) 

   
    expense = relationship("Expense", back_populates="splits")
    user = relationship("User")
    
   
class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False)
     
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False) 
    
    amount = Column(Integer, nullable=False)
    description = Column(String, nullable=True)
    payment_date = Column(Date, default=date.today)
    created_at = Column(DateTime, default=datetime.now)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    image_url = Column(String, nullable=True)  

    expense = relationship("Expense", back_populates="payments")
    from_user = relationship("User", foreign_keys=[from_user_id], back_populates="payments_made")
    to_user = relationship("User", foreign_keys=[to_user_id], back_populates="payments_received")

    
   
# ************************************************************************ # 

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    action = Column(String, nullable=False)  # e.g., "CREATE_EXPENSE", "UPDATE_EXPENSE"
    details = Column(JSON, nullable=True) # To store old/new values

    user = relationship("User")
    group = relationship("Group")
