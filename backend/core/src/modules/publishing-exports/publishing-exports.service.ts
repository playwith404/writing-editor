import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { PublishingExport } from '../../entities';

@Injectable()
export class PublishingExportsService extends CrudService<PublishingExport> {
  constructor(
    @InjectRepository(PublishingExport)
    repo: Repository<PublishingExport>,
  ) {
    super(repo);
  }
}
