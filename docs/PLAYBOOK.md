# Zenkai — Playbook de Operação

> Guia para humanos e agentes de IA operarem o projeto com segurança e consistência.
> Versão inicial gerada em 2026-02-21. Atualizar a cada release significativo.

---

## 1. Do's & Don'ts

### DO (sempre faça)

- Leia `docs/BUSINESS_RULES.md` antes de qualquer mudança em tasks ou auth
- Siga o Zone System do `CLAUDE.md` (IMUTÁVEL / PROTEGIDO / ABERTO)
- Escreva o teste antes de implementar (TDD: RED → GREEN → refactor)
- Rode o protocolo de verificação pós-mudança (`docker compose down && up --build -d`)
- Use `/adr` antes de qualquer mudança arquitetural
- Use Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- Passe `orgId` em toda query que acessa dados de tenant
- Valide entradas sempre no lado do servidor (DTOs + class-validator)
- Adicione chaves i18n nos dois arquivos (`pt-BR.json` e `en-US.json`)
- Documente cada método público com JSDoc (`@param`, `@returns`, `@throws`)

### DON'T (nunca faça)

- Nunca commite segredos (JWT_SECRET real, DB passwords, tokens de API)
- Nunca use `synchronize: true` em produção — use migrations TypeORM
- Nunca implemente lógica de negócio no frontend — backend é a fonte de verdade
- Nunca altere `docs/BUSINESS_RULES.md` sem ADR + aprovação explícita
- Nunca use `emitToAll()` no gateway para dados de tenant — sempre `emitToOrg()`
- Nunca adicione features fora do escopo sem issue aberta
- Nunca quebre o fluxo de auth (`backend/src/auth/`) sem ADR
- Nunca remova testes sem justificativa e aprovação
- Nunca force-push em `main` ou `develop`
- Nunca salte o protocolo de verificação de build

---

## 2. Como abrir um PR

### Requisitos mínimos

1. Branch criada a partir de `develop` com naming correto:
   - `feature/issue-42-descricao-curta`
   - `fix/issue-87-descricao-curta`
   - `docs/adr-0009`
   - `chore/update-deps`

2. Todos os gates passando localmente:

   ```bash
   cd backend && npm run lint && npm test && npm run build
   cd frontend && npm run lint && npm run build
   ```

3. PR description preenchida com o template (`.github/PULL_REQUEST_TEMPLATE.md`)

4. Referência à issue: `Closes #42`

5. Nenhum secret no diff (Gitleaks vai falhar o CI)

### Processo

```bash
# 1. Cria branch a partir de develop
git checkout develop && git pull origin develop
git checkout -b feature/42-minha-feature

# 2. Desenvolve com TDD
# RED → GREEN → refactor

# 3. Verifica localmente
cd backend && npm run lint && npm test
cd frontend && npm run lint && npm run build

# 4. Commit (Conventional Commits)
git add path/to/files
git commit -m "feat(tasks): add pause/resume with time tracking"

# 5. Push e abre PR
git push origin feature/42-minha-feature
# Abre PR via GitHub UI ou: gh pr create
```

---

## 3. Padrão de Commits

```
<tipo>(<escopo>): <descrição curta em minúsculas, sem ponto final>

[corpo opcional — explica o "por quê", não o "o quê"]

[breaking change ou closes issue]
```

**Tipos válidos:**
| Tipo | Quando usar |
|------|-------------|
| `feat` | Nova funcionalidade |
| `fix` | Bug fix |
| `docs` | Documentação |
| `refactor` | Refactoring sem change funcional |
| `test` | Adiciona/altera testes |
| `chore` | Manutenção (deps, config) |
| `perf` | Melhoria de performance |
| `ci` | CI/CD changes |
| `hotfix` | Fix urgente em produção |

**Exemplos:**

```
feat(auth): add rate limiting on login endpoint
fix(tasks): prevent emitToAll from leaking cross-org data
docs(adr): add ADR-0009 for billing model
test(invitations): add acceptance tests for open invite flow
chore(deps): update @nestjs/* to 11.2.0
```

