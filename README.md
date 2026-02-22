# Zenkai — Team Activity Dashboard

[![CI](https://github.com/agarbiati/zenkai/actions/workflows/ci.yml/badge.svg)](https://github.com/agarbiati/zenkai/actions/workflows/ci.yml)
[![Security](https://github.com/agarbiati/zenkai/actions/workflows/security.yml/badge.svg)](https://github.com/agarbiati/zenkai/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A daily Kanban board for small teams — built to replace the complexity of ClickUp/Jira with something a team can actually understand and use.

**Visual style:** Hand-drawn (Excalidraw-like), post-it cards, paper and pen aesthetic.

---

## Features

- **Real-time activity board** — See who's working on what, right now
- **Auto time tracking** — Time entries start/stop automatically with task state changes
- **Block/flag system** — Mark tasks as blocked with a required reason; resolution required to unblock
- **Heartbeat presence** — Members show as active/inactive based on browser activity
- **Multi-tenancy** — Organizations with invite-based membership
- **i18n** — Portuguese (pt-BR) and English (en-US)
- **Estimated hours** — Optional time estimates with predicted completion dates
- **Work schedule** — Configurable per-member work schedules

---

## Quick Start

```bash
# 1. Clone and start everything with Docker
git clone https://github.com/agarbiati/zenkai.git
cd zenkai
docker compose up --build

# 2. Seed the database (7 team members + sample tasks)
docker compose exec backend npm run seed

# 3. Open the dashboard
open http://localhost:3000
```

**Login:** Use the seeded admin account (see `.env.example` for details).
All seeded members must change their password on first login.

---

## Development Setup

```bash
# Prerequisites: Node.js 20+, PostgreSQL 15+

# Backend (NestJS — port 3001)
cd backend
cp .env.example .env   # Edit with your DB credentials
npm install
npm run start:dev

# Frontend (Next.js — port 3000)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

---

## Testing

```bash
# Backend unit + integration tests
cd backend && npm test

# With coverage report
cd backend && npm run test:coverage

# Frontend
cd frontend && npm test
```

---

## Architecture

```
zenkai/
├── backend/          NestJS 11 API (port 3001)
│   └── src/
│       ├── auth/       JWT authentication
│       ├── tasks/      Task lifecycle + time tracking
│       ├── heartbeat/  Presence + auto-pause cron
│       └── ...
├── frontend/         Next.js 14 App Router (port 3000)
│   └── app/
│       ├── dashboard/  Main Kanban board
│       ├── profile/    User profile + stats
│       └── ...
└── docs/
    ├── BUSINESS_RULES.md   Canonical business rules
    ├── adr/                Architecture Decision Records
    └── CONTRIBUTING.md     Development guide
```

**Stack:** NestJS + TypeORM + PostgreSQL | Next.js 14 + Tailwind CSS + next-intl | Docker Compose

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

---

## Documentation

- [Business Rules](docs/BUSINESS_RULES.md) — Task lifecycle, time tracking rules
- [Architecture Decisions](docs/adr/) — Why we made the technical choices we did
- [Contributing Guide](docs/CONTRIBUTING.md) — TDD workflow, branch strategy, PR process
- [Roadmap](docs/ROADMAP.md) — What's planned for upcoming releases

---

## Pre-seeded Team Members

The seed script creates 7 team members (1 admin + 6 members). Usernames and the default password are configured in `backend/src/seed.ts`. All members must change their password on first login.

---

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for the full contribution guide including:

- TDD workflow
- Branch naming conventions
- Commit message format (Conventional Commits)
- PR checklist

---

## License

MIT © Alessandro Garbiati
