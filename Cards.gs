// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * Cards.gs — All CardService UI for the mAIl Alert add-on.
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
    .addWidget(CardService.newDecoratedText()
      .setTopLabel('Monitoring')
      .setText(monitoring ? 'Running' : 'Stopped'))
    .addWidget(CardService.newDecoratedText()
      .setTopLabel('Rules')
      .setText(enabledCount + ' enabled / ' + rules.length + ' total'))
    .addWidget(CardService.newDecoratedText()
      .setTopLabel('Gemini API key')
      .setText(settings.geminiApiKey ? 'Configured' : 'NOT configured'));

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
    .setHeader(CardService.newCardHeader().setTitle('mAIl Alert\u2122'))
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
  catch (err) { return notificationResponse_('Check failed: ' + (err.message || err)); }
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
  const chat   = (rule.alerts.chatSpaces || []).join(', ') || '—';
  const googleChannels = [];
  if (rule.alerts.calendarEnabled) googleChannels.push('Calendar');
  if (rule.alerts.sheetsEnabled)   googleChannels.push('Sheets');
  if (rule.alerts.tasksEnabled)    googleChannels.push('Tasks');
  const google = googleChannels.join(', ') || '—';
  const ruleText = (rule.ruleText || '').length > 140
    ? rule.ruleText.substring(0, 137) + '…'
    : rule.ruleText;

  const section = CardService.newCardSection()
    .setHeader('<b>' + escapeHtml_(rule.name) + '</b> &nbsp; ' + status)
    .addWidget(CardService.newDecoratedText().setTopLabel('Labels').setText(escapeHtml_(labels)))
    .addWidget(CardService.newDecoratedText().setTopLabel('Rule').setText(escapeHtml_(ruleText)))
    .addWidget(CardService.newDecoratedText().setTopLabel('Email').setText(escapeHtml_(emails)))
    .addWidget(CardService.newDecoratedText().setTopLabel('SMS').setText(escapeHtml_(sms)))
    .addWidget(CardService.newDecoratedText().setTopLabel('Chat').setText(escapeHtml_(chat)))
    .addWidget(CardService.newDecoratedText().setTopLabel('Google').setText(escapeHtml_(google)));

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

  // Google Chat spaces (names from the registry configured in Settings)
  const settings = loadSettings();
  const chatRegistry = parseChatSpaces_(settings.chatSpaces);
  const chatNames = Object.keys(chatRegistry);
  if (chatNames.length) {
    section.addWidget(CardService.newTextInput()
      .setFieldName('chatSpaces')
      .setTitle('Google Chat spaces to notify (comma separated)')
      .setHint('Names from Settings: ' + chatNames.join(', '))
      .setValue((alerts.chatSpaces || []).join(', ')));
  } else {
    section.addWidget(CardService.newTextParagraph().setText(
      '<font color="#888888">Google Chat: no spaces configured yet. Add webhook URLs in Settings.</font>'));
  }

  // Google Calendar, Sheets, Tasks — checkboxes
  section.addWidget(CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .setFieldName('calendarEnabled')
    .addItem('Create a Google Calendar event on match', 'true',
      !!alerts.calendarEnabled));

  section.addWidget(CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .setFieldName('sheetsEnabled')
    .addItem('Log to Google Sheets on match', 'true',
      !!alerts.sheetsEnabled));

  section.addWidget(CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .setFieldName('tasksEnabled')
    .addItem('Create a Google Task on match', 'true',
      !!alerts.tasksEnabled));

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
  const chatSpaces = splitCsv_(get('chatSpaces'));
  const getCheckbox = key => {
    const v = inputs[key];
    if (!v || !v.stringInputs || !v.stringInputs.value) return false;
    return v.stringInputs.value.indexOf('true') >= 0;
  };
  const calendarEnabled = getCheckbox('calendarEnabled');
  const sheetsEnabled = getCheckbox('sheetsEnabled');
  const tasksEnabled = getCheckbox('tasksEnabled');

  if (!name)     return notificationResponse_('Please enter a rule name.');
  if (!ruleText) return notificationResponse_('Please enter a rule description.');
  if (!labels.length) return notificationResponse_('Please list at least one Gmail label.');

  const alertsObj = {
    emailAddresses: emailAddresses,
    smsNumbers: smsNumbers,
    chatSpaces: chatSpaces,
    calendarEnabled: calendarEnabled,
    sheetsEnabled: sheetsEnabled,
    tasksEnabled: tasksEnabled
  };

  const id = e.parameters.ruleId;
  let rule;
  if (id) {
    rule = getRuleById(id);
    if (!rule) return notificationResponse_('Rule no longer exists.');
    rule.name = name;
    rule.labels = labels;
    rule.ruleText = ruleText;
    rule.alertMessagePrompt = alertMessagePrompt;
    rule.alerts = alertsObj;
  } else {
    rule = createRule(name, labels, ruleText,
      alertsObj,
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
      'Google doesn\'t provide a first-party SMS API. Pick a provider below. ' +
      'Click <b>SMS setup guide</b> at the bottom for a comparison and sign-up links.'));
  const smsSelect = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('smsProvider')
    .setTitle('Provider');
  SMS_PROVIDERS.forEach(key => {
    const info = SMS_PROVIDER_INFO[key];
    const label = key === 'none' ? 'None (disable SMS)' : info.label + ' (' + info.cost + ')';
    smsSelect.addItem(label, key, s.smsProvider === key);
  });
  smsSection.addWidget(smsSelect);

  // Textbelt
  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('textbeltApiKey')
    .setTitle('Textbelt API key')
    .setHint('Use "textbelt" for 1 free msg/day, or buy at textbelt.com')
    .setValue(s.textbeltApiKey || ''));
  // Telnyx
  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('telnyxApiKey')
    .setTitle('Telnyx API key')
    .setValue(s.telnyxApiKey || ''));
  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('telnyxFromNumber')
    .setTitle('Telnyx "From" number (E.164)')
    .setValue(s.telnyxFromNumber || ''));
  // Plivo
  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('plivoAuthId')
    .setTitle('Plivo Auth ID')
    .setValue(s.plivoAuthId || ''));
  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('plivoAuthToken')
    .setTitle('Plivo Auth Token')
    .setValue(s.plivoAuthToken || ''));
  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('plivoFromNumber')
    .setTitle('Plivo "From" number (E.164)')
    .setValue(s.plivoFromNumber || ''));
  // Twilio
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
    .setTitle('Twilio "From" number (E.164)')
    .setValue(s.twilioFromNumber || ''));
  // ClickSend
  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('clicksendUsername')
    .setTitle('ClickSend username (your email)')
    .setValue(s.clicksendUsername || ''));
  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('clicksendApiKey')
    .setTitle('ClickSend API key')
    .setValue(s.clicksendApiKey || ''));
  // Vonage
  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('vonageApiKey')
    .setTitle('Vonage API key')
    .setValue(s.vonageApiKey || ''));
  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('vonageApiSecret')
    .setTitle('Vonage API secret')
    .setValue(s.vonageApiSecret || ''));
  // Webhook
  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('smsWebhookUrl')
    .setTitle('Generic webhook URL')
    .setHint('Receives POST {"to":"+15551234567","body":"..."}. Self-deploy only — not available in Marketplace installs.')
    .setValue(s.smsWebhookUrl || ''));
  // Test number
  smsSection.addWidget(CardService.newTextInput()
    .setFieldName('smsTestNumber')
    .setTitle('Test phone number (for Send test SMS button)')
    .setHint('E.164 format: +15551234567')
    .setValue(s.smsTestNumber || ''));

  // ── Google-native alert channels (free) ─────────────────────────────
  const googleSection = CardService.newCardSection()
    .setHeader('<b>Google alert channels (free)</b>')
    .addWidget(CardService.newTextParagraph().setText(
      'These use your existing Google account — no third-party sign-up, no cost.'));

  // Google Chat
  googleSection.addWidget(CardService.newTextInput()
    .setFieldName('chatSpaces')
    .setTitle('Google Chat spaces (JSON array)')
    .setMultiline(true)
    .setHint('[{"name":"My Alerts","url":"https://chat.googleapis.com/..."}]')
    .setValue(s.chatSpaces || '[]'));
  googleSection.addWidget(CardService.newTextParagraph().setText(
    '<font color="#888888">Create a Space in Google Chat, then click the dropdown arrow next to ' +
    'the space name > Apps & integrations > Manage webhooks > create one. ' +
    'Copy the URL and add an entry above.</font>'));

  // Calendar
  googleSection.addWidget(CardService.newTextInput()
    .setFieldName('calendarId')
    .setTitle('Google Calendar ID (blank = your primary calendar)')
    .setHint('e.g. your.email@gmail.com or leave blank for primary')
    .setValue(s.calendarId || ''));

  // Sheets
  googleSection.addWidget(CardService.newTextInput()
    .setFieldName('sheetsId')
    .setTitle('Google Sheets ID (blank = auto-create on first alert)')
    .setHint('The long ID from the spreadsheet URL, or leave blank')
    .setValue(s.sheetsId || ''));

  // Tasks
  googleSection.addWidget(CardService.newTextInput()
    .setFieldName('tasksListId')
    .setTitle('Google Tasks list ID (blank = default "My Tasks")')
    .setHint('Leave blank to use your default task list')
    .setValue(s.tasksListId || ''));

  const aliasSection = CardService.newCardSection()
    .setHeader('<b>Alert "From" name</b>')
    .addWidget(CardService.newTextInput()
      .setFieldName('alertFromAlias')
      .setTitle('Display name on outgoing email alerts')
      .setValue(s.alertFromAlias || 'mAIl Alert'));

  const buttons = CardService.newCardSection()
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('Save settings')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(action_('handleSaveSettings')))
      .addButton(CardService.newTextButton()
        .setText('Test Gemini')
        .setOnClickAction(action_('handleTestGemini'))))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('Send test SMS')
        .setOnClickAction(action_('handleTestSms')))
      .addButton(CardService.newTextButton()
        .setText('SMS setup guide')
        .setOnClickAction(action_('handleShowSmsGuide')))
      .addButton(CardService.newTextButton()
        .setText('Reset baseline')
        .setOnClickAction(action_('handleResetBaseline'))));

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Settings'))
    .addSection(aiSection)
    .addSection(pollSection)
    .addSection(bizSection)
    .addSection(smsSection)
    .addSection(googleSection)
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
    textbeltApiKey: get('textbeltApiKey'),
    telnyxApiKey: get('telnyxApiKey'),
    telnyxFromNumber: get('telnyxFromNumber'),
    plivoAuthId: get('plivoAuthId'),
    plivoAuthToken: get('plivoAuthToken'),
    plivoFromNumber: get('plivoFromNumber'),
    twilioAccountSid: get('twilioAccountSid'),
    twilioAuthToken: get('twilioAuthToken'),
    twilioFromNumber: get('twilioFromNumber'),
    clicksendUsername: get('clicksendUsername'),
    clicksendApiKey: get('clicksendApiKey'),
    vonageApiKey: get('vonageApiKey'),
    vonageApiSecret: get('vonageApiSecret'),
    smsWebhookUrl: get('smsWebhookUrl'),
    smsTestNumber: get('smsTestNumber'),
    chatSpaces: get('chatSpaces') || '[]',
    calendarId: get('calendarId'),
    sheetsId: get('sheetsId'),
    tasksListId: get('tasksListId'),
    alertFromAlias: get('alertFromAlias') || 'mAIl Alert'
  };

  if (next.businessHoursEnabled) {
    if (!parse12Hour(next.businessHoursStart)) {
      return notificationResponse_('Business hours start must be 12-hour format, e.g. 9:00 AM.');
    }
    if (!parse12Hour(next.businessHoursEnd)) {
      return notificationResponse_('Business hours end must be 12-hour format, e.g. 9:00 PM.');
    }
  }

  if (next.chatSpaces && next.chatSpaces !== '[]') {
    try {
      const parsed = JSON.parse(next.chatSpaces);
      if (!Array.isArray(parsed)) {
        return notificationResponse_('Chat spaces must be a JSON array, e.g. [{"name":"...","url":"https://..."}]');
      }
    } catch (e) {
      return notificationResponse_('Chat spaces is not valid JSON. Use format: [{"name":"...","url":"https://..."}]');
    }
  }

  const prev = loadSettings();
  saveSettings(next);

  if (isMonitoringActive() && next.pollMinutes !== prev.pollMinutes) {
    installTrigger(next.pollMinutes);
  }

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

