import { Controller, Get, Param, Post, Req, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BackupsService } from './backups.service';

@UseGuards(JwtAuthGuard)
@Controller('backups')
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get('projects/:projectId/export')
  async exportProject(@Req() req: any, @Param('projectId') projectId: string, @Res({ passthrough: true }) res: Response) {
    const { filename, mimeType, content } = await this.backupsService.exportProjectForUser(req.user?.userId, projectId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return content;
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async importBackup(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    return this.backupsService.importForUser(req.user?.userId, file);
  }
}

