import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import crypto from 'crypto';
import JSZip from 'jszip';
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
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li)>/gi, '\n')
      .replace(/<\/(tr)>/gi, '\n')
      .replace(/<\/(td|th)>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
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

    const sections = docs.map((d) => ({
      title: d.title,
      body: this.stripHtml(d.content ?? ''),
    }));

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
      case 'novelpia': {
        const content = sections.map((s) => `# ${s.title}\n\n${s.body}`).join('\n\n---\n\n');
        return { content, filename: `${base}.md`, mimeType: 'text/markdown; charset=utf-8' };
      }
      case 'kakaopage': {
        const content = sections
          .map((s) => `제목: ${s.title}\n\n${s.body}`)
          .join('\n\n\n');
        return { content: content.replace(/\n/g, '\r\n'), filename: `${base}.txt`, mimeType: 'text/plain; charset=utf-8' };
      }
      case 'munpia': {
        const content = sections
          .map((s) => `【${s.title}】\n\n${s.body}`)
          .join('\n\n\n');
        return { content: content.replace(/\n/g, '\r\n'), filename: `${base}.txt`, mimeType: 'text/plain; charset=utf-8' };
      }
      case 'epub': {
        const buffer = await this.buildEpub(projectTitle, sections);
        return {
          isBinary: true,
          contentBase64: buffer.toString('base64'),
          filename: `${base}.epub`,
          mimeType: 'application/epub+zip',
        };
      }
      default:
        throw new BadRequestException('지원하지 않는 exportFormat입니다. (txt, markdown, novelpia, kakaopage, munpia, epub)');
    }
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private paragraphsToXhtml(body: string): string {
    if (!body) return '<p></p>';
    const parts = body.split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean);
    const paragraphs = parts.map((p) => `<p>${this.escapeXml(p).replace(/\n/g, '<br />')}</p>`).join('\n');
    return paragraphs || '<p></p>';
  }

  private async buildEpub(title: string, sections: Array<{ title: string; body: string }>): Promise<Buffer> {
    const zip = new JSZip();

    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    zip.folder('META-INF')?.file(
      'container.xml',
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n` +
        `  <rootfiles>\n` +
        `    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n` +
        `  </rootfiles>\n` +
        `</container>\n`,
    );

    const oebps = zip.folder('OEBPS')!;
    const sectionsFolder = oebps.folder('sections')!;

    const sectionItems = sections.map((s, idx) => {
      const id = `sec${idx + 1}`;
      const href = `sections/${id}.xhtml`;
      const xhtml =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ko" lang="ko">\n` +
        `<head>\n` +
        `  <meta charset="utf-8" />\n` +
        `  <title>${this.escapeXml(s.title)}</title>\n` +
        `</head>\n` +
        `<body>\n` +
        `  <h1>${this.escapeXml(s.title)}</h1>\n` +
        `  ${this.paragraphsToXhtml(s.body)}\n` +
        `</body>\n` +
        `</html>\n`;
      sectionsFolder.file(`${id}.xhtml`, xhtml);
      return { id, href, title: s.title };
    });

    const navItems = sectionItems
      .map((item) => `<li><a href="${item.href}">${this.escapeXml(item.title)}</a></li>`)
      .join('\n');
    const navXhtml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ko" lang="ko">\n` +
      `<head><meta charset="utf-8" /><title>목차</title></head>\n` +
      `<body>\n` +
      `  <nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops">\n` +
      `    <h1>목차</h1>\n` +
      `    <ol>\n${navItems}\n    </ol>\n` +
      `  </nav>\n` +
      `</body>\n` +
      `</html>\n`;
    oebps.file('nav.xhtml', navXhtml);

    const uuid = `urn:uuid:${crypto.randomUUID()}`;
    const manifestItems = [
      `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
      ...sectionItems.map((item) => `<item id="${item.id}" href="${item.href}" media-type="application/xhtml+xml"/>`),
    ].join('\n    ');

    const spineItems = sectionItems.map((item) => `<itemref idref="${item.id}"/>`).join('\n    ');

    const opf =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">\n` +
      `  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n` +
      `    <dc:identifier id="bookid">${uuid}</dc:identifier>\n` +
      `    <dc:title>${this.escapeXml(title)}</dc:title>\n` +
      `    <dc:language>ko</dc:language>\n` +
      `    <meta property="dcterms:modified">${new Date().toISOString()}</meta>\n` +
      `  </metadata>\n` +
      `  <manifest>\n    ${manifestItems}\n  </manifest>\n` +
      `  <spine>\n    ${spineItems}\n  </spine>\n` +
      `</package>\n`;
    oebps.file('content.opf', opf);

    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
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
    const isBinary = Boolean((metadata as any).isBinary);
    let content: string | Buffer = '';
    if (isBinary) {
      const b64 = typeof (metadata as any).contentBase64 === 'string' ? ((metadata as any).contentBase64 as string) : '';
      if (!b64) throw new BadRequestException('내보내기 파일이 없습니다.');
      content = Buffer.from(b64, 'base64');
    } else {
      content = typeof (metadata as any).content === 'string' ? ((metadata as any).content as string) : '';
      if (!content) throw new BadRequestException('내보내기 파일이 없습니다.');
    }

    const filename =
      typeof (metadata as any).filename === 'string' ? ((metadata as any).filename as string) : `cowrite-export.${exportJob.exportFormat}`;
    const mimeType =
      typeof (metadata as any).mimeType === 'string' ? ((metadata as any).mimeType as string) : 'application/octet-stream';

    return { filename, mimeType, content };
  }
}
