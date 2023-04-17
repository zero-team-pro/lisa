export const formatBytes = (bytes?: number, decimals: number = 2, k: number = 1000) => {
  if (!bytes || typeof bytes !== 'number') {
    return 'Unknown';
  }

  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
