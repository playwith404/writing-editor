import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { AiRequest } from '../../entities';

@Injectable()
export class AiRequestsService extends CrudService<AiRequest> {
  constructor(
    @InjectRepository(AiRequest)
    repo: Repository<AiRequest>,
  ) {
    super(repo);
  }
}
