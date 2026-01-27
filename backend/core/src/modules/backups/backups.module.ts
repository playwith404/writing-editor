import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessModule } from '../../common/access/access.module';
import {
  AudioAsset,
  Character,
  CharacterStat,
  Document,
  DocumentComment,
  DocumentVersion,
  MediaAsset,
  Plot,
  PlotPoint,
  Project,
  ReaderPrediction,
  ResearchItem,
  Relationship,
  Storyboard,
  Translation,
  WorldSetting,
  WritingGoal,
} from '../../entities';
import { SearchModule } from '../search/search.module';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Document,
      DocumentVersion,
      Character,
      CharacterStat,
      WorldSetting,
      Relationship,
      Plot,
      PlotPoint,
      WritingGoal,
      ResearchItem,
      Translation,
      AudioAsset,
      Storyboard,
      ReaderPrediction,
      DocumentComment,
      MediaAsset,
    ]),
    AccessModule,
    SearchModule,
  ],
  controllers: [BackupsController],
  providers: [BackupsService],
})
export class BackupsModule {}

