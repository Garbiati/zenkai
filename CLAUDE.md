# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Zone System — Permissões por Área

Agents de IA devem respeitar as zonas abaixo antes de qualquer modificação.

### IMUTÁVEL — Nunca alterar sem ADR + aprovação explícita do dev

- `docs/BUSINESS_RULES.md` — regras de negócio canônicas
- Máquina de estados das tasks: `backlog → active → done` (e transições válidas)
- Fluxo de autenticação: `backend/src/auth/`
- Schema de banco em produção: migrations são irreversíveis
- Cálculo de tempo/estimativa: `task-time-entry.entity.ts`, lógica de velocity

### PROTEGIDO — Requer justificativa + aprovação antes de alterar

- Contratos de API: rotas, DTOs de resposta (breaking changes)
- Estrutura de módulos NestJS: `*.module.ts`
- Providers do Auth Context no frontend: `frontend/lib/auth.tsx`
- Dependências: `package.json` de qualquer workspace
- Arquivos de configuração: `docker-compose.yml`, `tsconfig.json`
- `.claude/settings.json` e hooks

### ABERTO — Agents podem modificar livremente (com TDD)

- Testes: criar/modificar arquivos `*.spec.ts`, `*.test.ts`
- Documentação: `docs/`, comentários JSDoc
- Componentes de UI: dentro das guidelines visuais
- Novas features em módulos existentes
- Bug fixes
- `.env.example`, `README.md`, `CONTRIBUTING.md`

### Regra de Ouro

> **Se a funcionalidade está funcionando e não há issue aberta sobre ela, não toque nela.**

### Protocolo de Ambiguidade

Se o prompt não especifica qual arquivo alterar, ou se a mudança afeta zona IMUTÁVEL/PROTEGIDA:

1. **Perguntar antes de agir.** Nunca assumir intenção arquitetural.
2. Se mudança arquitetural é necessária, usar a skill `/adr` primeiro.
3. Preferir a menor mudança possível que resolve o problema.

---

## Project

Dashboard de Atividade Diária da Equipe — visual estilo Excalidraw (hand-drawn, papel e caneta).
Acompanha quem está fazendo o que no dia, com time tracking automático, sistema de blocks/flags, e comentários.

**Stack:** Next.js 14 (App Router) + Tailwind CSS + next-intl | NestJS + TypeORM + PostgreSQL | Docker Compose

---

## Build & Run

```bash
# Start everything with Docker
docker compose up --build

# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# PostgreSQL: localhost:5432 (see docker-compose.yml for credentials)

# Development (without Docker)
cd backend && npm install && npm run start:dev
cd frontend && npm install && npm run dev

# Seed database (7 members + tasks)
cd backend && npm run seed

# Lint
cd backend && npm run lint
cd frontend && npm run lint

# Tests
cd backend && npm test
cd backend && npm test -- --coverage

# Build
cd backend && npm run build      # tsc
cd frontend && npm run build     # next build
```

**Default login:** See `backend/src/seed.ts` for seeded credentials (must change password on first login)

---

## Verificação Obrigatória Pós-Mudança

**Todo agente DEVE executar estes passos antes de declarar uma tarefa concluída,**
independente de ser mudança em backend, frontend, banco ou configuração.

```bash
# 1. Rebuild completo (para o que estava rodando e sobe tudo novamente)
docker compose down
docker compose up --build -d

# 2. Aguardar serviços iniciarem (~20s para seed + compilação)
sleep 20

# 3. Status de todos os serviços
docker compose ps

# 4. Health checks individuais
# PostgreSQL
docker compose exec db pg_isready -U dashboard_user -d team_dashboard

# Backend (NestJS) — qualquer resposta HTTP = está vivo
curl -sf -o /dev/null -w "Backend HTTP: %{http_code}\n" http://localhost:3001 || echo "Backend ERRO"

# Frontend (Next.js)
curl -sf -o /dev/null -w "Frontend HTTP: %{http_code}\n" http://localhost:3000 || echo "Frontend ERRO"
```

Se qualquer serviço não estiver `Up` ou os health checks retornarem erro,
investigar com `docker compose logs <serviço>` e corrigir antes de declarar concluído.

---

## Architecture

