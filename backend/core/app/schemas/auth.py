from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class RegisterRequest(BaseModel):
    email: str
    name: str | None = None
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refreshToken: str


class OauthExchangeRequest(BaseModel):
    code: str


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: str


class RequestPasswordResetRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: str


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str


class RequestEmailChangeRequest(BaseModel):
    newEmail: str


class ConfirmEmailChangeRequest(BaseModel):
    token: str


class UpdateMeRequest(BaseModel):
    name: str | None = None
    avatarUrl: str | None = None


class DeleteAccountRequest(BaseModel):
    password: str | None = None


class SuccessResponse(BaseModel):
    success: bool = True
    message: str | None = None


class AuthTokens(BaseModel):
    accessToken: str
    refreshToken: str


class OauthExchangeResponse(AuthTokens):
    next: str = "/projects"


class SessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    user_agent: str | None = None
    ip_address: str | None = None
    last_used_at: datetime
    expires_at: datetime
    revoked_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserMeResponse(BaseModel):
    id: UUID
    email: str
    name: str | None = None
    image_url: str | None = None
    email_verified_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
