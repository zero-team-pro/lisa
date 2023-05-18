import { BaseMessage } from '@/controllers/baseMessage';
import { OpenAI } from '@/controllers/openAI';

const methodName = 'ai';

const exec = async (message: BaseMessage) => {
  const [, ...other] = message.content.split(' ');

  const prompt = other.join(' ');

  // const context = await message.getModuleData<OpenAiData>('openai');

  const answer = await OpenAI.chat(prompt);

  await message.reply(answer);
};

export const ai = { methodName, exec };
