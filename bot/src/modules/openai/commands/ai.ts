import { BaseMessage } from '@/controllers/baseMessage';
import { OpenAI } from '@/controllers/openAI';

const methodName = 'ai';

const exec = async (message: BaseMessage) => {
  const prompt = message.content.replace(/^\S+\s*/, '');

  return await OpenAI.chat(prompt, message);
};

export const ai = { methodName, exec };
