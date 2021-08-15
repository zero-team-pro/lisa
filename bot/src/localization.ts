import { Language } from './constants';

export const localization = {
  [Language.English]: {
    commandNotFound: 'Command not found',
    wrongParams: 'Wrong params',
    none: 'none',
    dbError: 'DB error',
    enabled: 'enabled',
    enabled_plural: 'enabled',
    disabled: 'disabled',
    disabled_plural: 'disabled',
    notAdminError: 'Administrator rights required',
    help: {
      config: 'TBD: help config',
      lang: 'TBD: help lang',
      preset: 'TBD: help preset',
    },
    lisa: {
      listening: 'Listening',
    },
    config: {
      channels: {
        title: 'Channels',
        all: 'All channels',
        enabledList: 'Enabled channels',
        count: 'New channels count',
        noMain: 'No main channel',
        main: 'Main channel: {{channel}} _{{id}}_',
        cantFindInDB: "Can't find channel in DB",
        cantFindInDiscord: "Can't find channel in Discord",
        newMain: 'New main channel: {{channel}} _{{id}}_',
        stateChange: 'Channel {{channel}} _{{id}}_ **{{state}}**',
        enabledAll: 'All channels in DB **{{state}}**',
      },
      prefix: {
        server: `This server prefix: {{prefix}}"`,
        oneSymbol: 'Server prefix should be just one symbol.',
        changedTo: 'Server prefix changed to: "{{prefix}}"',
      },
      initComplete: 'Init complete',
      wrongParams: 'Wrong config command/params',
    },
    lang: {
      changed: 'Language changed',
      wrongLang: 'Wrong lang',
      wrongParams: 'Wrong params or lang',
    },
    preset: {
      userPresetTitle: 'Your preset list',
      serverPresetTitle: 'Server preset list',
      statsError: 'Stats check error',
      userCreatedTitle: 'Preset created',
      serverCreatedTitle: 'Preset created for server',
      notFound: 'Preset not found',
      deleted: 'Preset deleted',
    },
    external: {
      notAvailable: 'This command not available for some reason',
      processingError: 'Error while processing external command',
    },
  },
  [Language.Russian]: {
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
  },
};
