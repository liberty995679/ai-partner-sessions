from pathlib import Path
from fastapi import FastAPI,HTTPException,Header
from starlette.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

import schemas
import secrets
import jwt
import datetime

app = FastAPI()
SECRET = secrets.token_hex(32)

# 路径
BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = BASE_DIR / "templates"
#挂载静态文件
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

#模拟数据库
USERDB = {"username":"小明","password":"123456"}

#渲染html
def render_html(html_file: str) -> HTMLResponse:
    """读取模版文件下的文件并返回"""
    html_path = TEMPLATE_DIR / html_file
    return HTMLResponse(html_path.read_text(encoding="utf-8"))

@app.get("/")
def root():
    return {"Hello": "World"}

@app.get("/login")
def login():
    return render_html("login.html")

@app.post("/login")
def login(data: schemas.LoginRequest):
    username = data.username
    password = data.password
    if USERDB["username"] == username and USERDB["password"] == password:
        token = jwt.encode({"username": username, "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1)}, SECRET, algorithm="HS256")
        return {"code": 200, "msg": "登录成功" , "token": token}
    raise HTTPException(status_code=400, detail="用户名或密码错误")

@app.get("/profile")
def profile(x_token: str = Header(...)):
    token = x_token
    try:
        data = jwt.decode(token, SECRET, algorithms=["HS256"])
        return {"code": 200, "msg": "登录成功" , "username": data["username"]}
    except jwt.ExpiredSignatureError:
        return {"code": 400, "msg": "登录已过期"}
    except jwt.InvalidTokenError:
        return {"code": 400, "msg": "无效的token"}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)