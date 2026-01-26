import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { ProjectScopedCrudService } from '../../common/access/project-scoped-crud.service';
import { Document, DocumentVersion, Project, WritingGoal } from '../../entities';
import { SearchService } from '../search/search.service';

@Injectable()
export class DocumentsService extends ProjectScopedCrudService<Document> {
  private readonly autoVersionMinIntervalMs = 30_000;

  constructor(
    @InjectRepository(Document)
    repo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versionsRepo: Repository<DocumentVersion>,
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    @InjectRepository(WritingGoal)
    private readonly goalsRepo: Repository<WritingGoal>,
    private readonly searchService: SearchService,
    projectAccessService: ProjectAccessService,
  ) {
    super(repo, projectAccessService);
  }

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
    const words = await this.repo
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

  private async shouldCreateAutoVersion(documentId: string): Promise<boolean> {
    const last = await this.versionsRepo.findOne({
      where: { documentId } as any,
      order: { createdAt: 'DESC' } as any,
      select: { createdAt: true } as any,
    });

    if (!last?.createdAt) return true;
    return Date.now() - new Date(last.createdAt).getTime() >= this.autoVersionMinIntervalMs;
  }

  override async createForUser(userId: string | undefined, dto: Partial<Document>): Promise<Document> {
    const wordCount = this.computeWordCount(dto.content);
    const document = await super.createForUser(userId, {
      ...dto,
      wordCount,
    });

    if (document.content) {
      await this.versionsRepo.save(
        this.versionsRepo.create({
          documentId: document.id,
          content: document.content,
          wordCount: document.wordCount,
          versionName: '초기 버전',
          createdBy: userId,
        } as any),
      );
    }

    await this.refreshProjectWordCount(document.projectId);
    await this.searchService.indexDocument('documents', document.id, {
      id: document.id,
      projectId: document.projectId,
      title: document.title,
      content: document.content,
      type: document.type,
    });
    return document;
  }

  override async updateForUser(userId: string | undefined, id: string, dto: Partial<Document>): Promise<Document | null> {
    const prev = await this.findOneForUser(userId, id);
    if (!prev) return null;

    const hasContentField = Object.prototype.hasOwnProperty.call(dto, 'content');
    const nextContent = hasContentField ? (dto as any).content : undefined;
    const hasContentUpdate = hasContentField && nextContent !== prev.content;
    const nextWordCount = hasContentUpdate ? this.computeWordCount(nextContent ?? '') : undefined;

    const document = await super.updateForUser(userId, id, {
      ...dto,
      ...(hasContentUpdate ? { wordCount: nextWordCount } : {}),
    });
    if (document) {
      if (hasContentUpdate) {
        if (await this.shouldCreateAutoVersion(document.id)) {
          await this.versionsRepo.save(
            this.versionsRepo.create({
              documentId: document.id,
              content: document.content ?? '',
              wordCount: document.wordCount,
              versionName: '자동 저장',
              createdBy: userId,
            } as any),
          );
        }

        await this.refreshProjectWordCount(document.projectId);
      }

      await this.searchService.indexDocument('documents', document.id, {
        id: document.id,
        projectId: document.projectId,
        title: document.title,
        content: document.content,
        type: document.type,
      });
    }
    return document;
  }

  override async removeForUser(userId: string | undefined, id: string): Promise<void> {
    const doc = await this.findOneForUser(userId, id);
    if (!doc) return;
    await super.removeForUser(userId, id);
    await this.refreshProjectWordCount(doc.projectId);
  }
}
