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