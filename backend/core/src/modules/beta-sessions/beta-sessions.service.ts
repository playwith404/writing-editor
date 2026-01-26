import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { ProjectScopedCrudService } from '../../common/access/project-scoped-crud.service';
import { BetaSession } from '../../entities';

@Injectable()
export class BetaSessionsService extends ProjectScopedCrudService<BetaSession> {
  constructor(
    @InjectRepository(BetaSession)
    repo: Repository<BetaSession>,
    projectAccessService: ProjectAccessService,
  ) {
    super(repo, projectAccessService);
  }
}
