import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { PublishingExportsService } from './publishing-exports.service';
import { PublishingExport } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('publishing-exports')
export class PublishingExportsController extends CrudController<PublishingExport> {
  constructor(service: PublishingExportsService) {
    super(service);
  }
}
