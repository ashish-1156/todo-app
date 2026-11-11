
from backend.database import test_connection

if __name__ == "__main__":
    try:
        test_connection()
    except Exception as error:
        print("MySQL connection failed!")
        print("Error:", error)
