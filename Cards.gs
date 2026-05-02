// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * Cards.gs — All CardService UI for the emAIl Sentinel add-on.
 *
 * Layout overview:
 *   Home card     — quick status, Start/Stop scheduled scans, links to subviews
 *   Rules card    — list of rules with edit/delete/toggle buttons
 *   Rule editor   — name, labels, rule text, alert format, recipients
 *   Settings card — Gemini key/model, poll interval, business hours, SMS
 *   Activity card — scrolling log of recent runs
 *   Help card     — usage instructions
 *
 * All cards are stateless: every action handler reads UserProperties
 * fresh, applies the change, and returns a new card. No in-memory state.
 */

// Brand dark purple — used for status-row values on the home card and as the
// background color of every FILLED TextButton in the add-on so the primary
// CTAs match the logo mark instead of CardService's default Google blue.
// CardService does NOT expose a text-color setter for TEXT-style buttons, so
// nav-style links (Settings/Rules/Activity log/Help, Stop scheduled scans, etc.)
// retain the platform blue — Google owns that color. Apply via
// .setBackgroundColor(BRAND_PURPLE_) immediately after .setTextButtonStyle(FILLED).
const BRAND_PURPLE_ = '#581c87';

// Lighter/brighter purple used to make a secondary FILLED CTA visually
// distinct from the primary BRAND_PURPLE_ buttons on the same card — e.g.
// "Scan email now" sitting beside "Start scheduled scans" on the home card.
const BRAND_PURPLE_LIGHT_ = '#6d28d9';

// CardService does not auto-pick a contrasting text color when you set a
// custom button background — the label keeps the platform default (mid-grey
// on light themes), which is unreadable on dark purple. Wrap every FILLED
// button's setText argument with this helper so the label renders in white.
function whiteText_(s) {
  return '<font color="#ffffff">' + s + '</font>';
}

function blackText_(s) {
  return '<font color="#000000">' + s + '</font>';
}

// Action-color FILLED button backgrounds. Red for destructive (Delete);
// light yellow for caution (Disable a currently-enabled rule). Both
// luminance values comfortably trigger Google's auto contrast: red picks
// white, light yellow picks black, but we wrap the text explicitly with
// whiteText_ / blackText_ for consistency with the BRAND_PURPLE_ pattern.
const BRAND_RED_ = '#c62828';
const BRAND_YELLOW_LIGHT_ = '#fde68a';

// Two navigation paths leave a destination card without Gmail's native back
// arrow: kebab universal-action items use displayAddOnCards (which *replaces*
// the navigation stack) and confirm-delete handlers use popToRoot(). Apps
// Script doesn't expose navigation-stack depth at handler time, so we can't
// reliably re-detect the no-back-arrow state on subsequent updateCard calls
// (e.g. toggling a rule or refreshing the log) — the Home button would
// disappear mid-session. To keep the escape hatch consistent we just
// prepend this section unconditionally on the four root destinations
// (Rules, Settings, Activity log, Help). When the back arrow is also
// visible this is mild redundancy: back arrow steps one card up, Home
// jumps to root.
function homeButtonSection_() {
  return CardService.newCardSection()
    .addWidget(CardService.newTextButton()
      .setText('Home')
      .setOnClickAction(action_('handleGoHome')));
}

// CardService does not expose an event for the system back arrow, so an
// editor cannot show a confirmation dialog before navigation pops it. This
// notice is the user-facing mitigation — each editor card adds it at the top
// so the user knows the back arrow discards unsaved edits.
function buildUnsavedChangesNotice_() {
  return CardService.newCardSection().addWidget(CardService.newTextParagraph()
    .setText('<font color="#b26a00">⚠ Click <b>Save</b> below before tapping the back arrow — the back arrow discards unsaved changes without warning.</font>'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Home
// ─────────────────────────────────────────────────────────────────────────────

function buildHomeCard() {
  const settings = loadSettings();
  const rules = loadRules();
  const monitoring = isMonitoringActive();
  const enabledCount = rules.filter(r => r.enabled).length;

  const tier = getTier();
  const limits = getTierLimits();
  const planLabel = tier === 'pro' ? 'Pro' : 'Free (' + rules.length + '/' + limits.maxRules + ' rules)';

  // Status rows: bold black title, brand dark purple (#581c87) value.
  // TextParagraph (rather than DecoratedText) so each row sits flush-left to
  // match the nav buttons below; a single <br> separates title from value.
  const statusRow_ = function(title, value) {
    return CardService.newTextParagraph().setText(
      '<b>' + title + '</b><br>' +
      '<font color="' + BRAND_PURPLE_ + '">' + value + '</font>');
  };
  const statusSection = CardService.newCardSection()
    .addWidget(statusRow_('Plan', planLabel))
    .addWidget(statusRow_('Scanning', monitoring ? 'Active' : 'Stopped'))
    .addWidget(statusRow_('Rules', enabledCount + ' enabled / ' + rules.length + ' total'))
    .addWidget(statusRow_('Gemini API key', settings.geminiApiKey ? 'Configured' : 'NOT configured'));

  if (tier === 'free') {
    if (isFoundingMemberOfferActive()) {
      statusSection.addWidget(CardService.newTextParagraph()
        .setText('<b>Founding-member lifetime — $79</b><br>' +
          '<font color="#888888">' + foundingMembersRemaining() + ' of ' + FOUNDING_MEMBERS_LIMIT + ' remaining. Retired after 500 sold.</font>'));
    }
    statusSection.addWidget(CardService.newTextButton()
      .setText('Upgrade to Pro')
      .setOpenLink(CardService.newOpenLink().setUrl(UPGRADE_URL)));
  }

  if (monitoring) {
    statusSection.addWidget(CardService.newTextButton()
      .setText('Stop scheduled scans')
      .setOnClickAction(action_('handleStopMonitoring')));
  } else {
    const pollVal = parseInt(settings.pollMinutes, 10) || limits.minPollMinutes;
    // Inline polling-interval dropdown so the user can change cadence without
    // a trip to Settings. handleStartMonitoring persists the selected value
    // into settings.pollMinutes, so the Settings card and next render of the
    // home card both reflect the choice. Option list mirrors POLL_HOUR_OPTIONS_
    // in the Settings card (kept in sync manually since they're in different
    // function scopes).
    const HOME_POLL_OPTIONS = [
      { mins: 60,   label: '1 hour' },
      { mins: 120,  label: '2 hours' },
      { mins: 180,  label: '3 hours' },
      { mins: 240,  label: '4 hours' },
      { mins: 360,  label: '6 hours' },
      { mins: 480,  label: '8 hours' },
      { mins: 720,  label: '12 hours' },
      { mins: 1440, label: '24 hours' }
    ];
    const pollSelect = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('pollMinutes')
      .setTitle('Scan email every')
      .setOnChangeAction(action_('handleHomePollChange'));
    let homePollSelected = false;
    HOME_POLL_OPTIONS.forEach(function(opt) {
      if (opt.mins < limits.minPollMinutes) return;
      const isSel = opt.mins === pollVal;
      if (isSel) homePollSelected = true;
      pollSelect.addItem(opt.label, String(opt.mins), isSel);
    });
    if (!homePollSelected) {
      pollSelect.addItem(
        Math.round(limits.minPollMinutes / 60) + ' hour' + (limits.minPollMinutes === 60 ? '' : 's'),
        String(limits.minPollMinutes),
        true
      );
    }
    statusSection.addWidget(pollSelect);
    statusSection.addWidget(CardService.newTextButton()
      .setText(whiteText_('Start scheduled scans'))
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor(BRAND_PURPLE_)
      .setOnClickAction(action_('handleStartMonitoring')));
  }

  statusSection.addWidget(CardService.newTextButton()
    .setText(whiteText_('Scan email now'))
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setBackgroundColor(BRAND_PURPLE_LIGHT_)
    .setOnClickAction(action_('handleRunCheckNow')));
  // CardService action handlers run blocking and the platform shows only a
  // subtle default spinner during execution. Set expectations on the button
  // beforehand — users have reported that clicking and seeing nothing happen
  // for 10-60 seconds feels broken even though it isn't.
  statusSection.addWidget(CardService.newTextParagraph().setText(
    '<font color="#888888">Scans typically take 10–60 seconds; you\'ll see the result on a confirmation card when it finishes.</font>'));

  // First-use onboarding
  var setupSection = null;
  if (!settings.geminiApiKey || rules.length === 0) {
    setupSection = CardService.newCardSection()
      .setHeader('<b>Quick setup</b>');
    var steps = [];
    var hasGemini = !!settings.geminiApiKey;
    var hasSmsChannel = settings.smsProvider && settings.smsProvider !== 'none' &&
      parseSmsRecipients_(settings.smsRecipients).length > 0;
    var hasChatChannel = Object.keys(parseChatSpaces_(settings.chatSpaces)).length > 0;
    var hasMcpChannel = loadMcpServers().length > 0;
    var hasChannels = hasSmsChannel || hasChatChannel || hasMcpChannel;
    if (hasGemini && hasChannels) {
      steps.push('\u2713 Settings configured');
    } else {
      var indent = '&nbsp;&nbsp;&nbsp;&nbsp;';
      steps.push('- Open <b>Settings</b>');
      steps.push(indent + (hasGemini ? '\u2713' : '-') + ' Paste your Gemini API key');
      steps.push(indent + (hasChannels ? '\u2713' : '-') + ' Set up alert channels');
    }
    if (rules.length === 0) {
      steps.push('- Create a rule or click <b>Starter rules</b> below');
    } else {
      steps.push('\u2713 ' + plural_(rules.length, 'rule') + ' created');
    }
    if (!monitoring) {
      steps.push('- Pick a scan interval above and click <b>Start scheduled scans</b>');
    } else {
      steps.push('\u2713 Scheduled scans active');
    }
    setupSection.addWidget(CardService.newTextParagraph().setText(steps.join('<br>')));
  }

  const navSection = CardService.newCardSection()
    .addWidget(CardService.newTextButton()
      .setText('Settings')
      .setOnClickAction(navAction_('buildSettingsCard')))
    .addWidget(CardService.newTextButton()
      .setText('Starter rules')
      .setOnClickAction(navAction_('buildStarterRulesCard')))
    .addWidget(CardService.newTextButton()
      .setText('Rules')
      .setOnClickAction(navAction_('buildRulesCard')))
    .addWidget(CardService.newTextButton()
      .setText('Activity log')
      .setOnClickAction(navAction_('buildActivityCard')))
    .addWidget(CardService.newTextButton()
      .setText('Help')
      .setOnClickAction(navAction_('buildHelpCard')))
    .addWidget(CardService.newTextButton()
      .setText('Community')
      .setOpenLink(CardService.newOpenLink()
        .setUrl('https://github.com/StephenRJohns/email_sentinel/discussions')
        .setOpenAs(CardService.OpenAs.FULL_SIZE)));

  var builder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('emAIl Sentinel\u2122')
      // Served from the public GitHub repo so the icon is part of the source
      // tree, not a separate Drive asset that drifts. Use the 128 px asset
      // for the home-card header \u2014 CardService re-scales for the circle but
      // the higher-resolution source stays crisp on HiDPI displays.
      .setImageUrl('https://raw.githubusercontent.com/StephenRJohns/email_sentinel/main/images/ES_128.png')
      .setImageStyle(CardService.ImageStyle.CIRCLE))
    .addSection(statusSection);
  if (setupSection) builder.addSection(setupSection);
  builder.addSection(navSection);
  // Name the home card so Gmail's nav tracking treats kebab-menu →
  // Home (which uses displayAddOnCards) as a stack-replacing root,
  // which should suppress the back arrow on the resulting card.
  builder.setName('home');
  return builder.build();
}

function handleStartMonitoring(e) {
  const settings = loadSettings();
  if (!settings.geminiApiKey) {
    return notificationResponse_('Add a Gemini API key in Settings first.');
  }
  // The home card now includes the polling-interval dropdown alongside the
  // Start button. Read the selected value from the form event and persist it
  // to settings.pollMinutes so the Settings card reflects the home choice and
  // the value sticks across renders.
  let chosenPoll = parseInt(settings.pollMinutes, 10) || getTierLimits().minPollMinutes;
  if (e && e.formInput && e.formInput.pollMinutes) {
    const fromForm = parseInt(e.formInput.pollMinutes, 10);
    if (fromForm > 0) chosenPoll = fromForm;
  }
  const poll = enforcePollFloor(chosenPoll);
  if (poll.value !== settings.pollMinutes) {
    settings.pollMinutes = poll.value;
    saveSettings(settings);
  }
  installTrigger(poll.value);
  var msg = poll.clamped
    ? 'Scheduled scans started. Set to every ' + plural_(Math.round(poll.value / 60), 'hour') + ' (' + getTier() + ' plan minimum).'
    : 'Scheduled scans started.';
  return refreshHome_(msg);
}

function handleStopMonitoring(e) {
  removeTriggers();
  return refreshHome_('Scheduled scans stopped.');
}

// Fires when the user changes the home-card polling dropdown. CardService
// does not auto-save form input values when the user navigates away — only
// an action button submits them — so without this handler the user could
// pick "2 hours" on the home card, navigate to Settings, and find the old
// value still selected because no save ever happened. Persist the chosen
// value silently here so it sticks regardless of whether the user clicks
// Start scheduled scans.
function handleHomePollChange(e) {
  if (!e || !e.formInput || !e.formInput.pollMinutes) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(buildHomeCard()))
      .build();
  }
  const fromForm = parseInt(e.formInput.pollMinutes, 10);
  const settings = loadSettings();
  if (fromForm > 0) {
    const poll = enforcePollFloor(fromForm);
    if (poll.value !== settings.pollMinutes) {
      settings.pollMinutes = poll.value;
      saveSettings(settings);
    }
  }
  // CardService rejects an empty ActionResponse on setOnChangeAction — it
  // needs at least a navigation, notification, or openLink. Re-render the
  // home card so the response is well-formed; the rebuild reads the just-
  // saved settings.pollMinutes and selects the same option, so visually
  // nothing changes for the user beyond a brief refresh.
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildHomeCard()))
    .build();
}

function handleRunCheckNow(e) {
  // Land the user on the persistent buildScanResultCard_ — same surface the
  // kebab-menu universal-action path uses. The previous refreshHome_ + toast
  // path was reported as "no feedback" because the toast vanishes after a few
  // seconds and the home card otherwise looks identical to its pre-scan
  // state. The Scan result card has the green ✅ / red ⚠ banner with the
  // count and stays on screen until the user explicitly navigates back.
  try {
    var result = runMailCheck({ force: true }) || {};
    var summary = plural_(result.messagesChecked || 0, 'new email') + ', ' +
      plural_(result.matchesFound || 0, 'match', 'matches');
    var msg = 'Scan complete — ' + summary + '.';
    if (!loadSettings().geminiApiKey) msg += ' No Gemini API key set — open Settings to add one.';
    activityLog('Manual scan: ' + summary + '.');
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(buildScanResultCard_(msg, true)))
      .build();
  } catch (err) {
    activityLog('Manual scan failed: ' + err);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(
        buildScanResultCard_('Scan failed: ' + (err.message || err), false)))
      .build();
  }
}

function refreshHome_(message) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildHomeCard()))
    .setNotification(CardService.newNotification().setText(message))
    .build();
}

function handleGoHome(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popToRoot().updateCard(buildHomeCard()))
    .build();
}


function buildPreScanCard_() {
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Scan email now'));
  card.addSection(CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(
      'Check all watched labels for new messages and evaluate them ' +
      'against your rules right now, without waiting for the next ' +
      'scheduled check.<br><br>' +
      '<font color="#888888">Scans typically take 10–60 seconds. The ' +
      'button will show a spinner while the scan runs, and a result ' +
      'card will appear when it finishes.</font>'))
    .addWidget(CardService.newTextButton()
      .setText(whiteText_('Run scan now'))
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor(BRAND_PURPLE_)
      .setOnClickAction(action_('handleRunCheckNow'))));
  return card.build();
}

