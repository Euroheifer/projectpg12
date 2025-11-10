from fastapi import HTTPException, status, Depends, UploadFile
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import insert, delete
from passlib.context import CryptContext
from typing import Optional, List, Dict, Set, Any
from collections import defaultdict
from sqlalchemy import func
from decimal import Decimal
import logging
import json
import traceback # 导入 traceback
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from app import models, schemas, auth
from fastapi.encoders import jsonable_encoder
# --- for img 03 Nov ------
import uuid  # 🚨 新增：用于生成唯一文件名
import shutil # 🚨 新增：用于将文件流写入磁盘
import os     # 🚨 新增：用于创建文件夹

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
    """Gets all groups a user is a member of."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return []
    # Query groups through the GroupMember association
    return db.query(models.Group).join(models.GroupMember).filter(models.GroupMember.user_id == user_id).all()


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
        .options(joinedload(models.GroupMember.user))  # add by sunzhe 03 Nov for load username
        .all()
    )


def add_group_member(
    db: Session, group_id: int, user_id: int, inviter_username: str | None = None
):
    existing = get_group_member(db, group_id, user_id)
    if existing:
        return None # Return None if already a member

    remarks = None
    timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M')
    if inviter_username:
        remarks = f"Invited by {inviter_username} at {timestamp}"
    else:
        # If added directly by admin, the inviter_username might be None
        group = get_group_by_id(db, group_id)
        admin_username = "Admin" # Default if group or admin not found
        if group and group.admin:
             admin_username = group.admin.username
        remarks = f"Added by {admin_username} at {timestamp}"


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
        existing += "; " # Use semicolon for better separation
    member.remarks = existing + note

    db.commit()
    db.refresh(member)
    return member

# ----------- 邀请 CRUD -----------

def create_group_invitation(
    db: Session,
    group_id: int,
    inviter_id: int,
    invitee_id: int
) -> models.GroupInvitation:
    """
    Creates and stores a new group invitation.
    """
    existing_pending = db.query(models.GroupInvitation).filter(
        models.GroupInvitation.group_id == group_id,
        models.GroupInvitation.invitee_id == invitee_id,
        models.GroupInvitation.status == models.InvitationStatus.PENDING
    ).first()

    if existing_pending:
        return existing_pending

    db_invitation = models.GroupInvitation(
        group_id=group_id,
        inviter_id=inviter_id,
        invitee_id=invitee_id,
        status=models.InvitationStatus.PENDING
    )
    db.add(db_invitation)
    db.commit()
    db.refresh(db_invitation)
    return db_invitation


def get_invitation_by_id(db: Session, invitation_id: int) -> Optional[models.GroupInvitation]:
    """
    Fetches a single invitation by its ID.
    Includes eager loading for related objects needed by response schemas.
    """
    return db.query(models.GroupInvitation).options(
        joinedload(models.GroupInvitation.group),
        joinedload(models.GroupInvitation.inviter),
        joinedload(models.GroupInvitation.invitee)
    ).filter(models.GroupInvitation.id == invitation_id).first()


def get_pending_invitations_for_user(db: Session, user_id: int) -> List[models.GroupInvitation]:
    """
    Gets all PENDING invitations for a specific user.
    Includes eager loading for related objects needed by response schemas.
    """
    return db.query(models.GroupInvitation).options(
        joinedload(models.GroupInvitation.group),
        joinedload(models.GroupInvitation.inviter),
        joinedload(models.GroupInvitation.invitee)
    ).filter(
        models.GroupInvitation.invitee_id == user_id,
        models.GroupInvitation.status == models.InvitationStatus.PENDING
    ).order_by(models.GroupInvitation.created_at.desc()).all()

# -------------------------------------


# ----------- Expense CRUD (US7, US9) -----------
def _create_splits(db: Session, expense: models.Expense, splits_in: List[schemas.ExpenseSplitCreate], split_type: str):
    """
    Internal helper function to create expense splits for a given expense.
    """
    db_splits = []
    expense_amount_cents = expense.amount # amount 现在是整数 (美分)

    if split_type == "equal":
        member_count = len(splits_in)
        if member_count == 0:
            raise ValueError("No members specified for equal split")

        # 使用整数除法
        equal_amount_cents = expense_amount_cents // member_count
        remainder_cents = expense_amount_cents % member_count

        total_cents_allocated = 0

        for i, split in enumerate(splits_in):
            amount_cents = equal_amount_cents
            if i < remainder_cents:
                # 将余下的美分分配给前几个成员
                amount_cents += 1

            total_cents_allocated += amount_cents

            db_split = models.ExpenseSplit(
                expense_id=expense.id,
                user_id=split.user_id,
                amount=amount_cents,
                balance=amount_cents, # 初始余额
                share_type="equal"
            )
            db.add(db_split)
            db_splits.append(db_split)

        if total_cents_allocated != expense_amount_cents:
             # 安全检查，理论上不应发生
             logging.warning(f"Equal split total ({total_cents_allocated}) does not match expense amount ({expense_amount_cents}) for expense {expense.id}")

    elif split_type == "custom":
        total_provided_cents = 0
        for split in splits_in:
            if split.amount is None:
                raise ValueError(f"Amount is required for user {split.user_id} in custom split")

            # amount 现在是整数 (美分)
            split_amount_cents = split.amount
            total_provided_cents += split_amount_cents

            db_split = models.ExpenseSplit(
                expense_id=expense.id,
                user_id=split.user_id,
                amount=split_amount_cents,
                balance=split_amount_cents, # 初始余额
                share_type="custom"
            )
            db.add(db_split)
            db_splits.append(db_split)

        if total_provided_cents != expense_amount_cents:
             logging.error(f"Critical: Custom split sum ({total_provided_cents}) does not match expense amount ({expense_amount_cents}) for expense {expense.id}.")
             raise ValueError("Custom split sum does not match expense amount")

    return db_splits


#def create_expense(db: Session, group_id: int, creator_id: int, expense: schemas.ExpenseCreateWithSplits) -> Dict:
def create_expense(db: Session, group_id: int, creator_id: int, expense: schemas.ExpenseCreateWithSplits, image_file: Optional[UploadFile] = None) -> Dict:
    """Create a new expense and its splits within a group."""
# ---------------------- change date 03 Nov ------------------   
    if expense.date is not None and isinstance(expense.date, str):
        try:
            # 将字符串 "YYYY-MM-DD" 转换为 Python date 对象
            expense_date = datetime.strptime(expense.date, "%Y-%m-%d").date()
        except ValueError:
            # 如果格式错误，则使用今天的日期，或者抛出 HTTP 400 错误
            logging.error(f"Invalid date format received: {expense.date}")
            expense_date = date.today()
    elif expense.date is None:
        expense_date = date.today()
    else:
        # 如果它是 None，或者已经是 date 对象，则直接使用
        expense_date = expense.date
# --------------------- end -----------------------------------#
# ------------- add for img 03 Nov ----------------------------#
# 🚨 新增：文件上传和 URL 处理逻辑
    image_url = None
    if image_file and image_file.filename:
        # 1. 设置存储目录 (app/static/uploads)
        upload_dir = "app/static/uploads"
        os.makedirs(upload_dir, exist_ok=True) # 确保目录存在
        
        # 2. 生成唯一文件名 (保留原始后缀)
        file_extension = os.path.splitext(image_file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_location = os.path.join(upload_dir, unique_filename)

        try:
            # 3. 将文件内容写入磁盘
            with open(file_location, "wb") as file_object:
                shutil.copyfileobj(image_file.file, file_object)
            
            # 4. 设置公共访问 URL (对应 main1.py 中的 app.mount("/static", ...))
            image_url = f"/static/uploads/{unique_filename}"
            logging.info(f"Successfully saved file to: {file_location}")
        except Exception as e:
            logging.error(f"Failed to save uploaded file '{image_file.filename}': {e}")
            image_file.file.close() # 确保关闭文件流
            # 如果文件保存失败，不影响费用创建，但 image_url 为 None
    # 🚨 结束文件上传处理
# -------------------- END -----------------------------------
    db_expense = models.Expense(
        description=expense.description,
        amount=expense.amount,
        payer_id=expense.payer_id,
        #03 nov 
        date=expense_date,
        group_id=group_id,
        creator_id=creator_id,
        split_type=expense.split_type,
        #03 Nov img 
        image_url=image_url
        #image_url=getattr(expense, 'image_url', None)
    )
    db.add(db_expense)
    db.flush() # Get the expense ID

    try:
        db_splits = _create_splits(
            db=db,
            expense=db_expense,
            splits_in=expense.splits,
            split_type=expense.split_type
        )
    except ValueError as e:
        db.rollback()
        # Re-raise as HTTPException for the API layer
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    original_input_log = jsonable_encoder(expense)
    calculated_splits_for_log = [jsonable_encoder(s) for s in db_splits]

    create_audit_log(
        db=db,
        group_id=group_id,
        user_id=creator_id,
        action="CREATE_EXPENSE",
        details={
            "expense_id": db_expense.id,
            "new_value": original_input_log,
            "calculated_splits": calculated_splits_for_log
        }
    )


    db.commit() # Commit all changes together
    db.refresh(db_expense)
    db.refresh(db_expense, attribute_names=['splits'])

    return {
        "expense": db_expense, # Return the committed expense object
        "splits": db_expense.splits # Return the loaded splits relationship
    }

def get_expense_by_id(db: Session, expense_id: int) -> Optional[models.Expense]:
    """Get a single expense by its ID, eager loading splits."""
    return db.query(models.Expense).options(
        joinedload(models.Expense.splits) # Eager load splits relationship
    ).filter(models.Expense.id == expense_id).first()


def get_group_expenses(db: Session, group_id: int) -> List[models.Expense]:
    """Get all expenses for a given group, eager loading splits."""
    return db.query(models.Expense).options(
        joinedload(models.Expense.splits) # Eager load splits relationship
    ).filter(models.Expense.group_id == group_id).order_by(models.Expense.date.desc(), models.Expense.id.desc()).all()


def update_expense(db: Session, expense_id: int, expense_update: schemas.ExpenseUpdate, user_id: int) -> Optional[models.Expense]:
    """Update an existing expense, potentially including splits."""
    db_expense = get_expense_by_id(db, expense_id)
    if not db_expense:
        return None

    # Capture old state BEFORE modification using jsonable_encoder
    old_value = jsonable_encoder(db_expense)

    update_data = expense_update.dict(exclude_unset=True)

    # Flag to check if splits were recalculated
    splits_updated = False

    # Handle splits update BEFORE general setattr loop if splits are provided
    if "splits" in update_data:
        splits_updated = True
        split_type = update_data.get("split_type", db_expense.split_type) # Use new or old
        if not split_type:
             raise HTTPException(status_code=400, detail="split_type is required when updating splits")

        # Determine the total amount for split calculation (new amount or existing)
        new_amount = update_data.get("amount", db_expense.amount)

        # --- Transactional safety for split update ---
        try:
            # Delete existing splits first (within the transaction)
            db.query(models.ExpenseSplit).filter(
                models.ExpenseSplit.expense_id == expense_id
            ).delete(synchronize_session='fetch') # Use 'fetch' or 'evaluate' strategy

            # Update expense amount BEFORE creating new splits if it changed
            if "amount" in update_data:
                 db_expense.amount = new_amount

            # Create new splits using the potentially updated amount
            _create_splits(
                db=db,
                expense=db_expense, # Pass potentially updated expense
                # Ensure input splits are correctly formatted (e.g., from dicts if needed)
                splits_in=[schemas.ExpenseSplitCreate(**s) if isinstance(s, dict) else s for s in update_data["splits"]],
                split_type=split_type
            )

            db_expense.split_type = split_type # Ensure split_type is updated

            # Remove processed fields from update_data
            del update_data["splits"]
            if "split_type" in update_data:
                del update_data["split_type"]
            if "amount" in update_data: # Amount was already set
                del update_data["amount"]

        except ValueError as e:
             db.rollback() # Rollback ONLY the split changes on error
             raise HTTPException(status_code=400, detail=f"Error updating splits: {e}")
        except Exception as e: # Catch other potential errors during split update
             db.rollback()
             logging.error(f"Unexpected error updating splits for expense {expense_id}: {e}")
             raise HTTPException(status_code=500, detail="Internal server error during split update.")
        # --- End Transactional safety ---


    # Apply remaining updates from update_data using setattr
    for key, value in update_data.items():
        setattr(db_expense, key, value)

    # Use jsonable_encoder for the new value in audit log (represents the incoming update request)
    new_value_for_log = jsonable_encoder(expense_update)

    create_audit_log(
        db=db,
        group_id=db_expense.group_id,
        user_id=user_id,
        action="UPDATE_EXPENSE",
        details={"expense_id": expense_id, "old_value": old_value, "new_value": new_value_for_log}
    )

    try:
        db.commit() # Commit all changes (expense fields + potentially new splits + audit log)
    except Exception as e:
        db.rollback()
        logging.error(f"Error committing updates for expense {expense_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save expense updates.")


    db.refresh(db_expense)
    # If splits were updated, explicitly refresh that relationship
    if splits_updated:
        db.refresh(db_expense, attribute_names=['splits'])

    return db_expense


def delete_expense(db: Session, expense_id: int, user_id: int) -> bool:
    """Delete an expense and associated payments/splits."""
    db_expense = get_expense_by_id(db, expense_id) # Should eager load splits
    if not db_expense:
        return False

    group_id = db_expense.group_id
    deleted_value = jsonable_encoder(db_expense) # Capture state including splits

    try:
        create_audit_log(
            db=db,
            group_id=group_id,
            user_id=user_id,
            action="DELETE_EXPENSE",
            details={"expense_id": expense_id, "deleted_value": deleted_value}
        )

        db.query(models.Payment).filter(models.Payment.expense_id == expense_id).delete(synchronize_session='fetch')

        db.delete(db_expense)

        db.commit()
        return True

    except Exception as e:
        db.rollback()
        logging.error(f"Error deleting expense {expense_id}: {e}")
        return False


# ----------- Recurring Expense CRUD (US8) -----------

def create_recurring_expense(db: Session, group_id: int, creator_id: int, recurring_expense: schemas.RecurringExpenseCreate) -> models.RecurringExpense:
    """Create a new recurring expense template."""

    # Ensure splits are stored as plain list of dicts for JSON compatibility
    splits_definition_list = [s.dict() for s in recurring_expense.splits]

    db_recurring_expense = models.RecurringExpense(
        description=recurring_expense.description,
        amount=recurring_expense.amount,
        frequency=recurring_expense.frequency,
        start_date=recurring_expense.start_date,
        payer_id=recurring_expense.payer_id,
        split_type=recurring_expense.split_type,
        splits_definition=splits_definition_list,
        group_id=group_id,
        creator_id=creator_id,
        next_due_date=recurring_expense.start_date # Initial due date is start date
    )
    db.add(db_recurring_expense)
    db.flush() # Get ID for audit log

    create_audit_log(
        db=db,
        group_id=group_id,
        user_id=creator_id,
        action="CREATE_RECURRING_EXPENSE_TEMPLATE",
        # Encode the input schema directly for the log
        details={"recurring_expense_id": db_recurring_expense.id, "new_value": jsonable_encoder(recurring_expense)}
    )
    db.commit()
    db.refresh(db_recurring_expense)
    return db_recurring_expense

def get_recurring_expense_by_id(db: Session, recurring_expense_id: int) -> Optional[models.RecurringExpense]:
    """Get a single recurring expense template by its ID."""
    return db.query(models.RecurringExpense).filter(models.RecurringExpense.id == recurring_expense_id).first()


def get_group_recurring_expenses(db: Session, group_id: int) -> List[models.RecurringExpense]:
    """Get all recurring expense templates for a group."""
    return db.query(models.RecurringExpense).filter(models.RecurringExpense.group_id == group_id).order_by(models.RecurringExpense.start_date.desc()).all()


def update_recurring_expense(db: Session, recurring_expense_id: int, expense_update: schemas.RecurringExpenseUpdate, user_id: int) -> Optional[models.RecurringExpense]:
    """Update a recurring expense template."""
    db_expense = get_recurring_expense_by_id(db, recurring_expense_id)
    if not db_expense:
        return None

    old_value = jsonable_encoder(db_expense)
    update_data = expense_update.dict(exclude_unset=True)

    # Handle 'splits' specifically to store as list of dicts
    if "splits" in update_data and update_data["splits"] is not None:
        db_expense.splits_definition = [s.dict() for s in expense_update.splits]
        del update_data["splits"]

    # Apply other updates using setattr
    for key, value in update_data.items():
        setattr(db_expense, key, value)

    # Recalculate next_due_date ONLY if start_date changed AND the new start_date is in the future
    if 'start_date' in update_data:
        new_start_date = db_expense.start_date
        if isinstance(new_start_date, datetime):
             new_start_date = new_start_date.date()

        if new_start_date > date.today():
             db_expense.next_due_date = new_start_date


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
    """Deletes a recurring expense template."""
    db_expense = get_recurring_expense_by_id(db, recurring_expense_id)
    if not db_expense:
        return False
    group_id = db_expense.group_id
    deleted_value = jsonable_encoder(db_expense)

    db.delete(db_expense)

    # Create log AFTER db.delete() but BEFORE commit
    create_audit_log(
    db=db,
    group_id=group_id,
    user_id=user_id,
    action="DELETE_RECURRING_EXPENSE_TEMPLATE",
    details={"recurring_expense_id": recurring_expense_id, "deleted_value": deleted_value}
    )
    db.commit() # Commit deletion and audit log together
    return True

# ----------- Scheduler Job Function -----------

def _calculate_next_due_date(current_due_date: date, frequency: str) -> date:
    """Helper to calculate the next due date based on frequency."""
    try:
        if frequency == 'daily':
            return current_due_date + relativedelta(days=1)
        elif frequency == 'weekly':
            return current_due_date + relativedelta(weeks=1)
        elif frequency == 'monthly':
            return current_due_date + relativedelta(months=1)
        else:
            logging.warning(f"Unsupported frequency '{frequency}' encountered. Defaulting to daily increment.")
            return current_due_date + relativedelta(days=1)
    except Exception as e:
         logging.error(f"Error calculating next due date for {current_due_date} with frequency {frequency}: {e}")
         return current_due_date + relativedelta(days=1)


def process_due_recurring_expenses(db: Session):
    """
    Finds and processes active recurring expenses due on or before today.
    Creates standard Expense entries. Designed for schedulers.
    """
    today = date.today()
    due_expense_templates = db.query(models.RecurringExpense).filter(
        models.RecurringExpense.is_active == True,
        models.RecurringExpense.next_due_date <= today
    ).all()

    if not due_expense_templates:
        logging.info("Scheduler: No due recurring expenses found.")
        return

    logging.info(f"Scheduler: Found {len(due_expense_templates)} potentially due recurring expense templates.")
    created_count = 0

    for template in due_expense_templates:
        while template.is_active and template.next_due_date <= today:
            instance_due_date = template.next_due_date
            logging.info(f"Scheduler: Processing template_id {template.id} for due date {instance_due_date}")

            try:
                # 1. Validate and prepare splits
                splits_definition = template.splits_definition
                if not splits_definition:
                    logging.error(f"Skipping template_id {template.id} due {instance_due_date}: splits_definition is missing or empty.")
                    break

                if not isinstance(splits_definition, list):
                     logging.error(f"Skipping template_id {template.id} due {instance_due_date}: splits_definition is not a list ({type(splits_definition)}).")
                     break

                try:
                    splits_in = [schemas.ExpenseSplitCreate(**split_data) for split_data in splits_definition]
                except Exception as p_err:
                    logging.error(f"Skipping template_id {template.id} due {instance_due_date}: Error creating splits from definition: {p_err}. Definition: {splits_definition}")
                    break

                # 2. Prepare data for the new Expense
                new_expense_data = schemas.ExpenseCreateWithSplits(
                    description=f"{template.description} (Recurring on {instance_due_date.isoformat()})",
                    amount=template.amount,
                    payer_id=template.payer_id,
                    date=instance_due_date,
                    splits=splits_in,
                    split_type=template.split_type,
                    image_url=None
                )

                # 3. Create the standard Expense
                create_result = create_expense(
                    db=db,
                    group_id=template.group_id,
                    creator_id=template.creator_id,
                    expense=new_expense_data
                )
                new_expense_id = create_result["expense"].id
                logging.info(f"Scheduler: Created Expense {new_expense_id} from template {template.id} for {instance_due_date}")
                created_count += 1

                # 4. Update the next_due_date on the template
                template.next_due_date = _calculate_next_due_date(
                    instance_due_date,
                    template.frequency
                )

                # Commit changes for this instance
                db.commit()

            except HTTPException as http_exc:
                 logging.error(f"Scheduler: HTTP Error creating expense from template {template.id} for {instance_due_date}: {http_exc.detail}")
                 db.rollback()
                 break
            except ValueError as val_err:
                 logging.error(f"Scheduler: Value Error creating expense from template {template.id} for {instance_due_date}: {val_err}")
                 db.rollback()
                 break
            except Exception as e:
                logging.error(f"Scheduler: Unexpected error processing template {template.id} for {instance_due_date}: {e}")
                logging.error(traceback.format_exc())
                db.rollback()
                break
        # End of while loop for a single template

    logging.info(f"Scheduler: Finished run. Created {created_count} new expenses.")

# ----------- END OF SCHEDULER FUNCTION -----------


# # ******************** Expense Split Helper ******************************* #
def get_expense_splits(db: Session, expense_id: int):
    """Gets all splits for a given expense."""
    return db.query(models.ExpenseSplit).filter(
        models.ExpenseSplit.expense_id == expense_id
    ).all()

# ----------- Payment CRUD -----------

def check_member_in_expense(db: Session, expense_id: int, user_id: int) -> bool:
    """Checks if a user was part of an expense's splits."""
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
    """Creates a new payment related to an expense."""
    expense = get_expense_by_id(db, expense_id)
    if not expense:
        raise ValueError(f"Expense {expense_id} not found")

    from_user_member = get_group_member(db, expense.group_id, payment.from_user_id)
    to_user_member = get_group_member(db, expense.group_id, payment.to_user_id)

    if not from_user_member:
        raise ValueError(f"Payer (User {payment.from_user_id}) is not a member of group {expense.group_id}")
    if not to_user_member:
        raise ValueError(f"Payee (User {payment.to_user_id}) is not a member of group {expense.group_id}")

    if payment.amount <= 0:
        raise ValueError("Payment amount must be positive")

    # Use Decimal for amount precision
    payment_amount_dec = Decimal(str(payment.amount)).quantize(Decimal("0.01"))

    db_payment = models.Payment(
        expense_id=expense_id,
        from_user_id=payment.from_user_id,
        to_user_id=payment.to_user_id,
        amount=float(payment_amount_dec), # Store as float
        description=payment.description,
        payment_date=date.today(), # Use date type
        creator_id=creator_id,
        image_url=getattr(payment, 'image_url', None)
    )

    db.add(db_payment)
    db.flush() # Flush to get payment ID

    create_audit_log(
        db=db,
        group_id=expense.group_id,
        user_id=creator_id,
        action="CREATE_PAYMENT",
        details={
            "payment_id": db_payment.id,
            "expense_id": expense_id,
            "from_user_id": payment.from_user_id,
            "to_user_id": payment.to_user_id,
            "amount": float(payment_amount_dec), # Log precise float
            "description": payment.description,
            "image_url": db_payment.image_url
        }
    )

    db.commit()
    db.refresh(db_payment)
    return db_payment

