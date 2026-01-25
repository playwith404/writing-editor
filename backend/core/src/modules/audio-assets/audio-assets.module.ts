import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AudioAssetsService } from './audio-assets.service';
import { AudioAssetsController } from './audio-assets.controller';
import { AudioAsset } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([AudioAsset])],
  providers: [AudioAssetsService],
  controllers: [AudioAssetsController],
})
export class AudioAssetsModule {}
