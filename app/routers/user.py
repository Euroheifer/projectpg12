# from fastapi import FastAPI, Depends, HTTPException, status, Response, Request
# from fastapi.security import OAuth2PasswordRequestForm
# from fastapi.responses import HTMLResponse
# from sqlalchemy.orm import Session
# from sqlalchemy import func
# from typing import Annotated, List, Dict
# from datetime import timedelta, date

# from app import schemas, crud, models, database, auth
# from ..database import engine, Base, get_db
# from app.dependencies import (
#     get_current_user,
#     get_group_with_access_check,
#     verify_group_owner,
#     verify_group_admin,
# )

# #app = FastAPI()
# app = FastAPI(title="Project PG12 Web Application", version="1.0.0")
# # ----------- User Route (US1) -----------
# @app.post(
#     "/users/signup", response_model=schemas.User, status_code=status.HTTP_201_CREATED
# )
# def create_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
#     db_user = crud.get_user_by_email(db, email=user.email)

#     if db_user:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
#         )
#     return crud.create_user(db=db, user=user)


# @app.post("/token", response_model=schemas.Token)
# async def login_for_access_token(
#     form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
#     db: Session = Depends(get_db),
# ):
#     user = auth.authenticate_user(
#         db, email=form_data.username, password=form_data.password
#     )
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect username or password",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
#     access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
#     access_token = auth.create_access_token(
#         data={"sub": user.email}, expires_delta=access_token_expires
#     )
#     return {"access_token": access_token, "token_type": "bearer"}


# @app.post("/auth/logout")
# def logout_user(current_user: models.User = Depends(get_current_user)):
#     return {"message": f"Logout successful for user {current_user.email}"}
