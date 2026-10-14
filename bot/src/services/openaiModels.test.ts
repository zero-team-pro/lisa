import { describe, expect, test } from '@jest/globals';
import { CHAT_MODELS, chatCost, imageCost } from './openaiModels';

describe('provider token cost estimates', () => {
  test('cache hits and writes have distinct rates', () => {
    expect(
      chatCost(
        {
          prompt_tokens: 1000,
          completion_tokens: 100,
          prompt_tokens_details: { cached_tokens: 400, cache_write_tokens: 200 },
        },
        CHAT_MODELS.sol,
      ),
    ).toBeCloseTo(0.00238, 10);
  });
  test('long context changes whole-request input and output rates only above threshold', () => {
    expect(chatCost({ prompt_tokens: 272_000, completion_tokens: 100 }, CHAT_MODELS.luna)).toBeCloseTo(0.02725, 10);
    expect(chatCost({ prompt_tokens: 272_001, completion_tokens: 100 }, CHAT_MODELS.luna)).toBeCloseTo(0.0544752, 10);
  });
  test('image billing uses different text, image-input and image-output rates', () => {
    expect(
      imageCost({
        input_tokens: 150,
        input_tokens_details: { text_tokens: 100, image_tokens: 50 },
        output_tokens: 200,
      }),
    ).toBeCloseTo(0.0069, 10);
  });
});
