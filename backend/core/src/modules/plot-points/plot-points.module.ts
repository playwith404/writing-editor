import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlotPointsService } from './plot-points.service';
import { PlotPointsController } from './plot-points.controller';
import { PlotPoint } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([PlotPoint])],
  providers: [PlotPointsService],
  controllers: [PlotPointsController],
})
export class PlotPointsModule {}
