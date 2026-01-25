import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublishingExportsService } from './publishing-exports.service';
import { PublishingExportsController } from './publishing-exports.controller';
import { PublishingExport } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([PublishingExport])],
  providers: [PublishingExportsService],
  controllers: [PublishingExportsController],
})
export class PublishingExportsModule {}
