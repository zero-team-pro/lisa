export interface NotifyTokenOwner {
  token: string;
  chatId: number;
}

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

export const getBearerToken = (authorization?: string): string | null => {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

export const authenticateNotifyToken = (
  authorization?: string,
  configuredTokens = process.env.NOTIFY_TOKENS,
): NotifyTokenOwner | null => {
  const token = getBearerToken(authorization);
  const chatId = token ? parseNotifyTokens(configuredTokens).get(token) : undefined;
  return token && chatId !== undefined ? { token, chatId } : null;
};
