import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { DocumentVersion } from '../../entities';

@Injectable()
export class DocumentVersionsService extends CrudService<DocumentVersion> {
  constructor(
    @InjectRepository(DocumentVersion)
    repo: Repository<DocumentVersion>,
  ) {
    super(repo);
  }
}
