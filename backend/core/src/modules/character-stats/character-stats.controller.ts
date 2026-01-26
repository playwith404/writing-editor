import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CharacterStatsService } from './character-stats.service';

@UseGuards(JwtAuthGuard)
@Controller('character-stats')
export class CharacterStatsController {
  constructor(private readonly characterStatsService: CharacterStatsService) {}

  @Get()
  findAll(@Req() req: any, @Query('characterId') characterId?: string) {
    if (!characterId) return [];
    return this.characterStatsService.findAllForUser(req.user?.userId, characterId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.characterStatsService.findOneForUser(req.user?.userId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.characterStatsService.createForUser(req.user?.userId, dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.characterStatsService.updateForUser(req.user?.userId, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.characterStatsService.removeForUser(req.user?.userId, id);
    return { success: true };
  }
}

