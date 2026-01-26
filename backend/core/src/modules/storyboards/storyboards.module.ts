import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoryboardsService } from './storyboards.service';
import { StoryboardsController } from './storyboards.controller';
import { Document, Storyboard } from '../../entities';
import { AccessModule } from '../../common/access/access.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Storyboard, Document]), AiModule, AccessModule],
  providers: [StoryboardsService],
  controllers: [StoryboardsController],
})
export class StoryboardsModule {}
