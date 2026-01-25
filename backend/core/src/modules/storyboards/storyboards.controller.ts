import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { StoryboardsService } from './storyboards.service';
import { Storyboard } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('storyboards')
export class StoryboardsController extends CrudController<Storyboard> {
  constructor(service: StoryboardsService) {
    super(service);
  }
}
