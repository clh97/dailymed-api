import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import Redis from 'ioredis';

import { IndicationController } from '@infrastructure/controllers/indication.controller';
import { ClaudeClient } from '@infrastructure/external-services/claude/claude.client';
import { DailyMedClient } from '@infrastructure/external-services/dailymed/dailymed.client';
import { IndicationExtractorService } from '@application/services/indication-extractor.service';
import { ApplicationModule } from './application/application.module';
import { IndicationMapperService } from '@application/services/indication-mapper.service';
import { AppConfigInterface } from '@shared/config/app-config.interface';

@Module({
  imports: [
    ApplicationModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    RootModule,
  ],
  controllers: [IndicationController],
  providers: [
    DailyMedClient,
    ClaudeClient,
    IndicationExtractorService,
    IndicationMapperService,
    DailyMedClient,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService<AppConfigInterface>) =>
        new Redis({
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
        }),
      inject: [ConfigService],
    },
  ],
  exports: [DailyMedClient, 'REDIS_CLIENT'],
})
export class RootModule {}
