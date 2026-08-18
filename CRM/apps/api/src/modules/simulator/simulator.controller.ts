import { Body, Controller, Post } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  IAuthUser,
  SimState,
  CallAttemptStatus,
  PairSimulatorSchema,
  SimulatorHeartbeatSchema,
  SimulatorCallStepSchema,
} from '@dayaar/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('simulator')
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

  @Post('pair')
  async pairSimulator(
    @Body(new ZodValidationPipe(PairSimulatorSchema))
    body: {
      deviceName?: string;
      simState?: SimState;
    },
    @CurrentUser() user: IAuthUser,
  ) {
    return this.simulatorService.pairSimulatorDevice(body, user);
  }

  @Post('heartbeat')
  async sendHeartbeat(
    @Body(new ZodValidationPipe(SimulatorHeartbeatSchema))
    body: { deviceId: string },
    @CurrentUser() user: IAuthUser,
  ) {
    return this.simulatorService.sendSimulatorHeartbeat(body.deviceId, user);
  }

  @Post('call-step')
  async simulateCallStep(
    @Body(new ZodValidationPipe(SimulatorCallStepSchema))
    body: {
      commandId: string;
      callAttemptId: string;
      status: CallAttemptStatus;
      rawStatus?: string;
      durationSeconds?: number;
      uploadSampleRecording?: boolean;
    },
    @CurrentUser() user: IAuthUser,
  ) {
    return this.simulatorService.simulateCallStep(body, user);
  }
}
