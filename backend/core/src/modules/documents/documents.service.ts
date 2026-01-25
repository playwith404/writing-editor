import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { Document } from '../../entities';
import { SearchService } from '../search/search.service';

@Injectable()
export class DocumentsService extends CrudService<Document> {
  constructor(
    @InjectRepository(Document)
    repo: Repository<Document>,
    private readonly searchService: SearchService,
  ) {
    super(repo);
  }

  override async create(dto: Partial<Document>): Promise<Document> {
    const document = await super.create(dto);
    await this.searchService.indexDocument('documents', document.id, {
      id: document.id,
      projectId: document.projectId,
      title: document.title,
      content: document.content,
      type: document.type,
    });
    return document;
  }

  override async update(id: string, dto: Partial<Document>): Promise<Document | null> {
    const document = await super.update(id, dto);
    if (document) {
      await this.searchService.indexDocument('documents', document.id, {
        id: document.id,
        projectId: document.projectId,
        title: document.title,
        content: document.content,
        type: document.type,
      });
    }
    return document;
  }
}
