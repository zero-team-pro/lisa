import { translationEnglish } from './en';

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
  help: {
    lang: 'TBD: help lang',
  },
  lisa: {
    listening: 'Слушаю',
  },
  config: {
    channels: {
      title: 'Каналы',
      stateChange: 'Канал {{channel}} _{{id}}_ **{{state}}**',
      enabledAll: 'Все каналы находящиеся в БД **{{state}}**',
    },
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
};
