from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import User

# tokenUrl dipakai tombol "Authorize" di Swagger (/docs)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

_credentials_error = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Token tidak valid atau sudah kedaluwarsa",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    sub = decode_access_token(token)
    if sub is None or not sub.isdigit():
        raise _credentials_error
    user = db.get(User, int(sub))
    if user is None or not user.is_active:
        raise _credentials_error
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Untuk endpoint Admin Dashboard nanti."""
    if current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Hanya admin yang boleh mengakses")
    return current_user
