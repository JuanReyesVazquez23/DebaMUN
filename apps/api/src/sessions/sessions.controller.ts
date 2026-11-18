import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateSessionDto, FactQueryDto } from './sessions.dto.js';
import { SessionsService } from './sessions.service.js';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  create(@Body() dto: CreateSessionDto) {
    return this.sessions.create(dto);
  }

  @Get(':id')
  profile(@Param('id') id: string) {
    return this.sessions.getProfile(id);
  }

  @Get(':id/dashboard')
  dashboard(@Param('id') id: string) {
    return this.sessions.getDashboard(id);
  }
}

@Controller('facts')
export class FactsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get('today')
  today(@Query() query: FactQueryDto) {
    return this.sessions.getFact(query.countryCode, query.offset);
  }
}
