import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BetaReadersService } from './beta-readers.service';
import { UpsertBetaReaderProfileDto } from './dto/upsert-beta-reader-profile.dto';

@UseGuards(JwtAuthGuard)
@Controller('beta-readers')
export class BetaReadersController {
  constructor(private readonly betaReadersService: BetaReadersService) {}

  @Get('me')
  me(@Req() req: any) {
    return this.betaReadersService.getMyProfile(req.user?.userId);
  }

  @Post('me')
  upsertMe(@Req() req: any, @Body() dto: UpsertBetaReaderProfileDto) {
    return this.betaReadersService.upsertMyProfile(req.user?.userId, dto);
  }

  @Get('recommendations')
  recommendations(@Req() req: any, @Query('projectId') projectId: string) {
    return this.betaReadersService.recommendForProject(req.user?.userId, projectId);
  }
}

