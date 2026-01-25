import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { Plot } from '../../entities';
import { SearchService } from '../search/search.service';

@Injectable()
export class PlotsService extends CrudService<Plot> {
  constructor(
    @InjectRepository(Plot)
    repo: Repository<Plot>,
    private readonly searchService: SearchService,
  ) {
    super(repo);
  }

  override async create(dto: Partial<Plot>): Promise<Plot> {
    const plot = await super.create(dto);
    await this.searchService.indexDocument('plots', plot.id, {
      id: plot.id,
      projectId: plot.projectId,
      title: plot.title,
      description: plot.description,
    });
    return plot;
  }

  override async update(id: string, dto: Partial<Plot>): Promise<Plot | null> {
    const plot = await super.update(id, dto);
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
