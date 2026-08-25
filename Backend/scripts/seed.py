"""Seed script for local development.

Creates: an admin user and empty tables.
Run from the db/ directory:
    python -m scripts.seed
"""

from app.database import Base, SessionLocal, engine
from app.models import User
from app.models.enums import UserRole
from app.repositories.users import UserRepository
from app.schemas.user import UserCreate
from app.services.user_service import UserService


def main() -> None:
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if UserRepository(db).get_by_username("admin"):
            print("Database already seeded. Skipping.")
            return

        print("Seeding admin user...")
        user_svc = UserService(db)
        user_svc.create(
            UserCreate(username="admin", email="admin@djaber.com", password="admin123", role=UserRole.admin)
        )

        db.commit()
        print("\nSeeding complete.")
        print("  admin / admin123  (role: admin)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
