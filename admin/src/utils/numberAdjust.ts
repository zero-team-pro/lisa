export const numberAdjust = (memberCount: number | undefined) => {
  if (!memberCount) {
    return '?';
  }
  return memberCount > 999 ? `${Math.floor(memberCount / 1000)}k` : memberCount;
};
