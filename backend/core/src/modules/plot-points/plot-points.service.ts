import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { PlotPoint } from '../../entities';

@Injectable()
export class PlotPointsService extends CrudService<PlotPoint> {
  constructor(
    @InjectRepository(PlotPoint)
    repo: Repository<PlotPoint>,
  ) {
    super(repo);
  }
}
