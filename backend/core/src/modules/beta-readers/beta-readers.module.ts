import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessModule } from '../../common/access/access.module';
import { BetaReaderProfile, Project, User } from '../../entities';
import { BetaReadersController } from './beta-readers.controller';
import { BetaReadersService } from './beta-readers.service';

@Module({
  imports: [TypeOrmModule.forFeature([BetaReaderProfile, Project, User]), AccessModule],
  controllers: [BetaReadersController],
  providers: [BetaReadersService],
})
export class BetaReadersModule {}

