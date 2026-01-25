import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { AiUsage } from '../../entities';

@Injectable()
export class AiUsageService extends CrudService<AiUsage> {
  constructor(
    @InjectRepository(AiUsage)
    repo: Repository<AiUsage>,
  ) {
    super(repo);
  }
}
