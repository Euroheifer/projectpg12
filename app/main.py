from fastapi import FastAPI, Depends, HTTPException, status, Response, Request, File, UploadFile, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.exceptions import RequestValidationError # 03 Nov
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Annotated, List, Dict
from datetime import timedelta, date
import logging, json
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database import SessionLocal
import traceback
from fastapi.templating import Jinja2Templates
from app import schemas, crud, models, database, auth
from .database import engine, Base, get_db
from app.dependencies import (
    get_current_user,
    get_group_with_access_check,
    verify_group_owner,
    verify_group_admin,
    get_pending_invitation_as_invitee,
)


# --- add for HTML ---
from .pages import pages_router
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import APIRouter

#app = FastAPI()
app = FastAPI(title="Project PG12 Web Application", version="1.0.0")

# --- add for HTML ---
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")
#app.include_router(pages_router)


def check_recurring_expenses_job():
    logging.info("Scheduler: Running recurring expense check...")
    db = SessionLocal() # Create a new session
    try:
        crud.process_due_recurring_expenses(db)
    except Exception as e:
        logging.error(f"Scheduler: Error in recurring expense job: {e}")
        db.rollback() # Rollback on any unexpected error
    finally:
        db.close() # Always close the session

scheduler = AsyncIOScheduler()

@app.on_event("startup")
def start_scheduler():
    logging.warning("--- Attempting to start scheduler... ---")
    try:
        logging.warning("Adding job 'check_recurring_expenses_job'...")

        if not scheduler:
             logging.error("Scheduler instance is NOT available!")
             return

        scheduler.add_job(check_recurring_expenses_job, 'interval', minutes=1)
        logging.warning("Job added successfully.")

        logging.warning("Attempting to start scheduler...")
        scheduler.start()

        logging.warning("Scheduler started... Job will run every MINUTES.")

    except Exception as e:
        logging.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        logging.error("!!! FAILED TO START SCHEDULER !!!")
        logging.error(f"!!! Error: {e}")
        logging.error(f"!!! Traceback: {traceback.format_exc()}")
        logging.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")

@app.on_event("shutdown")
def shutdown_scheduler():
    try:
        if scheduler.running:
            scheduler.shutdown()
            logging.warning("Scheduler shut down.")
        else:
            logging.warning("Scheduler was not running, no need to shut down.")
    except Exception as e:
        logging.error(f"Error during scheduler shutdown: {e}")

# --- END OF SCHEDULER SETUP ---


# ----------- User Route (US1) -----------
@app.post(
    "/users/signup", response_model=schemas.User, status_code=status.HTTP_201_CREATED
)
def create_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)

    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )
    return crud.create_user(db=db, user=user)


@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db),
):
    user = auth.authenticate_user(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/auth/logout")
def logout_user(current_user: models.User = Depends(get_current_user)):
    return {"message": f"Logout successful for user {current_user.email}"}


@app.get("/me", response_model=schemas.User)
def read_current_user_profile(current_user: models.User = Depends(get_current_user)):
    """Get the current authenticated user's profile details.(by token)"""
    return current_user


@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_id(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return db_user


# -------------------------------------------- Expense Group Routes (US2)-------------------------------------------------------
@app.post("/groups/", response_model=schemas.Group, status_code=status.HTTP_201_CREATED)
def create_group_route(
    group: schemas.GroupCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new expense group, making the creator the admin."""
    return crud.create_group(db=db, group=group, admin_id=current_user.id)


@app.get("/groups/", response_model=List[schemas.Group])
def read_user_groups(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    """Retrieve a list of all groups the current user is a member of."""
    return crud.get_user_groups(db=db, user_id=current_user.id)

# ----------------add for groups.html----------------------------------
@app.get("/api/groups/{group_id}", response_model=schemas.Group)
def read_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Retrieve details of a specific group."""

    print(f"=== 调试信息: 开始处理 /groups/{group_id} ===")
    print(f"当前用户: {current_user.id} - {current_user.username}")
    print(f"请求的群组ID: {group_id}")

    # 检查群组是否存在
    group = crud.get_group_by_id(db=db, group_id=group_id)
    print(f"从数据库获取的群组: {group}")

    if not group:
        print("错误: 群组不存在")
        raise HTTPException(status_code=404, detail="Group not found")

    # 检查用户是否是群组成员
    member = crud.get_group_member(db=db, user_id=current_user.id, group_id=group_id)
    print(f"用户成员信息: {member}")

    if not member:
        print("错误: 用户不是群组成员")
        raise HTTPException(status_code=403, detail="Not a member of this group")

    print(f"=== 调试信息: 成功返回群组数据 ===")
    print(f"返回的群组: {group}")
    return group
# ----------------end of add for groups.html----------------------------------


@app.patch("/groups/{group_id}", response_model=schemas.Group)
def update_group_route(
    group_id: int,
    group_update: schemas.GroupUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):

    db_group = crud.get_group_by_id(db, group_id=group_id)
    if not db_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Group not found"
        )

    if db_group.admin_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this group",
        )

    return crud.update_group(db=db, group_id=group_id, group_update=group_update)


@app.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group_route(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):

    db_group = crud.get_group_by_id(db, group_id=group_id)
    if not db_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Group not found"
        )

    if db_group.admin_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this group",
        )

    crud.delete_group(db=db, group_id=group_id)
    return {"message": f"Group {group_id} deleted successfully"}


