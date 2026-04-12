// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * MailWatcher.gs — Time-driven trigger that polls Gmail labels for new
 * messages and dispatches alerts when a Gemini-evaluated rule matches.
 *
 * The original Python project ran a background thread on the user's PC.
 * In Apps Script land we use a time-driven trigger that fires every N
 * minutes regardless of whether the user is logged in — same effect.
 *
 * Seen-message tracking:
 *   We persist a per-label set of message IDs in UserProperties so messages
 *   that arrived between trigger fires are detected exactly once. The first
 *   run for any label is treated as a baseline (no alerts) — this matches
 *   the original Python behaviour and prevents an alert flood on first install.
 */

const SEEN_KEY = 'mailalert.seen';
const SEEN_MAX_PER_LABEL = 200;

function runMailCheck() {
  const lock = LockService.getUserLock();
  if (!lock.tryLock(0)) {
    console.info('Another check is still running — skipping.');
    return;
  }
  startLogBuffering();
  try {
    const settings = loadSettings();
    if (!isInBusinessHours(settings, new Date())) {
      log('Outside business hours — skipping check.');
      return;
    }

    const rules = loadRules().filter(r => r.enabled);
    if (!rules.length) {
      log('No enabled rules — nothing to watch.');
      return;
    }
    if (!settings.geminiApiKey) {
      log('No Gemini API key configured — open Settings to add one.');
      return;
    }

    const labelSet = {};
    rules.forEach(r => (r.labels || []).forEach(l => (labelSet[l] = true)));
    const labels = Object.keys(labelSet);

    const seenAll = loadSeen_();

    // Prune seen-data for labels no longer referenced by any rule
    const activeLabels = new Set(labels);
    Object.keys(seenAll).forEach(k => {
      if (!activeLabels.has(k)) delete seenAll[k];
    });

    labels.forEach(labelName => {
      let messages;
      try {
        messages = fetchRecentMessages_(labelName);
      } catch (e) {
        log('Label "' + labelName + '" fetch failed: ' + e);
        return;
      }

      const seen = seenAll[labelName] ? new Set(seenAll[labelName]) : null;
      const isFirstRun = seen === null;
      const currentSeen = new Set();

      const newMessages = [];
      messages.forEach(m => {
        currentSeen.add(m.id);
        if (!isFirstRun && !seen.has(m.id)) newMessages.push(m);
      });

      seenAll[labelName] = Array.from(currentSeen).slice(-SEEN_MAX_PER_LABEL);
      // Save after each label so partial progress survives a timeout
      saveSeen_(seenAll);

      if (isFirstRun) {
        log('Label "' + labelName + '": baseline set (' + messages.length +
            ' existing message(s)). Watching for new mail.');
        return;
      }

      if (!newMessages.length) {
        log('Label "' + labelName + '": no new messages.');
        return;
      }

      log('Label "' + labelName + '": ' + newMessages.length + ' new message(s).');

      const matchingRules = rules.filter(r => (r.labels || []).indexOf(labelName) >= 0);
      newMessages.forEach(msg => {
        log('  From: ' + msg.from + '  |  Subject: ' + (msg.subject || '').substring(0, 60));
        matchingRules.forEach(rule => {
          log('  Evaluating against rule "' + rule.name + '" ...');
          const evalResult = evaluateEmailAgainstRule(
            msg, rule, settings.geminiApiKey, settings.geminiModel
          );
          if (evalResult.matched) {
            log('  MATCH! ' + evalResult.reason);
            const alertContent = generateAlertMessage(
              msg, rule, settings.geminiApiKey, settings.geminiModel
            );
            dispatchAlerts(rule, msg, alertContent, evalResult.reason, settings);
          } else {
            log('  No match. ' + evalResult.reason);
          }
        });
      });
    });
  } finally {
    flushLog();
    lock.releaseLock();
  }
}

/**
 * Fetch the most recent messages from a Gmail label.
 *
 * Gmail uses labels rather than folders. "INBOX" is a system label.
 * We use GmailApp.search() with a label: query so user-created labels
 * (and Gmail categories like "important", "starred") all work uniformly.
 *
 * Returns up to 50 messages, newest first, in normalized form.
 */
function fetchRecentMessages_(labelName) {
  const query = 'label:' + quoteLabel_(labelName) + ' newer_than:1d';
  const threads = GmailApp.search(query, 0, 50);
  const out = [];
  threads.forEach(t => {
    t.getMessages().forEach(m => out.push(normalizeMessage_(m)));
  });
  out.sort((a, b) => (b.receivedMillis || 0) - (a.receivedMillis || 0));
  return out.slice(0, 50);
}

function quoteLabel_(name) {
  if (/[^A-Za-z0-9_\/-]/.test(name)) {
    return '"' + name.replace(/"/g, '\\"') + '"';
  }
  return name;
}

function normalizeMessage_(m) {
  let body = '';
  try { body = m.getPlainBody() || ''; }
  catch (e) { body = m.getBody() || ''; }

  let attachmentNames = [];
  try {
    attachmentNames = m.getAttachments({
      includeInlineImages: false,
      includeAttachments: true
    }).map(a => a.getName()).filter(Boolean);
  } catch (e) { /* malformed MIME */ }

  return {
    id: m.getId(),
    from: m.getFrom(),
    subject: m.getSubject() || '(no subject)',
    body: body,
    receivedDateTime: m.getDate().toISOString(),
    receivedMillis: m.getDate().getTime(),
    attachmentNames: attachmentNames,
    hasAttachments: attachmentNames.length > 0
  };
}

function loadSeen_() {
  const raw = PropertiesService.getUserProperties().getProperty(SEEN_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw) || {}; }
  catch (e) { return {}; }
}

function saveSeen_(seen) {
  const json = JSON.stringify(seen);
  if (json.length > 8500) {
    log('Warning: seen-ID store at ' + json.length + ' bytes — approaching 9 KB limit.');
  }
  PropertiesService.getUserProperties().setProperty(SEEN_KEY, json);
}

function resetSeen() {
  PropertiesService.getUserProperties().deleteProperty(SEEN_KEY);
  log('Seen-ID baseline cleared. Next run will re-baseline all labels.');
}

// ── Trigger management ──────────────────────────────────────────────────────

function installTrigger(everyMinutes) {
  removeTriggers();
  const allowed = [1, 5, 10, 15, 30];
  const m = allowed.indexOf(everyMinutes) >= 0 ? everyMinutes : 5;
  ScriptApp.newTrigger('runMailCheck').timeBased().everyMinutes(m).create();
  log('Installed time-driven trigger: every ' + m + ' minute(s).');
}

function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'runMailCheck') {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });
  if (removed) log('Removed ' + removed + ' existing trigger(s).');
}

function isMonitoringActive() {
  return ScriptApp.getProjectTriggers()
    .some(t => t.getHandlerFunction() === 'runMailCheck');
}
