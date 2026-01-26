import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BetaFeedbackService } from './beta-feedback.service';

@UseGuards(JwtAuthGuard)
@Controller('beta-feedback')
export class BetaFeedbackController {
  constructor(private readonly betaFeedbackService: BetaFeedbackService) {}

  @Get()
  findAll(@Req() req: any, @Query('sessionId') sessionId?: string) {
    if (!sessionId) return [];
    return this.betaFeedbackService.findAllForUser(req.user?.userId, sessionId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.betaFeedbackService.findOneForUser(req.user?.userId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.betaFeedbackService.createForUser(req.user?.userId, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.betaFeedbackService.removeForUser(req.user?.userId, id);
    return { success: true };
  }
}

