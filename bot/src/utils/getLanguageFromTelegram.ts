import { Language } from '../constants';
import { TelegramMessage } from '../controllers/telegramMessage';

export const getLanguageFromTelegram = (message: TelegramMessage): Language | null => {
  const langCode = message.raw.from?.language_code;

  switch (langCode) {
    case 'en':
      return Language.English;
    case 'ru':
      return Language.Russian;
    default:
      return null;
  }
};
