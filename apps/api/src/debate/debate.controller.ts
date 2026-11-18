import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateDebateSessionDto, NextQuestionDto, SubmitTurnDto } from './debate.dto.js';
import { DebateService } from './debate.service.js';

@Controller('debate')
export class DebateController {
  constructor(private readonly debate: DebateService) {}

  @Post('sessions')
  createSession(@Body() dto: CreateDebateSessionDto) {
    return this.debate.createSession(dto);
  }

  @Post('questions/next')
  nextQuestion(@Body() dto: NextQuestionDto) {
    return this.debate.nextQuestion(dto.sessionId);
  }

  @Post('turns')
  submitTurn(@Body() dto: SubmitTurnDto) {
    return this.debate.submitTurn(dto);
  }

  @Get('history/:delegateId')
  history(@Param('delegateId') delegateId: string, @Query('limit') limit?: string) {
    const parsed = Number(limit ?? 20);
    return this.debate.history(delegateId, Number.isFinite(parsed) ? parsed : 20);
  }
}
