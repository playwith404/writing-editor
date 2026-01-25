import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { ProjectsService } from './projects.service';
import { Project } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController extends CrudController<Project> {
  constructor(service: ProjectsService) {
    super(service);
  }

  @Post()
  create(@Body() dto: Partial<Project>, @Req() req: any) {
    const userId = req.user?.userId;
    return this.service.create({ ...dto, ownerId: userId });
  }
}
