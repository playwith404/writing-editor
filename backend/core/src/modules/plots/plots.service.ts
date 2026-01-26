import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { ProjectScopedCrudService } from '../../common/access/project-scoped-crud.service';
import { Plot } from '../../entities';
import { SearchService } from '../search/search.service';

@Injectable()
export class PlotsService extends ProjectScopedCrudService<Plot> {
  constructor(
    @InjectRepository(Plot)
    repo: Repository<Plot>,
    private readonly searchService: SearchService,
    projectAccessService: ProjectAccessService,
  ) {
    super(repo, projectAccessService);
  }

  override async createForUser(userId: string | undefined, dto: Partial<Plot>): Promise<Plot> {
    const plot = await super.createForUser(userId, dto);
    await this.searchService.indexDocument('plots', plot.id, {
      id: plot.id,
      projectId: plot.projectId,
      title: plot.title,
      description: plot.description,
    });
    return plot;
  }

  override async updateForUser(userId: string | undefined, id: string, dto: Partial<Plot>): Promise<Plot | null> {
    const plot = await super.updateForUser(userId, id, dto);
    if (plot) {
      await this.searchService.indexDocument('plots', plot.id, {
        id: plot.id,
        projectId: plot.projectId,
        title: plot.title,
        description: plot.description,
      });
    }
    return plot;
  }
}
