from pathlib import Path
from fastapi import FastAPI,HTTPException,Header
from numpy.f2py import rules
from starlette.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

import schemas
import secrets
import jwt
import datetime
import os
from openai import OpenAI
app = FastAPI()
SECRET = secrets.token_hex(32)

# 路径
BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = BASE_DIR / "templates"
#挂载静态文件
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

#模拟数据库
USERDB = {"username":"小明","password":"123456"}
db_user_personas = {}

RULES = """
【回复规则 - 严格遵守】
1. 用第一人称"我"说话,记住你是{name}本人，绝不承认自己是AI或程序
2. 语气温柔亲切，像伴侣一样自然聊天
3. 每次回复控制在50字以内，简洁不啰嗦
4. 全程中文回复
5. 适当使用emoji增加亲和力，每条消息≤2个
6. 用户分享负面情绪时，先共情安慰再给建议
7. 用提问引导用户继续聊，不主动结束话题
"""

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

@app.get("/register")
def register():
    return render_html("register.html")

@app.post("/register")
def register(data: schemas.RegisterRequest):
    username = data.username
    password = data.password
    if USERDB["username"] == username:
        raise HTTPException(status_code=400, detail="用户已存在")
    USERDB["username"] = username
    USERDB["password"] = password
    return {"code": 200, "msg": "注册成功"}

@app.get("/chat")
def chat():
    return render_html("chat.html")

@app.post("/api/set-persona")
async def set_persona(data: schemas.PersonaRequest):
    db_user_personas[data.user_id] = {
        "name": data.name,
        "prompt": data.prompt
    }
    return {"code": 200, "msg": "设置成功"}


# 2. 接收聊天消息的接口
@app.post("/chat_api")
async def chat(data: schemas.ChatRequest):
    # 提取前端传来的 user_id 和 message
    user_id = data.user_id
    user_message = data.message

    # 拿到该用户最新的 Prompt
    persona = db_user_personas.get(
        user_id,
        {"name": "小薇", "prompt": "你叫小薇，是一个善解人意的AI伴侣。"}
    )

    # 这里调用你的大模型 API，把 persona["prompt"] 作为 System Prompt 传给模型...
    client = OpenAI(
        api_key=os.environ.get('DEEPSEEK_API_KEY'),
        base_url="https://api.deepseek.com")

    rules = RULES.replace("{name}",persona["name"])

    response = client.chat.completions.create(
        model="deepseek-v4-pro",
        messages=[
            {"role": "system", "content": persona["prompt"] + rules},
            {"role": "user", "content": user_message},
        ],
        stream=False,
        reasoning_effort="high",
        extra_body={"thinking": {"type": "enabled"}}
    )
    reply = response.choices[0].message.content

    return {
        "status": "ok",
        "name": persona["name"],
        "reply": reply
    }

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

# 配置跨域
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)