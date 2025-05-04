import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { ControllerModule } from './controller.module';

@Module({
  imports: [DatabaseModule, ControllerModule]
})
export class AppModule {}
