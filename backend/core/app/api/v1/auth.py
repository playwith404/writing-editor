import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.core.security import create_jwt_token, decode_jwt_token, hash_password, verify_password
from app.models.account import Account
from app.models.session import UserSession
from app.models.user import User
from app.models.verification_token import VerificationToken
from app.services.mailer import send_email
from app.schemas.auth import (
    AuthTokens,
    ChangePasswordRequest,
    ConfirmEmailChangeRequest,
    DeleteAccountRequest,
    LoginRequest,
    OauthExchangeRequest,
    OauthExchangeResponse,
    RefreshRequest,
    RegisterRequest,
    RequestEmailChangeRequest,
    RequestPasswordResetRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SessionResponse,
    SuccessResponse,
    UpdateMeRequest,
    UserMeResponse,
    VerifyEmailRequest,
)

router = APIRouter()


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _token_hash(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _extract_request_meta(request: Request) -> tuple[str | None, str | None]:
    user_agent = request.headers.get("user-agent")
    client_ip = request.client.host if request.client else None
    return user_agent, client_ip


def _create_auth_tokens(
    db: Session,
    user_id: UUID,
    request: Request,
    existing_session: UserSession | None = None,
) -> AuthTokens:
    now = _now_utc()
    session_exp = now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    user_agent, client_ip = _extract_request_meta(request)

    if existing_session is None:
        session = UserSession(
            user_id=user_id,
            refresh_token_hash="",
            expires_at=session_exp,
            user_agent=user_agent,
            ip_address=client_ip,
            last_used_at=now,
        )
        db.add(session)
        db.flush()
    else:
        session = existing_session
        session.expires_at = session_exp
        session.user_agent = user_agent
        session.ip_address = client_ip
        session.last_used_at = now
        session.revoked_at = None

    access = create_jwt_token(
        {"sub": str(user_id), "typ": "access", "sid": str(session.id)},
        secret=settings.JWT_SECRET,
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh = create_jwt_token(
        {"sub": str(user_id), "typ": "refresh", "sid": str(session.id)},
        secret=settings.JWT_SECRET,
        expires_delta=timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    )
    session.refresh_token_hash = _token_hash(refresh)

    db.commit()
    return AuthTokens(accessToken=access, refreshToken=refresh)


def _create_one_time_token(
    db: Session,
    user_id: UUID,
    token_type: str,
    expires_minutes: int,
    payload: dict | None = None,
) -> str:
    raw = secrets.token_urlsafe(32)
    token = VerificationToken(
        user_id=user_id,
        token_hash=_token_hash(raw),
        token_type=token_type,
        payload=json.dumps(payload, ensure_ascii=True) if payload else None,
        expires_at=_now_utc() + timedelta(minutes=expires_minutes),
    )
    db.add(token)
    db.commit()
    return raw


def _frontend_link(path: str, token: str, next_path: str = "/projects") -> str:
    base = settings.APP_BASE_URL.rstrip("/")
    return f"{base}{path}?token={token}&next={next_path}"


def _safe_next_path(value: str | None) -> str:
    if not value:
        return "/projects"
    if not value.startswith("/") or value.startswith("//"):
        return "/projects"
    return value


def _get_valid_one_time_token(db: Session, raw_token: str, token_type: str) -> VerificationToken | None:
    now = _now_utc()
    return (
        db.query(VerificationToken)
        .filter(
            VerificationToken.token_hash == _token_hash(raw_token),
            VerificationToken.token_type == token_type,
            VerificationToken.used_at.is_(None),
            VerificationToken.expires_at > now,
        )
        .first()
    )


@router.post("/register", response_model=AuthTokens | SuccessResponse, tags=["0. 인증 (Auth)"])
def register(body: RegisterRequest, request: Request, db: Session = Depends(deps.get_db)):
    existing = db.query(User).filter(User.email == body.email, User.deleted_at.is_(None)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 가입된 이메일입니다.")

    user = User(email=body.email, name=body.name, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    if settings.EMAIL_VERIFICATION_ENABLED:
        verify_token = _create_one_time_token(db, user.id, token_type="email_verify", expires_minutes=30)
        verify_link = _frontend_link("/verify-email", verify_token)
        send_email(
            to_email=user.email,
            subject="[Gleey] 이메일 인증 안내",
            text_body=f"아래 링크로 이메일 인증을 완료하세요:\n{verify_link}",
        )
        return SuccessResponse(success=True, message="인증 메일을 발송했습니다. 메일함을 확인해 주세요.")
    user.email_verified_at = _now_utc()
    db.commit()
    return _create_auth_tokens(db, user.id, request=request)


@router.post("/login", response_model=AuthTokens, tags=["0. 인증 (Auth)"])
def login(body: LoginRequest, request: Request, db: Session = Depends(deps.get_db)):
    user = db.query(User).filter(User.email == body.email, User.deleted_at.is_(None)).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
    if settings.EMAIL_VERIFICATION_ENABLED and user.email_verified_at is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이메일 인증이 필요합니다.")
    return _create_auth_tokens(db, user.id, request=request)


@router.post("/refresh", response_model=AuthTokens, tags=["0. 인증 (Auth)"])
def refresh_tokens(body: RefreshRequest, request: Request, db: Session = Depends(deps.get_db)):
    try:
        payload = decode_jwt_token(body.refreshToken, settings.JWT_SECRET)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 리프레시 토큰입니다.")

    if payload.get("typ") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="잘못된 토큰 타입입니다.")

    try:
        user_id = UUID(str(payload.get("sub")))
        session_id = UUID(str(payload.get("sid")))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="토큰 사용자 정보가 올바르지 않습니다.")

    session = (
        db.query(UserSession)
        .filter(
            UserSession.id == session_id,
            UserSession.user_id == user_id,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > _now_utc(),
        )
        .first()
    )
    if not session or session.refresh_token_hash != _token_hash(body.refreshToken):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 세션입니다.")

    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자를 찾을 수 없습니다.")
    return _create_auth_tokens(db, user.id, request=request, existing_session=session)


@router.get("/me", response_model=UserMeResponse, tags=["0. 인증 (Auth)"])
def me(current_user: User = Depends(deps.get_current_user)):
    return current_user


@router.patch("/me", response_model=UserMeResponse, tags=["0. 인증 (Auth)"])
def update_me(
    body: UpdateMeRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if body.name is not None:
        current_user.name = body.name
    if body.avatarUrl is not None:
        current_user.image_url = body.avatarUrl
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/sessions", response_model=list[SessionResponse], tags=["0. 인증 (Auth)"])
def list_sessions(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    return (
        db.query(UserSession)
        .filter(UserSession.user_id == current_user.id)
        .order_by(UserSession.created_at.desc())
        .all()
    )


@router.delete("/sessions/{session_id}", response_model=SuccessResponse, tags=["0. 인증 (Auth)"])
def revoke_session(
    session_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    session = db.query(UserSession).filter(UserSession.id == session_id, UserSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="세션을 찾을 수 없습니다.")
    session.revoked_at = _now_utc()
    db.commit()
    return SuccessResponse(success=True, message="세션이 해제되었습니다.")


@router.post("/logout", response_model=SuccessResponse, tags=["0. 인증 (Auth)"])
def logout(
    db: Session = Depends(deps.get_db),
    auth_context: deps.AuthContext = Depends(deps.get_auth_context),
):
    sid_raw = auth_context.token_payload.get("sid")
    if sid_raw:
        try:
            sid = UUID(str(sid_raw))
            session = (
                db.query(UserSession)
                .filter(UserSession.id == sid, UserSession.user_id == auth_context.user.id, UserSession.revoked_at.is_(None))
                .first()
            )
            if session:
                session.revoked_at = _now_utc()
                db.commit()
        except ValueError:
            pass
    return SuccessResponse(success=True, message="로그아웃되었습니다.")


@router.post("/verify-email", response_model=AuthTokens, tags=["0. 인증 (Auth)"])
def verify_email(body: VerifyEmailRequest, request: Request, db: Session = Depends(deps.get_db)):
    token = _get_valid_one_time_token(db, body.token, "email_verify")
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 인증 토큰입니다.")

    user = db.query(User).filter(User.id == token.user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")

    user.email_verified_at = user.email_verified_at or _now_utc()
    token.used_at = _now_utc()
    db.commit()
    return _create_auth_tokens(db, user.id, request=request)


@router.post("/resend-verification", response_model=SuccessResponse, tags=["0. 인증 (Auth)"])
def resend_verification(body: ResendVerificationRequest, db: Session = Depends(deps.get_db)):
    user = db.query(User).filter(User.email == body.email, User.deleted_at.is_(None)).first()
    if user:
        token = _create_one_time_token(db, user.id, token_type="email_verify", expires_minutes=30)
        verify_link = _frontend_link("/verify-email", token)
        send_email(
            to_email=user.email,
            subject="[Gleey] 이메일 인증 링크 재발송",
            text_body=f"아래 링크를 눌러 이메일 인증을 완료하세요:\n{verify_link}",
        )
    return SuccessResponse(success=True, message="인증 메일 재발송 요청이 접수되었습니다.")


@router.post("/request-password-reset", response_model=SuccessResponse, tags=["0. 인증 (Auth)"])
def request_password_reset(body: RequestPasswordResetRequest, db: Session = Depends(deps.get_db)):
    user = db.query(User).filter(User.email == body.email, User.deleted_at.is_(None)).first()
    if user:
        token = _create_one_time_token(db, user.id, token_type="password_reset", expires_minutes=30)
        reset_link = _frontend_link("/reset-password", token, next_path="/login")
        send_email(
            to_email=user.email,
            subject="[Gleey] 비밀번호 재설정 안내",
            text_body=f"아래 링크에서 새 비밀번호를 설정하세요:\n{reset_link}",
        )
    return SuccessResponse(success=True, message="비밀번호 재설정 요청이 접수되었습니다.")


@router.post("/reset-password", response_model=SuccessResponse, tags=["0. 인증 (Auth)"])
def reset_password(body: ResetPasswordRequest, db: Session = Depends(deps.get_db)):
    token = _get_valid_one_time_token(db, body.token, "password_reset")
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 재설정 토큰입니다.")

    user = db.query(User).filter(User.id == token.user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")

    user.password_hash = hash_password(body.newPassword)
    token.used_at = _now_utc()
    db.commit()
    return SuccessResponse(success=True, message="비밀번호가 변경되었습니다.")


@router.post("/change-password", response_model=SuccessResponse, tags=["0. 인증 (Auth)"])
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if not verify_password(body.currentPassword, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="현재 비밀번호가 올바르지 않습니다.")
    current_user.password_hash = hash_password(body.newPassword)
    db.commit()
    return SuccessResponse(success=True, message="비밀번호가 변경되었습니다.")


@router.post("/request-email-change", response_model=SuccessResponse, tags=["0. 인증 (Auth)"])
def request_email_change(
    body: RequestEmailChangeRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if body.newEmail == current_user.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="현재 이메일과 동일합니다.")
    exists = db.query(User).filter(User.email == body.newEmail, User.deleted_at.is_(None)).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 이메일입니다.")

    token = _create_one_time_token(
        db,
        user_id=current_user.id,
        token_type="email_change",
        expires_minutes=30,
        payload={"new_email": body.newEmail},
    )
    confirm_link = _frontend_link("/confirm-email-change", token)
    send_email(
        to_email=body.newEmail,
        subject="[Gleey] 이메일 변경 확인",
        text_body=f"아래 링크를 눌러 이메일 변경을 완료하세요:\n{confirm_link}",
    )
    return SuccessResponse(success=True, message="이메일 변경 확인 요청이 접수되었습니다.")


@router.post("/confirm-email-change", response_model=AuthTokens, tags=["0. 인증 (Auth)"])
def confirm_email_change(body: ConfirmEmailChangeRequest, request: Request, db: Session = Depends(deps.get_db)):
    token = _get_valid_one_time_token(db, body.token, "email_change")
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 이메일 변경 토큰입니다.")

    user = db.query(User).filter(User.id == token.user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")

    payload = json.loads(token.payload or "{}")
    new_email = payload.get("new_email")
    if not isinstance(new_email, str) or not new_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="토큰에 이메일 정보가 없습니다.")

    exists = db.query(User).filter(User.email == new_email, User.id != user.id, User.deleted_at.is_(None)).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 이메일입니다.")

    user.email = new_email
    token.used_at = _now_utc()
    db.commit()
    return _create_auth_tokens(db, user.id, request=request)


@router.post("/delete-account", response_model=SuccessResponse, tags=["0. 인증 (Auth)"])
def delete_account(
    body: DeleteAccountRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if current_user.password_hash:
        if not body.password or not verify_password(body.password, current_user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="비밀번호가 올바르지 않습니다.")

    now = _now_utc()
    current_user.deleted_at = now
    (
        db.query(UserSession)
        .filter(UserSession.user_id == current_user.id, UserSession.revoked_at.is_(None))
        .update({"revoked_at": now}, synchronize_session=False)
    )
    db.commit()
    return SuccessResponse(success=True, message="계정이 삭제되었습니다.")


@router.get("/google", tags=["0. 인증 (Auth)"])
def google_login(next: str = Query("/projects")):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_REDIRECT_URI:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Google OAuth 설정이 누락되었습니다.")

    next_path = _safe_next_path(next)
    state = create_jwt_token(
        {"typ": "oauth_state", "next": next_path},
        secret=settings.JWT_SECRET,
        expires_delta=timedelta(minutes=10),
    )

    params = urlencode(
        {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
    )
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}", status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/google/callback", tags=["0. 인증 (Auth)"])
async def google_callback(
    request: Request,
    code: str = Query(...),
    state: str | None = Query(None),
    db: Session = Depends(deps.get_db),
):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET or not settings.GOOGLE_REDIRECT_URI:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Google OAuth 설정이 누락되었습니다.")

    async with httpx.AsyncClient(timeout=10.0) as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_res.status_code >= 400:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google 토큰 교환에 실패했습니다.")
        token_data = token_res.json()

        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google 액세스 토큰이 없습니다.")

        userinfo_res = await client.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_res.status_code >= 400:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google 사용자 정보 조회에 실패했습니다.")
        profile = userinfo_res.json()

    email = profile.get("email")
    provider_id = profile.get("sub")
    name = profile.get("name")
    picture = profile.get("picture")
    email_verified = bool(profile.get("email_verified"))
    if not email or not provider_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google 사용자 정보가 올바르지 않습니다.")

    user = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()
    if not user:
        user = User(
            email=email,
            name=name,
            image_url=picture,
            password_hash=None,
            email_verified_at=_now_utc() if email_verified else None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif email_verified and user.email_verified_at is None:
        user.email_verified_at = _now_utc()
        db.commit()

    account = db.query(Account).filter(Account.provider_id == provider_id).first()
    expires_in = token_data.get("expires_in")
    expires_at = None
    if isinstance(expires_in, int):
        expires_at = _now_utc() + timedelta(seconds=expires_in)

    if not account:
        account = Account(user_id=user.id, provider="google", provider_id=provider_id)
        db.add(account)

    account.user_id = user.id
    account.access_token = token_data.get("access_token")
    account.refresh_token = token_data.get("refresh_token")
    account.expires_at = expires_at
    account.token_type = token_data.get("token_type")
    account.scope = token_data.get("scope")
    account.id_token = token_data.get("id_token")

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 다른 계정에 연결된 Google 계정입니다.")

    next_path = "/projects"
    if state:
        try:
            state_payload = decode_jwt_token(state, settings.JWT_SECRET)
            if state_payload.get("typ") == "oauth_state":
                next_path = _safe_next_path(str(state_payload.get("next") or "/projects"))
        except ValueError:
            next_path = "/projects"

    oauth_code = _create_one_time_token(
        db,
        user_id=user.id,
        token_type="oauth_login",
        expires_minutes=5,
        payload={"next": next_path},
    )
    redirect_url = f"{settings.APP_BASE_URL.rstrip('/')}/oauth-google-callback?code={oauth_code}"
    return RedirectResponse(redirect_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.post("/oauth/exchange", response_model=OauthExchangeResponse, tags=["0. 인증 (Auth)"])
def oauth_exchange(body: OauthExchangeRequest, request: Request, db: Session = Depends(deps.get_db)):
    token = _get_valid_one_time_token(db, body.code, "oauth_login")
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 OAuth 코드입니다.")

    user = db.query(User).filter(User.id == token.user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")

    payload = json.loads(token.payload or "{}")
    next_path = _safe_next_path(str(payload.get("next") or "/projects"))

    token.used_at = _now_utc()
    db.commit()
    auth_tokens = _create_auth_tokens(db, user.id, request=request)
    return OauthExchangeResponse(
        accessToken=auth_tokens.accessToken,
        refreshToken=auth_tokens.refreshToken,
        next=next_path,
    )
