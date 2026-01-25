export interface HealthStatus {
  status: 'ok';
  service: string;
  time: string;
}

import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  private readonly serviceName: string;

  constructor() {
    this.serviceName = process.env.SERVICE_NAME ?? 'sync-service';
  }

  status(): HealthStatus {
    return {
      status: 'ok',
      service: this.serviceName,
      time: new Date().toISOString()
    };
  }
}
