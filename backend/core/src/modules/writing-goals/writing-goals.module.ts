import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WritingGoalsService } from './writing-goals.service';
import { WritingGoalsController } from './writing-goals.controller';
import { WritingGoal } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([WritingGoal])],
  providers: [WritingGoalsService],
  controllers: [WritingGoalsController],
})
export class WritingGoalsModule {}
