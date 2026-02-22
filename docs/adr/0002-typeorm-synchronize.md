# ADR 0002: TypeORM synchronize:true in Development Only

**Status:** Accepted
**Date:** 2025-01-01
**Decided by:** Alessandro Garbiati

---

## Context

TypeORM offers two approaches to keep the database schema in sync with entity definitions:

1. **`synchronize: true`** — TypeORM auto-creates/alters tables on startup to match entities
2. **Migrations** — Explicit SQL files that describe schema changes, run in sequence

The project currently uses `synchronize: true`. This is convenient for rapid development but dangerous in production because:

- A typo in an entity can drop a column with real user data
- Schema changes are not versioned or reviewable
- Rollback is not possible without manual intervention

---

## Decision

**`synchronize: true` is acceptable in development only.**

For production:

- `synchronize: false` must be set
- All schema changes must go through TypeORM migrations:
  ```bash
  npm run migration:generate -- src/migrations/MigrationName
  npm run migration:run
  npm run migration:revert  # rollback
  ```

Current state: The project has not been deployed to production. When production deployment is planned, create ADR 0005 with the migration strategy and implementation plan.

---

## Consequences

### Positive

- Development remains fast — no need to write migrations for every iteration
- Entities are the single source of truth for schema shape
- Acceptable risk during development/prototype phase

### Negative

- **Production risk**: synchronize:true on prod could destroy data
- Technical debt: migrations need to be written before first production deploy
- Developers must remember to disable synchronize before deploying

### Mitigation

- `app.module.ts` reads `synchronize` from env: `synchronize: process.env.NODE_ENV !== 'production'`
- `.env.example` documents `NODE_ENV=development`
- This ADR serves as the reminder

---

## Alternatives Considered

| Alternative           | Reason for rejection                                                           |
| --------------------- | ------------------------------------------------------------------------------ |
| Migrations from day 1 | Too much friction for rapid prototyping; schema changes multiple times per day |
| Prisma Migrate        | Would require replacing TypeORM entirely — different trade-offs                |

---

## References

- [TypeORM Migrations](https://typeorm.io/migrations)
- [ADR 0001: NestJS Framework](0001-nestjs-framework.md)
- Future: `docs/adr/0005-typeorm-production-migrations.md` (to be created pre-launch)