// Visual receipt for the universal-action "Scan email now" path. The kebab
// menu uses UniversalActionResponseBuilder, which does not support toast
// notifications — the user clicked the menu item and previously had only the
// Activity log card to look at, with no clear "I just ran" indicator. This
// card lands prominently with a green ✅ summary on success or a red ⚠ line on
// failure, plus a button to open the Activity log for the full per-label
// trace.
function buildScanResultCard_(message, success) {
  const accent = success ? '#1e7e34' : '#b00020';
  const icon   = success ? '✅' : '⚠️';
  const resultSection = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText('<font color="' + accent + '"><b>' + icon + '&nbsp; ' + escapeHtml_(message) + '</b></font>'))
    .addWidget(CardService.newTextButton()
      .setText('View activity log')
      .setOnClickAction(navAction_('buildActivityCard')));
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Scan result'))
    .addSection(resultSection)
    .build();
}

// ─────────────────────────────────────────────────────────────────────────────
// Rules list
// ─────────────────────────────────────────────────────────────────────────────

function buildRulesCard() {
  const rules = loadRules();
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Rules'))
    .addSection(homeButtonSection_());

  const newRuleBtn = CardService.newTextButton()
    .setText(whiteText_('+ New rule'))
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setBackgroundColor(BRAND_PURPLE_)
    .setOnClickAction(action_('handleNewRule'));
  const newSection = CardService.newCardSection();
  if (rules.length) {
    newSection.addWidget(CardService.newButtonSet()
      .addButton(newRuleBtn)
      .addButton(CardService.newTextButton()
        .setText(whiteText_('Delete all rules'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND_RED_)
        .setOnClickAction(action_('handleDeleteAllRules'))));
  } else {
    newSection.addWidget(newRuleBtn);
  }
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
  const ruleText = (rule.ruleText || '').length > 140
    ? rule.ruleText.substring(0, 137) + '…'
    : rule.ruleText;

  const settings = loadSettings();
  const smsRecipientsList = parseSmsRecipients_(settings.smsRecipients);
  const smsPhoneToName = {};
  smsRecipientsList.forEach(function(rec) { smsPhoneToName[rec.number] = rec.name; });
  const smsNums = rule.alerts.smsNumbers || [];

  const chatNames = (rule.alerts.chatSpaces || []);

  const googleChannels = [];
  if (rule.alerts.calendarEnabled) googleChannels.push('Calendar');
  if (rule.alerts.sheetsEnabled)   googleChannels.push('Sheets');
  if (rule.alerts.tasksEnabled)    googleChannels.push('Tasks');

  const allMcpServers = loadMcpServers();
  const mcpNames = (rule.alerts.mcpServerIds || [])
    .map(function(id) { const sv = allMcpServers.find(ms => ms.id === id); return sv ? sv.name : null; })
    .filter(Boolean);

  const channels = [];
  if (smsNums.length) {
    const smsLabels = smsNums.map(function(num) { return applyScreenshotName_(smsPhoneToName[num] || num); });
    channels.push('SMS (' + smsLabels.join(', ') + ')');
  }
  if (chatNames.length) channels.push('Chat (' + chatNames.join(', ') + ')');
  if (googleChannels.length) channels.push(googleChannels.join(', '));
  if (mcpNames.length) channels.push('MCP: ' + mcpNames.join(', '));
  // When the rule is enabled but has no channels, the rule will fire on
  // matches but produce no alert anywhere — flag this as a misconfiguration
  // with bold dark-red text. When the rule is disabled, plain text is fine
  // because the rule isn't acting on anything yet.
  var channelSummaryHtml;
  if (channels.length > 0) {
    channelSummaryHtml = escapeHtml_(channels.join(', '));
  } else if (rule.enabled) {
    channelSummaryHtml = '<font color="#b00020"><b>None configured</b></font>';
  } else {
    channelSummaryHtml = 'None configured';
  }

  const section = CardService.newCardSection()
    .setHeader('<b>' + escapeHtml_(rule.name) + '</b> &nbsp; ' + status)
    .addWidget(CardService.newDecoratedText().setTopLabel('Labels').setText(escapeHtml_(labels)))
    .addWidget(CardService.newDecoratedText().setTopLabel('Rule').setText(escapeHtml_(ruleText)))
    .addWidget(CardService.newDecoratedText().setTopLabel('Channels').setText(channelSummaryHtml));

  // Toggle button label is the action the click will take, not the
  // current state. 'Off' = currently on, click to turn off; 'On' = currently
  // off, click to turn on. Short labels keep the toggle column narrow
  // enough that Edit / toggle / Delete fit on one row at most card-section
  // counts (CardService scales row widths down at higher section counts in
  // ways we can't directly control, so shorter labels are the safest lever).
  // The current rule state is always visible in the section header
  // (✅ ON / ⏸ OFF) so the button doesn't need to duplicate it.
  const toggleBtn = CardService.newTextButton()
    .setText(rule.enabled ? 'Off' : 'On')
    .setOnClickAction(actionWithRule_('handleToggleRule', rule.id));

  const buttons = CardService.newButtonSet()
    .addButton(CardService.newTextButton()
      .setText('Edit')
      .setOnClickAction(actionWithRule_('handleEditRule', rule.id)))
    .addButton(toggleBtn)
    .addButton(CardService.newTextButton()
      .setText(whiteText_('Delete'))
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor(BRAND_RED_)
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
        .setText(whiteText_('Delete'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND_RED_)
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

function handleDeleteAllRules(e) {
  const count = loadRules().length;
  if (!count) return notificationResponse_('No rules to delete.');
  const plural = count === 1 ? 'rule' : 'rules';
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText('Delete <b>all ' + count + ' ' + plural + '</b>? This cannot be undone.'))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(whiteText_('Delete all'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND_RED_)
        .setOnClickAction(action_('handleConfirmDeleteAllRules')))
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

function handleConfirmDeleteAllRules(e) {
  saveRules([]);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popToRoot().updateCard(buildRulesCard()))
    .setNotification(CardService.newNotification().setText('All rules deleted.'))
    .build();
}

function handleNewRule(e) {
  // Block the editor entry when the active tier is already at its rule cap.
  // The save-side check in RulesManager.upsertRule() still guards against
  // bypass paths (programmatic save, race conditions), but failing fast here
  // means the user doesn't fill out an entire rule editor only to be told
  // their work can't be saved.
  if (!canAddRule()) {
    const limits = getTierLimits();
    return notificationResponse_(
      'Rule limit reached for your plan (' + limits.maxRules + ' rules on ' +
      getTier() + '). Upgrade to Pro for unlimited rules.');
  }
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
  const editing = rule !== null && rule !== undefined && !!rule.id;
  const r = rule || {};
  const alerts = (r.alerts || {});
  const settings = loadSettings();

  // ── Section 1: Rule definition ─────────────────────────────────────────────
  const ruleSection = CardService.newCardSection()
    .setHeader('<b>Rule</b>');

  ruleSection.addWidget(CardService.newTextInput()
    .setFieldName('name')
    .setTitle('Rule name')
    .setValue(r.name || ''));

  ruleSection.addWidget(CardService.newTextInput()
    .setFieldName('labels')
    .setTitle('Gmail labels to watch (comma separated)')
    .setHint('e.g. INBOX, Vendors, Finance')
    .setValue((r.labels || ['INBOX']).join(', ')));

  const ruleTextSection = CardService.newCardSection();
  ruleTextSection.addWidget(CardService.newTextInput()
    .setFieldName('ruleText')
    .setTitle('Rule text (plain English)')
    .setMultiline(true)
    .setValue(r.ruleText || ''));
  ruleTextSection.addWidget(CardService.newTextButton()
    .setText(isPro() ? 'Help me write the rule text' : 'Help me write the rule text (Pro)')
    .setOnClickAction(CardService.newAction()
      .setFunctionName('handleHelpWriteRuleText')
      .setParameters({ ruleId: r.id || '' })));

  // ── Section 2: Alert channels ──────────────────────────────────────────────
  const channelsSection = CardService.newCardSection()
    .setHeader('<b>Alert channels</b>');

  // SMS
  const smsProvider = settings.smsProvider || 'none';
  if (smsProvider === 'none') {
    channelsSection.addWidget(CardService.newTextParagraph()
      .setText('<font color="#888888">SMS alerts are disabled — no SMS provider is configured.</font>'));
    channelsSection.addWidget(CardService.newTextButton()
      .setText('Configure SMS in Settings')
      .setOnClickAction(navAction_('buildSettingsCard')));
  } else {
    const smsRecipientsList = parseSmsRecipients_(settings.smsRecipients);
    if (smsRecipientsList.length === 0) {
      channelsSection.addWidget(CardService.newTextParagraph()
        .setText('<font color="#888888">SMS provider is configured, but no SMS recipients have been added.</font>'));
      channelsSection.addWidget(CardService.newTextButton()
        .setText('Add SMS recipients in Settings')
        .setOnClickAction(navAction_('buildSettingsCard')));
    } else {
      const smsInput = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.CHECK_BOX)
        .setFieldName('smsRecipients')
        .setTitle('SMS');
      smsRecipientsList.forEach(function(rec) {
        const selected = (alerts.smsNumbers || []).indexOf(rec.number) >= 0;
        const displayName = applyScreenshotName_(rec.name);
        const displayNum  = applyScreenshotPhone_(rec.number);
        smsInput.addItem(displayName + ' (' + displayNum + ')', rec.number, selected);
      });
      channelsSection.addWidget(smsInput);
    }
  }

  const editorLimits = getTierLimits();

  // External integrations (MCP servers + REST webhooks; Pro)
  if (!editorLimits.allowMcp) {
    channelsSection.addWidget(CardService.newTextParagraph()
      .setText('<font color="#888888">External integrations (Microsoft Teams, Asana, custom MCP) \u2014 <b>Pro plan only</b>.</font>'));
  } else {
    const configuredMcpServers = loadMcpServers();
    if (configuredMcpServers.length === 0) {
      channelsSection.addWidget(CardService.newTextParagraph()
        .setText('<font color="#888888">No external integrations configured \u2014 route alerts to Microsoft Teams, Asana, or any custom MCP server you host yourself (the Help card has a 15-minute Cloudflare Worker walkthrough).</font>'));
      channelsSection.addWidget(CardService.newTextButton()
        .setText('Add external integrations in Settings')
        .setOnClickAction(navAction_('buildSettingsCard')));
    } else {
      const mcpInput = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.CHECK_BOX)
        .setFieldName('mcpServers')
        .setTitle('External integrations');
      configuredMcpServers.forEach(function(sv) {
        const selected = (alerts.mcpServerIds || []).indexOf(sv.id) >= 0;
        mcpInput.addItem(sv.name, sv.id, selected);
      });
      channelsSection.addWidget(mcpInput);
    }
  }

  // Google Chat (Pro)
  if (!editorLimits.allowChat) {
    channelsSection.addWidget(CardService.newTextParagraph()
      .setText('<font color="#888888">Google Chat webhooks \u2014 <b>Pro plan only</b>.</font>'));
  } else {
    const chatRegistry = parseChatSpaces_(settings.chatSpaces);
    const configuredChatNames = Object.keys(chatRegistry);
    if (configuredChatNames.length === 0) {
      channelsSection.addWidget(CardService.newTextParagraph()
        .setText('<font color="#888888">Google Chat not configured \u2014 no webhook URLs are set up.</font>'));
      channelsSection.addWidget(CardService.newTextButton()
        .setText('Configure Chat in Settings')
        .setOnClickAction(navAction_('buildSettingsCard')));
    } else {
      const chatInput = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.CHECK_BOX)
        .setFieldName('chatSpaces')
        .setTitle('Google Chat');
      configuredChatNames.forEach(function(nm) {
        const selected = (alerts.chatSpaces || []).indexOf(nm) >= 0;
        chatInput.addItem(nm, nm, selected);
      });
      channelsSection.addWidget(chatInput);
    }
  }

  // Google Calendar, Sheets, Tasks \u2014 each with optional per-rule override
  channelsSection.addWidget(CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .setFieldName('calendarEnabled')
    .addItem('Google Calendar \u2014 create an event', 'true', !!alerts.calendarEnabled));
  channelsSection.addWidget(CardService.newTextInput()
    .setFieldName('calendarIdOverride')
    .setTitle('Calendar ID for this rule (blank = use global setting)')
    .setHint('Leave blank to use the Calendar ID from Settings')
    .setValue(alerts.calendarId || ''));

  channelsSection.addWidget(CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .setFieldName('sheetsEnabled')
    .addItem('Google Sheets \u2014 append a log row', 'true', !!alerts.sheetsEnabled));
  channelsSection.addWidget(CardService.newTextInput()
    .setFieldName('sheetsIdOverride')
    .setTitle('Sheets ID or URL for this rule (blank = use global setting)')
    .setHint('Paste the full URL or just the ID \u2014 blank uses the Sheets ID from Settings')
    .setValue(extractSheetId_(alerts.sheetsId || '')));

  channelsSection.addWidget(CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .setFieldName('tasksEnabled')
    .addItem('Google Tasks \u2014 create a task', 'true', !!alerts.tasksEnabled));
  channelsSection.addWidget(CardService.newTextInput()
    .setFieldName('tasksListIdOverride')
    .setTitle('Tasks list ID for this rule (blank = use global setting)')
    .setHint('Leave blank to use the Tasks list ID from Settings')
    .setValue(alerts.tasksListId || ''));

  // ── Section 3: Alert message content ──────────────────────────────────────
  const alertMsgSection = CardService.newCardSection();

  alertMsgSection.addWidget(CardService.newTextInput()
    .setFieldName('alertMessagePrompt')
    .setTitle('Alert message content (plain English)')
    .setMultiline(true)
    .setValue(r.alertMessagePrompt || DEFAULT_ALERT_MESSAGE_PROMPT));

  alertMsgSection.addWidget(CardService.newTextButton()
    .setText('Help me write the alert text')
    .setOnClickAction(CardService.newAction()
      .setFunctionName('handleHelpWriteAlertText')
      .setParameters({ ruleId: r.id || '' })));

  // ── Section 4: Buttons ─────────────────────────────────────────────────────
  const buttonsSection = CardService.newCardSection()
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(whiteText_('Save'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND_PURPLE_)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('handleSaveRule')
          .setParameters({ ruleId: r.id || '' })))
      .addButton(CardService.newTextButton()
        .setText('Cancel')
        .setOnClickAction(action_('handleCancelEditor'))));

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(editing ? 'Edit rule' : 'New rule'))
    .addSection(buildUnsavedChangesNotice_())
    .addSection(ruleSection)
    .addSection(ruleTextSection)
    .addSection(channelsSection)
    .addSection(alertMsgSection)
    .addSection(buttonsSection)
    .build();
}

