from fastapi import APIRouter
from models.cart import CartItem

router = APIRouter(prefix="/cart", tags=["cart"])

cart: list[CartItem] = []

@router.get("/")
def get_cart():
    return cart

@router.post("/")
def add_to_cart(item: CartItem):
    cart.append(item)
    return item

@router.delete("/{item_id}")
def remove_from_cart(item_id: int):
    global cart
    cart = [i for i in cart if i.id != item_id]
    return {"removed": item_id}
