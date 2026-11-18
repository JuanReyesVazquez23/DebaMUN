import { Controller, Get } from '@nestjs/common';
import { CountriesService } from '../countries/countries.service.js';
import { DatabaseService } from '../database/database.service.js';
import { CacheService } from '../jobs/cache.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { LlmService } from '../research/llm.service.js';
import { ResearchService } from '../research/research.service.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: CacheService,
    private readonly jobs: JobsService,
    private readonly research: ResearchService,
    private readonly llm: LlmService,
    private readonly countries: CountriesService,
  ) {}

  @Get()
  async check() {
    const [scraper, queue] = await Promise.all([this.research.scraperStatus(), this.jobs.status()]);
    return {
      status: 'ok',
      service: 'debamun-api',
      version: '0.1.0',
      time: new Date().toISOString(),
      corpus: {
        countries: this.countries.listCountries().length,
        committees: this.countries.listCommittees().map((committee) => committee.id),
      },
      services: {
        database: this.db.mode,
        cache: this.cache.backend,
        queue: queue.mode,
        scraper: scraper.status,
        llm: this.llm.enabled ? 'configured' : 'disabled',
      },
    };
  }
}
