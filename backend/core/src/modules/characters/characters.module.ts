import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersService } from './characters.service';
import { CharactersController } from './characters.controller';
import { Character } from '../../entities';
import { SearchModule } from '../search/search.module';
import { AccessModule } from '../../common/access/access.module';

@Module({
  imports: [TypeOrmModule.forFeature([Character]), SearchModule, AccessModule],
  providers: [CharactersService],
  controllers: [CharactersController],
})
export class CharactersModule {}
