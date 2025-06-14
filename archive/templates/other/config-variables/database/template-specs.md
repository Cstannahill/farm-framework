# Database Configuration

**MongoDB (Default):**

```typescript
// farm.config.ts
export default defineConfig({
  database: {
    type: "mongodb",
    url: process.env.MONGODB_URL || "mongodb://localhost:27017/farmapp",
  },
});
```

**PostgreSQL:**

```typescript
export default defineConfig({
  database: {
    type: "postgresql",
    url: process.env.DATABASE_URL || "postgresql://user:pass@localhost/farmapp",
  },
});
```
