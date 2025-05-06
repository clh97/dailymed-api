import { AuthModule } from '@infrastructure/auth/auth.module';
import { AuthController } from '@infrastructure/controllers/auth.controller';
import { IndicationController } from '@infrastructure/controllers/indication.controller';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { ComprehendClientService } from '@infrastructure/external-services/ai-mapping/comprehend.client/comprehend.client.service';
import { DailyMedClient } from '@infrastructure/external-services/dailymed/dailymed.client';
import { IndicationExtractorService } from '@application/services/indication-extractor.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ApplicationModule } from './application/application.module';

@Module({
  imports: [
    ApplicationModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    DatabaseModule,
    AuthModule,
    RootModule,
  ],
  controllers: [IndicationController, AuthController],
  providers: [
    DailyMedClient,
    ComprehendClientService,
    IndicationExtractorService,
    DailyMedClient,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) =>
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
