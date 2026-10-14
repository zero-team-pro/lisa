import { BaseMessage } from '@/controllers/baseMessage';
import { OpenAI } from '@/controllers/openAI';

const methodName = 'aiBalance';

const exec = async (message: BaseMessage) => {
  const balance = await OpenAI.getBalance(message);

  const builder = message.getMessageBuilder();

  const balanceString = `$${balance.toLocaleString('en-US')}`;
  builder.addLineRaw([builder.text('Your balance is '), builder.bold(balanceString)]);

  return await builder.reply();
};

export const aiBalance = { methodName, exec };
