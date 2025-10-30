# from fastapi import APIRouter, Depends, status
# from sqlalchemy.orm import Session
# from .. import models, schemas, dependencies
# from ..database import get_db
# from typing import List

# router = APIRouter(
#     prefix="/groups/{group_id}/expenses",
#     tags=["Expenses"]
# )

# @router.post("/", response_model=schemas.Expense, status_code=status.HTTP_201_CREATED)
# def create_expense(
#     group_id: int, 
#     expense: schemas.ExpenseCreate, 
#     db: Session = Depends(get_db), 
#     group: models.Group = Depends(dependencies.is_member), # 确保是成员
#     current_user: schemas.User = Depends(dependencies.auth.get_current_user)
# ):
#     """创建一个新费用 (群组成员权限)"""
#     # TODO: 在 CRUD 中实现创建逻辑，包括 splits 和 attachments
#     pass

# @router.get("/", response_model=List[schemas.Expense])
# def list_expenses(
#     group_id: int, 
#     db: Session = Depends(get_db), 
#     group: models.Group = Depends(dependencies.is_member) # 确保是成员
# ):
#     """获取群组所有费用列表"""
#     # TODO: 在 CRUD 中实现获取列表逻辑
#     pass

# # TODO: 添加 PUT/DELETE 路由 (需要检查 creator_id 或 admin 权限)
