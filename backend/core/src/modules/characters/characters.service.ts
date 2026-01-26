import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { ProjectScopedCrudService } from '../../common/access/project-scoped-crud.service';
import { Character } from '../../entities';
import { SearchService } from '../search/search.service';

@Injectable()
export class CharactersService extends ProjectScopedCrudService<Character> {
  constructor(
    @InjectRepository(Character)
    repo: Repository<Character>,
    private readonly searchService: SearchService,
    projectAccessService: ProjectAccessService,
  ) {
    super(repo, projectAccessService);
  }

  override async createForUser(userId: string | undefined, dto: Partial<Character>): Promise<Character> {
    const character = await super.createForUser(userId, dto);
    await this.searchService.indexDocument('characters', character.id, {
      id: character.id,
      projectId: character.projectId,
      name: character.name,
      role: character.role,
      backstory: character.backstory,
    });
    return character;
  }

  override async updateForUser(userId: string | undefined, id: string, dto: Partial<Character>): Promise<Character | null> {
    const character = await super.updateForUser(userId, id, dto);
    if (character) {
      await this.searchService.indexDocument('characters', character.id, {
        id: character.id,
        projectId: character.projectId,
        name: character.name,
        role: character.role,
        backstory: character.backstory,
      });
    }
    return character;
  }
}
