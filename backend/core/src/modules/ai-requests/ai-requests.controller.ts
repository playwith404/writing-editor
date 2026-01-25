import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { AiRequestsService } from './ai-requests.service';
import { AiRequest } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('ai-requests')
export class AiRequestsController extends CrudController<AiRequest> {
  constructor(service: AiRequestsService) {
    super(service);
  }
}
