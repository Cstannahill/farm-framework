"""Dependency helpers for auth"""
import os
from fastapi import Depends

from .services.auth import AuthService


def get_auth_service() -> AuthService:
    secret = os.getenv("APP_SECRET_KEY", "change_me")
    return AuthService(secret)

