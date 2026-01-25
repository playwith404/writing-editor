import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { WritingGoalsService } from './writing-goals.service';
import { WritingGoal } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('writing-goals')
export class WritingGoalsController extends CrudController<WritingGoal> {
  constructor(service: WritingGoalsService) {
    super(service);
  }
}
