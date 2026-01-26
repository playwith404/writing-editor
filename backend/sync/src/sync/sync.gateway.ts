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
  token?: string;
}

@WebSocketGateway({ path: '/ws' })
export class SyncGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: WsServer;

  private readonly logger = new Logger(SyncGateway.name);
  private readonly clients = new Set<ClientMeta>();

  afterInit() {
    this.server.on('connection', (socket: WebSocket, req: unknown) => {
      const client: ClientMeta = { socket, token: this.extractToken(req) };
      this.clients.add(client);

      socket.on('message', (raw: Buffer) => {
        try {
          const data = JSON.parse(raw.toString());
          void this.handleMessage(client, data);
        } catch (error) {
          this.logger.warn('유효하지 않은 메시지입니다.');
        }
      });

      socket.on('close', () => {
        if (client.projectId && client.userId) {
          this.broadcast(client.projectId, {
            type: 'presence:leave',
            userId: client.userId,
          }, client);
        }
        this.clients.delete(client);
      });
    });
  }

  private extractToken(req: unknown): string | undefined {
    const url = (req as any)?.url as string | undefined;
    if (!url) return undefined;
    try {
      const parsed = new URL(url, 'http://localhost');
      const token = parsed.searchParams.get('token');
      return token || undefined;
    } catch {
      return undefined;
    }
  }

  private async verifyProjectAccess(projectId: string, token: string): Promise<{ ok: boolean; userId?: string }> {
    const coreBase = process.env.CORE_API_INTERNAL_URL || 'http://core-api:3000';
    const url = `${coreBase.replace(/\/$/, '')}/projects/${projectId}/access`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const resp = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!resp.ok) return { ok: false };
      const body = (await resp.json()) as any;
      return { ok: Boolean(body?.ok), userId: body?.userId };
    } catch {
      return { ok: false };
    }
  }

  private async handleMessage(client: ClientMeta, data: any) {
    const type = data?.type;
    if (type === 'join') {
      const projectId = data?.projectId as string | undefined;
      const token = (data?.token as string | undefined) || client.token;
      if (!projectId || !token) {
        client.socket.send(JSON.stringify({ type: 'error', message: 'projectId와 token이 필요합니다.' }));
        return;
      }

      const access = await this.verifyProjectAccess(projectId, token);
      if (!access.ok || !access.userId) {
        client.socket.send(JSON.stringify({ type: 'error', message: '프로젝트 접근 권한이 없습니다.' }));
        client.socket.close();
        return;
      }

      client.projectId = projectId;
      client.userId = access.userId;
      client.token = token;
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

    if (!client.projectId || !client.userId) {
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
