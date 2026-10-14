# Message formatting: dev acceptance

Status: ready for the owner to start the dev server; live checks not yet run.
Use this branch's complete gateway/Telegram/Discord build and updated lockfile.
No new environment key, database migration or data seed is introduced by this
refactor. Existing dev bot credentials, accounts and ordinary authorization
setup are still required.

## Isolation

Use a dedicated dev Telegram bot and dev Discord bot/server. Gateway and bot
consumers must belong to the same dev bridge/database environment. The production
Nexus LaunchAgent continues to use production; do not repoint or restart it for
these checks. To test the Nexus result path, submit/claim/complete a fixture
through the **dev** `/tasks/v1` API with the existing documented contract, or
run a separately configured manual dev worker. Do not assume the production
poller will pick up a dev task. Use a linked private `globalAdmin` for authorized
Nexus cases; ordinary/unlinked users and groups must continue to be denied.

## Acceptance cases

| Case                | Action                                                                                                                                                | Expected                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Existing commands   | Run help/list, rating/stats, AI balance and usage errors for gift/sendMoney/rate; do not make real transfers                                          | One builder, readable bold/italic/code, no backslashes or object strings                          |
| Telegram AI         | Ask for heading, bold/italic/strike, quote, ordered/task lists, a table, a formatted HTTP link and inline/fenced code                                 | Visible content preserved, no `undefinedProcessor`, working links and code punctuation            |
| Long Telegram reply | Ask for a numbered response and a long code block exceeding 4096 units                                                                                | Ordered readable chunks, no missing boundary words, intact Unicode and per-chunk formatting       |
| Incoming formatting | Send formatted code and a hidden link, then reply to a formatted AI answer asking about its link destination                                          | AI receives code/text and actual hidden URL, not just link label; command recognition still works |
| CMS                 | Post a dev article with punctuation/backslashes/emoji in title and body, combined marks, inline code and multiple paragraphs; repeat with a long body | Correct title/body entities and chunks; article API returns first sent message ID                 |
| Nexus fixture       | Complete an authorized dev task with Markdown summary including a local file link and a formatted HTTP link                                           | Formatted summary; local path stays readable, HTTP link works, existing ID/metrics/footer remain  |
| Plain notify        | Send `*literal* a_b.c [label](path) \\` through dev `/notify/v1`                                                                                      | Exact plain text; no Markdown interpretation                                                      |
| Discord             | Run shared commands and ask AI for bold/italic/strike/link/quote/code; repeat with >2000 serialized characters                                        | Discord syntax, bounded chunks; generated `@everyone` / mentions do not ping                      |
| Denied Nexus        | Try an ordinary user, unlinked account and group; try missing/invalid API bearer credentials                                                          | Existing denials; no execution and no formatted result leak                                       |

Use usage/error paths to inspect monetary commands without changing balances.
For giveaways, inspect a disposable fixture notification before exercising any
prize delivery, which has its own side effects.

## Error behavior

Automated tests inject a Telegram entity-parse `400` on a later chunk and verify
only that rejected chunk is retried, with its text intact. They also verify no
immediate resend on network/403/429/unrelated 400 errors. Do not deliberately
break the live dev bot's connectivity to reproduce ambiguous-delivery cases.

Capture actual messages and relevant dev error logs. Accept only after both
messengers render correctly and the API/security cases hold. Do not release to
production based solely on local renderer tests.
