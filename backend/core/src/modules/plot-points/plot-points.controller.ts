import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { PlotPointsService } from './plot-points.service';
import { PlotPoint } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('plot-points')
export class PlotPointsController extends CrudController<PlotPoint> {
  constructor(service: PlotPointsService) {
    super(service);
  }
}
