import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessModule } from '../../common/access/access.module';
import { BetaSession, BetaSessionParticipant } from '../../entities';
import { BetaAccessService } from './beta-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([BetaSession, BetaSessionParticipant]), AccessModule],
  providers: [BetaAccessService],
  exports: [BetaAccessService],
})
export class BetaAccessModule {}