def get_payment(db: Session, payment_id: int) -> Optional[models.Payment]:
    """Gets a single payment by ID, eager loading related expense."""
    return db.query(models.Payment).options(
        joinedload(models.Payment.expense) # Eager load for group check
    ).filter(models.Payment.id == payment_id).first()

def get_expense_payments(db: Session, expense_id: int) -> List[models.Payment]:
    """Gets all payments for a specific expense."""
    return db.query(models.Payment).filter(models.Payment.expense_id == expense_id).order_by(models.Payment.created_at.desc()).all()

def get_user_payments(db: Session, user_id: int) -> List[models.Payment]:
    """Gets all payments made or received by a user across all expenses."""
    return db.query(models.Payment).filter(
        (models.Payment.from_user_id == user_id) |
        (models.Payment.to_user_id == user_id)
    ).order_by(models.Payment.created_at.desc()).all()

def update_payment(
    db: Session,
    payment_id: int,
    payment_update: schemas.PaymentUpdate,
    current_user_id: int,
    is_admin: bool # Get admin status from dependency/API layer
) -> models.Payment:
    """Updates an existing payment."""
    payment = get_payment(db, payment_id) # Should eager load expense
    if not payment:
        raise ValueError(f"Payment {payment_id} not found")

    # Permission check
    if payment.creator_id != current_user_id and not is_admin:
        raise ValueError("Only the payment creator or a group admin can update this payment")

    # Validate amount if provided
    new_amount_float = payment.amount # Default to old amount
    if payment_update.amount is not None:
         if payment_update.amount <= 0:
             raise ValueError("Payment amount must be positive")
         # Use Decimal for precision
         new_amount_dec = Decimal(str(payment_update.amount)).quantize(Decimal("0.01"))
         new_amount_float = float(new_amount_dec)


    # Capture old values BEFORE updating for audit log
    old_values = {
        "from_user_id": payment.from_user_id,
        "to_user_id": payment.to_user_id,
        "amount": payment.amount,
        "description": payment.description,
        "payment_date": payment.payment_date, # Date object
        "image_url": payment.image_url
    }

    update_data = payment_update.dict(exclude_unset=True)

    # Apply updates using setattr (handles description, image_url)
    # Update amount separately using the precise float value
    payment.amount = new_amount_float
    if 'amount' in update_data: del update_data['amount'] # Remove from dict

    for field, value in update_data.items():
        # Prevent changing key IDs?
        if field in ['from_user_id', 'to_user_id', 'expense_id', 'creator_id']:
            if getattr(payment, field) != value:
                 logging.warning(f"Attempt to change '{field}' on payment {payment_id} ignored.")
                 continue # Skip this field
        setattr(payment, field, value)

    # Update payment_date to today
    payment.payment_date = date.today()

    # Create audit log AFTER preparing updates but BEFORE commit
    new_values_for_log = jsonable_encoder(payment_update)

    create_audit_log(
        db=db,
        group_id=payment.expense.group_id if payment.expense else None,
        user_id=current_user_id,
        action="UPDATE_PAYMENT",
        details={
            "payment_id": payment_id,
            "expense_id": payment.expense_id,
            "old_values": old_values, # Contains date object, handled by serializer
            "new_values": new_values_for_log
        }
    )

    try:
        db.commit() # Commit payment changes and audit log
        db.refresh(payment)
        return payment
    except Exception as e:
        db.rollback()
        logging.error(f"Error committing payment update for {payment_id}: {e}")
        # Re-raise specific error if it's about JSON serialization from audit log
        if isinstance(e, (TypeError, ValueError)) and "JSON" in str(e):
             raise ValueError(f"Error saving audit log during payment update: {e}")
        raise # Reraise other DB errors


