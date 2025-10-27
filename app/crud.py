from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from sqlalchemy import insert, delete
from passlib.context import CryptContext
from typing import Optional, List, Dict, Set, Any
from collections import defaultdict
from sqlalchemy import func
from decimal import Decimal
import logging
import json
from datetime import date, datetime, timedelta 
from dateutil.relativedelta import relativedelta 
from app import models, schemas, auth
from fastapi.encoders import jsonable_encoder 


# ----------- User CRUD -----------
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email, username=user.username, hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email=email)
    if not user:
        return None

    if not auth.verify_password(password, user.hashed_password):
        return None

    return user


# ----------- Expense Group CRUD -----------


def create_group(db: Session, group: schemas.GroupCreate, admin_id: int):
    """
    Creates a new group and automatically adds the creator as the admin member.
    """
    db_group = models.Group(
        name=group.name,
        description=group.description,
        admin_id=admin_id,
    )
    db.add(db_group)
    db.flush()

    # 2. Add the creator as the admin member
    db_member = models.GroupMember(
        group_id=db_group.id,
        user_id=admin_id,
        is_admin=True,
        nickname="Admin",
        remarks="Created the group",
    )
    db.add(db_member)
    db.flush()
    db.commit()
    db.refresh(db_group)
    return db_group


def get_user_groups(db: Session, user_id: int):
    """creator of group"""
    return (
        db.query(models.Group)
        .join(models.GroupMember)
        .filter(models.Group.admin_id == user_id)
        .all()
    )


def get_group_by_id(db: Session, group_id: int):
    return db.query(models.Group).filter(models.Group.id == group_id).first()


def update_group(db: Session, group_id: int, group_update: schemas.GroupUpdate):
    db_group = get_group_by_id(db, group_id)
    if not db_group:
        return None
    for key, value in group_update.dict(exclude_unset=True).items():
        setattr(db_group, key, value)
    db.commit()
    db.refresh(db_group)
    return db_group


def delete_group(db: Session, group_id: int):
    db_group = get_group_by_id(db, group_id)
    if db_group:
        db.delete(db_group)
        db.commit()


# ---------- Group Member CRUD -----------


def get_group_member(db: Session, group_id: int, user_id: int):
    """Return a specific member in a group"""
    return (
        db.query(models.GroupMember)
        .filter(
            models.GroupMember.group_id == group_id,
            models.GroupMember.user_id == user_id,
        )
        .first()
    )


def get_group_members(db: Session, group_id: int):
    """Return all members in a group"""
    return (
        db.query(models.GroupMember)
        .filter(models.GroupMember.group_id == group_id)
        .all()
    )


