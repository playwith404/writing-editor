import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { Document, DocumentComment } from '../../entities';

@Injectable()
export class DocumentCommentsService {
  constructor(
    @InjectRepository(DocumentComment)
    private readonly commentsRepo: Repository<DocumentComment>,
    @InjectRepository(Document)
    private readonly documentsRepo: Repository<Document>,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  private async assertDocumentAccess(userId: string, documentId: string): Promise<Document> {
    const doc = await this.documentsRepo.findOne({ where: { id: documentId } });
    if (!doc) {
      throw new BadRequestException('문서를 찾을 수 없습니다.');
    }
    await this.projectAccessService.assertProjectAccess(userId, doc.projectId);
    return doc;
  }

  async findAllForUser(userId: string, documentId: string) {
    await this.assertDocumentAccess(userId, documentId);
    return this.commentsRepo.find({
      where: { documentId } as any,
      order: { createdAt: 'ASC' } as any,
    });
  }

  async findOneForUser(userId: string, id: string) {
    const comment = await this.commentsRepo.findOne({ where: { id } });
    if (!comment) return null;
    await this.assertDocumentAccess(userId, comment.documentId);
    return comment;
  }

  async createForUser(userId: string, dto: Partial<DocumentComment>) {
    if (!dto.documentId) {
      throw new BadRequestException('documentId가 필요합니다.');
    }
    await this.assertDocumentAccess(userId, dto.documentId);
    const comment = this.commentsRepo.create({ ...dto, userId: dto.userId ?? userId } as any);
    return this.commentsRepo.save(comment as any);
  }

  async updateForUser(userId: string, id: string, dto: Partial<DocumentComment>) {
    const comment = await this.commentsRepo.findOne({ where: { id } });
    if (!comment) return null;
    await this.assertDocumentAccess(userId, comment.documentId);
    await this.commentsRepo.update({ id } as any, dto as any);
    return this.findOneForUser(userId, id);
  }

  async removeForUser(userId: string, id: string) {
    const comment = await this.commentsRepo.findOne({ where: { id } });
    if (!comment) return;
    await this.assertDocumentAccess(userId, comment.documentId);
    await this.commentsRepo.delete({ id } as any);
  }
}

