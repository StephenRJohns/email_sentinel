# emAIl Sentinel™ — Terms of Service

**Effective date:** 2026-04-11
**Operator:** <img src="images/JStar.png" width="32" alt="JJJJJ Enterprises, LLC"> JJJJJ Enterprises, LLC ("we", "us", "our")
**Service:** emAIl Sentinel, a Google Workspace Add-on for Gmail (the "Service")

By installing or using the Service you ("you", "your") agree to these Terms of Service (the "Terms"). If you do not agree, do not install or use the Service.

---

## 1. Description of the Service

emAIl Sentinel is a Google Workspace Add-on that runs in your own Google account. It periodically reads metadata and content from Gmail messages in labels you select, evaluates each new message against rules you write in plain English using the Google Gemini API, and — when a rule matches — sends an alert via (optionally) SMS through a third-party provider you configure (such as those listed in Section 5), Google Chat, Google Calendar, Google Sheets, Google Tasks, or a Model Context Protocol (MCP) server endpoint you configure (such as Slack, Microsoft 365 / Teams, Asana, or any custom MCP server).

The Service runs entirely inside Google Apps Script under your own credentials. We do not operate any backend that stores your data.

## 2. Eligibility and Scope

The Service is licensed to individual natural persons for personal, non-commercial use only. By installing or using the Service you represent that:

- you are at least 18 years old (or the age of legal majority in your jurisdiction) and capable of forming a binding contract;
- you will use the Service only within your own personal Google account and only to process Gmail messages you have the legal right to access;
- you are not installing or using the Service on behalf of a business, organization, government entity, or other third party.

**Business, enterprise, and processor use is not permitted** without a separate written agreement with JJJJJ Enterprises, LLC, including (where applicable under GDPR Article 28) a Data Processing Addendum.

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

You further agree NOT to use the Service to process:
- Protected Health Information (PHI) as defined under the U.S. Health Insurance Portability and Accountability Act (HIPAA);
- cardholder data as defined under the Payment Card Industry Data Security Standard (PCI DSS);
- "special categories" of personal data as defined under GDPR Article 9 (including racial or ethnic origin, political opinions, religious beliefs, health data, sexual orientation, biometric or genetic data) unless you have an independent lawful basis under GDPR Article 9(2) and appropriate safeguards in place;
- personal information of children under 13 (or the equivalent age of digital consent in your jurisdiction);
- classified, export-controlled, or attorney-client privileged information.

We may suspend or disable your ability to use the Service if we reasonably believe you are violating these Terms.

## 5. Third-Party Services

The Service depends on, and transmits data to, third-party services that you choose to enable, including but not limited to:
- **Google Gmail / Google Apps Script** — runs the Service and provides access to your mail.
- **Google Gemini API** — receives email content for rule evaluation and alert formatting.
- **Google Calendar / Google Sheets / Google Tasks / Google Chat** — when you enable these alert channels, the Service creates events, appends rows, creates tasks, or posts messages within your own Google account using your OAuth credentials.
- **SMS providers** (Textbelt, Telnyx, Plivo, Twilio, ClickSend, or Vonage) — receives recipient phone numbers and alert text when you enable SMS and select a provider.
- **Any HTTPS endpoint you configure** as a "Generic webhook" SMS provider.
- **MCP servers** (Slack, Microsoft 365 / Teams, Asana, or any custom Model Context Protocol endpoint you configure) — receives alert text and per-server arguments via JSON-RPC 2.0 over HTTPS when a rule targeting that server matches.

Your use of each third-party service is governed by that provider's own terms and privacy policy. We are not responsible for the acts, omissions, availability, accuracy, or legality of any third-party service. Charges, quotas, and rate limits imposed by third-party providers are your responsibility.

## 6. Fees, Subscriptions, and Refunds

### 6.1 Plans

The Service is offered on a freemium model:

- **Free plan** — no charge. Subject to the feature limits described in the Service's in-app pricing page (currently: up to 3 rules, minimum 30-minute polling interval, no Google Chat or MCP server channels, no AI-assisted rule writing, 30-day activity log retention).
- **Pro plan** — paid subscription at the price published in the Google Workspace Marketplace listing at the time of purchase ("List Price"). Pro unlocks the features described in the in-app pricing page.
- **Founding-member lifetime plan** — a one-time purchase offered in limited quantity at launch, granting Pro features for the life of the Service.

Features, limits, and List Prices are described in the in-app Help, the Marketplace listing, and the repository README. JJJJJ Enterprises, LLC ("we") reserves the right to change features or limits on notice as described in Section 6.5.

### 6.2 Payment processor

All subscriptions and one-time purchases are transacted through Google LLC's Google Workspace Marketplace billing. We do not collect, store, or process your payment card details. Your billing relationship for the subscription is with Google; our relationship with you is governed by these Terms and the License. Google's terms, including its refund and billing policies, apply to the payment transaction itself in addition to these Terms.

### 6.3 Auto-renewal

Monthly and annual Pro subscriptions automatically renew at the end of each billing period for another equivalent period at the then-current List Price, **unless you cancel before the renewal date**. You can cancel at any time from the Google Workspace Marketplace subscription management page; cancellation stops future renewals but does not entitle you to a refund of the current period's fee except as required by law.

