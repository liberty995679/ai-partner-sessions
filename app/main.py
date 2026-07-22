from pathlib import Path
from fastapi import FastAPI,HTTPException,Header
from starlette.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

import schemas
import secrets
import jwt
import datetime
import os
from openai import AsyncOpenAI

#导入数据库函数
from database import init_db,create_user,get_user,verify_user

app = FastAPI()
SECRET = secrets.token_hex(32)

# 路径
BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = BASE_DIR / "templates"

#初始化数据库
init_db()

#挂载静态文件
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

db_user_personas = {}
db_conversations = {} # 用户会话历史记录

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

# 登录接口
@app.post("/login")
async def login(data: schemas.LoginRequest):
    """
    用户登录
    """
    # 调用数据库函数验证用户
    if verify_user(data.username, data.password):
        # 生成 token
        token = jwt.encode({
            "username": data.username,
            "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1)
        }, SECRET)
        return {"code": 200, "msg": "登录成功", "token": token}
    raise HTTPException(status_code=400, detail="用户名或密码错误")

@app.get("/register")
async def register():
    return render_html("register.html")


#注册接口
@app.post("/register")
async def register(data: schemas.RegisterRequest):
    """
    用户注册
    """
    #调用数据库函数
    success = create_user(data.username, data.password)
    if success:
        return {"code": 200, "msg": "注册成功"}
    raise HTTPException(status_code=400, detail="用户已存在")

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


#测试接口 （查看所有用户）
@app.get("/api/users")
async def list_users():
    """查看所有用户(仅供测试）"""
    from database import get_connection
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("select id, username, created_at from users")
    users = cursor.fetchall()
    conn.close()
    return {"users":[dict(u) for u in users]}

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
    client = AsyncOpenAI(
        api_key=os.environ.get('DEEPSEEK_API_KEY'),
        base_url="https://api.deepseek.com")

    # 获取该用户的对话历史，没有就初始化空列表
    if user_id not in db_conversations:
        db_conversations[user_id] = []
    history = db_conversations[user_id]

    rules = RULES.replace("{name}",persona["name"])

    # 正确构建 messages：system + 历史 + 当前消息
    messages = [
        {"role": "system", "content": persona["prompt"] + rules},
    ]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    response =await client.chat.completions.create(
        model="deepseek-v4-pro",
        messages=messages,
        stream=False,
        reasoning_effort="high",
        extra_body={"thinking": {"type": "enabled"}}
    )
    reply = response.choices[0].message.content
    history.append({"role": "user", "content": user_message})
    history.append({"role": "assistant", "content": reply})
    db_conversations[user_id] = history
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