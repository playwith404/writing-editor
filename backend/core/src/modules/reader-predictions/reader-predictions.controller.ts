import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReaderPredictionsService } from './reader-predictions.service';

@UseGuards(JwtAuthGuard)
@Controller('reader-predictions')
export class ReaderPredictionsController {
  constructor(private readonly readerPredictionsService: ReaderPredictionsService) {}

  @Get()
  findAll(@Req() req: any, @Query('documentId') documentId?: string) {
    if (!documentId) return [];
    return this.readerPredictionsService.findAllForUser(req.user?.userId, documentId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.readerPredictionsService.findOneForUser(req.user?.userId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.readerPredictionsService.createForUser(req.user?.userId, dto);
  }

  @Post('generate')
  generate(@Req() req: any, @Body() dto: any) {
    return this.readerPredictionsService.generateForUser(req.user, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.readerPredictionsService.removeForUser(req.user?.userId, id);
    return { success: true };
  }
}
