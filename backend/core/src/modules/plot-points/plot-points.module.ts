import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlotPointsService } from './plot-points.service';
import { PlotPointsController } from './plot-points.controller';
import { Plot, PlotPoint } from '../../entities';
import { AccessModule } from '../../common/access/access.module';

@Module({
  imports: [TypeOrmModule.forFeature([PlotPoint, Plot]), AccessModule],
  providers: [PlotPointsService],
  controllers: [PlotPointsController],
})
export class PlotPointsModule {}
