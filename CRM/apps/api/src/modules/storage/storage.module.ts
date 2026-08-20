import { Global, Module } from '@nestjs/common';
import { B2StorageProvider } from './b2-storage.provider';
import { StorageService } from './storage.service';
import { VpsStorageProvider } from './vps-storage.provider';

@Global()
@Module({
  providers: [B2StorageProvider, VpsStorageProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
