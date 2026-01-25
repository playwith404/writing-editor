import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { ProjectMember } from '../../entities';

@Injectable()
export class ProjectMembersService extends CrudService<ProjectMember> {
  constructor(
    @InjectRepository(ProjectMember)
    repo: Repository<ProjectMember>,
  ) {
    super(repo);
  }
}
