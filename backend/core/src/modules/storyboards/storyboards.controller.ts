import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StoryboardsService } from './storyboards.service';

@UseGuards(JwtAuthGuard)
@Controller('storyboards')
export class StoryboardsController {
  constructor(private readonly storyboardsService: StoryboardsService) {}

  @Get()
  findAll(@Req() req: any, @Query('documentId') documentId?: string) {
    if (!documentId) return [];
    return this.storyboardsService.findAllForUser(req.user?.userId, documentId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.storyboardsService.findOneForUser(req.user?.userId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.storyboardsService.createForUser(req.user?.userId, dto);
  }

  @Post('generate')
  generate(@Req() req: any, @Body() dto: any) {
    return this.storyboardsService.generateForUser(req.user, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.storyboardsService.removeForUser(req.user?.userId, id);
    return { success: true };
  }
}
