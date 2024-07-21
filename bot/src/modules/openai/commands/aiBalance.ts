import { BaseMessage } from '@/controllers/baseMessage';
import { OpenAI } from '@/controllers/openAI';

const methodName = 'aiBalance';

const exec = async (message: BaseMessage) => {
  const balance = await OpenAI.getBalance(message);

  const builder = message.getMessageBuilderOld();

  const balanceString = `$${balance.toLocaleString('en-US')}`;
  builder.addLine(`Your balanse is ${builder.bold(balanceString)}`, { raw: true });

  return await builder.reply();
};

export const aiBalance = { methodName, exec };
