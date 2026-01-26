import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { ProjectScopedCrudService } from '../../common/access/project-scoped-crud.service';
import { Document, Project, PublishingExport } from '../../entities';

@Injectable()
export class PublishingExportsService extends ProjectScopedCrudService<PublishingExport> {
  constructor(
    @InjectRepository(PublishingExport)
    repo: Repository<PublishingExport>,
    @InjectRepository(Document)
    private readonly documentsRepo: Repository<Document>,
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    projectAccessService: ProjectAccessService,
  ) {
    super(repo, projectAccessService);
  }

  private stripHtml(content: string): string {
    return content
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private safeFilename(name: string): string {
    return name
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'cowrite';
  }

  private async buildExport(exportJob: PublishingExport) {
    const project = await this.projectsRepo.findOne({
      where: { id: exportJob.projectId } as any,
      select: { title: true } as any,
    });
    const projectTitle = project?.title ?? 'cowrite';

    const docs = exportJob.documentId
      ? await this.documentsRepo.find({ where: { id: exportJob.documentId } as any })
      : await this.documentsRepo.find({
          where: { projectId: exportJob.projectId } as any,
          order: { orderIndex: 'ASC', createdAt: 'ASC' } as any,
        });

    if (docs.length === 0) {
      throw new BadRequestException('내보낼 문서가 없습니다.');
    }

    const sections = docs.map((d) => {
      const body = this.stripHtml(d.content ?? '');
      return { title: d.title, body };
    });

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    const base = `${this.safeFilename(projectTitle)}_${timestamp}`;

    switch (exportJob.exportFormat) {
      case 'txt': {
        const content = sections.map((s) => `${s.title}\n\n${s.body}`).join('\n\n---\n\n');
        return { content, filename: `${base}.txt`, mimeType: 'text/plain; charset=utf-8' };
      }
      case 'markdown': {
        const content = sections.map((s) => `# ${s.title}\n\n${s.body}`).join('\n\n---\n\n');
        return { content, filename: `${base}.md`, mimeType: 'text/markdown; charset=utf-8' };
      }
      default:
        throw new BadRequestException('지원하지 않는 exportFormat입니다. (txt, markdown만 지원)');
    }
  }

  override async createForUser(userId: string | undefined, dto: Partial<PublishingExport>): Promise<PublishingExport> {
    const created = await super.createForUser(userId, { ...dto, status: 'processing' });

    try {
      const built = await this.buildExport(created);
      const fileUrl = `/publishing-exports/${created.id}/download`;
      const metadata = {
        ...(created.metadata ?? {}),
        ...built,
      } as Record<string, unknown>;

      await this.repo.update(
        { id: created.id } as any,
        {
          status: 'completed',
          completedAt: new Date(),
          fileUrl,
          metadata,
        } as any,
      );

      const updated = await this.findOneForUser(userId, created.id);
      if (!updated) {
        throw new BadRequestException('내보내기 결과를 찾을 수 없습니다.');
      }
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : '내보내기에 실패했습니다.';
      await this.repo.update(
        { id: created.id } as any,
        {
          status: 'failed',
          metadata: { ...(created.metadata ?? {}), error: message } as any,
        } as any,
      );
      throw error;
    }
  }

  async getDownloadForUser(userId: string | undefined, id: string) {
    const exportJob = await this.findOneForUser(userId, id);
    if (!exportJob) {
      throw new BadRequestException('내보내기 항목을 찾을 수 없습니다.');
    }
    if (exportJob.status !== 'completed') {
      throw new BadRequestException('내보내기가 완료되지 않았습니다.');
    }

    const metadata = exportJob.metadata ?? {};
    const content = typeof (metadata as any).content === 'string' ? ((metadata as any).content as string) : '';
    if (!content) {
      throw new BadRequestException('내보내기 파일이 없습니다.');
    }

    const filename =
      typeof (metadata as any).filename === 'string' ? ((metadata as any).filename as string) : `cowrite-export.${exportJob.exportFormat}`;
    const mimeType =
      typeof (metadata as any).mimeType === 'string' ? ((metadata as any).mimeType as string) : 'application/octet-stream';

    return { filename, mimeType, content };
  }
}
