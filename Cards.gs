// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * Cards.gs — All CardService UI for the MailAlert add-on.
 *
 * Layout overview:
 *   Home card     — quick status, Start/Stop monitoring, links to subviews
 *   Rules card    — list of rules with edit/delete/toggle buttons
 *   Rule editor   — name, labels, rule text, alert format, recipients
 *   Settings card — Gemini key/model, poll interval, business hours, SMS
 *   Activity card — scrolling log of recent runs
 *   Help card     — usage instructions
 *
 * All cards are stateless: every action handler reads UserProperties
 * fresh, applies the change, and returns a new card. No in-memory state.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Home
// ─────────────────────────────────────────────────────────────────────────────

function buildHomeCard() {
  const settings = loadSettings();
  const rules = loadRules();
  const monitoring = isMonitoringActive();
  const enabledCount = rules.filter(r => r.enabled).length;

  const statusSection = CardService.newCardSection()
    .setHeader('<b>Status</b>')
    .addWidget(CardService.newKeyValue()
      .setTopLabel('Monitoring')
      .setContent(monitoring ? 'Running' : 'Stopped')
      .setIcon(monitoring ? CardService.Icon.CLOCK : CardService.Icon.NONE))
    .addWidget(CardService.newKeyValue()
      .setTopLabel('Rules')
      .setContent(enabledCount + ' enabled / ' + rules.length + ' total'))
    .addWidget(CardService.newKeyValue()
      .setTopLabel('Gemini API key')
      .setContent(settings.geminiApiKey ? 'Configured' : 'NOT configured'));

  if (monitoring) {
    statusSection.addWidget(CardService.newTextButton()
      .setText('Stop monitoring')
      .setOnClickAction(action_('handleStopMonitoring')));
  } else {
    statusSection.addWidget(CardService.newTextButton()
      .setText('Start monitoring')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(action_('handleStartMonitoring')));
  }

  statusSection.addWidget(CardService.newTextButton()
    .setText('Run check now')
    .setOnClickAction(action_('handleRunCheckNow')));

  const navSection = CardService.newCardSection()
    .addWidget(CardService.newTextButton()
      .setText('Rules')
      .setOnClickAction(navAction_('buildRulesCard')))
    .addWidget(CardService.newTextButton()
      .setText('Settings')
      .setOnClickAction(navAction_('buildSettingsCard')))
    .addWidget(CardService.newTextButton()
      .setText('Activity log')
      .setOnClickAction(navAction_('buildActivityCard')))
    .addWidget(CardService.newTextButton()
      .setText('Help')
      .setOnClickAction(navAction_('buildHelpCard')));

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('MailAlert'))
    .addSection(statusSection)
    .addSection(navSection)
    .build();
}

function handleStartMonitoring(e) {
  const settings = loadSettings();
  if (!settings.geminiApiKey) {
    return notificationResponse_('Add a Gemini API key in Settings first.');
  }
  installTrigger(settings.pollMinutes || 5);
  return refreshHome_('Monitoring started.');
}

function handleStopMonitoring(e) {
  removeTriggers();
  return refreshHome_('Monitoring stopped.');
}

function handleRunCheckNow(e) {
  try { runMailCheck(); }
  catch (err) { return notificationResponse_('Check failed: ' + err); }
  return refreshHome_('Check complete — see Activity Log.');
}

function refreshHome_(message) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildHomeCard()))
    .setNotification(CardService.newNotification().setText(message))
    .build();
}

// ─────────────────────────────────────────────────────────────────────────────
// Rules list
// ─────────────────────────────────────────────────────────────────────────────

function buildRulesCard() {
  const rules = loadRules();
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Rules'));

  const newSection = CardService.newCardSection()
    .addWidget(CardService.newTextButton()
      .setText('+ New rule')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(action_('handleNewRule')));
  card.addSection(newSection);

  if (!rules.length) {
    card.addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<i>No rules yet. Click "New rule" above to create one.</i>')));
  } else {
    rules.forEach(rule => card.addSection(buildRuleSummarySection_(rule)));
  }

  return card.build();
}

