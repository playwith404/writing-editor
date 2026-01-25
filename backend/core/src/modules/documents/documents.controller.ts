import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { DocumentsService } from './documents.service';
import { Document } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController extends CrudController<Document> {
  constructor(service: DocumentsService) {
    super(service);
  }
}
