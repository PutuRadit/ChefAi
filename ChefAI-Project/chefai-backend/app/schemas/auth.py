from pydantic import BaseModel, EmailStr, Field, field_validator


def _check_password_bytes(v: str) -> str:
    # bcrypt hanya memproses 72 byte pertama
    if len(v.encode("utf-8")) > 72:
        raise ValueError("Password maksimal 72 byte")
    return v


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, max_length=100)

    @field_validator("password")
    @classmethod
    def _password_ok(cls, v: str) -> str:
        return _check_password_bytes(v)

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
