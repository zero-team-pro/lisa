export const parseNumber = (str: string): number | null => {
  const cleanedStr = str.replace(/_/g, '').toLowerCase();

  if (/^\d+$/.test(cleanedStr)) {
    return parseFloat(cleanedStr);
  } else if (/^\d+k$/.test(cleanedStr)) {
    const numStr = cleanedStr.slice(0, -1);
    return parseFloat(numStr) * 1000;
  } else if (/^\d+m$/.test(cleanedStr) || /^\d+kk$/.test(cleanedStr)) {
    const numStr = cleanedStr.slice(0, -1);
    return parseFloat(numStr) * 1000 * 1000;
  } else {
    return null;
  }
};
