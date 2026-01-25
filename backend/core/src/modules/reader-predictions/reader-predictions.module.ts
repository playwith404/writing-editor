import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReaderPredictionsService } from './reader-predictions.service';
import { ReaderPredictionsController } from './reader-predictions.controller';
import { ReaderPrediction } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([ReaderPrediction])],
  providers: [ReaderPredictionsService],
  controllers: [ReaderPredictionsController],
})
export class ReaderPredictionsModule {}
