import { afterEach, expect, jest, test } from '@jest/globals';
jest.mock('@/models', () => ({ sequelize: { query: jest.fn() }, NexusTask: { findOne: jest.fn() } }));
jest.mock('./nexusChat', () => ({ requireNexusTelegram: jest.fn() }));
jest.mock('./nexusFiles', () => ({
  stageNexusFile: jest.fn(),
  NEXUS_FILE_LIMITS: { count: 10, bytes: 20_000_000, total: 50_000_000, stagingMs: 300_000, timeoutMs: 120_000 },
}));
import { stageNexusFile } from './nexusFiles';
import { materializeNexusMedia } from './nexusTelegramFiles';
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});
const descriptor = {
  kind: 'document' as const,
  fileId: 'opaque',
  uniqueId: 'unique',
  name: 'file.txt',
  mimeType: 'text/plain',
  sizeBytes: 3,
  sourceMessageId: 2,
  provenance: 'current' as const,
};
const message = () =>
  ({
    chatId: '123',
    raw: {
      telegram: {
        getFileLink: jest.fn<() => Promise<URL>>().mockResolvedValue(new URL('https://trusted.invalid/botSECRET/file')),
      },
    },
  }) as any;
test('source IDs are stable across duplicated intake and requested files keep provenance', async () => {
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue(new Response('abc'));
  jest.mocked(stageNexusFile).mockImplementation(async (input, stream) => {
    for await (const chunk of stream) {
      expect(chunk.byteLength).toBe(3);
    }
    return { id: input.fileId } as never;
  });
  const first = await materializeNexusMedia(message(), [descriptor]);
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue(new Response('abc'));
  const second = await materializeNexusMedia(message(), [descriptor]);
  expect(first).toEqual(second);
  expect(first[0]).toMatchObject({ sourceMessageId: 2, provenance: 'current' });
  expect(first[0].id).toMatch(/^[0-9a-f-]{36}$/);
});
test('actual stream size, not Telegram declaration, enforces the file bound', async () => {
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue(new Response(new Uint8Array(20_000_001)));
  jest.mocked(stageNexusFile).mockImplementation(async (_, stream) => {
    for await (const chunk of stream) {
      void chunk;
    }
    return {} as never;
  });
  await expect(materializeNexusMedia(message(), [descriptor])).rejects.toThrow('превышает лимит');
});
test('credential URL exceptions never escape provider download boundary', async () => {
  global.fetch = jest.fn<typeof fetch>().mockRejectedValue(new Error('https://api.telegram.org/botSECRET/file'));
  await expect(materializeNexusMedia(message(), [descriptor])).rejects.toThrow(expect.not.stringContaining('SECRET'));
});
test('input count is enforced before any network request', async () => {
  const input = message();
  await expect(materializeNexusMedia(input, Array(11).fill(descriptor))).rejects.toThrow('не больше 10');
  expect(input.raw.telegram.getFileLink).not.toHaveBeenCalled();
});
