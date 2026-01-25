import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { AiUsageService } from './ai-usage.service';
import { AiUsage } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('ai-usage')
export class AiUsageController extends CrudController<AiUsage> {
  constructor(service: AiUsageService) {
    super(service);
  }
}
