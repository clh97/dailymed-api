import { Module } from "@nestjs/common";
import { IndicationQueryService } from "@application/services/indication-query/indication-query.service";
import { IndicationController } from "@infrastructure/controllers/indication/indication.controller";
import { AuthController } from "@infrastructure/controllers/auth/auth.controller";
import { DatabaseModule } from "@infrastructure/database/database.module";
import { DailymedClientService } from "@infrastructure/external-services/dailymed/dailymed.client/dailymed.client.service";
import { SplParserServiceService } from "@infrastructure/external-services/spl-parser/spl-parser.service/spl-parser.service.service";
import { ComprehendClientService } from "@infrastructure/external-services/ai-mapping/comprehend.client/comprehend.client.service";
import { AuthModule } from "@infrastructure/auth/auth.module";
import { LabelProcessingProducerService } from "@infrastructure/queues/producers/label-processing.producer/label-processing.producer.service";
import { LabelProcessingConsumerService } from "@infrastructure/queues/consumers/label-processing.consumer/label-processing.consumer.service";
import { IndicationMappingConsumerService } from "@infrastructure/queues/consumers/indication-mapping.consumer/indication-mapping.consumer.service";
import { QueuesModule } from "@infrastructure/queues/queues.module";

@Module({
  imports: [AppModule, DatabaseModule, AuthModule, QueuesModule],
  controllers: [IndicationController, AuthController],
  providers: [
    IndicationQueryService,
    DailymedClientService,
    SplParserServiceService,
    ComprehendClientService,
    LabelProcessingProducerService,
    LabelProcessingConsumerService,
    IndicationMappingConsumerService,
  ],
})
export class AppModule {}
