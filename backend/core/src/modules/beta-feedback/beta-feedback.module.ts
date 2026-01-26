import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BetaFeedbackService } from './beta-feedback.service';
import { BetaFeedbackController } from './beta-feedback.controller';
import { AccessModule } from '../../common/access/access.module';
import { BetaFeedback, BetaSession } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([BetaFeedback, BetaSession]), AccessModule],
  providers: [BetaFeedbackService],
  controllers: [BetaFeedbackController],
})
export class BetaFeedbackModule {}