function handleTestSms(e) {
  const s = loadSettings();
  if (s.smsProvider === 'none' || !s.smsProvider) {
    return notificationResponse_('No SMS provider selected. Choose one, save, then test.');
  }
  if (!s.smsTestNumber) {
    return notificationResponse_('Enter a test phone number in the Settings SMS section first.');
  }
  const result = testSms(s.smsTestNumber);
  return notificationResponse_(result);
}

function handleShowSmsGuide(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildSmsGuideCard()))
    .build();
}

function handleResetBaseline(e) {
  resetSeen();
  return notificationResponse_('Seen-mail baseline cleared.');
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS Setup Guide card
// ─────────────────────────────────────────────────────────────────────────────

function buildSmsGuideCard() {
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('SMS provider guide'));

  // Comparison table as text
  card.addSection(CardService.newCardSection()
    .setHeader('<b>Which provider should I pick?</b>')
    .addWidget(CardService.newTextParagraph().setText(
      '<b>Easiest to start (no phone number needed):</b><br>' +
      '1. <b>Textbelt</b> — 1 free SMS/day with key "textbelt", or buy more at textbelt.com<br>' +
      '2. <b>ClickSend</b> — free trial credits, just username + API key<br>' +
      '3. <b>Vonage</b> — free credits, no credit card for trial<br><br>' +
      '<b>Cheapest per message (need to buy a phone number):</b><br>' +
      '4. <b>Telnyx</b> — ~$0.004/SMS, number ~$1/mo<br>' +
      '5. <b>Plivo</b> — ~$0.005/SMS, number ~$0.80/mo, $10 free credit<br>' +
      '6. <b>Twilio</b> — ~$0.0079/SMS, number ~$1.15/mo, $15 free credit<br><br>' +
      '<b>Already have your own SMS gateway?</b><br>' +
      '7. <b>Generic webhook</b> — POST to any HTTPS endpoint you control'
    )));

  // Per-provider sections with sign-up links and step-by-step
  var providers = ['textbelt', 'telnyx', 'plivo', 'twilio', 'clicksend', 'vonage', 'webhook'];
  providers.forEach(function(key) {
    var info = SMS_PROVIDER_INFO[key];
    var section = CardService.newCardSection()
      .setHeader('<b>' + info.label + '</b> — ' + info.cost);

    var steps = info.setup.join('<br>');
    section.addWidget(CardService.newTextParagraph().setText(steps));

    if (info.signupUrl) {
      section.addWidget(CardService.newTextButton()
        .setText('Open ' + info.label + ' sign-up page')
        .setOpenLink(CardService.newOpenLink()
          .setUrl(info.signupUrl)
          .setOpenAs(CardService.OpenAs.FULL_SIZE)));
    }
    card.addSection(section);
  });

  // Tips section
  card.addSection(CardService.newCardSection()
    .setHeader('<b>Tips</b>')
    .addWidget(CardService.newTextParagraph().setText(
      '• Phone numbers everywhere must be in E.164 format: +15551234567<br>' +
      '• Most providers have a free trial — start there before committing<br>' +
      '• After entering credentials, click <b>Save settings</b> then <b>Send test SMS</b><br>' +
      '• If the test fails, check the Activity Log for the provider\'s error message<br>' +
      '• You only need to fill in the fields for your chosen provider — the rest are ignored'
    )));

  return card.build();
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
    .setHeader(CardService.newCardHeader().setTitle('mAIl Alert help'))
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
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
