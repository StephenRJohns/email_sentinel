// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * AlertDispatcher.gs — Send alerts via Gmail email and (optionally) SMS.
 *
 * Email is sent through the running user's own Gmail account via
 * GmailApp.sendEmail — no SMTP server, no app password, nothing to host.
 *
 * SMS uses the user-configured provider. Google does not offer a first-party
 * SMS API, so we support Twilio (most common) plus a generic webhook for
 * other providers (MessageBird, Vonage, AWS SNS via Lambda, self-hosted, ...).
 */

const SMS_PROVIDERS = ['none', 'twilio', 'webhook'];

function dispatchAlerts(rule, emailData, alertContent, matchReason, settings) {
  const message = alertContent || matchReason || '';

  // ── Email ──────────────────────────────────────────────────────────────
  const emailAddrs = (rule.alerts.emailAddresses || [])
    .map(s => s.trim()).filter(Boolean);
  if (emailAddrs.length) {
    try {
      sendEmailAlert_(emailAddrs, rule, emailData, message, settings);
      log('  Email alert sent to: ' + emailAddrs.join(', '));
    } catch (e) {
      log('  Email alert FAILED: ' + e);
    }
  }

  // ── SMS ────────────────────────────────────────────────────────────────
  const smsNumbers = (rule.alerts.smsNumbers || [])
    .map(s => s.trim()).filter(Boolean);
  if (smsNumbers.length) {
    if (settings.smsProvider === 'none' || !settings.smsProvider) {
      log('  SMS alert skipped — no SMS provider configured in Settings.');
    } else {
      smsNumbers.forEach(num => {
        try {
          sendSmsAlert_(num, rule, emailData, message, settings);
          log('  SMS alert sent to: ' + num);
        } catch (e) {
          log('  SMS alert to ' + num + ' FAILED: ' + e);
        }
      });
    }
  }
}

function sendEmailAlert_(toAddresses, rule, emailData, alertContent, settings) {
  const subject =
    '[MailAlert] ' + rule.name + ': ' +
    (emailData.subject || '(no subject)');
  const body =
    'MailAlert Rule Fired: ' + rule.name + '\n' +
    '============================================================\n\n' +
    alertContent + '\n';

  const opts = { name: settings.alertFromAlias || 'MailAlert' };
  GmailApp.sendEmail(toAddresses.join(','), subject, body, opts);
}

function sendSmsAlert_(toNumber, rule, emailData, alertContent, settings) {
  // SMS bodies are short — keep things to ~600 chars max so two-segment
  // messages aren't ten segments.
  const text = ('[MailAlert] ' + rule.name + '\n' + alertContent).substring(0, 600);

  if (settings.smsProvider === 'twilio') {
    sendTwilioSms_(toNumber, text, settings);
  } else if (settings.smsProvider === 'webhook') {
    sendWebhookSms_(toNumber, text, settings);
  } else {
    throw new Error('Unknown SMS provider: ' + settings.smsProvider);
  }
}

function sendTwilioSms_(toNumber, text, settings) {
  if (!settings.twilioAccountSid || !settings.twilioAuthToken || !settings.twilioFromNumber) {
    throw new Error('Twilio settings incomplete (Account SID, Auth Token, From number).');
  }
  const url =
    'https://api.twilio.com/2010-04-01/Accounts/' +
    encodeURIComponent(settings.twilioAccountSid) + '/Messages.json';

  const auth = Utilities.base64Encode(
    settings.twilioAccountSid + ':' + settings.twilioAuthToken
  );

  const resp = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: { Authorization: 'Basic ' + auth },
    payload: {
      From: settings.twilioFromNumber,
      To: toNumber,
      Body: text
    },
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Twilio HTTP ' + code + ': ' + resp.getContentText().substring(0, 200));
  }
}

function sendWebhookSms_(toNumber, text, settings) {
  if (!settings.smsWebhookUrl) {
    throw new Error('Webhook URL not set in Settings → SMS.');
  }
  const resp = UrlFetchApp.fetch(settings.smsWebhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ to: toNumber, body: text }),
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Webhook HTTP ' + code + ': ' + resp.getContentText().substring(0, 200));
  }
}
