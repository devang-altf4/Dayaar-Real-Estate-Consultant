import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalStorageProvider } from './local-storage.provider';

@Global()
@Module({
  providers: [LocalStorageProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
