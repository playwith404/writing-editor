import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { In, Repository } from 'typeorm';
import JSZip from 'jszip';
import { ProjectAccessService } from '../../common/access/project-access.service';
import {
  AudioAsset,
  Character,
  CharacterStat,
  Document,
  DocumentComment,
  DocumentVersion,
  MediaAsset,
  Plot,
  PlotPoint,
  Project,
  ReaderPrediction,
  ResearchItem,
  Relationship,
  Storyboard,
  Translation,
  WorldSetting,
  WritingGoal,
} from '../../entities';
import { SearchService } from '../search/search.service';

type BackupJsonV1 = {
  version: 1;
  exportedAt: string;
  project: Pick<Project, 'id' | 'title' | 'description' | 'genre' | 'coverUrl' | 'settings' | 'wordCount' | 'isPublic'>;
  documents: Array<Pick<Document, 'id' | 'parentId' | 'type' | 'title' | 'content' | 'orderIndex' | 'wordCount' | 'status' | 'notes'>>;
  documentVersions: Array<Pick<DocumentVersion, 'id' | 'documentId' | 'content' | 'wordCount' | 'versionName' | 'createdAt'>>;
  characters: Array<
    Pick<Character, 'id' | 'name' | 'role' | 'profile' | 'appearance' | 'personality' | 'backstory' | 'speechSample' | 'imageUrl'>
  >;
  characterStats: Array<Pick<CharacterStat, 'id' | 'characterId' | 'templateType' | 'stats' | 'episodeNum'>>;
  worldSettings: Array<Pick<WorldSetting, 'id' | 'parentId' | 'category' | 'title' | 'content' | 'metadata'>>;
  relationships: Array<
    Pick<Relationship, 'id' | 'characterAId' | 'characterBId' | 'relationType' | 'description' | 'isBidirectional' | 'metadata'>
  >;
  plots: Array<Pick<Plot, 'id' | 'title' | 'description' | 'orderIndex' | 'metadata'>>;
  plotPoints: Array<Pick<PlotPoint, 'id' | 'plotId' | 'documentId' | 'title' | 'description' | 'orderIndex' | 'metadata'>>;
  writingGoals: Array<Pick<WritingGoal, 'id' | 'goalType' | 'targetWords' | 'currentWords' | 'dueDate'>>;
  researchItems: Array<Pick<ResearchItem, 'id' | 'query' | 'result'>>;
  translations: Array<Pick<Translation, 'id' | 'documentId' | 'targetLanguage' | 'provider' | 'content'>>;
  audioAssets: Array<Pick<AudioAsset, 'id' | 'documentId' | 'voice' | 'provider' | 'script' | 'audioUrl'>>;
  storyboards: Array<Pick<Storyboard, 'id' | 'documentId' | 'provider' | 'content'>>;
  readerPredictions: Array<Pick<ReaderPrediction, 'id' | 'documentId' | 'provider' | 'result'>>;
  documentComments: Array<Pick<DocumentComment, 'id' | 'documentId' | 'content' | 'position' | 'createdAt'>>;
  mediaAssets: Array<
    Pick<MediaAsset, 'id' | 'projectId' | 'originalName' | 'mimeType' | 'size' | 'url'> & {
      zipPath: string;
      ext: string;
    }
  >;
};

function safeFilename(name: string): string {
  return (
    name
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'cowrite'
  );
}

function deepReplaceStrings(value: unknown, replacer: (s: string) => string): unknown {
  if (typeof value === 'string') return replacer(value);
  if (Array.isArray(value)) return value.map((v) => deepReplaceStrings(v, replacer));
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = deepReplaceStrings(v, replacer);
  }
  return out;
}

