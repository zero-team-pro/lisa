import { Contants, Language } from '../constants';

export const translationEnglish = {
  commandNotFound: 'Command not found',
  wrongParams: 'Wrong params',
  none: 'none',
  dbError: 'DB error',
  enabled: 'enabled',
  enabled_plural: 'enabled',
  disabled: 'disabled',
  disabled_plural: 'disabled',
  notAdminError: 'Administrator rights required',
  today: 'Today',
  yesterday: 'Yesterday',
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
  rater: {
    limitReached: 'Your reached your limit for rater calls today. Try tomorrow.',
    callsToday: 'Your rater calls limit today',
    title: 'Artifact Level: {{level}}',
  },
  external: {
    notAvailable: 'This command not available for some reason',
    processingError: 'Error while processing external command',
  },
  info: {
    raterTitle: 'Rater statistic',
    raterDescription: 'Rater statistic displays in UTC timezone since 00:00 time',
    raterToday: `Calls today: **{{calls}}**`,
    raterYesterday: `Calls yesterday: **{{calls}}**`,
  },
  helpBlock: {
    stats:
      '`stat` can be one of `hp`, `hp%`, `def`, `def%`, `atk`, `atk%`, `er` (Energy Recharge), ' +
      '`em` (Elemental Mastery), `phys` (Physical DMG), `elem` (Elemental DMG), `cr` (Crit Rate), ' +
      '`cd` (Crit Damage), `heal` (Healing Bonus).',
  },
  help: {
    title: 'Help',
    sectionList: 'List of help sections',
    notFound: 'Section in help pages not found',
    general: '`{{p}}help <helpSection>`',
    config: `
      \`{{p}}config [init/scan/prefix/mainChannel/channel]\`
      \`{{p}}config prefix <prefixSymbol>\`
      \`{{p}}config mainChannel <channelCode>\`
      \`{{p}}config channel [add/rm/all/none] <channelCode>\``,
    lang: `
      \`{{p}}lang <langCode> [server/rater/serverRater]\`
      List of available language codes: \`${Object.values(Language).join(', ')}\``,
    info: `
      \`{{p}}info [rater]\``,
    preset: `
      \`{{p}}preset [list/myList/serverList/add/serverAdd/rm/serverRm] <name> <...weights>\`,
      Create a preset called \`name\` to use when rating artifacts.
      If you want to check multiple artifacts with the same set of weights, you can use this command to create\
      a preset with the desired weights.
      \`weights\` will be used in the \`{{p}}rate\` command when the preset is used. \`weights\` should be in\
      the format \`<stat>=<value>\`, where \`value\` is a number between 0 and 1.
      {{helpBlock.stats}}
      **Example**
      \`{{p}}user preset healer hp=0.5 hp%=1 atk%=0\`
      \`{{p}}rate <image> healer\`
      \`{{p}}[user/server] preset delete <names>\`
      Delete the presets in \`names\` (separated by spaces).`,
    rate: `
      \`{{p}}rate <image/url> [preset] [lvl=<level>] <...weights>\`
      Rate an artifact against an optimal 5* artifact. Put the command and image in the same message.\
      Try to use a clear screenshot for the best results.
      If you are on Windows 10, you can use Shift Windows S, drag your cursor over the artifact stats and then paste it\
      on discord with Ctrl V.
      This bot will use default weights (see below) unless you specify your own or select a preset.\
      You can also specify the level you want to compare your artifact to.
      **Default weights**
      ATK%, DMG%, Crit - 1
      ATK, EM, Recharge – 0.5
      Everything else - 0
      **Parameters**
      \`image/url\`
      The image to be rated, either attached as a file or by putting the url in the message.\
      [Sample](${Contants.IMAGE_SAMPLE_URL})
      \`preset\`
      The preset selection of weights to use. See \`{{p}}presets\` for which presets are available, or \`{{p}}help\` for how to set your own.
      \`lvl\`
      The level of the artifact to compare against, from 0 to 20. Sometimes the auto-detection for level is wrong, use this to correct it.
      \`weights\`
      The weights to use for rating this artifact. Each weight is of the format \`<stat>=<value>\`, where \`value\` is a number between 0 and 1.
      {{helpBlock.stats}}
      **Examples**
      \`{{p}}rate <image> atk%=0 hp=1 er=0.5\`
      \`{{p}}rate <url> support lvl=4\``,
  },
};
