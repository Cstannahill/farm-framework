from fastapi import APIRouter
from models.product import Product
from models.order import Order

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/products")
def admin_products() -> list[Product]:
    # fetch products from db
    return []

@router.get("/orders")
def admin_orders() -> list[Order]:
    # fetch orders from db
    return []
