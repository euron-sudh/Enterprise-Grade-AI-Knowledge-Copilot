from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserOut(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    avatarUrl: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_user(cls, user) -> "UserOut":
        return cls(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role.value if hasattr(user.role, "value") else user.role,
            avatarUrl=user.avatar_url,
            createdAt=user.created_at,
            updatedAt=user.updated_at,
        )


class AuthResponse(BaseModel):
    accessToken: str
    refreshToken: str
    user: UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)


class LogoutRequest(BaseModel):
    refreshToken: str


class RefreshRequest(BaseModel):
    refreshToken: str


class UpdateMeRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    avatarUrl: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str = Field(..., min_length=8)


class PasswordResetRequestBody(BaseModel):
    email: EmailStr


class PasswordResetConfirmBody(BaseModel):
    token: str
    newPassword: str = Field(..., min_length=8)


class OAuthLoginRequest(BaseModel):
    email: EmailStr
    name: str
    provider: str  # "google" | "azure-ad"
    avatarUrl: Optional[str] = None
