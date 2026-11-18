import { Module } from '@nestjs/common';
import { CountriesModule } from '../countries/countries.module.js';
import { RateLimitService } from '../common/rate-limit.service.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { KnowledgeService } from './knowledge.service.js';
import { LlmService } from './llm.service.js';
import { ResearchController } from './research.controller.js';
import { ResearchService } from './research.service.js';

@Module({
  imports: [CountriesModule, JobsModule],
  controllers: [ResearchController],
  providers: [KnowledgeService, LlmService, ResearchService, RateLimitService],
  exports: [KnowledgeService, LlmService, ResearchService],
})
export class ResearchModule {}