function buildRuleSummarySection_(rule) {
  const status = rule.enabled ? '✅ ON' : '⏸ OFF';
  const labels = (rule.labels || []).join(', ') || '(no labels)';
  const emails = (rule.alerts.emailAddresses || []).join(', ') || '—';
  const sms    = (rule.alerts.smsNumbers || []).join(', ') || '—';
  const ruleText = (rule.ruleText || '').length > 140
    ? rule.ruleText.substring(0, 137) + '…'
    : rule.ruleText;

  const section = CardService.newCardSection()
    .setHeader('<b>' + escapeHtml_(rule.name) + '</b> &nbsp; ' + status)
    .addWidget(CardService.newKeyValue().setTopLabel('Labels').setContent(escapeHtml_(labels)))
    .addWidget(CardService.newKeyValue().setTopLabel('Rule').setContent(escapeHtml_(ruleText)))
    .addWidget(CardService.newKeyValue().setTopLabel('Email').setContent(escapeHtml_(emails)))
    .addWidget(CardService.newKeyValue().setTopLabel('SMS').setContent(escapeHtml_(sms)));

  const buttons = CardService.newButtonSet()
    .addButton(CardService.newTextButton()
      .setText('Edit')
      .setOnClickAction(actionWithRule_('handleEditRule', rule.id)))
    .addButton(CardService.newTextButton()
      .setText(rule.enabled ? 'Disable' : 'Enable')
      .setOnClickAction(actionWithRule_('handleToggleRule', rule.id)))
    .addButton(CardService.newTextButton()
      .setText('Delete')
      .setOnClickAction(actionWithRule_('handleDeleteRule', rule.id)));
  section.addWidget(buttons);
  return section;
}

function handleToggleRule(e) {
  toggleRule(e.parameters.ruleId);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildRulesCard()))
    .build();
}

function handleDeleteRule(e) {
  deleteRule(e.parameters.ruleId);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildRulesCard()))
    .setNotification(CardService.newNotification().setText('Rule deleted.'))
    .build();
}

function handleNewRule(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildRuleEditorCard(null)))
    .build();
}

function handleEditRule(e) {
  const rule = getRuleById(e.parameters.ruleId);
  if (!rule) return notificationResponse_('Rule not found.');
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildRuleEditorCard(rule)))
    .build();
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule editor
// ─────────────────────────────────────────────────────────────────────────────

function buildRuleEditorCard(rule) {
  const editing = rule !== null && rule !== undefined;
  const r = rule || {};
  const alerts = (r.alerts || {});

  const section = CardService.newCardSection();

  section.addWidget(CardService.newTextInput()
    .setFieldName('name')
    .setTitle('Rule name')
    .setValue(r.name || ''));

  section.addWidget(CardService.newTextInput()
    .setFieldName('labels')
    .setTitle('Gmail labels to watch (comma separated)')
    .setHint('e.g. INBOX, Vendors, Finance')
    .setValue((r.labels || ['INBOX']).join(', ')));

  section.addWidget(CardService.newTextInput()
    .setFieldName('ruleText')
    .setTitle('Rule (plain English — Gemini evaluates this)')
    .setMultiline(true)
    .setValue(r.ruleText || ''));

  section.addWidget(CardService.newTextInput()
    .setFieldName('alertMessagePrompt')
    .setTitle('Alert message format (plain English)')
    .setMultiline(true)
    .setValue(r.alertMessagePrompt || DEFAULT_ALERT_MESSAGE_PROMPT));

  section.addWidget(CardService.newTextInput()
    .setFieldName('emailAddresses')
    .setTitle('Email addresses to alert (comma separated)')
    .setValue((alerts.emailAddresses || []).join(', ')));

  section.addWidget(CardService.newTextInput()
    .setFieldName('smsNumbers')
    .setTitle('SMS phone numbers (comma separated, E.164: +15551234567)')
    .setValue((alerts.smsNumbers || []).join(', ')));

  const saveAction = CardService.newAction()
    .setFunctionName('handleSaveRule')
    .setParameters({ ruleId: editing ? r.id : '' });

  section.addWidget(CardService.newButtonSet()
    .addButton(CardService.newTextButton()
      .setText('Save')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(saveAction))
    .addButton(CardService.newTextButton()
      .setText('Cancel')
      .setOnClickAction(action_('handleCancelEditor'))));

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(editing ? 'Edit rule' : 'New rule'))
    .addSection(section)
    .build();
}

