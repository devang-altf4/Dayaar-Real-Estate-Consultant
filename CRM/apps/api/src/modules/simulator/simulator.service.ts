import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { DevicesService } from '../devices/devices.service';
import { CallingService } from '../calling/calling.service';
import { DevicesGateway } from '../devices/devices.gateway';
import {
  SimState,
  CallAttemptStatus,
  IAuthUser,
} from '@dayaar/shared';

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);

  constructor(
    private readonly devicesService: DevicesService,
    private readonly callingService: CallingService,
    private readonly devicesGateway: DevicesGateway,
  ) {}

  private checkSimulatorEnabled() {
    const isEnabled = process.env.DEV_CALL_SIMULATOR === 'true' || process.env.NODE_ENV !== 'production';
    if (!isEnabled) {
      throw new ForbiddenException('Device simulator is disabled in production environment');
    }
  }

  async pairSimulatorDevice(params: {
    deviceName?: string;
    simState?: SimState;
  }, user: IAuthUser) {
    this.checkSimulatorEnabled();

    // Create a temporary pairing session and claim it directly for the simulator
    const session = await this.devicesService.createPairingSession(
      user.id,
      user.organizationId,
    );

    const deviceId = `dev-sim-${user.id.slice(-6)}`;

    const paired = await this.devicesService.claimPairing({
      pairingCode: session.pairingCode,
      pairingToken: session.pairingToken,
      deviceId,
      deviceName: params.deviceName || 'Simulator Galaxy A15',
      manufacturer: 'Samsung (Simulated)',
      model: 'SM-A155F',
      appVersion: '1.0.0-dev',
      simState: params.simState || SimState.READY,
      simOperator: 'Airtel (Simulated)',
      capabilities: {
        canPlaceCalls: true,
        canReadCallLogs: true,
        canSyncRecordings: true,
      },
    });

    this.devicesGateway.emitDeviceStatusUpdate(user.id, paired);

    return paired;
  }

  async sendSimulatorHeartbeat(deviceId: string, user: IAuthUser) {
    this.checkSimulatorEnabled();
    const device = await this.devicesService.getDevicePrincipalForUser(
      deviceId,
      user.id,
      user.organizationId,
    );
    return this.devicesService.processHeartbeat(
      {
        deviceId,
        batteryLevel: 95,
        isCharging: true,
        networkType: 'WIFI',
        simState: SimState.READY,
        simOperator: 'Airtel (Simulated)',
        capabilities: {
          canPlaceCalls: true,
          canReadCallLogs: true,
          canSyncRecordings: true,
        },
      },
      device,
    );
  }

  async simulateCallStep(params: {
    commandId: string;
    callAttemptId: string;
    status: CallAttemptStatus;
    rawStatus?: string;
    durationSeconds?: number;
    uploadSampleRecording?: boolean;
  }, user: IAuthUser) {
    this.checkSimulatorEnabled();
    const device = await this.devicesService.getDevicePrincipalForUser(
      `dev-sim-${user.id.slice(-6)}`,
      user.id,
      user.organizationId,
    );

    if (params.status === CallAttemptStatus.CONNECTED || params.status === CallAttemptStatus.DIALING) {
      return this.callingService.updateCallStatus(
        params.commandId,
        params.callAttemptId,
        params.status,
        device,
        params.rawStatus,
        params.durationSeconds || 0,
      );
    }

    // Call completion
    const completeResult = await this.callingService.completeCall(
      {
        callAttemptId: params.callAttemptId,
        status: params.status,
        rawStatus: params.rawStatus || params.status,
        durationSeconds: params.durationSeconds || 0,
        hasRecording: params.uploadSampleRecording || false,
      },
      device,
    );

    if (params.uploadSampleRecording) {
      // Create a small valid WAV byte header
      const wavHeader = Buffer.from(
        '524946462400000057415645666d7420100000000100010044ac000088580100020010006461746100000000',
        'hex',
      );
      await this.callingService.uploadRecording(
        params.callAttemptId,
        wavHeader,
        'audio/wav',
        device,
      );
    }

    return completeResult;
  }
}
