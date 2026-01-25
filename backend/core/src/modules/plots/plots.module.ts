import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlotsService } from './plots.service';
import { PlotsController } from './plots.controller';
import { Plot } from '../../entities';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [TypeOrmModule.forFeature([Plot]), SearchModule],
  providers: [PlotsService],
  controllers: [PlotsController],
})
export class PlotsModule {}
