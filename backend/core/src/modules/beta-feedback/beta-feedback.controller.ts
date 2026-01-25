import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { BetaFeedbackService } from './beta-feedback.service';
import { BetaFeedback } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('beta-feedback')
export class BetaFeedbackController extends CrudController<BetaFeedback> {
  constructor(service: BetaFeedbackService) {
    super(service);
  }
}
