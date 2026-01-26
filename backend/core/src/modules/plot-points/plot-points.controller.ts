import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlotPointsService } from './plot-points.service';

@UseGuards(JwtAuthGuard)
@Controller('plot-points')
export class PlotPointsController {
  constructor(private readonly plotPointsService: PlotPointsService) {}

  @Get()
  findAll(@Req() req: any, @Query('plotId') plotId?: string) {
    if (!plotId) return [];
    return this.plotPointsService.findAllForUser(req.user?.userId, plotId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.plotPointsService.findOneForUser(req.user?.userId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.plotPointsService.createForUser(req.user?.userId, dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.plotPointsService.updateForUser(req.user?.userId, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.plotPointsService.removeForUser(req.user?.userId, id);
    return { success: true };
  }
}

