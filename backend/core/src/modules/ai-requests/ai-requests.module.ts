import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiRequestsService } from './ai-requests.service';
import { AiRequestsController } from './ai-requests.controller';
import { AiRequest } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([AiRequest])],
  providers: [AiRequestsService],
  controllers: [AiRequestsController],
})
export class AiRequestsModule {}
