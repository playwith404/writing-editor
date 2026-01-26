import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project, ProjectMember } from '../../entities';
import { ProjectAccessService } from './project-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectMember])],
  providers: [ProjectAccessService],
  exports: [ProjectAccessService],
})
export class AccessModule {}

