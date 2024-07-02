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

  return await OpenAI.chat(prompt, message);
};

export const ai = { methodName, exec, test };
