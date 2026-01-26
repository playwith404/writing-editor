import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { ProjectScopedCrudService } from '../../common/access/project-scoped-crud.service';
import { Relationship } from '../../entities';

@Injectable()
export class RelationshipsService extends ProjectScopedCrudService<Relationship> {
  constructor(
    @InjectRepository(Relationship)
    repo: Repository<Relationship>,
    projectAccessService: ProjectAccessService,
  ) {
    super(repo, projectAccessService);
  }
}
