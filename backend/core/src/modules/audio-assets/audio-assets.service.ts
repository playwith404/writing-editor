import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { AudioAsset, Document } from '../../entities';
import { AiService } from '../ai/ai.service';

@Injectable()
export class AudioAssetsService {
  constructor(
    @InjectRepository(AudioAsset)
    private readonly audioRepo: Repository<AudioAsset>,
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
    return this.audioRepo.find({
      where: { documentId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  async findOneForUser(userId: string, id: string) {
    const asset = await this.audioRepo.findOne({ where: { id } });
    if (!asset) return null;
    await this.assertDocumentAccess(userId, asset.documentId);
    return asset;
  }

  async createForUser(userId: string, dto: Partial<AudioAsset>) {
    if (!dto.documentId) {
      throw new BadRequestException('documentId가 필요합니다.');
    }
    await this.assertDocumentAccess(userId, dto.documentId);
    const asset = this.audioRepo.create(dto as any);
    return this.audioRepo.save(asset as any);
  }

  async generateForUser(user: { userId: string; role?: string }, dto: { documentId?: string; voice?: string; provider?: string; model?: string }) {
    if (!dto.documentId) {
      throw new BadRequestException('documentId가 필요합니다.');
    }

    const doc = await this.assertDocumentAccess(user.userId, dto.documentId);
    const text = [doc.title, doc.content].filter(Boolean).join('\n\n');
    if (!text) {
      throw new BadRequestException('문서 내용이 없습니다.');
    }

    const ai = await this.aiService.proxy(user, 'tts', '/ai/tts', {
      text,
      voice: dto.voice,
      provider: dto.provider,
      model: dto.model,
      projectId: doc.projectId,
    });

    const asset = this.audioRepo.create({
      documentId: doc.id,
      voice: dto.voice,
      provider: dto.provider,
      script: typeof ai?.content === 'string' ? ai.content : undefined,
    } as any);

    return this.audioRepo.save(asset as any);
  }

  async removeForUser(userId: string, id: string) {
    const asset = await this.audioRepo.findOne({ where: { id } });
    if (!asset) return;
    await this.assertDocumentAccess(userId, asset.documentId);
    await this.audioRepo.delete({ id } as any);
  }
}
