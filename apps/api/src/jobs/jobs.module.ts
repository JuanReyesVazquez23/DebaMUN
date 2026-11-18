import { Module } from '@nestjs/common';
import { CacheService } from './cache.service.js';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';

@Module({
  controllers: [JobsController],
  providers: [CacheService, JobsService],
  exports: [CacheService, JobsService],
})
export class JobsModule {}
