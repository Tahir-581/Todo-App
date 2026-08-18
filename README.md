# Todo App

Full-stack **task management** app with drag-and-drop boards, auth, scheduled reports, and optional **WhatsApp** notifications.

## Stack

- **Next.js 14** (App Router), TypeScript, Tailwind
- **Prisma** + PostgreSQL
- **NextAuth** credentials provider
- **@dnd-kit** for kanban-style ordering
- **Recharts** for progress analytics
- **Python** `whatsapp_bot.py` (Selenium) for WhatsApp messaging

## Setup

```bash
pnpm install
cp .env.example .env
# DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL (default port 3111)
pnpm db:push
pnpm dev
```

App runs at **http://localhost:3111** (includes cron poller for daily digest).

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | Session auth |
| `CRON_SECRET` | Secures `/api/cron/*` routes |
| `SMTP_*` | Email for daily reports (Ethereal/Gmail/Resend) |

## WhatsApp bot (optional)

```bash
python whatsapp_bot.py
```

Configure `WHATSAPP_BOT_SCRIPT`, `WHATSAPP_PYTHON` in `.env` if needed.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js + cron poller |
| `pnpm build` | Production build |
| `pnpm db:studio` | Prisma Studio |

## Deploy

`vercel.json` included for Vercel deployment — set env vars in the project dashboard.

## License

Private project.
