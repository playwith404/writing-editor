import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { CharactersService } from './characters.service';
import { Character } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('characters')
export class CharactersController extends CrudController<Character> {
  constructor(service: CharactersService) {
    super(service);
  }
}
