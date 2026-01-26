import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { ProjectScopedCrudService } from '../../common/access/project-scoped-crud.service';
import { WritingGoal } from '../../entities';

@Injectable()
export class WritingGoalsService extends ProjectScopedCrudService<WritingGoal> {
  constructor(
    @InjectRepository(WritingGoal)
    repo: Repository<WritingGoal>,
    projectAccessService: ProjectAccessService,
  ) {
    super(repo, projectAccessService);
  }
}
