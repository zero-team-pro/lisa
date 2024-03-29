import { Node } from 'slate';

import { EditorText, EditorTextType } from '@/types';
import { escapeCharacters } from '@/utils/escapeCharacters';

/***
 * Telegram formatting options
 * https://core.telegram.org/bots/api#formatting-options
 ***/

export const slateToTelegramMDV2 = (text: string) => {
  let content: EditorText[];
  try {
    content = JSON.parse(text);
  } catch (e) {
    throw e;
  }

  return content
    .map((node) => {
      let text;

      if (node?.type === EditorTextType.Paragraph && Array.isArray(node?.children)) {
        text = node.children
          .map((child) => {
            let childText = escapeCharacters(child?.text);

            if (child.bold) {
              childText = `*${childText}*`;
            }
            if (child.italic) {
              childText = `_${childText}_`;
            }
            if (child.underline) {
              childText = `__${childText}__`;
            }
            if (child.code) {
              childText = `\`${childText}\``;
            }

            return childText;
          })
          .join('');
      } else {
        text = Node.string(node);
      }

      return text;
    })
    .filter((node) => node)
    .join(`\n`);
};