---

## 4. Como escrever/atualizar docs

| Doc                      | Quando atualizar               | Quem pode alterar       |
| ------------------------ | ------------------------------ | ----------------------- |
| `docs/BUSINESS_RULES.md` | NUNCA sem ADR + aprovação      | Humano com ADR          |
| `docs/ARCHITECTURE.md`   | Toda mudança arquitetural      | Humano/Agent pós-ADR    |
| `docs/ROADMAP.md`        | A cada sprint/release          | Humano                  |
| `docs/CHANGELOG.md`      | A cada release (semantic ver.) | Humano                  |
| `docs/adr/*.md`          | Toda decisão técnica relevante | Humano/Agent via `/adr` |
| `docs/PLAYBOOK.md`       | Quando o processo mudar        | Humano                  |
| `CLAUDE.md`              | Quando o projeto evoluir       | Humano                  |

### Formato de ADR

Use o template `docs/adr/0000-template.md`. Campos obrigatórios:

- **Contexto**: Por que essa decisão precisa ser tomada agora?
- **Opções consideradas**: Min. 2 alternativas com prós/contras
- **Decisão**: O que foi escolhido e por quê
- **Consequências**: O que muda? Quais trade-offs?

---

## 5. Como lidar com decisões (ADR)

**Use `/adr` quando:**

- Mudar lib de autenticação
- Adicionar/trocar banco de dados
- Mudar estratégia de billing
- Alterar contrato de API (breaking change)
- Mudar multi-tenancy model
- Adicionar queue/worker/cron significativo
- Alterar estratégia de testes

**Não precisa de ADR:**

- Bug fixes
- Novos componentes UI dentro das guidelines
- Novos testes
- Atualização de deps patch/minor sem breaking

---

## 6. Como evitar repetição (DRY)

### Backend

| Padrão              | Onde centralizar                                                    |
| ------------------- | ------------------------------------------------------------------- |
| Validação de senha  | `auth.service.ts::validatePasswordStrength()`                       |
| Filtro por orgId    | Cada service recebe `orgId` do controller via `req.user`            |
| Soft delete + audit | `BaseEntity` em `src/common/entities/base.entity.ts`                |
| Resposta de erro    | Filtros de exceção NestJS (não repetir try/catch em cada método)    |
| Guard JWT           | `JwtAuthGuard` — sempre via decorator `@UseGuards(JwtAuthGuard)`    |
| WebSocket emit      | `emitToOrg()` no gateway — nunca `emitToAll()` para dados de tenant |

### Frontend

| Padrão              | Onde centralizar                                                       |
| ------------------- | ---------------------------------------------------------------------- |
| Chamadas à API      | `frontend/lib/api.ts` — nunca fetch direto em componentes              |
| Auth state          | `frontend/lib/auth.tsx` (AuthContext) — nunca duplicar                 |
| Tipos TypeScript    | `frontend/lib/types.ts`                                                |
| Formatação de tempo | `frontend/lib/utils.ts::formatTime()`                                  |
| Toast notifications | `frontend/lib/useToast.ts`                                             |
| Strings UI          | `frontend/messages/pt-BR.json` + `en-US.json` — nunca string hardcoded |
| Avatar              | `frontend/components/Avatar.tsx` — único componente de avatar          |

---

## 7. Protocolo de Verificação Pós-Mudança

Execute **sempre** antes de declarar uma tarefa concluída:

```bash
docker compose down
docker compose up --build -d
sleep 20
docker compose ps
docker compose exec db pg_isready -U dashboard_user -d team_dashboard
curl -sf -o /dev/null -w "Backend HTTP: %{http_code}\n" http://localhost:3001/auth/profile || echo "Backend ERRO"
curl -sf -o /dev/null -w "Frontend HTTP: %{http_code}\n" http://localhost:3000 || echo "Frontend ERRO"
```

