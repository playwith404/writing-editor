import { Body, Controller, Delete, Get, Param, Post, Req, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype?.startsWith('image/')) return cb(null, true);
        cb(new Error('이미지 파일만 업로드할 수 있습니다.'), false);
      },
    }),
  )
  async upload(@Req() req: any, @UploadedFile() file: Express.Multer.File, @Body('projectId') projectId?: string) {
    const asset = await this.mediaService.upload(req.user, file, projectId);
    return { id: asset.id, url: asset.url, mimeType: asset.mimeType, size: asset.size };
  }

  @Get(':id')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const asset = await this.mediaService.findById(id);
    if (!asset) {
      res.status(404).send('Not found');
      return;
    }
    res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(asset.storagePath);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.mediaService.delete(req.user, id);
  }
}
