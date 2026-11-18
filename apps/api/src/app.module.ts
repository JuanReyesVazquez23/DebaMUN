import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CountriesModule } from './countries/countries.module.js';
import { DatabaseModule } from './database/database.module.js';
import { DebateModule } from './debate/debate.module.js';
import { HealthController } from './health/health.controller.js';
import { JobsModule } from './jobs/jobs.module.js';
import { ResearchModule } from './research/research.module.js';
import { SessionsModule } from './sessions/sessions.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    CountriesModule,
    SessionsModule,
    DebateModule,
    JobsModule,
    ResearchModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
