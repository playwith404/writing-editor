import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document, DocumentVersion, Project, WritingGoal } from '../../entities';
import { SearchModule } from '../search/search.module';
import { AccessModule } from '../../common/access/access.module';

@Module({
  imports: [TypeOrmModule.forFeature([Document, DocumentVersion, Project, WritingGoal]), SearchModule, AccessModule],
  providers: [DocumentsService],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
