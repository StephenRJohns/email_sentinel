/**
 * RuleEvaluator.gs — Use Google Gemini to decide whether an email matches
 * a rule, and to format the resulting alert message.
 *
 * Calls the Gemini REST API via UrlFetchApp. We deliberately use the REST
 * endpoint (not a Google client library) so the only credential needed is
 * the user's own API key from Google AI Studio — no extra OAuth scopes.
 */

const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

const GEMINI_DEFAULT_MODEL = 'gemini-2.0-flash';

/**
 * Ask Gemini whether an email matches a rule.
 * Returns { matched: boolean, reason: string }.
 */
function evaluateEmailAgainstRule(emailData, rule, apiKey, model) {
  const attachmentList = (emailData.attachmentNames || []).join(', ') || 'None';
  const bodyExcerpt = (emailData.body || '').substring(0, 2000);

  const prompt =
    'You are an email filtering assistant. Evaluate whether the following email matches the given rule.\n\n' +
    'RULE: ' + rule.ruleText + '\n\n' +
    'EMAIL DETAILS:\n' +
    'From: ' + (emailData.from || '(unknown)') + '\n' +
    'Subject: ' + (emailData.subject || '(no subject)') + '\n' +
    'Received: ' + (emailData.receivedDateTime || '(unknown)') + '\n' +
    'Attachments: ' + attachmentList + '\n' +
    'Body (first 2000 characters):\n' + bodyExcerpt + '\n\n' +
    'Does this email match the rule? Answer with YES or NO on the first line, ' +
    'followed by a brief reason (1-2 sentences).';

  const text = callGemini_(apiKey, model, prompt, 150);
  if (text === null) {
    return { matched: false, reason: 'Gemini call failed' };
  }
  const firstLine = text.split('\n')[0].trim().toUpperCase();
  const matched = firstLine.indexOf('YES') === 0;
  const lines = text.split('\n');
  const reason = lines.length > 1 ? lines.slice(1).join(' ').trim() : text;
  return { matched: matched, reason: reason };
}

/**
 * Ask Gemini to compose a formatted alert message for a matched email.
 * Falls back to a plain-text summary on any error.
 */
function generateAlertMessage(emailData, rule, apiKey, model) {
  const formatInstructions =
    (rule.alertMessagePrompt && rule.alertMessagePrompt.trim()) ||
    DEFAULT_ALERT_MESSAGE_PROMPT;
  const attachmentList = (emailData.attachmentNames || []).join(', ') || 'None';
  const bodyExcerpt = (emailData.body || '').substring(0, 2000);

  const prompt =
    'You are an email alert formatter. Generate a concise, professional alert ' +
    'message for the following email.\n\n' +
    'FORMAT INSTRUCTIONS: ' + formatInstructions + '\n\n' +
    'EMAIL:\n' +
    'From: ' + (emailData.from || '(unknown)') + '\n' +
    'Subject: ' + (emailData.subject || '(no subject)') + '\n' +
    'Received: ' + (emailData.receivedDateTime || '(unknown)') + '\n' +
    'Attachments: ' + attachmentList + '\n' +
    'Body (first 2000 characters):\n' + bodyExcerpt + '\n\n' +
    'Generate the alert message now, following the format instructions exactly.';

  const text = callGemini_(apiKey, model, prompt, 500);
  if (text === null) return fallbackAlertMessage_(emailData);
  return text;
}

function callGemini_(apiKey, model, prompt, maxTokens) {
  if (!apiKey) {
    log('Gemini call skipped — no API key configured.');
    return null;
  }
  const useModel = model || GEMINI_DEFAULT_MODEL;
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(useModel) + ':generateContent?key=' +
    encodeURIComponent(apiKey);

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.2
    }
  };

  try {
    const resp = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const code = resp.getResponseCode();
    if (code < 200 || code >= 300) {
      log('Gemini HTTP ' + code + ': ' + resp.getContentText().substring(0, 300));
      return null;
    }
    const body = JSON.parse(resp.getContentText());
    const candidates = body.candidates || [];
    if (!candidates.length) return null;
    const parts = (candidates[0].content && candidates[0].content.parts) || [];
    if (!parts.length) return null;
    return (parts[0].text || '').trim();
  } catch (e) {
    log('Gemini exception: ' + e);
    return null;
  }
}

function fallbackAlertMessage_(emailData) {
  return (
    'Date:        ' + (emailData.receivedDateTime || '(unknown)') + '\n' +
    'Subject:     ' + (emailData.subject || '(no subject)') + '\n' +
    'From:        ' + (emailData.from || '(unknown)') + '\n' +
    'Attachments: ' + ((emailData.attachmentNames || []).join(', ') || 'None')
  );
}
