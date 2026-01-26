import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TranslationsService } from './translations.service';

@UseGuards(JwtAuthGuard)
@Controller('translations')
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Get()
  findAll(@Req() req: any, @Query('documentId') documentId?: string) {
    if (!documentId) return [];
    return this.translationsService.findAllForUser(req.user?.userId, documentId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.translationsService.findOneForUser(req.user?.userId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.translationsService.createForUser(req.user?.userId, dto);
  }

  @Post('generate')
  generate(@Req() req: any, @Body() dto: any) {
    return this.translationsService.generateForUser(req.user, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.translationsService.removeForUser(req.user?.userId, id);
    return { success: true };
  }
}
