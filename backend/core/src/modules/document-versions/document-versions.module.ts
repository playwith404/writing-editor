import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentVersionsService } from './document-versions.service';
import { DocumentVersionsController } from './document-versions.controller';
import { Document, DocumentVersion, Project, WritingGoal } from '../../entities';
import { AccessModule } from '../../common/access/access.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentVersion, Document, Project, WritingGoal]), SearchModule, AccessModule],
  providers: [DocumentVersionsService],
  controllers: [DocumentVersionsController],
})
export class DocumentVersionsModule {}
