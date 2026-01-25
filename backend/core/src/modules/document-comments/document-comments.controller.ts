import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { DocumentCommentsService } from './document-comments.service';
import { DocumentComment } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('document-comments')
export class DocumentCommentsController extends CrudController<DocumentComment> {
  constructor(service: DocumentCommentsService) {
    super(service);
  }
}
