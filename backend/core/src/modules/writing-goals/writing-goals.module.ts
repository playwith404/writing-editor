import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WritingGoalsService } from './writing-goals.service';
import { WritingGoalsController } from './writing-goals.controller';
import { WritingGoal } from '../../entities';
import { AccessModule } from '../../common/access/access.module';

@Module({
  imports: [TypeOrmModule.forFeature([WritingGoal]), AccessModule],
  providers: [WritingGoalsService],
  controllers: [WritingGoalsController],
})
export class WritingGoalsModule {}