function handleSaveRule(e) {
  const inputs = e.commonEventObject.formInputs || {};
  const get = key => {
    const v = inputs[key];
    if (!v || !v.stringInputs || !v.stringInputs.value) return '';
    return (v.stringInputs.value[0] || '').trim();
  };

  const name = get('name');
  const labels = splitCsv_(get('labels'));
  const ruleText = get('ruleText');
  const alertMessagePrompt = get('alertMessagePrompt') || DEFAULT_ALERT_MESSAGE_PROMPT;
  const emailAddresses = splitCsv_(get('emailAddresses'));
  const smsNumbers = splitCsv_(get('smsNumbers'));

  if (!name)     return notificationResponse_('Please enter a rule name.');
  if (!ruleText) return notificationResponse_('Please enter a rule description.');
  if (!labels.length) return notificationResponse_('Please list at least one Gmail label.');

  const id = e.parameters.ruleId;
  let rule;
  if (id) {
    rule = getRuleById(id);
    if (!rule) return notificationResponse_('Rule no longer exists.');
    rule.name = name;
    rule.labels = labels;
    rule.ruleText = ruleText;
    rule.alertMessagePrompt = alertMessagePrompt;
    rule.alerts = { emailAddresses: emailAddresses, smsNumbers: smsNumbers };
  } else {
    rule = createRule(name, labels, ruleText,
      { emailAddresses: emailAddresses, smsNumbers: smsNumbers },
      alertMessagePrompt);
  }

  try { upsertRule(rule); }
  catch (err) { return notificationResponse_('Save failed: ' + err); }

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard().updateCard(buildRulesCard()))
    .setNotification(CardService.newNotification().setText('Rule saved.'))
    .build();
}

function handleCancelEditor(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard())
    .build();
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────

