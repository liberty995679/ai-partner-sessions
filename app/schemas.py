from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str

class PersonaRequest(BaseModel):
    user_id: str
    name: str
    prompt: str

class ChatRequest(BaseModel):
    user_id: str
    message: str
    name: str = "小薇"  # 新增：AI名字
    prompt: str = "你叫小薇，是一个善解人意的AI伴侣。"  # 新增：AI性格

class ConversationCreate(BaseModel):
    """创建会话 - 只需要会话名称"""
    name: str  # 不再需要 user_id

class MessageCreate(BaseModel):
    """发送消息 - 只需要内容和角色"""
    role: str  # 'user' 或 'assistant'
    content: str
    # 不再需要 user_id 和 conv_id（从URL获取）