def delete_payment(db: Session, payment_id: int, current_user_id: int, is_admin: bool) -> bool:
    """Deletes a payment."""
    payment = get_payment(db, payment_id) # Should eager load expense
    if not payment:
        raise ValueError(f"Payment {payment_id} not found")

    # Permission check
    if payment.creator_id != current_user_id and not is_admin:
        raise ValueError("Only the payment creator or a group admin can delete this payment")

    # Capture details BEFORE deleting
    group_id = payment.expense.group_id if payment.expense else None
    deleted_value_details = {
            "payment_id": payment_id,
            "expense_id": payment.expense_id,
            "from_user_id": payment.from_user_id,
            "to_user_id": payment.to_user_id,
            "amount": payment.amount,
            "description": payment.description,
            "payment_date": payment.payment_date, # Date object
            "created_at": payment.created_at,     # Datetime object
            "creator_id": payment.creator_id,
            "image_url": payment.image_url
        }

    db.delete(payment)

    # Create log AFTER db.delete() but BEFORE commit
    create_audit_log(
        db=db,
        group_id=group_id,
        user_id=current_user_id,
        action="DELETE_PAYMENT",
        details=deleted_value_details # Contains date/datetime, handled by serializer
    )

    try:
        db.commit() # Commit deletion and audit log together
        return True
    except Exception as e:
        db.rollback()
        logging.error(f"Error committing payment deletion for {payment_id}: {e}")
        if isinstance(e, (TypeError, ValueError)) and "JSON" in str(e):
             raise ValueError(f"Error saving audit log during payment deletion: {e}")
        raise # Reraise other DB errors


