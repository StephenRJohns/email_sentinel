// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * AlertDispatcher.gs — Send alerts via SMS and Google-native channels.
 *
 * SMS: Google doesn't offer a first-party SMS API. emAIl Sentinel ships
 * quick-start presets for the six providers below, plus a Generic webhook
 * that POSTs to any HTTPS endpoint the user configures (any provider works).
 * Pick one in Settings → SMS Provider:
 *
 *   Provider     Auth method       Needs phone #?   Free trial?
 *   ─────────────────────────────────────────────────────────────
 *   Textbelt     API key           No               1 free/day
 *   Telnyx       API key (Bearer)  Yes              Free credits
 *   Plivo        Auth ID + token   Yes              $10 free credit
 *   Twilio       SID + token       Yes              $15 free credit
 *   ClickSend    Username + key    No (shared #)    Free trial credits
 *   Vonage       API key + secret  No (shared #)    Free credits
 *   Webhook      (your endpoint)   (your choice)    N/A
 *
 * Current per-SMS and phone-number prices live in SMS_PROVIDER_INFO[].cost
 * below; they are shown in the in-app SMS setup card. Prices change — treat
 * them as indicative.
 */

const SMS_PROVIDERS = [
  'none', 'textbelt', 'telnyx', 'plivo', 'twilio', 'clicksend', 'vonage', 'webhook'
];

const SMS_PROVIDER_INFO = {
  textbelt: {
    label: 'Textbelt',
    cost: '~$0.04/SMS, 1 free/day',
    signupUrl: 'https://textbelt.com/',
    needsPhoneNumber: false,
    fields: ['textbeltApiKey'],
    setup: [
      '1. Go to textbelt.com',
      '2. Click "Get an API key" (or use the free key "textbelt" for 1 msg/day)',
      '3. Paste the API key below'
    ]
  },
  telnyx: {
    label: 'Telnyx',
    cost: '~$0.004/SMS US',
    signupUrl: 'https://telnyx.com/sign-up',
    needsPhoneNumber: true,
    fields: ['telnyxApiKey', 'telnyxFromNumber'],
    setup: [
      '1. Sign up at telnyx.com/sign-up',
      '2. In the portal: Numbers > Buy Numbers > pick a number (~$1/mo)',
      '3. Go to Auth V2 > API Keys > create a key',
      '4. Paste the API key and your Telnyx number below'
    ]
  },
  plivo: {
    label: 'Plivo',
    cost: '~$0.005/SMS US',
    signupUrl: 'https://console.plivo.com/accounts/register/',
    needsPhoneNumber: true,
    fields: ['plivoAuthId', 'plivoAuthToken', 'plivoFromNumber'],
    setup: [
      '1. Sign up at console.plivo.com/accounts/register (free $10 credit)',
      '2. Dashboard shows Auth ID and Auth Token — copy both',
      '3. Go to Phone Numbers > Buy Numbers > pick a number (~$0.80/mo)',
      '4. Paste Auth ID, Auth Token, and the number below'
    ]
  },
  twilio: {
    label: 'Twilio',
    cost: '~$0.0079/SMS US',
    signupUrl: 'https://www.twilio.com/try-twilio',
    needsPhoneNumber: true,
    fields: ['twilioAccountSid', 'twilioAuthToken', 'twilioFromNumber'],
    setup: [
      '1. Sign up at twilio.com/try-twilio (free $15 credit)',
      '2. Console shows Account SID and Auth Token — copy both',
      '3. Go to Phone Numbers > Buy a Number (~$1.15/mo)',
      '4. Go to A2P 10DLC > Register your campaign (required for US)',
      '5. Paste Account SID, Auth Token, and the number below'
    ]
  },
  clicksend: {
    label: 'ClickSend',
    cost: '~$0.0226/SMS US (volume discounts)',
    signupUrl: 'https://dashboard.clicksend.com/signup',
    needsPhoneNumber: false,
    fields: ['clicksendUsername', 'clicksendApiKey'],
    setup: [
      '1. Sign up at dashboard.clicksend.com/signup (free trial credits)',
      '2. Go to Developers > API Credentials',
      '3. Username is your email; API key is shown on that page',
      '4. Paste both below — no phone number purchase needed'
    ]
  },
  vonage: {
    label: 'Vonage (Nexmo)',
    cost: '~$0.0068/SMS US',
    signupUrl: 'https://dashboard.nexmo.com/sign-up',
    needsPhoneNumber: false,
    fields: ['vonageApiKey', 'vonageApiSecret'],
    setup: [
      '1. Sign up at dashboard.nexmo.com/sign-up (free credits, no CC required)',
      '2. Dashboard shows API Key and API Secret — copy both',
      '3. Paste both below — no phone number purchase needed',
      '(Note: trial messages append "[FREE SMS DEMO]" text)'
    ]
  },
  webhook: {
    label: 'Generic webhook (custom)',
    cost: 'Depends on your endpoint',
    signupUrl: '',
    needsPhoneNumber: false,
    fields: ['smsWebhookUrl'],
    setup: [
      '1. Set up an HTTPS endpoint that accepts POST requests',
      '2. emAIl Sentinel sends: {"to": "+15551234567", "body": "..."}',
      '3. Paste the URL below'
    ]
  }
};

function dispatchAlerts(rule, emailData, alertContent, matchReason, settings) {
  const message = alertContent || matchReason || '';

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

  // ── Google Chat ────────────────────────────────────────────────────────
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

  // ── Google Calendar ────────────────────────────────────────────────────
  if (rule.alerts.calendarEnabled) {
    try {
      sendCalendarAlert_(rule, emailData, message, settings);
      activityLog('  Calendar event created.');
    } catch (e) {
      activityLog('  Calendar alert FAILED: ' + e);
    }
  }

  // ── Google Sheets ──────────────────────────────────────────────────────
  if (rule.alerts.sheetsEnabled) {
    try {
      sendSheetsAlert_(rule, emailData, message, settings);
      activityLog('  Sheets row appended.');
    } catch (e) {
      activityLog('  Sheets alert FAILED: ' + e);
    }
  }

  // ── Google Tasks ───────────────────────────────────────────────────────
  if (rule.alerts.tasksEnabled) {
    try {
      sendTasksAlert_(rule, emailData, message, settings);
      activityLog('  Task created.');
    } catch (e) {
      activityLog('  Tasks alert FAILED: ' + e);
    }
  }

  // ── MCP servers ────────────────────────────────────────────────────────────
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

function sendSmsAlert_(toNumber, rule, emailData, alertContent, settings) {
  const text = ('[emAIl Sentinel] ' + rule.name + '\n' + stripMarkdown_(alertContent)).substring(0, 600);
  const provider = settings.smsProvider;
  const dispatch = {
    textbelt:  sendTextbeltSms_,
    telnyx:    sendTelnyxSms_,
    plivo:     sendPlivoSms_,
    twilio:    sendTwilioSms_,
    clicksend: sendClickSendSms_,
    vonage:    sendVonageSms_,
    webhook:   sendWebhookSms_
  };
  const fn = dispatch[provider];
  if (!fn) throw new Error('Unknown SMS provider: ' + provider);
  fn(toNumber, text, settings);
}

// ── Textbelt ────────────────────────────────────────────────────────────────

function sendTextbeltSms_(toNumber, text, settings) {
  if (!settings.textbeltApiKey) {
    throw new Error('Textbelt API key not set. Use "textbelt" for 1 free msg/day or buy a key at textbelt.com.');
  }
  const resp = UrlFetchApp.fetch('https://textbelt.com/text', {
    method: 'post',
    payload: {
      phone: toNumber,
      message: text,
      key: settings.textbeltApiKey
    },
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  const body = resp.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Textbelt HTTP ' + code + ': ' + body.substring(0, 200));
  }
  try {
    const result = JSON.parse(body);
    if (!result.success) {
      throw new Error('Textbelt: ' + (result.error || 'unknown error') +
        (result.quotaRemaining !== undefined ? ' (quota remaining: ' + result.quotaRemaining + ')' : ''));
    }
  } catch (e) {
    if (e.message.indexOf('Textbelt') === 0) throw e;
    throw new Error('Textbelt: unexpected response — ' + body.substring(0, 200));
  }
}

// ── Telnyx ──────────────────────────────────────────────────────────────────

function sendTelnyxSms_(toNumber, text, settings) {
  if (!settings.telnyxApiKey || !settings.telnyxFromNumber) {
    throw new Error('Telnyx settings incomplete (API key and From number required).');
  }
  const resp = UrlFetchApp.fetch('https://api.telnyx.com/v2/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + settings.telnyxApiKey },
    payload: JSON.stringify({
      from: settings.telnyxFromNumber,
      to: toNumber,
      text: text
    }),
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Telnyx HTTP ' + code + ': ' + resp.getContentText().substring(0, 200));
  }
}

// ── Plivo ───────────────────────────────────────────────────────────────────

function sendPlivoSms_(toNumber, text, settings) {
  if (!settings.plivoAuthId || !settings.plivoAuthToken || !settings.plivoFromNumber) {
    throw new Error('Plivo settings incomplete (Auth ID, Auth Token, and From number required).');
  }
  const url = 'https://api.plivo.com/v1/Account/' +
    encodeURIComponent(settings.plivoAuthId) + '/Message/';
  const auth = Utilities.base64Encode(settings.plivoAuthId + ':' + settings.plivoAuthToken);
  const resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Basic ' + auth },
    payload: JSON.stringify({
      src: settings.plivoFromNumber,
      dst: toNumber,
      text: text
    }),
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Plivo HTTP ' + code + ': ' + resp.getContentText().substring(0, 200));
  }
}

// ── Twilio ──────────────────────────────────────────────────────────────────

function sendTwilioSms_(toNumber, text, settings) {
  if (!settings.twilioAccountSid || !settings.twilioAuthToken || !settings.twilioFromNumber) {
    throw new Error('Twilio settings incomplete (Account SID, Auth Token, From number).');
  }
  const url =
    'https://api.twilio.com/2010-04-01/Accounts/' +
    encodeURIComponent(settings.twilioAccountSid) + '/Messages.json';
  const auth = Utilities.base64Encode(
    settings.twilioAccountSid + ':' + settings.twilioAuthToken
  );
  const resp = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: { Authorization: 'Basic ' + auth },
    payload: {
      From: settings.twilioFromNumber,
      To: toNumber,
      Body: text
    },
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Twilio HTTP ' + code + ': ' + resp.getContentText().substring(0, 200));
  }
}

// ── ClickSend ───────────────────────────────────────────────────────────────

function sendClickSendSms_(toNumber, text, settings) {
  if (!settings.clicksendUsername || !settings.clicksendApiKey) {
    throw new Error('ClickSend settings incomplete (Username and API key required).');
  }
  const auth = Utilities.base64Encode(settings.clicksendUsername + ':' + settings.clicksendApiKey);
  const resp = UrlFetchApp.fetch('https://rest.clicksend.com/v3/sms/send', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Basic ' + auth },
    payload: JSON.stringify({
      messages: [{
        source: 'emAIl Sentinel',
        to: toNumber,
        body: text
      }]
    }),
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('ClickSend HTTP ' + code + ': ' + resp.getContentText().substring(0, 200));
  }
}

// ── Vonage (Nexmo) ──────────────────────────────────────────────────────────

function sendVonageSms_(toNumber, text, settings) {
  if (!settings.vonageApiKey || !settings.vonageApiSecret) {
    throw new Error('Vonage settings incomplete (API Key and API Secret required).');
  }
  const resp = UrlFetchApp.fetch('https://rest.nexmo.com/sms/json', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      from: 'emAIl Sentinel',
      to: toNumber.replace(/[^0-9]/g, ''),
      text: text,
      api_key: settings.vonageApiKey,
      api_secret: settings.vonageApiSecret
    }),
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Vonage HTTP ' + code + ': ' + resp.getContentText().substring(0, 200));
  }
  try {
    const body = JSON.parse(resp.getContentText());
    const msg = (body.messages || [])[0];
    if (msg && msg.status !== '0') {
      throw new Error('Vonage: ' + (msg['error-text'] || 'status ' + msg.status));
    }
  } catch (e) {
    if (e.message.indexOf('Vonage') === 0) throw e;
    throw new Error('Vonage: unexpected response — ' + resp.getContentText().substring(0, 200));
  }
}

