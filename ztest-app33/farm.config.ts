import { defineConfig } from '@farm/core'; export default defineConfig({ name: 'ztest-app33',
template: 'basic', features: [], database: { type: 'mongodb', url:
process.env.DATABASE_URL || 'mongodb://localhost:27017/ztest-app33' },


development: { ports: {
  frontend:
  3000,
backend:
8000
} } });