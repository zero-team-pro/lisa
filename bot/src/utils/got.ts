import got from 'got';

const https = process.env.API_HOST_LE ? 'https' : 'http';

export const gateway = got.extend({
  prefixUrl: `${https}://${process.env.API_HOST}`,
  retry: { limit: 0 },
});
