from fastapi import APIRouter
from models.product import Product

router = APIRouter(prefix="/products", tags=["products"])

products_db: list[Product] = []

@router.get("/")
def list_products():
    return products_db

@router.post("/")
def create_product(product: Product):
    products_db.append(product)
    return product
