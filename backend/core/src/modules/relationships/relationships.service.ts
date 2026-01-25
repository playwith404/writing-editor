import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { Relationship } from '../../entities';

@Injectable()
export class RelationshipsService extends CrudService<Relationship> {
  constructor(
    @InjectRepository(Relationship)
    repo: Repository<Relationship>,
  ) {
    super(repo);
  }
}
