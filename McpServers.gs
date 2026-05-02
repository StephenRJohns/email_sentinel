// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * McpServers.gs — CRUD and HTTP dispatch for MCP server alert channels.
 *
 * MCP (Model Context Protocol) servers expose tools over HTTP using
 * JSON-RPC 2.0 (Streamable HTTP transport). emAIl Sentinel POSTs a
 * tools/call request to the configured endpoint when a matching rule fires.
 *
 * Each server config:
 *   {
 *     id:               string,   UUID
 *     name:             string,   e.g. "Demo MCP" or "Asana Marketing"
 *     type:             string,   "custom" | "teams" | "asana-rest" | "asana"
 *     endpoint:         string,   HTTPS URL of the MCP server
 *     authToken:        string,   Authorization header value, e.g. "Bearer sk-..."
 *     toolName:         string,   MCP tool to call, e.g. "log_alert" or "asana_create_task"
 *     toolArgsTemplate: string    JSON with {{message}}, {{subject}}, {{from}},
 *                                 {{rule}} as placeholders
 *   }
 *
 * Stored in UserProperties under 'mailsentinel.mcpservers' — separate from
 * the main settings key to preserve the 9 KB per-value limit.
 */

const MCP_SERVERS_KEY = 'mailsentinel.mcpservers';

/**
 * Preconfigured defaults for each supported MCP server type.
 * "Load defaults" in the editor fills toolName and toolArgsTemplate
 * from whichever type is selected.
 */
const MCP_TYPE_DEFAULTS = {
  custom: {
    label: 'Custom',
    description: 'Any HTTPS MCP server speaking JSON-RPC 2.0 (Streamable HTTP transport). Recommended starting point — see the Help card for a 40-line Cloudflare Worker MCP server walkthrough that gets you a working endpoint in about 15 minutes with no third-party signup.',
    defaultEndpoint: '',
    toolName: '',
    toolNameHint: 'The MCP tool to call on your server. For the Help-card Cloudflare Worker example, the tool name is "log_alert".',
    toolArgsTemplate: '{"message":"{{message}}"}'
  },
  teams: {
    label: 'Microsoft Teams',
    description: 'Microsoft Graph MCP server — sends a Teams chat or channel message. Requires registering an app in Entra ID (Azure AD), granting Chat.ReadWrite (or scoped variants), and running an OAuth flow to get an access token. Tokens expire roughly hourly. Note: enterprise tenants often require admin consent, which can be a hard blocker for non-admin employees.',
    toolName: 'send_message',
    toolNameHint: 'Microsoft Teams MCP exposes "send_message" for sending a chat or channel message.',
    toolArgsTemplate: '{"chat_id":"CHAT_ID","content":"{{message}}"}'
  },
  'asana-rest': {
    label: 'Asana (REST API — easier)',
    description: 'Direct Asana REST API task creation — strictly speaking not MCP, but the simplest way to create Asana tasks from rule alerts. Works with a Personal Access Token (PAT) from app.asana.com/0/my-apps — no OAuth flow needed. Recommended for most Asana users. Tool name field is unused for this type. Default endpoint posts to /api/1.0/tasks.',
    defaultEndpoint: 'https://app.asana.com/api/1.0/tasks',
    toolName: '',
    toolNameHint: 'Not used for the REST API path — leave blank. The endpoint posts a task directly without an MCP tool call.',
    toolArgsTemplate: '{"data":{"projects":["PROJECT_ID"],"name":"[emAIl Sentinel] {{subject}}","notes":"{{message}}"}}'
  },
  asana: {
    label: 'Asana (MCP V2 — requires OAuth)',
    description: 'Official Asana MCP V2 server — creates a task via JSON-RPC. Requires an OAuth-issued access token from a registered MCP client app; PATs are rejected by the V2 gateway. Tokens expire roughly hourly. Most users should pick "Asana (REST API)" instead.',
    defaultEndpoint: 'https://mcp.asana.com/v2/mcp',
    toolName: 'asana_create_task',
    toolNameHint: 'Asana MCP V2 exposes "asana_create_task" for creating a task in a project.',
    toolArgsTemplate: '{"project_id":"PROJECT_ID","name":"[emAIl Sentinel] {{subject}}","notes":"{{message}}"}'
  },
  webhook: {
    label: 'Generic webhook (HTTPS POST)',
    description: 'Any HTTPS endpoint that accepts a JSON POST. Works with Slack incoming webhooks, Discord webhooks, n8n / Zapier / Make scenarios, custom internal APIs, and anything else that takes a JSON body. Not MCP — no tool-name field is used; the request body below is sent verbatim with placeholders substituted.',
    defaultEndpoint: '',
    toolName: '',
    toolNameHint: 'Not used for generic webhooks — leave blank. The request body below is what gets POSTed.',
    toolArgsTemplate: '{"text":"{{message}}"}'
  }
};

