import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { Project } from '../../entities';
import { SearchService } from '../search/search.service';

@Injectable()
export class ProjectsService extends CrudService<Project> {
  constructor(
    @InjectRepository(Project)
    repo: Repository<Project>,
    private readonly searchService: SearchService,
  ) {
    super(repo);
  }

  override async create(dto: Partial<Project>): Promise<Project> {
    const project = await super.create(dto);
    await this.searchService.indexDocument('projects', project.id, {
      id: project.id,
      title: project.title,
      description: project.description,
      genre: project.genre,
      ownerId: project.ownerId,
    });
    return project;
  }

  override async update(id: string, dto: Partial<Project>): Promise<Project | null> {
    const project = await super.update(id, dto);
    if (project) {
      await this.searchService.indexDocument('projects', project.id, {
        id: project.id,
        title: project.title,
        description: project.description,
        genre: project.genre,
        ownerId: project.ownerId,
      });
    }
    return project;
  }
}
