import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMembersService } from './project-members.service';
import { ProjectMembersController } from './project-members.controller';
import { ProjectMember } from '../../entities';
import { AccessModule } from '../../common/access/access.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectMember]), AccessModule],
  providers: [ProjectMembersService],
  controllers: [ProjectMembersController],
})
export class ProjectMembersModule {}
