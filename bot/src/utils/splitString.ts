import { Logger } from '@/controllers/logger';

export const splitString = (str: string, length: number): string[] => {
  if (length < 1) throw new Error('Length must be greater than zero.');

  let result: string[] = [];
  let currentPart = '';

  for (let word of str.split(' ')) {
    if (currentPart.length + word.length + 1 <= length) {
      currentPart += (currentPart.length > 0 ? ' ' : '') + word;
    } else {
      if (currentPart.length > 0) {
        result.push(currentPart);
      } else
        while (word.length > length) {
          result.push(word.substring(0, length));
          word = word.substring(length);
        }
      currentPart = '';
    }
  }

  result.push(currentPart);

  return result;
};

export const splitStringArray = (strArr: string[], maxLength: number): string[] => {
  if (maxLength < 1) throw new Error('Length must be greater than zero.');

  let result: string[] = [];
  let currentAgg = '';
  const arr = [...strArr];

  for (let part of arr) {
    if (currentAgg.length + part.length <= maxLength) {
      currentAgg += part;
    } else {
      if (currentAgg.length > 0) {
        result.push(currentAgg);
        currentAgg = part;
      }

      if (part.length > maxLength) {
        // Read flag, should not happen, but just in case
        Logger.warn(
          'Part length exceeds specified length',
          `Part length: ${part.length}; Max length: ${maxLength};`,
          'splitStringArray',
        );
        while (part.length > maxLength) {
          result.push(part.substring(0, maxLength));
          part = part.substring(maxLength);
        }
        currentAgg = part;
      }
    }
  }

  result.push(currentAgg);

  return result;
};
