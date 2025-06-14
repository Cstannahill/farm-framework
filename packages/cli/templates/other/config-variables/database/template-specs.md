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

**MySQL:**

```typescript
export default defineConfig({
  database: {
    type: "mysql",
    url: process.env.DATABASE_URL || "mysql://user:pass@localhost/farmapp",
  },
});
```

**SQLite:**

```typescript
export default defineConfig({
  database: {
    type: "sqlite",
    url: process.env.DATABASE_URL || "sqlite:///./farmapp.db",
  },
});
```

**SQL Server:**

```typescript
export default defineConfig({
  database: {
    type: "sqlserver",
    url:
      process.env.DATABASE_URL ||
      "mssql+pyodbc://user:pass@localhost/farmapp?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes",
  },
});
```
