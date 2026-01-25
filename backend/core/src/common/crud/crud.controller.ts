import { Body, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CrudService } from './crud.service';

export class CrudController<T extends { id: string }> {
  constructor(protected readonly service: CrudService<T>) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: Partial<T>, _req?: any) {
    return this.service.create(dto as Partial<T>);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<T>) {
    return this.service.update(id, dto as Partial<T>);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
