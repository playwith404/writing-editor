import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { ReaderPrediction } from '../../entities';

@Injectable()
export class ReaderPredictionsService extends CrudService<ReaderPrediction> {
  constructor(
    @InjectRepository(ReaderPrediction)
    repo: Repository<ReaderPrediction>,
  ) {
    super(repo);
  }
}
