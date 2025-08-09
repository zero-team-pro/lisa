import { BaseMessage } from '@/controllers/baseMessage';

const methodName = 'mode';

// TODO: Move to constants
const allowedModes = ['lisa'];

// TODO: i18n
const exec = async (message: BaseMessage) => {
  const [, param] = message.content.split(' ');

  if (!param) {
    return message.reply(`Mode: ${message.mode}`);
  }

  if (param === 'exit') {
    message.setMode(null);
    return message.reply('Exit from mode.');
  }

  if (allowedModes.includes(param)) {
    message.setMode(param);
    return message.reply('Mode set!');
  } else {
    return message.reply('Unknown mode.');
  }
};

export const mode = { exec, methodName };
