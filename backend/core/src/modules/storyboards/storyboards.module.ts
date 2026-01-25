import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoryboardsService } from './storyboards.service';
import { StoryboardsController } from './storyboards.controller';
import { Storyboard } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Storyboard])],
  providers: [StoryboardsService],
  controllers: [StoryboardsController],
})
export class StoryboardsModule {}
