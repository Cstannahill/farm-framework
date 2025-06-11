# Authentication Feature (`--features auth`)

**Adds to any template:**

```plaintext
├── apps/
│   ├── web/src/
│   │   ├── components/auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── UserProfile.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useUser.ts
│   │   └── stores/
│   │       └── authStore.ts
│   └── api/src/
│       ├── routes/
│       │   ├── auth.py
│       │   └── users.py
│       ├── models/
│       │   ├── user.py
│       │   └── token.py
│       └── auth/
│           ├── __init__.py
│           ├── jwt.py
│           ├── oauth.py
│           └── middleware.py
```
