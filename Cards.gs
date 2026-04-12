// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * Cards.gs — All CardService UI for the emAIl Sentinel add-on.
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

  // First-use onboarding
  var setupSection = null;
  if (!settings.geminiApiKey || rules.length === 0) {
    setupSection = CardService.newCardSection()
      .setHeader('<b>Quick setup</b>');
    var steps = [];
    if (!settings.geminiApiKey) {
      steps.push('\u2610 Open <b>Settings</b> and paste your Gemini API key');
    } else {
      steps.push('\u2611 Gemini API key configured');
    }
    if (rules.length === 0) {
      steps.push('\u2610 Create a rule or click <b>Starter rules</b> below');
    } else {
      steps.push('\u2611 ' + rules.length + ' rule(s) created');
    }
    if (!monitoring) {
      steps.push('\u2610 Click <b>Start monitoring</b> above');
    } else {
      steps.push('\u2611 Monitoring active');
    }
    setupSection.addWidget(CardService.newTextParagraph().setText(steps.join('<br>')));
  }

  const navSection = CardService.newCardSection()
    .addWidget(CardService.newTextButton()
      .setText('Rules')
      .setOnClickAction(navAction_('buildRulesCard')))
    .addWidget(CardService.newTextButton()
      .setText('Starter rules')
      .setOnClickAction(navAction_('buildStarterRulesCard')))
    .addWidget(CardService.newTextButton()
      .setText('Settings')
      .setOnClickAction(navAction_('buildSettingsCard')))
    .addWidget(CardService.newTextButton()
      .setText('Activity log')
      .setOnClickAction(navAction_('buildActivityCard')))
    .addWidget(CardService.newTextButton()
      .setText('Help')
      .setOnClickAction(navAction_('buildHelpCard')));

  var builder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('emAIl Sentinel\u2122')
      .setImageUrl('https://lh3.googleusercontent.com/d/1C-0LwVLpc4Dm_VZXIsBbvAuMrsgKJ0M2')
      .setImageStyle(CardService.ImageStyle.CIRCLE))
    .addSection(statusSection);
  if (setupSection) builder.addSection(setupSection);
  builder.addSection(navSection);
  return builder.build();
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
  try {
    var result = runMailCheck() || {};
    var msg = 'Check complete: ' + (result.messagesChecked || 0) + ' new email(s), ' +
      (result.matchesFound || 0) + ' match(es).';
    return refreshHome_(msg);
  } catch (err) {
    return notificationResponse_('Check failed: ' + (err.message || err));
  }
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

  const channels = [];
  if (sms !== '\u2014') channels.push('SMS');
  if (chat !== '\u2014') channels.push('Chat');
  if (google !== '\u2014') channels.push(google);
  const channelSummary = channels.length > 0 ? channels.join(', ') : 'None configured';

  const section = CardService.newCardSection()
    .setHeader('<b>' + escapeHtml_(rule.name) + '</b> &nbsp; ' + status)
    .addWidget(CardService.newDecoratedText().setTopLabel('Labels').setText(escapeHtml_(labels)))
    .addWidget(CardService.newDecoratedText().setTopLabel('Rule').setText(escapeHtml_(ruleText)))
    .addWidget(CardService.newDecoratedText().setTopLabel('Channels').setText(escapeHtml_(channelSummary)));

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
  const rule = getRuleById(e.parameters.ruleId);
  const name = rule ? rule.name : 'this rule';
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText('Delete <b>' + escapeHtml_(name) + '</b>? This cannot be undone.'))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('Delete')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(actionWithRule_('handleConfirmDeleteRule', e.parameters.ruleId)))
      .addButton(CardService.newTextButton()
        .setText('Cancel')
        .setOnClickAction(action_('handleCancelDelete'))));
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Confirm delete'))
    .addSection(section)
    .build();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

