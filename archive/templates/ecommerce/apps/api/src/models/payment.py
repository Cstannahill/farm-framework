from pydantic import BaseModel

class Payment(BaseModel):
    amount: float
    method: str
    token: str
