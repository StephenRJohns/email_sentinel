// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * AlertDispatcher.gs — Send alerts via SMS and Google-native channels.
 *
 * SMS provider implementations (sendTextbeltSms_, sendTelnyxSms_, etc.) and
 * Google Chat dispatch live in the NotifyLib shared library (userSymbol
 * defined in appsscript.json). This file contains the emAIl Sentinel-specific
 * orchestration layer that calls into that library.
 *
 * Public surface consumed by Cards.gs — names and signatures are stable:
 *   SMS_PROVIDERS, SMS_PROVIDER_INFO   (constants)
 *   parseSmsRecipients_(raw)           (wrapper → NotifyLib.parseSmsRecipients)
 *   parseChatSpaces_(raw)              (email_sentinel-specific, stays here)
 *   dispatchAlerts(...)                (orchestrator, stays here)
 *   testSms(toNumber)                  (dev helper, stays here)
 */

// ── Constants — delegate to NotifyLib so Cards.gs gets the same values ────────
// Apps Script libraries do not expose top-level `const` to consumers — only
// functions (and `var`). NotifyLib provides accessor functions for these.

const SMS_PROVIDERS     = NotifyLib.getSmsProviders();
const SMS_PROVIDER_INFO = NotifyLib.getSmsProviderInfo();

// ── Thin wrappers for functions Cards.gs calls by name ───────────────────────

function parseSmsRecipients_(raw) {
  return NotifyLib.parseSmsRecipients(raw);
}

