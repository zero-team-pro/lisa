export const progressBar = (
  current: number,
  total: number,
  size: number = 20,
  line: string = '▬',
  slider: string = '🔘',
) => {
  const percentage = current / total;
  const progress = Math.round(size * percentage);
  const emptyProgress = size - progress;
  const progressText = line.repeat(progress).replace(/.$/, slider);
  const emptyProgressText = line.repeat(emptyProgress);

  return progressText + emptyProgressText;
};