function handleSaveRule(e) {
  const inputs = e.commonEventObject.formInputs || {};
  const get = key => {
    const v = inputs[key];
    if (!v || !v.stringInputs || !v.stringInputs.value) return '';
    return (v.stringInputs.value[0] || '').trim();
  };
  const getMultiSelect = key => {
    const v = inputs[key];
    return (v && v.stringInputs && v.stringInputs.value) ? v.stringInputs.value.filter(Boolean) : [];
  };
  const getCheckbox = key => {
    const v = inputs[key];
    if (!v || !v.stringInputs || !v.stringInputs.value) return false;
    return v.stringInputs.value.indexOf('true') >= 0;
  };

  const name = get('name');
  const labels = splitCsv_(get('labels'));
  const ruleText = get('ruleText');
  const alertMessagePrompt = get('alertMessagePrompt') || DEFAULT_ALERT_MESSAGE_PROMPT;
  const smsNumbers   = getMultiSelect('smsRecipients'); // values are phone numbers
  const chatSpaces   = getMultiSelect('chatSpaces');    // values are space names
  const calendarEnabled = getCheckbox('calendarEnabled');
  const sheetsEnabled   = getCheckbox('sheetsEnabled');
  const tasksEnabled    = getCheckbox('tasksEnabled');
  const calendarId      = get('calendarIdOverride');
  const sheetsId        = extractSheetId_(get('sheetsIdOverride'));
  const tasksListId     = get('tasksListIdOverride');
  const mcpServerIds    = getMultiSelect('mcpServers'); // values are server IDs

  if (!name)     return notificationResponse_('Please enter a rule name.');
  if (!ruleText) return notificationResponse_('Please enter a rule description.');
  if (!labels.length) return notificationResponse_('Please list at least one Gmail label.');

  const limits = getTierLimits();
  let proBlocked = '';
  const chatSpacesFinal = limits.allowChat ? chatSpaces : [];
  if (!limits.allowChat && chatSpaces.length) proBlocked = 'Google Chat';
  const mcpServerIdsFinal = limits.allowMcp ? mcpServerIds : [];
  if (!limits.allowMcp && mcpServerIds.length) proBlocked = proBlocked ? (proBlocked + ' and MCP servers') : 'MCP servers';

  const alertsObj = {
    smsNumbers: smsNumbers,
    chatSpaces: chatSpacesFinal,
    calendarEnabled: calendarEnabled,
    calendarId: calendarId,
    sheetsEnabled: sheetsEnabled,
    sheetsId: sheetsId,
    tasksEnabled: tasksEnabled,
    tasksListId: tasksListId,
    mcpServerIds: mcpServerIdsFinal
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
    rule = createRule(name, labels, ruleText, alertsObj, alertMessagePrompt);
  }

  try { upsertRule(rule); }
  catch (err) { return notificationResponse_('Save failed: ' + err); }

  const hasChannel = smsNumbers.length > 0 || chatSpacesFinal.length > 0 ||
    calendarEnabled || sheetsEnabled || tasksEnabled || mcpServerIdsFinal.length > 0;
  let msg = hasChannel ? 'Rule saved.'
    : 'Rule saved, but no alert channels configured. Edit the rule to add at least one.';
  if (proBlocked) {
    msg = 'Rule saved. ' + proBlocked + ' require Pro — selections removed. Upgrade to enable them.';
  }

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

/**
 * Returns true if the current settings have all the pieces required to
 * successfully dispatch a test SMS — provider selected, required
 * credentials present for that provider, and a test phone number set.
 * Used to gate the "Send test SMS" button's disabled state at render time.
 */
function isSmsConfigReady_(s) {
  if (!s.smsProvider || s.smsProvider === 'none' || !s.smsTestNumber) return false;
  switch (s.smsProvider) {
    case 'textbelt':  return !!s.textbeltApiKey;
    case 'telnyx':    return !!(s.telnyxApiKey && s.telnyxFromNumber);
    case 'plivo':     return !!(s.plivoAuthId && s.plivoAuthToken && s.plivoFromNumber);
    case 'twilio':    return !!(s.twilioAccountSid && s.twilioAuthToken && s.twilioFromNumber);
    case 'clicksend': return !!(s.clicksendUsername && s.clicksendApiKey);
    case 'vonage':    return !!(s.vonageApiKey && s.vonageApiSecret);
    case 'webhook':   return /^https:\/\//i.test(s.smsWebhookUrl || '');
  }
  return false;
}

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
      .setHint('Paste your key here')
      .setValue(''));
    aiSection.addWidget(CardService.newTextParagraph()
      .setText('Get one free at <a href="https://aistudio.google.com/app/apikey">aistudio.google.com/app/apikey</a> — no credit card required.'));
  }

  const modelSelect = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('geminiModel')
    .setTitle('Gemini model');
  GEMINI_MODELS.forEach(m => modelSelect.addItem(m, m, m === (s.geminiModel || GEMINI_DEFAULT_MODEL)));
  aiSection.addWidget(modelSelect);

  const pollSection = CardService.newCardSection()
    .setHeader('<b>Scan schedule</b>');
  const tierLimits = getTierLimits();
  // Polling intervals are constrained to whole hours (Workspace add-on
  // time-driven triggers don't fire faster than once per hour). Render a
  // dropdown of hour options at or above the active tier's minimum so the
  // user cannot enter an invalid value. enforcePollFloor() in
  // handleSaveSettings remains the defense-in-depth check for any
  // non-UI code path that writes pollMinutes.
  const POLL_HOUR_OPTIONS_ = [
    { mins: 60,   label: '1 hour' },
    { mins: 120,  label: '2 hours' },
    { mins: 180,  label: '3 hours' },
    { mins: 240,  label: '4 hours' },
    { mins: 360,  label: '6 hours' },
    { mins: 480,  label: '8 hours' },
    { mins: 720,  label: '12 hours' },
    { mins: 1440, label: '24 hours' }
  ];
  const currentPollMins = parseInt(s.pollMinutes, 10) || tierLimits.minPollMinutes;
  const pollSelect = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('pollMinutes')
    .setTitle('Scan email every');
  let anyPollSelected = false;
  POLL_HOUR_OPTIONS_.forEach(function(opt) {
    if (opt.mins < tierLimits.minPollMinutes) return;
    const selected = opt.mins === currentPollMins;
    if (selected) anyPollSelected = true;
    pollSelect.addItem(opt.label, String(opt.mins), selected);
  });
  // Edge case: a legacy pollMinutes value not in the option list (e.g. a
  // pre-grid 45 or 90) — fall back to selecting the tier minimum so the
  // dropdown isn't shown without a value.
  if (!anyPollSelected) {
    pollSelect.addItem(
      String(tierLimits.minPollMinutes / 60) + ' hour' + (tierLimits.minPollMinutes === 60 ? '' : 's'),
      String(tierLimits.minPollMinutes),
      true
    );
  }
  pollSection.addWidget(pollSelect);
  // The "Scan email now" button itself lives on the home card and on the
  // kebab "⋮" menu — Settings just points users at it via this hint so we
  // do not duplicate the same CTA on three cards.
  const pollHint = isPro()
    ? 'Pro plan: minimum 1 hour. The 60-minute limit is a Google Workspace add-on platform limit; faster scanning is not possible. For an immediate scan, click <b>Scan email now</b> on the home card or in the kebab "⋮" menu.'
    : 'Free plan: minimum 3 hours. Pro lowers it to 1 hour. The 60-minute limit is a Google Workspace add-on platform limit. For an immediate scan, click <b>Scan email now</b> on the home card or in the kebab "⋮" menu.';
  pollSection.addWidget(CardService.newTextParagraph()
    .setText('<font color="#888888">' + pollHint + '</font>'));
  pollSection.addWidget(CardService.newTextInput()
    .setFieldName('maxEmailAgeDays')
    .setTitle('Only scan emails newer than (days)')
    .setHint('Default: 30. Emails older than this are ignored.')
    .setValue(String(s.maxEmailAgeDays || 30)));
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
  // Field defs: `secret` masks the stored value and renders a "leave blank to
  // keep current" replacement input; `phone` renders a country-code dropdown +
  // digits-only input pair (the stored value is E.164, the same shape used by
  // the test number and SMS recipients) — handleSaveSettings recombines the
  // two into E.164 via combinePhoneNumber_.
  const SMS_FIELD_DEFS_ = {
    textbelt: [{ field: 'textbeltApiKey', title: 'Textbelt API key', hint: 'Use "textbelt" for 1 free msg/day, or buy at textbelt.com', secret: true }],
    telnyx: [{ field: 'telnyxApiKey', title: 'Telnyx API key', secret: true }, { field: 'telnyxFromNumber', title: 'Telnyx "From" number', phone: true, codeField: 'telnyxFromCountryCode' }],
    plivo: [{ field: 'plivoAuthId', title: 'Plivo Auth ID', secret: true }, { field: 'plivoAuthToken', title: 'Plivo Auth Token', secret: true }, { field: 'plivoFromNumber', title: 'Plivo "From" number', phone: true, codeField: 'plivoFromCountryCode' }],
    twilio: [{ field: 'twilioAccountSid', title: 'Twilio Account SID', secret: true }, { field: 'twilioAuthToken', title: 'Twilio Auth Token', secret: true }, { field: 'twilioFromNumber', title: 'Twilio "From" number', phone: true, codeField: 'twilioFromCountryCode' }],
    clicksend: [{ field: 'clicksendUsername', title: 'ClickSend username (your email)' }, { field: 'clicksendApiKey', title: 'ClickSend API key', secret: true }],
    vonage: [{ field: 'vonageApiKey', title: 'Vonage API key', secret: true }, { field: 'vonageApiSecret', title: 'Vonage API secret', secret: true }],
    webhook: [{ field: 'smsWebhookUrl', title: 'Generic webhook URL', hint: 'Any HTTPS endpoint. Receives POST {"to":"...","body":"..."}.' }]
  };
  if (provider !== 'none' && SMS_FIELD_DEFS_[provider]) {
    SMS_FIELD_DEFS_[provider].forEach(function(f) {
      if (f.phone) {
        var split = splitPhoneNumber_(s[f.field] || '');
        smsSection.addWidget(buildCountryCodeDropdown_(f.codeField, f.title + ' country code', split.code));
        smsSection.addWidget(CardService.newTextInput()
          .setFieldName(f.field)
          .setTitle(f.title + ' (digits only)')
          .setHint('e.g. 5551234567 — country code is added from the dropdown above.')
          .setValue(split.digits));
      } else if (f.secret && s[f.field]) {
        smsSection.addWidget(CardService.newDecoratedText()
          .setTopLabel('Current ' + f.title.toLowerCase())
          .setText('....' + s[f.field].slice(-4)));
        smsSection.addWidget(CardService.newTextInput()
          .setFieldName(f.field)
          .setTitle('New value (leave blank to keep current)')
          .setHint('Only fill in to replace the current value')
          .setValue(''));
      } else {
        var w = CardService.newTextInput()
          .setFieldName(f.field)
          .setTitle(f.title)
          .setValue(s[f.field] || '');
        if (f.hint) w.setHint(f.hint);
        smsSection.addWidget(w);
      }
    });
    var testSplit = splitPhoneNumber_(s.smsTestNumber || '');
    smsSection.addWidget(buildCountryCodeDropdown_('smsTestCountryCode', 'Test number country code', testSplit.code));
    smsSection.addWidget(CardService.newTextInput()
      .setFieldName('smsTestNumber')
      .setTitle('Test phone number (digits only)')
      .setHint('e.g. 5551234567 — country code is added from the dropdown above. Used by the "Send test SMS" button below.')
      .setValue(testSplit.digits));

    // SMS recipients (named contacts to select in rules)
    var smsRecipientsArr = getSmsRecipientsArr_();
    smsSection.addWidget(CardService.newTextParagraph()
      .setText('<b>SMS recipients</b><br>' +
        '<font color="#888888">Named contacts to select in rules.</font>'));
    if (smsRecipientsArr.length) {
      smsRecipientsArr.forEach(function(rec) {
        smsSection.addWidget(CardService.newDecoratedText()
          .setTopLabel(applyScreenshotPhone_(rec.number))
          .setText(applyScreenshotName_(rec.name))
          .setButton(CardService.newTextButton()
            .setText('Edit')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('handleEditSmsRecipient')
              .setParameters({ recId: rec.id }))));
      });
    } else {
      smsSection.addWidget(CardService.newTextParagraph()
        .setText('<font color="#888888"><i>No recipients added yet.</i></font>'));
    }
    if (smsRecipientsArr.length < 5) {
      smsSection.addWidget(CardService.newTextButton()
        .setText('+ Add SMS recipient')
        .setOnClickAction(action_('handleShowNewSmsRecipient')));
    }
  }

  // ── Google-native alert channels (free) ─────────────────────────────
  const googleSection = CardService.newCardSection()
    .setHeader('<b>Google alert channels</b>')
    .addWidget(CardService.newTextParagraph().setText(
      'These use your existing Google account — no third-party sign-up. Calendar, Sheets, and Tasks are free. Chat requires a Google Workspace paid account.'));

  // Google Chat — dynamic list of named webhook spaces
  var chatSpacesArr = getChatSpacesArr_();
  googleSection.addWidget(CardService.newTextParagraph().setText('<b>Google Chat spaces</b>'));
  if (chatSpacesArr.length) {
    chatSpacesArr.forEach(function(cs) {
      const domain = cs.url ? cs.url.replace(/^https?:\/\//, '').split('/')[0] : '(no URL)';
      googleSection.addWidget(CardService.newDecoratedText()
        .setTopLabel(domain)
        .setText(cs.name)
        .setButton(CardService.newTextButton()
          .setText('Edit')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('handleEditChatSpace')
            .setParameters({ spaceId: cs.id }))));
    });
  } else {
    googleSection.addWidget(CardService.newTextParagraph()
      .setText('<font color="#888888"><i>No Chat spaces configured yet.</i></font>'));
  }
  googleSection.addWidget(CardService.newTextButton()
    .setText('+ Add Chat space')
    .setOnClickAction(action_('handleShowNewChatSpace')));
  googleSection.addWidget(CardService.newTextParagraph().setText(
    '<font color="#888888">Open a Space at <a href="https://chat.google.com">chat.google.com</a>, ' +
    'click the space name in the header \u25b8 Apps &amp; integrations \u25b8 Webhooks \u25b8 create one.</font>'));

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
    .setHint('Paste the full URL or just the ID — URL is auto-converted on save')
    .setValue(extractSheetId_(s.sheetsId || '')));

  // Tasks
  googleSection.addWidget(CardService.newTextInput()
    .setFieldName('tasksListId')
    .setTitle('Google Tasks list ID (blank = default "My Tasks")')
    .setHint('Leave blank to use your default task list')
    .setValue(s.tasksListId || ''));

  // ── External integrations (MCP servers + REST webhooks) ─────────────────
  const mcpSection = CardService.newCardSection()
    .setHeader('<b>External integrations</b>')
    .addWidget(CardService.newTextParagraph().setText(
      'Send alerts to Microsoft Teams, Asana, or any custom MCP server you ' +
      'host yourself (Cloudflare Workers, Smithery, etc.). MCP types speak ' +
      'JSON-RPC 2.0 over HTTPS; the Asana REST option posts directly. Add a ' +
      'server here, then tick it on each rule.'));

  const existingMcpServers = loadMcpServers();
  if (existingMcpServers.length) {
    existingMcpServers.forEach(function(sv) {
      const typeLabel = (MCP_TYPE_DEFAULTS[sv.type] || MCP_TYPE_DEFAULTS.custom).label;
      const domain = sv.endpoint
        ? sv.endpoint.replace(/^https?:\/\//, '').split('/')[0]
        : '(no endpoint)';
      mcpSection.addWidget(CardService.newDecoratedText()
        .setTopLabel(typeLabel)
        .setText(sv.name + ' — ' + domain)
        .setButton(CardService.newTextButton()
          .setText('Edit')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('handleEditMcpServer')
            .setParameters({ serverId: sv.id }))));
    });
  } else {
    mcpSection.addWidget(CardService.newTextParagraph().setText(
      '<font color="#888888"><i>No External integrations configured yet.</i></font>'));
  }
  mcpSection.addWidget(CardService.newTextButton()
    .setText('+ Add external integration')
    .setOnClickAction(action_('handleShowNewMcpServer')));

  var testGeminiBtn = CardService.newTextButton()
    .setText('Test Gemini')
    .setOnClickAction(action_('handleTestGemini'));
  if (!s.geminiApiKey) testGeminiBtn.setDisabled(true);

  var testSmsBtn = CardService.newTextButton()
    .setText('Send test SMS')
    .setOnClickAction(action_('handleTestSms'));
  if (!isSmsConfigReady_(s)) testSmsBtn.setDisabled(true);

  const buttons = CardService.newCardSection()
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(whiteText_('Save settings'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND_PURPLE_)
        .setOnClickAction(action_('handleSaveSettings')))
      .addButton(testGeminiBtn))
    .addWidget(CardService.newButtonSet()
      .addButton(testSmsBtn)
      .addButton(CardService.newTextButton()
        .setText('SMS setup guide')
        .setOnClickAction(action_('handleShowSmsGuide')))
      .addButton(CardService.newTextButton()
        .setText('Reset baseline')
        .setOnClickAction(action_('handleResetBaseline'))));

  const settingsBuilder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Settings'))
    .addSection(homeButtonSection_());
  return settingsBuilder
    .addSection(buildUnsavedChangesNotice_())
    .addSection(aiSection)
    .addSection(pollSection)
    .addSection(bizSection)
    .addSection(smsSection)
    .addSection(googleSection)
    .addSection(mcpSection)
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

  const pollRaw = get('pollMinutes');
  const pollEnforced = enforcePollFloor(pollRaw || String(getTierLimits().minPollMinutes));
  if (pollEnforced.invalid) {
    return notificationResponse_('Scan interval must be a positive whole number of minutes.');
  }

  // Combine the test SMS country code + local digits into E.164.
  var testNumberCombined = { value: '' };
  if (smsProvider !== 'none') {
    const rawTestDigits = get('smsTestNumber');
    if (rawTestDigits) {
      const testCode = get('smsTestCountryCode') || DEFAULT_COUNTRY_CODE;
      testNumberCombined = combinePhoneNumber_(testCode, rawTestDigits);
      if (!testNumberCombined.valid) {
        return notificationResponse_('Test phone number: ' + testNumberCombined.reason);
      }
    }
  }

  // Combine the active provider's "From" number country code + digits into
  // E.164. Empty digits is OK (treated as "not set yet"); non-empty digits
  // that fail validation produce a user-visible error and abort the save.
  function combineFromNumber_(codeFieldName, digitsFieldName, providerLabel) {
    const digits = get(digitsFieldName);
    if (!digits) return { value: '', valid: true, reason: '' };
    const code = get(codeFieldName) || DEFAULT_COUNTRY_CODE;
    const r = combinePhoneNumber_(code, digits);
    if (!r.valid) return { value: '', valid: false, reason: providerLabel + ' "From" number: ' + r.reason };
    return r;
  }
  var twilioFromCombined = { value: prev.twilioFromNumber || '', valid: true };
  var telnyxFromCombined = { value: prev.telnyxFromNumber || '', valid: true };
  var plivoFromCombined  = { value: prev.plivoFromNumber  || '', valid: true };
  if (smsProvider === 'twilio') {
    twilioFromCombined = combineFromNumber_('twilioFromCountryCode', 'twilioFromNumber', 'Twilio');
    if (!twilioFromCombined.valid) return notificationResponse_(twilioFromCombined.reason);
  } else if (smsProvider === 'telnyx') {
    telnyxFromCombined = combineFromNumber_('telnyxFromCountryCode', 'telnyxFromNumber', 'Telnyx');
    if (!telnyxFromCombined.valid) return notificationResponse_(telnyxFromCombined.reason);
  } else if (smsProvider === 'plivo') {
    plivoFromCombined = combineFromNumber_('plivoFromCountryCode', 'plivoFromNumber', 'Plivo');
    if (!plivoFromCombined.valid) return notificationResponse_(plivoFromCombined.reason);
  }

  const next = {
    geminiApiKey: get('geminiApiKey') || prev.geminiApiKey || '',
    geminiModel: get('geminiModel') || GEMINI_DEFAULT_MODEL,
    pollMinutes: pollEnforced.value,
    maxEmailAgeDays: Math.max(1, parseInt(get('maxEmailAgeDays') || '30', 10)) || 30,
    businessHoursEnabled: getCheckbox('businessHoursEnabled'),
    businessHoursStart: get('businessHoursStart') || '9:00 AM',
    businessHoursEnd: get('businessHoursEnd') || '9:00 PM',
    smsProvider: smsProvider,
    // Only update the selected provider's fields; preserve all others.
    // For secret fields, blank input means "keep current" — fall back to prev value.
    textbeltApiKey: smsProvider === 'textbelt' ? (get('textbeltApiKey') || prev.textbeltApiKey || '') : (prev.textbeltApiKey || ''),
    telnyxApiKey: smsProvider === 'telnyx' ? (get('telnyxApiKey') || prev.telnyxApiKey || '') : (prev.telnyxApiKey || ''),
    telnyxFromNumber: smsProvider === 'telnyx' ? telnyxFromCombined.value : (prev.telnyxFromNumber || ''),
    plivoAuthId: smsProvider === 'plivo' ? (get('plivoAuthId') || prev.plivoAuthId || '') : (prev.plivoAuthId || ''),
    plivoAuthToken: smsProvider === 'plivo' ? (get('plivoAuthToken') || prev.plivoAuthToken || '') : (prev.plivoAuthToken || ''),
    plivoFromNumber: smsProvider === 'plivo' ? plivoFromCombined.value : (prev.plivoFromNumber || ''),
    twilioAccountSid: smsProvider === 'twilio' ? (get('twilioAccountSid') || prev.twilioAccountSid || '') : (prev.twilioAccountSid || ''),
    twilioAuthToken: smsProvider === 'twilio' ? (get('twilioAuthToken') || prev.twilioAuthToken || '') : (prev.twilioAuthToken || ''),
    twilioFromNumber: smsProvider === 'twilio' ? twilioFromCombined.value : (prev.twilioFromNumber || ''),
    clicksendUsername: smsProvider === 'clicksend' ? get('clicksendUsername') : (prev.clicksendUsername || ''),
    clicksendApiKey: smsProvider === 'clicksend' ? (get('clicksendApiKey') || prev.clicksendApiKey || '') : (prev.clicksendApiKey || ''),
    vonageApiKey: smsProvider === 'vonage' ? (get('vonageApiKey') || prev.vonageApiKey || '') : (prev.vonageApiKey || ''),
    vonageApiSecret: smsProvider === 'vonage' ? (get('vonageApiSecret') || prev.vonageApiSecret || '') : (prev.vonageApiSecret || ''),
    smsWebhookUrl: smsProvider === 'webhook' ? get('smsWebhookUrl') : (prev.smsWebhookUrl || ''),
    smsTestNumber: smsProvider !== 'none' ? testNumberCombined.value : (prev.smsTestNumber || ''),
    smsRecipients: prev.smsRecipients || '[]',
    chatSpaces: prev.chatSpaces || '[]',
    license: prev.license || {},
    calendarId: get('calendarId'),
    sheetsId: extractSheetId_(get('sheetsId')),
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

  // Detect whether any field actually changed. If nothing did, skip the
  // save and tell the user — CardService can't disable the Save button
  // reactively, so this is the closest UX we can give.
  //
  // Exception: if the user's typed polling value got normalized
  // (raisedToTierMin / snappedToGrid) and the normalized value happens to
  // equal the previously-stored value, hasChanges is false but we still want
  // to surface the correction toast — otherwise the user types e.g. 200,
  // clicks Save, and the field re-renders as 240 with no explanation.
  var hasChanges = false;
  Object.keys(next).forEach(function(k) {
    var a = next[k] === undefined || next[k] === null ? '' : next[k];
    var b = prev[k] === undefined || prev[k] === null ? '' : prev[k];
    if (String(a) !== String(b)) hasChanges = true;
  });
  var pollWasCorrected = pollEnforced.raisedToTierMin || pollEnforced.snappedToGrid;

  if (!hasChanges && !pollWasCorrected) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('No changes to save.'))
      .build();
  }

  saveSettings(next);

  if (isMonitoringActive() && next.pollMinutes !== prev.pollMinutes) {
    installTrigger(next.pollMinutes);
  }

  var toast = 'Settings saved.';
  if (pollEnforced.raisedToTierMin) {
    toast = 'Settings saved. Scan interval raised to every ' + plural_(Math.round(next.pollMinutes / 60), 'hour') + ' (' + getTier() + ' plan minimum).';
  } else if (pollEnforced.snappedToGrid) {
    toast = 'Settings saved. Scan interval rounded up to every ' + plural_(Math.round(next.pollMinutes / 60), 'hour') + ' (Gmail add-ons require whole-hour intervals).';
  }

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildSettingsCard()))
    .setNotification(CardService.newNotification().setText(toast))
    .build();
}

