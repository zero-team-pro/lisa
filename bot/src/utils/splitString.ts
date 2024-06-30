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
        currentPart = '';
      }
      while (word.length > length) {
        result.push(word.substring(0, length));
        word = word.substring(length);
      }
      currentPart = word;
    }
  }

  result.push(currentPart);

  return result;
};
