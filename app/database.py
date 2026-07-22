import sqlite3
from pathlib import Path

#获取当前文件所在目录
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / 'ai_companion.db'

print(f"数据库文件路径：{DB_PATH}")

#创建数据库连接
def get_connection():
    """获取数据库链接"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  #让查询结果可以用字段名访问
    return conn

#初始化数据库
def init_db():
    """创建用户表"""
    conn = get_connection()
    cursor = conn.cursor()

    #创建用户表的sql语句
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ai_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            name TEXT DEFAULT '小薇',
            personality TEXT DEFAULT '善解人意',
            greeting TEXT DEFAULT '你好呀！今天想聊什么呢？',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # 会话表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    #消息表（新建）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conv_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conv_id) REFERENCES conversations (id)
        )
    ''')
    conn.commit()
    conn.close()
    print("数据库初始化完成！ 用户表已创建")


#用户操作函数
def create_user(username:str, password:str) -> bool:
    """创建用户
    True 表示成功
    False 表示用户名已经存在
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "INSERT INTO users (username, password) VALUES(?, ?)",
            (username, password)
        )
        conn.commit()
        conn.close()
        print(f"用户{username} 创建成功！")
        return True
    except sqlite3.IntegrityError:
        #用户名重复
        conn.close()
        print(f"用户{username} 已存在！")
        return False

