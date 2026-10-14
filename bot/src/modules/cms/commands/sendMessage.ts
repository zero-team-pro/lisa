import { bridgeRequest } from '@/utils/bridgeRequest';
import { documentMessage } from '@/messages/document';
import { fromSlate } from '@/messages/sources';
import { sendTelegram } from '@/messages/telegram';
import { Article } from '@/models';
import { TelegrafBot } from '@/types';
import { Errors } from '@/constants';

interface IParams {
  articleId: number;
}

interface IRes {
  messageId: number;
  error?: any;
  isSent: boolean;
}

const methodName = 'tg-sendMessage';

const exec = async (params: IParams, bot: TelegrafBot): Promise<IRes> => {
  const { articleId } = params;

  const result = { messageId: null, isSent: false, error: undefined };

  const article = await Article.findByPk(articleId);

  if (!article) {
    throw Errors.BAD_REQUEST;
  }

  const articleDocument = fromSlate(article.text);
  articleDocument.runs.unshift({ text: article.title + '\n', marks: { bold: true } });
  const messages = await sendTelegram(documentMessage(articleDocument), ({ text, entities }) =>
    bot.telegram.sendMessage(article.chatId, text, { entities }),
  );
  const message = messages[0];

  if (message?.message_id) {
    result.isSent = true;
    result.messageId = message.message_id;
  } else {
    result.error = true;
  }

  return result;
};

const apiExec = (bridge, params: IParams) => {
  return bridgeRequest<IRes>(bridge, 'telegram', methodName, params);
};

export const sendMessage = { methodName, exec, apiExec };