function handleConfirmDeleteRule(e) {
  deleteRule(e.parameters.ruleId);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popToRoot().updateCard(buildRulesCard()))
    .setNotification(CardService.newNotification().setText('Rule deleted.'))
    .build();
}

function handleCancelDelete(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard())
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

  const hasChannel = smsNumbers.length > 0 ||
    chatSpaces.length > 0 || calendarEnabled || sheetsEnabled || tasksEnabled;
  const msg = hasChannel ? 'Rule saved.'
    : 'Rule saved, but no alert channels configured. Edit the rule to add at least one.';

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard().updateCard(buildRulesCard()))
    .setNotification(CardService.newNotification().setText(msg))
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
    .setHeader('<b>Gemini (rule evaluation)</b>');
  if (s.geminiApiKey) {
    aiSection.addWidget(CardService.newDecoratedText()
      .setTopLabel('Current key')
      .setText('....' + s.geminiApiKey.slice(-4)));
    aiSection.addWidget(CardService.newTextInput()
      .setFieldName('geminiApiKey')
      .setTitle('New API key (leave blank to keep current)')
      .setHint('Only fill in to replace the current key')
      .setValue(''));
  } else {
    aiSection.addWidget(CardService.newTextInput()
      .setFieldName('geminiApiKey')
      .setTitle('Gemini API key')
      .setHint('Get one free at aistudio.google.com/app/apikey')
      .setValue(''));
  }

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
      .addItem('Only check during business hours', 'true', !!s.businessHoursEnabled));
  var bizStart = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('businessHoursStart')
    .setTitle('Start');
  var bizEnd = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('businessHoursEnd')
    .setTitle('End');
  var savedStart = s.businessHoursStart || '9:00 AM';
  var savedEnd = s.businessHoursEnd || '9:00 PM';
  for (var bh = 0; bh < 24; bh++) {
    for (var bm = 0; bm < 60; bm += 30) {
      var h12 = bh === 0 ? 12 : bh > 12 ? bh - 12 : bh;
      var ap = bh < 12 ? 'AM' : 'PM';
      var tLabel = h12 + ':' + (bm === 0 ? '00' : '30') + ' ' + ap;
      bizStart.addItem(tLabel, tLabel, tLabel === savedStart);
      bizEnd.addItem(tLabel, tLabel, tLabel === savedEnd);
    }
  }
  bizSection.addWidget(bizStart).addWidget(bizEnd);

  const smsSection = CardService.newCardSection()
    .setHeader('<b>SMS provider</b>')
    .addWidget(CardService.newTextParagraph().setText(
      'Pick a provider below. Click <b>SMS setup guide</b> at the bottom for a comparison and sign-up links.'));
  const smsSelect = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('smsProvider')
    .setTitle('Provider')
    .setOnChangeAction(action_('handleSmsProviderChange'));
  SMS_PROVIDERS.forEach(key => {
    const info = SMS_PROVIDER_INFO[key];
    const label = key === 'none' ? 'None (disable SMS)' : info.label + ' (' + info.cost + ')';
    smsSelect.addItem(label, key, s.smsProvider === key);
  });
  smsSection.addWidget(smsSelect);

  const provider = s.smsProvider || 'none';
  const SMS_FIELD_DEFS_ = {
    textbelt: [{ field: 'textbeltApiKey', title: 'Textbelt API key', hint: 'Use "textbelt" for 1 free msg/day, or buy at textbelt.com' }],
    telnyx: [{ field: 'telnyxApiKey', title: 'Telnyx API key' }, { field: 'telnyxFromNumber', title: 'Telnyx "From" number (E.164)' }],
    plivo: [{ field: 'plivoAuthId', title: 'Plivo Auth ID' }, { field: 'plivoAuthToken', title: 'Plivo Auth Token' }, { field: 'plivoFromNumber', title: 'Plivo "From" number (E.164)' }],
    twilio: [{ field: 'twilioAccountSid', title: 'Twilio Account SID' }, { field: 'twilioAuthToken', title: 'Twilio Auth Token' }, { field: 'twilioFromNumber', title: 'Twilio "From" number (E.164)' }],
    clicksend: [{ field: 'clicksendUsername', title: 'ClickSend username (your email)' }, { field: 'clicksendApiKey', title: 'ClickSend API key' }],
    vonage: [{ field: 'vonageApiKey', title: 'Vonage API key' }, { field: 'vonageApiSecret', title: 'Vonage API secret' }],
    webhook: [{ field: 'smsWebhookUrl', title: 'Generic webhook URL', hint: 'Receives POST {"to":"...","body":"..."}. Self-deploy only.' }]
  };
  if (provider !== 'none' && SMS_FIELD_DEFS_[provider]) {
    SMS_FIELD_DEFS_[provider].forEach(function(f) {
      var w = CardService.newTextInput()
        .setFieldName(f.field)
        .setTitle(f.title)
        .setValue(s[f.field] || '');
      if (f.hint) w.setHint(f.hint);
      smsSection.addWidget(w);
    });
    smsSection.addWidget(CardService.newTextInput()
      .setFieldName('smsTestNumber')
      .setTitle('Test phone number')
      .setHint('E.164 format: +15551234567')
      .setValue(s.smsTestNumber || ''));
  }

  // ── Google-native alert channels (free) ─────────────────────────────
  const googleSection = CardService.newCardSection()
    .setHeader('<b>Google alert channels (free)</b>')
    .addWidget(CardService.newTextParagraph().setText(
      'These use your existing Google account — no third-party sign-up, no cost.'));

  // Google Chat — individual name/URL pairs (up to 3 spaces)
  var chatSpacesArr = [];
  try { chatSpacesArr = JSON.parse(s.chatSpaces || '[]'); } catch (e) {}
  if (!Array.isArray(chatSpacesArr)) chatSpacesArr = [];
  var chatSlots = Math.min(Math.max(chatSpacesArr.length + 1, 1), 3);
  for (var ci = 0; ci < chatSlots; ci++) {
    var cs = chatSpacesArr[ci] || {};
    googleSection.addWidget(CardService.newTextInput()
      .setFieldName('chatSpaceName' + ci)
      .setTitle('Chat space ' + (ci + 1) + ' name')
      .setHint(ci === 0 ? 'e.g. "emAIl Sentinel alerts"' : '')
      .setValue(cs.name || ''));
    googleSection.addWidget(CardService.newTextInput()
      .setFieldName('chatSpaceUrl' + ci)
      .setTitle('Chat space ' + (ci + 1) + ' webhook URL')
      .setHint(ci === 0 ? 'Paste the webhook URL from Google Chat' : '')
      .setValue(cs.url || ''));
  }
  googleSection.addWidget(CardService.newTextParagraph().setText(
    '<font color="#888888">Requires a Google Workspace paid account. ' +
    'Open a Space at <a href="https://chat.google.com">chat.google.com</a>, ' +
    'click the space name in the header \u25b8 Apps & integrations \u25b8 Webhooks \u25b8 create one.</font>'));

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

  const prev = loadSettings();
  const smsProvider = get('smsProvider') || 'none';

  // Build chat spaces JSON from individual name/URL pairs
  var chatSpacesArr = [];
  for (var ci = 0; ci < 3; ci++) {
    var csName = get('chatSpaceName' + ci);
    var csUrl = get('chatSpaceUrl' + ci);
    if (csName && csUrl) {
      if (csUrl.indexOf('https://') !== 0) {
        return notificationResponse_('Chat space ' + (ci + 1) + ' URL must start with https://');
      }
      chatSpacesArr.push({ name: csName, url: csUrl });
    }
  }

  const next = {
    geminiApiKey: get('geminiApiKey') || prev.geminiApiKey || '',
    geminiModel: get('geminiModel') || GEMINI_DEFAULT_MODEL,
    pollMinutes: parseInt(get('pollMinutes') || '5', 10),
    businessHoursEnabled: getCheckbox('businessHoursEnabled'),
    businessHoursStart: get('businessHoursStart') || '9:00 AM',
    businessHoursEnd: get('businessHoursEnd') || '9:00 PM',
    smsProvider: smsProvider,
    // Only update the selected provider's fields; preserve all others
    textbeltApiKey: smsProvider === 'textbelt' ? get('textbeltApiKey') : (prev.textbeltApiKey || ''),
    telnyxApiKey: smsProvider === 'telnyx' ? get('telnyxApiKey') : (prev.telnyxApiKey || ''),
    telnyxFromNumber: smsProvider === 'telnyx' ? get('telnyxFromNumber') : (prev.telnyxFromNumber || ''),
    plivoAuthId: smsProvider === 'plivo' ? get('plivoAuthId') : (prev.plivoAuthId || ''),
    plivoAuthToken: smsProvider === 'plivo' ? get('plivoAuthToken') : (prev.plivoAuthToken || ''),
    plivoFromNumber: smsProvider === 'plivo' ? get('plivoFromNumber') : (prev.plivoFromNumber || ''),
    twilioAccountSid: smsProvider === 'twilio' ? get('twilioAccountSid') : (prev.twilioAccountSid || ''),
    twilioAuthToken: smsProvider === 'twilio' ? get('twilioAuthToken') : (prev.twilioAuthToken || ''),
    twilioFromNumber: smsProvider === 'twilio' ? get('twilioFromNumber') : (prev.twilioFromNumber || ''),
    clicksendUsername: smsProvider === 'clicksend' ? get('clicksendUsername') : (prev.clicksendUsername || ''),
    clicksendApiKey: smsProvider === 'clicksend' ? get('clicksendApiKey') : (prev.clicksendApiKey || ''),
    vonageApiKey: smsProvider === 'vonage' ? get('vonageApiKey') : (prev.vonageApiKey || ''),
    vonageApiSecret: smsProvider === 'vonage' ? get('vonageApiSecret') : (prev.vonageApiSecret || ''),
    smsWebhookUrl: smsProvider === 'webhook' ? get('smsWebhookUrl') : (prev.smsWebhookUrl || ''),
    smsTestNumber: smsProvider !== 'none' ? get('smsTestNumber') : (prev.smsTestNumber || ''),
    chatSpaces: JSON.stringify(chatSpacesArr),
    calendarId: get('calendarId'),
    sheetsId: get('sheetsId'),
    tasksListId: get('tasksListId')
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
  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText('Reset the seen-message baseline? The next check will re-scan all labels and skip alerting on existing messages.'))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('Reset')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(action_('handleConfirmResetBaseline')))
      .addButton(CardService.newTextButton()
        .setText('Cancel')
        .setOnClickAction(action_('handlePopCard'))));
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Confirm reset'))
    .addSection(section)
    .build();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

