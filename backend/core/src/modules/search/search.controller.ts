import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  @Get()
  async search(@Req() req: any, @Query('q') q: string, @Query('projectId') projectId?: string, @Query('type') type?: string) {
    if (!q) {
      return [];
    }

    const userId = req.user?.userId as string | undefined;
    if (!userId) return [];

    if (type === 'projects') {
      const projectIds = await this.projectAccessService.getAccessibleProjectIds(userId);
      return this.searchService.searchProjects(q, projectIds);
    }

    const projectIds = await this.projectAccessService.filterAccessibleProjectIds(userId, projectId);
    return this.searchService.search(q, { projectIds, type });
  }
}
