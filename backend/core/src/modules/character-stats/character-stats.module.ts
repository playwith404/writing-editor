import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharacterStatsService } from './character-stats.service';
import { CharacterStatsController } from './character-stats.controller';
import { CharacterStat } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([CharacterStat])],
  providers: [CharacterStatsService],
  controllers: [CharacterStatsController],
})
export class CharacterStatsModule {}
