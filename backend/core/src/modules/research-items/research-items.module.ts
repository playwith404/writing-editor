import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResearchItemsService } from './research-items.service';
import { ResearchItemsController } from './research-items.controller';
import { ResearchItem } from '../../entities';
import { AccessModule } from '../../common/access/access.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([ResearchItem]), AiModule, AccessModule],
  providers: [ResearchItemsService],
  controllers: [ResearchItemsController],
})
export class ResearchItemsModule {}
