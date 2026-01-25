import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { ResearchItem } from '../../entities';

@Injectable()
export class ResearchItemsService extends CrudService<ResearchItem> {
  constructor(
    @InjectRepository(ResearchItem)
    repo: Repository<ResearchItem>,
  ) {
    super(repo);
  }
}
