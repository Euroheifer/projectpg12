from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, FileResponse
import os

router = APIRouter()

@router.get("/pages/{page_name}", response_class=HTMLResponse)
async def get_page(page_name: str):
    """获取前端页面"""
    # 这里可以根据需要返回前端页面
    # 目前返回主页面
    if page_name == "index":
        return HTMLResponse(content="""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>费用分摊管理系统</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
            width: 100%;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 2.5em;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 1.2em;
        }
        .feature {
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            text-align: left;
        }
        .feature h3 {
            color: #4f46e5;
            margin: 0 0 10px 0;
        }
        .feature p {
            margin: 0;
            color: #666;
        }
        .api-info {
            margin-top: 30px;
            padding: 20px;
            background: #e3f2fd;
            border-radius: 10px;
        }
        .api-info a {
            color: #1976d2;
            text-decoration: none;
        }
        .api-info a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>💰 费用分摊管理系统</h1>
        <p class="subtitle">简洁高效的群组费用管理解决方案</p>
        
        <div class="feature">
            <h3>🏠 群组管理</h3>
            <p>创建和管理费用分摊群组，邀请朋友加入</p>
        </div>
        
        <div class="feature">
            <h3>📊 智能分摊</h3>
            <p>自动计算每个成员应承担的费用和余额</p>
        </div>
        
        <div class="feature">
            <h3>💳 支付跟踪</h3>
            <p>记录和管理成员间的支付情况</p>
        </div>
        
        <div class="feature">
            <h3>📱 响应式设计</h3>
            <p>支持手机、平板、电脑等多种设备</p>
        </div>
        
        <div class="api-info">
            <h3>🔗 API 文档</h3>
            <p><a href="/docs">查看完整的API文档</a></p>
            <p><a href="/redoc">查看ReDoc文档</a></p>
        </div>
    </div>
</body>
</html>
        """)
    
    else:
        return HTMLResponse(content=f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>页面不存在</title>
</head>
<body>
    <h1>页面 "{page_name}" 不存在</h1>
    <a href="/">返回首页</a>
</body>
</html>
        """)

@router.get("/static/{file_path:path}")
async def get_static_file(file_path: str):
    """获取静态文件"""
    static_dir = os.path.join(os.path.dirname(__file__), "templates")
    file_path = os.path.join(static_dir, file_path)
    
    if os.path.exists(file_path):
        return FileResponse(file_path)
    else:
        return HTMLResponse(content="文件未找到", status_code=404)