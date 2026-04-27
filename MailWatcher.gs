// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * MailWatcher.gs — Time-driven trigger that polls Gmail labels for new
 * messages and dispatches alerts when a Gemini-evaluated rule matches.
 *
 * Seen-message tracking:
 *   We persist a per-label set of message IDs in UserProperties so messages
 *   that arrived between trigger fires are detected exactly once. The first
 *   run for any label is treated as a baseline (no alerts) — this prevents
 *   an alert flood on first install.
 */

const SEEN_KEY = 'mailsentinel.seen';
const SEEN_MAX_PER_LABEL = 200;
const LAST_RUN_KEY = 'mailsentinel.lastRunAt';

function runMailCheck(opts) {
  const force = !!(opts && opts.force);
  const lock = LockService.getUserLock();
  if (!lock.tryLock(0)) {
    console.info('Another check is still running — skipping.');
    return;
  }
  startLogBuffering();
  try {
    const settings = loadSettings();

    // Apps Script triggers only fire at coarse intervals (1, 5, 10, 15, 30 min).
    // To honor an arbitrary user-chosen polling interval, the trigger fires at
    // the largest allowed value <= pollMinutes and we skip here until the
    // exact desired interval has elapsed since the last accepted run.
    if (!force) {
      const targetMinutes = parseInt(settings.pollMinutes, 10) || getTierLimits().minPollMinutes;
      const props = PropertiesService.getUserProperties();
      const lastRunAt = parseInt(props.getProperty(LAST_RUN_KEY) || '0', 10);
      const now = Date.now();
      // 30-second tolerance so a trigger firing slightly before the boundary
      // still runs instead of slipping a full cycle.
      if (lastRunAt && (now - lastRunAt) < (targetMinutes * 60 * 1000 - 30000)) {
        return;
      }
      props.setProperty(LAST_RUN_KEY, String(now));
    }

    if (!isInBusinessHours(settings, new Date())) {
      activityLog('Outside business hours \u2014 skipping check.');
      return;
    }

    const rules = loadRules().filter(r => r.enabled);
    if (!rules.length) {
      activityLog('No enabled rules \u2014 nothing to watch.');
      return;
    }
    if (!settings.geminiApiKey) {
      activityLog('No Gemini API key configured — open Settings to add one.');
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

    const MAX_EVALS_PER_RUN = 100;
    const runStart = Date.now();
    const MAX_RUN_MS = 240000; // 4 minutes (leave headroom for 6-min Apps Script limit)
    var evalCount = 0;
    var matchCount = 0;
    var msgCount = 0;
    var hitLimit = false;

    labels.forEach(labelName => {
      if (hitLimit) return;
      let messages;
      try {
        messages = fetchRecentMessages_(labelName, settings.maxEmailAgeDays || 30);
      } catch (e) {
        activityLog('Label "' + labelName + '" fetch failed: ' + e);
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
        activityLog('Label "' + labelName + '": baseline set (' +
            plural_(messages.length, 'existing message') + '). Watching for new mail.');
        return;
      }

      if (!newMessages.length) {
        activityLog('Label "' + labelName + '": no new messages.');
        return;
      }

      activityLog('Label "' + labelName + '": ' + plural_(newMessages.length, 'new message') + '.');

      const matchingRules = rules.filter(r => (r.labels || []).indexOf(labelName) >= 0);
      const failedIds = [];
      msgCount += newMessages.length;
      newMessages.forEach(msg => {
        activityLog('  From: ' + msg.from + '  |  Subject: ' + (msg.subject || '').substring(0, 60));
        let anyFailed = false;
        matchingRules.forEach(rule => {
          if (hitLimit) return;
          if (evalCount >= MAX_EVALS_PER_RUN || (Date.now() - runStart) > MAX_RUN_MS) {
            hitLimit = true;
            activityLog('  Run limit reached (' + evalCount + ' evaluations, ' +
              Math.round((Date.now() - runStart) / 1000) + 's). Remaining messages will be checked next run.');
            return;
          }
          activityLog('  Evaluating against rule "' + rule.name + '" ...');
          evalCount++;
          const evalResult = evaluateEmailAgainstRule(
            msg, rule, settings.geminiApiKey, settings.geminiModel
          );
          if (evalResult.failed) {
            anyFailed = true;
            activityLog('  Evaluation failed \u2014 will retry next run.');
          } else if (evalResult.matched) {
            matchCount++;
            activityLog('  MATCH! ' + evalResult.reason);
            const alertContent = generateAlertMessage(
              msg, rule, settings.geminiApiKey, settings.geminiModel
            );
            dispatchAlerts(rule, msg, alertContent, evalResult.reason, settings);
          } else {
            activityLog('  No match. ' + evalResult.reason);
          }
        });
        if (anyFailed || hitLimit) failedIds.push(msg.id);
      });
      if (failedIds.length) {
        seenAll[labelName] = seenAll[labelName].filter(
          function(id) { return failedIds.indexOf(id) < 0; }
        );
        saveSeen_(seenAll);
      }
    });
    return { messagesChecked: msgCount, matchesFound: matchCount };
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
function fetchRecentMessages_(labelName, maxAgeDays) {
  const days = (maxAgeDays > 0 ? maxAgeDays : 30);
  const query = 'label:' + quoteLabel_(labelName) + ' newer_than:' + days + 'd';
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
  var json = JSON.stringify(seen);
  if (json.length > 8500) {
    var labels = Object.keys(seen);
    var limit = SEEN_MAX_PER_LABEL;
    while (json.length > 8000 && limit > 20) {
      limit = Math.floor(limit * 0.6);
      labels.forEach(function(k) {
        if (seen[k].length > limit) {
          seen[k] = seen[k].slice(-limit);
        }
      });
      json = JSON.stringify(seen);
    }
    activityLog('Seen-ID store trimmed to ' + json.length + ' bytes (max ' + limit + ' IDs per label).');
  }
  PropertiesService.getUserProperties().setProperty(SEEN_KEY, json);
}

function resetSeen() {
  PropertiesService.getUserProperties().deleteProperty(SEEN_KEY);
  activityLog('Seen-ID baseline cleared. Next run will re-baseline all labels.');
}

// ── Trigger management ──────────────────────────────────────────────────────

function installTrigger(pollMinutes) {
  removeTriggers();
  // Gmail/Workspace add-ons require time-based triggers >= 60 min. enforcePollFloor
  // already snaps pollMinutes to a multiple of 60. Use the largest hour interval
  // that divides pollMinutes so the trigger fires exactly on cadence; the
  // runMailCheck LAST_RUN_KEY skip-check absorbs any overshoot if it doesn't.
  const target = Math.max(60, parseInt(pollMinutes, 10) || 60);
  const targetHours = Math.max(1, Math.round(target / 60));
  ScriptApp.newTrigger('runMailCheck').timeBased().everyHours(targetHours).create();
  // Reset the elapsed-time gate so the first run after re-install isn't
  // blocked by a stale lastRunAt from a previous configuration.
  PropertiesService.getUserProperties().deleteProperty(LAST_RUN_KEY);
  activityLog('Installed time-driven trigger: every ' +
    plural_(targetHours, 'hour') + ' (polling: every ' + target + ' min).');
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
  if (removed) activityLog('Removed ' + plural_(removed, 'existing trigger') + '.');
}

function isMonitoringActive() {
  return ScriptApp.getProjectTriggers()
    .some(t => t.getHandlerFunction() === 'runMailCheck');
}