function handleConfirmResetBaseline(e) {
  resetSeen();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard())
    .setNotification(CardService.newNotification().setText('Seen-mail baseline cleared.'))
    .build();
}

function handleSmsProviderChange(e) {
  const inputs = e.commonEventObject.formInputs || {};
  const v = inputs.smsProvider;
  const provider = (v && v.stringInputs && v.stringInputs.value && v.stringInputs.value[0]) || 'none';
  const settings = loadSettings();
  settings.smsProvider = provider;
  saveSettings(settings);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildSettingsCard()))
    .build();
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

function buildActivityCard(offset) {
  offset = offset || 0;
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

  const LOG_PAGE_SIZE = 20;
  const reversed = entries.slice().reverse();
  var pageEntries = reversed.slice(offset, offset + LOG_PAGE_SIZE);
  var body = pageEntries.map(escapeHtml_).join('<br>');
  card.addSection(CardService.newCardSection().addWidget(
    CardService.newTextParagraph().setText(body)));

  var hasMore = reversed.length > offset + LOG_PAGE_SIZE;
  if (hasMore) {
    card.addSection(CardService.newCardSection().addWidget(
      CardService.newTextButton()
        .setText('Show older (' + (reversed.length - offset - LOG_PAGE_SIZE) + ' more)')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('handleShowOlderLog')
          .setParameters({ offset: String(offset + LOG_PAGE_SIZE) }))));
  }
  return card.build();
}

