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

export const escapeCharacters = (content: string) => {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return ESCAPE_CHARACTER_LIST.reduce((text, character) => {
    const regexp = new RegExp(`\\${character}`, 'g');
    return text.replace(regexp, `\\${character}`);
  }, content);
};
