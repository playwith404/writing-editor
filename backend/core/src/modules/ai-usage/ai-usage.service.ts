import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserScopedCrudService } from '../../common/access/user-scoped-crud.service';
import { AiUsage } from '../../entities';

@Injectable()
export class AiUsageService extends UserScopedCrudService<AiUsage> {
  constructor(
    @InjectRepository(AiUsage)
    repo: Repository<AiUsage>,
  ) {
    super(repo);
  }
}
