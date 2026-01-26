import { Module } from '@nestjs/common';
import { AccessModule } from '../../common/access/access.module';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [AccessModule],
  providers: [SearchService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
