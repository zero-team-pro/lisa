import { describe, expect, test } from '@jest/globals';
import { extractNexusMedia, nexusMediaWithQuoted, unsupportedNexusPayload } from './nexusTelegramMedia';
const file = { file_id: 'opaque-id', file_unique_id: 'unique', file_size: 10 };
describe('Nexus Telegram media extraction', () => {
  test('largest photo is selected without changing Telegram payload', () => {
    const photo = [
      { ...file, width: 100, height: 100 },
      { ...file, file_id: 'largest', width: 1000, height: 1000 },
    ];
    const before = JSON.stringify(photo);
    expect(extractNexusMedia({ message_id: 3, photo })[0]).toMatchObject({
      fileId: 'largest',
      provenance: 'current',
      sourceMessageId: 3,
    });
    expect(JSON.stringify(photo)).toBe(before);
  });
  test.each(['document', 'audio', 'voice', 'video', 'animation', 'video_note'])(
    'extracts %s without a credential URL',
    (kind) => {
      const result = extractNexusMedia({ message_id: 4, [kind]: { ...file, file_name: 'original.ext' } });
      expect(result[0]).toMatchObject({ kind, fileId: 'opaque-id', name: 'original.ext' });
      expect(JSON.stringify(result)).not.toContain('url');
    },
  );
  test('current and explicit reply keep source provenance', () => {
    const result = nexusMediaWithQuoted({
      message_id: 3,
      document: file,
      reply_to_message: { message_id: 2, photo: [file] },
    });
    expect(result.map((value) => [value.sourceMessageId, value.provenance])).toEqual([
      [3, 'current'],
      [2, 'quoted'],
    ]);
  });
  test('animation takes priority over Telegram duplicate document and unsupported updates are explicit', () => {
    expect(extractNexusMedia({ message_id: 3, document: file, animation: file })).toHaveLength(1);
    expect(extractNexusMedia({ message_id: 3, text: 'hello' })).toEqual([]);
    expect(unsupportedNexusPayload({ sticker: file })).toBe(true);
  });
});