function buildSettingsCard() {
  const s = loadSettings();

  const aiSection = CardService.newCardSection()
    .setHeader('<b>Gemini (rule evaluation)</b>')
    .addWidget(CardService.newTextInput()
      .setFieldName('geminiApiKey')
      .setTitle('Gemini API key')
      .setHint('Get one free at aistudio.google.com/app/apikey')
      .setValue(s.geminiApiKey || ''));

  const modelSelect = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('geminiModel')
    .setTitle('Gemini model');
  GEMINI_MODELS.forEach(m => modelSelect.addItem(m, m, m === (s.geminiModel || GEMINI_DEFAULT_MODEL)));
  aiSection.addWidget(modelSelect);

  const pollSection = CardService.newCardSection()
    .setHeader('<b>Polling</b>');
  const pollSelect = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('pollMinutes')
    .setTitle('Check for new email every');
  [1, 5, 10, 15, 30].forEach(m => pollSelect.addItem(m + ' minute(s)', String(m),
    Number(s.pollMinutes || 5) === m));
  pollSection.addWidget(pollSelect);
  pollSection.addWidget(CardService.newTextParagraph().setText(
    '<font color="#888888">Apps Script time-driven triggers run in the background ' +
    'whether or not Gmail is open in your browser.</font>'));

  const bizSection = CardService.newCardSection()
    .setHeader('<b>Business hours</b>')
    .addWidget(CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName('businessHoursEnabled')
      .addItem('Only check during business hours', 'true', !!s.businessHoursEnabled))
    .addWidget(CardService.newTextInput()
      .setFieldName('businessHoursStart')
      .setTitle('Start (e.g. 9:00 AM)')
      .setValue(s.businessHoursStart || '9:00 AM'))
    .addWidget(CardService.newTextInput()
      .setFieldName('businessHoursEnd')
      .setTitle('End (e.g. 9:00 PM)')
      .setValue(s.businessHoursEnd || '9:00 PM'));

  const smsSection = CardService.newCardSection()
    .setHeader('<b>SMS provider</b>')
    .addWidget(CardService.newTextParagraph().setText(
      'Google Workspace does not provide a first-party SMS API. Choose a ' +
      'third-party provider below to enable SMS alerts.'));
  const smsSelect = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('smsProvider')
    .setTitle('Provider');
  [
    ['none',    'None (disable SMS)'],
    ['twilio',  'Twilio'],
    ['webhook', 'Generic webhook (custom)']
  ].forEach(([val, label]) => smsSelect.addItem(label, val, s.smsProvider === val));
  smsSection.addWidget(smsSelect);

  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('twilioAccountSid')
    .setTitle('Twilio Account SID')
    .setValue(s.twilioAccountSid || ''));
  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('twilioAuthToken')
    .setTitle('Twilio Auth Token')
    .setValue(s.twilioAuthToken || ''));
  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('twilioFromNumber')
    .setTitle('Twilio "From" number (E.164: +15551234567)')
    .setValue(s.twilioFromNumber || ''));
  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('smsWebhookUrl')
    .setTitle('Generic webhook URL (for "Generic webhook" provider)')
    .setHint('Receives POST {"to": "+15551234567", "body": "..."}')
    .setValue(s.smsWebhookUrl || ''));

  const aliasSection = CardService.newCardSection()
    .setHeader('<b>Alert "From" name</b>')
    .addWidget(CardService.newTextInput()
      .setFieldName('alertFromAlias')
      .setTitle('Display name on outgoing email alerts')
      .setValue(s.alertFromAlias || 'MailAlert'));

  const buttons = CardService.newCardSection().addWidget(CardService.newButtonSet()
    .addButton(CardService.newTextButton()
      .setText('Save settings')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(action_('handleSaveSettings')))
    .addButton(CardService.newTextButton()
      .setText('Test Gemini')
      .setOnClickAction(action_('handleTestGemini')))
    .addButton(CardService.newTextButton()
      .setText('Reset baseline')
      .setOnClickAction(action_('handleResetBaseline'))));

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Settings'))
    .addSection(aiSection)
    .addSection(pollSection)
    .addSection(bizSection)
    .addSection(smsSection)
    .addSection(aliasSection)
    .addSection(buttons)
    .build();
}

function handleSaveSettings(e) {
  const inputs = e.commonEventObject.formInputs || {};
  const get = key => {
    const v = inputs[key];
    if (!v || !v.stringInputs || !v.stringInputs.value) return '';
    return (v.stringInputs.value[0] || '').trim();
  };
  const getCheckbox = key => {
    const v = inputs[key];
    if (!v || !v.stringInputs || !v.stringInputs.value) return false;
    return v.stringInputs.value.indexOf('true') >= 0;
  };

  const next = {
    geminiApiKey: get('geminiApiKey'),
    geminiModel: get('geminiModel') || GEMINI_DEFAULT_MODEL,
    pollMinutes: parseInt(get('pollMinutes') || '5', 10),
    businessHoursEnabled: getCheckbox('businessHoursEnabled'),
    businessHoursStart: get('businessHoursStart') || '9:00 AM',
    businessHoursEnd: get('businessHoursEnd') || '9:00 PM',
    smsProvider: get('smsProvider') || 'none',
    twilioAccountSid: get('twilioAccountSid'),
    twilioAuthToken: get('twilioAuthToken'),
    twilioFromNumber: get('twilioFromNumber'),
    smsWebhookUrl: get('smsWebhookUrl'),
    alertFromAlias: get('alertFromAlias') || 'MailAlert'
  };

  if (next.businessHoursEnabled) {
    if (!parse12Hour(next.businessHoursStart)) {
      return notificationResponse_('Business hours start must be 12-hour format, e.g. 9:00 AM.');
    }
    if (!parse12Hour(next.businessHoursEnd)) {
      return notificationResponse_('Business hours end must be 12-hour format, e.g. 9:00 PM.');
    }
  }

  saveSettings(next);

  // If monitoring is currently active and the poll interval changed,
  // re-install the trigger so the new interval takes effect.
  if (isMonitoringActive()) installTrigger(next.pollMinutes);

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildSettingsCard()))
    .setNotification(CardService.newNotification().setText('Settings saved.'))
    .build();
}

