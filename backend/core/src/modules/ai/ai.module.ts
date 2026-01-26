import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AccessModule } from '../../common/access/access.module';
import { AiRequest, AiUsage } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([AiRequest, AiUsage]), AccessModule],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}

