const ESCAPE_CHARACTER_LIST = [
  '_',
  '*',
  '[',
  ']',
  '(',
  ')',
  '~',
  '`',
  '>',
  '#',
  '+',
  '-',
  '=',
  '|',
  '{',
  '}',
  '.',
  '!',
];

/***
 * Telegram formatting options
 * https://core.telegram.org/bots/api#formatting-options
 ***/

export const escapeCharacters = (content: string, escapeList: string[] = ESCAPE_CHARACTER_LIST) => {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return escapeList.reduce((text, character) => {
    const regexp = new RegExp(`\\${character}`, 'g');
    return text.replace(regexp, `\\${character}`);
  }, content);
};
