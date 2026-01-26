import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ProjectScopedCrudController } from '../../common/access/project-scoped-crud.controller';
import { PublishingExportsService } from './publishing-exports.service';
import { PublishingExport } from '../../entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('publishing-exports')
export class PublishingExportsController extends ProjectScopedCrudController<PublishingExport> {
  constructor(service: PublishingExportsService) {
    super(service);
  }

  @Get(':id/download')
  async download(@Req() req: any, @Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const { filename, mimeType, content } = await (this.service as PublishingExportsService).getDownloadForUser(req.user?.userId, id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return content;
  }
}
