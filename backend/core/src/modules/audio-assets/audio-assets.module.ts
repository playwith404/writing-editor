import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AudioAssetsService } from './audio-assets.service';
import { AudioAssetsController } from './audio-assets.controller';
import { AudioAsset, Document } from '../../entities';
import { AccessModule } from '../../common/access/access.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([AudioAsset, Document]), AiModule, AccessModule],
  providers: [AudioAssetsService],
  controllers: [AudioAssetsController],
})
export class AudioAssetsModule {}
