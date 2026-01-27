import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BetaSessionsService } from './beta-sessions.service';
import { BetaSessionsController } from './beta-sessions.controller';
import { BetaSession, BetaSessionInvite, BetaSessionParticipant, Document, User } from '../../entities';
import { AccessModule } from '../../common/access/access.module';
import { BetaAccessModule } from '../beta-access/beta-access.module';

@Module({
  imports: [TypeOrmModule.forFeature([BetaSession, BetaSessionInvite, BetaSessionParticipant, Document, User]), AccessModule, BetaAccessModule],
  providers: [BetaSessionsService],
  controllers: [BetaSessionsController],
})
export class BetaSessionsModule {}
