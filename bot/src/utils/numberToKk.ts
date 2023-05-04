export const numberToKk = (num: number) => {
  if (!num || typeof num !== 'number') {
    return 'Unknown';
  }

  if (num < 1_000) {
    return num.toString();
  }

  let cur = num;
  let kCount = 0;

  while (cur >= 1_000) {
    cur /= 1_000;
    kCount++;
  }

  const kString = Array.from({ length: kCount }, () => 'k').join('');

  return `${cur < 100 ? cur.toFixed(2) : cur}${kString}`;
};