function stripMarkdown_(text) {
  return NotifyLib.stripMarkdown(text);
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

function dispatchAlerts(rule, emailData, alertContent, matchReason, settings) {
  const message = alertContent || matchReason || '';

  // ── SMS ───────────────────────────────────────────────────────────────────
  const smsNumbers = (rule.alerts.smsNumbers || [])
    .map(s => s.trim()).filter(Boolean);
  if (smsNumbers.length) {
    if (settings.smsProvider === 'none' || !settings.smsProvider) {
      activityLog('  SMS alert skipped — no SMS provider configured in Settings.');
    } else {
      smsNumbers.forEach(num => {
        try {
          sendSmsAlert_(num, rule, emailData, message, settings);
          activityLog('  SMS alert sent to: ' + num);
        } catch (e) {
          activityLog('  SMS alert to ' + num + ' FAILED: ' + e);
        }
      });
    }
  }

  // ── Google Chat ───────────────────────────────────────────────────────────
  const chatNames = (rule.alerts.chatSpaces || [])
    .map(s => s.trim()).filter(Boolean);
  if (chatNames.length) {
    const registry = parseChatSpaces_(settings.chatSpaces);
    chatNames.forEach(name => {
      const url = registry[name];
      if (!url) {
        activityLog('  Chat: no webhook configured for "' + name + '" — add it in Settings.');
        return;
      }
      try {
        sendChatAlert_(url, rule, emailData, message);
        activityLog('  Chat alert sent to: ' + name);
      } catch (e) {
        activityLog('  Chat alert to "' + name + '" FAILED: ' + e);
      }
    });
  }

  // ── Google Calendar ───────────────────────────────────────────────────────
  if (rule.alerts.calendarEnabled) {
    try {
      sendCalendarAlert_(rule, emailData, message, settings);
      activityLog('  Calendar event created.');
    } catch (e) {
      activityLog('  Calendar alert FAILED: ' + e);
    }
  }

  // ── Google Sheets ─────────────────────────────────────────────────────────
  if (rule.alerts.sheetsEnabled) {
    try {
      sendSheetsAlert_(rule, emailData, message, settings);
      activityLog('  Sheets row appended.');
    } catch (e) {
      activityLog('  Sheets alert FAILED: ' + e);
    }
  }

  // ── Google Tasks ──────────────────────────────────────────────────────────
  if (rule.alerts.tasksEnabled) {
    try {
      sendTasksAlert_(rule, emailData, message, settings);
      activityLog('  Task created.');
    } catch (e) {
      activityLog('  Tasks alert FAILED: ' + e);
    }
  }

  // ── MCP servers ───────────────────────────────────────────────────────────
  const mcpServerIds = (rule.alerts.mcpServerIds || []).filter(Boolean);
  if (mcpServerIds.length) {
    const allMcpServers = loadMcpServers();
    mcpServerIds.forEach(function(id) {
      const server = allMcpServers.find(s => s.id === id);
      if (!server) {
        activityLog('  MCP: no server found for ID "' + id + '" — remove it from this rule.');
        return;
      }
      try {
        sendMcpAlert_(server, rule, emailData, message);
        activityLog('  MCP alert sent to: ' + server.name);
      } catch (e) {
        activityLog('  MCP alert to "' + server.name + '" FAILED: ' + e);
      }
    });
  }
}

// ── SMS dispatch — delegates provider routing to NotifyLib ────────────────────

function sendSmsAlert_(toNumber, rule, emailData, alertContent, settings) {
  const text = ('[emAIl Sentinel] ' + rule.name + '\n' +
    NotifyLib.stripMarkdown(alertContent)).substring(0, 600);
  NotifyLib.sendSmsAlert(toNumber, text, settings);
}

// ── Google Chat — delegates POST to NotifyLib ─────────────────────────────────

function sendChatAlert_(webhookUrl, rule, emailData, message) {
  const text = '*emAIl Sentinel Rule Fired: ' + rule.name + '*\n\n' +
    NotifyLib.stripMarkdown(message);
  NotifyLib.sendChatAlert(webhookUrl, text);
}

// ── Google-native alert channels (email_sentinel-specific) ───────────────────

function parseChatSpaces_(raw) {
  if (!raw) return {};
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return {};
    const map = {};
    arr.forEach(function(item) {
      if (item.name && item.url && /^https:\/\//i.test(item.url)) map[item.name] = item.url;
    });
    return map;
  } catch (e) { return {}; }
}

function sendCalendarAlert_(rule, emailData, message, settings) {
  const ruleOverride = ((rule.alerts && rule.alerts.calendarId) || '').trim();
  const calId = ruleOverride || (settings.calendarId || '').trim() || 'primary';
  const cal = CalendarApp.getCalendarById(calId);
  if (!cal) {
    throw new Error('Calendar "' + calId + '" not found. Use "primary" for your main calendar.');
  }
  const title = '[emAIl Sentinel] ' + rule.name + ': ' + (emailData.subject || '(no subject)');
  const desc =
    'Rule: ' + rule.name + '\n' +
    'From: ' + (emailData.from || '(unknown)') + '\n' +
    'Subject: ' + (emailData.subject || '(no subject)') + '\n' +
    'Received: ' + (emailData.receivedDateTime || '') + '\n\n' +
    NotifyLib.stripMarkdown(message);
  const now = new Date();
  const end = new Date(now.getTime() + 15 * 60 * 1000);
  cal.createEvent(title, now, end, { description: desc });
}

function sendSheetsAlert_(rule, emailData, message, settings) {
  const ruleOverride = extractSheetId_((rule.alerts && rule.alerts.sheetsId) || '');
  let ssId = ruleOverride || extractSheetId_(settings.sheetsId);
  if (!ssId) {
    ssId = createAlertSpreadsheet_();
    const s = loadSettings();
    s.sheetsId = ssId;
    saveSettings(s);
    activityLog('  Auto-created alert spreadsheet: ' + ssId);
  }
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Rule', 'From', 'Subject', 'Received', 'Alert Message']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }
  sheet.appendRow([
    formatLocalDateTime_(new Date()),
    rule.name,
    emailData.from || '',
    emailData.subject || '',
    emailData.receivedDateTime || '',
    NotifyLib.stripMarkdown(message).substring(0, 5000)
  ]);
}

function createAlertSpreadsheet_() {
  const ss = SpreadsheetApp.create('emAIl Sentinel — Alert Log');
  return ss.getId();
}

function sendTasksAlert_(rule, emailData, message, settings) {
  const ruleOverride = ((rule.alerts && rule.alerts.tasksListId) || '').trim();
  const listId = ruleOverride || (settings.tasksListId || '').trim() || '@default';
  const title = '[emAIl Sentinel] ' + rule.name + ': ' + (emailData.subject || '(no subject)');
  const notes =
    'Rule: ' + rule.name + '\n' +
    'From: ' + (emailData.from || '(unknown)') + '\n' +
    'Received: ' + (emailData.receivedDateTime || '') + '\n\n' +
    NotifyLib.stripMarkdown(message).substring(0, 8000);
  Tasks.Tasks.insert({ title: title, notes: notes }, listId);
}

// ── Test helper ───────────────────────────────────────────────────────────────

function testSms(toNumber) {
  const settings = loadSettings();
  if (settings.smsProvider === 'none' || !settings.smsProvider) {
    return 'No SMS provider configured. Open Settings → SMS Provider.';
  }
  try {
    sendSmsAlert_(toNumber,
      { name: 'Test' },
      { subject: 'Test message', from: 'emAIl Sentinel', receivedDateTime: formatLocalDateTime_(new Date()) },
      'This is a test message from emAIl Sentinel.',
      settings);
    return 'Test SMS sent to ' + toNumber + ' via ' + settings.smsProvider + '.';
  } catch (e) {
    const msg = e.message || String(e);
    if (msg.includes('30054') || msg.includes('Unregistered')) {
      return 'SMS error (30054): Unregistered phone number. With Twilio, register for A2P 10DLC: https://support.twilio.com/hc/en-us/articles/360041025133';
    }
    return 'Test SMS FAILED: ' + msg;
  }
}