function handleTestGemini(e) {
  const s = loadSettings();
  if (!s.geminiApiKey) {
    return notificationResponse_('No Gemini API key set — enter one and click Save first.');
  }
  const text = callGemini_(s.geminiApiKey, s.geminiModel,
    'Reply with the single word OK.', 20);
  if (text && text.toUpperCase().indexOf('OK') >= 0) {
    return notificationResponse_('Gemini OK — model responded.');
  }
  return notificationResponse_('Gemini test failed — see Activity Log.');
}

function handleResetBaseline(e) {
  resetSeen();
  return notificationResponse_('Seen-mail baseline cleared.');
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity log
// ─────────────────────────────────────────────────────────────────────────────

function buildActivityCard() {
  const entries = loadLog();
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Activity log'));

  const top = CardService.newCardSection()
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('Refresh')
        .setOnClickAction(action_('handleRefreshLog')))
      .addButton(CardService.newTextButton()
        .setText('Clear')
        .setOnClickAction(action_('handleClearLog'))));
  card.addSection(top);

  if (!entries.length) {
    card.addSection(CardService.newCardSection().addWidget(
      CardService.newTextParagraph().setText('<i>No activity yet.</i>')));
    return card.build();
  }

  // Show newest first; CardService doesn't support a true scrollable text
  // area, so we render entries as paragraphs in chunks.
  const reversed = entries.slice().reverse().slice(0, 60);
  const body = reversed.map(escapeHtml_).join('<br>');
  card.addSection(CardService.newCardSection().addWidget(
    CardService.newTextParagraph().setText(body)));
  return card.build();
}

function handleRefreshLog(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildActivityCard()))
    .build();
}

function handleClearLog(e) {
  clearLog();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildActivityCard()))
    .setNotification(CardService.newNotification().setText('Log cleared.'))
    .build();
}

// ─────────────────────────────────────────────────────────────────────────────
// Help
// ─────────────────────────────────────────────────────────────────────────────

function buildHelpCard() {
  const html = HtmlService.createHtmlOutputFromFile('Help').getContent();
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('MailAlert help'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText(html)))
    .build();
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function action_(fn) {
  return CardService.newAction().setFunctionName(fn);
}

function navAction_(builderFn) {
  return CardService.newAction().setFunctionName('handleNavTo')
    .setParameters({ builder: builderFn });
}

function actionWithRule_(fn, ruleId) {
  return CardService.newAction().setFunctionName(fn).setParameters({ ruleId: ruleId });
}

function handleNavTo(e) {
  const builder = e.parameters.builder;
  const map = {
    buildRulesCard: buildRulesCard,
    buildSettingsCard: buildSettingsCard,
    buildActivityCard: buildActivityCard,
    buildHelpCard: buildHelpCard,
    buildHomeCard: buildHomeCard
  };
  const builderFn = map[builder] || buildHomeCard;
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(builderFn()))
    .build();
}

function splitCsv_(s) {
  if (!s) return [];
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

function escapeHtml_(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
