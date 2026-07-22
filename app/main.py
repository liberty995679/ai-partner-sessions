from pathlib import Path
from fastapi import FastAPI,HTTPException,Header
from starlette.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

import schemas
import jwt
import datetime
import os
from openai import AsyncOpenAI

#导入数据库函数
from database import (
    init_db,create_user,get_user,verify_user,delete_user_by_id,
    get_user_by_id,get_conversations,create_conversation,get_conversation_by_id,
    get_messages,add_message,delete_conversation,delete_messages,
    get_messages_for_chat,get_or_create_default_conv
)

app = FastAPI()
SECRET = 'ai-companion-jwt-secret-key-2026'

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
    cursor.execute("select id, username, password, created_at from users")
    users = cursor.fetchall()
    conn.close()
    return {"users":[dict(u) for u in users]}

#管理页面路由和删除接口
@app.get("/admin")
def admin():
    return render_html("admin.html")

#删除用户
@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int):
    """删除指定用户"""
    from database import delete_user_by_id
    if delete_user_by_id(user_id):
        return {"code": 200, "msg": "删除成功"}
    raise HTTPException(status_code=404, detail="用户不存在")

# 2. 接收聊天消息的接口
@app.post("/chat_api")
async def chat(data: schemas.ChatRequest, x_token: str = Header(None)):
    user_message = data.message
    conv_id = data.conv_id

    # 用 token 获取真实用户ID
    db_user_id = 0
    if x_token:
        try:
            user_info = verify_token(x_token)
            db_user_id = user_info["id"]
        except:
            pass

    # 优先用请求里传过来的名字和性格
    persona = {
        "name": data.name,
        "prompt": data.prompt
    }
    db_user_personas[data.user_id] = persona

    client = AsyncOpenAI(
        api_key=os.environ.get('DEEPSEEK_API_KEY'),
        base_url="https://api.deepseek.com")

    # 从数据库加载历史消息
    history = []
    if db_user_id > 0 and conv_id > 0:
        db_messages = get_messages(conv_id, db_user_id, limit=20)
        for msg in db_messages:
            history.append({"role": msg["role"], "content": msg["content"]})

    rules = RULES.replace("{name}", persona["name"])

    messages = [
        {"role": "system", "content": persona["prompt"] + rules},
    ]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    response = await client.chat.completions.create(
        model="deepseek-v4-pro",
        messages=messages,
        stream=False,
        reasoning_effort="high",
        extra_body={"thinking": {"type": "enabled"}}
    )
    reply = response.choices[0].message.content

    # 保存消息到数据库（使用真实 user_id 和 conv_id）
    if db_user_id > 0:
        if conv_id <= 0:
            current_conv_id = get_or_create_default_conv(db_user_id)
            if current_conv_id:
                conv_id = current_conv_id
        if conv_id > 0:
            add_message(conv_id, db_user_id, "user", user_message)
            add_message(conv_id, db_user_id, "assistant", reply)

    return {
        "status": "ok",
        "name": persona["name"],
        "reply": reply
    }


def verify_token(token: str) -> dict:
    """验证Token并返回用户信息"""
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        username = payload.get("username")
        if not username:
            raise HTTPException(status_code=401, detail="无效的Token")

        user = get_user(username)
        if not user:
            raise HTTPException(status_code=401, detail="用户不存在")

        return {"id": user["id"], "username": user["username"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="登录已过期")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="无效的Token")

#获取所有对话
@app.get("/api/conversations")
async def get_conversations_list(
    x_token: str = Header(...),
):
    """
    获取用户的所有会话
    GET /api/conversations
    """
    user_info = verify_token(x_token)
    user_id = user_info["id"]

    #获取会话列表
    conversations = get_conversations(user_id)
    return {
        "conversations":conversations
    }

#创建新对话
@app.post("/api/conversations")
async def create_conversation_api(
    data: schemas.ConversationCreate,
    x_token: str = Header(...)
):
    """
    创建新会话
    POST /api/conversations
    Body: {name: "会话名称"
    """
    user_info = verify_token(x_token)
    user_id = user_info["id"]

    #创建新会话
    conversation = create_conversation(user_id, data.name)

    if not conversation:
        raise HTTPException(status_code=400, detail="创建会话失败")

    return {
        "id": conversation["id"],
        "name": conversation["name"],
        "created_at": conversation["created_at"]
    }

#获取会话消息
@app.get("/api/conversations/{conv_id}/messages")
async def get_conversation_messages(
    conv_id: int,
    x_token: str = Header(...)
):
    """
    获取会话的所有消息
    GET /api/conversations/{conv_id}/messages
    """
    #从token中获取用户信息
    user_info = verify_token(x_token)
    user_id = user_info["id"]

    #验证会话是否属于该用户
    conv = get_conversation_by_id(conv_id, user_id)
    if not conv:
        raise HTTPException(status_code=404, detail="会话不存在")

    #获取消息列表
    messages = get_messages(conv_id, user_id)
    return {
        "messages":messages
    }

#发送消息
@app.post("/api/conversations/{conv_id}/messages")
async def send_message(
    conv_id: int,
    data: schemas.MessageCreate,
    x_token: str = Header(...)
):
    """
    发送消息到会话
    POST /api/conversations/{conv_id}/messages
    Body: { role: "user", content: "消息内容" }
    """
    user_info = verify_token(x_token)
    user_id = user_info["id"]

    # 2. 验证会话是否属于该用户
    conv = get_conversation_by_id(conv_id, user_id)
    if not conv:
        raise HTTPException(status_code=404, detail="会话不存在")

    #验证角色
    if data.role not in ["user", "assistant"]:
        raise HTTPException(status_code=400, detail="无效的角色")
    message = add_message(conv_id, user_id, data.role, data.content)

    if not message:
        raise HTTPException(status_code=400, detail="发送消息失败")
    return {
        "id": message["id"],
        "created_at": message["created_at"]
    }


#删除会话
@app.delete("/api/conversations/{conv_id}")
async def delete_conversation_api(
        conv_id: int,
        x_token: str = Header(...)
):
    """
    删除会话
    """
    user_info = verify_token(x_token)
    user_id = user_info["id"]

    success = delete_conversation(conv_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="会话不存在")

    return {"code": 200, "message": "会话已删除"}

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