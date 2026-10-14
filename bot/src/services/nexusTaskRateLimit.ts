// Keys come only from configured, authenticated credentials. Unknown tokens
// share one bucket, so random headers cannot grow an unbounded in-memory map.
export const createTaskRequestLimiter = () => {
  let windowStart = Date.now();
  const counts = new Map<string, number>();
  return (credentialHash: string | null, now = Date.now()): boolean => {
    if (now - windowStart >= 60_000 || now < windowStart) {
      windowStart = now;
      counts.clear();
    }
    const key = credentialHash || 'unauthenticated';
    const count = (counts.get(key) || 0) + 1;
    counts.set(key, count);
    return count <= (credentialHash ? 120 : 30);
  };
};
