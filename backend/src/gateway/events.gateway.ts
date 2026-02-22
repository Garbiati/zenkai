import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * Central WebSocket hub for real-time board updates.
 *
 * Rooms: `org:{orgId}` — each organization has an isolated room.
 * Clients join via the `join` event after connection.
 *
 * Server → Client events:
 *   - task:created, task:updated, task:deleted
 *   - member:presence { memberId, online }
 *   - comment:added
 *
 * @see ADR 0005 — WebSockets for real-time (replaces polling + heartbeat)
 */
@WebSocketGateway({
  // S5: CORS from env — CORS_ORIGINS + CORS_REGEX (same as HTTP server)
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map((o) => o.trim()),
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  /** Map clientId → memberId for presence tracking. */
  private readonly clientMemberMap = new Map<string, string>();

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const memberId = this.clientMemberMap.get(client.id);
    if (memberId) {
      this.clientMemberMap.delete(client.id);
      // Broadcast offline presence to all rooms this socket was in
      client.rooms.forEach((room) => {
        if (room.startsWith('org:')) {
          this.server.to(room).emit('member:presence', { memberId, online: false });
        }
      });
    }
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /**
   * Client joins an organization room and registers their presence.
   * Replaces the heartbeat polling mechanism.
   * @param data - { orgId, memberId }
   * @param client - Connected socket
   */
  @SubscribeMessage('join')
  async handleJoin(
    @MessageBody() data: { orgId: string; memberId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `org:${data.orgId}`;
    await client.join(room);
    this.clientMemberMap.set(client.id, data.memberId);

    // Broadcast online presence to the room
    this.server.to(room).emit('member:presence', {
      memberId: data.memberId,
      online: true,
    });

    this.logger.debug(`Member ${data.memberId} joined room ${room}`);
    return { event: 'joined', room };
  }

  @SubscribeMessage('ping')
  handlePing() {
    return { event: 'pong' };
  }

  // ---------------------------------------------------------------------------
  // Server-side emitters (called by services after mutations)
  // ---------------------------------------------------------------------------

  /**
   * Broadcasts a task mutation event to all clients in an org room.
   * @param event - 'task:created' | 'task:updated' | 'task:deleted'
   * @param orgId - Target organization (room prefix)
   * @param payload - Task data or { taskId } for deleted
   */
  emitToOrg(event: string, orgId: string, payload: unknown) {
    this.server.to(`org:${orgId}`).emit(event, payload);
  }

  /**
   * Broadcasts to all connected clients.
   * @deprecated Use emitToOrg() for tenant-scoped data to prevent cross-tenant leaks.
   *             Only acceptable as fallback for legacy tasks without orgId.
   */
  emitToAll(event: string, payload: unknown) {
    this.server.emit(event, payload);
  }
}
