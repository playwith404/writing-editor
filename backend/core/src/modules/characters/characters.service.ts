import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { Character } from '../../entities';
import { SearchService } from '../search/search.service';

@Injectable()
export class CharactersService extends CrudService<Character> {
  constructor(
    @InjectRepository(Character)
    repo: Repository<Character>,
    private readonly searchService: SearchService,
  ) {
    super(repo);
  }

  override async create(dto: Partial<Character>): Promise<Character> {
    const character = await super.create(dto);
    await this.searchService.indexDocument('characters', character.id, {
      id: character.id,
      projectId: character.projectId,
      name: character.name,
      role: character.role,
      backstory: character.backstory,
    });
    return character;
  }

  override async update(id: string, dto: Partial<Character>): Promise<Character | null> {
    const character = await super.update(id, dto);
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
