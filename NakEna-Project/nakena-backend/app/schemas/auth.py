import re

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


def validate_password(
    password: str, email: str | None = None, username: str | None = None
) -> str:
    if not 8 <= len(password) <= 64:
        raise ValueError("Password harus berisi 8 sampai 64 karakter")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password harus mengandung minimal satu huruf besar")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password harus mengandung minimal satu huruf kecil")
    if not re.search(r"[0-9]", password):
        raise ValueError("Password harus mengandung minimal satu angka")
    if email and password.casefold() == email.casefold():
        raise ValueError("Password tidak boleh sama dengan email")
    if username and password.casefold() == username.casefold():
        raise ValueError("Password tidak boleh sama dengan username")
    return password


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)
    full_name: str = Field(min_length=1, max_length=100)

    @field_validator("password")
    @classmethod
    def _password_ok(cls, value: str) -> str:
        return validate_password(value)

    @model_validator(mode="after")
    def _password_not_email(self):
        validate_password(self.password, str(self.email), self.full_name)
        return self

    @field_validator("full_name")
    @classmethod
    def _name_strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Nama tidak boleh kosong")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # detik
