# emAIl Sentinel MCP Loopback

A deliberately-misbehaving MCP server you can deploy to Cloudflare Workers (or any host that runs JavaScript) to exercise every code-path branch in `McpServers.gs sendMcpAlert_` without depending on a third-party MCP host. Lets you regression-test the dispatcher against:

- HTTP-level errors (401, 500)
- JSON-RPC envelope errors (`body.error`)
- MCP tool-level errors (`body.result.isError === true`)
- Streamable HTTP `text/event-stream` parsing (Asana V2 returns SSE in practice)
- "Swallow on non-JSON ack" path (empty bodies, malformed JSON)
- Plain success

## Why this exists

When debugging Asana V2 / MCP integrations we hit *silently swallowed* tool failures — the dispatcher logged `MCP alert sent to: <name>` even though the tool call had failed inside an SSE-wrapped `result.isError` envelope. That bug is fixed in `McpServers.gs`, but the fix has many branches and depends on a real MCP server's response shape, which is hard to deliberately misbehave. This loopback worker is the controllable test target.

## Modes

Append `?mode=<name>` to the worker URL. The mode flag is picked from the query string on every request, so a single deployment serves all modes — you configure one MCP server entry per mode in emAIl Sentinel Settings, each pointing at the same worker URL with a different `?mode=` suffix.

| Mode | HTTP status | Content-Type | Response shape |
|---|---|---|---|
| `success` (default) | 200 | application/json | JSON-RPC success result with tool name + args echoed in `content[].text` |
| `sse` | 200 | text/event-stream | Same success result inside a `event: message\ndata: {…}\n\n` SSE frame |
| `isError` | 200 | application/json | `body.result.isError = true` with detail text in `content[].text` |
| `isErrorSse` | 200 | text/event-stream | Same `isError` result inside an SSE frame |
| `jsonrpcError` | 200 | application/json | `body.error` envelope, code `-32602` |
| `http401` | 401 | text/plain | "Unauthorized — loopback simulated 401" |
| `http500` | 500 | text/plain | "Internal Server Error — loopback simulated 500" |
| `empty` | 200 | text/plain | Empty body |
| `malformedJson` | 200 | application/json | Garbage `{"this is not valid json` (no closing brace) |

## Deploy to Cloudflare Workers

One-time setup:

```bash
npm install -g wrangler
wrangler login   # opens your browser to authorize the CLI
```

Deploy from this directory:

```bash
cd testing/mcp-loopback
wrangler deploy
```

Wrangler prints the deployed URL, e.g. `https://email-sentinel-mcp-loopback.<your-account>.workers.dev`. Save that URL — you'll paste mode-specific variants of it into emAIl Sentinel Settings.

The Cloudflare Workers free tier covers 100,000 requests/day. This loopback uses one request per matched email, so test workloads are effectively free.

## Configure in emAIl Sentinel

In the add-on, open **Settings → External integrations → + Add external integration** and create one entry per mode you want to test. For each:

- **Name:** `Loopback <mode>` (e.g. `Loopback isError`)
- **Type:** `Custom MCP`
- **Endpoint:** `https://<your-worker-url>/?mode=<mode>`
- **Auth token:** any non-empty string (e.g. `Bearer test`); the loopback ignores the auth header entirely.
- **Tool name:** `loopback_test_tool`
- **Tool args template:** `{"subject":"{{subject}}","message":"{{message}}","from":"{{from}}","rule":"{{rule}}"}`

Tick the loopback server on a test rule and fire **Scan email now** with a matching email in the inbox. The activity log should show the line in the table below.

## Expected activity log per mode

Run a known-matching email against a rule that has the loopback server ticked. After **Scan email now**, the activity log should include exactly one of these lines (the rule name and server name will reflect what you configured):

| Mode | Expected activity log line |
|---|---|
| `success` | `MCP alert sent to: Loopback success` |
| `sse` | `MCP alert sent to: Loopback sse` |
| `isError` | `MCP alert to "Loopback isError" FAILED: MCP "Loopback isError" tool error: Loopback simulated tool failure: project_id missing or invalid` |
| `isErrorSse` | Same as `isError` (proves the SSE parser correctly feeds the `result.isError` checker) |
| `jsonrpcError` | `MCP alert to "Loopback jsonrpcError" FAILED: MCP "Loopback jsonrpcError" error: {"code":-32602,"message":"Loopback simulated JSON-RPC error: invalid params"}` |
| `http401` | `MCP alert to "Loopback http401" FAILED: MCP "Loopback http401" HTTP 401: Unauthorized — loopback simulated 401` |
| `http500` | `MCP alert to "Loopback http500" FAILED: MCP "Loopback http500" HTTP 500: Internal Server Error — loopback simulated 500` |
| `empty` | `MCP alert sent to: Loopback empty` |
| `malformedJson` | `MCP alert sent to: Loopback malformedJson` |

`empty` and `malformedJson` intentionally log "alert sent" — `sendMcpAlert_` treats non-JSON bodies as a successful ack, since some MCP servers respond with empty bodies or plain-text status lines on success. These two modes verify the swallow path doesn't false-positive *into* a thrown error; they're regression guards for the "non-JSON response bodies are acceptable" comment in `McpServers.gs`.

## Coverage matrix vs. real MCP

| Code path tested | Loopback covers it? | Real Asana V1 covers it? |
|---|---|---|
| HTTP non-2xx (401, 500) error path | ✅ via `http401` / `http500` | ⚠ depends on what Asana happens to return |
| JSON-RPC envelope error (`body.error`) | ✅ via `jsonrpcError` | ⚠ rare in practice |
| Tool-level error (`body.result.isError`) | ✅ via `isError` / `isErrorSse` | ⚠ requires deliberately bad input |
| Streamable HTTP SSE response parser | ✅ via `sse` / `isErrorSse` | ✅ Asana V2 returns SSE; V1 may or may not |
| "Non-JSON ack" swallow path | ✅ via `empty` / `malformedJson` | ⚠ unlikely from a real server |
| Real-world auth quirks | ❌ ignores auth | ✅ requires a real PAT / OAuth token |
| Real-world content-type variations | ❌ controlled set only | ✅ exactly what's in the wild |

So: use the loopback for code-path / regression coverage; use a real third-party MCP (Asana V1 until 2026-05-11, then a self-hosted MCP server) for integration sanity-checking. They're complementary, not redundant.

## Tearing down

`wrangler delete` from this directory removes the worker. Or leave it deployed — at zero traffic it costs nothing and is handy for the next time you touch `sendMcpAlert_`.
