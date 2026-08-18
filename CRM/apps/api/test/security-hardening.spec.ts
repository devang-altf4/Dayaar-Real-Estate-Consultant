import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  CallAttemptStatus,
  DeviceHeartbeatSchema,
  Role,
} from '@dayaar/shared';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe';
import { DeviceAuthGuard } from '../src/common/guards/device-auth.guard';
import { AndroidSimCallingProvider } from '../src/modules/calling/android-sim-calling.provider';
import { SeedService } from '../src/modules/seed/seed.service';
import { LeadsService } from '../src/modules/leads/leads.service';
import { FollowupsService } from '../src/modules/followups/followups.service';
import { DevicesGateway } from '../src/modules/devices/devices.gateway';

describe('Phase 1 security hardening', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSeedFlag = process.env.ALLOW_DESTRUCTIVE_SEED;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.ALLOW_DESTRUCTIVE_SEED = originalSeedFlag;
    jest.restoreAllMocks();
  });

  it('blocks destructive seed unless explicitly enabled outside production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_DESTRUCTIVE_SEED = 'true';
    const service = new SeedService(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
    );

    await expect(service.runSeed()).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires device credentials before a protected request reaches a controller', async () => {
    const devicesService = { authenticateDevice: jest.fn() };
    const guard = new DeviceAuthGuard(devicesService as any);
    const request = { headers: {} as Record<string, string>, device: undefined };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(devicesService.authenticateDevice).not.toHaveBeenCalled();
  });

  it('binds a validated device principal to the request', async () => {
    const principal = {
      id: new Types.ObjectId().toString(),
      deviceId: 'device-123',
      userId: new Types.ObjectId().toString(),
      organizationId: new Types.ObjectId().toString(),
    };
    const devicesService = {
      authenticateDevice: jest.fn().mockResolvedValue(principal),
    };
    const guard = new DeviceAuthGuard(devicesService as any);
    const request: any = {
      headers: {
        'x-device-id': principal.deviceId,
        'x-device-token': 'high-entropy-device-token',
      },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.device).toEqual(principal);
  });

  it('derives browser socket rooms from the verified JWT identity', async () => {
    const verifiedUser = {
      id: new Types.ObjectId().toString(),
      organizationId: new Types.ObjectId().toString(),
      role: Role.EMPLOYEE,
    };
    const authService = {
      authenticateAccessToken: jest.fn().mockResolvedValue(verifiedUser),
    };
    const gateway = new DevicesGateway({} as any, authService as any);
    const client = {
      id: 'socket-1',
      handshake: {
        auth: { token: 'valid-user-token' },
        headers: {},
        query: { userId: 'attacker-selected-user', orgId: 'attacker-org' },
      },
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
    } as any;

    await gateway.handleConnection(client);

    expect(client.join).toHaveBeenCalledWith(`user_${verifiedUser.id}`);
    expect(client.join).toHaveBeenCalledWith(
      `org_${verifiedUser.organizationId}`,
    );
    expect(client.join).not.toHaveBeenCalledWith('user_attacker-selected-user');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('executes Zod validation at runtime for device payloads', () => {
    const pipe = new ZodValidationPipe(DeviceHeartbeatSchema);

    expect(() =>
      pipe.transform({ deviceId: '', batteryLevel: 500 }),
    ).toThrow(BadRequestException);
    expect(
      pipe.transform({ deviceId: 'device-123', batteryLevel: 50 }),
    ).toMatchObject({ deviceId: 'device-123', batteryLevel: 50 });
  });

  it('does not classify NOT_CONNECTED as CONNECTED', () => {
    const provider = new AndroidSimCallingProvider(null as any, null as any);
    const result = provider.normalizeOutcome('NOT_CONNECTED', 0);

    expect(result.status).toBe(CallAttemptStatus.NOT_CONNECTED);
    expect(result.countsAsAttempt).toBe(true);
  });

  it('preserves manager team scope when a lead search is supplied', async () => {
    const managerId = new Types.ObjectId().toString();
    const organizationId = new Types.ObjectId().toString();
    const teamMemberId = new Types.ObjectId();
    const userModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: teamMemberId }]),
      }),
    };
    const query = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };
    const leadModel = {
      find: jest.fn().mockReturnValue(query),
      countDocuments: jest.fn().mockResolvedValue(0),
    };
    const service = new LeadsService(
      leadModel as any,
      userModel as any,
      null as any,
    );

    await service.findAll(
      organizationId,
      {
        id: managerId,
        organizationId,
        role: Role.MANAGER,
      } as any,
      { search: 'Rahul', page: 1, limit: 50 },
    );

    const filter = leadModel.find.mock.calls[0][0];
    expect(filter.$and).toHaveLength(2);
    expect(filter.$and[0].$or).toBeDefined();
    expect(filter.$and[1].$or).toBeDefined();
  });

  it('scopes employee follow-up completion to the current employee', async () => {
    const userId = new Types.ObjectId().toString();
    const organizationId = new Types.ObjectId().toString();
    const followUpModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };
    const service = new FollowupsService(
      followUpModel as any,
      null as any,
      null as any,
    );

    await service.completeFollowUp(new Types.ObjectId().toString(), {
      id: userId,
      organizationId,
      role: Role.EMPLOYEE,
    } as any);

    expect(followUpModel.findOneAndUpdate.mock.calls[0][0]).toMatchObject({
      organizationId: new Types.ObjectId(organizationId),
      employeeId: new Types.ObjectId(userId),
    });
  });
});
