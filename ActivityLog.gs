/**
 * ActivityLog.gs — A small ring-buffer log persisted in UserProperties.
 *
 * The log is shown to the user in the Activity Log card and helps debug
 * trigger runs that they cannot see directly. We cap to MAX_ENTRIES so we
 * stay well below the 9 KB per-property limit.
 */

const LOG_KEY = 'mailalert.log';
const MAX_ENTRIES = 80;

function log(message) {
  try {
    const props = PropertiesService.getUserProperties();
    const raw = props.getProperty(LOG_KEY);
    let entries = [];
    if (raw) {
      try { entries = JSON.parse(raw) || []; } catch (e) { entries = []; }
    }
    const stamp = Utilities.formatDate(
      new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'
    );
    entries.push(stamp + '  ' + message);
    if (entries.length > MAX_ENTRIES) {
      entries = entries.slice(entries.length - MAX_ENTRIES);
    }
    props.setProperty(LOG_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('log() failed: ' + e);
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
