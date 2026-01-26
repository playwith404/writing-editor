import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentCommentsService } from './document-comments.service';

@UseGuards(JwtAuthGuard)
@Controller('document-comments')
export class DocumentCommentsController {
  constructor(private readonly documentCommentsService: DocumentCommentsService) {}

  @Get()
  findAll(@Req() req: any, @Query('documentId') documentId?: string) {
    if (!documentId) return [];
    return this.documentCommentsService.findAllForUser(req.user?.userId, documentId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.documentCommentsService.findOneForUser(req.user?.userId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.documentCommentsService.createForUser(req.user?.userId, dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.documentCommentsService.updateForUser(req.user?.userId, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.documentCommentsService.removeForUser(req.user?.userId, id);
    return { success: true };
  }
}

