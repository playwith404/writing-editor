import { Controller, UseGuards } from '@nestjs/common';
import { ProjectScopedCrudController } from '../../common/access/project-scoped-crud.controller';
import { BetaSessionsService } from './beta-sessions.service';
import { BetaSession } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('beta-sessions')
export class BetaSessionsController extends ProjectScopedCrudController<BetaSession> {
  constructor(service: BetaSessionsService) {
    super(service);
  }
}
