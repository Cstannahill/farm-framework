from fastapi import APIRouter
from models.order import Order

router = APIRouter(prefix="/orders", tags=["orders"])

orders: list[Order] = []

@router.post("/")
def create_order(order: Order):
    orders.append(order)
    return order

@router.get("/")
def list_orders():
    return orders
