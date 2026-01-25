import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResearchItemsService } from './research-items.service';
import { ResearchItemsController } from './research-items.controller';
import { ResearchItem } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([ResearchItem])],
  providers: [ResearchItemsService],
  controllers: [ResearchItemsController],
})
export class ResearchItemsModule {}
