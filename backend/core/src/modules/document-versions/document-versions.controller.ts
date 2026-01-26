import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentVersionsService } from './document-versions.service';

@UseGuards(JwtAuthGuard)
@Controller('document-versions')
export class DocumentVersionsController {
  constructor(private readonly documentVersionsService: DocumentVersionsService) {}

  @Get()
  findAll(@Req() req: any, @Query('documentId') documentId?: string) {
    if (!documentId) return [];
    return this.documentVersionsService.findAllForUser(req.user?.userId, documentId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.documentVersionsService.findOneForUser(req.user?.userId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.documentVersionsService.createForUser(req.user?.userId, dto);
  }

  @Post(':id/restore')
  restore(@Req() req: any, @Param('id') id: string) {
    return this.documentVersionsService.restoreForUser(req.user?.userId, id);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.documentVersionsService.removeForUser(req.user?.userId, id);
    return { success: true };
  }
}
