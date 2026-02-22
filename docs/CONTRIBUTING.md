# Contributing to Zenkai

This guide covers the complete development workflow for contributors and AI agents.

---

## Quick Setup

```bash
# Docker (recommended)
docker compose up --build
# Seed: docker compose exec backend npm run seed

# Local development
cd backend && cp .env.example .env && npm install && npm run start:dev
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

---

## TDD Workflow

All new features and non-trivial bug fixes must follow TDD:

### The Red → Green → Refactor Cycle

```bash
# 1. RED — Write failing test FIRST
cd backend
# Create src/module/module.service.spec.ts
# Write test describing expected behavior
npm test -- --testPathPattern="module.service" --watch
# Verify test fails ✗

# 2. GREEN — Write minimum code to pass
# Implement only what the test requires (YAGNI)
# Run tests again → all pass ✓

# 3. REFACTOR — Clean without breaking
# Extract helpers, add JSDoc, improve naming
npm test  # Still green ✓
```

### Commit Order

```bash
git add src/module/module.service.spec.ts
git commit -m "test: add spec for task activation with blocked state"

git add src/module/module.service.ts
git commit -m "feat(tasks): require resolution note when activating blocked task"
```

---

## Branch Strategy

```
main          — production (protected: require PR + CI pass)
develop       — integration (default branch for PRs)
feature/xxx   — new features
fix/xxx       — bug fixes
hotfix/xxx    — urgent production fixes (branches from main)
docs/xxx      — documentation only
chore/xxx     — maintenance (deps, config, CI)
```

**Naming:** `type/issue-number-short-description`

```bash
# Examples
git checkout -b feature/42-auto-archive-tasks
git checkout -b fix/87-heartbeat-race-condition
git checkout -b docs/update-adr-typeorm
git checkout -b hotfix/101-login-500-error
```

---

## Commit Messages (Conventional Commits)

Format: `type(scope): description`

```
feat(tasks): add auto-archive after 7 days
fix(auth): handle special chars in password
docs(adr): add ADR-0005 for TypeORM migrations
test(heartbeat): add spec for stale entry cleanup
chore(deps): upgrade NestJS to 11.2
refactor(tasks): extract time-tracking into separate service
ci: add commitlint to PR workflow
hotfix: fix login 500 when DB connection drops
```

**Rules enforced by commitlint:**

- Type must be one of: `feat, fix, docs, refactor, test, chore, perf, ci, hotfix, revert`
- Header max 100 characters
- No period at end of subject

**Bad commit messages** (will be rejected):

- `fix stuff`
- `WIP`
- `asdfasdf`
- `updated the thing`

---

## Zone System (for AI agents and humans)

Before modifying any file, check its zone:

### IMUTÁVEL — Requires ADR + developer approval

- `docs/BUSINESS_RULES.md`
- `src/auth/` — authentication flow
- `task.entity.ts`, `task-time-entry.entity.ts` — core entities
- Database migrations

**Action:** Create an ADR using `/adr` skill. Get approval. Only then implement.

### PROTEGIDO — Requires justification

- `*.module.ts` — NestJS module structure
- `lib/auth.tsx` — Auth context provider
- `docker-compose.yml`, `tsconfig.json`
- `package.json` files

**Action:** Comment in PR explaining why the change is necessary.

### ABERTO — Free to modify (with TDD)

- Tests (`*.spec.ts`, `*.test.ts`)
- Documentation (`docs/`, JSDoc comments)
- UI components (within visual guidelines)
- New features in existing modules
- Bug fixes

---

## Code Standards

### Backend (NestJS)

- Isolated modules: each module owns its entities, repos, services, controllers
- DTOs with `class-validator` decorators
- Public methods: JSDoc with `@param`, `@returns`, `@throws`
- Max file size: ~200 lines; split into sub-services if larger
- No `any` types (ESLint warns)
- No floating Promises (ESLint errors)

### Frontend (Next.js)

- Components in `/components`, hooks/libs in `/lib`, pages in `/app`
- All UI strings via `next-intl` — add to both `messages/pt-BR.json` and `messages/en-US.json`
- Visual style: hand-drawn (Excalidraw-like), post-it cards, `border-sketch` Tailwind classes
- Client Components (`'use client'`) for interactive UI

---

## Running Tests

```bash
# Backend unit tests
cd backend && npm test

# Backend with coverage
cd backend && npm run test:coverage

# Watch mode (during TDD)
cd backend && npm run test:watch
```

Coverage thresholds (enforced in CI):

- Lines: 60%
- Functions: 60%

---

## Creating a PR

```bash
# 1. Ensure you're on a feature branch
git branch --show-current  # should NOT be main or develop

# 2. Verify locally
cd backend && npm run lint:check
cd backend && npm test
cd frontend && npm run lint

# 3. Create PR targeting develop
gh pr create --base develop --title "feat(tasks): auto-archive after 7 days"
# Fill the PR template checklist
```

---

## Architecture Decisions

All decisions affecting zones IMUTÁVEL or PROTEGIDA must be documented:

1. Create `docs/adr/XXXX-short-title.md` using `docs/adr/0000-template.md`
2. Set status to `Proposed`
3. Open an issue with label `architecture`
4. Get approval (status → `Accepted`)
5. Implement with TDD
6. Reference ADR in PR description

See existing ADRs in `docs/adr/` for examples.

---

## Getting Help

- Business rules: `docs/BUSINESS_RULES.md`
- Architecture: `docs/ARCHITECTURE.md`
- ADR history: `docs/adr/`
- Claude Code skills: `.claude/skills/` (use `/adr`, `/tdd-feature`, `/pr`, `/hotfix`)
