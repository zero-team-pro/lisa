import express from 'express';

import { Logger } from '@/controllers/logger';
import { bridgeRequest } from '@/utils';

interface NotifyBridgeResult {
  messageId: number | null;
  isSent: boolean;
  error?: string;
}

const TELEGRAM_TEXT_LIMIT = 4096;

export const parseNotifyTokens = (value = ''): Map<string, number> => {
  const tokens = new Map<string, number>();

  for (const pair of value.split(',')) {
    const match = pair.trim().match(/^(.+):(-?\d+)$/);
    if (!match) {
      continue;
    }

    const token = match[1].trim();
    const chatId = Number(match[2]);
    if (token && Number.isSafeInteger(chatId)) {
      tokens.set(token, chatId);
    }
  }

  return tokens;
};

const getBearerToken = (authorization?: string): string | null => {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

const errorDetail = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Telegram delivery failed';
};

const router = express.Router();

router.post('/', async (req, res) => {
  const token = getBearerToken(req.get('authorization'));
  const chatId = token ? parseNotifyTokens(process.env.NOTIFY_TOKENS).get(token) : undefined;

  if (chatId === undefined) {
    return res.status(401).send({ isOk: false, error: 'Unauthorized' });
  }

  const { text } = req.body || {};
  const source = typeof req.body?.source === 'string' ? req.body.source : undefined;
  if (typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).send({ isOk: false, error: 'text must be a non-empty string' });
  }

  const truncatedText = text.slice(0, TELEGRAM_TEXT_LIMIT);
  Logger.info('Notification requested', { source, chatId, textLength: truncatedText.length }, 'Notify');

  try {
    const result = await bridgeRequest<NotifyBridgeResult>(req.app.settings.bridge, 'telegram', 'tg-notify', {
      chatId,
      text: truncatedText,
    });

    if (result?.isSent && typeof result.messageId === 'number') {
      Logger.info('Notification sent', { source, chatId, messageId: result.messageId }, 'Notify');
      return res.send({ isOk: true, messageId: result.messageId, chatId });
    }

    const error = result?.error || 'Telegram delivery failed';
    Logger.error('Notification delivery failed', { source, chatId, error }, 'Notify');
    return res.status(502).send({ isOk: false, error });
  } catch (cause) {
    const error = errorDetail(cause);
    Logger.error('Notification delivery failed', { source, chatId, error }, 'Notify');
    return res.status(502).send({ isOk: false, error });
  }
});

export default router;
