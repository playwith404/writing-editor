import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { ResearchItemsService } from './research-items.service';
import { ResearchItem } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('research-items')
export class ResearchItemsController extends CrudController<ResearchItem> {
  constructor(service: ResearchItemsService) {
    super(service);
  }
}
