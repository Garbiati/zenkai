# Roadmap

## v1.0 -- Foundation (atual)

**Status:** Concluido (mergeado em main — 2026-02-22)

### Escopo

- [x] Documentacao completa (docs/)
- [x] Fix: calculo de horas (GREATEST clamp)
- [x] Fix: ativacao self-only (admin excecao)
- [x] Fix: seed com dados realistas
- [x] Feature: estimativa de horas por task
- [x] Feature: previsao de conclusao por velocidade
- [x] Feature: notificacoes toast (inatividade, 8h, prazo)
- [x] Feature: WebSocket presenca + real-time events (org-isolated rooms)
- [x] Feature: invite system (email-based + open invite com token)
- [x] Feature: auto-registro (gestor cria org; membro aceita convite)
- [x] Feature: onboarding wizard 3 steps apos registro
- [x] Infra: multi-tenancy (Organization + Membership + Invitation entities)
- [x] Infra: JWT com orgId no payload
- [x] Infra: CI com lint, typecheck, test, build, Gitleaks, Semgrep

### Divida tecnica conhecida (para resolver antes de ir para producao)

- [x] **CRITICO** Adicionar helmet.js (security headers) — S1 resolvido
- [x] **CRITICO** Adicionar rate limiting nos endpoints de auth/invite — S2 resolvido
- [x] **ALTA** WebSocket CORS: `origin: '*'` → restringir para origens validas — S5 resolvido
- [x] **ALTA** JWT_SECRET fallback hardcoded no codigo → remover, exigir env var — S4 resolvido
- [x] **ALTA** URL do Cloudflare tunnel hardcoded em `frontend/lib/api.ts` → env var — S6 resolvido
- [x] **ALTA** IP hardcoded em `main.ts` CORS origins → usar CORS_ORIGINS env var — S5 resolvido
- [x] **ALTA** `emitToAll()` ainda chamado por algumas services → migrar para `emitToOrg()` — S3 resolvido
- [ ] **MEDIA** TypeScript `noImplicitAny: false` no backend → habilitar strict
- [x] **MEDIA** Sem Swagger/OpenAPI docs — A5 resolvido
- [x] **MEDIA** Email transacional nao implementado (ADR-0008 existe mas sem Nodemailer) — A4 resolvido

## v1.1 -- Real-Time + Members

**Status:** Planejado

### Escopo

- [ ] WebSocket para presenca online e updates em tempo real
- [ ] CRUD de membros (criar/editar/desativar)
- [ ] Grupos/Squads
- [ ] **Roles binarios (gestor / desenvolvedor):** exibir o papel do usuario na area
      logada; permissoes com diferenca minima — gestor ve painel de equipe e pode
      convidar, desenvolvedor foca no proprio board. Base: lider/liderados.
- [ ] RBAC basico (permissoes por role)

## v1.2 -- Roles Avancados

**Status:** Futuro (pos-MVP)

### Escopo

Evolucao natural do modelo binario de v1.1 para niveis granulares, mantendo
a filosofia de simplicidade.

- [ ] **Niveis de desenvolvedor:** desenvolvedor junior, pleno, senior, tech lead
- [ ] **Niveis de gestor:** convidado (view-only), gestor (gerencia equipe),
      dono/owner (admin da organizacao, fatura, convida gestores)
- [ ] Permissoes progressivas por nivel (RBAC granular)
- [ ] UI de configuracao de roles (admin da org)
- [ ] Auditoria de mudancas de role

> **Decisao de design:** o modelo binario de v1.1 e suficiente para o MVP e para
> equipes pequenas. Os niveis granulares sao opt-in e nao quebram a simplicidade
> para quem nao precisa deles.

## v2.0 -- Enterprise

**Status:** Futuro

### Escopo

- [ ] Auth via GSuite/Gmail (OAuth2)
- [ ] Relatorios de produtividade (diario, semanal, mensal)
- [ ] Integracao Slack (notificacoes)
- [ ] Integracao Trello/ClickUp (import de tasks, sync bidirecional)
- [ ] Dashboard de gestao (visao consolidada)
