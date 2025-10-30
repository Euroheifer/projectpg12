# from fastapi import APIRouter, Depends, status
# from sqlalchemy.orm import Session
# from .. import models, schemas, dependencies
# from ..database import get_db
# from typing import List

# router = APIRouter(
#     prefix="/groups/{group_id}/payments",
#     tags=["Payments"]
# )

# @router.post("/", response_model=schemas.Payment, status_code=status.HTTP_201_CREATED)
# def create_payment(
#     group_id: int, 
#     payment: schemas.PaymentCreate, 
#     db: Session = Depends(get_db), 
#     group: models.Group = Depends(dependencies.is_member), # 确保是成员
#     current_user: schemas.User = Depends(dependencies.auth.get_current_user)
# ):
#     """创建一个新支付/还款记录 (群组成员权限)"""
#     # TODO: 在 CRUD 中实现创建逻辑，包括 attachments
#     pass

# @router.get("/", response_model=List[schemas.Payment])
# def list_payments(
#     group_id: int, 
#     db: Session = Depends(get_db), 
#     group: models.Group = Depends(dependencies.is_member) # 确保是成员
# ):
#     """获取群组所有支付/还款列表"""
#     # TODO: 在 CRUD 中实现获取列表逻辑
#     pass

# # TODO: 添加 PUT/DELETE 路由 (需要检查 creator_id 或 admin 权限)

# from fastapi import FastAPI
# from . import models
# from .database import engine

# # 导入所有 APIRouter 模块
# from .routers import user, group, expense, payment

# # 创建所有数据库表 (首次运行时)
# models.Base.metadata.create_all(bind=engine)

# app = FastAPI(
#     title="共享费用管理平台 API",
#     description="后端系统用于 Splitwise 类的费用管理。已实现用户认证、群组、费用、支付和邀请的基础架构。",
#     version="2.0.0"
# )

# # # --- 注册路由器 ---

# # # 1. User & Auth 路由器 (不带 prefix，路由如 /users/, /token)
# # app.include_router(user.router)

# # # 2. Group 路由器 (prefix: /groups)
# # app.include_router(group.router)

# # # 3. Expense 路由器 (prefix: /groups/{group_id}/expenses)
# # # 路由路径: /groups/{group_id}/expenses/...
# # app.include_router(expense.router)

# # # 4. Payment 路由器 (prefix: /groups/{group_id}/payments)
# # # 路由路径: /groups/{group_id}/payments/...
# # app.include_router(payment.router)

# # # --- 根路径 ---
# # @app.get("/", include_in_schema=False)
# # def read_root():
# #     return {"message": "Welcome to the Shared Expense Manager API. Visit /docs for documentation."}
