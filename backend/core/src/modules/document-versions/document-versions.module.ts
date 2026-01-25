import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentVersionsService } from './document-versions.service';
import { DocumentVersionsController } from './document-versions.controller';
import { DocumentVersion } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentVersion])],
  providers: [DocumentVersionsService],
  controllers: [DocumentVersionsController],
})
export class DocumentVersionsModule {}
