// Standard USD/token rates checked 2026-10-15:
// https://developers.openai.com/api/docs/pricing
export const CHAT_MODELS = { sol: 'gpt-6-sol', luna: 'gpt-6-luna' } as const;
export const IMAGE_MODEL = 'gpt-image-2.5-flare';
type ChatModel = (typeof CHAT_MODELS)[keyof typeof CHAT_MODELS];
const M = 1_000_000;

interface ChatUsage {
  prompt_tokens: number;
  completion_tokens: number;
  prompt_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
}

export function chatCost(usage: ChatUsage, model: ChatModel): number {
  const input = model === CHAT_MODELS.sol ? 2 / M : 0.1 / M;
  const output = model === CHAT_MODELS.sol ? 10 / M : 0.5 / M;
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const writes = usage.prompt_tokens_details?.cache_write_tokens ?? 0;
  const ordinary = Math.max(0, usage.prompt_tokens - cached - writes);
  const long = usage.prompt_tokens > 272_000;
  return (
    (ordinary * input + cached * input * 0.1 + writes * input * 1.25) * (long ? 2 : 1) +
    usage.completion_tokens * output * (long ? 1.5 : 1)
  );
}

interface ImageUsage {
  input_tokens: number;
  output_tokens: number;
  input_tokens_details: { text_tokens: number; image_tokens: number };
}

// /img is text-to-image only; no image inputs or per-image flat fee.
export function imageCost(usage: ImageUsage): number {
  return (
    (usage.input_tokens_details.text_tokens * 5 +
      usage.input_tokens_details.image_tokens * 8 +
      usage.output_tokens * 30) /
    M
  );
}
