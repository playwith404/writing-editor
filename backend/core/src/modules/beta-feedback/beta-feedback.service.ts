import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { BetaFeedback } from '../../entities';

@Injectable()
export class BetaFeedbackService extends CrudService<BetaFeedback> {
  constructor(
    @InjectRepository(BetaFeedback)
    repo: Repository<BetaFeedback>,
  ) {
    super(repo);
  }
}
