import { Controller, UseGuards } from '@nestjs/common';
import { ProjectScopedCrudController } from '../../common/access/project-scoped-crud.controller';
import { ProjectMembersService } from './project-members.service';
import { ProjectMember } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('project-members')
export class ProjectMembersController extends ProjectScopedCrudController<ProjectMember> {
  constructor(service: ProjectMembersService) {
    super(service);
  }
}
