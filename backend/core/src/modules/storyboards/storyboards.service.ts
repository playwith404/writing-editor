import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { Storyboard } from '../../entities';

@Injectable()
export class StoryboardsService extends CrudService<Storyboard> {
  constructor(
    @InjectRepository(Storyboard)
    repo: Repository<Storyboard>,
  ) {
    super(repo);
  }
}
