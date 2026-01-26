import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorldSettingsService } from './world-settings.service';
import { WorldSettingsController } from './world-settings.controller';
import { WorldSetting } from '../../entities';
import { SearchModule } from '../search/search.module';
import { AccessModule } from '../../common/access/access.module';

@Module({
  imports: [TypeOrmModule.forFeature([WorldSetting]), SearchModule, AccessModule],
  providers: [WorldSettingsService],
  controllers: [WorldSettingsController],
})
export class WorldSettingsModule {}
