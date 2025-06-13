from pydantic import BaseModel
from typing import List

class Order(BaseModel):
    id: int
    items: List[int]
    total: float
