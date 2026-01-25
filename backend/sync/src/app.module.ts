import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { SyncGateway } from './sync/sync.gateway';

@Module({
  controllers: [HealthController],
  providers: [HealthService, SyncGateway],
})
export class AppModule {}
