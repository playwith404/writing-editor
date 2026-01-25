import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query('q') q: string, @Query('projectId') projectId?: string, @Query('type') type?: string) {
    if (!q) {
      return [];
    }
    return this.searchService.search(q, { projectId, type });
  }
}
