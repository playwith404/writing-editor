import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RelationshipsService } from './relationships.service';
import { RelationshipsController } from './relationships.controller';
import { Relationship } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Relationship])],
  providers: [RelationshipsService],
  controllers: [RelationshipsController],
})
export class RelationshipsModule {}