def get_user(username:str) -> dict:
    """
    根据用户名查询用户，返回用户信息字典
    :param username: 用户名
    :return: 字典 不存在为None
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username=?", (username,))
    user = cursor.fetchone()
    conn.close()

    if user:
        return dict(user)
    return None

def get_user_by_id(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None

def verify_user(username:str, password:str) -> bool:
    """验证用户
    True 验证成功
    False 验证失败
    """
    user = get_user(username)
    if user and user['password'] == password:
        print(f"用户{username} 验证通过！")
        return True
    print(f"用户{username} 验证失败！")
    return False

def clean_duplicates():
    """删除重复用户，保留最早的记录"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        DELETE FROM users WHERE id NOT IN (
            SELECT MIN(id) FROM users GROUP BY username
        )
    ''')
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    print(f"已删除 {deleted} 条重复用户记录")

def delete_user_by_id(user_id: int) -> bool:
    """按ID删除用户，返回是否成功"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT username FROM users WHERE id=?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return False
    cursor.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    conn.close()
    print(f"已删除用户: {user['username']} (ID={user_id})")
    return True


# 会话相关函数

def get_conversations(user_id: int) -> list:
    """
    获取用户的所有会话
    按更新时间倒序排列
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT id, user_id, name, created_at, updated_at
        FROM conversations
        WHERE user_id = ?
        ORDER BY updated_at DESC
    ''', (user_id,))

    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def create_conversation(user_id: int, name: str) -> dict:
    """
    创建新会话
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO conversations (user_id, name)
        VALUES (?, ?)
    ''', (user_id, name))

    conn.commit()

    # 获取新创建的会话
    conv_id = cursor.lastrowid
    cursor.execute('''
        SELECT id, user_id, name, created_at, updated_at
        FROM conversations
        WHERE id = ?
    ''', (conv_id,))

    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_conversation_by_id(conv_id: int, user_id: int) -> dict | None:
    """
    获取会话信息（同时验证是否属于该用户）
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT id, user_id, name, created_at, updated_at
        FROM conversations
        WHERE id = ? AND user_id = ?
    ''', (conv_id, user_id))

    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def update_conversation_time(conv_id: int):
    """
    更新会话的更新时间（每次有新消息时调用）
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        UPDATE conversations
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (conv_id,))

    conn.commit()
    conn.close()


def delete_conversation(conv_id: int, user_id: int) -> bool:
    """
    删除会话（同时删除该会话的所有消息）
    """
    conn = get_connection()
    cursor = conn.cursor()

    # 先验证会话属于该用户
    conv = get_conversation_by_id(conv_id, user_id)
    if not conv:
        conn.close()
        return False

    # 删除消息
    cursor.execute("DELETE FROM messages WHERE conv_id = ?", (conv_id,))
    # 删除会话
    cursor.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))

    conn.commit()
    conn.close()
    return True


# ========== ⭐ 消息相关函数 ==========

def get_messages(conv_id: int, user_id: int, limit: int = 100) -> list:
    """
    获取会话的所有消息
    按时间正序排列
    """
    # 先验证会话属于该用户
    conv = get_conversation_by_id(conv_id, user_id)
    if not conv:
        return []

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT id, conv_id, role, content, created_at
        FROM messages
        WHERE conv_id = ?
        ORDER BY created_at ASC
        LIMIT ?
    ''', (conv_id, limit))

    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def add_message(conv_id: int, user_id: int, role: str, content: str) -> dict | None:
    """
    添加消息到会话
    """
    # 先验证会话属于该用户
    conv = get_conversation_by_id(conv_id, user_id)
    if not conv:
        return None

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO messages (conv_id, role, content)
        VALUES (?, ?, ?)
    ''', (conv_id, role, content))

    conn.commit()

    # 更新会话的更新时间
    update_conversation_time(conv_id)

    # 获取新创建的消息
    msg_id = cursor.lastrowid
    cursor.execute('''
        SELECT id, conv_id, role, content, created_at
        FROM messages
        WHERE id = ?
    ''', (msg_id,))

    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def delete_messages(conv_id: int, user_id: int) -> bool:
    """
    删除会话的所有消息
    """
    conv = get_conversation_by_id(conv_id, user_id)
    if not conv:
        return False

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM messages WHERE conv_id = ?", (conv_id,))
    conn.commit()
    conn.close()
    return True


# ========== 测试函数 ==========
def test_conversation_functions():
    """测试会话和消息功能"""
    print("\n" + "=" * 50)
    print("测试会话和消息功能")
    print("=" * 50)

    # 获取用户
    user = get_user("小明")
    if not user:
        print("❌ 请先注册用户 '小明'")
        return

    user_id = user["id"]
    print(f"✅ 用户ID: {user_id}")

    # 1. 创建会话
    print("\n--- 创建会话 ---")
    conv1 = create_conversation(user_id, "工作讨论")
    print(f"创建会话: {conv1}")

    conv2 = create_conversation(user_id, "生活闲聊")
    print(f"创建会话: {conv2}")

    # 2. 获取所有会话
    print("\n--- 获取所有会话 ---")
    convs = get_conversations(user_id)
    for c in convs:
        print(f"  📁 {c['name']} (ID: {c['id']})")

    # 3. 添加消息
    print("\n--- 添加消息 ---")
    msg1 = add_message(conv1["id"], user_id, "user", "你好呀！")
    print(f"添加消息: {msg1}")

    msg2 = add_message(conv1["id"], user_id, "assistant", "你好！我是小美~")
    print(f"添加消息: {msg2}")

    # 4. 获取消息
    print("\n--- 获取会话消息 ---")
    msgs = get_messages(conv1["id"], user_id)
    for m in msgs:
        role_icon = "👤" if m["role"] == "user" else "🤖"
        print(f"  {role_icon} [{m['role']}] {m['content']}")

    # 5. 验证时间更新
    print("\n--- 验证更新时间 ---")
    conv_updated = get_conversation_by_id(conv1["id"], user_id)
    print(f"会话 '{conv_updated['name']}' 最后更新: {conv_updated['updated_at']}")


def get_or_create_default_conv(user_id: int) -> int:
    """
    获取用户的默认会话ID，没有则自动创建
    """
    convs = get_conversations(user_id)
    if convs:
        return convs[0]["id"]
    conv = create_conversation(user_id, "默认对话")
    return conv["id"] if conv else None


def get_messages_for_chat(user_id: int, limit: int = 20) -> list:
    """
    获取用户最新会话的最新消息，用于构建 AI 对话上下文
    """
    convs = get_conversations(user_id)
    if not convs:
        return []
    conv_id = convs[0]["id"]
    return get_messages(conv_id, user_id, limit)



if __name__ == '__main__':
    init_db()

    test_conversation_functions()

    # print("测试注册")
    # create_user("张三", "123456")
    # create_user("李四", "654321")
    # create_user("王五", "666666")
    #
    # print("测试查询")
    # user = get_user("张三")
    # print(f"查询结果：{user}")
    #
    # print("测试登录")
    # verify_user("张三", "123456") #应该验证成功
    # verify_user("张三", "654321") #应该验证失败






