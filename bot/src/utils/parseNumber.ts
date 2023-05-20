// TODO: Should it parse negative numbers?
export const parseNumber = (str: string): number | null => {
  if (!str || typeof str !== 'string') {
    return null;
  }

  const cleanedStr = str.replace(/_/g, '').replace(/,/g, '.').toLowerCase();

  if (/^\d+(\.\d+)?$/.test(cleanedStr)) {
    return parseFloat(cleanedStr);
  } else if (/^\d+(\.\d+)?k$/.test(cleanedStr)) {
    const numStr = cleanedStr.slice(0, -1);
    return parseFloat(numStr) * 1000;
  } else if (/^\d+(\.\d+)?m$/.test(cleanedStr) || /^\d+(\.\d+)?kk$/.test(cleanedStr)) {
    const numStr = cleanedStr.slice(0, -1);
    return parseFloat(numStr) * 1000 * 1000;
  } else {
    return null;
  }
};