function handleTestGemini(e) {
  const s = loadSettings();
  if (!s.geminiApiKey) {
    return notificationResponse_('No Gemini API key set — enter one and click Save first.');
  }
  const text = callGemini_(s.geminiApiKey, s.geminiModel,
    'Reply with the single word OK.', 200);
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
    .addWidget(CardService.newTextParagraph().setText(
      '<b>Reset the seen-message baseline?</b><br><br>' +

      '<b>What this does.</b> emAIl Sentinel keeps a per-label list of message ' +
      'IDs it has already seen so it only alerts on mail that arrives after ' +
      'install. Resetting that list throws it away. On the next check, every ' +
      'watched label is re-scanned from scratch — every existing message in ' +
      'each label is silently absorbed into a fresh baseline (no alerts), ' +
      'and alerting resumes only for mail that arrives after that point.<br><br>' +

      '<b>When to use it.</b> Reset if any of the following is true:<br>' +
      '• Alerts started firing for old messages (e.g. after you renamed a label, moved messages between labels, or reinstalled the add-on).<br>' +
      '• You added a new label to a rule and want a clean cutoff so old messages already in that label are not evaluated.<br>' +
      '• The seen-ID list got truncated automatically (logged in Activity log) and recent mail may have slipped through.<br>' +
      '• You want a clean slate after a long pause, and the existing inbox no longer needs to be considered "new."<br><br>' +

      '<b>What might surprise you.</b><br>' +
      '• <b>Any unread message that arrived after install but has not been alerted yet will be silently treated as already-seen and will never produce an alert.</b> If you had alerts pending for matches that have not yet run, you will lose them.<br>' +
      '• The reset is global — it clears the baseline for <b>every</b> watched label, not just one. There is no per-label reset.<br>' +
      '• The first check after reset takes longer than usual because every message in every watched label is fetched and recorded.<br>' +
      '• Activity log is unaffected and history of past alerts is preserved.<br><br>' +

      '<font color="#888888"><i>This cannot be undone — the previous seen-ID list is deleted, not archived.</i></font>'))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(whiteText_('Reset'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND_PURPLE_)
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
      '<b>Cheapest per message at scale (require you to rent a number):</b><br>' +
      '4. <b>Telnyx</b> — lowest per-SMS rate<br>' +
      '5. <b>Plivo</b> — similar to Telnyx, $10 free credit<br>' +
      '6. <b>Twilio</b> — most popular and best docs, $15 free credit<br><br>' +
      '<b>Already have your own SMS gateway or want an unlisted provider?</b><br>' +
      '7. <b>Generic webhook</b> — POST to any HTTPS endpoint you control<br><br>' +
      '<font color="#888888">Current per-SMS and phone-number prices are subject to change. Verify at each provider\'s website before choosing.</font>'
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
    .setHeader(CardService.newCardHeader().setTitle('Activity log'))
    .addSection(homeButtonSection_());

  const btnSet = CardService.newButtonSet();
  btnSet.addButton(CardService.newTextButton()
    .setText('Refresh')
    .setOnClickAction(action_('handleRefreshLog')));
  btnSet.addButton(CardService.newTextButton()
    .setText('Clear')
    .setOnClickAction(action_('handleClearLog')));
  card.addSection(CardService.newCardSection().addWidget(btnSet));

  if (!entries.length) {
    card.addSection(CardService.newCardSection().addWidget(
      CardService.newTextParagraph().setText('<i>No activity yet.</i>')));
    return card.build();
  }

  const LOG_PAGE_SIZE = 20;
  const reversed = entries.slice().reverse();
  var pageEntries = reversed.slice(offset, offset + LOG_PAGE_SIZE);
  var body = pageEntries.map(function(entry) {
    var esc = escapeHtml_(entry);
    // Bold the timestamp prefix. Each entry is "<stamp>  <message>" with
    // exactly two spaces between, so split on that — works for both the old
    // 19-char `yyyy-MM-dd HH:mm:ss` format and the new variable-width
    // `yyyy-MM-dd h:mm:ss a` (e.g. "2026-04-27 5:29:58 PM" / 21–22 chars).
    var sep = esc.indexOf('  ');
    return sep > 0
      ? '<b>' + esc.substring(0, sep) + '</b>' + esc.substring(sep)
      : esc;
  }).join('<br><br>');
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
    .setNavigation(CardService.newNavigation().updateCard(buildActivityCard(0)))
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
        .setText(whiteText_('Clear'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND_PURPLE_)
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
    .setNavigation(CardService.newNavigation().popToRoot().updateCard(buildActivityCard(0)))
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
    .setHeader(CardService.newCardHeader().setTitle('emAIl Sentinel\u2122 Help'))
    .addSection(homeButtonSection_());

  var searchSection = CardService.newCardSection()
    .setHeader('<b>Search help</b>')
    .addWidget(CardService.newTextInput()
      .setFieldName('helpSearchQuery')
      .setTitle('Search all topics')
      .setHint('e.g. "Reset baseline", "scan", "Founding member"'))
    .addWidget(CardService.newTextButton()
      .setText(whiteText_('Search'))
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor(BRAND_PURPLE_)
      .setOnClickAction(action_('handleSearchHelp')));
  card.addSection(searchSection);

  var section = CardService.newCardSection()
    .setHeader('<b>Browse topics</b>')
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
      .setImageUrl('https://lh3.googleusercontent.com/d/1Yyt-uT4B8WwKUJWjA_p578Y90pD86DBk')
      .setAltText('JJJJJ Enterprises, LLC'))
    .addWidget(CardService.newTextParagraph().setText(
      '<font color="#888888">emAIl Sentinel\u2122 is a product of JJJJJ Enterprises, LLC.</font>')));
  return card.build();
}

