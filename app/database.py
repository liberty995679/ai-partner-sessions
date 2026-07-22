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


if __name__ == '__main__':
    init_db()
    clean_duplicates()
    #
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