def add_group_member(
    db: Session, group_id: int, user_id: int, inviter_username: str | None = None
):
    existing = get_group_member(db, group_id, user_id)
    if existing:
        return None

    remarks = None
    if inviter_username:
        remarks = f"Invited by {inviter_username} at {datetime.utcnow().strftime('%Y-%m-%d ')} "

    new_member = models.GroupMember(
        group_id=group_id, user_id=user_id, is_admin=False, remarks=remarks
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member


def remove_group_member(db: Session, group_id: int, user_id: int):
    member = get_group_member(db, group_id, user_id)
    if not member:
        return False
    db.delete(member)
    db.commit()
    return True

def update_group_member_nickname(
    db: Session, group_id: int, user_id: int, nickname_update: schemas.GroupMemberUpdate
):
    """Update a group member's nickname."""
    member = get_group_member(db, group_id, user_id)
    if not member:
        return None

    if nickname_update.nickname is not None:
        member.nickname = nickname_update.nickname

    db.commit()
    db.refresh(member)
    return member

def update_group_member_admin_status(
    db: Session,
    group_id: int,
    user_id: int,
    admin_update: schemas.GroupMemberAdminUpdate,
):
    member = get_group_member(db, group_id, user_id)
    if not member:
        return None
    member.is_admin = admin_update.is_admin
    db.commit()
    db.refresh(member)
    return member


def append_member_remarks(db: Session, group_id: int, user_id: int, note: str):
    """Append text to a member's remarks"""
    member = get_group_member(db, group_id, user_id)
    if not member:
        return None

    existing = member.remarks or ""
    if existing and not existing.endswith(" "):
        existing += " "
    member.remarks = existing + note

    db.commit()
    db.refresh(member)
    return member

# ----------- Expense CRUD (US7, US9) -----------
def _create_splits(db: Session, expense: models.Expense, splits_in: List[schemas.ExpenseSplitCreate], split_type: str):
    """
    Internal helper function to create expense splits for a given expense.
    This is re-used by both create_expense and update_expense.
    """
    db_splits = []
    if split_type == "equal":
        member_count = len(splits_in)
        if member_count == 0:
            raise ValueError("No members specified for equal split")
        
        equal_amount = round(expense.amount / member_count, 2)
        
        total = 0.0
        for i, split in enumerate(splits_in):
            # Handle rounding errors on the last person
            if i == member_count - 1:
                amount = round(expense.amount - total, 2)
            else:
                amount = equal_amount
                total = round(total + amount, 2)
            
            db_split = models.ExpenseSplit(
                expense_id=expense.id,
                user_id=split.user_id,
                amount=amount,
                balance=amount,  # initial balance equals split amount
                share_type="equal"
            )
            db.add(db_split)
            db_splits.append(db_split)
    
    elif split_type == "custom":
        for split in splits_in:
            if split.amount is None:
                # This should be validated in main.py, but we double-check here
                raise ValueError(f"Amount is required for user {split.user_id} in custom split")
                
            db_split = models.ExpenseSplit(
                expense_id=expense.id,
                user_id=split.user_id,
                amount=split.amount,
                balance=split.amount,  
                share_type="custom"
            )
            db.add(db_split)
            db_splits.append(db_split)
    
    return db_splits


def create_expense(db: Session, group_id: int, creator_id: int, expense: schemas.ExpenseCreateWithSplits) -> Dict:
    """Create a new expense and its splits within a group."""
    
    # 1. Create the base expense object
    db_expense = models.Expense(
        description=expense.description,
        amount=expense.amount,
        payer_id=expense.payer_id,
        date=expense.date if expense.date else date.today(),
        group_id=group_id,
        creator_id=creator_id,
        split_type=expense.split_type  # Save the split type
    )
    db.add(db_expense)
    db.flush() 

    # 2. Create the splits using the helper function
    try:
        db_splits = _create_splits(
            db=db,
            expense=db_expense,
            splits_in=expense.splits,
            split_type=expense.split_type
        )
    except ValueError as e:
        db.rollback() # Rollback if split creation fails
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    calculated_splits_for_log = []
    for split_obj in db_splits:
        split_dict = jsonable_encoder(split_obj)
        calculated_splits_for_log.append(split_dict)

    audit_details = {
        "expense_id": db_expense.id,
        "new_value": jsonable_encoder(expense), # 保留原始输入
        "calculated_splits": calculated_splits_for_log # 使用不含 balance 的新列表
    }

    create_audit_log(
        db=db,
        group_id=group_id,
        user_id=creator_id,
        action="CREATE_EXPENSE",
    )

    db.commit()
    db.refresh(db_expense)
    

    return {
        "expense": db_expense,
        "splits": db_splits
    }

def get_expense_by_id(db: Session, expense_id: int) -> Optional[models.Expense]:
    """Get a single expense by its ID."""
    return db.query(models.Expense).filter(models.Expense.id == expense_id).first()


def get_group_expenses(db: Session, group_id: int) -> List[models.Expense]:
    """Get all expenses for a given group."""
    return db.query(models.Expense).filter(models.Expense.group_id == group_id).all()


def update_expense(db: Session, expense_id: int, expense_update: schemas.ExpenseUpdate, user_id: int) -> Optional[models.Expense]:
    """Update an existing expense."""
    db_expense = get_expense_by_id(db, expense_id)
    if not db_expense:
        return None
    
    old_value = jsonable_encoder(db_expense)  # For audit log
    update_data = expense_update.dict(exclude_unset=True)
    

    if "splits" in update_data:
        db.query(models.ExpenseSplit).filter(
            models.ExpenseSplit.expense_id == expense_id
        ).delete(synchronize_session=False)
        
        if "amount" in update_data:
            db_expense.amount = update_data["amount"]
            
        _create_splits(
            db=db,
            expense=db_expense,
            splits_in=expense_update.splits,
            split_type=expense_update.split_type
        )
        
        db_expense.split_type = expense_update.split_type
        
        del update_data["splits"]
        if "split_type" in update_data:
            del update_data["split_type"]
   

    for key, value in update_data.items():
        setattr(db_expense, key, value)

    create_audit_log(
        db=db,
        group_id=db_expense.group_id,
        user_id=user_id,
        action="UPDATE_EXPENSE",
        details={"expense_id": expense_id, "old_value": old_value, "new_value": jsonable_encoder(expense_update)}
    )
       
    db.commit()
    db.refresh(db_expense)
    return db_expense


def delete_expense(db: Session, expense_id: int, user_id: int) -> bool:
    """Delete an expense."""
    db_expense = get_expense_by_id(db, expense_id)
    if not db_expense:
        return False
    group_id = db_expense.group_id
    deleted_value = jsonable_encoder(db_expense)

    create_audit_log(
        db=db,
        group_id=db_expense.group_id,
        user_id=user_id,
        action="DELETE_EXPENSE",
        details={"expense_id": expense_id, "deleted_value": jsonable_encoder(db_expense)}
    )

    db.delete(db_expense)
    db.commit()
    return True


# ----------- Recurring Expense CRUD (US8) -----------
def _calculate_splits_for_template(total_amount: float, splits_in: List[schemas.ExpenseSplitCreate], split_type: str) -> List[Dict]:
    
    splits_data = []
    
    if split_type == "equal":
        member_count = len(splits_in)
        if member_count == 0:
            raise ValueError("No members specified for equal split")
        
        equal_amount = round(total_amount / member_count, 2)
        total = 0.0
        
        for i, split in enumerate(splits_in):
            split_dict = jsonable_encoder(split) 
            
            # 最后一个用户承担精度差异 (找平逻辑)
            if i == member_count - 1:
                amount = round(total_amount - total, 2)
            else:
                amount = equal_amount
                total = round(total + amount, 2)
            
            split_dict["amount"] = amount
            splits_data.append(split_dict)
            
    # ... handle custom split if necessary ...
    else:
        splits_data = jsonable_encoder(splits_in)
        
    return splits_data

def create_recurring_expense(db: Session, group_id: int, creator_id: int, recurring_expense: schemas.RecurringExpenseCreate) -> models.RecurringExpense:
    """Create a new recurring expense."""
    splits_definition_json = jsonable_encoder(recurring_expense.splits)
    
    db_recurring_expense = models.RecurringExpense(
        description=recurring_expense.description,
        amount=recurring_expense.amount,
        frequency=recurring_expense.frequency,
        start_date=recurring_expense.start_date,
        payer_id=recurring_expense.payer_id,
        split_type=recurring_expense.split_type, 
        splits_definition=splits_definition_json, 
        group_id=group_id,
        creator_id=creator_id,
        next_due_date=recurring_expense.start_date
    )
    db.add(db_recurring_expense)
    db.flush() # To get the ID before commit for audit log

    create_audit_log(
        db=db,
        group_id=group_id,
        user_id=creator_id,
        action="CREATE_RECURRING_EXPENSE_TEMPLATE",
        details={"recurring_expense_id": db_recurring_expense.id, "new_value": jsonable_encoder(recurring_expense)}
    )
    db.commit()
    db.refresh(db_recurring_expense)
    return db_recurring_expense

def get_recurring_expense_by_id(db: Session, recurring_expense_id: int) -> Optional[models.RecurringExpense]:
    """Get a single recurring expense by its ID."""
    return db.query(models.RecurringExpense).filter(models.RecurringExpense.id == recurring_expense_id).first()


def get_group_recurring_expenses(db: Session, group_id: int) -> List[models.RecurringExpense]:
    """Get all recurring expenses for a group."""
    return db.query(models.RecurringExpense).filter(models.RecurringExpense.group_id == group_id).all()


def update_recurring_expense(db: Session, recurring_expense_id: int, expense_update: schemas.RecurringExpenseUpdate, user_id: int) -> Optional[models.RecurringExpense]:
    """Update a recurring expense."""
    db_expense = get_recurring_expense_by_id(db, recurring_expense_id)
    if not db_expense:
        return None
    
    old_value = jsonable_encoder(db_expense)

    update_data = expense_update.dict(exclude_unset=True)

 
    if "splits" in update_data and update_data["splits"] is not None:
        db_expense.splits_definition = jsonable_encoder(expense_update.splits)
        del update_data["splits"]
        

    if "split_type" in update_data and update_data["split_type"] is not None:
         db_expense.split_type = update_data["split_type"]
         del update_data["split_type"]

    for key, value in update_data.items():
        setattr(db_expense, key, value)

    create_audit_log(
        db=db,
        group_id=db_expense.group_id,
        user_id=user_id,
        action="UPDATE_RECURRING_EXPENSE_TEMPLATE",
        details={"recurring_expense_id": recurring_expense_id, "old_value": old_value, "new_value": jsonable_encoder(expense_update)}
    )
       
    db.commit()
    db.refresh(db_expense)
    return db_expense


def delete_recurring_expense(db: Session, recurring_expense_id: int, user_id:int) -> bool:
    """Deletes a recurring expense definition."""
    db_expense = get_recurring_expense_by_id(db, recurring_expense_id)
    if not db_expense:
        return False
    group_id = db_expense.group_id
    deleted_value = jsonable_encoder(db_expense)
    
    db.delete(db_expense)

    create_audit_log(
    db=db,
    group_id=group_id,
    user_id=user_id,
    action="DELETE_RECURRING_EXPENSE_TEMPLATE",
    details={"recurring_expense_id": recurring_expense_id, "deleted_value": deleted_value} # 使用之前捕获的 deleted_value
)
    db.commit()
    return True

# ----------- NEW FUNCTIONS FOR AUTO-TRIGGER 23 oct-----------

def _calculate_next_due_date(current_due_date: date, frequency: str) -> date:
    """Helper to calculate the next due date based on frequency."""
    if frequency == 'daily':
        return current_due_date + relativedelta(days=1)
    if frequency == 'weekly':
        return current_due_date + relativedelta(weeks=1)
    if frequency == 'monthly':
        return current_due_date + relativedelta(months=1)
    
    # Add other frequencies if you plan to support them (e.g., 'yearly')
    
    # As a fallback, default to daily if frequency is unknown
    logging.warning(f"Unknown frequency '{frequency}', defaulting to daily.")
    return current_due_date + relativedelta(days=1)


def process_due_recurring_expenses(db: Session):
    """
    Finds and processes all due recurring expenses.
    
    This function is designed to be called by a scheduler.
    """
    today = date.today()
    
    # Find all active expenses that are due
    due_expenses = db.query(models.RecurringExpense).filter(
        models.RecurringExpense.is_active == True,
        models.RecurringExpense.next_due_date <= today
    ).all()
    
    if not due_expenses:
        logging.info("Scheduler: No due recurring expenses found.")
        return

    logging.info(f"Scheduler: Found {len(due_expenses)} due recurring expenses.")

    for expense in due_expenses:
        # This loop handles cases where the server was down.
        # If an expense is 3 days overdue, it will run 3 times.
        while expense.is_active and expense.next_due_date <= today:
            
            # Use a nested try-block to process each instance.
            # If one instance fails, we log it, rollback, and break
            # from the inner loop to avoid an infinite failure loop.
            try:
                expense_due_date = expense.next_due_date
                
                # 1. Re-create the splits list from the stored JSON definition
                if not expense.splits_definition:
                     logging.error(f"Skipping recurring_id {expense.id}: splits_definition is missing.")
                     break # Stop processing this expense

                splits_in = [schemas.ExpenseSplitCreate(**split_data) for split_data in expense.splits_definition]

                # 2. Create the schema for the new standard expense
                new_expense_data = schemas.ExpenseCreateWithSplits(
                    description=f"{expense.description} (Recurring)",
                    amount=expense.amount,
                    payer_id=expense.payer_id,
                    date=None,  # Use the date it was due
                    splits=splits_in,
                    split_type=expense.split_type
                )
                
                # 3. Call your existing create_expense function
                # This will also create the audit log entry
                logging.info(f"Scheduler: Creating new expense for recurring_id {expense.id} on date {expense_due_date}")
                create_expense(
                    db=db,
                    group_id=expense.group_id,
                    creator_id=expense.creator_id, # Use the original creator
                    expense=new_expense_data
                )
                
                # 4. If creation was successful, update the next_due_date
                expense.next_due_date = _calculate_next_due_date(
                    expense.next_due_date, 
                    expense.frequency
                )
                
                # Commit after each successful instance
                db.commit()

            except Exception as e:
                logging.error(f"Scheduler: Failed to create expense from recurring_id {expense.id}. Error: {e}")
                db.rollback()
                # Break from the 'while' loop to prevent infinite loops on a failing item.
                # It will be retried on the next scheduler run.
                break

# ----------- END OF NEW FUNCTIONS -----------


# # ******************** add func for expense split ******************************* # 
def get_expense_splits(db: Session, expense_id: int):
    return db.query(models.ExpenseSplit).filter(
        models.ExpenseSplit.expense_id == expense_id
    ).all()

# ----------- Payment CRUD -----------

def check_member_in_expense(db: Session, expense_id: int, user_id: int) -> bool:
    return db.query(models.ExpenseSplit).filter(
        models.ExpenseSplit.expense_id == expense_id,
        models.ExpenseSplit.user_id == user_id  
    ).first() is not None

def create_payment(
    db: Session, 
    expense_id: int,
    creator_id: int,
    payment: schemas.PaymentCreate
) -> models.Payment:
 
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise ValueError(f"Expense {expense_id} not found")
    
    from_user_member = get_group_member_by_user_id(db, expense.group_id, payment.from_user_id)
    to_user_member = get_group_member_by_user_id(db, expense.group_id, payment.to_user_id)
    
    if not from_user_member:
        raise ValueError(f"User {payment.from_user_id} is not a member of group {expense.group_id}")
    if not to_user_member:
        raise ValueError(f"User {payment.to_user_id} is not a member of group {expense.group_id}")
    
    # Check if the payment amount is valid
    if payment.amount <= 0:
        raise ValueError("Payment amount must be positive")
    
    current_time = datetime.now()
    
    db_payment = models.Payment(
        expense_id=expense_id,
        from_user_id=payment.from_user_id,
        to_user_id=payment.to_user_id,
        amount=payment.amount,
        description=payment.description,
        payment_date=current_time,
        creator_id=creator_id
    )
    
    db.add(db_payment)
    db.flush()  
 
    create_audit_log(
        db=db,
        group_id=expense.group_id,
        user_id=creator_id,
        action="CREATE_PAYMENT",
        details={
            "expense_id": expense_id,
            "payment_id": db_payment.id,
            "from_user_id": payment.from_user_id,
            "to_user_id": payment.to_user_id,
            "amount": payment.amount,
          
        }
    )
    
    db.commit()
    db.refresh(db_payment)
    return db_payment

def get_payment(db: Session, payment_id: int) -> Optional[models.Payment]:
    """Single payment"""
    return db.query(models.Payment).filter(models.Payment.id == payment_id).first()

def get_expense_payments(db: Session, expense_id: int) -> List[models.Payment]:
    """All payments for an expense"""
    return db.query(models.Payment).filter(models.Payment.expense_id == expense_id).all()

def get_user_payments(db: Session, user_id: int) -> List[models.Payment]:
    """All payments for a user"""
    return db.query(models.Payment).filter(
        (models.Payment.from_user_id == user_id) | 
        (models.Payment.to_user_id == user_id)
    ).all()

def update_payment(
    db: Session,
    payment_id: int,
    payment_update: schemas.PaymentUpdate,
    current_user_id: int,
    is_admin: bool = False
) -> models.Payment:
    """Update a payment"""
    payment = get_payment(db, payment_id)
    if not payment:
        raise ValueError(f"Payment {payment_id} not found")
    

    if payment.creator_id != current_user_id and not is_admin:
        raise ValueError("Only payment creator or group admin can update payment")

    if payment_update.amount is not None and payment_update.amount <= 0:
        raise ValueError("Payment amount must be positive")
    
    old_values = {
        "from_user_id": payment.from_user_id,
        "to_user_id": payment.to_user_id,
        "amount": payment.amount,
        "description": payment.description,
        "payment_date": payment.payment_date
    }
    
    update_data = payment_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(payment, field, value)
    # add by sunzhe 22 oct
    if 'payment_date' not in update_data:
        payment.payment_date = date.today()   

    db.flush()
    create_audit_log(
        db=db,
        group_id=payment.expense.group_id,
        user_id=current_user_id,
        action="UPDATE_PAYMENT",
        details={
            "payment_id": payment_id,
            "expense_id": payment.expense_id,
            "old_values": old_values,
            "new_values": jsonable_encoder(payment_update)
        }
    )
    ## end of add by sunzhe 22 oct
    db.commit()
    db.refresh(payment)
    
    return payment

def delete_payment(db: Session, payment_id: int, current_user_id: int) -> bool:
  
    payment = get_payment(db, payment_id)
    if not payment:
        raise ValueError(f"Payment {payment_id} not found")
    
    group_member = get_group_member_by_user_id(db, payment.expense.group_id, current_user_id)
    if not group_member:
        raise ValueError("You are not a member of this group")
    
    if payment.creator_id != current_user_id and not group_member.is_admin:
        raise ValueError("Only payment creator or group admin can delete payment")
    
    expense_id = payment.expense_id
    from_user_id = payment.from_user_id
    to_user_id = payment.to_user_id

    group_id = payment.expense.group_id
    deleted_value_details = {
            "payment_id": payment_id,
            "expense_id": payment.expense_id,
            "from_user_id": payment.from_user_id,
            "to_user_id": payment.to_user_id,
            "amount": payment.amount
        }

    
    db.delete(payment)

    create_audit_log(
        db=db,
        group_id=group_id,
        user_id=current_user_id,
        action="DELETE_PAYMENT",
        details=deleted_value_details
    )
    
    db.commit()
    
    return True

def get_group_member_by_user_id(db: Session, group_id: int, user_id: int) -> Optional[models.GroupMember]:
  
    return db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == user_id
    ).first()