function handleRefreshLog(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildActivityCard()))
    .build();
}

function handleShowOlderLog(e) {
  var offset = parseInt(e.parameters.offset || '0', 10);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildActivityCard(offset)))
    .build();
}

function handleClearLog(e) {
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText('Clear the entire activity log? This cannot be undone.'))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('Clear')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(action_('handleConfirmClearLog')))
      .addButton(CardService.newTextButton()
        .setText('Cancel')
        .setOnClickAction(action_('handleCancelClearLog'))));
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Confirm clear'))
    .addSection(section)
    .build();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

function handleConfirmClearLog(e) {
  clearLog();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popToRoot().updateCard(buildActivityCard()))
    .setNotification(CardService.newNotification().setText('Log cleared.'))
    .build();
}

function handleCancelClearLog(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard())
    .build();
}

// ─────────────────────────────────────────────────────────────────────────────
// Help
// ─────────────────────────────────────────────────────────────────────────────

function buildHelpCard() {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('emAIl Sentinel\u2122 Help'));
  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(
      'Tap a topic below for details.'));
  var topics = [
    { id: 'quickstart', label: 'Quick start & writing rules' },
    { id: 'examples',   label: 'Rule examples by channel' },
    { id: 'channels',   label: 'Alert channel setup' },
    { id: 'pricing',    label: 'Gemini pricing & models' },
    { id: 'settings',   label: 'Settings & troubleshooting' }
  ];
  topics.forEach(function(t) {
    section.addWidget(CardService.newTextButton()
      .setText(t.label)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('handleShowHelpTopic')
        .setParameters({ topic: t.id })));
  });
  card.addSection(section);
  card.addSection(CardService.newCardSection()
    .addWidget(CardService.newImage()
      .setImageUrl('https://lh3.googleusercontent.com/d/1C-0LwVLpc4Dm_VZXIsBbvAuMrsgKJ0M2')
      .setAltText('JJJJJ Enterprises, LLC'))
    .addWidget(CardService.newTextParagraph().setText(
      '<font color="#888888">emAIl Sentinel\u2122 is a product of JJJJJ Enterprises, LLC.</font>')));
  return card.build();
}

