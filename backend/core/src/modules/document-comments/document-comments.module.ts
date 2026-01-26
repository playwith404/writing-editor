import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentCommentsService } from './document-comments.service';
import { DocumentCommentsController } from './document-comments.controller';
import { Document, DocumentComment } from '../../entities';
import { AccessModule } from '../../common/access/access.module';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentComment, Document]), AccessModule],
  providers: [DocumentCommentsService],
  controllers: [DocumentCommentsController],
})
export class DocumentCommentsModule {}
