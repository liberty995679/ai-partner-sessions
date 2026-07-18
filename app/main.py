from pathlib import Path
from fastapi import FastAPI, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse
import jwt
import datetime
import schemas
import secrets

app = FastAPI()
SECRET_KEY = secrets.token_hex(32)

# 获取当前文件所在目录
BASE_DIR = Path(__file__).resolve().parent.parent

# 用户数据库模拟
USER_DB = {"小明": "123456"}

# 挂载静态文件目录
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

# 模板目录路径
TEMPLATES_DIR = BASE_DIR / "templates"


def render_html(filename: str) -> HTMLResponse:
    """读取 templates 目录下的 HTML 文件并返回"""
    html_path = TEMPLATES_DIR / filename
    return HTMLResponse(html_path.read_text(encoding="utf-8"))


@app.get("/login")
async def login_page():
    """
    返回登录界面
    """
    return render_html("login.html")

@app.post("/login")
async def login(data: schemas.LoginRequest):
    """
    :param username: 用户名
    :param password: 密码
    :return: 模拟登录函数
    """
    username = data.username
    password = data.password
    if username in USER_DB and USER_DB[username] == password:
        # 验证通过
        token = jwt.encode(
            {"username": username, "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1)},
            SECRET_KEY,
            algorithm="HS256"
        )
        return {"code":200, "token": token, "message": "登录成功"}
    raise HTTPException(status_code=401, detail="用户名或密码错误")

@app.get("/profile")
async def profile(x_token: str = Header(...)):
    """
    需要登录才能访问
    :param token:令牌
    :return: 模拟访问需要登录的页面
    """
    token = x_token
    # 验证令牌
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return {"success": True, "user": data["username"], "message": "登录成功"}
    except jwt.ExpiredSignatureError:
        return {"success": False, "message": "登录已过期"}
    except jwt.InvalidTokenError:
        return {"success": False, "message": "无效的令牌"}

@app.get("/")
def read_root():
    return RedirectResponse(url="/login")


@app.get("/chat")
async def chat_page():
    """
    返回聊天界面
    """
    return render_html("chat.html")


@app.get("/register")
async def register_page():
    """
    返回注册界面
    """
    return render_html("register.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