function handleShowHelpTopic(e) {
  var topicId = e.parameters.topic;
  var topics = helpTopics_();
  var topic = topics[topicId] || { title: 'Help', content: 'Topic not found.' };
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(topic.title))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText(topic.content)))
    .build();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

function helpTopics_() {
  return {
    quickstart: {
      title: 'Quick start & rules',
      content:
        '<b>Quick start</b><br>' +
        '1. Open <b>Settings</b> and paste your Gemini API key. Get one free at <a href="https://aistudio.google.com/app/apikey">aistudio.google.com/app/apikey</a>.<br>' +
        '2. (Optional) Configure SMS \u2014 pick a provider in Settings.<br>' +
        '3. Open <b>Rules</b> and click <b>+ New rule</b>, or click <b>Starter rules</b> on the home card to create 5 pre-built rules (urgent emails, invoices, shipping updates, security alerts, subscription renewals). Starter rules are created disabled \u2014 edit each to add alert recipients and enable it.<br>' +
        '4. Click <b>Start monitoring</b>. A time-driven trigger runs in the background even when Gmail is closed.<br><br>' +
        '<b>Writing a rule</b><br>' +
        'Rules are plain English. Be specific about senders, subjects, attachments, or body keywords. Examples:<br>' +
        '\u2022 "Any email from @tma.com with a PDF that looks like an invoice."<br>' +
        '\u2022 "Subject contains URGENT or CRITICAL."<br>' +
        '\u2022 "Email from boss@company.com asking for a status update."<br><br>' +
        'Each rule has an <b>Alert message format</b> field \u2014 plain-English instructions that tell Gemini how to format the alert. The default includes date, sender, subject, summary, and action items.<br><br>' +
        '<b>Labels</b><br>' +
        'Gmail uses labels rather than folders. Use INBOX for the inbox, or any label name as shown in Gmail. Multiple labels: comma-separated.'
    },
    examples: {
      title: 'Rule examples',
      content:
        '<b>SMS alerts</b> \u2014 urgent, time-sensitive<br>' +
        '\u2022 <b>Server down:</b> "Automated email about a server outage or critical alert." \u2192 SMS to on-call<br>' +
        '\u2022 <b>Wire transfer:</b> "Email from the bank confirming a wire transfer over $10,000." \u2192 SMS to CFO<br><br>' +
        '<b>Google Chat</b> \u2014 team-visible<br>' +
        '\u2022 <b>Sales lead:</b> "Email from a new contact mentioning pricing or demo." \u2192 Chat "Sales Leads"<br>' +
        '\u2022 <b>Support escalation:</b> "Subject contains ESCALATION or P1." \u2192 Chat "Escalations"<br><br>' +
        '<b>Calendar</b> \u2014 time-based follow-ups<br>' +
        '\u2022 <b>Meeting request:</b> "Any email asking to schedule a meeting." \u2192 Calendar event<br>' +
        '\u2022 <b>Deadline:</b> "Email mentioning a deadline or due date." \u2192 Calendar event<br><br>' +
        '<b>Sheets</b> \u2014 audit trails<br>' +
        '\u2022 <b>Compliance log:</b> "Email from a regulatory body or auditor." \u2192 Sheets row<br>' +
        '\u2022 <b>Expense tracking:</b> "Emails with receipts or payment confirmations." \u2192 Sheets log<br><br>' +
        '<b>Tasks</b> \u2014 to-do items<br>' +
        '\u2022 <b>Action items:</b> "Email explicitly asking me to do, review, or approve something." \u2192 Task<br>' +
        '\u2022 <b>Follow-up:</b> "Email saying \'let me know\' or \'awaiting your response\'." \u2192 Task<br><br>' +
        '<b>Combining channels</b><br>' +
        '\u2022 <b>Critical vendor issue:</b> SMS + Chat + Calendar + Sheets<br>' +
        '\u2022 <b>New hire onboarding:</b> Task + Sheets + Chat'
    },
    channels: {
      title: 'Alert channel setup',
      content:
        '<b>SMS</b> \u2014 six providers supported. Click <b>SMS setup guide</b> in Settings for a comparison.<br>' +
        '\u2022 <b>Textbelt</b> \u2014 easiest: 1 free SMS/day with key "textbelt", no sign-up<br>' +
        '\u2022 <b>ClickSend</b> \u2014 free trial, username + API key, no phone number<br>' +
        '\u2022 <b>Vonage</b> \u2014 free trial credits, no credit card<br>' +
        '\u2022 <b>Telnyx</b> \u2014 cheapest (~$0.004/SMS), needs a phone number (~$1/mo)<br>' +
        '\u2022 <b>Plivo</b> \u2014 $10 free credit, phone number ~$0.80/mo<br>' +
        '\u2022 <b>Twilio</b> \u2014 most popular, $15 free credit, phone number ~$1.15/mo<br>' +
        '\u2022 <b>Generic webhook</b> \u2014 self-deployed installs only<br>' +
        'After configuring, click <b>Send test SMS</b> to verify.<br><br>' +
        '<b>Google Chat</b> \u2014 requires a <b>Google Workspace paid account</b>.<br>' +
        '1. Go to <a href="https://chat.google.com">chat.google.com</a> and create a Space<br>' +
        '2. Click the space name in the header \u25b8 Apps & integrations \u25b8 Webhooks<br>' +
        '3. Add a webhook, copy the URL, paste into Settings<br>' +
        '4. Select the space name in each rule<br><br>' +
        '<b>Calendar</b> \u2014 creates a 15-minute event with alert details. Phone notifications fire if calendar notifications are on.<br><br>' +
        '<b>Sheets</b> \u2014 appends a row to a spreadsheet (auto-created on first alert). Great for audit trails.<br><br>' +
        '<b>Tasks</b> \u2014 creates a task in Google Tasks. Shows in Gmail sidebar and the Tasks app.'
    },
    pricing: {
      title: 'Gemini pricing & models',
      content:
        'emAIl Sentinel calls Gemini twice per email per rule: once to evaluate, once to format the alert.<br><br>' +
        '<b>Models (select in Settings)</b><br>' +
        '\u2022 <b>2.0 Flash</b> (default) \u2014 fastest, 1,500 free requests/day<br>' +
        '\u2022 <b>2.0 Flash Lite</b> \u2014 ultra-low-cost, slightly less capable<br>' +
        '\u2022 <b>1.5 Flash</b> \u2014 same pricing as 2.0 Flash, reliable fallback<br>' +
        '\u2022 <b>1.5 Pro</b> \u2014 highest accuracy, 50 free requests/day, 17\u00d7 cost<br><br>' +
        '<b>Free tier</b> (no billing needed)<br>' +
        'Get a key at <a href="https://aistudio.google.com/app/apikey">aistudio.google.com/app/apikey</a> \u2014 no credit card. Flash: 1,500 requests/day. At the limit, Gemini returns 429; calls resume next day.<br><br>' +
        '<b>Estimate your usage</b><br>' +
        'new emails/day \u00d7 active rules \u00d7 2 = daily API calls<br>' +
        '\u2022 20 emails \u00d7 1 rule = 40 calls \u2014 well within free<br>' +
        '\u2022 50 emails \u00d7 3 rules = 300 calls \u2014 well within free<br>' +
        '\u2022 100 emails \u00d7 5 rules = 1,000 calls \u2014 approaching limit<br><br>' +
        '<b>Paid rates</b> (verify at <a href="https://ai.google.dev/pricing">ai.google.dev/pricing</a>)<br>' +
        '\u2022 Flash: ~$0.075/M input, ~$0.30/M output<br>' +
        '\u2022 Flash Lite: ~$0.04/M input, ~$0.15/M output<br>' +
        '\u2022 Pro: ~$1.25/M input, ~$5.00/M output<br>' +
        '50 emails/day, 3 rules \u2248 under <b>$1/month</b>.<br><br>' +
        '<b>Tips to minimize usage</b><br>' +
        '\u2022 Enable <b>Business hours</b> \u2014 skips checks outside your window<br>' +
        '\u2022 Watch specific labels instead of INBOX<br>' +
        '\u2022 Combine related conditions into one rule<br>' +
        '\u2022 Keep alert format prompts concise'
    },
    settings: {
      title: 'Settings & troubleshooting',
      content:
        '<b>Business hours</b><br>' +
        'Restrict checks to a daily window. Outside hours, the trigger fires but skips the check \u2014 no Gemini quota used.<br><br>' +
        '<b>Polling</b><br>' +
        'Time-driven triggers fire every 1\u201330 minutes. The first run baselines existing messages so you don\'t get a flood of alerts.<br><br>' +
        '<b>Privacy</b><br>' +
        'Settings, rules, seen messages, and the activity log are stored in UserProperties \u2014 private to your Google account. Email content goes only to Gemini and your configured alert channels.<br><br>' +
        '<b>Troubleshooting</b><br>' +
        '\u2022 <i>"No Gemini API key configured"</i> \u2014 open Settings, paste a key, click <b>Test Gemini</b><br>' +
        '\u2022 <i>"Label \'...\' fetch failed"</i> \u2014 verify the label exists in Gmail (case-insensitive)<br>' +
        '\u2022 <i>SMS not delivered</i> \u2014 check Activity Log for the provider\'s error<br>' +
        '\u2022 <i>Alerts for old mail</i> \u2014 open Settings, click <b>Reset baseline</b><br>' +
        '\u2022 Still stuck? <b><a href="https://github.com/StephenRJohns/mailsentinel/issues">Open a GitHub issue</a></b> \u2014 issues are tracked, searchable, and get the fastest response.<br><br>' +
        '<font color="#888888">Google, Gmail, Google Workspace, Google Chat, Google Calendar, Google Sheets, Google Tasks, and Gemini are trademarks of Google LLC. Not affiliated with or endorsed by Google.</font>'
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Starter rules
// ─────────────────────────────────────────────────────────────────────────────

const STARTER_RULES_ = [
  {
    name: 'Urgent emails',
    ruleText: 'Any email marked as urgent or high priority, or with URGENT, CRITICAL, or ASAP in the subject or body.'
  },
  {
    name: 'Invoices & payment requests',
    ruleText: 'Any email that appears to be an invoice, bill, or request for payment.'
  },
  {
    name: 'Shipping & delivery updates',
    ruleText: 'Any email from a shipping carrier such as FedEx, UPS, USPS, DHL, or Amazon with a tracking number or delivery status update.'
  },
  {
    name: 'Security & account alerts',
    ruleText: 'Any email about a password reset, suspicious login attempt, unauthorized access, or security alert for any account.'
  },
  {
    name: 'Bills & subscription renewals',
    ruleText: 'Any email about a subscription renewal, billing statement, or upcoming charge to a payment method.'
  }
];

function buildStarterRulesCard() {
  const existing = loadRules();
  const existingNames = existing.map(function(r) { return r.name; });
  const toCreate = STARTER_RULES_.filter(function(sr) {
    return existingNames.indexOf(sr.name) < 0;
  });

  const section = CardService.newCardSection();

  if (toCreate.length === 0) {
    section.setHeader('All starter rules already exist.');
    section.addWidget(CardService.newTextButton()
      .setText('Back')
      .setOnClickAction(action_('handlePopCard')));
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('Starter rules'))
      .addSection(section)
      .build();
  }

  section.setHeader(toCreate.length + ' rules will be created (disabled) watching your INBOX. Edit each rule to add alert recipients and enable it.');

  toCreate.forEach(function(r) {
    section.addWidget(CardService.newTextParagraph()
      .setText('\u2022 <b>' + r.name + '</b><br>' + r.ruleText));
  });

  section
    .addWidget(CardService.newTextButton()
      .setText('Create starter rules')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(action_('handleCreateStarterRules')))
    .addWidget(CardService.newTextButton()
      .setText('Cancel')
      .setOnClickAction(action_('handlePopCard')));

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Starter rules'))
    .addSection(section)
    .build();
}

function handlePopCard(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard())
    .build();
}

function handleCreateStarterRules(e) {
  try {
    const rules = loadRules();
    const existingNames = rules.map(function(r) { return r.name; });
    let count = 0;
    STARTER_RULES_.forEach(function(sr) {
      if (existingNames.indexOf(sr.name) >= 0) return;
      const rule = createRule(sr.name, ['INBOX'], sr.ruleText, {});
      rule.enabled = false;
      rules.push(rule);
      count++;
    });
    saveRules(rules);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().popToRoot().updateCard(buildRulesCard()))
      .setNotification(CardService.newNotification()
        .setText(count + ' starter rules created (disabled). Edit each to add alert recipients and enable.'))
      .build();
  } catch (err) {
    return notificationResponse_('Could not create starter rules: ' + (err.message || err));
  }
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
    buildHomeCard: buildHomeCard,
    buildStarterRulesCard: buildStarterRulesCard
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