// Types whose dispatch is a direct HTTPS POST of the body template, with
// no MCP JSON-RPC envelope. The Tool name field is unused for these.
const DIRECT_POST_TYPES = ['asana-rest', 'webhook'];

const MCP_TYPES = ['custom', 'teams', 'asana-rest', 'asana', 'webhook'];

// ── Storage ─────────────────────────────────────────────────────────────────

function loadMcpServers() {
  const raw = PropertiesService.getUserProperties().getProperty(MCP_SERVERS_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    activityLog('MCP servers config corrupt, returning empty: ' + e);
    return [];
  }
}

function saveMcpServers(servers) {
  const json = JSON.stringify(servers);
  if (json.length > 9000) {
    throw new Error(
      'MCP server storage exceeds the 9 KB limit. Remove some servers and try again.');
  }
  PropertiesService.getUserProperties().setProperty(MCP_SERVERS_KEY, json);
}

function getMcpServerById(id) {
  return loadMcpServers().find(s => s.id === id) || null;
}

function upsertMcpServer(server) {
  const servers = loadMcpServers();
  const idx = servers.findIndex(s => s.id === server.id);
  if (idx >= 0) {
    servers[idx] = server;
  } else {
    servers.push(server);
  }
  saveMcpServers(servers);
}

function deleteMcpServer(id) {
  saveMcpServers(loadMcpServers().filter(s => s.id !== id));
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Call a configured MCP server's tool via JSON-RPC 2.0 over HTTP.
 *
 * toolArgsTemplate placeholders:
 *   {{message}} — the Gemini-formatted alert text
 *   {{subject}} — email subject
 *   {{from}}    — sender address
 *   {{rule}}    — rule name
 */
function sendMcpAlert_(server, rule, emailData, message) {
  if (!server.endpoint || !/^https:\/\//i.test(server.endpoint)) {
    throw new Error('External integration "' + server.name + '" endpoint must be an HTTPS URL.');
  }
  // Direct-post types (asana-rest, webhook) skip the JSON-RPC envelope
  // entirely. Asana V2 MCP requires OAuth-issued tokens and rejects PATs;
  // the asana-rest path posts to /api/1.0/tasks directly with the PAT.
  // Generic webhook serves Slack incoming webhooks, Discord webhooks,
  // n8n / Zapier scenarios, and any other endpoint that accepts a plain
  // JSON POST. Both share the same dispatch shape.
  if (DIRECT_POST_TYPES.indexOf(server.type) >= 0) {
    return sendDirectPost_(server, rule, emailData, message);
  }
  if (!server.toolName) {
    throw new Error('External integration "' + server.name + '" has no tool name configured.');
  }

  const subject  = (emailData && emailData.subject) || '';
  const from     = (emailData && emailData.from)    || '';
  const ruleName = (rule && rule.name)              || '';

  const template = server.toolArgsTemplate || '{"message":"{{message}}"}';
  const argsJson = template
    .replace(/\{\{message\}\}/g, mcpJsonEsc_(message))
    .replace(/\{\{subject\}\}/g, mcpJsonEsc_(subject))
    .replace(/\{\{from\}\}/g,    mcpJsonEsc_(from))
    .replace(/\{\{rule\}\}/g,    mcpJsonEsc_(ruleName));

  let toolArgs;
  try {
    toolArgs = JSON.parse(argsJson);
  } catch (e) {
    throw new Error(
      'MCP server "' + server.name + '" args template produced invalid JSON: ' + e.message);
  }

  const payload = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: { name: server.toolName, arguments: toolArgs },
    id: 1
  };

  const headers = { 'Accept': 'application/json, text/event-stream' };
  if (server.authToken) headers['Authorization'] = server.authToken;

  const resp = UrlFetchApp.fetch(server.endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(
      'MCP "' + server.name + '" HTTP ' + code + ': ' +
      resp.getContentText().substring(0, 200));
  }

  // Decode the response body. MCP Streamable HTTP servers may reply with
  // either Content-Type: application/json (a single JSON-RPC response) or
  // Content-Type: text/event-stream (one or more SSE message events whose
  // `data:` lines hold the JSON-RPC response). Asana's V2 MCP at
  // https://mcp.asana.com/v2/mcp returns SSE in practice. Without explicit
  // SSE handling JSON.parse fails on the SSE body, the catch silently
  // swallows the error, and the dispatcher logs a false "MCP alert sent"
  // line — leaving real tool failures invisible.
  const respHeaders   = resp.getHeaders() || {};
  const contentType   = String(respHeaders['Content-Type'] || respHeaders['content-type'] || '').toLowerCase();
  const rawText       = resp.getContentText();
  let bodyText        = rawText;
  if (contentType.indexOf('text/event-stream') >= 0) {
    bodyText = rawText.split(/\r?\n/)
      .filter(function(line) { return line.indexOf('data:') === 0; })
      .map(function(line)    { return line.substring(5).trim(); })
      .join('\n');
  }

  // Surface any JSON-RPC-level error and any tool-level error.
  //
  // JSON-RPC errors land on `body.error` (transport/protocol failure: invalid
  // method, bad params, etc.).
  //
  // MCP tool-level errors land inside `body.result.isError === true` with the
  // human-readable failure text in `body.result.content[].text`. This wraps
  // the case where the HTTP request and JSON-RPC envelope both succeeded but
  // the underlying tool (e.g. asana_create_task with a bad project_id, no
  // permission, or a deleted project) refused to do anything. Without this
  // check the call returns silently — no error in the activity log, no task
  // in the destination system, leaving the user with nothing to debug from.
  try {
    const body = JSON.parse(bodyText);
    if (body.error) {
      throw new Error(
        'MCP "' + server.name + '" error: ' +
        JSON.stringify(body.error).substring(0, 200));
    }
    if (body.result && body.result.isError === true) {
      const parts = (body.result.content || [])
        .map(function(c) { return (c && c.text) ? c.text : ''; })
        .filter(Boolean);
      const detail = parts.length
        ? parts.join(' / ').substring(0, 300)
        : JSON.stringify(body.result).substring(0, 300);
      throw new Error('MCP "' + server.name + '" tool error: ' + detail);
    }
  } catch (e) {
    if (e.message.indexOf('MCP "') === 0) throw e;
    // Non-JSON response bodies are acceptable for some servers (servers that
    // ack with empty bodies or plain-text status). Only re-throw our own
    // structured errors above.
  }
}

