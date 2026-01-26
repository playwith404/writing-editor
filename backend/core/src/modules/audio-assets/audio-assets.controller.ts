import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AudioAssetsService } from './audio-assets.service';

@UseGuards(JwtAuthGuard)
@Controller('audio-assets')
export class AudioAssetsController {
  constructor(private readonly audioAssetsService: AudioAssetsService) {}

  @Get()
  findAll(@Req() req: any, @Query('documentId') documentId?: string) {
    if (!documentId) return [];
    return this.audioAssetsService.findAllForUser(req.user?.userId, documentId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.audioAssetsService.findOneForUser(req.user?.userId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.audioAssetsService.createForUser(req.user?.userId, dto);
  }

  @Post('generate')
  generate(@Req() req: any, @Body() dto: any) {
    return this.audioAssetsService.generateForUser(req.user, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.audioAssetsService.removeForUser(req.user?.userId, id);
    return { success: true };
  }
}
