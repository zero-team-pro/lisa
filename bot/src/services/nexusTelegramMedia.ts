import type { Message } from 'telegraf/types';

export type NexusMediaKind = 'photo' | 'document' | 'audio' | 'voice' | 'video' | 'animation' | 'video_note';
export interface NexusTelegramMedia {
  kind: NexusMediaKind;
  fileId: string;
  uniqueId: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  sourceMessageId: number;
  provenance: 'current' | 'quoted' | 'history';
}

type FileShape = {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_name?: string;
  mime_type?: string;
  width?: number;
  height?: number;
};
type MediaMessage = Partial<Record<Exclude<NexusMediaKind, 'photo'>, FileShape>> & {
  photo?: FileShape[];
  message_id: number;
};
const defaults: Record<NexusMediaKind, [string, string]> = {
  photo: ['photo.jpg', 'image/jpeg'],
  document: ['document', 'application/octet-stream'],
  audio: ['audio', 'application/octet-stream'],
  voice: ['voice.ogg', 'audio/ogg'],
  video: ['video.mp4', 'video/mp4'],
  animation: ['animation.mp4', 'video/mp4'],
  video_note: ['video-note.mp4', 'video/mp4'],
};

// File IDs are opaque transport identifiers. Never call getFileLink here or
// persist a URL: Telegram file URLs contain the bot credential.
export const extractNexusMedia = (
  message: Message | unknown,
  provenance: NexusTelegramMedia['provenance'] = 'current',
): NexusTelegramMedia[] => {
  if (!message || typeof message !== 'object') return [];
  const source = message as MediaMessage;
  const kind: NexusMediaKind | undefined = source.photo?.length
    ? 'photo'
    : (['animation', 'document', 'audio', 'voice', 'video', 'video_note'] as const).find((key) => source[key]);
  if (!kind) return [];
  const file =
    kind === 'photo'
      ? [...source.photo].sort(
          (a, b) =>
            (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0) ||
            (b.file_size || 0) - (a.file_size || 0),
        )[0]
      : source[kind];
  if (!file || typeof file.file_id !== 'string' || typeof file.file_unique_id !== 'string')
    throw new Error('Invalid Telegram file descriptor');
  const [fallbackName, fallbackMime] = defaults[kind];
  return [
    {
      kind,
      fileId: file.file_id,
      uniqueId: file.file_unique_id,
      name: (file.file_name || fallbackName).slice(0, 200),
      mimeType: file.mime_type || fallbackMime,
      sizeBytes: Number.isSafeInteger(file.file_size) && file.file_size >= 0 ? file.file_size : null,
      sourceMessageId: source.message_id,
      provenance,
    },
  ];
};

export const unsupportedNexusPayload = (message: unknown): boolean =>
  Boolean(
    message &&
      typeof message === 'object' &&
      ['sticker', 'contact', 'location', 'venue', 'poll', 'dice', 'game', 'invoice'].some((key) => key in message),
  );

export const nexusMediaWithQuoted = (message: { reply_to_message?: unknown } | unknown): NexusTelegramMedia[] => [
  ...extractNexusMedia(message),
  ...extractNexusMedia((message as { reply_to_message?: unknown })?.reply_to_message, 'quoted'),
];

export const NEXUS_FILE_ONLY_TEXT = 'Определи, что находится во вложенных файлах, и кратко опиши содержимое.';

const INTAKE_ERRORS = {
  count: 'Можно приложить не больше 10 файлов к одной задаче Nexus.',
  file_size: 'Файл превышает лимит Nexus в 20 МБ. Отправь файл меньшего размера.',
  total_size: 'Вложения превышают общий лимит Nexus в 50 МБ.',
  expired: 'Срок хранения вложения истёк. Отправь файл ещё раз.',
  unreadable: 'Не удалось прочитать вложение Nexus. Проверь файл и отправь его ещё раз.',
  unavailable: 'Вложение Nexus недоступно. Отправь файл ещё раз.',
  timeout: 'Загрузка вложения Nexus прервана по времени. Отправь файл ещё раз.',
  storage: 'Хранилище вложений Nexus временно недоступно. Попробуй позже.',
};
export class NexusTelegramFileError extends Error {
  constructor(public code: keyof typeof INTAKE_ERRORS) {
    super(INTAKE_ERRORS[code]);
  }
}
