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
 *     name:             string,   e.g. "Sales Slack"
 *     type:             string,   "slack" | "ms365" | "asana" | "custom"
 *     endpoint:         string,   HTTPS URL of the MCP server
 *     authToken:        string,   Authorization header value, e.g. "Bearer sk-..."
 *     toolName:         string,   MCP tool to call, e.g. "slack_post_message"
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
  slack: {
    label: 'Slack',
    description: 'Official Slack MCP server — posts a message to a channel.',
    toolName: 'slack_post_message',
    toolArgsTemplate: '{"channel_id":"CHANNEL_ID","text":"{{message}}"}'
  },
  ms365: {
    label: 'Microsoft 365',
    description: 'Microsoft Graph MCP server — sends a Teams chat message.',
    toolName: 'send_message',
    toolArgsTemplate: '{"chat_id":"CHAT_ID","content":"{{message}}"}'
  },
  asana: {
    label: 'Asana',
    description: 'Official Asana MCP server — creates a task in a project.',
    toolName: 'asana_create_task',
    toolArgsTemplate: '{"project_id":"PROJECT_ID","name":"[emAIl Sentinel] {{subject}}","notes":"{{message}}"}'
  },
  custom: {
    label: 'Custom',
    description: 'Any HTTP MCP server using JSON-RPC 2.0 (Streamable HTTP transport).',
    toolName: '',
    toolArgsTemplate: '{"message":"{{message}}"}'
  }
};

const MCP_TYPES = ['slack', 'ms365', 'asana', 'custom'];

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
    throw new Error('MCP server "' + server.name + '" endpoint must be an HTTPS URL.');
  }
  if (!server.toolName) {
    throw new Error('MCP server "' + server.name + '" has no tool name configured.');
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

  // Surface any JSON-RPC-level error
  try {
    const body = JSON.parse(resp.getContentText());
    if (body.error) {
      throw new Error(
        'MCP "' + server.name + '" error: ' +
        JSON.stringify(body.error).substring(0, 200));
    }
  } catch (e) {
    if (e.message.indexOf('MCP "') === 0) throw e;
    // Non-JSON response bodies are acceptable for some servers
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
