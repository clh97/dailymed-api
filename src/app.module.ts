import { Module } from "@nestjs/common";
import { IndicationQueryService } from "@application/services/indication-query/indication-query.service";
import { IndicationController } from "@infrastructure/controllers/indication.controller";
import { AuthController } from "@infrastructure/controllers/auth.controller";
import { DatabaseModule } from "@infrastructure/database/database.module";
import { DailyMedClient } from "@infrastructure/external-services/dailymed/dailymed.client";
import { SplParserServiceService } from "@infrastructure/external-services/spl-parser/spl-parser.service";
import { ComprehendClientService } from "@infrastructure/external-services/ai-mapping/comprehend.client/comprehend.client.service";
import { AuthModule } from "@infrastructure/auth/auth.module";
import { LabelProcessingProducerService } from "@infrastructure/queues/producers/label-processing.producer/label-processing.producer.service";
import { LabelProcessingConsumerService } from "@infrastructure/queues/consumers/label-processing.consumer/label-processing.consumer.service";
import { IndicationMappingConsumerService } from "@infrastructure/queues/consumers/indication-mapping.consumer/indication-mapping.consumer.service";
import { QueuesModule } from "@infrastructure/queues/queues.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import Redis from "ioredis";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    QueuesModule,
    DatabaseModule,
    AuthModule,
    AppModule,
  ],
  controllers: [IndicationController, AuthController],
  providers: [
    IndicationQueryService,
    DailyMedClient,
    SplParserServiceService,
    ComprehendClientService,
    LabelProcessingProducerService,
    LabelProcessingConsumerService,
    IndicationMappingConsumerService,
    DailyMedClient,
    {
      provide: "REDIS_CLIENT",
      useFactory: (configService: ConfigService) =>
        new Redis({
          host: configService.get<string>("REDIS_HOST"),
          port: configService.get<number>("REDIS_PORT"),
        }),
      inject: [ConfigService],
    },
  ],
  exports: [DailyMedClient, "REDIS_CLIENT"],
})
export class AppModule {}
