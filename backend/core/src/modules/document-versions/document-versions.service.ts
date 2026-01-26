import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { Document, DocumentVersion, Project, WritingGoal } from '../../entities';
import { SearchService } from '../search/search.service';

@Injectable()
export class DocumentVersionsService {
  constructor(
    @InjectRepository(DocumentVersion)
    private readonly versionsRepo: Repository<DocumentVersion>,
    @InjectRepository(Document)
    private readonly documentsRepo: Repository<Document>,
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    @InjectRepository(WritingGoal)
    private readonly goalsRepo: Repository<WritingGoal>,
    private readonly searchService: SearchService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  private computeWordCount(content?: string | null): number {
    if (!content) return 0;
    const plain = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!plain) return 0;
    const tokens = plain.match(/[\p{L}\p{N}]+/gu);
    return tokens ? tokens.length : 0;
  }

  private async refreshProjectWordCount(projectId: string): Promise<number> {
    const words = await this.documentsRepo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.word_count), 0)', 'sum')
      .where('d.project_id = :projectId', { projectId })
      .getRawOne();

    const wordCount = Number(words?.sum ?? 0);
    await Promise.all([
      this.projectsRepo.update({ id: projectId } as any, { wordCount } as any),
      this.goalsRepo.update({ projectId } as any, { currentWords: wordCount } as any),
    ]);
    return wordCount;
  }

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
    return this.versionsRepo.find({
      where: { documentId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  async findOneForUser(userId: string, id: string) {
    const version = await this.versionsRepo.findOne({ where: { id } });
    if (!version) return null;
    await this.assertDocumentAccess(userId, version.documentId);
    return version;
  }

  async createForUser(userId: string, dto: Partial<DocumentVersion>) {
    if (!dto.documentId) {
      throw new BadRequestException('documentId가 필요합니다.');
    }
    await this.assertDocumentAccess(userId, dto.documentId);
    const version = this.versionsRepo.create({ ...dto, createdBy: dto.createdBy ?? userId } as any);
    return this.versionsRepo.save(version as any);
  }

  async removeForUser(userId: string, id: string) {
    const version = await this.versionsRepo.findOne({ where: { id } });
    if (!version) return;
    await this.assertDocumentAccess(userId, version.documentId);
    await this.versionsRepo.delete({ id } as any);
  }

  async restoreForUser(userId: string, versionId: string) {
    const version = await this.versionsRepo.findOne({ where: { id: versionId } });
    if (!version) {
      throw new BadRequestException('버전을 찾을 수 없습니다.');
    }

    const doc = await this.assertDocumentAccess(userId, version.documentId);

    await this.versionsRepo.save(
      this.versionsRepo.create({
        documentId: doc.id,
        content: doc.content ?? '',
        wordCount: doc.wordCount,
        versionName: '복원 전 백업',
        createdBy: userId,
      } as any),
    );

    const wordCount = version.wordCount ?? this.computeWordCount(version.content);
    doc.content = version.content;
    doc.wordCount = wordCount;
    const updated = await this.documentsRepo.save(doc as any);

    await Promise.all([
      this.refreshProjectWordCount(updated.projectId),
      this.searchService.indexDocument('documents', updated.id, {
        id: updated.id,
        projectId: updated.projectId,
        title: updated.title,
        content: updated.content,
        type: updated.type,
      }),
    ]);

    return updated;
  }
}
