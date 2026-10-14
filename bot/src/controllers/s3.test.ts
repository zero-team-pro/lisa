import { afterEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('@/utils', () => ({}));
jest.mock('@/controllers/logger', () => ({ Logger: { info: jest.fn(), error: jest.fn(), crit: jest.fn() } }));

const savedEnv = { ...process.env };
afterEach(() => {
  process.env = { ...savedEnv };
});

describe('S3 upload compatibility', () => {
  test.each([true, false])('serializes uploads with a custom endpoint: %s', async (customEndpoint) => {
    Object.assign(process.env, {
      S3_ACCESS_KEY_ID: 'offline-fixture-key',
      S3_SECRET_ACCESS_KEY: 'offline-fixture-secret',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'fixture-bucket',
      S3_PUBLIC: 'https://cdn.example.org',
    });
    if (customEndpoint) process.env.S3_ENDPOINT = 'https://storage.example.org';
    else delete process.env.S3_ENDPOINT;

    let cloud: typeof import('./s3').S3Cloud;
    jest.isolateModules(() => {
      cloud = require('./s3').S3Cloud;
    });
    // Replace the HTTP transport, retaining the real SDK serialization and signing.
    // Fake credentials and this handler ensure no storage request leaves the test.
    const handle = jest.fn<(request: any) => Promise<any>>().mockResolvedValue({
      response: { statusCode: 200, headers: {}, body: Buffer.alloc(0) },
    });
    (cloud as any).s3.config.requestHandler = { handle };
    const payload = Buffer.from('offline avatar fixture');
    expect(await cloud.upload(cloud.Dir.TelegramAvatar, payload, '123.png', 'image/png')).toBe('tg-avatar/123.png');
    expect(handle).toHaveBeenCalledTimes(1);
    const request = handle.mock.calls[0][0];
    expect(request.body).toEqual(payload);
    expect(request.headers['content-type']).toBe('image/png');
    expect(request.headers.authorization).toContain('Credential=offline-fixture-key/');
    if (customEndpoint) {
      expect(request.hostname).toBe('storage.example.org');
      expect(request.headers['x-amz-checksum-crc32']).toBeUndefined();
    } else {
      expect(request.headers['x-amz-checksum-crc32']).toEqual(expect.any(String));
    }
  });
});
