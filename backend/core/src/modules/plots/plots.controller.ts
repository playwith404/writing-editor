import { Controller, UseGuards } from '@nestjs/common';
import { ProjectScopedCrudController } from '../../common/access/project-scoped-crud.controller';
import { PlotsService } from './plots.service';
import { Plot } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('plots')
export class PlotsController extends ProjectScopedCrudController<Plot> {
  constructor(service: PlotsService) {
    super(service);
  }
}
