import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharacterStatsService } from './character-stats.service';
import { CharacterStatsController } from './character-stats.controller';
import { Character, CharacterStat } from '../../entities';
import { AccessModule } from '../../common/access/access.module';

@Module({
  imports: [TypeOrmModule.forFeature([CharacterStat, Character]), AccessModule],
  providers: [CharacterStatsService],
  controllers: [CharacterStatsController],
})
export class CharacterStatsModule {}
