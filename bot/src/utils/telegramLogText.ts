// Link tokens prove account ownership; Nexus instructions can contain private
// vault data. Both have a durable owning store and must not enter generic logs.
export const telegramLogText = (text: string): string =>
  /^\/(?:linkme|nexus)(?:@[a-z0-9_]+)?(?:\s|$)/i.test(text) ? '[sensitive command redacted]' : text;
