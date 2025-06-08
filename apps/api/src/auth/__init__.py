"""Authentication package"""

from .services.auth import AuthService
from .dependencies import get_auth_service

__all__ = ["AuthService", "get_auth_service"]

