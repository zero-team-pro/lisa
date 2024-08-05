import { BaseMessage } from '@/controllers/baseMessage';
import { OpenAI } from '@/controllers/openAI';

const methodName = 'ai';

const test = (message: BaseMessage): boolean => {
  const text = message.content;

  const regex = /^(\/ai|Лиза|Lisa)([,.!?\s]+|$)/i;
  return regex.test(text.trim().toLowerCase());
};

const exec = async (message: BaseMessage) => {
  const prompt = message.content.replace(/^\S+\s*/, '');

  message.startTyping();

  const regexRawAi = /^(\/ai)([,.!?\s]+|$)/i;
  const isRawAiCommand = regexRawAi.test(message.content.trim().toLowerCase());

  return await OpenAI.chat(prompt, message, isRawAiCommand);
};

export const ai = { methodName, exec, test };
