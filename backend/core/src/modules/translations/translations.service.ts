import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { Document, Translation } from '../../entities';
import { AiService } from '../ai/ai.service';

@Injectable()
export class TranslationsService {
  constructor(
    @InjectRepository(Translation)
    private readonly translationsRepo: Repository<Translation>,
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
    return this.translationsRepo.find({
      where: { documentId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  async findOneForUser(userId: string, id: string) {
    const item = await this.translationsRepo.findOne({ where: { id } });
    if (!item) return null;
    await this.assertDocumentAccess(userId, item.documentId);
    return item;
  }

  async createForUser(userId: string, dto: Partial<Translation>) {
    if (!dto.documentId) {
      throw new BadRequestException('documentId가 필요합니다.');
    }
    await this.assertDocumentAccess(userId, dto.documentId);
    const entity = this.translationsRepo.create(dto as any);
    return this.translationsRepo.save(entity as any);
  }

  async generateForUser(
    user: { userId: string; role?: string },
    dto: { documentId?: string; targetLanguage?: string; provider?: string; model?: string },
  ) {
    if (!dto.documentId) {
      throw new BadRequestException('documentId가 필요합니다.');
    }
    if (!dto.targetLanguage) {
      throw new BadRequestException('targetLanguage가 필요합니다.');
    }

    const doc = await this.assertDocumentAccess(user.userId, dto.documentId);
    const text = [doc.title, doc.content].filter(Boolean).join('\n\n');
    if (!text) {
      throw new BadRequestException('문서 내용이 없습니다.');
    }

    const ai = await this.aiService.proxy(user, 'translate', '/ai/translate', {
      text,
      target_language: dto.targetLanguage,
      provider: dto.provider,
      model: dto.model,
      projectId: doc.projectId,
    });

    const entity = this.translationsRepo.create({
      documentId: doc.id,
      targetLanguage: dto.targetLanguage,
      provider: dto.provider,
      content: typeof ai?.content === 'string' ? ai.content : undefined,
    } as any);
    return this.translationsRepo.save(entity as any);
  }

  async removeForUser(userId: string, id: string) {
    const entity = await this.translationsRepo.findOne({ where: { id } });
    if (!entity) return;
    await this.assertDocumentAccess(userId, entity.documentId);
    await this.translationsRepo.delete({ id } as any);
  }
}
