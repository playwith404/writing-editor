import { Controller, UseGuards } from '@nestjs/common';
import { ProjectScopedCrudController } from '../../common/access/project-scoped-crud.controller';
import { WorldSettingsService } from './world-settings.service';
import { WorldSetting } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('world-settings')
export class WorldSettingsController extends ProjectScopedCrudController<WorldSetting> {
  constructor(service: WorldSettingsService) {
    super(service);
  }
}
