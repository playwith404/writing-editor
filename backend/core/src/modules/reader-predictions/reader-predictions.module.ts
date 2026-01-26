import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReaderPredictionsService } from './reader-predictions.service';
import { ReaderPredictionsController } from './reader-predictions.controller';
import { Document, ReaderPrediction } from '../../entities';
import { AccessModule } from '../../common/access/access.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([ReaderPrediction, Document]), AiModule, AccessModule],
  providers: [ReaderPredictionsService],
  controllers: [ReaderPredictionsController],
})
export class ReaderPredictionsModule {}
