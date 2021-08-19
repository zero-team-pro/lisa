import { translationEnglish } from './en';
import { Language } from '../constants';

export const translationRussian: DeepPartial<typeof translationEnglish> = {
  commandNotFound: 'Команда не найдена',
  wrongParams: 'Неверные параметры',
  none: 'нету',
  dbError: 'Ошибка базы данных',
  enabled: 'включен',
  enabled_plural: 'включены',
  disabled: 'выключен',
  disabled_plural: 'выключены',
  notAdminError: 'Необходимы права администратора',
  today: 'Сегодня',
  yesterday: 'Вчера',
  lisa: {
    listening: 'Слушаю',
  },
  config: {
    channels: {
      title: 'Каналы',
      all: 'Все каналы',
      enabledList: 'Включенные каналы',
      count: 'Количество новых каналов',
      noMain: 'Нет основного канала',
      main: 'Основной канал: {{channel}} _{{id}}_',
      cantFindInDB: 'Не удалось найти канал в базе данных',
      cantFindInDiscord: 'Не удалось найти канал в Discord',
      newMain: 'Новый основной канал: {{channel}} _{{id}}_',
      stateChange: 'Канал {{channel}} _{{id}}_ **{{state}}**',
      enabledAll: 'Все каналы находящиеся в БД **{{state}}**',
    },
    prefix: {
      server: `Префикс сервера: {{prefix}}"`,
      oneSymbol: 'Префикс должен состоять из одного символа',
      changedTo: 'Префикс сервера изменён на: "{{prefix}}"',
    },
    initComplete: 'Инициализация завершена',
    wrongParams: 'Неверная команда или параметр для команды `config`',
  },
  lang: {
    changed: 'Язык изменён',
    wrongLang: 'Язык указан не верно',
    wrongParams: 'Неверные параметры или язык',
  },
  preset: {},
  external: {
    notAvailable: 'Команда временно не доступна',
    processingError: 'Функционал доступен, но по каким-то причинам произошла ошибка',
  },
  help: {
    lang: `
      \`{{p}}lang <langCode> [server/rater/serverRater]\`
      Список доступных языков: \`${Object.values(Language).join(', ')}\``,
  },
};
