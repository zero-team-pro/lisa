import { BaseMessage } from '@/controllers/baseMessage';
import { BotError } from '@/controllers/botError';
import { OpenAI } from '@/controllers/openAI';

const methodName = 'img';

const exec = async (message: BaseMessage) => {
  message.startTyping();

  const regexRawAi = /^(\/img)([,.!?\s]+|$)/i;
  const isRawAiCommand = regexRawAi.test(message.content.trim().toLowerCase());

  const prompt = message.content.replace(/^\S+\s*/, '');

  return await OpenAI.image(prompt, message, isRawAiCommand);
};

export const img = { methodName, exec };
