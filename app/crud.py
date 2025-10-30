from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session, joinedload 
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
    if split_type == "equal":
        member_count = len(splits_in)
        if member_count == 0:
            raise ValueError("No members specified for equal split")

        # Use Decimal for precision
        expense_amount_dec = Decimal(str(expense.amount))
        # Round to 2 decimal places using standard rounding
        equal_amount_dec = (expense_amount_dec / Decimal(member_count)).quantize(Decimal("0.01"), rounding='ROUND_HALF_UP')
        equal_amount = float(equal_amount_dec)

        total_dec = Decimal("0.00")
        for i, split in enumerate(splits_in):
            amount_dec = equal_amount_dec
            # Adjust last split precisely to match the total expense amount
            if i == member_count - 1:
                amount_dec = expense_amount_dec - total_dec

            amount = float(amount_dec)
            total_dec += amount_dec # Accumulate the precise Decimal value

            db_split = models.ExpenseSplit(
                expense_id=expense.id,
                user_id=split.user_id,
                amount=amount,
                balance=amount, # Initial balance reflects the owed amount
                share_type="equal"
            )
            db.add(db_split)
            db_splits.append(db_split)
        # Final check for precision (optional, good for debugging)
        if total_dec != expense_amount_dec:
            logging.warning(f"Equal split total ({total_dec}) does not exactly match expense amount ({expense_amount_dec}) for expense {expense.id} due to potential floating point issues in intermediate steps.")


    elif split_type == "custom":
        total_provided_dec = Decimal("0.00")
        for split in splits_in:
            if split.amount is None:
                raise ValueError(f"Amount is required for user {split.user_id} in custom split")
            # Ensure amount is treated as Decimal
            split_amount_dec = Decimal(str(split.amount)).quantize(Decimal("0.01"))
            total_provided_dec += split_amount_dec
            split_amount_float = float(split_amount_dec)

            db_split = models.ExpenseSplit(
                expense_id=expense.id,
                user_id=split.user_id,
                amount=split_amount_float,
                balance=split_amount_float, # Initial balance reflects the owed amount
                share_type="custom"
            )
            db.add(db_split)
            db_splits.append(db_split)

        # Verify total matches expense amount precisely
        expense_amount_dec = Decimal(str(expense.amount)).quantize(Decimal("0.01"))
        if total_provided_dec != expense_amount_dec:
             # This check should ideally be redundant if validation in main.py is correct
             logging.error(f"Critical: Custom split sum ({total_provided_dec}) does not match expense amount ({expense_amount_dec}) for expense {expense.id}. Raising ValueError.")
             raise ValueError("Custom split sum does not match expense amount")

    return db_splits


def create_expense(db: Session, group_id: int, creator_id: int, expense: schemas.ExpenseCreateWithSplits) -> Dict:
    """Create a new expense and its splits within a group."""

    db_expense = models.Expense(
        description=expense.description,
        amount=expense.amount,
        payer_id=expense.payer_id,
        date=expense.date if expense.date else date.today(),
        group_id=group_id,
        creator_id=creator_id,
        split_type=expense.split_type,
        image_url=getattr(expense, 'image_url', None)
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
    user_share_dec = Decimal("0.00")
    if expense.splits:
        for split in expense.splits:
            if split.user_id == user_id:
                user_share_dec = Decimal(str(split.amount)).quantize(Decimal("0.01"))
                break # Found the user's split

    # Amount user actually paid initially (as the payer)
    user_paid_initially_dec = Decimal("0.00")
    expense_amount_dec = Decimal(str(expense.amount)).quantize(Decimal("0.01"))
    if expense.payer_id == user_id:
        user_paid_initially_dec = expense_amount_dec

    # Base balance = Amount Paid Initially - Amount Owed (Share)
    base_balance_dec = user_paid_initially_dec - user_share_dec

    # Sum subsequent payments received by this user for this expense
    payments_received_sum = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.expense_id == expense_id,
        models.Payment.to_user_id == user_id
    ).scalar() or 0.0
    payments_received_dec = Decimal(str(payments_received_sum)).quantize(Decimal("0.01"))

    # Sum subsequent payments made by this user for this expense
    payments_made_sum = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.expense_id == expense_id,
        models.Payment.from_user_id == user_id
    ).scalar() or 0.0
    payments_made_dec = Decimal(str(payments_made_sum)).quantize(Decimal("0.01"))

    # Final Balance = Base Balance - Payments Received + Payments Made
    final_balance_dec = base_balance_dec - payments_received_dec + payments_made_dec

    # Return as float, but calculation was done with Decimal
    return float(final_balance_dec)
# ************************************************************************ #

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

