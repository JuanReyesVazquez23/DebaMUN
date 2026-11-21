import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { AskResearchDto } from './research.dto.js';
import { ResearchService } from './research.service.js';

@Controller('research')
export class ResearchController {
  constructor(private readonly research: ResearchService) {}

  @Post('ask')
  ask(@Body() dto: AskResearchDto) {
    return this.research.ask(dto);
  }

  @Get('sources')
  sources(@Query('countryCode') countryCode: string, @Query('committee') committee: string) {
    return this.research.getSources(countryCode, committee);
  }

  @Get('history/:delegateId')
  history(@Param('delegateId') delegateId: string) {
    return this.research.getHistory(delegateId);
  }

  @Delete('history/:delegateId')
  clearHistory(@Param('delegateId') delegateId: string) {
    return this.research.clearHistory(delegateId);
  }
}
