import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { BetaSessionsService } from './beta-sessions.service';
import { BetaSession } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('beta-sessions')
export class BetaSessionsController extends CrudController<BetaSession> {
  constructor(service: BetaSessionsService) {
    super(service);
  }
}
