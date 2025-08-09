import { got } from 'got';

import { BaseMessage } from '@/controllers/baseMessage';
import { BotError } from '@/controllers/botError';
import { OpenAI } from '@/controllers/openAI';

const methodName = 'ai';

const test = (message: BaseMessage): boolean => {
  const text = message.content;

  const regex = /^(\/ai|Лиза|Lisa)([,.!?\s]+|$)/i;
  return regex.test(text.trim().toLowerCase());
};

const getFileContent = async (url: string, size: number) => {
  if (size > 100_000) {
    throw new BotError('Filesize limit');
  }

  return (await got.get(url)).body;
};

const exec = async (message: BaseMessage) => {
  message.startTyping();
  message.markProcessed();

  const regexRawAi = /^(\/ai)([,.!?\s]+|$)/i;
  const isRawAiCommand = regexRawAi.test(message.content.trim().toLowerCase());

  const document = (await message.documents)?.get('file');
  const fileContent = isRawAiCommand ? (await getFileContent(document.url, document.size)) || null : null;
  const filePart = fileContent ? `\n${fileContent}` : '';

  // TODO: Move to constants
  const prompt =
    message.mode === 'lisa' ? message.content + filePart : message.content.replace(/^\S+\s*/, '') + filePart;

  const [aiOwner, owner] = await OpenAI.getAIOwner(message);
  const isToolsUse = aiOwner.isToolsEnabled || true;

  return await OpenAI.chat(prompt, message, aiOwner, owner, isToolsUse, isRawAiCommand && Boolean(fileContent));
};

export const ai = { methodName, exec, test };