@Injectable()
export class BackupsService {
  constructor(
    private readonly projectAccessService: ProjectAccessService,
    private readonly searchService: SearchService,
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    @InjectRepository(Document)
    private readonly documentsRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versionsRepo: Repository<DocumentVersion>,
    @InjectRepository(Character)
    private readonly charactersRepo: Repository<Character>,
    @InjectRepository(CharacterStat)
    private readonly characterStatsRepo: Repository<CharacterStat>,
    @InjectRepository(WorldSetting)
    private readonly worldSettingsRepo: Repository<WorldSetting>,
    @InjectRepository(Relationship)
    private readonly relationshipsRepo: Repository<Relationship>,
    @InjectRepository(Plot)
    private readonly plotsRepo: Repository<Plot>,
    @InjectRepository(PlotPoint)
    private readonly plotPointsRepo: Repository<PlotPoint>,
    @InjectRepository(WritingGoal)
    private readonly writingGoalsRepo: Repository<WritingGoal>,
    @InjectRepository(ResearchItem)
    private readonly researchItemsRepo: Repository<ResearchItem>,
    @InjectRepository(Translation)
    private readonly translationsRepo: Repository<Translation>,
    @InjectRepository(AudioAsset)
    private readonly audioAssetsRepo: Repository<AudioAsset>,
    @InjectRepository(Storyboard)
    private readonly storyboardsRepo: Repository<Storyboard>,
    @InjectRepository(ReaderPrediction)
    private readonly readerPredictionsRepo: Repository<ReaderPrediction>,
    @InjectRepository(DocumentComment)
    private readonly documentCommentsRepo: Repository<DocumentComment>,
    @InjectRepository(MediaAsset)
    private readonly mediaAssetsRepo: Repository<MediaAsset>,
  ) {}

  private uploadDir(): string {
    return process.env.MEDIA_UPLOAD_DIR || '/app/uploads';
  }

  private async ensureUploadDir() {
    await fs.mkdir(this.uploadDir(), { recursive: true });
  }

  private extFromMime(mimeType: string): string {
    switch (mimeType) {
      case 'image/png':
        return '.png';
      case 'image/jpeg':
        return '.jpg';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      case 'image/svg+xml':
        return '.svg';
      default:
        return '';
    }
  }

  private collectReferencedMediaIds(values: Array<string | undefined | null>): string[] {
    const ids = new Set<string>();
    const uuidRe = /\/media\/([0-9a-fA-F-]{36})/g;
    for (const v of values) {
      if (!v) continue;
      for (const match of v.matchAll(uuidRe)) {
        if (match[1]) ids.add(match[1]);
      }
    }
    return Array.from(ids);
  }

