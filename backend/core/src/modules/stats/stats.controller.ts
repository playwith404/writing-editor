import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  @Get('projects/:projectId')
  async projectStats(@Req() req: any, @Param('projectId') projectId: string) {
    await this.projectAccessService.assertProjectAccess(req.user?.userId, projectId);
    return this.statsService.projectStats(projectId);
  }
}
