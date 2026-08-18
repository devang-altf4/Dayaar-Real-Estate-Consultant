import { Module } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { SimulatorController } from './simulator.controller';
import { DevicesModule } from '../devices/devices.module';
import { CallingModule } from '../calling/calling.module';

@Module({
  imports: [DevicesModule, CallingModule],
  controllers: [SimulatorController],
  providers: [SimulatorService],
  exports: [SimulatorService],
})
export class SimulatorModule {}
