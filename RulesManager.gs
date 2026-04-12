// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * RulesManager.gs — CRUD for user rules stored in UserProperties as JSON.
 *
 * Each rule:
 *   {
 *     id: string,
 *     name: string,
 *     labels: string[],          // Gmail label names; "INBOX" for the inbox
 *     ruleText: string,          // plain English — Gemini evaluates this
 *     alertMessagePrompt: string,
 *     enabled: boolean,
 *     createdAt: ISO8601,
 *     alerts: {
 *       smsNumbers:      string[],
 *       chatSpaces:      string[],  // names from the registry in settings
 *       calendarEnabled: boolean,
 *       sheetsEnabled:   boolean,
 *       tasksEnabled:    boolean
 *     }
 *   }
 *
 * UserProperties has a 9 KB per-value limit; with typical rules this is
 * plenty for several dozen rules. If a user grows past that we surface an
 * error rather than failing silently.
 */

const RULES_KEY = 'mailalert.rules';

const DEFAULT_ALERT_MESSAGE_PROMPT =
  'Include the date received, subject, sender, a short summary of the email, ' +
  'and a list of action items and due dates if any are present.';

function loadRules() {
  const raw = PropertiesService.getUserProperties().getProperty(RULES_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.map(migrateRule_);
  } catch (e) {
    activityLog('Rules corrupt, returning empty list: ' + e);
    return [];
  }
}

function saveRules(rules) {
  const json = JSON.stringify(rules);
  if (json.length > 9000) {
    throw new Error(
      'Rule storage exceeds the 9 KB per-user limit. ' +
      'Delete or shorten some rules and try again.'
    );
  }
  PropertiesService.getUserProperties().setProperty(RULES_KEY, json);
}

function createRule(name, labels, ruleText, alerts, alertMessagePrompt) {
  return {
    id: Utilities.getUuid(),
    name: name,
    labels: labels,
    ruleText: ruleText,
    alertMessagePrompt: alertMessagePrompt || DEFAULT_ALERT_MESSAGE_PROMPT,
    alerts: {
      smsNumbers:      (alerts && alerts.smsNumbers)     || [],
      chatSpaces:      (alerts && alerts.chatSpaces)     || [],
      calendarEnabled: (alerts && alerts.calendarEnabled) || false,
      sheetsEnabled:   (alerts && alerts.sheetsEnabled)   || false,
      tasksEnabled:    (alerts && alerts.tasksEnabled)    || false
    },
    enabled: true,
    createdAt: new Date().toISOString()
  };
}

function getRuleById(id) {
  const rules = loadRules();
  for (let i = 0; i < rules.length; i++) {
    if (rules[i].id === id) return rules[i];
  }
  return null;
}

function upsertRule(rule) {
  const rules = loadRules();
  const idx = rules.findIndex(r => r.id === rule.id);
  if (idx >= 0) {
    rules[idx] = rule;
  } else {
    rules.push(rule);
  }
  saveRules(rules);
}

function deleteRule(id) {
  const rules = loadRules().filter(r => r.id !== id);
  saveRules(rules);
}

function toggleRule(id) {
  const rules = loadRules();
  const r = rules.find(x => x.id === id);
  if (!r) return;
  r.enabled = !r.enabled;
  saveRules(rules);
}

function migrateRule_(r) {
  if (!r.alertMessagePrompt) r.alertMessagePrompt = DEFAULT_ALERT_MESSAGE_PROMPT;
  if (!r.alerts) r.alerts = {};
  delete r.alerts.emailAddresses;
  if (!r.alerts.smsNumbers) r.alerts.smsNumbers = [];
  if (!r.alerts.chatSpaces) r.alerts.chatSpaces = [];
  if (r.alerts.calendarEnabled === undefined) r.alerts.calendarEnabled = false;
  if (r.alerts.sheetsEnabled === undefined) r.alerts.sheetsEnabled = false;
  if (r.alerts.tasksEnabled === undefined) r.alerts.tasksEnabled = false;
  if (!r.labels) r.labels = ['INBOX'];
  return r;
}
