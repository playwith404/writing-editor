import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { Translation } from '../../entities';

@Injectable()
export class TranslationsService extends CrudService<Translation> {
  constructor(
    @InjectRepository(Translation)
    repo: Repository<Translation>,
  ) {
    super(repo);
  }
}
