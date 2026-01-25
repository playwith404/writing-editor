import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { DocumentComment } from '../../entities';

@Injectable()
export class DocumentCommentsService extends CrudService<DocumentComment> {
  constructor(
    @InjectRepository(DocumentComment)
    repo: Repository<DocumentComment>,
  ) {
    super(repo);
  }
}
