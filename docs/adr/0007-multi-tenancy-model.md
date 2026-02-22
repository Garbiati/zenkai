# ADR 0007: Modelo de Multi-Tenancy (Organizations + Memberships)

**Status:** Accepted
**Date:** 2026-02-21
**Decided by:** Alessandro Garbiati

---

## Context

O sistema atual suporta um único time de 7 membros pré-seeded. Para viabilizar o modelo SaaS (gratuito até 7 pessoas por time), precisamos:

1. **Self-registration** — usuários criam sua conta sem admin humano
2. **Isolamento entre times** — cada time vê apenas seus próprios dados
3. **Invite system** — dono do time convida membros por email
4. **Flexibilidade** — suportar múltiplos planos no futuro (free → pro)

O design precisa ser introduzido incrementalmente para não quebrar a instância existente (7 membros pré-seeded continuam funcionando).

---

## Decision

Adotar modelo de **Organization-centric multi-tenancy** com 3 novas tabelas.

### Schema

```sql
-- Organização: agrupa um time
CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(100) NOT NULL UNIQUE,  -- URL-friendly, ex: "acme-devs"
  plan       VARCHAR(20) NOT NULL DEFAULT 'free',  -- 'free' | 'pro'
  owner_id   UUID REFERENCES team_members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Membership: relação M:N entre member e org, com papel
CREATE TABLE memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL DEFAULT 'member',  -- 'owner' | 'admin' | 'member'
  invited_by  UUID REFERENCES team_members(id),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, member_id)
);

-- Invitation: convite pendente por email
CREATE TABLE invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email       VARCHAR(255) NOT NULL,
  token       VARCHAR(255) NOT NULL UNIQUE,  -- UUID v4, para URL de aceite
  role        VARCHAR(20) NOT NULL DEFAULT 'member',
  invited_by  UUID NOT NULL REFERENCES team_members(id),
  expires_at  TIMESTAMPTZ NOT NULL,          -- now() + 7 days
  accepted_at TIMESTAMPTZ,                   -- NULL = pendente
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Migração dos Membros Pré-Seeded

Na função de seed (`seed.ts`), criar uma organização padrão "Zenkai Default" e associar os 7 membros existentes como `member` (e `a.garbiati` como `owner`).

Isso preserva a instância local sem quebrar nada.

### Impacto nas Entidades Existentes

- `team_members`: adicionar campo `email VARCHAR(255) UNIQUE NULL` (nullable para backward compat)
- `tasks`, `activity_logs`, `work_schedules`: adicionar `org_id UUID NULL` (nullable na fase inicial; obrigatório após migração completa)
- Fase 1 (atual ADR): criar tabelas e entidades sem enforçar `org_id` em todos os endpoints
- Fase 2 (futuro ADR): filtrar todos os endpoints por `org_id` do JWT

### Fluxo de Self-Registration

```
POST /auth/register
  body: { name, email, username, password, teamName? }

  1. Validar força da senha (≥8 chars, 1 maiúscula, 1 número)
  2. Verificar unicidade de email e username
  3. Criar TeamMember (mustChangePassword: false, email preenchido)
  4. Criar Organization (slug = slugify(teamName ?? username))
  5. Criar Membership (role: 'owner')
  6. Retornar JWT + user (mesmo formato do login)
```

### Fluxo de Invite (Fase 1.3 — próximo ADR)

```
POST /invitations          — cria invitation com token UUID
GET  /invitations/:token   — valida e retorna org info
POST /invitations/:token/accept — cria TeamMember + Membership
```

### Limites de Plano

```typescript
const PLAN_LIMITS = {
  free: { maxMembers: 7 },
  pro: { maxMembers: Infinity },
};
```

Enforçado no `InvitationsService` ao criar convite: contar memberships ativos da org.

---

## Consequences

### Positive

- **Self-service completo:** qualquer um pode criar uma conta + time
- **Isolamento de dados:** `org_id` como filtro garante que times nunca veem dados uns dos outros
- **Backwards compatible:** campo `org_id` nullable não quebra código existente
- **Extensível:** tabela `organizations.plan` permite monetização futura sem schema change

### Negative

- **Todos os endpoints** precisarão ser atualizados para filtrar por `org_id` (trabalho incremental)
- **JWT precisa incluir `orgId`** — breaking change no payload do token (membros precisam re-logar)
- **Slug collision:** dois times com mesmo nome gerariam slug duplicado — resolvido com sufixo numérico

### Mitigation

- Fase 1 (este ADR): criar tabelas + registro + membership, sem filtrar endpoints existentes
- Fase 2: atualizar JWT para incluir `orgId`, filtrar endpoints — documentado em ADR 0009
- Slug: `generateSlug(name, attempt)` com retry automático (+1, +2, ...)

---

## Alternatives Considered

| Alternativa                                       | Razão para rejeição                                                        |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| Schema por tenant (schema-per-tenant)             | Overkill; PostgreSQL row-level segurança é suficiente                      |
| Campo `tenant_id` em cada tabela (sem tabela org) | Menos flexível; não suporta planos, metadados da org                       |
| Deixar multi-tenancy para depois                  | Adicionar `org_id` depois exigiria migration complexa em dados de produção |
| Supabase RLS imediato                             | Aumenta acoplamento com Supabase; prematuro antes de migrar auth           |

---

## References

- [Multi-tenancy Patterns - Martin Fowler](https://martinfowler.com/articles/patterns-of-distributed-systems/)
- [NestJS TypeORM — Relations](https://docs.nestjs.com/techniques/database#relations)
- ADR 0006 (futuro): Supabase Auth migration
