import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiUsageService } from './ai-usage.service';
import { AiUsageController } from './ai-usage.controller';
import { AiUsage } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([AiUsage])],
  providers: [AiUsageService],
  controllers: [AiUsageController],
})
export class AiUsageModule {}
