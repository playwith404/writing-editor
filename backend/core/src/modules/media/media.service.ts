import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { MediaAsset } from '../../entities';

@Injectable()
export class MediaService {
  constructor(
    private readonly projectAccessService: ProjectAccessService,
    @InjectRepository(MediaAsset)
    private readonly mediaRepo: Repository<MediaAsset>,
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

  async upload(user: { userId?: string; role?: string } | undefined, file: Express.Multer.File | undefined, projectId?: string) {
    const userId = user?.userId;
    if (!userId) throw new ForbiddenException('로그인이 필요합니다.');
    if (!file) throw new BadRequestException('file이 필요합니다.');

    if (projectId) {
      await this.projectAccessService.assertProjectAccess(userId, projectId);
    }

    await this.ensureUploadDir();

    const id = crypto.randomUUID();
    const ext = this.extFromMime(file.mimetype) || path.extname(file.originalname || '') || '';
    const filename = `${id}${ext}`;
    const storagePath = path.join(this.uploadDir(), filename);
    const url = `/api/media/${id}`;

    await fs.writeFile(storagePath, file.buffer);

    const asset = await this.mediaRepo.save(
      this.mediaRepo.create({
        id,
        userId,
        projectId: projectId || undefined,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath,
        url,
      }),
    );

    return asset;
  }

  async findById(id: string): Promise<MediaAsset | null> {
    return this.mediaRepo.findOne({ where: { id } as any });
  }

  async assertOwnership(user: { userId?: string; role?: string } | undefined, asset: MediaAsset) {
    if (!user?.userId) throw new ForbiddenException('로그인이 필요합니다.');
    if (user.role === 'admin') return;
    if (asset.userId !== user.userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }
  }

  async delete(user: { userId?: string; role?: string } | undefined, id: string) {
    const asset = await this.findById(id);
    if (!asset) throw new NotFoundException('파일을 찾을 수 없습니다.');
    await this.assertOwnership(user, asset);

    await this.mediaRepo.delete({ id } as any);
    try {
      await fs.unlink(asset.storagePath);
    } catch {
      // ignore
    }
    return { success: true };
  }
}

