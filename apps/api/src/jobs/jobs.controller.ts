import { Body, Controller, Get, Post } from '@nestjs/common';
import { JobsService } from './jobs.service.js';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get('status')
  status() {
    return this.jobs.status();
  }

  @Post('research-refresh')
  refresh(
    @Body()
    body: { countryCode?: string; committee?: string; reason?: string },
  ) {
    return this.jobs.enqueueResearchRefresh(body);
  }
}
