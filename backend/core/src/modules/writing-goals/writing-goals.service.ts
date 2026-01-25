import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { WritingGoal } from '../../entities';

@Injectable()
export class WritingGoalsService extends CrudService<WritingGoal> {
  constructor(
    @InjectRepository(WritingGoal)
    repo: Repository<WritingGoal>,
  ) {
    super(repo);
  }
}
