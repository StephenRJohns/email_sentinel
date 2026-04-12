# mAIl Alert™ — Terms of Service

**Effective date:** 2026-04-11
**Operator:** JJJJJ Enterprises, LLC ("we", "us", "our")
**Service:** mAIl Alert, a Google Workspace Add-on for Gmail (the "Service")

By installing or using the Service you ("you", "your") agree to these Terms of Service (the "Terms"). If you do not agree, do not install or use the Service.

---

## 1. Description of the Service

mAIl Alert is a Google Workspace Add-on that runs in your own Google account. It periodically reads metadata and content from Gmail messages in labels you select, evaluates each new message against rules you write in plain English using the Google Gemini API, and — when a rule matches — sends an alert via your own Gmail account and (optionally) via a third-party SMS provider you configure (such as Twilio).

The Service runs entirely inside Google Apps Script under your own credentials. We do not operate any backend that stores your data.

## 2. Eligibility

You must be at least 18 years old (or the age of legal majority in your jurisdiction) and capable of forming a binding contract to use the Service. You represent that you have the right to read the Gmail messages the Service will process on your behalf.

## 3. Your Account and Credentials

You are responsible for:
- the security of your Google account;
- the security of any third-party API keys you enter into the Service (Google Gemini, Twilio, generic webhook endpoints, etc.);
- complying with the terms of every third-party service you connect to the Service.

If you suspect that your credentials have been compromised, revoke them at the issuing provider and remove them from the Service immediately.

## 4. Acceptable Use

You agree NOT to use the Service to:
- process email content that you do not have the legal right to access;
- harass, defraud, impersonate, stalk, or surveil any person;
- generate or distribute spam, phishing messages, or unsolicited bulk SMS;
- violate any applicable law, regulation, or third-party right;
- circumvent any rate limits, security controls, or quotas of Google, Gemini, your SMS provider, or any other integrated service;
- reverse-engineer, decompile, or attempt to extract the source of the Service except as permitted by law.

We may suspend or disable your ability to use the Service if we reasonably believe you are violating these Terms.

## 5. Third-Party Services

The Service depends on, and transmits data to, third-party services that you choose to enable, including but not limited to:
- **Google Gmail / Google Apps Script** — runs the Service and provides access to your mail.
- **Google Gemini API** — receives email content for rule evaluation and alert formatting.
- **Google Calendar / Google Sheets / Google Tasks / Google Chat** — when you enable these alert channels, the Service creates events, appends rows, creates tasks, or posts messages within your own Google account using your OAuth credentials.
- **SMS providers** (Textbelt, Telnyx, Plivo, Twilio, ClickSend, or Vonage) — receives recipient phone numbers and alert text when you enable SMS and select a provider.
- **Any HTTPS endpoint you configure** as a "Generic webhook" SMS provider.

Your use of each third-party service is governed by that provider's own terms and privacy policy. We are not responsible for the acts, omissions, availability, accuracy, or legality of any third-party service. Charges, quotas, and rate limits imposed by third-party providers are your responsibility.

## 6. Fees

The Service itself is provided to you under the license described in the LICENSE file in this repository. Some third-party services it integrates with may charge you directly (for example, Twilio bills per SMS, and Google may bill for Gemini usage above the free tier). Those charges are between you and the provider.

## 7. Intellectual Property

The Service, including all source code, design, documentation, and trademarks, is owned by JJJJJ Enterprises, LLC and is protected by copyright, trademark, and other intellectual property laws. Except for the limited right to install and use the Service in your own Google account in accordance with these Terms and the LICENSE file, no rights are transferred to you.

You retain all rights in any rules, settings, recipient lists, and email content that you supply to the Service. The Service does not store your email content; processing happens transiently inside your own Apps Script execution context.

## 8. Privacy

Your use of the Service is subject to the Privacy Policy in PRIVACY.md, which is incorporated into these Terms by reference.

## 9. Disclaimers

THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, OR UNINTERRUPTED OPERATION.

WITHOUT LIMITING THE FOREGOING, WE DO NOT WARRANT THAT:
- the Service will detect every relevant email;
- alerts will be delivered promptly, in order, or at all;
- Gemini's evaluation of any rule will be correct;
- third-party SMS providers will deliver any given message.

**You must not rely on the Service for life-safety, medical, financial-trading, regulatory-compliance, or any other use where a missed or late alert could cause material harm.**

## 10. Limitation of Liability

TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT WILL JJJJJ ENTERPRISES, LLC OR ITS OFFICERS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS OPPORTUNITY, ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THE SERVICE IS LIMITED TO THE GREATER OF (A) THE AMOUNT YOU PAID US FOR THE SERVICE IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS (USD $100).

Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of the above limitations may not apply to you.

## 11. Indemnification

You agree to indemnify, defend, and hold harmless JJJJJ Enterprises, LLC and its affiliates, officers, and employees from and against any claim, demand, loss, liability, damage, or expense (including reasonable attorneys' fees) arising out of or related to:
- your use of the Service;
- your violation of these Terms;
- your violation of any law or third-party right;
- the email content, rules, or recipient lists you supply to the Service.

## 12. Termination

You may stop using the Service at any time by uninstalling the add-on from your Google account. We may modify, suspend, or discontinue the Service, in whole or in part, at any time, with or without notice. Sections 4–11 and 13–17 survive termination.

## 13. Changes to These Terms

We may update these Terms from time to time. The "Effective date" at the top will reflect the latest revision. Your continued use of the Service after a change becomes effective constitutes acceptance of the revised Terms.

## 14. Governing Law

These Terms are governed by the laws of the State of Texas, USA, without regard to its conflict-of-laws principles. *(Replace with the state of formation of JJJJJ Enterprises, LLC if different.)*

## 15. Dispute Resolution

Any dispute arising out of or relating to these Terms or the Service will be resolved exclusively in the state or federal courts located in the State of Texas, USA, and you consent to the personal jurisdiction of those courts. *(Or substitute an arbitration clause if preferred — talk to a lawyer.)*

## 16. Export Controls

You may not use, export, or re-export the Service in violation of any U.S. or other applicable export control laws and regulations.

## 17. Miscellaneous

These Terms, together with the LICENSE and PRIVACY.md files, are the entire agreement between you and JJJJJ Enterprises, LLC concerning the Service and supersede any prior agreement on the subject. If any provision is held unenforceable, the remaining provisions will continue in full force and effect. Our failure to enforce any right or provision is not a waiver of that right or provision.

---

**Contact:** legal@jjjjjenterprises.example  *(replace with a real address)*