function handleSearchHelp(e) {
  var query = ((e.formInput && e.formInput.helpSearchQuery) || '').trim();
  if (!query) {
    return notificationResponse_('Enter a search term first.');
  }

  var topicMeta = [
    { id: 'quickstart', label: 'Quick start & writing rules' },
    { id: 'examples',   label: 'Rule examples by channel' },
    { id: 'channels',   label: 'Alert channel setup' },
    { id: 'pricing',    label: 'Gemini pricing & models' },
    { id: 'settings',   label: 'Settings & troubleshooting' }
  ];
  var topics = helpTopics_();
  var lowerQuery = query.toLowerCase();
  var results = [];

  topicMeta.forEach(function(meta) {
    var topic = topics[meta.id];
    if (!topic) return;
    // Strip HTML tags and collapse whitespace for searching and snippet extraction.
    var plain = topic.content.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
    var lowerPlain = plain.toLowerCase();
    var idx = lowerPlain.indexOf(lowerQuery);
    if (idx === -1) return;

    // Count total matches and pick a snippet around the first one.
    var matchCount = 0;
    var pos = 0;
    while (pos !== -1) {
      pos = lowerPlain.indexOf(lowerQuery, pos);
      if (pos === -1) break;
      matchCount++;
      pos += lowerQuery.length;
    }

    var start = Math.max(0, idx - 60);
    var end = Math.min(plain.length, idx + query.length + 100);
    var prefix = start > 0 ? '\u2026' : '';
    var suffix = end < plain.length ? '\u2026' : '';
    var rawSnippet = plain.substring(start, end);
    // Bold the first occurrence of the query within the snippet (case-insensitive).
    var matchOffset = idx - start;
    var snippet = escapeHtml_(rawSnippet.substring(0, matchOffset)) +
                  '<b>' + escapeHtml_(rawSnippet.substring(matchOffset, matchOffset + query.length)) + '</b>' +
                  escapeHtml_(rawSnippet.substring(matchOffset + query.length));

    results.push({
      id: meta.id,
      title: meta.label,
      snippet: prefix + snippet + suffix,
      matchCount: matchCount
    });
  });

  var resultsCard = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Search: "' + query + '"'));

  if (results.length === 0) {
    resultsCard.addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<i>No matches in any help topic. Try a different keyword.</i>')));
  } else {
    var summary = results.length + ' topic' + (results.length === 1 ? '' : 's') + ' matched.';
    resultsCard.addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('<font color="#888888">' + summary + '</font>')));
    results.forEach(function(r) {
      var countLabel = r.matchCount > 1 ? ' &nbsp;<font color="#888888">(' + r.matchCount + ' matches)</font>' : '';
      resultsCard.addSection(CardService.newCardSection()
        .setHeader('<b>' + escapeHtml_(r.title) + '</b>' + countLabel)
        .addWidget(CardService.newTextParagraph().setText(r.snippet))
        .addWidget(CardService.newTextButton()
          .setText('Open: ' + r.title)
          .setOnClickAction(CardService.newAction()
            .setFunctionName('handleShowHelpTopic')
            .setParameters({ topic: r.id }))));
    });
  }

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(resultsCard.build()))
    .build();
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
        '2. (Optional) Configure SMS \u2014 pick a provider and add named SMS recipients in Settings.<br>' +
        '3. (Optional) Add Google Chat spaces or MCP servers in Settings if you want to route alerts there.<br>' +
        '4. Open <b>Rules</b> and click <b>+ New rule</b>, or click <b>Starter rules</b> on the home card to create 5 pre-built rules (urgent emails, invoices, shipping updates, security alerts, subscription renewals). Starter rules are created disabled \u2014 edit each to tick channels, then tap <b>On</b> back on the Rules card.<br>' +
        '5. On the home card, pick a scan interval from the <b>Scan email every</b> dropdown, then click <b>Start scheduled scans</b>. A time-driven trigger runs in the background even when Gmail is closed; the interval you pick is also saved into Settings.<br><br>' +
        '<b>Writing a rule</b><br>' +
        'Rules are plain English. Be specific about senders, subjects, attachments, or body keywords. Examples:<br>' +
        '\u2022 "Any email from @example.com with a PDF that looks like an invoice."<br>' +
        '\u2022 "Subject contains URGENT or CRITICAL."<br>' +
        '\u2022 "Email from boss@example.com asking for a status update."<br><br>' +
        'Each rule has an <b>Alert message content</b> field \u2014 plain-English instructions that tell Gemini how to format the alert. The default includes date, sender, subject, summary, and action items. Click <b>Help me write the rule text</b> or <b>Help me write the alert text</b> in the rule editor to have Gemini draft a starting point.<br><br>' +
        '<b>Labels</b><br>' +
        'Gmail uses labels rather than folders. Use INBOX for the inbox, or any label name as shown in Gmail. Multiple labels: comma-separated.<br><br>' +
        '<b>Searching help</b><br>' +
        'Use the <b>Search help</b> box at the top of the Help card to find any keyword or phrase across all topics — e.g. "Reset baseline", "scan", or "Founding member". Each result shows the topic name plus a snippet, and clicking opens the full topic.'
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
        '<b>External integrations</b> \u2014 route to external tools<br>' +
        '\u2022 <b>Sales lead \u2192 Teams:</b> "Email mentioning pricing or demo from a new contact." \u2192 Microsoft Teams MCP<br>' +
        '\u2022 <b>Support ticket \u2192 Asana:</b> "Customer email tagged P1 or ESCALATION." \u2192 Asana task<br>' +
        '\u2022 <b>Custom downstream \u2192 Cloudflare Worker:</b> any rule \u2192 Custom MCP server you host yourself<br><br>' +
        '<b>Combining channels</b><br>' +
        '\u2022 <b>Critical vendor issue:</b> SMS + Chat + Calendar + Sheets<br>' +
        '\u2022 <b>New hire onboarding:</b> Task + Sheets + Chat'
    },
    channels: {
      title: 'Alert channel setup',
      content:
        '<b>SMS</b> \u2014 any provider you want. Six quick-start presets built in (see <b>SMS setup guide</b>); the Generic webhook handles anything else.<br>' +
        '\u2022 <b>Textbelt</b> \u2014 easiest: 1 free SMS/day with key "textbelt", no sign-up<br>' +
        '\u2022 <b>ClickSend</b> \u2014 free trial, username + API key, no phone number<br>' +
        '\u2022 <b>Vonage</b> \u2014 free trial credits, no credit card<br>' +
        '\u2022 <b>Telnyx</b> \u2014 cheapest per SMS at scale; needs a rented phone number<br>' +
        '\u2022 <b>Plivo</b> \u2014 $10 free credit; needs a rented phone number<br>' +
        '\u2022 <b>Twilio</b> \u2014 most popular and best docs; $15 free credit; needs a rented phone number<br>' +
        '\u2022 <b>Generic webhook</b> \u2014 POST to any HTTPS endpoint; use this for any provider without a built-in preset<br>' +
        '<font color="#888888">Current per-SMS and phone-number prices are shown in the SMS setup card and on each provider\'s site. Prices change \u2014 verify before committing.</font><br>' +
        'After picking a provider, add named SMS recipients (e.g. "On-call", "CFO") in the <b>SMS recipients</b> section of Settings. Rules pick recipients by name via checkboxes. Click <b>Send test SMS</b> to verify.<br><br>' +
        '<b>Google Chat</b> \u2014 requires a <b>Google Workspace paid account</b>.<br>' +
        '1. Go to <a href="https://chat.google.com">chat.google.com</a> and create a Space<br>' +
        '2. Click the space name in the header \u25b8 Apps & integrations \u25b8 Webhooks<br>' +
        '3. Add a webhook, copy the URL, paste into Settings<br>' +
        '4. Select the space name in each rule<br><br>' +
        '<b>Calendar</b> \u2014 creates a 15-minute event with alert details. Phone notifications fire if calendar notifications are on.<br><br>' +
        '<b>Sheets</b> \u2014 appends a row to a spreadsheet (auto-created on first alert). Great for audit trails.<br><br>' +
        '<b>Tasks</b> \u2014 creates a task in Google Tasks. Shows in Gmail sidebar and the Tasks app.<br><br>' +
        '<b>External integrations</b> \u2014 route alerts to Microsoft Teams, Asana, or any custom MCP server you host yourself. Configure servers in Settings \u25b8 <b>External integrations</b>, then tick them per rule. Setup walkthroughs (Cloudflare Worker, Asana REST + MCP V2): emailsentinel.For a detailed walkthrough visit <b>emailsentinel.jjjjjenterprises.com/help.html#channels</b>.'
    },
    pricing: {
      title: 'Gemini pricing & models',
      content:
        'emAIl Sentinel calls Gemini twice per email per rule: once to evaluate, once to format the alert.<br><br>' +
        '<b>Models (select in Settings)</b><br>' +
        '\u2022 <b>2.5 Flash</b> (default) \u2014 fast, highly capable, best for most users<br>' +
        '\u2022 <b>2.5 Flash Lite</b> \u2014 ultra-low-cost, slightly less capable<br>' +
        '\u2022 <b>2.5 Pro</b> \u2014 highest accuracy for complex rules, higher cost<br>' +
        '\u2022 <b>2.0 Flash 001</b> \u2014 stable previous-generation Flash, reliable fallback<br><br>' +
        '<b>Free tier</b><br>' +
        'Get a key at <a href="https://aistudio.google.com/app/apikey">aistudio.google.com/app/apikey</a>. Free quota resets daily; at the limit Gemini returns 429 and calls resume next day.<br><br>' +
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
        '\u2022 Enable <b>Business hours</b> \u2014 skips scans outside your window<br>' +
        '\u2022 Lower <b>Max email age</b> (Settings \u25b8 Scan schedule) \u2014 skips older messages entirely<br>' +
        '\u2022 Watch specific labels instead of INBOX<br>' +
        '\u2022 Combine related conditions into one rule<br>' +
        '\u2022 Keep alert format prompts concise'
    },
    settings: {
      title: 'Settings & troubleshooting',
      content:
        '<b>Business hours</b><br>' +
        'Restrict scans to a daily window. Outside hours, the trigger fires but skips the scan \u2014 no Gemini quota used.<br><br>' +
        '<b>Scan schedule</b><br>' +
        'Background scans: <b>Free</b> = every 3 hours minimum; <b>Pro</b> = every 1 hour minimum. The 1-hour hard floor is a <b>Google Workspace add-on platform limit</b>. We could scan faster by running our own backend that stores your Gmail tokens and reads your email on our servers \u2014 but we deliberately don\'t. The add-on runs entirely inside your own Google account; your email content never reaches our infrastructure. The scan-interval floor is the price of that privacy posture. Click <b>Scan email now</b> any time for an immediate on-demand scan. The first run baselines existing messages so you don\'t get a flood of alerts.<br><br>' +
        '<b>Max email age</b><br>' +
        'Controls how far back the Service looks when scanning a label. Default is 30 days. Emails older than this are ignored even if they\'re unread \u2014 useful for skipping long-dormant threads and cutting Gemini usage on busy labels.<br><br>' +
        '<b>Reset baseline</b><br>' +
        'The first time the Service checks a watched label, it records every existing message ID as a "seen" baseline so you don\'t get a flood of alerts on install \u2014 alerts only fire for mail that arrives after that point. Clicking <b>Reset baseline</b> in Settings deletes that stored set. On the next run, every label is treated as brand-new: existing messages are silently absorbed into a fresh baseline, and alerting resumes for mail that arrives after. Use it if alerts start firing for old mail (e.g. after changing labels or reinstalling), or any time you want a clean slate.<br><br>' +
        '<b>Time zone for alerts</b><br>' +
        'All dates rendered in alerts \u2014 the Sheets row Timestamp / Received columns, the Calendar event description, the Tasks notes, and any timestamp Gemini includes in the alert message \u2014 are formatted in your local time zone (taken from your primary Google Calendar). The format is <code>yyyy-MM-dd h:mm:ss AM/PM TZ</code>, e.g. <code>2026-04-27 5:29:58 PM CDT</code>. Underlying milliseconds are preserved internally for sorting; only the user-visible string is localized.<br><br>' +
        '<b>Privacy</b><br>' +
        'Settings, rules, seen messages, and the activity log are stored in UserProperties \u2014 private to your Google account. Email content goes only to Gemini and your configured alert channels.<br><br>' +
        '<b>Troubleshooting</b><br>' +
        '\u2022 <i>"No Gemini API key configured"</i> \u2014 open Settings, paste a key, click <b>Test Gemini</b><br>' +
        '\u2022 <i>"Label \'...\' fetch failed"</i> \u2014 verify the label exists in Gmail (case-insensitive)<br>' +
        '\u2022 <i>SMS not delivered</i> \u2014 check Activity Log for the provider\'s error<br>' +
        '\u2022 <i>Alerts for old mail</i> \u2014 open Settings, click <b>Reset baseline</b><br>' +
        '\u2022 <i>MCP target (Asana / Teams / Custom) not populated, no error in Activity Log</i> \u2014 push the latest version. The MCP dispatcher now parses Streamable-HTTP <code>text/event-stream</code> responses (Asana V2 returns this) and surfaces tool-level errors as <code>MCP alert to "&lt;name&gt;" FAILED: MCP "&lt;name&gt;" tool error: &lt;detail&gt;</code>. Common details: <i>Project not found</i> (bad <code>project_id</code>), <i>Forbidden</i> (PAT lacks workspace access), <i>Required field missing</i>. All MCP types expect the auth header literal <code>Bearer &lt;token&gt;</code> \u2014 capital B, single space, then the token.<br>' +
        '\u2022 <i>Activity log times or alert dates look off by several hours</i> \u2014 dates use your primary Google Calendar\'s timezone. Fix at <a href="https://calendar.google.com/calendar/u/0/r/settings">calendar.google.com</a> \u25b8 Time zone, then re-run.<br>' +
        '\u2022 <i>Lost edits in the rule or settings editor</i> \u2014 always click <b>Save</b> before tapping the back arrow. Google\'s add-on framework gives no event when the system back arrow is pressed, so the editor cannot prompt to save unsaved changes. Each editor card shows an amber notice at the top as a reminder.<br>' +
        '\u2022 Still stuck? Two ways to get help:<br>' +
        '\u2022 <b><a href="https://github.com/StephenRJohns/email_sentinel/discussions">Community discussions</a></b> \u2014 ask other users, share rule recipes, browse setup tips for SMS / Chat / MCP. Best for usage questions.<br>' +
        '\u2022 <b><a href="https://github.com/StephenRJohns/email_sentinel/issues">Open a GitHub issue</a></b> \u2014 best for bugs and feature requests; tracked, searchable, get the fastest response from the developer.<br><br>' +
        '<b>Contact</b><br>' +
        'Support: <a href="mailto:support@jjjjjenterprises.com">support@jjjjjenterprises.com</a><br>' +
        'Legal / privacy: <a href="mailto:legal@jjjjjenterprises.com">legal@jjjjjenterprises.com</a><br>' +
        'Billing: <a href="mailto:billing@jjjjjenterprises.com">billing@jjjjjenterprises.com</a><br><br>' +
        '<font color="#888888">Google, Gmail, Google Workspace, Google Chat, Google Calendar, Google Sheets, Google Tasks, and Gemini are trademarks of Google LLC. Microsoft and Teams are trademarks of Microsoft Corporation. Asana is a trademark of Asana, Inc. Not affiliated with or endorsed by any of these companies.</font>'
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
    const emptyBuilder = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('Starter rules'));
    return emptyBuilder.addSection(section).build();
  }

  section.setHeader(toCreate.length + ' rules will be created (disabled) watching your INBOX. Edit each rule to add alert recipients and enable it.');

  toCreate.forEach(function(r) {
    section.addWidget(CardService.newTextParagraph()
      .setText('\u2022 <b>' + r.name + '</b><br>' + r.ruleText));
  });

  section
    .addWidget(CardService.newTextButton()
      .setText(whiteText_('Create starter rules'))
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor(BRAND_PURPLE_)
      .setOnClickAction(action_('handleCreateStarterRules')))
    .addWidget(CardService.newTextButton()
      .setText('Cancel')
      .setOnClickAction(action_('handlePopCard')));

  const starterBuilder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Starter rules'));
  return starterBuilder.addSection(section).build();
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
    const limits = getTierLimits();
    let count = 0;
    let skipped = 0;
    STARTER_RULES_.forEach(function(sr) {
      if (existingNames.indexOf(sr.name) >= 0) return;
      if (rules.length >= limits.maxRules) { skipped++; return; }
      const rule = createRule(sr.name, ['INBOX'], sr.ruleText, {});
      rule.enabled = false;
      rules.push(rule);
      count++;
    });
    saveRules(rules);
    let msg = count + ' starter rules created (disabled). Edit each to add alert recipients and enable.';
    if (skipped > 0) {
      msg += ' ' + skipped + ' skipped (Free plan limit reached — upgrade to Pro for unlimited rules).';
    }
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().popToRoot().updateCard(buildRulesCard()))
      .setNotification(CardService.newNotification().setText(msg))
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
  let card;
  switch (builder) {
    case 'buildRulesCard':         card = buildRulesCard(); break;
    case 'buildSettingsCard':      card = buildSettingsCard(); break;
    case 'buildActivityCard':      card = buildActivityCard(0); break;
    case 'buildHelpCard':          card = buildHelpCard(); break;
    case 'buildStarterRulesCard':  card = buildStarterRulesCard(); break;
    case 'buildHomeCard':
    default:                       card = buildHomeCard();
  }
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

