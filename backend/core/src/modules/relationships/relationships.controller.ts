import { Controller, UseGuards } from '@nestjs/common';
import { ProjectScopedCrudController } from '../../common/access/project-scoped-crud.controller';
import { RelationshipsService } from './relationships.service';
import { Relationship } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('relationships')
export class RelationshipsController extends ProjectScopedCrudController<Relationship> {
  constructor(service: RelationshipsService) {
    super(service);
  }
}
