# 4. E-commerce Template (`--template ecommerce`)

**Description:** E-commerce platform with products, cart, and payment processing.

**Additional Structure:**

```plaintext

├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── components/
│   │       │   ├── products/
│   │       │   │   ├── ProductGrid.tsx
│   │       │   │   ├── ProductCard.tsx
│   │       │   │   └── ProductDetail.tsx
│   │       │   ├── cart/
│   │       │   │   ├── CartSidebar.tsx
│   │       │   │   ├── CartItem.tsx
│   │       │   │   └── CartSummary.tsx
│   │       │   ├── checkout/
│   │       │   │   ├── CheckoutForm.tsx
│   │       │   │   ├── PaymentForm.tsx
│   │       │   │   └── OrderSummary.tsx
│   │       │   └── admin/
│   │       │       ├── ProductManager.tsx
│   │       │       └── OrderManager.tsx
│   │       └── stores/
│   │           ├── productStore.ts
│   │           ├── cartStore.ts
│   │           └── orderStore.ts
│   └── api/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── products.py
│       │   │   ├── cart.py
│       │   │   ├── orders.py
│       │   │   ├── payments.py
│       │   │   └── admin.py
│       │   ├── models/
│       │   │   ├── product.py
│       │   │   ├── cart.py
│       │   │   ├── order.py
│       │   │   └── payment.py
│       │   ├── payments/
│       │   │   ├── __init__.py
│       │   │   ├── stripe_client.py
│       │   │   └── paypal_client.py
│       │   └── inventory/
│       │       ├── __init__.py
│       │       └── management.py
│       └── uploads/              # Product images
│           └── .gitkeep
```

**Additional Dependencies:**

- **Frontend:** Payment UI components, image galleries
- **Backend:** Stripe SDK, PayPal SDK, image processing libraries

---
