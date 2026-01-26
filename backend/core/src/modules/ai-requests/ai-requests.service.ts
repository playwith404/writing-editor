import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserScopedCrudService } from '../../common/access/user-scoped-crud.service';
import { AiRequest } from '../../entities';

@Injectable()
export class AiRequestsService extends UserScopedCrudService<AiRequest> {
  constructor(
    @InjectRepository(AiRequest)
    repo: Repository<AiRequest>,
  ) {
    super(repo);
  }
}
