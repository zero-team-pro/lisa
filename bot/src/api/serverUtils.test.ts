import { describe, expect, it, jest } from '@jest/globals';

import { countServerUsers } from './serverUtils';

describe('countServerUsers', () => {
  it('counts through the supplied model instead of a hard-coded table name', async () => {
    const count = jest.fn<(options: { where: { serverId: string } }) => Promise<number>>().mockResolvedValue(7);

    await expect(countServerUsers({ count }, 'guild-id')).resolves.toBe(7);
    expect(count).toHaveBeenCalledWith({ where: { serverId: 'guild-id' } });
  });
});
