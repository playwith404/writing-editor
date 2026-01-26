import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublishingExportsService } from './publishing-exports.service';
import { PublishingExportsController } from './publishing-exports.controller';
import { Document, Project, PublishingExport } from '../../entities';
import { AccessModule } from '../../common/access/access.module';

@Module({
  imports: [TypeOrmModule.forFeature([PublishingExport, Document, Project]), AccessModule],
  providers: [PublishingExportsService],
  controllers: [PublishingExportsController],
})
export class PublishingExportsModule {}
