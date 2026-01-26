import { Body, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { UserScopedCrudService } from './user-scoped-crud.service';

export class UserScopedCrudController<T extends { id: string; userId?: string }> {
  constructor(protected readonly service: UserScopedCrudService<T>) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAllForUser(req.user?.userId);
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

