import { Controller, UseGuards } from '@nestjs/common';
import { UserScopedCrudController } from '../../common/access/user-scoped-crud.controller';
import { AiUsageService } from './ai-usage.service';
import { AiUsage } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('ai-usage')
export class AiUsageController extends UserScopedCrudController<AiUsage> {
  constructor(service: AiUsageService) {
    super(service);
  }
}
