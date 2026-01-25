import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { ProjectMembersService } from './project-members.service';
import { ProjectMember } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('project-members')
export class ProjectMembersController extends CrudController<ProjectMember> {
  constructor(service: ProjectMembersService) {
    super(service);
  }
}
