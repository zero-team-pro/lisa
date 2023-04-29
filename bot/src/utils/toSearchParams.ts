export const toSearchParams = (params: Record<string, string | number>) => {
  const arr = Object.keys(params).map((key) => [key, `${params[key]}`]);
  const searchParams = new URLSearchParams(arr);

  return `?${searchParams.toString()}`;
};
