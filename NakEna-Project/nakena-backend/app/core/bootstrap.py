from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import hash_password
from app.models import User, UserPreference
from app.schemas.auth import validate_password


def seed_admin_user(db: Session, config: Settings) -> None:
    if config.admin_email is None and config.admin_password is None:
        return
    if config.admin_email is None or config.admin_password is None:
        raise ValueError("ADMIN_EMAIL dan ADMIN_PASSWORD harus diisi bersama.")

    email = str(config.admin_email).strip().lower()
    password = config.admin_password.get_secret_value()
    validate_password(password, email, "Admin")
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        db.add(
            User(
                email=email,
                full_name="Admin",
                hashed_password=hash_password(password),
                role="admin",
                preference=UserPreference(),
            )
        )
    else:
        user.role = "admin"
    db.commit()
