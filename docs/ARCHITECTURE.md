# Arquitetura

## Visao Geral

Dashboard monorepo com frontend Next.js 14 e backend NestJS, orquestrados via Docker Compose.

## Backend (NestJS - port 3001)

### Modulos

| Modulo          | Responsabilidade                                             |
| --------------- | ------------------------------------------------------------ |
| `auth`          | Login JWT, troca de senha, perfil, stats                     |
| `tasks`         | CRUD + lifecycle (activate/block/complete/undo/pause/resume) |
| `comments`      | Comentarios por task (com badge owner)                       |
| `blocks`        | Historico de bloqueios                                       |
| `audit-log`     | Log de todas operacoes                                       |
| `heartbeat`     | Ping de atividade + auto-pause + calculo de horas hoje       |
| `work-schedule` | Escala de trabalho global + per-member                       |
| `team-members`  | CRUD de membros                                              |

### Schema do Banco

- `team_members` -- id, name, username, password_hash, must_change_password, avatar_url, is_admin, last_heartbeat_at
- `tasks` -- id, title, description, status(enum), owner_id(FK), is_blocked, completed_at, undo_count, is_archived, estimated_hours, predicted_completion
- `task_time_entries` -- id, task_id(FK), team_member_id(FK), started_at, ended_at
- `task_comments` -- id, task_id(FK), author_id(FK), is_owner, content, created_at
- `task_blocks` -- id, task_id(FK), blocked_by_id(FK), block_reason, resolved_by_id, resolution_note, blocked_at, resolved_at
- `audit_logs` -- id, entity_type, entity_id, action, old_data(jsonb), new_data(jsonb), performed_by, performed_at
- `work_schedules` -- id, member_id(FK nullable), start_time, lunch_start, lunch_end, end_time

## Frontend (Next.js 14 - port 3000)

### Paginas

| Rota               | Descricao                                           |
| ------------------ | --------------------------------------------------- |
| `/login`           | Login com username/password                         |
| `/change-password` | Troca de senha obrigatoria no primeiro login        |
| `/dashboard`       | Board principal (Backlog, Em Atividade, Concluidos) |
| `/profile`         | Perfil do usuario + stats + work schedule           |

### Libs

- `lib/api.ts` -- Cliente HTTP com auth token
- `lib/auth.tsx` -- Context provider de autenticacao
- `lib/types.ts` -- Interfaces TypeScript
- `lib/utils.ts` -- Formatacao de tempo, cores de membros

## Fluxo de Dados

1. Frontend faz heartbeat a cada 60s (POST /heartbeat)
2. Backend atualiza lastHeartbeatAt, calcula workedHoursToday, verifica estimativa
3. Cron job a cada 2min fecha entries de membros inativos
4. Frontend refresh de dados a cada 30s + on page visibility change
