# Filtermalerlosjen

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

## Optional notification variables

Email notifications use Resend and are skipped unless both Resend values are set:

- `APP_URL` - public app URL used in order links
- `RESEND_API_KEY`
- `NOTIFICATION_FROM` - e.g. `Filtermalerlosjen <kaffe@example.com>`
- `NOTIFICATION_REPLY_TO` - optional reply-to address
- `NOTIFICATION_RECIPIENT_WHITELIST` - optional comma-separated delivery sandbox. If set, notifications to non-whitelisted customer addresses are sent to the first whitelisted address instead.
