import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import { StoreService } from './store.service.js';

@Global()
@Module({
  providers: [DatabaseService, StoreService],
  exports: [DatabaseService, StoreService],
})
export class DatabaseModule {}
