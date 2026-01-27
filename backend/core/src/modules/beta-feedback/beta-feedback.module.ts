import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BetaFeedbackService } from './beta-feedback.service';
import { BetaFeedbackController } from './beta-feedback.controller';
import { AccessModule } from '../../common/access/access.module';
import { BetaFeedback } from '../../entities';
import { BetaAccessModule } from '../beta-access/beta-access.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [TypeOrmModule.forFeature([BetaFeedback]), AccessModule, BetaAccessModule, PointsModule],
  providers: [BetaFeedbackService],
  controllers: [BetaFeedbackController],
})
export class BetaFeedbackModule {}