// ── Generic webhook (POSTs {to, body} JSON to any HTTPS endpoint the user configures) ──

function sendWebhookSms_(toNumber, text, settings) {
  if (!settings.smsWebhookUrl) {
    throw new Error('Webhook URL not set in Settings → SMS.');
  }
  if (!/^https:\/\//i.test(settings.smsWebhookUrl)) {
    throw new Error('Webhook URL must use HTTPS.');
  }
  const resp = UrlFetchApp.fetch(settings.smsWebhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ to: toNumber, body: text }),
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Webhook HTTP ' + code + ': ' + resp.getContentText().substring(0, 200));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Google-native alert channels (free, no third-party account)
// ═══════════════════════════════════════════════════════════════════════════

// ── Google Chat webhook ─────────────────────────────────────────────────────

function stripMarkdown_(text) {
  if (!text) return text;
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold** → plain text
    .replace(/^#{1,6} /gm, '');        // # Heading → Heading
}

function sendChatAlert_(webhookUrl, rule, emailData, message) {
  const payload = {
    text: '*emAIl Sentinel Rule Fired: ' + rule.name + '*\n\n' + stripMarkdown_(message)
  };
  const resp = UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Chat webhook HTTP ' + code + ': ' + resp.getContentText().substring(0, 200));
  }
}

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

