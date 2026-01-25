import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { CharacterStatsService } from './character-stats.service';
import { CharacterStat } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('character-stats')
export class CharacterStatsController extends CrudController<CharacterStat> {
  constructor(service: CharacterStatsService) {
    super(service);
  }
}
