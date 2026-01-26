import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RelationshipsService } from './relationships.service';
import { RelationshipsController } from './relationships.controller';
import { Relationship } from '../../entities';
import { AccessModule } from '../../common/access/access.module';

@Module({
  imports: [TypeOrmModule.forFeature([Relationship]), AccessModule],
  providers: [RelationshipsService],
  controllers: [RelationshipsController],
})
export class RelationshipsModule {}
