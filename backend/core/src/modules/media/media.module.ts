import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessModule } from '../../common/access/access.module';
import { MediaAsset } from '../../entities';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [TypeOrmModule.forFeature([MediaAsset]), AccessModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}

