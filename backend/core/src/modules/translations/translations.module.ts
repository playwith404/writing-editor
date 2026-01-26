import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranslationsService } from './translations.service';
import { TranslationsController } from './translations.controller';
import { Document, Translation } from '../../entities';
import { AccessModule } from '../../common/access/access.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Translation, Document]), AiModule, AccessModule],
  providers: [TranslationsService],
  controllers: [TranslationsController],
})
export class TranslationsModule {}
