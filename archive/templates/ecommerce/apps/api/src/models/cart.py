from pydantic import BaseModel

class CartItem(BaseModel):
    id: int
    name: str
    price: float
    quantity: int
