import { Controller, UseGuards } from '@nestjs/common';
import { ProjectScopedCrudController } from '../../common/access/project-scoped-crud.controller';
import { CharactersService } from './characters.service';
import { Character } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('characters')
export class CharactersController extends ProjectScopedCrudController<Character> {
  constructor(service: CharactersService) {
    super(service);
  }
}
