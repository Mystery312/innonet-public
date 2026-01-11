from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.postgres import get_db
from src.auth.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    AuthResponse,
    UserResponse,
    MessageResponse,
)
from src.auth.service import AuthService
from src.auth.dependencies import get_current_user
from src.auth.models import User

router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    try:
        user, access_token, refresh_token = await auth_service.register(data)
        return AuthResponse(
            user=UserResponse.model_validate(user),
            access_token=access_token,
            refresh_token=refresh_token,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=AuthResponse)
async def login(
    data: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    try:
        user, access_token, refresh_token = await auth_service.login(
            data.identifier, data.password
        )
        return AuthResponse(
            user=UserResponse.model_validate(user),
            access_token=access_token,
            refresh_token=refresh_token,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    auth_service = AuthService(db)
    try:
        access_token, refresh_token = await auth_service.refresh_tokens(data.refresh_token)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout", response_model=MessageResponse)
async def logout(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    auth_service = AuthService(db)
    await auth_service.logout(data.refresh_token)
    return MessageResponse(message="Successfully logged out")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