  async exportProjectForUser(userId: string | undefined, projectId: string): Promise<{ filename: string; mimeType: string; content: Buffer }> {
    if (!userId) throw new ForbiddenException('로그인이 필요합니다.');
    await this.projectAccessService.assertProjectAccess(userId, projectId);

    const project = await this.projectsRepo.findOne({ where: { id: projectId } as any });
    if (!project || project.deletedAt) {
      throw new BadRequestException('프로젝트를 찾을 수 없습니다.');
    }

    const documents = await this.documentsRepo.find({
      where: { projectId } as any,
      order: { orderIndex: 'ASC', createdAt: 'ASC' } as any,
    });
    const documentIds = documents.map((d) => d.id);

    const [
      documentVersions,
      characters,
      worldSettings,
      relationships,
      plots,
      writingGoals,
      researchItems,
      documentComments,
    ] = await Promise.all([
      documentIds.length ? this.versionsRepo.find({ where: { documentId: In(documentIds) } as any, order: { createdAt: 'DESC' } as any }) : [],
      this.charactersRepo.find({ where: { projectId } as any, order: { createdAt: 'ASC' } as any }),
      this.worldSettingsRepo.find({ where: { projectId } as any, order: { createdAt: 'ASC' } as any }),
      this.relationshipsRepo.find({ where: { projectId } as any }),
      this.plotsRepo.find({ where: { projectId } as any, order: { orderIndex: 'ASC', createdAt: 'ASC' } as any }),
      this.writingGoalsRepo.find({ where: { projectId } as any, order: { createdAt: 'ASC' } as any }),
      this.researchItemsRepo.find({ where: { projectId } as any, order: { createdAt: 'DESC' } as any }),
      documentIds.length ? this.documentCommentsRepo.find({ where: { documentId: In(documentIds) } as any, order: { createdAt: 'ASC' } as any }) : [],
    ]);

    const characterIds = characters.map((c) => c.id);
    const characterStats = characterIds.length
      ? await this.characterStatsRepo.find({ where: { characterId: In(characterIds) } as any, order: { createdAt: 'ASC' } as any })
      : [];

    const plotIds = plots.map((p) => p.id);
    const plotPoints = plotIds.length
      ? await this.plotPointsRepo.find({ where: { plotId: In(plotIds) } as any, order: { orderIndex: 'ASC', createdAt: 'ASC' } as any })
      : [];

    const translations = documentIds.length
      ? await this.translationsRepo.find({ where: { documentId: In(documentIds) } as any, order: { createdAt: 'DESC' } as any })
      : [];
    const audioAssets = documentIds.length
      ? await this.audioAssetsRepo.find({ where: { documentId: In(documentIds) } as any, order: { createdAt: 'DESC' } as any })
      : [];
    const storyboards = documentIds.length
      ? await this.storyboardsRepo.find({ where: { documentId: In(documentIds) } as any, order: { createdAt: 'DESC' } as any })
      : [];
    const readerPredictions = documentIds.length
      ? await this.readerPredictionsRepo.find({ where: { documentId: In(documentIds) } as any, order: { createdAt: 'DESC' } as any })
      : [];

    const projectMedia = await this.mediaAssetsRepo.find({ where: { projectId } as any, order: { createdAt: 'DESC' } as any });
    const referencedIds = this.collectReferencedMediaIds([project.coverUrl, ...characters.map((c) => c.imageUrl)]);
    const referencedMedia = referencedIds.length
      ? await this.mediaAssetsRepo.find({ where: { id: In(referencedIds) } as any })
      : [];

    const mediaMap = new Map<string, MediaAsset>();
    for (const m of [...projectMedia, ...referencedMedia]) {
      if (m?.id) mediaMap.set(m.id, m);
    }

    const zip = new JSZip();
    const mediaEntries: BackupJsonV1['mediaAssets'] = [];
    for (const asset of mediaMap.values()) {
      const ext = this.extFromMime(asset.mimeType) || path.extname(asset.storagePath || '') || '';
      const zipPath = `media/${asset.id}${ext || ''}`;

      try {
        const buf = await fs.readFile(asset.storagePath);
        zip.file(zipPath, buf);
        mediaEntries.push({
          id: asset.id,
          projectId: asset.projectId,
          originalName: asset.originalName,
          mimeType: asset.mimeType,
          size: asset.size,
          url: asset.url,
          zipPath,
          ext: ext || '',
        });
      } catch {
        // skip missing files
      }
    }

    const payload: BackupJsonV1 = {
      version: 1,
      exportedAt: new Date().toISOString(),
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        genre: project.genre,
        coverUrl: project.coverUrl,
        settings: project.settings ?? {},
        wordCount: project.wordCount ?? 0,
        isPublic: Boolean(project.isPublic),
      },
      documents: documents.map((d) => ({
        id: d.id,
        parentId: d.parentId,
        type: d.type,
        title: d.title,
        content: d.content,
        orderIndex: d.orderIndex,
        wordCount: d.wordCount,
        status: d.status,
        notes: d.notes,
      })),
      documentVersions: documentVersions.map((v) => ({
        id: v.id,
        documentId: v.documentId,
        content: v.content,
        wordCount: v.wordCount,
        versionName: v.versionName,
        createdAt: v.createdAt,
      })),
      characters: characters.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        profile: c.profile,
        appearance: c.appearance,
        personality: c.personality,
        backstory: c.backstory,
        speechSample: c.speechSample,
        imageUrl: c.imageUrl,
      })),
      characterStats: characterStats.map((s) => ({
        id: s.id,
        characterId: s.characterId,
        templateType: s.templateType,
        stats: s.stats,
        episodeNum: s.episodeNum,
      })),
      worldSettings: worldSettings.map((w) => ({
        id: w.id,
        parentId: w.parentId,
        category: w.category,
        title: w.title,
        content: w.content,
        metadata: w.metadata,
      })),
      relationships: relationships.map((r) => ({
        id: r.id,
        characterAId: r.characterAId,
        characterBId: r.characterBId,
        relationType: r.relationType,
        description: r.description,
        isBidirectional: r.isBidirectional,
        metadata: r.metadata,
      })),
      plots: plots.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        orderIndex: p.orderIndex,
        metadata: p.metadata,
      })),
      plotPoints: plotPoints.map((pp) => ({
        id: pp.id,
        plotId: pp.plotId,
        documentId: pp.documentId,
        title: pp.title,
        description: pp.description,
        orderIndex: pp.orderIndex,
        metadata: pp.metadata,
      })),
      writingGoals: writingGoals.map((g) => ({
        id: g.id,
        goalType: g.goalType,
        targetWords: g.targetWords,
        currentWords: g.currentWords,
        dueDate: g.dueDate,
      })),
      researchItems: researchItems.map((ri) => ({
        id: ri.id,
        query: ri.query,
        result: ri.result,
      })),
      translations: translations.map((t) => ({
        id: t.id,
        documentId: t.documentId,
        targetLanguage: t.targetLanguage,
        provider: t.provider,
        content: t.content,
      })),
      audioAssets: audioAssets.map((a) => ({
        id: a.id,
        documentId: a.documentId,
        voice: a.voice,
        provider: a.provider,
        script: a.script,
        audioUrl: a.audioUrl,
      })),
      storyboards: storyboards.map((s) => ({
        id: s.id,
        documentId: s.documentId,
        provider: s.provider,
        content: s.content,
      })),
      readerPredictions: readerPredictions.map((rp) => ({
        id: rp.id,
        documentId: rp.documentId,
        provider: rp.provider,
        result: rp.result,
      })),
      documentComments: documentComments.map((c) => ({
        id: c.id,
        documentId: c.documentId,
        content: c.content,
        position: c.position,
        createdAt: c.createdAt,
      })),
      mediaAssets: mediaEntries,
    };

    zip.file('backup.json', JSON.stringify(payload, null, 2));

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    const filename = `${safeFilename(project.title)}_backup_${timestamp}.zip`;
    const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return { filename, mimeType: 'application/zip', content };
  }

  async importForUser(userId: string | undefined, file: Express.Multer.File | undefined) {
    if (!userId) throw new ForbiddenException('로그인이 필요합니다.');
    if (!file) throw new BadRequestException('file이 필요합니다.');
    if (!file.buffer?.length) throw new BadRequestException('업로드한 파일이 비어 있습니다.');

    let backup: BackupJsonV1 | null = null;
    let zip: JSZip | null = null;

    try {
      zip = await JSZip.loadAsync(file.buffer);
      const raw = await zip.file('backup.json')?.async('string');
      if (!raw) throw new Error('missing backup.json');
      backup = JSON.parse(raw) as BackupJsonV1;
    } catch {
      zip = null;
      try {
        backup = JSON.parse(file.buffer.toString('utf8')) as BackupJsonV1;
      } catch {
        throw new BadRequestException('지원하지 않는 백업 파일입니다. (zip 또는 json)');
      }
    }

    if (!backup || backup.version !== 1) {
      throw new BadRequestException('지원하지 않는 백업 버전입니다.');
    }

    const createdPaths: string[] = [];
    await this.ensureUploadDir();

    try {
      const result = await this.projectsRepo.manager.transaction(async (em) => {
        const newProjectId = crypto.randomUUID();

        const replaceText = (input?: string | null, map?: Map<string, string>): string | undefined => {
          if (!input) return input ?? undefined;
          let out = input;
          if (map) {
            for (const [from, to] of map.entries()) {
              out = out.replaceAll(from, to);
            }
          }
          return out;
        };

        const docIdMap = new Map<string, string>();
        for (const d of backup!.documents ?? []) {
          if (d?.id) docIdMap.set(d.id, crypto.randomUUID());
        }

        const characterIdMap = new Map<string, string>();
        for (const c of backup!.characters ?? []) {
          if (c?.id) characterIdMap.set(c.id, crypto.randomUUID());
        }

        const worldSettingIdMap = new Map<string, string>();
        for (const w of backup!.worldSettings ?? []) {
          if (w?.id) worldSettingIdMap.set(w.id, crypto.randomUUID());
        }

        const plotIdMap = new Map<string, string>();
        for (const p of backup!.plots ?? []) {
          if (p?.id) plotIdMap.set(p.id, crypto.randomUUID());
        }

        const mediaIdMap = new Map<string, string>();
        for (const m of backup!.mediaAssets ?? []) {
          if (m?.id) mediaIdMap.set(m.id, crypto.randomUUID());
        }

        const projectRepo = em.getRepository(Project);
        const project = projectRepo.create({
          id: newProjectId,
          ownerId: userId,
          title: `${backup!.project?.title ?? '프로젝트'} (가져옴)`,
          description: replaceText(backup!.project?.description, mediaIdMap),
          genre: backup!.project?.genre,
          coverUrl: replaceText(backup!.project?.coverUrl, mediaIdMap),
          settings: deepReplaceStrings(backup!.project?.settings ?? {}, (s) => replaceText(s, mediaIdMap) ?? s) as Record<string, unknown>,
          wordCount: 0,
          isPublic: false,
        });
        await projectRepo.save(project);

        const documentsRepo = em.getRepository(Document);
        const docsToInsert = (backup!.documents ?? []).map((d) =>
          documentsRepo.create({
            id: docIdMap.get(d.id) ?? crypto.randomUUID(),
            projectId: newProjectId,
            parentId: d.parentId ? docIdMap.get(d.parentId) : undefined,
            type: d.type,
            title: replaceText(d.title, mediaIdMap) ?? '',
            content: replaceText(d.content, mediaIdMap),
            orderIndex: d.orderIndex ?? 0,
            wordCount: d.wordCount ?? 0,
            status: d.status ?? 'draft',
            notes: replaceText(d.notes, mediaIdMap),
          }),
        );
        if (docsToInsert.length) await documentsRepo.save(docsToInsert);

        const versionsRepo = em.getRepository(DocumentVersion);
        const versionsToInsert = (backup!.documentVersions ?? [])
          .map((v) => {
            const newDocId = docIdMap.get(v.documentId);
            if (!newDocId) return null;
            return versionsRepo.create({
              id: crypto.randomUUID(),
              documentId: newDocId,
              content: replaceText(v.content, mediaIdMap) ?? '',
              wordCount: v.wordCount,
              versionName: v.versionName,
              createdBy: userId,
            });
          })
          .filter(Boolean) as any[];
        if (versionsToInsert.length) await versionsRepo.save(versionsToInsert);

        const charactersRepo = em.getRepository(Character);
        const charactersToInsert = (backup!.characters ?? []).map((c) =>
          charactersRepo.create({
            id: characterIdMap.get(c.id) ?? crypto.randomUUID(),
            projectId: newProjectId,
            name: replaceText(c.name, mediaIdMap) ?? '',
            role: c.role,
            profile: deepReplaceStrings(c.profile ?? {}, (s) => replaceText(s, mediaIdMap) ?? s) as Record<string, unknown>,
            appearance: deepReplaceStrings(c.appearance ?? {}, (s) => replaceText(s, mediaIdMap) ?? s) as Record<string, unknown>,
            personality: deepReplaceStrings(c.personality ?? {}, (s) => replaceText(s, mediaIdMap) ?? s) as Record<string, unknown>,
            backstory: replaceText(c.backstory, mediaIdMap),
            speechSample: replaceText(c.speechSample, mediaIdMap),
            imageUrl: replaceText(c.imageUrl, mediaIdMap),
          }),
        );
        if (charactersToInsert.length) await charactersRepo.save(charactersToInsert);

        const charStatsRepo = em.getRepository(CharacterStat);
        const statsToInsert = (backup!.characterStats ?? [])
          .map((s) => {
            const newCharId = characterIdMap.get(s.characterId);
            if (!newCharId) return null;
            return charStatsRepo.create({
              id: crypto.randomUUID(),
              characterId: newCharId,
              templateType: s.templateType,
              stats: deepReplaceStrings(s.stats ?? {}, (v) => replaceText(v, mediaIdMap) ?? v) as Record<string, unknown>,
              episodeNum: s.episodeNum,
            });
          })
          .filter(Boolean) as any[];
        if (statsToInsert.length) await charStatsRepo.save(statsToInsert);

        const worldSettingsRepo = em.getRepository(WorldSetting);
        const worldSettingsToInsert = (backup!.worldSettings ?? []).map((w) =>
          worldSettingsRepo.create({
            id: worldSettingIdMap.get(w.id) ?? crypto.randomUUID(),
            projectId: newProjectId,
            parentId: w.parentId ? worldSettingIdMap.get(w.parentId) : undefined,
            category: w.category,
            title: replaceText(w.title, mediaIdMap) ?? '',
            content: replaceText(w.content, mediaIdMap),
            metadata: deepReplaceStrings(w.metadata ?? {}, (s) => replaceText(s, mediaIdMap) ?? s) as Record<string, unknown>,
          }),
        );
        if (worldSettingsToInsert.length) await worldSettingsRepo.save(worldSettingsToInsert);

        const relationshipsRepo = em.getRepository(Relationship);
        const relationshipsToInsert = (backup!.relationships ?? [])
          .map((r) => {
            const a = characterIdMap.get(r.characterAId);
            const b = characterIdMap.get(r.characterBId);
            if (!a || !b) return null;
            return relationshipsRepo.create({
              id: crypto.randomUUID(),
              projectId: newProjectId,
              characterAId: a,
              characterBId: b,
              relationType: r.relationType,
              description: replaceText(r.description, mediaIdMap),
              isBidirectional: Boolean(r.isBidirectional),
              metadata: deepReplaceStrings(r.metadata ?? {}, (s) => replaceText(s, mediaIdMap) ?? s) as Record<string, unknown>,
            });
          })
          .filter(Boolean) as any[];
        if (relationshipsToInsert.length) await relationshipsRepo.save(relationshipsToInsert);

        const plotsRepo = em.getRepository(Plot);
        const plotsToInsert = (backup!.plots ?? []).map((p) =>
          plotsRepo.create({
            id: plotIdMap.get(p.id) ?? crypto.randomUUID(),
            projectId: newProjectId,
            title: replaceText(p.title, mediaIdMap) ?? '',
            description: replaceText(p.description, mediaIdMap),
            orderIndex: p.orderIndex ?? 0,
            metadata: deepReplaceStrings(p.metadata ?? {}, (s) => replaceText(s, mediaIdMap) ?? s) as Record<string, unknown>,
          }),
        );
        if (plotsToInsert.length) await plotsRepo.save(plotsToInsert);

        const plotPointsRepo = em.getRepository(PlotPoint);
        const plotPointsToInsert = (backup!.plotPoints ?? [])
          .map((pp) => {
            const newPlotId = plotIdMap.get(pp.plotId);
            if (!newPlotId) return null;
            const newDocId = pp.documentId ? docIdMap.get(pp.documentId) : undefined;
            return plotPointsRepo.create({
              id: crypto.randomUUID(),
              plotId: newPlotId,
              documentId: newDocId,
              title: replaceText(pp.title, mediaIdMap) ?? '',
              description: replaceText(pp.description, mediaIdMap),
              orderIndex: pp.orderIndex ?? 0,
              metadata: deepReplaceStrings(pp.metadata ?? {}, (s) => replaceText(s, mediaIdMap) ?? s) as Record<string, unknown>,
            });
          })
          .filter(Boolean) as any[];
        if (plotPointsToInsert.length) await plotPointsRepo.save(plotPointsToInsert);

        const writingGoalsRepo = em.getRepository(WritingGoal);
        const goalsToInsert = (backup!.writingGoals ?? []).map((g) =>
          writingGoalsRepo.create({
            id: crypto.randomUUID(),
            projectId: newProjectId,
            userId,
            goalType: g.goalType,
            targetWords: g.targetWords ?? 0,
            currentWords: g.currentWords ?? 0,
            dueDate: g.dueDate,
          }),
        );
        if (goalsToInsert.length) await writingGoalsRepo.save(goalsToInsert);

        const researchItemsRepo = em.getRepository(ResearchItem);
        const researchToInsert = (backup!.researchItems ?? []).map((ri) =>
          researchItemsRepo.create({
            id: crypto.randomUUID(),
            projectId: newProjectId,
            query: replaceText(ri.query, mediaIdMap) ?? '',
            result: deepReplaceStrings(ri.result ?? {}, (s) => replaceText(s, mediaIdMap) ?? s) as Record<string, unknown>,
          }),
        );
        if (researchToInsert.length) await researchItemsRepo.save(researchToInsert);

        const translationsRepo = em.getRepository(Translation);
        const translationsToInsert = (backup!.translations ?? [])
          .map((t) => {
            const newDocId = docIdMap.get(t.documentId);
            if (!newDocId) return null;
            return translationsRepo.create({
              id: crypto.randomUUID(),
              documentId: newDocId,
              targetLanguage: t.targetLanguage,
              provider: t.provider,
              content: replaceText(t.content, mediaIdMap),
            });
          })
          .filter(Boolean) as any[];
        if (translationsToInsert.length) await translationsRepo.save(translationsToInsert);

        const audioAssetsRepo = em.getRepository(AudioAsset);
        const audioToInsert = (backup!.audioAssets ?? [])
          .map((a) => {
            const newDocId = docIdMap.get(a.documentId);
            if (!newDocId) return null;
            return audioAssetsRepo.create({
              id: crypto.randomUUID(),
              documentId: newDocId,
              voice: a.voice,
              provider: a.provider,
              script: replaceText(a.script, mediaIdMap),
              audioUrl: a.audioUrl,
            });
          })
          .filter(Boolean) as any[];
        if (audioToInsert.length) await audioAssetsRepo.save(audioToInsert);

        const storyboardsRepo = em.getRepository(Storyboard);
        const storyboardsToInsert = (backup!.storyboards ?? [])
          .map((s) => {
            const newDocId = docIdMap.get(s.documentId);
            if (!newDocId) return null;
            return storyboardsRepo.create({
              id: crypto.randomUUID(),
              documentId: newDocId,
              provider: s.provider,
              content: deepReplaceStrings(s.content ?? {}, (v) => replaceText(v, mediaIdMap) ?? v) as Record<string, unknown>,
            });
          })
          .filter(Boolean) as any[];
        if (storyboardsToInsert.length) await storyboardsRepo.save(storyboardsToInsert);

        const readerPredictionsRepo = em.getRepository(ReaderPrediction);
        const predictionsToInsert = (backup!.readerPredictions ?? [])
          .map((rp) => {
            const newDocId = docIdMap.get(rp.documentId);
            if (!newDocId) return null;
            return readerPredictionsRepo.create({
              id: crypto.randomUUID(),
              documentId: newDocId,
              provider: rp.provider,
              result: deepReplaceStrings(rp.result ?? {}, (v) => replaceText(v, mediaIdMap) ?? v) as Record<string, unknown>,
            });
          })
          .filter(Boolean) as any[];
        if (predictionsToInsert.length) await readerPredictionsRepo.save(predictionsToInsert);

        const commentsRepo = em.getRepository(DocumentComment);
        const commentsToInsert = (backup!.documentComments ?? [])
          .map((c) => {
            const newDocId = docIdMap.get(c.documentId);
            if (!newDocId) return null;
            return commentsRepo.create({
              id: crypto.randomUUID(),
              documentId: newDocId,
              userId,
              content: replaceText(c.content, mediaIdMap) ?? '',
              position: deepReplaceStrings(c.position ?? {}, (v) => replaceText(v, mediaIdMap) ?? v) as Record<string, unknown>,
            });
          })
          .filter(Boolean) as any[];
        if (commentsToInsert.length) await commentsRepo.save(commentsToInsert);

        const mediaRepo = em.getRepository(MediaAsset);
        const mediaToInsert: MediaAsset[] = [];
        for (const m of backup!.mediaAssets ?? []) {
          const newId = mediaIdMap.get(m.id);
          if (!newId) continue;
          const ext = m.ext || this.extFromMime(m.mimeType) || '';
          const filename = `${newId}${ext}`;
          const storagePath = path.join(this.uploadDir(), filename);

          let fileBuf: Buffer | null = null;
          if (zip && m.zipPath) {
            const entry = zip.file(m.zipPath);
            if (entry) {
              fileBuf = await entry.async('nodebuffer');
            }
          }
          if (!fileBuf) continue;

          await fs.writeFile(storagePath, fileBuf);
          createdPaths.push(storagePath);

          mediaToInsert.push(
            mediaRepo.create({
              id: newId,
              userId,
              projectId: m.projectId ? newProjectId : undefined,
              originalName: m.originalName,
              mimeType: m.mimeType,
              size: fileBuf.length,
              storagePath,
              url: `/api/media/${newId}`,
            }),
          );
        }
        if (mediaToInsert.length) await mediaRepo.save(mediaToInsert);

        await this.searchService.indexDocument('projects', newProjectId, {
          id: newProjectId,
          title: project.title,
          description: project.description,
          genre: project.genre,
          ownerId: userId,
        });

        for (const d of docsToInsert) {
          await this.searchService.indexDocument('documents', d.id, {
            id: d.id,
            projectId: newProjectId,
            title: d.title,
            content: d.content ?? '',
          });
        }

        for (const c of charactersToInsert) {
          await this.searchService.indexDocument('characters', c.id, {
            id: c.id,
            projectId: newProjectId,
            name: c.name,
            role: c.role,
          });
        }

        for (const w of worldSettingsToInsert) {
          await this.searchService.indexDocument('world_settings', w.id, {
            id: w.id,
            projectId: newProjectId,
            title: w.title,
            content: w.content ?? '',
            category: w.category,
          });
        }

        for (const p of plotsToInsert) {
          await this.searchService.indexDocument('plots', p.id, {
            id: p.id,
            projectId: newProjectId,
            title: p.title,
            description: p.description ?? '',
          });
        }

        return { projectId: newProjectId };
      });

      return { success: true, ...result };
    } catch (error) {
      await Promise.all(
        createdPaths.map(async (p) => {
          try {
            await fs.unlink(p);
          } catch {
            // ignore
          }
        }),
      );
      throw error;
    }
  }
}
