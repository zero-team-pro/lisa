// tiktok-capture-v1. Keep behavior aligned with the versioned Nexus routing fixtures.
export interface NexusTaskOperation {
  kind: 'tiktok.capture';
  version: 1;
  routingVersion: 1;
  url: string;
  note: string;
}
export interface NexusCaptureResult {
  libraryId: string | null;
  state: 'saved' | 'existing' | 'link_only' | 'none';
  reasonCode: string | null;
}
interface RoutingInput {
  authorized: boolean;
  entry: string;
  text: string;
  entities?: Array<{ type: string; offset: number; length: number; url?: string }>;
  botUsername?: string | null;
}
export const CAPTURE_CAPABILITY = 'tiktok.capture.v1';
export const ROUTING_VERSION = 1;
const HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vt.tiktok.com', 'vm.tiktok.com']);
const SHORT = new Set(['vt.tiktok.com', 'vm.tiktok.com']);
const REASONS = new Set([
  'network',
  'timeout',
  'busy',
  'login_required',
  'unsupported',
  'unavailable',
  'size_limit',
  'invalid_media',
  'dependency_missing',
  'configuration',
  'internal',
]);

export class CaptureContractError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CaptureContractError';
  }
}
const fail = (message) => {
  throw new CaptureContractError(message);
};
function keys(value: any, expected: string[]) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !expected.includes(key)) ||
    expected.some((key) => !Object.hasOwn(value, key))
  )
    fail('Unexpected or missing contract fields');
}
export function validateCaptureUrl(value) {
  if (typeof value !== 'string' || !value.length || value.length > 2048 || /\s/.test(value))
    fail('Invalid URL length or whitespace');
  let url;
  try {
    url = new URL(value);
  } catch {
    fail('Invalid URL');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !HOSTS.has(url.hostname))
    fail('Expected an HTTPS TikTok URL without credentials or custom port');
  if (SHORT.has(url.hostname)) {
    if (!/^\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) fail('Invalid TikTok short link');
  } else if (!/^\/@[^/]+\/video\/\d+\/?$/.test(url.pathname)) fail('Only single TikTok video links are supported');
  return value;
}
export function validateOperation(value: unknown): NexusTaskOperation | null {
  const input = value as any;
  if (value === undefined || value === null) return null;
  keys(input, ['kind', 'version', 'routingVersion', 'url', 'note']);
  if (input.kind !== 'tiktok.capture' || input.version !== 1 || input.routingVersion !== ROUTING_VERSION)
    fail('Unsupported operation or routing version');
  validateCaptureUrl(input.url);
  if (typeof input.note !== 'string' || input.note.length > 8000) fail('Invalid note');
  return { kind: input.kind, version: 1, routingVersion: ROUTING_VERSION, url: input.url, note: input.note };
}
export function validateCaptureResult(value: unknown, outcome: string): NexusCaptureResult {
  const input = value as any;
  keys(input, ['libraryId', 'state', 'reasonCode']);
  const validId = typeof input.libraryId === 'string' && /^\d{5}$/.test(input.libraryId) && input.libraryId !== '00000';
  if (outcome === 'completed') {
    if (!validId || !['saved', 'existing'].includes(input.state) || input.reasonCode !== null)
      fail('Invalid successful capture result');
  } else if (['retry', 'failed'].includes(outcome)) {
    if (
      !REASONS.has(input.reasonCode) ||
      !((input.state === 'link_only' && validId) || (input.state === 'none' && input.libraryId === null))
    )
      fail('Invalid failed capture result');
  } else fail('Unsupported result outcome');
  return { libraryId: input.libraryId, state: input.state, reasonCode: input.reasonCode };
}
function isTikTok(value) {
  try {
    return HOSTS.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

// Authorization is supplied only by the trusted Lisa authorization layer.
// entry is supplied by the actual command/mode dispatcher, never by message text.
export function routeNexusInput({ authorized, entry, text, entities = [], botUsername = null }: RoutingInput) {
  if (authorized !== true || !['command', 'mode'].includes(entry)) return { route: 'outside' };
  if (typeof text !== 'string') return { route: 'reject', reason: 'empty' };
  let offset = 0;
  if (entry === 'command') {
    const command = text.match(/^\/nexus(?:@([a-z0-9_]+))?(?:\s+|$)/i);
    if (!command || (command[1] && (!botUsername || command[1].toLowerCase() !== botUsername.toLowerCase())))
      return { route: 'outside' };
    offset = command[0].length;
  } else if (text.trimStart().startsWith('/')) return { route: 'outside' };
  const payload = text.slice(offset);
  const first = /[^\s]/.exec(payload);
  if (!first) return { route: 'reject', reason: 'empty' };
  const start = offset + first.index;
  const endLine = text.indexOf('\n', start);
  const end = endLine === -1 ? text.length : endLine;
  const line = text.slice(start, end).trimEnd();
  const urls = [...text.slice(offset).matchAll(/https?:\/\/[^\s]+/g)].map((match) => ({
    offset: offset + match.index,
    length: match[0].length,
    url: match[0],
  }));
  for (const entity of entities) {
    if (!['url', 'text_link'].includes(entity.type)) continue;
    if (
      !Number.isSafeInteger(entity.offset) ||
      !Number.isSafeInteger(entity.length) ||
      entity.offset < offset ||
      entity.length <= 0 ||
      entity.offset + entity.length > text.length
    )
      return { route: 'reject', reason: 'invalid_entity' };
    const url = entity.type === 'text_link' ? entity.url : text.slice(entity.offset, entity.offset + entity.length);
    const same = urls.findIndex((item) => item.offset === entity.offset && item.length === entity.length);
    const item = { offset: entity.offset, length: entity.length, url };
    if (same >= 0) urls[same] = item;
    else urls.push(item);
  }
  const firstLink = urls.find((item) => item.offset === start);
  if (!firstLink || !isTikTok(firstLink.url)) return { route: 'general', profile: 'lisa_task' };
  if (urls.length > 1) return { route: 'reject', reason: 'multiple_links' };
  if (firstLink.length !== line.length) return { route: 'general', profile: 'lisa_task' };
  const note = endLine === -1 ? '' : text.slice(endLine + 1).trim();
  try {
    const operation = validateOperation({
      kind: 'tiktok.capture',
      version: 1,
      routingVersion: ROUTING_VERSION,
      url: firstLink.url,
      note,
    });
    return { route: CAPTURE_CAPABILITY, operation };
  } catch (error) {
    return { route: 'reject', reason: note.length > 8000 ? 'note_too_long' : 'unsupported_link' };
  }
}

export const validateOperationCapabilities = (value: unknown): string[] => {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.length > 16 ||
    value.some((item) => item !== CAPTURE_CAPABILITY) ||
    new Set(value).size !== value.length
  ) {
    throw new CaptureContractError('supportedOperations must contain unique supported capability names');
  }
  return value;
};
