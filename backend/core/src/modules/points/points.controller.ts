import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PointsService } from './points.service';

@UseGuards(JwtAuthGuard)
@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('balance')
  balance(@Req() req: any) {
    return this.pointsService.balance(req.user?.userId);
  }

  @Get('transactions')
  transactions(@Req() req: any) {
    return this.pointsService.transactions(req.user?.userId);
  }
}

