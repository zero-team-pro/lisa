import { BaseMessage } from '@/controllers/baseMessage';
import { OpenAiGroupData } from '@/types';

const methodName = 'setGroupPay';

// TODO: Check is admin of the group.
const exec = async (message: BaseMessage) => {
  const [, state] = message.content.split(' ');

  const context = await message.getGroupModuleData<OpenAiGroupData>('openai');

  const builder = message.getMessageBuilderOld();

  if (!context) {
    return message.reply('This is not a group.');
  }
  if (state === 'true') {
    context.isGroupPay = true;
    await message.setGroupModuleData<OpenAiGroupData>('openai', context);
    builder.addLine(`Group\\-based payment is ${builder.bold('enabled')} now\\.`, { raw: true });
    return builder.reply();
  }
  if (state === 'false') {
    context.isGroupPay = false;
    await message.setGroupModuleData<OpenAiGroupData>('openai', context);
    builder.addLine(`Group\\-based payment is ${builder.bold('disabled')} now\\.`, { raw: true });
    return builder.reply();
  } else {
    builder.addHeader('Usage');
    builder.addFieldCode('Enable', '/setGroupPay true');
    builder.addFieldCode('Disable', '/setGroupPay false');
    return builder.reply();
  }
};

export const setGroupPay = { methodName, exec };
