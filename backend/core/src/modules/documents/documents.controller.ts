import { Controller, UseGuards } from '@nestjs/common';
import { ProjectScopedCrudController } from '../../common/access/project-scoped-crud.controller';
import { DocumentsService } from './documents.service';
import { Document } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController extends ProjectScopedCrudController<Document> {
  constructor(service: DocumentsService) {
    super(service);
  }
}
