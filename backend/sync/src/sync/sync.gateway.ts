import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { WebSocketServer as WsServer, WebSocket } from 'ws';

interface ClientMeta {
  socket: WebSocket;
  projectId?: string;
  userId?: string;
}

@WebSocketGateway({ path: '/ws' })
export class SyncGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: WsServer;

  private readonly logger = new Logger(SyncGateway.name);
  private readonly clients = new Set<ClientMeta>();

  afterInit() {
    this.server.on('connection', (socket: WebSocket, req: unknown) => {
      const client: ClientMeta = { socket };
      this.clients.add(client);

      socket.on('message', (raw: Buffer) => {
        try {
          const data = JSON.parse(raw.toString());
          this.handleMessage(client, data);
        } catch (error) {
          this.logger.warn('Invalid message');
        }
      });

      socket.on('close', () => {
        this.clients.delete(client);
      });
    });
  }

  private handleMessage(client: ClientMeta, data: any) {
    const type = data?.type;
    if (type === 'join') {
      client.projectId = data.projectId;
      client.userId = data.userId;
      this.broadcast(client.projectId, {
        type: 'presence:join',
        userId: client.userId,
      });
      return;
    }

    if (type === 'leave') {
      this.broadcast(client.projectId, {
        type: 'presence:leave',
        userId: client.userId,
      });
      client.projectId = undefined;
      return;
    }

    if (type === 'content:op') {
      this.broadcast(client.projectId, {
        type: 'content:sync',
        payload: data.payload,
        userId: client.userId,
      }, client);
      return;
    }

    if (type === 'cursor:move' || type === 'presence:update') {
      this.broadcast(client.projectId, {
        type: type === 'cursor:move' ? 'cursor:update' : 'presence:change',
        payload: data.payload,
        userId: client.userId,
      }, client);
      return;
    }
  }

  private broadcast(projectId: string | undefined, payload: any, exclude?: ClientMeta) {
    if (!projectId) return;
    for (const client of this.clients) {
      if (client === exclude) continue;
      if (client.projectId === projectId) {
        client.socket.send(JSON.stringify(payload));
      }
    }
  }
}
