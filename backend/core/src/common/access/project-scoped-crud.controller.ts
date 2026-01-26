import { Body, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ProjectScopedCrudService } from './project-scoped-crud.service';

export class ProjectScopedCrudController<T extends { id: string; projectId: string }> {
  constructor(protected readonly service: ProjectScopedCrudService<T>) {}

  @Get()
  findAll(@Req() req: any, @Query('projectId') projectId?: string) {
    return this.service.findAllForUser(req.user?.userId, projectId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOneForUser(req.user?.userId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: Partial<T>) {
    return this.service.createForUser(req.user?.userId, dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: Partial<T>) {
    return this.service.updateForUser(req.user?.userId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.removeForUser(req.user?.userId, id);
  }
}

