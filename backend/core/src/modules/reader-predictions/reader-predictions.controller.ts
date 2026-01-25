import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { ReaderPredictionsService } from './reader-predictions.service';
import { ReaderPrediction } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reader-predictions')
export class ReaderPredictionsController extends CrudController<ReaderPrediction> {
  constructor(service: ReaderPredictionsService) {
    super(service);
  }
}
