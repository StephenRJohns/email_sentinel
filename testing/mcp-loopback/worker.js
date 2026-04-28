// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.
//
// emAIl Sentinel MCP Loopback Worker
//
// A deliberately misbehaving MCP server for exercising every code-path branch
// in McpServers.gs sendMcpAlert_ without depending on a third-party MCP host.
//
// Speaks just enough JSON-RPC 2.0 / Streamable HTTP to look like a real MCP
// server when emAIl Sentinel POSTs tools/call. The response shape is selected
// by the `mode` query string on the request URL. See README.md in this
// directory for the full mode → expected-activity-log mapping.
//
// Deploy with `wrangler deploy` from this directory; see README.md.

const MODES = [
  'success', 'sse', 'isError', 'isErrorSse', 'jsonrpcError',
  'http401', 'http500', 'empty', 'malformedJson'
];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'success';

    if (request.method === 'GET') {
      return new Response(renderIndex(mode), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    let payload = {};
    try { payload = await request.json(); } catch (_) { /* ignore */ }
    const id = payload.id || 1;
    const toolName = (payload.params && payload.params.name) || '(no name)';
    const args = (payload.params && payload.params.arguments) || {};

    const successBody = {
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          { type: 'text', text: 'Loopback success — tool=' + toolName +
                                 ' args=' + JSON.stringify(args) }
        ],
        isError: false
      }
    };

    const isErrorBody = {
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          { type: 'text',
            text: 'Loopback simulated tool failure: project_id missing or invalid' }
        ],
        isError: true
      }
    };

    const jsonrpcErrorBody = {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32602,
        message: 'Loopback simulated JSON-RPC error: invalid params'
      }
    };

    switch (mode) {
      case 'success':       return jsonResp(successBody);
      case 'sse':           return sseResp(successBody);
      case 'isError':       return jsonResp(isErrorBody);
      case 'isErrorSse':    return sseResp(isErrorBody);
      case 'jsonrpcError':  return jsonResp(jsonrpcErrorBody);
      case 'http401':
        return new Response('Unauthorized — loopback simulated 401',
          { status: 401, headers: { 'Content-Type': 'text/plain' } });
      case 'http500':
        return new Response('Internal Server Error — loopback simulated 500',
          { status: 500, headers: { 'Content-Type': 'text/plain' } });
      case 'empty':
        return new Response('',
          { status: 200, headers: { 'Content-Type': 'text/plain' } });
      case 'malformedJson':
        return new Response('{"this is not valid json',
          { status: 200, headers: { 'Content-Type': 'application/json' } });
      default:
        return new Response(
          'Unknown mode "' + mode + '". Valid modes: ' + MODES.join(', '),
          { status: 400, headers: { 'Content-Type': 'text/plain' } });
    }
  }
};

function jsonResp(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function sseResp(body) {
  // MCP Streamable HTTP SSE frame: a single message event whose data line
  // carries the JSON-RPC response body. Asana V2 returns this shape.
  const sse = 'event: message\ndata: ' + JSON.stringify(body) + '\n\n';
  return new Response(sse, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' }
  });
}

function renderIndex(currentMode) {
  const rows = MODES.map(m =>
    '<li><code>?mode=' + m + '</code>' + (m === currentMode ? ' (current)' : '') + '</li>'
  ).join('');
  return [
    '<!DOCTYPE html>',
    '<html><head><title>emAIl Sentinel MCP Loopback</title>',
    '<style>body{font-family:system-ui,sans-serif;max-width:780px;margin:2em auto;padding:0 1em;color:#222}',
    'code{background:#f4f4f4;padding:2px 6px;border-radius:3px}</style>',
    '</head><body>',
    '<h1>emAIl Sentinel MCP Loopback</h1>',
    '<p>Test fixture for the <a href="https://github.com/StephenRJohns/email_sentinel">emAIl Sentinel</a> MCP dispatcher. POST JSON-RPC 2.0 <code>tools/call</code> here with one of these mode flags:</p>',
    '<ul>' + rows + '</ul>',
    '<p>POSTs without <code>?mode=</code> default to <code>success</code>. See <code>testing/mcp-loopback/README.md</code> in the repo for the per-mode expected activity-log lines.</p>',
    '</body></html>'
  ].join('\n');
}
