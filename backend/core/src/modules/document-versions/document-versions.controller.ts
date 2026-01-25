import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { DocumentVersionsService } from './document-versions.service';
import { DocumentVersion } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('document-versions')
export class DocumentVersionsController extends CrudController<DocumentVersion> {
  constructor(service: DocumentVersionsService) {
    super(service);
  }
}
