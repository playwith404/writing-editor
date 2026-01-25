import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentCommentsService } from './document-comments.service';
import { DocumentCommentsController } from './document-comments.controller';
import { DocumentComment } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentComment])],
  providers: [DocumentCommentsService],
  controllers: [DocumentCommentsController],
})
export class DocumentCommentsModule {}