/** Escape a value for safe insertion as a JSON string literal. */
function mcpJsonEsc_(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g,  '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Direct HTTPS POST dispatch — used by non-MCP external-integration types
 * (asana-rest, generic webhook). Substitutes placeholders into the body
 * template, posts to the endpoint with the configured Authorization
 * header, and surfaces non-2xx responses.
 *
 * No JSON-RPC envelope; the body template IS the request body.
 */
function sendDirectPost_(server, rule, emailData, message) {
  const subject  = (emailData && emailData.subject) || '';
  const from     = (emailData && emailData.from)    || '';
  const ruleName = (rule && rule.name)              || '';

  const template = server.toolArgsTemplate || '{"text":"{{message}}"}';
  const bodyJson = template
    .replace(/\{\{message\}\}/g, mcpJsonEsc_(message))
    .replace(/\{\{subject\}\}/g, mcpJsonEsc_(subject))
    .replace(/\{\{from\}\}/g,    mcpJsonEsc_(from))
    .replace(/\{\{rule\}\}/g,    mcpJsonEsc_(ruleName));

  // Validate JSON before sending so a bad template surfaces a clear error
  // rather than a misleading "remote rejected the body" 4xx from the server.
  try {
    JSON.parse(bodyJson);
  } catch (e) {
    throw new Error(
      'External integration "' + server.name +
      '" body template produced invalid JSON: ' + e.message);
  }

  const headers = { 'Accept': 'application/json' };
  if (server.authToken) headers['Authorization'] = server.authToken;

  const resp = UrlFetchApp.fetch(server.endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: headers,
    payload: bodyJson,
    muteHttpExceptions: true
  });

  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(
      'External integration "' + server.name + '" HTTP ' + code + ': ' +
      resp.getContentText().substring(0, 200));
  }
  // 2xx with any body is treated as success. Slack incoming webhooks reply
  // with literal "ok", Discord replies with an empty body or the posted
  // message JSON, custom servers vary — we don't try to parse.
}
