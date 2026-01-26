import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BetaSessionsService } from './beta-sessions.service';
import { BetaSessionsController } from './beta-sessions.controller';
import { BetaSession } from '../../entities';
import { AccessModule } from '../../common/access/access.module';

@Module({
  imports: [TypeOrmModule.forFeature([BetaSession]), AccessModule],
  providers: [BetaSessionsService],
  controllers: [BetaSessionsController],
})
export class BetaSessionsModule {}