def get_group_member_by_user_id(db: Session, group_id: int, user_id: int) -> Optional[models.GroupMember]:
    """Gets a specific group member entry."""
    # Handle potential None group_id if expense relationship wasn't loaded
    if group_id is None:
         return None
    return db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == user_id
    ).first()


def calculate_expense_balance(db: Session, expense_id: int, user_id: int) -> float:
    """
    Calculates the current balance for a user regarding a specific expense.
    Positive: User is owed money. Negative: User owes money. Zero: Settled.
    Uses Decimal for precision.
    """
    expense = get_expense_by_id(db, expense_id) # Eager loads splits
    if not expense:
        raise ValueError(f"Expense {expense_id} not found")

    # Find the user's share (what they should have paid)
    user_share_cents = 0
    if expense.splits:
        for split in expense.splits:
            if split.user_id == user_id:
                user_share_cents = split.amount # amount 是整数
                break

    user_paid_initially_cents = 0
    expense_amount_cents = expense.amount # amount 是整数
    if expense.payer_id == user_id:
        user_paid_initially_cents = expense_amount_cents

    base_balance_cents = user_paid_initially_cents - user_share_cents

    payments_received_sum = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.expense_id == expense_id,
        models.Payment.to_user_i
    ).scalar() or 0 # 默认值为 0 (整数)
    payments_received_cents = payments_received_sum

    payments_made_sum = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.expense_id == expense_id,
        models.Payment.from_user_id == user_id
    ).scalar() or 0 # 默认值为 0)
    payments_made_cents = payments_made_sum

    final_balance_cents = base_balance_cents - payments_received_cents + payments_made_cents

    return final_balance_cents
