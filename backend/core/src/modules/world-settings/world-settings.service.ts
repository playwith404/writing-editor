import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { WorldSetting } from '../../entities';
import { SearchService } from '../search/search.service';

@Injectable()
export class WorldSettingsService extends CrudService<WorldSetting> {
  constructor(
    @InjectRepository(WorldSetting)
    repo: Repository<WorldSetting>,
    private readonly searchService: SearchService,
  ) {
    super(repo);
  }

  override async create(dto: Partial<WorldSetting>): Promise<WorldSetting> {
    const setting = await super.create(dto);
    await this.searchService.indexDocument('world_settings', setting.id, {
      id: setting.id,
      projectId: setting.projectId,
      title: setting.title,
      content: setting.content,
      category: setting.category,
    });
    return setting;
  }

  override async update(id: string, dto: Partial<WorldSetting>): Promise<WorldSetting | null> {
    const setting = await super.update(id, dto);
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
