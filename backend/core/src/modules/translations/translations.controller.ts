import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { TranslationsService } from './translations.service';
import { Translation } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('translations')
export class TranslationsController extends CrudController<Translation> {
  constructor(service: TranslationsService) {
    super(service);
  }
}
