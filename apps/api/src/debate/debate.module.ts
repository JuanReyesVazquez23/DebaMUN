import { Module } from '@nestjs/common';
import { CountriesModule } from '../countries/countries.module.js';
import { RateLimitService } from '../common/rate-limit.service.js';
import { DebateController } from './debate.controller.js';
import { DebateService } from './debate.service.js';
import { QuestionGenerator } from './question.generator.js';
import { ScoringService } from './scoring.service.js';

@Module({
  imports: [CountriesModule],
  controllers: [DebateController],
  providers: [DebateService, QuestionGenerator, ScoringService, RateLimitService],
  exports: [ScoringService, QuestionGenerator],
})
export class DebateModule {}
