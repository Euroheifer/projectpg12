# from fastapi import APIRouter, Depends, HTTPException, status
# from sqlalchemy.orm import Session
# from .. import models, schemas, crud, dependencies
# from ..database import get_db

# router = APIRouter(
#     prefix="/groups",
#     tags=["Groups"]
# )

# @router.post("/", response_model=schemas.Group, status_code=status.HTTP_201_CREATED)
# def create_group(
#     group: schemas.GroupCreate, 
#     db: Session = Depends(get_db), 
#     current_user: schemas.User = Depends(dependencies.auth.get_current_user)
# ):
#     """创建费用群组，当前用户自动成为管理员和第一个成员"""
#     return crud.create_group(db=db, group=group, admin_id=current_user.id)

# @router.get("/{group_id}", response_model=schemas.Group)
# def get_group(
#     group_id: int,
#     db: Session = Depends(get_db),
#     # 使用 is_member 依赖确保用户是成员且群组存在
#     group: models.Group = Depends(dependencies.is_member) 
# ):
#     """获取群组详情"""
#     return group

# # TODO: 添加 PUT/DELETE 路由 (需要 admin 权限)

# @router.post("/{group_id}/invite", response_model=schemas.Invitation)
# def invite_member_to_group(
#     group_id: int, 
#     invitation: schemas.InvitationCreate, 
#     db: Session = Depends(get_db), 
#     # 假设只有管理员可以邀请新成员
#     group: models.Group = Depends(dependencies.is_admin), 
#     current_user: schemas.User = Depends(dependencies.auth.get_current_user)
# ):
#     """邀请新成员加入群组"""
    
#     # 检查被邀请者是否已注册
#     invitee_user = crud.get_user_by_email(db, invitation.invitee_email)
#     if invitee_user and invitee_user in group.members:
#         raise HTTPException(status_code=400, detail="User is already a member of this group.")

#     # 检查是否已有待处理邀请
#     existing_invitation = crud.get_pending_invitation(db, group_id, invitation.invitee_email)
#     if existing_invitation:
#         raise HTTPException(status_code=400, detail="A pending invitation already exists for this email.")

#     return crud.create_invitation(
#         db=db, 
#         group_id=group_id, 
#         inviter_id=current_user.id, 
#         invitee_email=invitation.invitee_email
#     )
