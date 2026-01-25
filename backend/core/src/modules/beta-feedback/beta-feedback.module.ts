import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BetaFeedbackService } from './beta-feedback.service';
import { BetaFeedbackController } from './beta-feedback.controller';
import { BetaFeedback } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([BetaFeedback])],
  providers: [BetaFeedbackService],
  controllers: [BetaFeedbackController],
})
export class BetaFeedbackModule {}
