# Kaffekollektivet

Private coffee ordering app for coordinating wholesale coffee rounds.

## Development

```bash
bun install
cp .env.example .env
bun run db:migrate
bun run db:seed
bun run dev
```

## Required environment variables

- `DATABASE_URL`
- `CUSTOMER_PASSWORD`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
