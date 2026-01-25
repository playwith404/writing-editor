import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorldSettingsService } from './world-settings.service';
import { WorldSettingsController } from './world-settings.controller';
import { WorldSetting } from '../../entities';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [TypeOrmModule.forFeature([WorldSetting]), SearchModule],
  providers: [WorldSettingsService],
  controllers: [WorldSettingsController],
})
export class WorldSettingsModule {}