**California auto-renewal disclosure (Business & Professions Code § 17600 et seq.):** (i) the subscription will continue until you cancel; (ii) we will notify you of material subscription term changes at least 7 days before any change takes effect; (iii) cancellation can be performed entirely online through the Marketplace subscription page; (iv) you will be charged at the start of each renewal period at the then-current price.

### 6.4 Free trial (if offered)

If we offer a free trial of Pro, the trial will convert to a paid Pro subscription at the end of the trial period unless you cancel before the trial ends. Any free-trial terms stated in the Marketplace listing (duration, eligibility, limits) control if they conflict with this Section.

### 6.5 Price changes

We may change List Prices from time to time. A price change will not affect the current paid billing period. For monthly subscribers we will give at least **30 days' notice** before a price change takes effect at renewal; for annual subscribers we will give at least **60 days' notice**. Notice will be delivered by email to the Google account associated with the subscription or through the Marketplace. If you do not want to renew at the new price, cancel before the renewal date. Continued use after the renewal constitutes acceptance of the new price. Founding-member lifetime purchases are not subject to recurring fees.

### 6.6 Refunds and cancellation

**Monthly subscriptions.** Refunds are not generally offered for monthly subscriptions. You may cancel at any time to stop future renewals. If required by the mandatory law of your jurisdiction (for example, the EU Consumer Rights Directive's 14-day right of withdrawal for consumers in the EEA/UK), we will honor that right.

**Annual subscriptions.** Within **14 days** of the initial purchase or first renewal charge, you may request a refund of the annual fee if you have not substantially used Pro features during the period (this is determined in good faith; continuing use beyond a brief evaluation is considered substantial use). Outside that 14-day window, annual subscriptions are non-refundable except where required by law.

**Founding-member lifetime.** Refundable within **30 days** of purchase, less any portion of that price corresponding to substantial Pro-feature use. After 30 days, non-refundable.

Refund requests must be sent to legal@jjjjjenterprises.com with your Gmail address and transaction ID. Refunds, when issued, are processed through Google and may take up to **10 business days** to appear on your statement. Chargebacks initiated without first contacting us may result in termination of your account.

### 6.7 Taxes

List Prices are exclusive of any applicable sales, use, VAT, GST, or other transaction taxes, which may be collected by Google at checkout based on your billing address. You are responsible for any taxes not collected by Google.

### 6.8 Downgrade behavior

If your Pro subscription lapses, is cancelled, or is refunded, your account reverts to the Free plan at the end of the paid period. **All of your existing rules, settings, and stored data are preserved.** However:

- Rules in excess of the Free plan rule limit will not evaluate until you either (a) delete rules to return under the limit, or (b) re-subscribe to Pro;
- Polling is clamped back to the Free plan minimum interval;
- Google Chat and MCP server channel selections on any rule are ignored (but preserved, so they re-activate on re-upgrade);
- AI-assisted rule writing is disabled.

We will not silently delete your data due to a downgrade.

### 6.9 Third-party charges

Independent of your emAIl Sentinel subscription, third-party services you enable may charge you directly (for example, Twilio bills per SMS, your chosen SMS provider may charge for a phone number, and Google may bill for Gemini usage above its free tier). Those charges are strictly between you and the third-party provider. We do not collect, remit, or refund third-party charges.

### 6.10 Fair-use and abuse

The Service is priced for personal use. We may throttle, suspend, or terminate accounts that we reasonably determine are abusing the Service (including but not limited to: use by multiple individuals through a single account, use in a manner inconsistent with the consumer-use scope in Section 2, or use to circumvent the Free plan rule or polling limits).

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

Nothing in this Section 10 excludes or limits liability that cannot be excluded or limited under the mandatory law of your jurisdiction, including (without limitation) liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be lawfully excluded. If any limitation in this Section is held unenforceable in your jurisdiction, that limitation will not apply to you; the remaining limitations will continue in full force and effect.

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

These Terms are governed by the laws of the State of Texas, USA, without regard to its conflict-of-laws principles.

Nothing in this Section affects mandatory consumer protection rights you may have under the law of your country of residence, which apply notwithstanding the choice of Texas law.

## 15. Dispute Resolution

Any dispute arising out of or relating to these Terms or the Service will be resolved exclusively in the state or federal courts located in the State of Texas, USA, and you consent to the personal jurisdiction of those courts.

## 16. Export Controls

You may not use, export, or re-export the Service in violation of any U.S. or other applicable export control laws and regulations.

## 17. Miscellaneous

These Terms, together with the LICENSE, PRIVACY.md, and DISCLAIMER.md files, are the entire agreement between you and JJJJJ Enterprises, LLC concerning the Service and supersede any prior agreement on the subject. If any provision is held unenforceable, the remaining provisions will continue in full force and effect. Our failure to enforce any right or provision is not a waiver of that right or provision.

---

**Contact for legal notices:**
JJJJJ Enterprises, LLC
legal@jjjjjenterprises.com

Legal notices must be sent by email to the address above. A physical mailing address will be provided on request.
