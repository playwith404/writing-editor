export interface HealthStatus {
  status: 'ok';
  service: string;
  time: string;
}

export class HealthService {
  private readonly serviceName: string;

  constructor() {
    this.serviceName = process.env.SERVICE_NAME ?? 'core-api';
  }

  status(): HealthStatus {
    return {
      status: 'ok',
      service: this.serviceName,
      time: new Date().toISOString()
    };
  }
}