function extractSheetId_(value) {
  if (!value) return '';
  var m = value.trim().match(/\/d\/([a-zA-Z0-9_-]{25,})/);
  return m ? m[1] : value.trim();
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

function actionWithServerId_(fn, serverId) {
  return CardService.newAction().setFunctionName(fn).setParameters({ serverId: serverId });
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP server editor
// ─────────────────────────────────────────────────────────────────────────────

function buildMcpServerEditorCard(server) {
  const editing = server !== null && server !== undefined && !!server.id;
  const sv = server || {};
  // Map legacy stored types to current ones so existing user configs survive
  // dropdown changes. 'slack' was removed (Slack does not host an MCP server,
  // so the type was misleading) — fall back to 'custom'. 'ms365' was renamed
  // to 'teams' since Teams is the actual alert surface. New servers default
  // to 'custom' since the Cloudflare Worker walkthrough in Help is the
  // recommended starting point.
  const rawType = sv.type;
  const type = (rawType === 'ms365' ? 'teams'
              : rawType === 'slack' ? 'custom'
              : rawType) || 'custom';
  const def = MCP_TYPE_DEFAULTS[type] || MCP_TYPE_DEFAULTS.custom;

  const section = CardService.newCardSection();

  section.addWidget(CardService.newTextInput()
    .setFieldName('mcpName')
    .setTitle('Server name')
    .setHint('e.g. "Demo MCP", "Asana Marketing"')
    .setValue(sv.name || ''));

  const typeSelect = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('mcpType')
    .setTitle('Type')
    .setOnChangeAction(CardService.newAction()
      .setFunctionName('handleLoadMcpDefaults')
      .setParameters({ serverId: sv.id || '' }));
  MCP_TYPES.forEach(function(t) {
    typeSelect.addItem(MCP_TYPE_DEFAULTS[t].label, t, t === type);
  });
  section.addWidget(typeSelect);

  section.addWidget(CardService.newTextParagraph()
    .setText('<font color="#888888">' + escapeHtml_(def.description) + '</font>'));

  section.addWidget(CardService.newTextInput()
    .setFieldName('mcpEndpoint')
    .setTitle('Endpoint URL')
    .setHint('HTTPS URL — e.g. https://your-mcp-server.example.com/mcp or a Slack/Discord webhook URL')
    .setValue(sv.endpoint || ''));

  if (sv.authToken) {
    section.addWidget(CardService.newDecoratedText()
      .setTopLabel('Current authorization header')
      .setText('....' + sv.authToken.slice(-4)));
    section.addWidget(CardService.newTextInput()
      .setFieldName('mcpAuthToken')
      .setTitle('New authorization header (leave blank to keep current)')
      .setHint('Only fill in to replace the current value')
      .setValue(''));
  } else {
    section.addWidget(CardService.newTextInput()
      .setFieldName('mcpAuthToken')
      .setTitle('Authorization header value')
      .setHint('e.g. "Bearer YOUR_TOKEN" or "ApiKey YOUR_KEY" — blank if none')
      .setValue(''));
  }

  // Tool name is only meaningful for true MCP types (Custom, Teams, Asana
  // MCP V2). Direct-post types (asana-rest, generic webhook) skip the
  // JSON-RPC envelope entirely, so the field is hidden to avoid confusing
  // users — the body template below is what gets POSTed verbatim.
  const isDirectPost = DIRECT_POST_TYPES.indexOf(type) >= 0;
  if (!isDirectPost) {
    section.addWidget(CardService.newTextInput()
      .setFieldName('mcpToolName')
      .setTitle('Tool name')
      .setHint(def.toolNameHint || 'The MCP tool to call, e.g. slack_post_message')
      .setValue(sv.toolName !== undefined ? sv.toolName : def.toolName));
  }

  section.addWidget(CardService.newTextInput()
    .setFieldName('mcpToolArgsTemplate')
    .setTitle(isDirectPost ? 'Request body (JSON)' : 'Tool arguments (JSON)')
    .setHint('Placeholders: {{message}}, {{subject}}, {{from}}, {{rule}}')
    .setMultiline(true)
    .setValue(sv.toolArgsTemplate !== undefined ? sv.toolArgsTemplate : def.toolArgsTemplate));

  section.addWidget(CardService.newTextButton()
    .setText(isDirectPost ? 'Suggest request body' : 'Suggest tool arguments')
    .setOnClickAction(CardService.newAction()
      .setFunctionName('handleSuggestMcpArgs')
      .setParameters({ serverId: sv.id || '' })));

  const btns = CardService.newButtonSet()
    .addButton(CardService.newTextButton()
      .setText(whiteText_('Save'))
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor(BRAND_PURPLE_)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('handleSaveMcpServer')
        .setParameters({ serverId: sv.id || '' })))
    .addButton(CardService.newTextButton()
      .setText('Cancel')
      .setOnClickAction(action_('handlePopCard')));
  if (editing) {
    btns.addButton(CardService.newTextButton()
      .setText(whiteText_('Delete'))
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor(BRAND_RED_)
      .setOnClickAction(actionWithServerId_('handleDeleteMcpServerPrompt', sv.id)));
  }
  section.addWidget(btns);

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle(editing ? 'Edit external integration' : 'Add external integration'))
    .addSection(buildUnsavedChangesNotice_())
    .addSection(section)
    .build();
}

function handleShowNewMcpServer(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildMcpServerEditorCard(null)))
    .build();
}

function handleEditMcpServer(e) {
  const server = getMcpServerById(e.parameters.serverId);
  if (!server) return notificationResponse_('Server not found.');
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildMcpServerEditorCard(server)))
    .build();
}

function handleLoadMcpDefaults(e) {
  const inputs = e.commonEventObject.formInputs || {};
  const get = key => {
    const v = inputs[key];
    if (!v || !v.stringInputs || !v.stringInputs.value) return '';
    return (v.stringInputs.value[0] || '').trim();
  };

  const serverId = e.parameters.serverId || '';
  const type = get('mcpType') || 'custom';
  const def = MCP_TYPE_DEFAULTS[type] || MCP_TYPE_DEFAULTS.custom;

  const partial = {
    id: serverId || null,
    name: get('mcpName'),
    type: type,
    endpoint: get('mcpEndpoint'),
    authToken: get('mcpAuthToken'),
    toolName: def.toolName,
    toolArgsTemplate: def.toolArgsTemplate
  };

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildMcpServerEditorCard(partial)))
    .build();
}

function handleSuggestMcpArgs(e) {
  const inputs = e.commonEventObject.formInputs || {};
  const get = key => {
    const v = inputs[key];
    if (!v || !v.stringInputs || !v.stringInputs.value) return '';
    return (v.stringInputs.value[0] || '').trim();
  };

  const serverId = e.parameters.serverId || '';
  const type = get('mcpType') || 'custom';
  const toolName = get('mcpToolName');
  const def = MCP_TYPE_DEFAULTS[type] || MCP_TYPE_DEFAULTS.custom;
  const isDirectPost = DIRECT_POST_TYPES.indexOf(type) >= 0;

  // Tool name only required for true MCP types (Custom, Teams, Asana MCP V2).
  if (!isDirectPost && !toolName) {
    return notificationResponse_('Enter a tool name before asking for a suggestion.');
  }

  const s = loadSettings();
  if (!s.geminiApiKey) {
    return notificationResponse_('Add a Gemini API key in Settings first.');
  }

  const typeLabel = def.label;
  const typeDesc = def.description;

  const prompt = isDirectPost
    ? (
        'You configure a JSON request body for an HTTPS POST. The integration ' +
        'type is "' + typeLabel + '" (' + typeDesc + '). ' +
        'Generate a JSON object suitable as the request body that would post ' +
        'an alert notification to a typical endpoint of that type. ' +
        'Use these literal placeholders where text content belongs:\n' +
        '  {{message}} - the full alert text\n' +
        '  {{subject}} - the original email subject\n' +
        '  {{from}}    - the original sender address\n' +
        '  {{rule}}    - the rule name\n' +
        'For required identifier fields (channel ID, project ID, etc.), use an ' +
        'UPPERCASE placeholder like CHANNEL_ID or PROJECT_ID so the user can ' +
        'replace it with a real value. ' +
        'Output only the JSON object on a single line, no preamble, no code fences, no trailing commentary.'
      )
    : (
        'You configure a JSON-RPC 2.0 Model Context Protocol (MCP) tool call. ' +
        'The MCP server type is "' + typeLabel + '" (' + typeDesc + '). ' +
        'The tool being called is named "' + toolName + '". ' +
        'Generate a JSON object to pass as the "arguments" for tools/call that would post ' +
        'an alert notification using that tool. ' +
        'Use these literal placeholders where text content belongs:\n' +
        '  {{message}} - the full alert text\n' +
        '  {{subject}} - the original email subject\n' +
        '  {{from}}    - the original sender address\n' +
        '  {{rule}}    - the rule name\n' +
        'For required identifier fields (channel ID, chat ID, project ID, etc.), ' +
        'use an UPPERCASE placeholder like CHANNEL_ID or PROJECT_ID so the user can ' +
        'replace it with a real value. ' +
        'Output only the JSON object on a single line, no preamble, no code fences, no trailing commentary.'
      );

  let suggestion;
  try {
    // 1024 max tokens — Gemini 2.5 Flash/Pro count internal "thinking" tokens
    // against this cap, so a tight 300 budget gets eaten almost entirely by
    // reasoning before any output is produced (mid-sentence truncation).
    suggestion = callGemini_(s.geminiApiKey, s.geminiModel, prompt, 1024);
    if (!suggestion) throw new Error('Empty response from Gemini.');
    suggestion = suggestion.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    JSON.parse(suggestion); // validate
  } catch (err) {
    return notificationResponse_('Could not generate suggestion: ' + err.message);
  }

  const ctx = {
    suggestion: suggestion,
    name:      get('mcpName'),
    type:      type,
    endpoint:  get('mcpEndpoint'),
    authToken: get('mcpAuthToken'),
    toolName:  toolName
  };
  PropertiesService.getUserProperties()
    .setProperty('mailsentinel.tmp.mcpctx', JSON.stringify(ctx));

  const heading = isDirectPost
    ? '<b>Suggested request body:</b>'
    : '<b>Suggested tool arguments for <i>' + escapeHtml_(toolName) + '</i>:</b>';
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText(heading + '<br><br>' +
        '<font face="monospace">' + escapeHtml_(suggestion) + '</font><br><br>' +
        '<font color="#888888">Review and replace any UPPERCASE placeholders (e.g. CHANNEL_ID) with real values before saving.</font>'))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(whiteText_('Use this'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND_PURPLE_)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('handleUseSuggestedMcpArgs')
          .setParameters({ serverId: serverId })))
      .addButton(CardService.newTextButton()
        .setText('Close')
        .setOnClickAction(action_('handlePopCard'))));

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(
      CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader().setTitle('AI tool argument suggestion'))
        .addSection(section)
        .build()))
    .build();
}

function handleUseSuggestedMcpArgs(e) {
  const ctxRaw = PropertiesService.getUserProperties()
    .getProperty('mailsentinel.tmp.mcpctx');
  PropertiesService.getUserProperties().deleteProperty('mailsentinel.tmp.mcpctx');

  let ctx = {};
  try { ctx = JSON.parse(ctxRaw || '{}'); } catch (_) {}

  const serverId = e.parameters.serverId || '';
  const partial = {
    id:               serverId || null,
    name:             ctx.name      || '',
    type:             ctx.type      || 'custom',
    endpoint:         ctx.endpoint  || '',
    authToken:        ctx.authToken || '',
    toolName:         ctx.toolName  || '',
    toolArgsTemplate: ctx.suggestion || ''
  };

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard()
      .updateCard(buildMcpServerEditorCard(partial)))
    .build();
}

/**
 * Look up an MCP server by id from the saved list. Returns null if missing.
 * Used by handleSaveMcpServer to preserve credentials when the auth-token
 * input is left blank.
 */
function findMcpServerById_(id) {
  if (!id) return null;
  var all = loadMcpServers();
  for (var i = 0; i < all.length; i++) {
    if (all[i].id === id) return all[i];
  }
  return null;
}

function handleSaveMcpServer(e) {
  const inputs = e.commonEventObject.formInputs || {};
  const get = key => {
    const v = inputs[key];
    if (!v || !v.stringInputs || !v.stringInputs.value) return '';
    return (v.stringInputs.value[0] || '').trim();
  };

  const name     = get('mcpName');
  const endpoint = get('mcpEndpoint');
  const type     = get('mcpType') || 'custom';
  const toolName = get('mcpToolName');
  const isDirectPost = DIRECT_POST_TYPES.indexOf(type) >= 0;

  if (!name)     return notificationResponse_('Please enter a server name.');
  if (!endpoint) return notificationResponse_('Please enter an endpoint URL.');
  if (!/^https:\/\//i.test(endpoint)) {
    return notificationResponse_('Endpoint must be an HTTPS URL.');
  }
  // Tool name is only required for true MCP types (Custom, Teams, Asana
  // MCP V2). Direct-post types (asana-rest, webhook) don't render the
  // field and don't use it during dispatch.
  if (!isDirectPost && !toolName) {
    return notificationResponse_('Please enter a tool name.');
  }

  const serverId = e.parameters.serverId || '';
  // Preserve the existing authToken if the user left the field blank
  // (the UI shows a "leave blank to keep current" hint when editing).
  const existingServer = serverId ? findMcpServerById_(serverId) : null;
  const inputAuth = get('mcpAuthToken');
  const authToken = inputAuth !== '' ? inputAuth : (existingServer ? (existingServer.authToken || '') : '');
  const server = {
    id: serverId || Utilities.getUuid(),
    name: name,
    type: type,
    endpoint: endpoint,
    authToken: authToken,
    toolName: isDirectPost ? '' : toolName,
    toolArgsTemplate: get('mcpToolArgsTemplate') || '{"message":"{{message}}"}'
  };

  try { upsertMcpServer(server); }
  catch (err) { return notificationResponse_('Save failed: ' + err.message); }

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard().updateCard(buildSettingsCard()))
    .setNotification(CardService.newNotification()
      .setText('External integration "' + name + '" saved.'))
    .build();
}

function handleDeleteMcpServerPrompt(e) {
  const server = getMcpServerById(e.parameters.serverId);
  const name = server ? server.name : 'this server';
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText('Delete external integration <b>' + escapeHtml_(name) + '</b>? This cannot be undone.'))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(whiteText_('Delete'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND_RED_)
        .setOnClickAction(actionWithServerId_('handleConfirmDeleteMcpServer', e.parameters.serverId)))
      .addButton(CardService.newTextButton()
        .setText('Cancel')
        .setOnClickAction(action_('handlePopCard'))));
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(
      CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader().setTitle('Confirm delete'))
        .addSection(section)
        .build()))
    .build();
}

function handleConfirmDeleteMcpServer(e) {
  deleteMcpServer(e.parameters.serverId);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popToRoot().updateCard(buildSettingsCard()))
    .setNotification(CardService.newNotification().setText('External integration deleted.'))
    .build();
}

// ─────────────────────────────────────────────────────────────────────────────
// AI format suggestion
// ─────────────────────────────────────────────────────────────────────────────

