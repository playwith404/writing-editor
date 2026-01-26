import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private isAdmin(req: any): boolean {
    return req.user?.role === 'admin';
  }

  private assertSelfOrAdmin(req: any, userId: string) {
    if (this.isAdmin(req)) return;
    if (req.user?.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }
  }

  @Get()
  findAll(@Req() req: any) {
    if (!this.isAdmin(req)) {
      throw new ForbiddenException('관리자만 접근할 수 있습니다.');
    }
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    this.assertSelfOrAdmin(req, id);
    return this.usersService.findById(id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateUserDto) {
    if (!this.isAdmin(req)) {
      throw new ForbiddenException('관리자만 수행할 수 있습니다.');
    }
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    this.assertSelfOrAdmin(req, id);
    if (this.isAdmin(req)) {
      return this.usersService.update(id, dto);
    }
    return this.usersService.update(id, {
      name: dto.name,
      avatarUrl: dto.avatarUrl,
    } as any);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    this.assertSelfOrAdmin(req, id);
    return this.usersService.remove(id);
  }
}
