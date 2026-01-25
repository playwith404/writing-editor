import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { Character, Document, Plot, WorldSetting } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Character, WorldSetting, Plot])],
  providers: [StatsService],
  controllers: [StatsController],
})
export class StatsModule {}
