import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { BetaSession } from '../../entities';

@Injectable()
export class BetaSessionsService extends CrudService<BetaSession> {
  constructor(
    @InjectRepository(BetaSession)
    repo: Repository<BetaSession>,
  ) {
    super(repo);
  }
}
