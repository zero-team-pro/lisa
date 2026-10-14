# Optional OpenAI support

This integration is maintained for compatibility. It is separate from the Nexus
worker and does not use Codex's subscription or model configuration.

## Models and API contracts

Verified against official OpenAI documentation on 2026-10-15:

| Workload                    | Model                 | Parameters                                                             |
| --------------------------- | --------------------- | ---------------------------------------------------------------------- |
| Chat and function execution | `gpt-6-sol`           | Chat Completions, `reasoning_effort: none`, Standard tier              |
| Select a minimal tool set   | `gpt-6-luna`          | Chat Completions, `reasoning_effort: none`, JSON output, Standard tier |
| `/img`                      | `gpt-image-2.5-flare` | Image API, one 1024×1024 PNG, medium quality                           |

Sol preserves the main chat role; Luna preserves the cheaper routing role.
Both support Chat Completions function calling with reasoning disabled.
GPT-6.1 Sol and Astra require Responses for tool calling, so they are deliberately
excluded from this Chat Completions integration. Moving to Responses is a separate
migration, rather than silently changing the conversation/tool execution contract.

Only Sol and Luna are selectable. Existing saved model names outside this list
fall back to Sol for chat and Luna for routing; database records are not rewritten.
No database migration or new environment variable is required. The OpenAI SDK
is pinned in `bot/package.json` and `bot/yarn.lock`.

The `setAIModel` tool exposes the same model list as the runtime and can change
chat model, routing model, tool enablement, and output-token limit. Null leaves a
field unchanged; `default` resets a model or token limit. A change applies to the
next request. When tools are disabled, re-enabling them requires changing the
owner configuration outside the AI conversation. There is no direct
`/setAIModel` messenger command.

## Configuration and billing

`OPENAI_API_KEY` is optional. Without it the Telegram worker starts normally;
generation requires a configured key and a positive Lisa AI balance. No provider
request is made by initialization or the local test suite.

Lisa's `AIOwner.balance` is an internal USD ledger, not the OpenAI account's
credit balance. New owners retain the existing $0.01 internal starting balance;
this does not add funds to the provider account. An empty provider balance will
still reject generation even if Lisa's ledger is positive. Balance and transfer
commands operate on Lisa's ledger. This update neither funds an account nor
modifies existing balances.

Costs use provider-reported usage and Standard token rates, with the existing
30% Lisa commission. Text billing includes cached input, cache writes when
reported, and the long-context multiplier above 272,000 input tokens. Image
billing uses input text/image tokens and output image tokens; the old DALL·E
flat per-image fee is removed. PNG bytes come from `b64_json` and are sent as a
buffer, rather than treated as an image URL.

The local ledger is an estimate, not an OpenAI invoice. Pricing changes,
unreported cache details, regional premiums, and concurrent requests can make
it differ from provider billing. Existing charging occurs after delivery; this
change does not introduce balance reservations or transactional charging.
Missing image bytes or usage fails explicitly instead of guessing a cost.

## Offline checks

```bash
# Repository root; tests mock the SDK and do not load .env
make check
```

Regression tests cover request models and parameters, function-call follow-up,
plain chat with tools disabled, missing credentials, zero internal balance,
provider failures, PNG decoding, model-setting validation, and usage pricing.
They make no paid OpenAI requests. Live access and model availability for a
particular provider account remain unverified until an explicitly authorized
live test with funded credentials.

## Sources

- [GPT-6 Sol](https://developers.openai.com/api/docs/models/gpt-6-sol)
- [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [GPT-6.1 Sol compatibility](https://developers.openai.com/api/docs/models/gpt-6.1-sol)
- [Image generation](https://developers.openai.com/api/docs/guides/image-generation)
- [GPT Image 2.5 Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare)
- [Standard pricing](https://developers.openai.com/api/docs/pricing)
- [Prompt cache accounting](https://developers.openai.com/api/docs/guides/prompt-caching)
