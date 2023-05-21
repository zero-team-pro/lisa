import { BaseMessage } from '@/controllers/baseMessage';
import { OpenAI } from '@/controllers/openAI';
import { AICall } from '@/models';

const methodName = 'reply';

const exec = async (message: BaseMessage) => {
  // Checks is previous message is an OpenAI request.
  const prev = await AICall.findOne({ where: { messageId: message.parent.uniqueId } });
  if (!prev) {
    return;
  }

  const prompt = message.content;

  message.startTyping();

  return await OpenAI.chat(prompt, message, [
    { role: message.parent.isSelf ? 'assistant' : 'user', content: message.parent.content },
  ]);
};

export const reply = { methodName, exec };
