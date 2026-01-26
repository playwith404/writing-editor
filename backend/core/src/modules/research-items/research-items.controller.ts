import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ProjectScopedCrudController } from '../../common/access/project-scoped-crud.controller';
import { ResearchItemsService } from './research-items.service';
import { ResearchItem } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('research-items')
export class ResearchItemsController extends ProjectScopedCrudController<ResearchItem> {
  constructor(service: ResearchItemsService) {
    super(service);
  }

  @Post('generate')
  generate(@Req() req: any, @Body() dto: any) {
    return (this.service as ResearchItemsService).generateForUser(req.user, dto);
  }
}