```
├── docker-compose.yml
├── .github/
│   ├── workflows/ci.yml            # CI: lint, typecheck, test, build
│   ├── workflows/security.yml      # Semgrep + Gitleaks
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── BUSINESS_RULES.md           # IMUTÁVEL — regras canônicas
│   └── adr/                        # Architecture Decision Records
├── .husky/                         # Git hooks
├── backend/                        # NestJS API (port 3001)
│   └── src/
│       ├── main.ts
│       ├── app.module.ts           # Root module (TypeORM synchronize:true — dev only)
│       ├── seed.ts
│       ├── auth/                   # PROTEGIDO — Login JWT, change-password
│       ├── team-members/
│       ├── tasks/                  # PROTEGIDO — Task CRUD + lifecycle + time tracking
│       ├── comments/
│       ├── blocks/
│       ├── audit-log/
│       ├── heartbeat/
│       ├── work-schedule/
│       ├── organizations/
│       ├── invitations/
│       ├── mail/
│       ├── gateway/               # WebSocket events
│       └── common/
└── frontend/                       # Next.js 14 App Router (port 3000)
    ├── app/
    │   ├── login/
    │   ├── register/
    │   ├── invite/[token]/
    │   ├── change-password/
    │   ├── onboarding/
    │   ├── dashboard/
    │   └── profile/
    ├── components/
    ├── messages/                   # i18n: pt-BR.json (default), en-US.json
    ├── i18n.ts
    └── lib/
        ├── api.ts
        ├── auth.tsx                # PROTEGIDO
        ├── types.ts
        ├── utils.ts
        └── locale.tsx
```

---

## Database Schema

- `team_members` — id, name, username, password_hash, must_change_password, avatar_url, is_admin, last_heartbeat_at
- `tasks` — id, title, description, status(enum), owner_id(FK), is_blocked, completed_at, undo_count, is_archived, estimated_hours, predicted_completion
- `task_time_entries` — id, task_id(FK), team_member_id(FK), started_at, ended_at
- `task_comments` — id, task_id(FK), author_id(FK), is_owner, content
- `task_blocks` — id, task_id(FK), blocked_by_id(FK), block_reason, resolved_by_id, resolution_note, blocked_at, resolved_at
- `audit_logs` — id, entity_type, entity_id, action, old_data(jsonb), new_data(jsonb), performed_by, performed_at
- `work_schedules` — id, member_id(FK nullable), start_time, lunch_start, lunch_end, end_time
- `organizations` — id, name, created_at
- `memberships` — id, member_id(FK), org_id(FK), role
- `invitations` — id, org_id(FK), token, email, role, expires_at, max_uses, use_count

TypeORM runs with `synchronize: true` in development only. See `docs/adr/0002-typeorm-synchronize.md`.

---

## Key Business Rules

> Canonical source: `docs/BUSINESS_RULES.md` — IMUTÁVEL

- Max 1 active card per member; only the owner can activate their own card (admin can activate any)
- Block requires reason; reactivation of blocked task requires resolution note
- Undo (done → backlog) limited to 3× per task; completed tasks cannot be edited
- Time tracking: auto-start on activate, pause on block/complete/pause/owner-change/delete; 1 open entry per task
- Heartbeat every 60s from frontend; cron every 2min closes entries for inactive members (>2min without heartbeat)
- Hours today: entries clamped to start of day (`GREATEST`)
- `estimatedHours` optional (0.5–999h); predicted completion = remainingHours / avgSpeed (h/working day)
- Soft delete + audit log on all operations
- Password: min 8 chars, 1 uppercase, 1 number; all pre-seeded members must change on first login

---

## Pre-seeded Members

7 team members (1 admin + 6 members) created by `backend/src/seed.ts`. All must change password on first login.

---

## Data Flow

1. Frontend sends `POST /heartbeat` every 60s → backend updates `last_heartbeat_at`, recalculates `workedHoursToday`
2. Cron job (every 2min) closes time entries for members with no recent heartbeat
3. Frontend refreshes data every 30s + on `visibilitychange`
4. API URL is dynamic: resolves to Cloudflare tunnel URL on `*.trycloudflare.com` hosts

---

## Code Conventions