# ----------- Group Member Routes (US3) -----------

@app.get("/groups/{group_id}/members", response_model=list[schemas.GroupMember])
def get_group_members(
    group: models.Group = Depends(get_group_with_access_check),
    db: Session = Depends(get_db),
):
    """Get all members of a group (requires membership)."""
    return crud.get_group_members(db, group_id=group.id)


@app.post(
    "/groups/{group_id}/members/{user_id}",
    response_model=schemas.GroupMember,
    status_code=status.HTTP_201_CREATED,
)
def add_member_to_group(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    #change back to only admin can add member 28 oct
    group: models.Group = Depends(verify_group_admin),
):
    """Add a new member to a group (Admin Only)."""
    user_to_add = crud.get_user_by_id(db, user_id)

    if not user_to_add:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User to add not found"
        )

    db_member = crud.add_group_member(
        db, group_id=group_id, user_id=user_id, inviter_username=current_user.username
    )
    if db_member is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this group",
        )

    return db_member

@app.delete("/groups/{group_id}/members/{user_id}")
def remove_member_from_group(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    group: models.Group = Depends(verify_group_owner),
):
    """Remove a member from a group (requires group admin)."""
    if user_id == group.admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the group admin",
        )

    success = crud.remove_group_member(db, group_id=group_id, user_id=user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of this group",
        )

    return {"message": "Member removed successfully"}

@app.patch("/groups/{group_id}/members/{user_id}", response_model=schemas.GroupMember)
def update_member_nickname(
    group_id: int,
    user_id: int,
    nickname_update: schemas.GroupMemberUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    group: models.Group = Depends(get_group_with_access_check),
):
    """Update a member's nickname (member can change own nickname; any admin can change anyone's)."""

    db_member = crud.get_group_member(db, group_id=group_id, user_id=user_id)
    if db_member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of this group",
        )

    if current_user.id != user_id:
        current_member = crud.get_group_member(db, group_id=group_id, user_id=current_user.id)
        if not current_member or not current_member.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can change other members' nicknames",
            )

    # update nicknames
    db_member = crud.update_group_member_nickname(
        db, group_id=group_id, user_id=user_id, nickname_update=nickname_update
    )

    return db_member # 28 oct

@app.patch(
    "/groups/{group_id}/members/{user_id}/admin", response_model=schemas.GroupMember
)
def update_member_admin_status(
    group_id: int,
    user_id: int,
    admin_update: schemas.GroupMemberAdminUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    group: models.Group = Depends(verify_group_owner),
):
    """Update a member's admin status (requires group admin)."""
    db_member = crud.get_group_member(db, group_id=group_id, user_id=user_id)
    if db_member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of this group",
        )
    db_member = crud.update_group_member_admin_status(
        db, group_id=group_id, user_id=user_id, admin_update=admin_update
    )
    if db_member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Only admin members can change admin status",
        )
    action = "promoted to admin" if admin_update.is_admin else "demoted from admin"
    today_str = date.today().strftime("%Y-%m-%d")
    actor = current_user.username
    member_name = db_member.nickname or f"Member{user_id}"
    note = f" {action} by {actor} on {today_str}"

    db_member = crud.append_member_remarks(
        db, group_id=group_id, user_id=user_id, note=note
    )

    return db_member

