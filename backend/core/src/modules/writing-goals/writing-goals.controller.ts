import { Controller, UseGuards } from '@nestjs/common';
import { ProjectScopedCrudController } from '../../common/access/project-scoped-crud.controller';
import { WritingGoalsService } from './writing-goals.service';
import { WritingGoal } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('writing-goals')
export class WritingGoalsController extends ProjectScopedCrudController<WritingGoal> {
  constructor(service: WritingGoalsService) {
    super(service);
  }
}
