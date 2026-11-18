import { Module } from '@nestjs/common';
import { CountriesModule } from '../countries/countries.module.js';
import { RateLimitService } from '../common/rate-limit.service.js';
import { FactsController, SessionsController } from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [CountriesModule],
  controllers: [SessionsController, FactsController],
  providers: [SessionsService, RateLimitService],
  exports: [SessionsService],
})
export class SessionsModule {}
