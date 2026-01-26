import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { ProjectScopedCrudService } from '../../common/access/project-scoped-crud.service';
import { WorldSetting } from '../../entities';
import { SearchService } from '../search/search.service';

@Injectable()
export class WorldSettingsService extends ProjectScopedCrudService<WorldSetting> {
  constructor(
    @InjectRepository(WorldSetting)
    repo: Repository<WorldSetting>,
    private readonly searchService: SearchService,
    projectAccessService: ProjectAccessService,
  ) {
    super(repo, projectAccessService);
  }

  override async createForUser(userId: string | undefined, dto: Partial<WorldSetting>): Promise<WorldSetting> {
    const setting = await super.createForUser(userId, dto);
    await this.searchService.indexDocument('world_settings', setting.id, {
      id: setting.id,
      projectId: setting.projectId,
      title: setting.title,
      content: setting.content,
      category: setting.category,
    });
    return setting;
  }

  override async updateForUser(userId: string | undefined, id: string, dto: Partial<WorldSetting>): Promise<WorldSetting | null> {
    const setting = await super.updateForUser(userId, id, dto);
    if (setting) {
      await this.searchService.indexDocument('world_settings', setting.id, {
        id: setting.id,
        projectId: setting.projectId,
        title: setting.title,
        content: setting.content,
        category: setting.category,
      });
    }
    return setting;
  }
}
