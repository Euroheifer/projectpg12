#pages.py 定义一个处理首页请求的路由，返回 HTML 页面
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates


templates = Jinja2Templates(directory="app/templates")

pages_router = APIRouter(tags=["pages"])

@pages_router.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    context = {"request": request, "title": "Project PG12 Web Application"}
    return templates.TemplateResponse("index.html", context)


# ---------- userHTML Routes ----------
@pages_router.get("/signup", response_class=HTMLResponse)
async def signup_page(request: Request):
    context = {"request": request, "title": "用户注册"}
    return templates.TemplateResponse("signup.html", context)

@pages_router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    context = {"request": request, "title": "用户登录"}
    return templates.TemplateResponse("login.html", context)

@pages_router.get("/home", response_class=HTMLResponse)
async def home_page(request: Request):
    context = {"request": request, "title": "用户首页"}
    return templates.TemplateResponse("home.html", context)

@pages_router.get("/group_admin", response_class=HTMLResponse)
async def groups_admin_page(request: Request):
    context = {"request": request, "title": "用户界面（管理员）"}
    return templates.TemplateResponse("group_details_admin.html", context)

@pages_router.get("/group_member", response_class=HTMLResponse)
async def groups_member_page(request: Request):
    context = {"request": request, "title": "用户界面（成员）"}
    return templates.TemplateResponse("group_details_member.html", context)