function handleHelpWriteAlertText(e) {
  const inputs = e.commonEventObject.formInputs || {};
  const get = key => {
    const v = inputs[key];
    if (!v || !v.stringInputs || !v.stringInputs.value) return '';
    return (v.stringInputs.value[0] || '').trim();
  };
  const getMultiSelect = key => {
    const v = inputs[key];
    return (v && v.stringInputs && v.stringInputs.value) ? v.stringInputs.value.filter(Boolean) : [];
  };
  const getCheckbox = key => {
    const v = inputs[key];
    return !!(v && v.stringInputs && v.stringInputs.value &&
      v.stringInputs.value.indexOf('true') >= 0);
  };

  const s = loadSettings();
  if (!s.geminiApiKey) {
    return notificationResponse_('Add a Gemini API key in Settings first.');
  }

  const smsNums      = getMultiSelect('smsRecipients');
  const chatSelected = getMultiSelect('chatSpaces');
  const mcpIds       = getMultiSelect('mcpServers');

  const channels = [];
  if (smsNums.length)                  channels.push('SMS text message');
  if (chatSelected.length)             channels.push('Google Chat');
  if (getCheckbox('calendarEnabled'))  channels.push('Google Calendar event');
  if (getCheckbox('sheetsEnabled'))    channels.push('Google Sheets log row');
  if (getCheckbox('tasksEnabled'))     channels.push('Google Task');
  if (mcpIds.length) {
    const allMcpServers = loadMcpServers();
    const mcpNamesList = mcpIds.map(function(id) {
      const sv = allMcpServers.find(function(s) { return s.id === id; });
      return sv ? sv.name : id;
    });
    channels.push('MCP server (' + mcpNamesList.join(', ') + ')');
  }

  const ctx = {
    name:                  get('name'),
    labels:                get('labels'),
    ruleText:              get('ruleText'),
    existingAlertPrompt:   get('alertMessagePrompt'),
    channels:              channels,
    smsRecipients:         smsNums,
    chatSpaces:            chatSelected,
    calendarEnabled:       getCheckbox('calendarEnabled'),
    sheetsEnabled:         getCheckbox('sheetsEnabled'),
    tasksEnabled:          getCheckbox('tasksEnabled'),
    mcpServerIds:          mcpIds
  };
  PropertiesService.getUserProperties()
    .setProperty('mailsentinel.tmp.fmtctx', JSON.stringify(ctx));

  const channelLine = channels.length
    ? 'Selected ' + (channels.length === 1 ? 'channel' : 'channels') + ': <b>' + escapeHtml_(channels.join(', ')) + '</b>. The AI will tailor the format accordingly.'
    : '<i>No alert channels selected yet — the suggestion will be generic. Tick channels in the rule editor first for a tailored format.</i>';

  const ruleId = e.parameters.ruleId || '';
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(channelLine))
    .addWidget(CardService.newTextParagraph()
      .setText('Describe what the alert message should say, in your own words. The AI will turn it into a clear instruction Gemini uses to format every alert.'))
    .addWidget(CardService.newTextInput()
      .setFieldName('alertDescription')
      .setTitle('What should the alert message include?')
      .setHint('e.g. "just the sender name and a one-line summary" or "date, subject, key action items, and any due dates"')
      .setMultiline(true)
      .setValue(ctx.existingAlertPrompt || ''))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(whiteText_('Generate'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND_PURPLE_)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('handleGenerateAlertText')
          .setParameters({ ruleId: ruleId })))
      .addButton(CardService.newTextButton()
        .setText('Cancel')
        .setOnClickAction(action_('handlePopCard'))));

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(
      CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader().setTitle('Help me write the alert text'))
        .addSection(section)
        .build()))
    .build();
}

function handleGenerateAlertText(e) {
  const inputs = e.commonEventObject.formInputs || {};
  const get = key => {
    const v = inputs[key];
    if (!v || !v.stringInputs || !v.stringInputs.value) return '';
    return (v.stringInputs.value[0] || '').trim();
  };

  const description = get('alertDescription');
  if (!description) {
    return notificationResponse_('Please describe what the alert message should include.');
  }

  const s = loadSettings();
  if (!s.geminiApiKey) {
    return notificationResponse_('Add a Gemini API key in Settings first.');
  }

  const ctxRaw = PropertiesService.getUserProperties()
    .getProperty('mailsentinel.tmp.fmtctx');
  let ctx = {};
  try { ctx = JSON.parse(ctxRaw || '{}'); } catch (_) {}

  const channels = Array.isArray(ctx.channels) ? ctx.channels : [];
  const channelNote = channels.length
    ? 'Alert ' + (channels.length === 1 ? 'destination' : 'destinations') + ': ' + channels.join(', ') + '.\n\n'
    : '';

  const ruleText = ctx.ruleText || '(no rule text entered)';

  const prompt =
    'You help configure an email scanning alert system. ' +
    'A rule triggers when an email matches this description:\n\n' +
    '"' + ruleText + '"\n\n' +
    channelNote +
    'A user has described what the alert message should say, in their own words:\n\n' +
    '"' + description + '"\n\n' +
    'Rewrite this as a concise plain-English instruction (2–5 sentences) telling an AI how to format the alert message. ' +
    'The AI will use this instruction to summarize the matching email. ' +
    'Be specific about what information to include and how to present it. ' +
    'Tailor the format for each destination — brief for SMS, richer for Sheets. ' +
    'Output only the instruction itself, no preamble or quotes.';

  let suggestion;
  try {
    // 1024 max tokens — Gemini 2.5 Flash/Pro count internal "thinking" tokens
    // against this cap, so a tight 200 budget gets eaten almost entirely by
    // reasoning before any output is produced (mid-sentence truncation).
    suggestion = callGemini_(s.geminiApiKey, s.geminiModel, prompt, 1024);
    if (!suggestion) throw new Error('Empty response from Gemini.');
  } catch (err) {
    return notificationResponse_('Could not generate alert text: ' + err.message);
  }

  ctx.suggestion = suggestion;
  PropertiesService.getUserProperties()
    .setProperty('mailsentinel.tmp.fmtctx', JSON.stringify(ctx));

  const ruleId = e.parameters.ruleId || '';
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText('<b>Suggested alert format:</b><br><br>' + escapeHtml_(suggestion)))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(whiteText_('Use this'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND_PURPLE_)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('handleUseSuggestedFormat')
          .setParameters({ ruleId: ruleId })))
      .addButton(CardService.newTextButton()
        .setText('Try again')
        .setOnClickAction(action_('handlePopCard'))));

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(
      CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader().setTitle('AI format suggestion'))
        .addSection(section)
        .build()))
    .build();
}

function handleUseSuggestedFormat(e) {
  const ctxRaw = PropertiesService.getUserProperties()
    .getProperty('mailsentinel.tmp.fmtctx');
  PropertiesService.getUserProperties().deleteProperty('mailsentinel.tmp.fmtctx');

  let ctx = {};
  try { ctx = JSON.parse(ctxRaw || '{}'); } catch (_) {}

  const ruleId = e.parameters.ruleId || '';

  let r;
  if (ruleId) {
    // Editing an existing rule — load from storage, override alertMessagePrompt only
    r = getRuleById(ruleId);
    if (!r) {
      return CardService.newActionResponseBuilder()
        .setNavigation(CardService.newNavigation().popCard())
        .setNotification(CardService.newNotification().setText('Rule not found.'))
        .build();
    }
    r = Object.assign({}, r, { alertMessagePrompt: ctx.suggestion || '' });
  } else {
    // New rule — restore form state from stored context
    r = {
      id: null,
      name:               ctx.name   || '',
      labels:             splitCsv_(ctx.labels || 'INBOX'),
      ruleText:           ctx.ruleText || '',
      alertMessagePrompt: ctx.suggestion || '',
      alerts: {
        smsNumbers:      Array.isArray(ctx.smsRecipients) ? ctx.smsRecipients : [],
        chatSpaces:      Array.isArray(ctx.chatSpaces)    ? ctx.chatSpaces    : [],
        calendarEnabled: !!ctx.calendarEnabled,
        sheetsEnabled:   !!ctx.sheetsEnabled,
        tasksEnabled:    !!ctx.tasksEnabled,
        mcpServerIds:    Array.isArray(ctx.mcpServerIds)  ? ctx.mcpServerIds  : []
      }
    };
  }

  // Pop the suggestion card and the description-input card, then update the editor
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard().popCard()
      .updateCard(buildRuleEditorCard(r)))
    .build();
}

// ─────────────────────────────────────────────────────────────────────────────
// AI rule text suggestion
// ─────────────────────────────────────────────────────────────────────────────

function handleHelpWriteRuleText(e) {
  const inputs = e.commonEventObject.formInputs || {};
  const get = key => {
    const v = inputs[key];
    if (!v || !v.stringInputs || !v.stringInputs.value) return '';
    return (v.stringInputs.value[0] || '').trim();
  };
  const getMultiSelect = key => {
    const v = inputs[key];
    return (v && v.stringInputs && v.stringInputs.value) ? v.stringInputs.value.filter(Boolean) : [];
  };
  const getCheckbox = key => {
    const v = inputs[key];
    return !!(v && v.stringInputs && v.stringInputs.value &&
      v.stringInputs.value.indexOf('true') >= 0);
  };

  if (!isPro()) {
    return notificationResponse_(upgradeRequiredMessage('AI-assisted rule writing'));
  }
  const s = loadSettings();
  if (!s.geminiApiKey) {
    return notificationResponse_('Add a Gemini API key in Settings first.');
  }

  // Stash the rest of the form so the editor can be restored intact after generation
  const ctx = {
    name:               get('name'),
    labels:             get('labels') || 'INBOX',
    existingRuleText:   get('ruleText'),
    alertMessagePrompt: get('alertMessagePrompt'),
    smsRecipients:      getMultiSelect('smsRecipients'),
    chatSpaces:         getMultiSelect('chatSpaces'),
    calendarEnabled:    getCheckbox('calendarEnabled'),
    sheetsEnabled:      getCheckbox('sheetsEnabled'),
    tasksEnabled:       getCheckbox('tasksEnabled'),
    mcpServerIds:       getMultiSelect('mcpServers')
  };
  PropertiesService.getUserProperties()
    .setProperty('mailsentinel.tmp.rulectx', JSON.stringify(ctx));

  const ruleId = e.parameters.ruleId || '';
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText('Describe in your own words what kind of emails should trigger this alert. Be as informal as you like — the AI will clean it up into a clear rule description.'))
    .addWidget(CardService.newTextInput()
      .setFieldName('ruleDescription')
      .setTitle('What kind of emails should this rule match?')
      .setHint('e.g. "anything urgent from my boss" or "shipping notices from amazon"')
      .setMultiline(true)
      .setValue(ctx.existingRuleText || ''))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(whiteText_('Generate'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND_PURPLE_)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('handleGenerateRuleText')
          .setParameters({ ruleId: ruleId })))
      .addButton(CardService.newTextButton()
        .setText('Cancel')
        .setOnClickAction(action_('handlePopCard'))));

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(
      CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader().setTitle('Help me write the rule text'))
        .addSection(section)
        .build()))
    .build();
}

function handleGenerateRuleText(e) {
  const inputs = e.commonEventObject.formInputs || {};
  const get = key => {
    const v = inputs[key];
    if (!v || !v.stringInputs || !v.stringInputs.value) return '';
    return (v.stringInputs.value[0] || '').trim();
  };

  const description = get('ruleDescription');
  if (!description) {
    return notificationResponse_('Please describe the kind of emails you want to match.');
  }

  const s = loadSettings();
  if (!s.geminiApiKey) {
    return notificationResponse_('Add a Gemini API key in Settings first.');
  }

  const ctxRaw = PropertiesService.getUserProperties()
    .getProperty('mailsentinel.tmp.rulectx');
  let ctx = {};
  try { ctx = JSON.parse(ctxRaw || '{}'); } catch (_) {}

  const labels = ctx.labels || 'INBOX';
  const intro = ctx.name
    ? 'The rule is named "' + ctx.name + '" and watches the "' + labels + '" Gmail ' + (labels.split(',').filter(Boolean).length === 1 ? 'label' : 'labels') + '. '
    : '';

  const prompt =
    'You help configure an email scanning rule. ' + intro +
    'A user has described the emails they want to be alerted about, in their own words:\n\n' +
    '"' + description + '"\n\n' +
    'Rewrite this as a clear, concise plain-English rule description (1–3 sentences) that an AI can use to decide whether an incoming email matches. ' +
    'Be specific about senders, subjects, keywords, or content patterns that should match. ' +
    'Output only the rule text itself, no preamble or quotes.';

  let suggestion;
  try {
    // 1024 max tokens — Gemini 2.5 Flash/Pro count internal "thinking" tokens
    // against this cap, so a tight 200 budget gets eaten almost entirely by
    // reasoning before any output is produced (mid-sentence truncation).
    suggestion = callGemini_(s.geminiApiKey, s.geminiModel, prompt, 1024);
    if (!suggestion) throw new Error('Empty response from Gemini.');
  } catch (err) {
    return notificationResponse_('Could not generate rule text: ' + err.message);
  }

  // Save the suggestion alongside the existing context for handleUseSuggestedRuleText
  ctx.suggestion = suggestion;
  PropertiesService.getUserProperties()
    .setProperty('mailsentinel.tmp.rulectx', JSON.stringify(ctx));

  const ruleId = e.parameters.ruleId || '';
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText('<b>Suggested rule text:</b><br><br>' + escapeHtml_(suggestion)))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(whiteText_('Use this'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND_PURPLE_)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('handleUseSuggestedRuleText')
          .setParameters({ ruleId: ruleId })))
      .addButton(CardService.newTextButton()
        .setText('Try again')
        .setOnClickAction(action_('handlePopCard'))));

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(
      CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader().setTitle('AI rule suggestion'))
        .addSection(section)
        .build()))
    .build();
}

function handleUseSuggestedRuleText(e) {
  const ctxRaw = PropertiesService.getUserProperties()
    .getProperty('mailsentinel.tmp.rulectx');
  PropertiesService.getUserProperties().deleteProperty('mailsentinel.tmp.rulectx');

  let ctx = {};
  try { ctx = JSON.parse(ctxRaw || '{}'); } catch (_) {}

  const ruleId = e.parameters.ruleId || '';

  let r;
  if (ruleId) {
    // Editing an existing rule — load from storage, override ruleText only
    r = getRuleById(ruleId);
    if (!r) {
      return CardService.newActionResponseBuilder()
        .setNavigation(CardService.newNavigation().popCard())
        .setNotification(CardService.newNotification().setText('Rule not found.'))
        .build();
    }
    r = Object.assign({}, r, { ruleText: ctx.suggestion || '' });
  } else {
    // New rule — restore form state from stored context
    r = {
      id: null,
      name:               ctx.name   || '',
      labels:             splitCsv_(ctx.labels || 'INBOX'),
      ruleText:           ctx.suggestion || '',
      alertMessagePrompt: ctx.alertMessagePrompt || DEFAULT_ALERT_MESSAGE_PROMPT,
      alerts: {
        smsNumbers:      Array.isArray(ctx.smsRecipients) ? ctx.smsRecipients : [],
        chatSpaces:      Array.isArray(ctx.chatSpaces)    ? ctx.chatSpaces    : [],
        calendarEnabled: !!ctx.calendarEnabled,
        sheetsEnabled:   !!ctx.sheetsEnabled,
        tasksEnabled:    !!ctx.tasksEnabled,
        mcpServerIds:    Array.isArray(ctx.mcpServerIds)  ? ctx.mcpServerIds  : []
      }
    };
  }

  // Pop the suggestion card and the description-input card, then update the editor
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard().popCard()
      .updateCard(buildRuleEditorCard(r)))
    .build();
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS Recipient management
// ─────────────────────────────────────────────────────────────────────────────

