# ADR 0001: NestJS as Backend Framework

**Status:** Accepted
**Date:** 2025-01-01
**Decided by:** Alessandro Garbiati

---

## Context

The Zenkai dashboard needs a backend API that:

- Handles authentication (JWT)
- Provides REST endpoints for tasks, members, comments, blocks
- Runs scheduled jobs (heartbeat cron, auto-pause)
- Connects to PostgreSQL via ORM
- Is TypeScript-first for type safety
- Is familiar to mid/senior Node.js developers

The team has TypeScript experience. The project is a portfolio piece targeting Staff Software Engineer roles, so the framework must demonstrate serious engineering decisions.

---

## Decision

Use **NestJS** as the backend framework.

NestJS provides:

- Decorator-based module system (familiar to Angular developers, enterprise-grade)
- Built-in dependency injection
- First-class TypeScript support
- `@nestjs/schedule` for cron jobs
- `@nestjs/passport` + `@nestjs/jwt` for auth
- `@nestjs/typeorm` for database integration
- `ValidationPipe` with `class-validator` for DTO validation
- Built-in testing utilities (`@nestjs/testing`)

---

## Consequences

### Positive

- Strong conventions reduce decision fatigue (where to put things)
- `@nestjs/testing` makes unit testing with dependency injection easy
- Decorator syntax makes the code readable and self-documenting
- Large ecosystem: guards, interceptors, pipes, filters
- Excellent documentation

### Negative

- More boilerplate than Express for simple endpoints
- Learning curve for developers unfamiliar with Angular-style DI
- Decorators are a TypeScript-specific feature (lock-in)

### Neutral

- Still runs on Express under the hood (can switch to Fastify if needed)

---

## Alternatives Considered

| Alternative  | Reason for rejection                                        |
| ------------ | ----------------------------------------------------------- |
| Express.js   | Too much manual wiring; no built-in DI or testing utilities |
| Fastify      | Less ecosystem maturity; fewer portfolio recognition points |
| Hono         | Too new; no built-in testing patterns yet                   |
| Bun + Elysia | Bleeding edge; potential compatibility issues with TypeORM  |

---

## References

- [NestJS Documentation](https://docs.nestjs.com/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
