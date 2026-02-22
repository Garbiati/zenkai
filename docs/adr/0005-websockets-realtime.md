# ADR 0005: WebSockets para Real-Time (Substitui Polling + Heartbeat)

**Status:** Accepted
**Date:** 2026-02-21
**Decided by:** Alessandro Garbiati

---

## Context

O sistema atual usa duas estratégias de comunicação frontend→backend que não escalam:

1. **Polling de 30s** — Frontend solicita todos os dados do board a cada 30 segundos. Um usuário vê mudanças de colegas com até 30s de atraso. Com 100 times de 7 pessoas, isso gera ~23 req/s constantes.

2. **Heartbeat de 60s** — Frontend faz `POST /heartbeat` a cada 60s para sinalizar presença ativa. O backend tem um cron que fecha time entries para membros sem heartbeat recente. Com 1000 usuários simultâneos: ~16 req/s só de overhead de presença.

**Total projetado em SaaS (1000 usuários):** ~40 req/s de tráfego "inútil" (dados que não mudaram, presença que já era conhecida).

**Problema de UX:** Uma task movida para `active` por um colega só aparece no board do outro usuário em até 30s. Para um produto SaaS moderno, isso é inaceitável.

---

## Decision

Substituir polling e heartbeat por **WebSocket persistente** usando `@nestjs/websockets` + Socket.io.

### Arquitetura do Gateway

```
backend/src/
  gateway/
    events.gateway.ts     # @WebSocketGateway — hub central de eventos
    events.module.ts      # Módulo que exporta o gateway
    dto/
      room-join.dto.ts    # Payload de entrada na sala org
```

### Modelo de Salas (Rooms)

Cada organização tem uma room isolada: `org:{orgId}`. Quando um cliente conecta:

1. Autentica via JWT no handshake (`auth.token`)
2. Entra na room `org:{orgId}` automaticamente
3. Conexão ativa = presença (sem heartbeat necessário)
4. Desconexão = membro offline

### Eventos Definidos (Server → Client)

| Evento            | Payload                         | Trigger                                |
| ----------------- | ------------------------------- | -------------------------------------- |
| `task:updated`    | `Task` completo                 | activate, block, complete, undo, pause |
| `task:created`    | `Task` completo                 | POST /tasks                            |
| `task:deleted`    | `{ taskId }`                    | DELETE /tasks/:id                      |
| `member:presence` | `{ memberId, online: boolean }` | connect / disconnect                   |
| `comment:added`   | `TaskComment`                   | POST /tasks/:id/comments               |

### Eventos Definidos (Client → Server)

| Evento | Payload     | Ação                            |
| ------ | ----------- | ------------------------------- |
| `join` | `{ orgId }` | Entra na room da organização    |
| `ping` | —           | Health check (resposta: `pong`) |

### Refatoração do Frontend

- Substituir polling de 30s por listener `task:updated` → atualização imediata no board
- Substituir heartbeat de 60s por: WebSocket `connect` = online, `disconnect` = offline
- Novo hook `useRealtimeBoard.ts` com `socket.io-client`

---

## Consequences

### Positive

- **UX real-time:** mudanças aparecem instantaneamente para todos na org
- **Redução de carga:** conexão persistente vs. N req/s de polling
- **Presença precisa:** online/offline baseado em conexão WebSocket (sem race condition de heartbeat)
- **Fundação para features futuras:** "usuário digitando comentário", notificações push

### Negative

- **Conexões persistentes:** servidor WebSocket precisa de sticky sessions se houver múltiplos nodes (resolve com Redis adapter do Socket.io)
- **Complexidade:** gateway precisa de auth, rooms, broadcast coordination
- **Fallback:** clientes atrás de proxies restritivos podem não suportar WebSocket (Socket.io faz fallback para long-polling automaticamente)

### Mitigation

- `socket.io` tem fallback automático para long-polling — zero impacto para clientes com problemas de WebSocket
- Redis adapter (`@socket.io/redis-adapter`) escala para múltiplos nodes quando necessário
- Durante a transição, manter polling como fallback até WebSocket estar estável

---

## Implementation Plan

1. `npm install @nestjs/websockets @nestjs/platform-socket.io socket.io` (backend)
2. `npm install socket.io-client` (frontend)
3. Criar `EventsGateway` + `EventsModule`
4. Injetar `EventsGateway` nos serviços que precisam emitir eventos (TasksService, etc.)
5. Criar hook `useRealtimeBoard` no frontend
6. Remover polling de 30s e heartbeat de 60s do `dashboard/page.tsx`

---

## Alternatives Considered

| Alternativa              | Razão para rejeição                                                |
| ------------------------ | ------------------------------------------------------------------ |
| Server-Sent Events (SSE) | Unidirecional (server → client apenas); não resolve o heartbeat    |
| GraphQL Subscriptions    | Overhead de GraphQL não justificado; aumenta complexidade          |
| Manter polling           | Não escala; UX ruim para produto SaaS                              |
| Long-polling             | Pior que WebSocket; Socket.io já usa como fallback automaticamente |

---

## References

- [NestJS WebSockets](https://docs.nestjs.com/websockets/gateways)
- [Socket.io Rooms](https://socket.io/docs/v4/rooms/)
- [@socket.io/redis-adapter](https://github.com/socketio/socket.io-redis-adapter)
