import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectAccessService } from '../../common/access/project-access.service';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  @Get()
  findAll(@Req() req: any) {
    return this.projectsService.findAllForUser(req.user?.userId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.findOneForUser(req.user?.userId, id);
  }

  @Post()
  create(@Body() dto: any, @Req() req: any) {
    const userId = req.user?.userId;
    return this.projectsService.create({ ...dto, ownerId: userId });
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.projectsService.updateForUser(req.user?.userId, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.projectsService.removeForUser(req.user?.userId, id);
    return { success: true };
  }

  @Get(':id/access')
  async access(@Req() req: any, @Param('id') id: string) {
    await this.projectAccessService.assertProjectAccess(req.user?.userId, id);
    return { ok: true, userId: req.user?.userId, role: req.user?.role };
  }

  @Get(':id/members')
  async members(@Req() req: any, @Param('id') id: string) {
    await this.projectAccessService.assertProjectAccess(req.user?.userId, id);
    return this.projectAccessService.findMembers(id);
  }

  @Post(':id/members')
  async addMember(@Req() req: any, @Param('id') id: string, @Body() body: { userId: string; role?: string }) {
    await this.projectAccessService.assertProjectOwner(req.user?.userId, id);
    return this.projectAccessService.addMember(id, body.userId, body.role);
  }

  @Delete(':id/members/:memberId')
  async removeMember(@Req() req: any, @Param('id') id: string, @Param('memberId') memberId: string) {
    await this.projectAccessService.assertProjectOwner(req.user?.userId, id);
    await this.projectAccessService.removeMemberById(id, memberId);
    return { success: true };
  }
}
