import { Controller, UseGuards } from '@nestjs/common';
import { CrudController } from '../../common/crud/crud.controller';
import { AudioAssetsService } from './audio-assets.service';
import { AudioAsset } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('audio-assets')
export class AudioAssetsController extends CrudController<AudioAsset> {
  constructor(service: AudioAssetsService) {
    super(service);
  }
}
