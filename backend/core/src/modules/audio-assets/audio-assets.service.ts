import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { AudioAsset } from '../../entities';

@Injectable()
export class AudioAssetsService extends CrudService<AudioAsset> {
  constructor(
    @InjectRepository(AudioAsset)
    repo: Repository<AudioAsset>,
  ) {
    super(repo);
  }
}
