// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * ActivityLog.gs — A small ring-buffer log persisted in UserProperties.
 *
 * The log is shown to the user in the Activity Log card and helps debug
 * trigger runs that they cannot see directly. We cap to MAX_ENTRIES so we
 * stay well below the 9 KB per-property limit.
 *
 * During a trigger run, call startLogBuffering() at the top and flushLog()
 * at the end to batch all UserProperties writes into a single call.
 */

const LOG_KEY = 'mailsentinel.log';
const MAX_ENTRIES = 60;
const MAX_ENTRY_LENGTH = 200;

let _logBuffer = [];
let _logBuffering = false;

function startLogBuffering() {
  _logBuffer = [];
  _logBuffering = true;
}

function flushLog() {
  if (!_logBuffer.length) { _logBuffering = false; return; }
  try {
    const props = PropertiesService.getUserProperties();
    const raw = props.getProperty(LOG_KEY);
    let entries = [];
    if (raw) {
      try { entries = JSON.parse(raw) || []; } catch (e) { entries = []; }
    }
    entries = entries.concat(_logBuffer);
    if (entries.length > MAX_ENTRIES) {
      entries = entries.slice(entries.length - MAX_ENTRIES);
    }
    props.setProperty(LOG_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('flushLog() failed: ' + e);
  }
  _logBuffer = [];
  _logBuffering = false;
}

function activityLog(message) {
  // 12-hour AM/PM format in the user's local timezone (via the cached
  // getUserTimeZone_) — matches the localization used elsewhere for alert
  // dispatch dates, so log timestamps and alert timestamps line up.
  const stamp = Utilities.formatDate(
    new Date(), getUserTimeZone_(), 'yyyy-MM-dd h:mm:ss a'
  );
  const entry = (stamp + '  ' + message).substring(0, MAX_ENTRY_LENGTH);

  if (_logBuffering) {
    _logBuffer.push(entry);
    console.info(message);
    return;
  }

  try {
    const props = PropertiesService.getUserProperties();
    const raw = props.getProperty(LOG_KEY);
    let entries = [];
    if (raw) {
      try { entries = JSON.parse(raw) || []; } catch (e) { entries = []; }
    }
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) {
      entries = entries.slice(entries.length - MAX_ENTRIES);
    }
    props.setProperty(LOG_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('activityLog() failed: ' + e);
  }
  console.info(message);
}

function loadLog() {
  const raw = PropertiesService.getUserProperties().getProperty(LOG_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) || []; } catch (e) { return []; }
}

function clearLog() {
  PropertiesService.getUserProperties().deleteProperty(LOG_KEY);
}
