import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BetaSessionsService } from './beta-sessions.service';
import { CreateBetaSessionDto } from './dto/create-beta-session.dto';
import { UpdateBetaSessionDto } from './dto/update-beta-session.dto';
import { CreateBetaSessionInviteDto } from './dto/create-beta-session-invite.dto';
import { JoinBetaSessionDto } from './dto/join-beta-session.dto';

@UseGuards(JwtAuthGuard)
@Controller('beta-sessions')
export class BetaSessionsController {
  constructor(private readonly betaSessionsService: BetaSessionsService) {}

  @Get()
  list(@Req() req: any, @Query('projectId') projectId?: string) {
    return this.betaSessionsService.listForUser(req.user?.userId, projectId);
  }

  @Get('invite')
  inviteInfo(@Req() req: any, @Query('token') token: string) {
    return this.betaSessionsService.getInviteInfo(req.user?.userId, token);
  }

  @Post('join')
  join(@Req() req: any, @Body() dto: JoinBetaSessionDto) {
    return this.betaSessionsService.joinByInvite(req.user?.userId, dto.token);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.betaSessionsService.findOneForUser(req.user?.userId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateBetaSessionDto) {
    return this.betaSessionsService.createForUser(req.user?.userId, dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateBetaSessionDto) {
    return this.betaSessionsService.updateForUser(req.user?.userId, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.betaSessionsService.removeForUser(req.user?.userId, id);
    return { success: true };
  }

  @Post(':id/invites')
  createInvite(@Req() req: any, @Param('id') id: string, @Body() dto: CreateBetaSessionInviteDto) {
    return this.betaSessionsService.createInviteForSession(req.user?.userId, id, dto);
  }

  @Get(':id/participants')
  participants(@Req() req: any, @Param('id') id: string) {
    return this.betaSessionsService.listParticipantsForSession(req.user?.userId, id);
  }

  @Get(':id/document')
  document(@Req() req: any, @Param('id') id: string) {
    return this.betaSessionsService.getSessionDocumentForUser(req.user?.userId, id);
  }
}

