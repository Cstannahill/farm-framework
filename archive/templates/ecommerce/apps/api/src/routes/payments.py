from fastapi import APIRouter
from models.payment import Payment

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/process")
def process_payment(payment: Payment):
    # integrate with stripe or paypal
    return {"status": "processed"}
