import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { PlotsService } from './plots.service';
import { Plot } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('plots')
export class PlotsController extends CrudController<Plot> {
  constructor(service: PlotsService) {
    super(service);
  }
}
