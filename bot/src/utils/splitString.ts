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

export const splitStringArray = (strArr: string[], length: number): string[] => {
  if (length < 1) throw new Error('Length must be greater than zero.');

  let result: string[] = [];
  let currentPart = '';
  const arr = [...strArr];

  for (let part of arr) {
    if (currentPart.length + part.length <= length) {
      currentPart += part;
    } else {
      if (currentPart.length > 0) {
        result.push(currentPart);
      } else
        while (part.length > length) {
          result.push(part.substring(0, length));
          part = part.substring(length);
        }
      currentPart = '';
    }
  }

  result.push(currentPart);

  return result;
};