function parseSmsRecipients_(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr.filter(function(r) { return r.name && r.number; });
  } catch (e) { return []; }
}

// ── Google Calendar event ───────────────────────────────────────────────────

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
    stripMarkdown_(message);

  const now = new Date();
  const end = new Date(now.getTime() + 15 * 60 * 1000);
  cal.createEvent(title, now, end, { description: desc });
}

// ── Google Sheets log ───────────────────────────────────────────────────────

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
    sheet.appendRow([
      'Timestamp', 'Rule', 'From', 'Subject', 'Received', 'Alert Message'
    ]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }
  sheet.appendRow([
    new Date().toISOString(),
    rule.name,
    emailData.from || '',
    emailData.subject || '',
    emailData.receivedDateTime || '',
    stripMarkdown_(message).substring(0, 5000)
  ]);
}

function createAlertSpreadsheet_() {
  const ss = SpreadsheetApp.create('emAIl Sentinel — Alert Log');
  return ss.getId();
}

// ── Google Tasks ────────────────────────────────────────────────────────────

function sendTasksAlert_(rule, emailData, message, settings) {
  const ruleOverride = ((rule.alerts && rule.alerts.tasksListId) || '').trim();
  const listId = ruleOverride || (settings.tasksListId || '').trim() || '@default';
  const title = '[emAIl Sentinel] ' + rule.name + ': ' + (emailData.subject || '(no subject)');
  const notes =
    'Rule: ' + rule.name + '\n' +
    'From: ' + (emailData.from || '(unknown)') + '\n' +
    'Received: ' + (emailData.receivedDateTime || '') + '\n\n' +
    stripMarkdown_(message).substring(0, 8000);

  Tasks.Tasks.insert({ title: title, notes: notes }, listId);
}

// ═══════════════════════════════════════════════════════════════════════════
// Test helpers
// ═══════════════════════════════════════════════════════════════════════════

function testSms(toNumber) {
  const settings = loadSettings();
  if (settings.smsProvider === 'none' || !settings.smsProvider) {
    return 'No SMS provider configured. Open Settings → SMS Provider.';
  }
  try {
    sendSmsAlert_(toNumber,
      { name: 'Test' },
      { subject: 'Test message', from: 'emAIl Sentinel', receivedDateTime: new Date().toISOString() },
      'This is a test message from emAIl Sentinel.',
      settings);
    return 'Test SMS sent to ' + toNumber + ' via ' + settings.smsProvider + '.';
  } catch (e) {
    const msg = e.message || String(e);
    if (msg.includes('30054') || msg.includes('Unregistered')) {
      return 'SMS error (30054): Unregistered phone number. With Twilio, you must register your number for A2P 10DLC compliance. See: https://support.twilio.com/hc/en-us/articles/360041025133-Getting-started-with-A2P-10DLC';
    }
    return 'Test SMS FAILED: ' + msg;
  }
}
