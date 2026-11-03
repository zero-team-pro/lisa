import { beforeEach, expect, jest, test } from '@jest/globals';
jest.mock('@/models', () => ({ sequelize: { transaction: jest.fn(), query: jest.fn() } }));
import { sequelize } from '@/models';
import { albumDue, collectNexusAlbum, flushNexusAlbums } from './nexusAlbumIntake';
let row: any;
beforeEach(() => {
  row = {
    ownerChatId: '123',
    mediaGroupId: 'album',
    state: 'collecting',
    messages: [],
    firstAt: new Date(),
    lastAt: new Date(),
  };
  jest.mocked(sequelize.transaction).mockImplementation(async (callback: any) => callback({}));
  jest.mocked(sequelize.query).mockImplementation(async (sql: any, options: any) => {
    if (sql.startsWith('SELECT')) return [row] as any;
    if (sql.includes('messages=CAST')) row.messages = JSON.parse(options.replacements.messages);
    if (sql.includes("SET state='finalizing'")) row.state = 'finalizing';
    if (sql.includes('SET state=:state')) row.state = options.replacements.state;
    return [] as any;
  });
});
test('album quiet debounce and maximum window are distinct bounds', () => {
  expect(albumDue(0, 1900, 2000)).toBe(false);
  expect(albumDue(0, 1900, 3900)).toBe(true);
  expect(albumDue(0, 9900, 10000)).toBe(true);
});
test('caption on later document part survives duplicate webhook and source ordering', async () => {
  const first = { message_id: 2, media_group_id: 'album', document: { file_id: 'a', file_unique_id: 'a' } } as any;
  const later = {
    message_id: 3,
    media_group_id: 'album',
    caption: '/nexus inspect',
    document: { file_id: 'b', file_unique_id: 'b' },
  } as any;
  expect(await collectNexusAlbum('123', 'album', first)).toBe('collected');
  expect(await collectNexusAlbum('123', 'album', later)).toBe('collected');
  expect(await collectNexusAlbum('123', 'album', first)).toBe('duplicate');
  expect(row.messages.map((item: any) => item.message.message_id)).toEqual([2, 3]);
  expect(row.messages[1].message.caption).toBe('/nexus inspect');
  row.state = 'finalized';
  expect(await collectNexusAlbum('123', 'album', { ...later, message_id: 4 })).toBe('late');
  expect(row.messages.at(-1).rejected).toBe(true);
});
test('restart recovers persisted finalizing album and does not erase messages on failure', async () => {
  row.state = 'finalizing';
  row.messages = [{ message: { message_id: 2 } }];
  const finalize = jest.fn<(row: any) => Promise<void>>().mockRejectedValue(new Error('restart injection'));
  await flushNexusAlbums(finalize);
  expect(finalize).toHaveBeenCalledWith(row);
  expect(row.state).toBe('finalizing');
  expect(row.messages).toHaveLength(1);
});

test('known intake failure stays failed with metadata rather than falsely finalized', async () => {
  let calls = 0;
  const original = sequelize.query;
  jest.mocked(sequelize.query).mockImplementation(async (sql: any, options: any) => {
    if (sql.startsWith('SELECT')) return calls++ ? ([] as any) : ([row] as any);
    if (sql.includes('SET state=:state')) row.state = options.replacements.state;
    return [] as any;
  });
  await flushNexusAlbums(async () => false);
  expect(row.state).toBe('failed');
});