# ******************************************************************** #

# ----------- Audit Log CRUD -----------

# Helper function to serialize date/datetime for JSON
def _audit_details_serializer(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return repr(obj)

def create_audit_log(db: Session, *, group_id: int, user_id: int, action: str, details: Optional[Dict[str, Any]] = None):
    """
    Helper function to create an audit log entry.
    Handles JSON serialization for date/datetime objects within 'details'.
    """
    serialized_details = None
    if details is not None:
        try:
            # Use jsonable_encoder first for Pydantic models, etc.
            encoded_details = jsonable_encoder(details)
            # Use json.dumps with custom serializer for date/datetime
            details_json_string = json.dumps(encoded_details, default=_audit_details_serializer)
            # Parse back into dict/list for DB JSON column
            serialized_details = json.loads(details_json_string)
        except TypeError as e:
            logging.error(f"AUDIT LOG: Could not serialize details for action '{action}' by user {user_id} in group {group_id}. Error: {e}")
            serialized_details = {"error": f"Serialization failed: {e}", "raw_details_type": str(type(details))}
        except Exception as e:
             logging.error(f"AUDIT LOG: Unexpected error serializing details for action '{action}'. Error: {e}")
             serialized_details = {"error": f"Unexpected serialization error: {e}"}

    # Prevent logging if group_id is missing (e.g., related object wasn't loaded)
    if group_id is None:
        logging.error(f"AUDIT LOG: Skipping log for action '{action}' by user {user_id} due to missing group_id. Details: {details}")
        return None # Do not add log entry

    log_entry = models.AuditLog(
        group_id=group_id,
        user_id=user_id,
        action=action,
        details=serialized_details
    )
    db.add(log_entry)
    # Let the calling function handle commit/rollback
    return log_entry

def get_audit_logs(db: Session, group_id: int):
    """Retrieve all audit logs for a specific group, ordered by most recent."""
    # Eager load user associated with the log entry
    return db.query(models.AuditLog).options(
        joinedload(models.AuditLog.user)
    ).filter(models.AuditLog.group_id == group_id).order_by(models.AuditLog.timestamp.desc()).all()


# ----------- Settlement CRUD (🔴 修复版本) -----------

def get_all_group_payments(db: Session, group_id: int) -> List[models.Payment]:
    """
    (🔴 新增辅助函数) 获取一个群组 *所有* 费用下的 *所有* 支付记录。
    """
    return db.query(models.Payment)\
             .join(models.Expense)\
             .filter(models.Expense.group_id == group_id)\
             .all()

def calculate_group_settlement_balance(db: Session, group_id: int) -> (Dict[int, Dict], Dict[int, Any]):
    """
    (🔴 修复) 计算群组所有成员的结算余额
    返回：(member_balances, member_data)
    """
    try:
        # 1. 获取群组所有成员
        members = get_group_members(db, group_id)
        member_data = {member.user_id: {
            'user': member.user,
            'nickname': member.nickname,
            'is_admin': member.is_admin
        } for member in members}
        
        # 2. 初始化每个成员的余额 (单位：分)
        member_balances = {member_id: 0 for member_id in member_data}
        
        # 3. 获取群组所有费用
        expenses = get_group_expenses(db, group_id)
        logging.info(f"DEBUG: Found {len(expenses)} expenses for group {group_id}")
        
        # 4. 累加费用
        for expense in expenses:
            if expense.payer_id in member_balances:
                # 付款人 "增加" 余额 (别人欠他的)
                member_balances[expense.payer_id] += expense.amount
            
            if hasattr(expense, 'splits') and expense.splits:
                for split in expense.splits:
                    if split.user_id in member_balances:
                        # 参与人 "减少" 余额 (他欠别人的)
                        member_balances[split.user_id] -= split.amount
        
        # 5. 累加支付 (结算)
        payments = get_all_group_payments(db, group_id)
        logging.info(f"DEBUG: Found {len(payments)} total payments for group {group_id}")
        
        for payment in payments:
            if payment.from_user_id in member_balances:
                # 付款人 "增加" 余额 (还钱)
                member_balances[payment.from_user_id] += payment.amount
            if payment.to_user_id in member_balances:
                # 收款人 "减少" 余额 (收钱)
                member_balances[payment.to_user_id] -= payment.amount

        # 6. 准备返回数据 (包含详细信息，仍然使用分)
        final_balances_info = {}
        for member_id, final_balance_cents in member_balances.items():
            final_balances_info[member_id] = {
                'final_balance': final_balance_cents
                # 注意：这里不再计算 total_expenses 等，因为它们在旧逻辑中是错误的
            }

        logging.info(f"DEBUG: Calculated final balances (in cents) for {len(final_balances_info)} members")
        return final_balances_info, member_data
    
    except Exception as e:
        logging.error(f"Error in calculate_group_settlement_balance for group {group_id}: {e}")
        logging.error(traceback.format_exc())
        raise


def get_group_settlement_summary(db: Session, group_id: int) -> Dict:
    """
    (🔴 修复) 获取群组结算汇总信息
    """
    try:
        # 获取群组信息
        group = get_group_by_id(db, group_id)
        if not group:
            raise ValueError(f"群组 {group_id} 不存在")
        
        # 获取群组所有成员
        members = get_group_members(db, group_id)
        logging.info(f"DEBUG: Found {len(members)} members for group {group_id}")
        
        # 计算结算余额 (使用 🔴 修复后 的函数)
        member_balances_cents, member_data = calculate_group_settlement_balance(db, group_id)
        
        # 调试信息
        logging.info(f"DEBUG: member_balances_cents keys: {list(member_balances_cents.keys())}")
        
        # 生成结算平衡列表
        balances = []
        for member_id, balance_info in member_balances_cents.items():
            try:
                user_info = member_data[member_id]
                final_balance_cents = balance_info.get('final_balance', 0)
                
                # 确定状态
                if final_balance_cents > 1:  # 应收钱 (使用 1 分作为阈值)
                    status = 'creditor'
                elif final_balance_cents < -1:  # 应付钱
                    status = 'debtor'
                else:  # 基本平衡
                    status = 'settled'
                
                balance_obj = {
                    'user_id': member_id,
                    'username': user_info['user'].username,
                    'balance': final_balance_cents, # 保持分为单位
                    'status': status,
                    # 🔴 移除旧的、错误的字段
                    # 'total_expenses': 0.0,
                    # 'total_payments_made': 0.0,
                    # 'total_payments_received': 0.0,
                }
                balances.append(balance_obj)
            except Exception as e:
                logging.error(f"Error processing balance for member {member_id}: {e}")
                continue
        
        # 计算群组总支出
        expenses = get_group_expenses(db, group_id)
        total_amount_cents = 0
        for expense in expenses:
            try:
                total_amount_cents += int(expense.amount)
            except (ValueError, TypeError) as e:
                logging.warning(f"Invalid expense amount for expense {expense.id}: {e}")
                continue
        
        logging.info(f"DEBUG: Total amount calculated (in cents): {total_amount_cents}")
        
        return {
            'group_id': group_id,
            'group_name': group.name,
            'total_amount': total_amount_cents, # 保持分为单位
            'member_count': len(members),
            'balances': balances, # 包含分为单位的余额
            'last_updated': datetime.now()
        }
    
    except Exception as e:
        logging.error(f"Error in get_group_settlement_summary for group {group_id}: {e}")
        logging.error(traceback.format_exc())
        raise


def generate_settlement_transactions(member_balances: Dict, member_data: Dict = None) -> List[Dict]:
    """
    (🔴 修复) 生成推荐的结算交易路径
    使用贪心算法最小化交易次数
    - 传入的 member_balances 是 {member_id: {'final_balance': <cents>}}
    """
    # 分离债权人和债务人
    creditors = []  # 应收钱的人
    debtors = []    # 应付钱的人
    
    for member_id, balance_info in member_balances.items():
        final_balance_cents = balance_info['final_balance']
        # 获取用户名
        username = f"User{member_id}"
        if member_data and member_id in member_data:
            username = member_data[member_id]['user'].username
        
        if final_balance_cents > 1:  # 应收
            creditors.append({
                'user_id': member_id,
                'amount': final_balance_cents,
                'username': username
            })
        elif final_balance_cents < -1:  # 应付
            debtors.append({
                'user_id': member_id,
                'amount': abs(final_balance_cents),
                'username': username
            })
    
    # 按金额排序
    creditors.sort(key=lambda x: x['amount'], reverse=True)
    debtors.sort(key=lambda x: x['amount'], reverse=True)
    
    transactions = []
    
    # 贪心匹配
    i, j = 0, 0
    while i < len(creditors) and j < len(debtors):
        creditor = creditors[i]
        debtor = debtors[j]
        
        # 计算交易金额 (分)
        transaction_amount_cents = min(creditor['amount'], debtor['amount'])
        
        if transaction_amount_cents > 1:  # 忽略很小的金额
            transactions.append({
                'from_user_id': debtor['user_id'],  # 债务人付钱
                'to_user_id': creditor['user_id'],   # 债权人收钱
                'amount': transaction_amount_cents, # 保持分为单位
                'description': f"结算付款：{debtor['username']} 支付给 {creditor['username']}"
            })
        
        # 更新余额
        creditor['amount'] -= transaction_amount_cents
        debtor['amount'] -= transaction_amount_cents
        
        # 移动到下一个
        if creditor['amount'] <= 1:
            i += 1
        if debtor['amount'] <= 1:
            j += 1
    
    return transactions


def execute_settlement(db: Session, group_id: int, creator_id: int, description: Optional[str] = None) -> Dict:
    """
    (🔴 修复) 执行群组结算操作
    创建结算交易的支付记录
    """
    # 1. 获取结算汇总 (使用 🔴 修复后 的函数)
    settlement_summary = get_group_settlement_summary(db, group_id)
    
    # 2. 准备 member_balances 和 member_data
    members = get_group_members(db, group_id)
    member_data = {member.user_id: {
        'user': member.user,
        'nickname': member.nickname,
        'is_admin': member.is_admin
    } for member in members}
    
    member_balances_dict = {
        balance['user_id']: {'final_balance': balance['balance']} 
        for balance in settlement_summary['balances']
    }
    
    # 3. 生成推荐交易 (以分为单位)
    transactions = generate_settlement_transactions(member_balances_dict, member_data)
    
    if not transactions:
        raise ValueError("没有需要结算的款项")

    # 4. 获取群组的 *第一个* 费用ID，用于关联支付
    # 这是一个简化处理，理想情况下结算支付不应与单一费用关联
    # 但根据当前模型 Payment.expense_id 是必填项
    first_expense = db.query(models.Expense).filter(models.Expense.group_id == group_id).first()
    if not first_expense:
        raise ValueError("群组中没有任何费用，无法创建结算支付")
    
    reference_expense_id = first_expense.id

    # 5. 创建支付记录
    created_payments = []
    for transaction in transactions:
        payment_data = schemas.PaymentCreate(
            from_user_id=transaction['from_user_id'],
            to_user_id=transaction['to_user_id'],
            amount=transaction['amount'],  # 已经是分
            description=transaction.get('description', description or f'群组 {settlement_summary["group_name"]} 结算')
        )
        
        try:
            payment = create_payment(
                db=db,
                expense_id=reference_expense_id, # 关联到第一个费用
                creator_id=creator_id,
                payment=payment_data
            )
            created_payments.append(payment)
        except Exception as e:
            logging.error(f"创建支付记录失败: {e}")
            db.rollback() # 回滚单次支付创建
            continue # 继续尝试下一笔
    
    # 6. 创建结算审计日志
    # (注意：create_payment 内部已经创建了 CREATE_PAYMENT 日志)
    create_audit_log(
        db=db,
        group_id=group_id,
        user_id=creator_id,
        action="EXECUTE_SETTLEMENT",
        details={
            "description": description or "群组结算",
            "transactions_created": [jsonable_encoder(p) for p in created_payments],
            "reference_expense_id": reference_expense_id
        }
    )
    
    # 7. 提交事务 (create_payment 内部已提交，这里多提交一次以保存审计日志)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logging.error(f"提交结算审计日志失败: {e}")

    # 8. 获取 *新* 的结算汇总
    new_settlement_summary = get_group_settlement_summary(db, group_id)

    return {
        'success': True,
        'message': f'结算成功完成，创建了 {len(created_payments)} 笔支付记录',
        'settlement_summary': new_settlement_summary, # 返回最新的汇总
        'transactions': transactions,
        'created_payments': [p.id for p in created_payments]
    }