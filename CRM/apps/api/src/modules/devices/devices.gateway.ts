import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DeviceHeartbeatSchema } from '@dayaar/shared';
import { AuthService } from '../auth/auth.service';
import { DevicesService } from './devices.service';
import { DevicePrincipal } from '../../common/interfaces/device-principal.interface';

type ConnectedPrincipal =
  | { kind: 'user'; userId: string; organizationId: string }
  | ({ kind: 'device' } & DevicePrincipal);

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  },
})
export class DevicesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DevicesGateway.name);
  private readonly connectedClients = new Map<string, ConnectedPrincipal>();
  private readonly deviceSockets = new Map<string, Set<string>>();
  private static readonly MAX_SOCKETS_PER_DEVICE = 3;
  private static readonly MAX_SOCKETS_PER_USER = 5;

  constructor(
    private readonly devicesService: DevicesService,
    private readonly authService: AuthService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const deviceId = this.stringValue(client.handshake.auth?.deviceId);
      const deviceToken = this.stringValue(client.handshake.auth?.deviceToken);

      if (deviceId || deviceToken) {
        if (!deviceId || !deviceToken) {
          throw new Error('Incomplete device credentials');
        }
        const device = await this.devicesService.authenticateDevice(
          deviceId,
          deviceToken,
        );
        // Cap sockets per device to prevent fan-out exhaustion
        const set = this.deviceSockets.get(device.deviceId) ?? new Set<string>();
        if (set.size >= DevicesGateway.MAX_SOCKETS_PER_DEVICE) {
          const oldest = set.values().next().value as string | undefined;
          if (oldest) {
            this.connectedClients.delete(oldest);
            set.delete(oldest);
            this.server.sockets.sockets.get(oldest)?.disconnect(true);
          }
        }
        const principal: ConnectedPrincipal = { kind: 'device', ...device };
        this.connectedClients.set(client.id, principal);
        set.add(client.id);
        this.deviceSockets.set(device.deviceId, set);
        await client.join(`device_${device.deviceId}`);
        return;
      }

      const token = this.extractUserToken(client);
      if (!token) {
        throw new Error('Missing access token');
      }
      const user = await this.authService.authenticateAccessToken(token);
      // Cap sockets per user
      let userCount = 0;
      for (const p of this.connectedClients.values()) {
        if (p.kind === 'user' && (p as any).userId === user.id) userCount++;
      }
      if (userCount >= DevicesGateway.MAX_SOCKETS_PER_USER) {
        throw new Error('Too many concurrent sessions');
      }
      this.connectedClients.set(client.id, {
        kind: 'user',
        userId: user.id,
        organizationId: user.organizationId,
      });
      await client.join(`user_${user.id}`);
      await client.join(`org_${user.organizationId}`);
    } catch (error) {
      this.logger.warn(`Rejected unauthenticated socket ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const principal = this.connectedClients.get(client.id);
    this.connectedClients.delete(client.id);
    if (principal?.kind === 'device') {
      const set = this.deviceSockets.get((principal as any).deviceId);
      if (set) {
        set.delete(client.id);
        if (!set.size) this.deviceSockets.delete((principal as any).deviceId);
      }
    }
    // Presence stays heartbeat-authoritative (no OFFLINE flip here) — emit hint only
  }

  @SubscribeMessage('DEVICE_HEARTBEAT')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    const principal = this.connectedClients.get(client.id);
    if (!principal || principal.kind !== 'device') {
      throw new WsException('Authenticated device connection required.');
    }

    const parsed = DeviceHeartbeatSchema.safeParse(data);
    if (!parsed.success) {
      throw new WsException('Invalid device heartbeat payload.');
    }

    const result = await this.devicesService.processHeartbeat(
      parsed.data,
      principal,
    );
    this.server
      .to(`user_${principal.userId}`)
      .emit('DEVICE_STATUS_CHANGED', result);
    return result;
  }

  emitCallCommandToDevice(deviceId: string, command: unknown) {
    this.server.to(`device_${deviceId}`).emit('INCOMING_CALL_COMMAND', command);
    const employeeId = (command as { employeeId?: string })?.employeeId;
    if (employeeId) {
      this.server
        .to(`user_${employeeId}`)
        .emit('CALL_COMMAND_PROGRESS', command);
    }
  }

  emitCallProgressToUser(userId: string, progress: unknown) {
    this.server.to(`user_${userId}`).emit('CALL_STATUS_UPDATE', progress);
  }

  emitDeviceStatusUpdate(userId: string, status: unknown) {
    this.server.to(`user_${userId}`).emit('DEVICE_STATUS_CHANGED', status);
  }

  private extractUserToken(client: Socket): string | undefined {
    const authToken = this.stringValue(client.handshake.auth?.token);
    if (authToken) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }
    return undefined;
  }

  private stringValue(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
