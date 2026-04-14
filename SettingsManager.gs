// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * SettingsManager.gs — Read/write per-user settings backed by UserProperties.
 *
 * UserProperties stores strings only and is private to the running user.
 * Each value has a 9 KB limit, so we keep settings as small JSON or scalars.
 */

const SETTINGS_KEY = 'mailsentinel.settings';

const DEFAULT_SETTINGS = {
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  pollMinutes: 5,
  maxEmailAgeDays: 30,
  businessHoursEnabled: false,
  businessHoursStart: '9:00 AM',
  businessHoursEnd: '9:00 PM',
  smsProvider: 'none',
  // Textbelt
  textbeltApiKey: '',
  // Telnyx
  telnyxApiKey: '',
  telnyxFromNumber: '',
  // Plivo
  plivoAuthId: '',
  plivoAuthToken: '',
  plivoFromNumber: '',
  // Twilio
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioFromNumber: '',
  // ClickSend
  clicksendUsername: '',
  clicksendApiKey: '',
  // Vonage
  vonageApiKey: '',
  vonageApiSecret: '',
  // Generic webhook
  smsWebhookUrl: '',
  // SMS test number
  smsTestNumber: '',
  // Google Chat
  chatSpaces: '[]',
  // Google Calendar
  calendarId: '',
  // Google Sheets
  sheetsId: '',
  // Google Tasks
  tasksListId: ''
};

function loadSettings() {
  const raw = PropertiesService.getUserProperties().getProperty(SETTINGS_KEY);
  if (!raw) {
    return Object.assign({}, DEFAULT_SETTINGS);
  }
  try {
    const parsed = JSON.parse(raw);
    return Object.assign({}, DEFAULT_SETTINGS, parsed);
  } catch (e) {
    activityLog('Settings corrupt, resetting: ' + e);
    return Object.assign({}, DEFAULT_SETTINGS);
  }
}

function saveSettings(settings) {
  const merged = Object.assign({}, DEFAULT_SETTINGS, settings);
  PropertiesService.getUserProperties()
    .setProperty(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

/**
 * Parse a 12-hour time string ('9:00 AM') into [hour24, minute]. Returns null on failure.
 */
function parse12Hour(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mn = parseInt(m[2], 10);
  const period = m[3].toUpperCase();
  if (h < 1 || h > 12 || mn < 0 || mn > 59) return null;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return [h, mn];
}

function isInBusinessHours(settings, now) {
  if (!settings.businessHoursEnabled) return true;
  const start = parse12Hour(settings.businessHoursStart) || [9, 0];
  const end = parse12Hour(settings.businessHoursEnd) || [21, 0];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = start[0] * 60 + start[1];
  const endMin = end[0] * 60 + end[1];
  if (startMin > endMin) {
    return nowMin >= startMin || nowMin < endMin;
  }
  return nowMin >= startMin && nowMin < endMin;
}
