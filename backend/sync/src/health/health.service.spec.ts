import { describe, expect, it } from 'vitest';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns service status with default name', () => {
    delete process.env.SERVICE_NAME;
    const service = new HealthService();
    const result = service.status();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('sync-service');
    expect(typeof result.time).toBe('string');
  });
});
