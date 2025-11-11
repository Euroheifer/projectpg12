# pages.py defines a route to handle home page requests and return HTML pages
from fastapi import APIRouter, Request, Depends
from fastapi.templating import Jinja2Templates
from fastapi.security import HTTPBearer
from fastapi.responses import HTMLResponse

templates = Jinja2Templates(directory="templates")
security = HTTPBearer()
router = APIRouter()

async def signup_page(request: Request):
    context = {"request": request, "title": "User Registration"}
    return templates.TemplateResponse("signup.html", context)

async def login_page(request: Request):
    context = {"request": request, "title": "User Login"}
    return templates.TemplateResponse("login.html", context)

async def home_page(request: Request):
    context = {"request": request, "title": "User Home"}
    return templates.TemplateResponse("home.html", context)

async def get_group_page(request: Request, group_id: int):
    # Return unified group.html based on user permissions
    return templates.TemplateResponse("groups.html", {"request": request})

async def groups_admin_page(request: Request):
    context = {"request": request, "title": "User Interface (Admin)"}
    return templates.TemplateResponse("group_details_admin.html", context)

async def groups_member_page(request: Request):
    context = {"request": request, "title": "User Interface (Member)"}
    return templates.TemplateResponse("group_details_member.html", context)