# ----------- Group Invitation Routes -----------

@app.post(
    "/groups/{group_id}/invite",
    response_model=schemas.GroupInvitationResponse,
    status_code=status.HTTP_201_CREATED,
)
def invite_member_to_group(
    invitation_data: schemas.GroupInvitationCreate,
    group: models.Group = Depends(get_group_with_access_check),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Invite a new member to the group (ANY group member can invite).
    Invitation is sent via email lookup.
    """
    invitee = crud.get_user_by_email(db, email=invitation_data.invitee_email)
    if not invitee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email not found"
        )

    existing_member = crud.get_group_member(db, group_id=group.id, user_id=invitee.id)
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this group"
        )

    if invitee.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot invite yourself to the group"
        )

    db_invitation = crud.create_group_invitation(
        db=db,
        group_id=group.id,
        inviter_id=current_user.id,
        invitee_id=invitee.id
    )

    if db_invitation is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pending invitation for this user already exists"
        )

    detailed_invitation = crud.get_invitation_by_id(db, db_invitation.id)
    return detailed_invitation


@app.get(
    "/invitations/me",
    response_model=List[schemas.GroupInvitationResponse],
)
def get_my_pending_invitations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get all PENDING group invitations for the current user.
    """
    invitations = crud.get_pending_invitations_for_user(db, user_id=current_user.id)
    return invitations


@app.post(
    "/invitations/{invitation_id}/respond",
    response_model=schemas.GroupInvitation,
)
def respond_to_invitation(
    action_data: schemas.InvitationAction,
    invitation: models.GroupInvitation = Depends(get_pending_invitation_as_invitee),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Respond to a pending invitation (accept or reject).
    Only the invitee can respond.
    """
    if action_data.action.lower() == "accept":
        db_member = crud.add_group_member(
            db,
            group_id=invitation.group_id,
            user_id=current_user.id,
            inviter_username=invitation.inviter.username
        )
        if db_member is None:
            invitation.status = models.InvitationStatus.REJECTED
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this group (invitation voided)"
            )

        invitation.status = models.InvitationStatus.ACCEPTED
        db.add(invitation)
        db.commit()
        db.refresh(invitation)
        return invitation

    elif action_data.action.lower() == "reject":
        invitation.status = models.InvitationStatus.REJECTED
        db.add(invitation)
        db.commit()
        db.refresh(invitation)
        return invitation

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be 'accept' or 'reject'."
        )

# -------------- END 28 Oct --------------------------------- #

# ----------- Expense Routes (US7, US9) -----------
@app.post("/groups/{group_id}/expenses", response_model=schemas.ExpenseWithSplits, status_code=status.HTTP_201_CREATED)
def create_expense_in_group(
    group_id: int,
    # 🚨 关键修改 1: 将 Pydantic Body 替换为 Form 字段
    description: str = Form(...),
    amount: int = Form(...),
    payer_id: int = Form(...),
    date: str = Form(...), 
    split_type: str = Form(...),
    splits: str = Form(...), # 前端将 splits 数组序列化为 JSON 字符串发送
    
    # 🚨 关键修改 2: 新增 UploadFile 字段用于接收文件
    image_file: UploadFile = File(None), 
    
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    group: models.Group = Depends(get_group_with_access_check),
):
    """
    Create a new expense in a group, handling FormData and file upload.
    """
    
    # 🚨 新增逻辑 1: 解析 splits JSON 字符串
    try:
        splits_data = json.loads(splits)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid splits JSON format")
    except TypeError:
        splits_data = []

    # 🚨 新增逻辑 2: 构造 schemas.ExpenseCreateWithSplits 模型
    # 注意：image_url 暂时设置为 None，将在 crud.py 中处理文件并生成实际 URL
    expense_data = schemas.ExpenseCreateWithSplits(
        description=description,
        amount=amount,
        payer_id=payer_id,
        date=date,
        split_type=split_type,
        # 转换 splits_data 为 Pydantic 子模型列表
        splits=[schemas.ExpenseSplitCreate(**s) for s in splits_data], 
        image_url=None 
    )

    # 🚨 关键修改 3: 调用 CRUD 函数，并传递 image_file 对象
    result = crud.create_expense(
        db=db,
        group_id=group_id,
        creator_id=current_user.id,
        expense=expense_data,
        image_file=image_file # 传递 UploadFile 对象
    )
    return result["expense"]

# ------------------- [END MODIFIED BLOCK: create_expense_in_group] -------------------
    #expense_data: schemas.ExpenseCreateWithSplits, #03 Nov for upload img
    #db: Session = Depends(get_db),
    #current_user: models.User = Depends(get_current_user),
    #group: models.Group = Depends(get_group_with_access_check),
#):
    """
    Create a new expense in a group. Any group member can create an expense.
    The creator is recorded, and a payer is specified.
    """

    # Verify the payer is a member of the group
    payer_member = crud.get_group_member(db, group_id=group_id, user_id=expense_data.payer_id)
    if not payer_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User {expense_data.payer_id} is not a member of this group and cannot be a payer.",
        )

    # Check if all users in splits are members of the group
    for split in expense_data.splits:
        split_member = crud.get_group_member(db, group_id=group_id, user_id=split.user_id)
        if not split_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User {split.user_id} is not a member of this group"
            )

    # Expense type validation
    if expense_data.split_type == "custom":
        for split in expense_data.splits:
            if split.amount is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Amount is required for user {split.user_id} in custom split mode"
                )
        # Check if the total amount provided in custom split mode matches the expense amount
        total_provided = sum(split.amount for split in expense_data.splits)
        if abs(total_provided - expense_data.amount) > 0.01:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Custom split amounts ({total_provided}) must equal the total expense amount ({expense_data.amount})"
            )

    elif expense_data.split_type == "equal":
        for split in expense_data.splits:
            if split.amount is not None:
                logging.warning(f"Ignoring provided amount {split.amount} for user {split.user_id} in equal split mode")

    result = crud.create_expense(
        db=db,
        group_id=group_id,
        creator_id=current_user.id,
        expense=clean_expense_data
    )
    return result["expense"]

@app.get("/groups/{group_id}/expenses", response_model=List[schemas.ExpenseWithSplits])
def read_group_expenses(
    group_id: int,
    db: Session = Depends(get_db),
    group: models.Group = Depends(get_group_with_access_check),
):
    """
    (US9) Retrieve all expenses for a specific group. Requires group membership.
    """
    return crud.get_group_expenses(db, group_id=group_id)


@app.patch("/groups/{group_id}/expenses/{expense_id}", response_model=schemas.Expense)
def update_expense_in_group(
    group_id: int,
    expense_id: int,
    expense_update: schemas.ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    group: models.Group = Depends(get_group_with_access_check),
):
    """
    (US6 & US7) Update an expense.
    - Admins can update any expense in the group.
    - Regular members can only update expenses they created.
    """
    db_expense = crud.get_expense_by_id(db, expense_id)
    if not db_expense or db_expense.group_id != group_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found in this group")

    current_member = crud.get_group_member(db, group_id=group_id, user_id=current_user.id)

    is_admin = current_member and current_member.is_admin
    is_creator = db_expense.creator_id == current_user.id

    if not is_admin and not is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this expense.",
        )

    if expense_update.splits is not None:
        if expense_update.split_type is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="split_type is required when updating splits"
            )

        for split in expense_update.splits:
            split_member = crud.get_group_member(db, group_id=group_id, user_id=split.user_id)
            if not split_member:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User {split.user_id} is not a member of this group"
                )

        if expense_update.split_type == "custom":
            total_amount = expense_update.amount if expense_update.amount is not None else db_expense.amount

            if not all(s.amount is not None for s in expense_update.splits):
                 raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Amount is required for all users in custom split mode"
                )

            total_provided = sum(split.amount for split in expense_update.splits)

            if abs(total_provided - total_amount) > 0.01:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Custom split amounts ({total_provided}) must equal the total expense amount ({total_amount})"
                )
    updated_expense = crud.update_expense(
        db,
        expense_id=expense_id,
        expense_update=expense_update,
        user_id=current_user.id
    )

    if updated_expense is None:
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found after update attempt"
        )

    return updated_expense

@app.delete("/groups/{group_id}/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense_from_group(
    group_id: int,
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    group: models.Group = Depends(get_group_with_access_check),
):
    """
    (US6 & US7) Delete an expense.
    - Admins can delete any expense in the group.
    - Regular members can only delete expenses they created.
    """
    db_expense = crud.get_expense_by_id(db, expense_id)
    if not db_expense or db_expense.group_id != group_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found in this group")

    current_member = crud.get_group_member(db, group_id=group_id, user_id=current_user.id)

    is_admin = current_member and current_member.is_admin
    is_creator = db_expense.creator_id == current_user.id

    if not is_admin and not is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this expense.",
        )

    crud.delete_expense(db, expense_id=expense_id, user_id=current_user.id)
    return {"message": "Expense deleted successfully"}


@app.get("/groups/{group_id}/expenses/{expense_id}", response_model=schemas.Expense)
def get_expense(
    group_id: int,
    expense_id: int,
    db: Session = Depends(get_db),
    group: models.Group = Depends(get_group_with_access_check),
):
    """Get a single expense by its ID (requires group membership)."""
    db_expense = crud.get_expense_by_id(db, expense_id=expense_id)
    if not db_expense or db_expense.group_id != group_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found in this group"
        )
    return db_expense


# ----------- Recurring Expense Routes (US8) -----------
@app.post("/groups/{group_id}/recurring-expenses", response_model=schemas.RecurringExpense, status_code=status.HTTP_201_CREATED)
def create_new_recurring_expense(
    group_id: int,
    recurring_expense: schemas.RecurringExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    group: models.Group = Depends(get_group_with_access_check),
):
    """
    (US8) Create a recurring expense definition. Any group member can create one.
    """
    payer_member = crud.get_group_member(db, group_id=group_id, user_id=recurring_expense.payer_id)
    if not payer_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User {recurring_expense.payer_id} is not a member of this group and cannot be a payer.",
        )

    for split in recurring_expense.splits:
        split_member = crud.get_group_member(db, group_id=group_id, user_id=split.user_id)
        if not split_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User {split.user_id} in splits is not a member of this group"
            )

    if recurring_expense.split_type == "custom":
        if not all(split.amount is not None for split in recurring_expense.splits):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount is required for each user in custom split mode"
            )
        total_provided = sum(split.amount for split in recurring_expense.splits)
        if abs(total_provided - recurring_expense.amount) > 0.01:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Custom split amounts ({total_provided}) must equal the total recurring expense amount ({recurring_expense.amount})"
            )
    return crud.create_recurring_expense(db, group_id=group_id, creator_id=current_user.id, recurring_expense=recurring_expense)


@app.get("/groups/{group_id}/recurring-expenses", response_model=List[schemas.RecurringExpense])
def read_group_recurring_expenses(
    group_id: int,
    db: Session = Depends(get_db),
    group: models.Group = Depends(get_group_with_access_check),
):
    """(US8) View all recurring expense definitions in a group."""
    return crud.get_group_recurring_expenses(db, group_id=group_id)


@app.patch("/groups/{group_id}/recurring-expenses/{recurring_expense_id}", response_model=schemas.RecurringExpense)
def update_existing_recurring_expense(
    group_id: int,
    recurring_expense_id: int,
    expense_update: schemas.RecurringExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    group: models.Group = Depends(get_group_with_access_check),
):
    """(US8) Update a recurring expense. Only the creator or an admin can update."""
    db_recurring_expense = crud.get_recurring_expense_by_id(db, recurring_expense_id)
    if not db_recurring_expense or db_recurring_expense.group_id != group_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring expense not found")

    current_member = crud.get_group_member(db, group_id=group_id, user_id=current_user.id)
    if not (current_member and current_member.is_admin) and db_recurring_expense.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator or an admin can update this recurring expense.",
        )

    if expense_update.payer_id is not None:
        payer_member = crud.get_group_member(db, group_id=group_id, user_id=expense_update.payer_id)
        if not payer_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User {expense_update.payer_id} is not a member of this group and cannot be a payer.",
            )

    if expense_update.splits:
        split_type = expense_update.split_type or db_recurring_expense.split_type

        for split in expense_update.splits:
            split_member = crud.get_group_member(db, group_id=group_id, user_id=split.user_id)
            if not split_member:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User {split.user_id} in splits is not a member of this group"
                )

        if split_type == "custom":
            if not all(split.amount is not None for split in expense_update.splits):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Amount is required for each user in custom split mode"
                )

            total_amount = expense_update.amount if expense_update.amount is not None else db_recurring_expense.amount
            total_provided = sum(split.amount for split in expense_update.splits)
            if abs(total_provided - total_amount) > 0.01:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Custom split amounts ({total_provided}) must equal the total expense amount ({total_amount})"
                )
    return crud.update_recurring_expense(db, recurring_expense_id=recurring_expense_id, expense_update=expense_update, user_id=current_user.id)


@app.delete("/groups/{group_id}/recurring-expenses/{recurring_expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_recurring_expense(
    group_id: int,
    recurring_expense_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    group: models.Group = Depends(get_group_with_access_check),
):
    """(US8) Delete a recurring expense definition. Only the creator or an admin can delete."""
    db_recurring_expense = crud.get_recurring_expense_by_id(db, recurring_expense_id)
    if not db_recurring_expense or db_recurring_expense.group_id != group_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring expense not found")

    current_member = crud.get_group_member(db, group_id=group_id, user_id=current_user.id)
    if not (current_member and current_member.is_admin) and db_recurring_expense.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator or an admin can delete this recurring expense.",
        )

    crud.delete_recurring_expense(db, recurring_expense_id=recurring_expense_id, user_id=current_user.id)
    return {"message": "Recurring expense deleted successfully"}


@app.get("/groups/{group_id}/recurring-expenses/{recurring_expense_id}",response_model=schemas.RecurringExpense,)
def get_recurring_expense(
    group_id: int,
    recurring_expense_id: int,
    db: Session = Depends(get_db),
    group: models.Group = Depends(get_group_with_access_check),
):
    """Get a single recurring expense by ID (requires group membership)."""
    db_recurring_expense = crud.get_recurring_expense_by_id(
        db, recurring_expense_id=recurring_expense_id
    )
    if (
        not db_recurring_expense
        or db_recurring_expense.group_id != group_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring expense not found in this group",
        )
    return db_recurring_expense

# *********** add payment to calculate the balance *********** #
# ----------- Payment Routes -----------
@app.post("/expenses/{expense_id}/payments", response_model=schemas.Payment, status_code=status.HTTP_201_CREATED)
def create_payment_for_expense(
    expense_id: int,
    payment: schemas.PaymentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_expense = crud.get_expense_by_id(db, expense_id)
    if not db_expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    member = crud.get_group_member(db, group_id=db_expense.group_id, user_id=current_user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this expense's group"
        )
    """
    (US9) Create a payment for an expense.
    - Only group members can create payments.
    - Payments update the expense's balance.
    """
    try:
        db_payment = crud.create_payment(
            db=db,
            expense_id=expense_id,
            creator_id=current_user.id,
            payment=payment
        )
        return db_payment

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/expenses/{expense_id}/payments", response_model=List[schemas.Payment])
def get_payments_for_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all payments for a specific expense."""
    db_expense = crud.get_expense_by_id(db, expense_id)
    if not db_expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    member = crud.get_group_member(db, group_id=db_expense.group_id, user_id=current_user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this expense's group"
        )
    payments = crud.get_expense_payments(db, expense_id=expense_id)
    return payments

@app.get("/payments/{payment_id}", response_model=schemas.Payment)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a single payment by ID (requires group membership)."""
    payment = crud.get_payment(db, payment_id=payment_id)
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    member = crud.get_group_member(db, group_id=payment.expense.group_id, user_id=current_user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this payment's group"
        )

    return payment

@app.patch("/payments/{payment_id}", response_model=schemas.Payment)
def update_payment(
    payment_id: int,
    payment_update: schemas.PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    payment = crud.get_payment(db, payment_id=payment_id)
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )

    member = crud.get_group_member(db, group_id=payment.expense.group_id, user_id=current_user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this payment's group"
        )

    try:
        updated_payment = crud.update_payment(
            db=db,
            payment_id=payment_id,
            payment_update=payment_update,
            current_user_id=current_user.id,
            is_admin=member.is_admin
        )
        return updated_payment

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.delete("/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    payment = crud.get_payment(db, payment_id=payment_id)
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )

    member = crud.get_group_member(db, group_id=payment.expense.group_id, user_id=current_user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this payment"
        )
    is_admin=member.is_admin

    try:
        success = crud.delete_payment(
            db=db,
            payment_id=payment_id,
            current_user_id=current_user.id,
            is_admin=is_admin
        )
        if not success:
             raise HTTPException(status_code=400, detail="Payment could not be deleted")
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/expenses/{expense_id}/balance/{user_id}")
def get_user_expense_balance(
    expense_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_expense = crud.get_expense_by_id(db, expense_id)
    if not db_expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    member = crud.get_group_member(db, group_id=db_expense.group_id, user_id=current_user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view balances for this group"
        )

    target_member = crud.get_group_member(db, group_id=db_expense.group_id, user_id=user_id)
    if not target_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target user {user_id} is not a member of this group"
        )

    balance = crud.calculate_expense_balance(db, expense_id=expense_id, user_id=user_id)

    total_paid = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.expense_id == expense_id,
        models.Payment.from_user_id == user_id
    ).scalar() or 0.0

    # Calculate total received amount
    total_received = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.expense_id == expense_id,
        models.Payment.to_user_id == user_id
    ).scalar() or 0.0

    expense_split = db.query(models.ExpenseSplit).filter(
        models.ExpenseSplit.expense_id == expense_id,
        models.ExpenseSplit.user_id == user_id
    ).first()

    original_share = expense_split.amount if expense_split else 0

    return {
        "user_id": user_id,
        "expense_id": expense_id,
        "original_share": original_share,
        "current_balance": balance,
        "total_paid": total_paid,
        "total_received": total_received,
        "status": "owed" if balance < 0 else "owed_to" if balance > 0 else "settled",
        "summary": f"Amount should received ${balance:.2f}" if balance > 0 else f"Amount should paid ${abs(balance):.2f}" if balance < 0 else "Settled",
        "payment_summary": f"Amount should paid ${total_paid:.2f}" if total_paid > 0 else "Not paid yet"
    }

# *********** end of Payment & Balance *********** #

@app.get("/groups/{group_id}/audit-trail", response_model=List[schemas.AuditLog])
def read_audit_trail(
    group_id: int,
    db: Session = Depends(get_db),
    group: models.Group = Depends(verify_group_admin),
):
    """Get the audit trail for a group (admins only)."""
    return crud.get_audit_logs(db=db, group_id=group_id)

app.include_router(pages_router)


# -------------- add for debug 03 Nov ----------------------- #
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """详细的 Pydantic 422 错误处理"""
    print("=== DETAILED 422 VA ===")

    # 修复 JSON 序列化问题
    from fastapi.encoders import jsonable_encoder

    for error in exc.errors():
        print(f"Error location: {error['loc']}")
        print(f"Error type: {error['type']}")
        print(f"Error message: {error['msg']}")
        print(f"Error input: {error.get('input')}")
        print("---")

    # 返回可序列化的错误
    return JSONResponse(
        status_code=422,
        content={"detail": jsonable_encoder(exc.errors())},
    ) 
