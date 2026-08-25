"""Clean database script.

Wipes all data from the database and leaves only the admin user account (admin / admin123).
Run from the Backend/ directory:
    python -m scripts.clean_db
"""

from app.database import Base, SessionLocal, engine
from app.models import User
from app.models.enums import UserRole
from app.schemas.user import UserCreate
from app.services.user_service import UserService


def main() -> None:
    print("Dropping all existing tables...")
    Base.metadata.drop_all(bind=engine)

    print("Recreating database tables schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Creating admin user (admin / admin123)...")
        user_svc = UserService(db)
        user_svc.create(
            UserCreate(
                username="admin",
                email="admin@djaber.com",
                password="admin123",
                role=UserRole.admin,
            )
        )
        db.commit()
        print("Database successfully cleaned!")
        print("  Username: admin")
        print("  Password: admin123")
        print("  Role: admin")
    except Exception as e:
        db.rollback()
        print(f"Error seeding admin user: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
