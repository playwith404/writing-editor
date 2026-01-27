import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { ENTITIES } from './entities';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ProjectMembersModule } from './modules/project-members/project-members.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { DocumentVersionsModule } from './modules/document-versions/document-versions.module';
import { CharactersModule } from './modules/characters/characters.module';
import { CharacterStatsModule } from './modules/character-stats/character-stats.module';
import { WorldSettingsModule } from './modules/world-settings/world-settings.module';
import { RelationshipsModule } from './modules/relationships/relationships.module';
import { PlotsModule } from './modules/plots/plots.module';
import { PlotPointsModule } from './modules/plot-points/plot-points.module';
import { WritingGoalsModule } from './modules/writing-goals/writing-goals.module';
import { AiModule } from './modules/ai/ai.module';
import { AiUsageModule } from './modules/ai-usage/ai-usage.module';
import { AiRequestsModule } from './modules/ai-requests/ai-requests.module';
import { BetaSessionsModule } from './modules/beta-sessions/beta-sessions.module';
import { BetaFeedbackModule } from './modules/beta-feedback/beta-feedback.module';
import { PublishingExportsModule } from './modules/publishing-exports/publishing-exports.module';
import { TranslationsModule } from './modules/translations/translations.module';
import { AudioAssetsModule } from './modules/audio-assets/audio-assets.module';
import { StoryboardsModule } from './modules/storyboards/storyboards.module';
import { ReaderPredictionsModule } from './modules/reader-predictions/reader-predictions.module';
import { ResearchItemsModule } from './modules/research-items/research-items.module';
import { DocumentCommentsModule } from './modules/document-comments/document-comments.module';
import { SearchModule } from './modules/search/search.module';
import { StatsModule } from './modules/stats/stats.module';
import { BillingModule } from './modules/billing/billing.module';
import { BetaReadersModule } from './modules/beta-readers/beta-readers.module';
import { PointsModule } from './modules/points/points.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [],
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        username: process.env.DB_USER ?? 'cowrite',
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.DB_NAME ?? 'cowrite',
        entities: ENTITIES,
        synchronize: false,
      }),
    }),
    AuthModule,
    UsersModule,
    ProjectsModule,
    ProjectMembersModule,
    DocumentsModule,
    DocumentVersionsModule,
    CharactersModule,
    CharacterStatsModule,
    WorldSettingsModule,
    RelationshipsModule,
    PlotsModule,
    PlotPointsModule,
    WritingGoalsModule,
    AiModule,
    AiUsageModule,
    AiRequestsModule,
    BetaSessionsModule,
    BetaFeedbackModule,
    BetaReadersModule,
    PublishingExportsModule,
    TranslationsModule,
    AudioAssetsModule,
    StoryboardsModule,
    ReaderPredictionsModule,
    ResearchItemsModule,
    DocumentCommentsModule,
    SearchModule,
    StatsModule,
    BillingModule,
    PointsModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