def calculate_expense_balance(db: Session, expense_id: int, user_id: int) -> float:

    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise ValueError("Expense not found")
    
    expense_split = db.query(models.ExpenseSplit).filter(
        models.ExpenseSplit.expense_id == expense_id,
        models.ExpenseSplit.user_id == user_id
    ).first()
    
    if not expense_split:
        return 0.0
    
    if expense.payer_id == user_id:
        base_balance = expense.amount - expense_split.amount
    else:
        base_balance = -expense_split.amount
    
    payments_received = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.expense_id == expense_id,
        models.Payment.to_user_id == user_id
    ).scalar() or 0.0
    
    payments_made = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.expense_id == expense_id,
        models.Payment.from_user_id == user_id
    ).scalar() or 0.0
    
    final_balance = base_balance - payments_received + payments_made  
    return final_balance
# ************************************************************************ # 

# ----------- Audit Log CRUD -----------

def create_audit_log(db: Session, *, group_id: int, user_id: int, action: str, details: dict = None):
    """Helper function to create an audit log entry."""
    log_entry = models.AuditLog(
        group_id=group_id,
        user_id=user_id,
        action=action,
        details=details
    )
    db.add(log_entry)
    return log_entry

def get_audit_logs(db: Session, group_id: int):
    """Retrieve all audit logs for a specific group, ordered by most recent."""
    return db.query(models.AuditLog).filter(models.AuditLog.group_id == group_id).order_by(models.AuditLog.timestamp.desc()).all()

