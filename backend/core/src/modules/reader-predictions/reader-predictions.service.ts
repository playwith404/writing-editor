import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { Document, ReaderPrediction } from '../../entities';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ReaderPredictionsService {
  constructor(
    @InjectRepository(ReaderPrediction)
    private readonly predictionsRepo: Repository<ReaderPrediction>,
    @InjectRepository(Document)
    private readonly documentsRepo: Repository<Document>,
    private readonly projectAccessService: ProjectAccessService,
    private readonly aiService: AiService,
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
    return this.predictionsRepo.find({
      where: { documentId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  async findOneForUser(userId: string, id: string) {
    const entity = await this.predictionsRepo.findOne({ where: { id } });
    if (!entity) return null;
    await this.assertDocumentAccess(userId, entity.documentId);
    return entity;
  }

  async createForUser(userId: string, dto: Partial<ReaderPrediction>) {
    if (!dto.documentId) {
      throw new BadRequestException('documentId가 필요합니다.');
    }
    await this.assertDocumentAccess(userId, dto.documentId);
    const entity = this.predictionsRepo.create(dto as any);
    return this.predictionsRepo.save(entity as any);
  }

  async generateForUser(user: { userId: string; role?: string }, dto: { documentId?: string; provider?: string; model?: string }) {
    if (!dto.documentId) {
      throw new BadRequestException('documentId가 필요합니다.');
    }
    const doc = await this.assertDocumentAccess(user.userId, dto.documentId);
    const text = [doc.title, doc.content].filter(Boolean).join('\n\n');
    if (!text) {
      throw new BadRequestException('문서 내용이 없습니다.');
    }

    const ai = await this.aiService.proxy(user, 'predict', '/ai/predict', {
      text,
      provider: dto.provider,
      model: dto.model,
      projectId: doc.projectId,
    });

    const entity = this.predictionsRepo.create({
      documentId: doc.id,
      provider: dto.provider,
      result: ai as any,
    } as any);

    return this.predictionsRepo.save(entity as any);
  }

  async removeForUser(userId: string, id: string) {
    const entity = await this.predictionsRepo.findOne({ where: { id } });
    if (!entity) return;
    await this.assertDocumentAccess(userId, entity.documentId);
    await this.predictionsRepo.delete({ id } as any);
  }
}
