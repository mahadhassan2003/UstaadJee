import sqlite3
conn = sqlite3.connect('ustaadjee_chat.db')
conn.execute("DELETE FROM frontend_messages WHERE session_id = 'demo-session'")
conn.commit()
print("Cleaned up demo-session")
