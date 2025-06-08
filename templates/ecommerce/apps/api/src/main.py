from fastapi import FastAPI
from routes.products import router as products_router
from routes.cart import router as cart_router
from routes.orders import router as orders_router
from routes.payments import router as payments_router
from routes.admin import router as admin_router

app = FastAPI(title="{{projectName}} API")

app.include_router(products_router, prefix="/api")
app.include_router(cart_router, prefix="/api")
app.include_router(orders_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(admin_router, prefix="/api/admin")