- TypeScript strict throughout (backend: `strictNullChecks: true`, frontend: `strict: true`)
- NestJS: isolated modules, DTOs with class-validator (`whitelist: true`, `transform: true`)
- Frontend components in `/components`, hooks/libs in `/lib`, pages in `/app`
- i18n: all UI strings via `next-intl`; add keys to both `messages/pt-BR.json` and `messages/en-US.json`
- Visual style: hand-drawn (Excalidraw-like), post-it cards, `border-sketch` classes in Tailwind
- Business rules are canonical in `docs/BUSINESS_RULES.md`
- Commits follow Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- TDD for all new features: test first (RED) → implement (GREEN) → refactor
- Max file size: ~200 lines; split into sub-services/components if larger
- Each public method: JSDoc with `@param`, `@returns`, `@throws` referencing the relevant business rule

---

## Skills Disponíveis

- `/adr` — Criar ADR antes de qualquer mudança arquitetural (zona IMUTÁVEL/PROTEGIDA)
- `/tdd-feature` — Fluxo TDD: escrever teste → implementar → refatorar
- `/pr` — Criar PR seguindo convenções (branch, title, body, checklist)
- `/hotfix` — Criar hotfix com branch naming correto

---

## Branch Strategy

```
main          — produção (protegida: require PR + CI pass)
develop       — integração (default para PRs)
feature/xxx   — novas features   (ex: feature/42-auto-archive-tasks)
fix/xxx       — bug fixes
hotfix/xxx    — hotfix urgente
docs/xxx      — documentação
chore/xxx     — manutenção (deps, config)
```

Naming: `tipo/issue-number-descricao-curta`

---

## Git Workflow para Agents

### Princípio fundamental

> **Uma feature = uma branch = uma PR.** Agents não devem acumular múltiplas features na mesma branch.

### Ciclo correto de trabalho

```
1. Criar branch nova:       git checkout -b feature/42-nome-descritivo
2. Trabalhar com commits WIP enquanto desenvolve (prefixo wip: permitido localmente)
3. ANTES de abrir PR:       rodar /pr (que executa o pre-PR checklist abaixo)
4. Abrir como DRAFT PR:     gh pr create --draft
5. Aguardar CI verde
6. Squash se necessário:    git reset --soft origin/main && git commit -m "feat: ..."
7. Marcar como Ready:       gh pr ready
8. Code review humano → merge
```

### Pre-PR Checklist (obrigatório)

Antes de qualquer `gh pr create`, o agent DEVE executar:

```bash
# 1. Contar commits
COMMITS=$(git log --oneline origin/main..HEAD | wc -l)
echo "Commits nesta branch: $COMMITS"

# 2. Ver histórico completo
git log --oneline origin/main..HEAD

# 3. Verificar se há commits fix: ou wip:
git log --oneline origin/main..HEAD | grep -E "^[a-f0-9]+ (fix:|wip:)" && echo "⚠ Squash necessário"

# 4. Ver tamanho do diff
git diff origin/main..HEAD --stat | tail -1
```

**Regras:**

- Se `COMMITS > 7`: squash obrigatório antes de abrir PR
- Se houver commits `fix:`: squash esses commits no commit pai (use `git reset --soft`)
- Se o diff tiver `> 500 arquivos` ou `> 5000 linhas`: dividir em PRs menores

### Comando de squash rápido

Para squash de todos os commits em N commits limpos:

```bash
# Squash TUDO em um commit (para changes relacionadas)
git reset --soft origin/main
git commit -m "feat(scope): descrição clara do que foi feito"

# Squash dos últimos N commits (para CI fixes no topo)
git reset --soft HEAD~N
git commit -m "chore(ci): descrição"
```

### Tamanho ideal de PR

| Linhas adicionadas | Avaliação          |
| ------------------ | ------------------ |
| < 400              | Ótimo              |
| 400–800            | Aceitável          |
| 800–1500           | Grande, justificar |
| > 1500             | Dividir em PRs     |

### O que não fazer

- ❌ Nunca abrir PR com commits `fix:` visíveis no histórico
- ❌ Nunca trabalhar em múltiplas features na mesma branch
- ❌ Nunca fazer `git push --force` em `main` ou `develop`
- ❌ Nunca abrir PR sem CI verde local (lint + tests)
