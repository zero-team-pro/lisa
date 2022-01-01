import express from 'express';
import fetch from 'node-fetch';

import { catchAsync } from '../utils';

const router = express.Router();

const { API_HOST, API_HOST_LE } = process.env;
const apiProtocol = API_HOST_LE ? 'https' : 'http';
const apiHost = API_HOST_LE || API_HOST;
const redirect = `${apiProtocol}://${apiHost}/auth/callback`;

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

router.get('/login', (req, res) => {
  res.redirect(
    `https://discord.com/api/v8/oauth2/authorize?client_id=${CLIENT_ID}` +
      `&scope=identify&response_type=code&redirect_uri=${redirect}`,
  );
});

function encode(obj) {
  let string = '';

  for (const [key, value] of Object.entries(obj)) {
    if (!value) continue;
    string += `&${encodeURIComponent(key)}=${encodeURIComponent(value as any)}`;
  }

  return string.substring(1);
}

router.get(
  '/callback',
  catchAsync(async (req, res) => {
    if (!req.query.code) throw new Error('NoCodeProvided');
    const code = req.query.code;

    const data = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirect,
    };
    const params = encode(data);
    const response = await fetch(`https://discord.com/api/v8/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const json = (await response.json()) as any;

    res.redirect(`/?token=${json.access_token}`);
  }),
);

export default router;