function getSmsRecipientsArr_() {
  const s = loadSettings();
  var arr = [];
  try { arr = JSON.parse(s.smsRecipients || '[]'); } catch (e) {}
  if (!Array.isArray(arr)) arr = [];
  // Ensure each entry has an id (backward compat with entries saved without one)
  return arr.map(function(r) { return r.id ? r : Object.assign({ id: Utilities.getUuid() }, r); });
}

function saveSmsRecipientsArr_(arr) {
  const s = loadSettings();
  s.smsRecipients = JSON.stringify(arr);
  saveSettings(s);
}

// Country codes for the phone-number dropdown.
// Stored as the E.164 dial-code prefix.
const COUNTRY_CODES = [
  { code: '+1',   label: '🇺🇸 +1 (US/Canada)' },
  { code: '+44',  label: '🇬🇧 +44 (United Kingdom)' },
  { code: '+61',  label: '🇦🇺 +61 (Australia)' },
  { code: '+64',  label: '🇳🇿 +64 (New Zealand)' },
  { code: '+33',  label: '🇫🇷 +33 (France)' },
  { code: '+49',  label: '🇩🇪 +49 (Germany)' },
  { code: '+39',  label: '🇮🇹 +39 (Italy)' },
  { code: '+34',  label: '🇪🇸 +34 (Spain)' },
  { code: '+31',  label: '🇳🇱 +31 (Netherlands)' },
  { code: '+32',  label: '🇧🇪 +32 (Belgium)' },
  { code: '+41',  label: '🇨🇭 +41 (Switzerland)' },
  { code: '+43',  label: '🇦🇹 +43 (Austria)' },
  { code: '+46',  label: '🇸🇪 +46 (Sweden)' },
  { code: '+47',  label: '🇳🇴 +47 (Norway)' },
  { code: '+45',  label: '🇩🇰 +45 (Denmark)' },
  { code: '+358', label: '🇫🇮 +358 (Finland)' },
  { code: '+353', label: '🇮🇪 +353 (Ireland)' },
  { code: '+351', label: '🇵🇹 +351 (Portugal)' },
  { code: '+30',  label: '🇬🇷 +30 (Greece)' },
  { code: '+48',  label: '🇵🇱 +48 (Poland)' },
  { code: '+420', label: '🇨🇿 +420 (Czechia)' },
  { code: '+52',  label: '🇲🇽 +52 (Mexico)' },
  { code: '+55',  label: '🇧🇷 +55 (Brazil)' },
  { code: '+54',  label: '🇦🇷 +54 (Argentina)' },
  { code: '+56',  label: '🇨🇱 +56 (Chile)' },
  { code: '+57',  label: '🇨🇴 +57 (Colombia)' },
  { code: '+91',  label: '🇮🇳 +91 (India)' },
  { code: '+81',  label: '🇯🇵 +81 (Japan)' },
  { code: '+82',  label: '🇰🇷 +82 (South Korea)' },
  { code: '+86',  label: '🇨🇳 +86 (China)' },
  { code: '+852', label: '🇭🇰 +852 (Hong Kong)' },
  { code: '+65',  label: '🇸🇬 +65 (Singapore)' },
  { code: '+60',  label: '🇲🇾 +60 (Malaysia)' },
  { code: '+66',  label: '🇹🇭 +66 (Thailand)' },
  { code: '+62',  label: '🇮🇩 +62 (Indonesia)' },
  { code: '+63',  label: '🇵🇭 +63 (Philippines)' },
  { code: '+84',  label: '🇻🇳 +84 (Vietnam)' },
  { code: '+972', label: '🇮🇱 +972 (Israel)' },
  { code: '+971', label: '🇦🇪 +971 (UAE)' },
  { code: '+966', label: '🇸🇦 +966 (Saudi Arabia)' },
  { code: '+27',  label: '🇿🇦 +27 (South Africa)' },
  { code: '+234', label: '🇳🇬 +234 (Nigeria)' },
  { code: '+254', label: '🇰🇪 +254 (Kenya)' },
  { code: '+20',  label: '🇪🇬 +20 (Egypt)' },
  { code: '+90',  label: '🇹🇷 +90 (Turkey)' },
  { code: '+7',   label: '🇷🇺 +7 (Russia)' },
  { code: '+380', label: '🇺🇦 +380 (Ukraine)' }
];

const DEFAULT_COUNTRY_CODE = '+1';

/**
 * Split a stored E.164 number into a known country-code prefix and the
 * remaining local digits. Matches the longest known prefix; if none match,
 * returns the default country code with the whole number (minus '+') as digits.
 */
function splitPhoneNumber_(e164) {
  if (!e164) return { code: DEFAULT_COUNTRY_CODE, digits: '' };
  const sorted = COUNTRY_CODES.map(function(c) { return c.code; })
    .sort(function(a, b) { return b.length - a.length; });
  for (var i = 0; i < sorted.length; i++) {
    if (e164.indexOf(sorted[i]) === 0) {
      return { code: sorted[i], digits: e164.substring(sorted[i].length) };
    }
  }
  return { code: DEFAULT_COUNTRY_CODE, digits: e164.replace(/^\+/, '') };
}

/**
 * Combine a selected country code (e.g. '+1') with a user-entered local
 * number (digits, possibly with formatting) into a validated E.164 string.
 * For US/Canada, a leading '1' on a 11-digit input is stripped.
 *
 * Returns { value, valid, reason }.
 */
function combinePhoneNumber_(countryCode, localInput) {
  const code = countryCode || DEFAULT_COUNTRY_CODE;
  const digits = String(localInput || '').replace(/\D/g, '');
  if (!digits) return { value: '', valid: false, reason: 'Phone number is empty.' };
  var localDigits = digits;
  if (code === '+1' && /^1\d{10}$/.test(digits)) {
    localDigits = digits.substring(1);
  }
  const e164 = code + localDigits;
  if (!/^\+\d{7,15}$/.test(e164)) {
    return { value: '', valid: false, reason: 'Phone number must be 7–15 digits.' };
  }
  return { value: e164, valid: true, reason: '' };
}

/** Build a country-code dropdown selection input pre-selected to `selectedCode`. */
function buildCountryCodeDropdown_(fieldName, title, selectedCode) {
  const sel = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName(fieldName)
    .setTitle(title);
  const chosen = selectedCode || DEFAULT_COUNTRY_CODE;
  COUNTRY_CODES.forEach(function(c) {
    sel.addItem(c.label, c.code, c.code === chosen);
  });
  return sel;
}

function buildSmsRecipientEditorCard(recipient) {
  const editing = !!(recipient && recipient.id);
  const rec = recipient || {};
  const split = splitPhoneNumber_(rec.number || '');
  const section = CardService.newCardSection();
  section.addWidget(CardService.newTextInput()
    .setFieldName('smsRecName')
    .setTitle('Name')
    .setHint('e.g. My Phone, John')
    .setValue(rec.name || ''));
  section.addWidget(buildCountryCodeDropdown_('smsRecCountryCode', 'Country code', split.code));
  section.addWidget(CardService.newTextInput()
    .setFieldName('smsRecNumber')
    .setTitle('Phone number (digits only)')
    .setHint('e.g. 5551234567 — country code is added from the dropdown above')
    .setValue(split.digits));
  const btns = CardService.newButtonSet()
    .addButton(CardService.newTextButton()
      .setText(whiteText_('Save'))
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor(BRAND_PURPLE_)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('handleSaveSmsRecipient')
        .setParameters({ recId: rec.id || '' })))
    .addButton(CardService.newTextButton()
      .setText('Cancel')
      .setOnClickAction(action_('handlePopCard')));
  if (editing) {
    btns.addButton(CardService.newTextButton()
      .setText(whiteText_('Delete'))
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor(BRAND_RED_)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('handleDeleteSmsRecipientPrompt')
        .setParameters({ recId: rec.id })));
  }
  section.addWidget(btns);
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(editing ? 'Edit SMS recipient' : 'Add SMS recipient'))
    .addSection(buildUnsavedChangesNotice_())
    .addSection(section)
    .build();
}

function handleShowNewSmsRecipient(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildSmsRecipientEditorCard(null)))
    .build();
}

function handleEditSmsRecipient(e) {
  const arr = getSmsRecipientsArr_();
  const rec = arr.find(function(r) { return r.id === e.parameters.recId; });
  if (!rec) return notificationResponse_('Recipient not found.');
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildSmsRecipientEditorCard(rec)))
    .build();
}

function handleSaveSmsRecipient(e) {
  const inputs = e.commonEventObject.formInputs || {};
  const get = function(k) {
    const v = inputs[k];
    if (!v || !v.stringInputs || !v.stringInputs.value) return '';
    return (v.stringInputs.value[0] || '').trim();
  };
  const name        = get('smsRecName');
  const countryCode = get('smsRecCountryCode') || DEFAULT_COUNTRY_CODE;
  const localInput  = get('smsRecNumber');
  if (!name)        return notificationResponse_('Please enter a name.');
  if (!localInput)  return notificationResponse_('Please enter a phone number.');
  const combined = combinePhoneNumber_(countryCode, localInput);
  if (!combined.valid) {
    return notificationResponse_(combined.reason);
  }
  const recId = e.parameters.recId || '';
  const arr = getSmsRecipientsArr_();
  const idx = arr.findIndex(function(r) { return r.id === recId; });
  const entry = { id: recId || Utilities.getUuid(), name: name, number: combined.value };
  if (idx >= 0) { arr[idx] = entry; } else { arr.push(entry); }
  saveSmsRecipientsArr_(arr);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard().updateCard(buildSettingsCard()))
    .setNotification(CardService.newNotification().setText('Recipient "' + name + '" saved as ' + combined.value + '.'))
    .build();
}

function handleDeleteSmsRecipientPrompt(e) {
  const arr = getSmsRecipientsArr_();
  const rec = arr.find(function(r) { return r.id === e.parameters.recId; });
  const name = rec ? rec.name : 'this recipient';
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText('Delete SMS recipient <b>' + escapeHtml_(name) + '</b>? This cannot be undone.'))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(whiteText_('Delete'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND_RED_)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('handleConfirmDeleteSmsRecipient')
          .setParameters({ recId: e.parameters.recId })))
      .addButton(CardService.newTextButton()
        .setText('Cancel')
        .setOnClickAction(action_('handlePopCard'))));
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(
      CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader().setTitle('Confirm delete'))
        .addSection(section)
        .build()))
    .build();
}

function handleConfirmDeleteSmsRecipient(e) {
  const arr = getSmsRecipientsArr_().filter(function(r) { return r.id !== e.parameters.recId; });
  saveSmsRecipientsArr_(arr);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popToRoot().updateCard(buildSettingsCard()))
    .setNotification(CardService.newNotification().setText('Recipient deleted.'))
    .build();
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Space management
// ─────────────────────────────────────────────────────────────────────────────

function getChatSpacesArr_() {
  const s = loadSettings();
  var arr = [];
  try { arr = JSON.parse(s.chatSpaces || '[]'); } catch (e) {}
  if (!Array.isArray(arr)) arr = [];
  return arr.map(function(cs) { return cs.id ? cs : Object.assign({ id: Utilities.getUuid() }, cs); });
}

function saveChatSpacesArr_(arr) {
  const s = loadSettings();
  s.chatSpaces = JSON.stringify(arr);
  saveSettings(s);
}

function buildChatSpaceEditorCard(space) {
  const editing = !!(space && space.id);
  const cs = space || {};
  const section = CardService.newCardSection();
  section.addWidget(CardService.newTextInput()
    .setFieldName('chatSpaceName')
    .setTitle('Space name')
    .setHint('e.g. "emAIl Sentinel alerts"')
    .setValue(cs.name || ''));
  section.addWidget(CardService.newTextInput()
    .setFieldName('chatSpaceUrl')
    .setTitle('Webhook URL')
    .setHint('Paste the webhook URL from Google Chat')
    .setValue(cs.url || ''));
  section.addWidget(CardService.newTextParagraph().setText(
    '<font color="#888888">To get a webhook URL: open the space in ' +
    '<a href="https://chat.google.com">chat.google.com</a>, click the space name ' +
    '\u25b8 Apps &amp; integrations \u25b8 Webhooks \u25b8 Add webhook.</font>'));
  const btns = CardService.newButtonSet()
    .addButton(CardService.newTextButton()
      .setText(whiteText_('Save'))
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor(BRAND_PURPLE_)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('handleSaveChatSpace')
        .setParameters({ spaceId: cs.id || '' })))
    .addButton(CardService.newTextButton()
      .setText('Cancel')
      .setOnClickAction(action_('handlePopCard')));
  if (editing) {
    btns.addButton(CardService.newTextButton()
      .setText(whiteText_('Delete'))
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor(BRAND_RED_)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('handleDeleteChatSpacePrompt')
        .setParameters({ spaceId: cs.id })));
  }
  section.addWidget(btns);
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(editing ? 'Edit Chat space' : 'Add Chat space'))
    .addSection(buildUnsavedChangesNotice_())
    .addSection(section)
    .build();
}

function handleShowNewChatSpace(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildChatSpaceEditorCard(null)))
    .build();
}

function handleEditChatSpace(e) {
  const arr = getChatSpacesArr_();
  const cs = arr.find(function(s) { return s.id === e.parameters.spaceId; });
  if (!cs) return notificationResponse_('Chat space not found.');
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildChatSpaceEditorCard(cs)))
    .build();
}

function handleSaveChatSpace(e) {
  const inputs = e.commonEventObject.formInputs || {};
  const get = function(k) {
    const v = inputs[k];
    if (!v || !v.stringInputs || !v.stringInputs.value) return '';
    return (v.stringInputs.value[0] || '').trim();
  };
  const name = get('chatSpaceName');
  const url  = get('chatSpaceUrl');
  if (!name) return notificationResponse_('Please enter a space name.');
  if (!url)  return notificationResponse_('Please enter a webhook URL.');
  if (!/^https:\/\//i.test(url)) return notificationResponse_('Webhook URL must start with https://');
  const spaceId = e.parameters.spaceId || '';
  const arr = getChatSpacesArr_();
  const idx = arr.findIndex(function(s) { return s.id === spaceId; });
  const entry = { id: spaceId || Utilities.getUuid(), name: name, url: url };
  if (idx >= 0) { arr[idx] = entry; } else { arr.push(entry); }
  saveChatSpacesArr_(arr);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard().updateCard(buildSettingsCard()))
    .setNotification(CardService.newNotification().setText('Chat space "' + name + '" saved.'))
    .build();
}

function handleDeleteChatSpacePrompt(e) {
  const arr = getChatSpacesArr_();
  const cs = arr.find(function(s) { return s.id === e.parameters.spaceId; });
  const name = cs ? cs.name : 'this space';
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText('Delete Chat space <b>' + escapeHtml_(name) + '</b>? This cannot be undone.'))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(whiteText_('Delete'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND_RED_)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('handleConfirmDeleteChatSpace')
          .setParameters({ spaceId: e.parameters.spaceId })))
      .addButton(CardService.newTextButton()
        .setText('Cancel')
        .setOnClickAction(action_('handlePopCard'))));
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(
      CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader().setTitle('Confirm delete'))
        .addSection(section)
        .build()))
    .build();
}

function handleConfirmDeleteChatSpace(e) {
  const arr = getChatSpacesArr_().filter(function(s) { return s.id !== e.parameters.spaceId; });
  saveChatSpacesArr_(arr);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popToRoot().updateCard(buildSettingsCard()))
    .setNotification(CardService.newNotification().setText('Chat space deleted.'))
    .build();
}
