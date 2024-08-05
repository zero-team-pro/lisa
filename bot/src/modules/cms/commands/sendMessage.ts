import { slateToTelegramMDV2, bridgeRequest } from '@/utils';
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

  const text = slateToTelegramMDV2(article.text);
  const articleText = `*${article.title}*\n${text}`;

  const message = await bot.telegram.sendMessage(article.chatId, articleText, { parse_mode: 'MarkdownV2' });

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
