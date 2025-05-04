import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppModule } from './modules/app/app.module';
import { AppModule } from './modules/app.module';
import { HealthController } from './presentation/controllers/health/health.controller';

@Module({
  imports: [AppModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
