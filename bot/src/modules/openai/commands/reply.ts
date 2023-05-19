import { BaseMessage } from '@/controllers/baseMessage';
import { OpenAI } from '@/controllers/openAI';

const methodName = 'reply';

const exec = async (message: BaseMessage) => {
  // TODO: Check is previous message is a OpenAI request.

  const prompt = message.content;

  // const context = await message.getModuleData<OpenAiData>('openai');

  const answer = await OpenAI.chat(prompt, [
    { role: message.parent.isSelf ? 'assistant' : 'user', content: message.parent.content },
  ]);

  await message.reply(answer);
};

export const reply = { methodName, exec };
