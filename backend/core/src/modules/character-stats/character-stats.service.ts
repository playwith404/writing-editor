import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { CharacterStat } from '../../entities';

@Injectable()
export class CharacterStatsService extends CrudService<CharacterStat> {
  constructor(
    @InjectRepository(CharacterStat)
    repo: Repository<CharacterStat>,
  ) {
    super(repo);
  }
}
