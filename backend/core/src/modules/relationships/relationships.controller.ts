import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { RelationshipsService } from './relationships.service';
import { Relationship } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('relationships')
export class RelationshipsController extends CrudController<Relationship> {
  constructor(service: RelationshipsService) {
    super(service);
  }
}
