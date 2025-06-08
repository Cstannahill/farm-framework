from pydantic import BaseModel

class Product(BaseModel):
    id: int
    name: str
    description: str | None = None
    price: float
    image: str | None = None
