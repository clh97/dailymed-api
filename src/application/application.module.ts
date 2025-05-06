import { Module } from '@nestjs/common';
import { IndicationExtractorService } from '@application/services/indication-extractor.service';

@Module({
  imports: [],
  providers: [IndicationExtractorService],
  exports: [IndicationExtractorService],
})
export class ApplicationModule {}