Resultado esperado: todos os serviços `Up`, frontend 200, backend 401 (protegido — correto).

---

## 8. Segurança — Checklist pré-PR

- [ ] Nenhum secret hardcoded (JWT_SECRET, DB password, tokens, chaves de API)
- [ ] Novos endpoints têm `@UseGuards(JwtAuthGuard)`
- [ ] Novos endpoints de dados de tenant passam `orgId` para o service
- [ ] Novos DTOs têm `class-validator` em todos os campos
- [ ] Nenhum `emitToAll()` para dados de tenant (usar `emitToOrg()`)
- [ ] Nenhum `console.log` com dados sensíveis (tokens, senhas, PII)
- [ ] Novo input do usuário é validado no backend (não só no frontend)
- [ ] Rate limit aplicado em endpoints de auth/convite se necessário

---

## 9. Padrão de Testes

### Estrutura de teste (backend)

```typescript
describe('ServiceName', () => {
  // Arrange: setup mocks + factory helpers
  beforeEach(async () => {
    /* ... */
  });

  describe('methodName()', () => {
    it('should [expected behavior] when [condition]', async () => {
      // Arrange
      const member = makeMember({ isAdmin: false });
      // Act
      const result = await service.method(input);
      // Assert
      expect(result).toEqual(expected);
    });

    it('should throw [ErrorType] when [condition]', async () => {
      await expect(service.method(badInput)).rejects.toThrow(ErrorClass);
    });
  });
});
```

### Cobertura mínima

| Nível      | Threshold                            |
| ---------- | ------------------------------------ |
| Lines      | 60%                                  |
| Functions  | 60%                                  |
| Statements | 60%                                  |
| Branches   | (não configurado — meta futura: 50%) |

### O que testar obrigatoriamente

- Happy path de cada método de service
- Casos de erro (ForbiddenException, NotFoundException, ConflictException)
- Boundary conditions (undo max 3x, plan limits, etc.)
- Tenant isolation (garantir que orgId filtra corretamente)

---

## 10. Multi-Tenancy — Regra de Ouro

> **Todo dado pertence a uma organização. Toda query deve ser filtrada por orgId.**

```typescript
// CORRETO — sempre receber orgId do req.user (injetado pelo JWT)
@Get()
findAll(@Request() req) {
  return this.service.findAll(req.user.orgId);
}

// ERRADO — nunca buscar dados sem orgId em endpoints de tenant
@Get()
findAll() {
  return this.service.findAll(); // VAZA DADOS DE TODOS OS TENANTS
}
```

**WebSocket:**

```typescript
// CORRETO
gateway.emitToOrg('task:updated', orgId, payload);

// ERRADO — vaza dados cross-tenant
gateway.emitToAll('task:updated', payload);
```

---

## 11. Guia de Uso de IA (Agents)

### Quando usar agentes automaticamente

- Pesquisar padrões no codebase antes de implementar
- Escrever testes para código novo
- Revisar segurança de um PR antes de mergear
- Gerar ADR draft para revisão humana

### Quando NEM SEMPRE confiar no agente

- Mudanças em zonas IMUTÁVEL (sempre exige aprovação humana)
- Decisões de produto (planos, limites, billing)
- Alterações em `*.module.ts` sem ADR
- Mudanças de schema/entidade que vão para produção

### Prompts padrão para tarefas comuns

```
# Novo endpoint
"Implementar endpoint [MÉTODO] /[rota] seguindo o padrão de [módulo existente].
TDD: escreva o spec primeiro. Use orgId do req.user. Adicione @UseGuards(JwtAuthGuard)."

# Bug fix
"Bug: [descrição]. Escreva um teste que reproduz o bug (RED), corrija (GREEN), refatore."

# Refactor
"Refatorar [arquivo] para max ~200 linhas, extraindo [sub-componente/sub-service].
Não mudar comportamento observável. Preservar todos os testes existentes."
```
