# emAIl Sentinel™ — Terms of Service

**Effective date:** 2026-04-25
**Operator:** JJJJJ Enterprises, LLC ("we", "us", "our")
**Service:** emAIl Sentinel, a Google Workspace Add-on for Gmail (the "Service")

By installing or using the Service you ("you", "your") agree to these Terms of Service (the "Terms"). If you do not agree, do not install or use the Service.

---

## 1. Description of the Service

emAIl Sentinel is a Google Workspace Add-on that runs in your own Google account. It periodically reads metadata and content from Gmail messages in labels you select, evaluates each new message against rules you write in plain English using the Google Gemini API, and — when a rule matches — sends an alert via one or more channels you configure: SMS (through a third-party SMS provider of your choice, using credentials you supply), Google Chat, Google Calendar, Google Sheets, Google Tasks, a generic HTTPS webhook, or a Model Context Protocol (MCP) server endpoint (such as Slack, Microsoft 365 / Teams, Asana, or any custom MCP server).

The Service runs entirely inside Google Apps Script under your own credentials. We do not operate any backend that stores your data.

### 1.1 Current Service Status

As of the effective date above, the Service is in **private pre-launch testing**. Access is by invitation only; the Service is not yet listed on the Google Workspace Marketplace for general availability, and public sign-ups are not being accepted. During the private testing period, access is provided free of charge to invited testers. The subscription plans described in Section 6 (Free plan, Pro plan, Founding-member lifetime plan) — including their fees, auto-renewal, and refund provisions — **become applicable when the Service launches on the Google Workspace Marketplace**; until launch, those billing provisions do not engage. All other provisions of these Terms apply in full during private testing.

## 2. Eligibility, Intended Use, and Scope

**Intended use.** The Service is designed for **self-notification and small-team alerting** — you configure rules that fire alerts to yourself, or to a small number of colleagues, on-call recipients, or other people with whom you have a direct working relationship and from whom you have obtained any consent required for the channel in use (see Section 4.1 for SMS-specific consent obligations). The Service is **not intended for, and Section 4 prohibits**, use as a tool for unsolicited bulk or promotional SMS, mass-marketing outreach, scraping of contact information, or communication with individuals who have not opted in to hear from you.

The Service is designed for individuals, professionals, consultants, and small teams. By installing or using the Service you represent that:

- you are at least 18 years old (or the age of legal majority in your jurisdiction) and capable of forming a binding contract;
- **you are located in the United States** and are not installing or using the Service on behalf of any individual or entity located in the European Economic Area (EEA), the United Kingdom, Switzerland, or any other jurisdiction outside the United States;
- you will use the Service only within your own Google account and only to process Gmail messages you have the legal right to access; and
- you are not deploying the Service as part of an enterprise-wide or centralized monitoring system.

**Geographic scope.** The Service is currently offered exclusively to users located in the United States. The Google Workspace Marketplace listing is region-restricted to the United States, and if you encounter the Service from outside the United States, please do not install it. We may expand availability to additional jurisdictions in the future, at which point these Terms and our Privacy Policy will be updated to reflect the applicable foreign-law requirements (including any EU/UK GDPR controller, representative, or DPA obligations), and continued use after that update will be subject to the revised terms.

**Not permitted without a separate written agreement:**
- Enterprise-wide deployment across an organization's Google Workspace domain
- Centralized monitoring of multiple users' accounts by a single administrator
- Use as a component of a managed service or resale

**Regulated data.** The Service is not designed for, and we do not hold ourselves out as compliant with, HIPAA, PCI DSS, SOX, GLBA, FERPA, or similar regulatory regimes. You are not prohibited from using the Service at all if you are a HIPAA Covered Entity, PCI merchant, or SOX-filer — but you may use the Service **only** for email that falls outside the scope of those regulations (for example, general business correspondence that is not Protected Health Information, cardholder data, or material financial reporting subject to audit scope). You remain solely responsible for segregating regulated and non-regulated email and for any consequences of comingling them.

## 3. Your Account and Credentials

You are responsible for:
- the security of your Google account;
- the security of any third-party API keys you enter into the Service (Google Gemini, SMS provider credentials, webhook endpoints, MCP server tokens, etc.); and
- complying with the terms of every third-party service you connect to the Service.

If you suspect that your credentials have been compromised, revoke them at the issuing provider and remove them from the Service immediately.

## 4. Acceptable Use

You agree NOT to use the Service to:
- process email content that you do not have the legal right to access;
- harass, defraud, impersonate, stalk, or surveil any person;
- generate or distribute spam, phishing messages, or unsolicited bulk SMS;
- violate any applicable law, regulation, or third-party right;
- circumvent any rate limits, security controls, or quotas of Google, Gemini, your SMS provider, or any other integrated service; or
- reverse-engineer, decompile, or attempt to extract the source of the Service except as permitted by law.

You further agree NOT to use the Service to process:
- Protected Health Information (PHI) as defined under HIPAA;
- cardholder data as defined under PCI DSS;
- sensitive personal information including racial or ethnic origin, political opinions, religious beliefs, health information, sexual orientation, biometric or genetic data, or information that would constitute "sensitive personal information" under the California Privacy Rights Act, unless you have an independent lawful basis to process such information and appropriate safeguards in place;
- personal information of children under 13 (or the equivalent age of digital consent in your jurisdiction); or
- classified, export-controlled, or attorney-client privileged information.

We may suspend or disable your ability to use the Service if we reasonably believe you are violating these Terms.

### 4.1 SMS Alerts — Your TCPA, CAN-SPAM, and Carrier Compliance Obligations

When you configure SMS as an alert channel, **you**, not JJJJJ Enterprises, LLC, are the sender of every SMS message dispatched by the Service on your behalf. You are solely responsible for:

- obtaining and documenting **prior express consent** (or, where applicable, prior express written consent) from each recipient phone number before any non-emergency informational SMS is dispatched, as required by the U.S. Telephone Consumer Protection Act (TCPA), 47 U.S.C. § 227, and implementing regulations at 47 C.F.R. § 64.1200;
- honoring opt-out requests (STOP, UNSUBSCRIBE, CANCEL, END, QUIT) **within one (1) business day** of receipt, as required by the TCPA and FCC rules;
- maintaining a written internal do-not-call / do-not-text list and **retaining opt-out records for at least five (5) years** as required by 47 C.F.R. § 64.1200 and FTC guidance;
- complying with the CAN-SPAM Act (15 U.S.C. § 7701 et seq.) to the extent it applies;
- complying with your chosen SMS provider's terms of service, acceptable use policy, and carrier-imposed messaging rules (including 10DLC registration for US A2P traffic, STIR/SHAKEN, or similar carrier requirements);
- complying with all applicable state laws, including the Florida Telephone Solicitation Act, Washington RCW 80.36, and any other state statute regulating SMS marketing or informational text;
- if your recipients are outside the United States, complying with local electronic-marketing law (GDPR ePrivacy Directive, Canada CASL, UK PECR, Australia Spam Act, etc.).

**We do not track, verify, document, or audit recipient consent on your behalf.** The Service does not manage opt-outs, maintain do-not-call lists, append regulatory disclosures, or file carrier registrations. You indemnify JJJJJ Enterprises, LLC for any claim, fine, settlement, or cost arising from your failure to comply with this Section — see Section 11.

## 5. Third-Party Services

The Service depends on, and transmits data to, third-party services that you choose to enable, including but not limited to:
- **Google Gmail / Google Apps Script** — runs the Service and provides access to your mail.
- **Google Gemini API** — receives email content for rule evaluation and alert formatting.
- **Google Calendar / Google Sheets / Google Tasks / Google Chat** — when you enable these alert channels, the Service creates events, appends rows, creates tasks, or posts messages within your own Google account using your OAuth credentials.
- **Your chosen SMS provider** (any provider you configure by supplying your own credentials or a generic HTTPS webhook URL) — receives recipient phone numbers and alert text when you enable SMS.
- **MCP servers** (Slack, Microsoft 365 / Teams, Asana, or any custom Model Context Protocol endpoint you configure) — receives alert text and per-server arguments via JSON-RPC 2.0 over HTTPS when a rule targeting that server matches.

Your use of each third-party service is governed by that provider's own terms and privacy policy. We are not responsible for the acts, omissions, availability, accuracy, or legality of any third-party service. Charges, quotas, and rate limits imposed by third-party providers are your responsibility.

For the list of third-party trademarks used in the Service and its marketing materials, see the [Disclaimer](DISCLAIMER.md) (Section 5 — Third-Party Trademarks).

### 5.1 Related JJJJJ Enterprises Products

Our website may display links to other products operated by JJJJJ Enterprises, LLC, including PilotTrainerHQ (pilottrainerhq.com) and PlaneFacts (planefacts.online). Those products are separate services governed by their own terms of service and privacy policies. They are not part of the emAIl Sentinel Service, and these Terms do not apply to your use of those products.

## 6. Fees, Subscriptions, and Refunds

### 6.1 Plans

The Service is offered on a freemium model:

- **Free plan** — no charge. Subject to the feature limits described in the Service's in-app pricing page (currently: up to 3 rules, minimum 3-hour automatic polling interval, no Google Chat or MCP server channels, no AI-assisted rule writing, 30-day activity log retention). Manual on-demand checks (the "Scan email now" action) are available on every plan regardless of automatic polling cadence.
- **Pro plan** — paid subscription at the price published in the Google Workspace Marketplace listing at the time of purchase ("List Price"). Pro unlocks the features described in the in-app pricing page.
- **Founding-member lifetime plan** — a one-time purchase of **USD $79**, available to the first **500 purchasers only**. Once 500 lifetime purchases have been recorded on the Google Workspace Marketplace, this plan will be permanently retired and will no longer be available at any price. Grants Pro features for the life of the Service (see Section 6.11).

Features, limits, and List Prices are described in the in-app Help, the Marketplace listing, and the repository README. JJJJJ Enterprises, LLC reserves the right to change features or limits on notice as described in Section 6.5.

### 6.2 Payment Processor

All subscriptions and one-time purchases are transacted through Google LLC's Google Workspace Marketplace billing. We do not collect, store, or process your payment card details. Your billing relationship for the subscription is with Google; our relationship with you is governed by these Terms and the License. Google's terms, including its refund and billing policies, apply to the payment transaction itself in addition to these Terms.

### 6.3 Auto-Renewal

Monthly and annual Pro subscriptions automatically renew at the end of each billing period for another equivalent period at the then-current List Price, **unless you cancel before the renewal date**. You can cancel at any time from the Google Workspace Marketplace subscription management page; cancellation stops future renewals but does not entitle you to a refund of the current period's fee except as required by law.

**California auto-renewal disclosure (Business & Professions Code § 17600 et seq.):** (i) the subscription will continue until you cancel; (ii) we will notify you of material subscription term changes at least 7 days before any change takes effect; (iii) cancellation can be performed entirely online through the Marketplace subscription page — no phone call, email, or additional steps are required; (iv) you will be charged at the start of each renewal period at the then-current price.

**FTC Click-to-Cancel compliance:** You may cancel your subscription at any time through the same mechanism used to subscribe (the Google Workspace Marketplace subscription management page), without being required to speak with a representative, complete additional steps beyond the cancellation itself, or accept additional offers as a condition of cancellation.

### 6.4 Free Plan and Free Trials

The **Free plan** is a permanent tier of the Service, not a time-limited trial. You may remain on the Free plan indefinitely without providing payment information. If at any time in the future we offer a time-limited free trial of Pro, the trial will convert to a paid Pro subscription at the end of the trial period **unless you cancel before the trial ends**, and any free-trial terms stated in the Marketplace listing at the time you enroll (duration, eligibility, automatic-conversion behavior, limits) control if they conflict with this Section.

### 6.5 Price Changes

We may change List Prices from time to time. A price change will not affect the current paid billing period. For monthly subscribers we will give at least **30 days' notice** before a price change takes effect at renewal; for annual subscribers we will give at least **60 days' notice**. Notice will be delivered by email to the Google account associated with the subscription or through the Marketplace. If you do not want to renew at the new price, cancel before the renewal date. Continued use after the renewal constitutes acceptance of the new price. Founding-member lifetime purchases are not subject to recurring fees.

### 6.6 Refunds and Cancellation

**Monthly subscriptions.** Refunds are not generally offered for monthly subscriptions. You may cancel at any time to stop future renewals.

**Annual subscriptions.** Within **14 days** of the initial purchase or first renewal charge, you may request a refund of the annual fee, provided you have not substantially used Pro features during the period (continuing use beyond a brief evaluation is considered substantial use). Outside the 14-day window, annual subscriptions are non-refundable except where required by applicable U.S. state or federal law.

**Founding-member lifetime.** Refundable within **30 days** of purchase, less any portion of that price corresponding to substantial Pro-feature use. After 30 days, non-refundable.

Refund requests must be sent to billing@jjjjjenterprises.com with your Gmail address and transaction ID. Refunds, when issued, are processed through Google and may take up to **10 business days** to appear on your statement. Chargebacks initiated without first contacting us may result in termination of your account.

### 6.7 Taxes

List Prices are exclusive of any applicable sales, use, VAT, GST, or other transaction taxes, which may be collected by Google at checkout based on your billing address. You are responsible for any taxes not collected by Google.

### 6.8 Downgrade Behavior

If your Pro subscription lapses, is cancelled, or is refunded, your account reverts to the Free plan at the end of the paid period. **All of your existing rules, settings, and stored data are preserved.** However:

- Rules in excess of the Free plan rule limit will not evaluate until you either (a) delete rules to return under the limit, or (b) re-subscribe to Pro;
- Polling is clamped back to the Free plan minimum interval;
- Google Chat and MCP server channel selections on any rule are ignored (but preserved, so they re-activate on re-upgrade); and
- AI-assisted rule writing is disabled.

We will not silently delete your data due to a downgrade.

### 6.9 Third-Party Charges

Independent of your emAIl Sentinel subscription, third-party services you enable may charge you directly (for example, your SMS provider may bill per message or charge for a phone number, and Google may bill for Gemini usage above its free tier). Those charges are strictly between you and the third-party provider. We do not collect, remit, or refund third-party charges.

### 6.10 Fair-Use and Abuse

The Service is priced for individual and small-team use. We may throttle, suspend, or terminate accounts that we reasonably determine are abusing the Service (including but not limited to: enterprise-scale deployment through a single account, systematic circumvention of Free plan limits, or use inconsistent with the scope described in Section 2).

### 6.11 Founding-Member Lifetime Plan — Scope and Discontinuation

The Founding-member lifetime plan grants access to Pro features for **the life of the Service**, meaning for as long as JJJJJ Enterprises, LLC continues to operate and make the Service available to end users. The grant is personal, non-transferable, and applies only to the Google account used at purchase.

If we discontinue the Service entirely, we will provide Founding-member lifetime holders with at least **90 days' prior written notice** via email to the address associated with their Google account. No refund is owed upon discontinuation after the initial 30-day refund window (Section 6.6). During the 90-day notice period we will publish:

- a **data export tool** or one-line Apps Script snippet that exports your rules, settings, and activity log in **JSON** and **CSV** formats; and
- step-by-step instructions for retrieving any data created by the Service in your own Google account (Calendar events, Sheets, Tasks, Chat messages) before the add-on is delisted.

We commit to keeping the data-export tool and instructions available for at least **180 days** after the discontinuation date, so that users who miss the 90-day window still have a reasonable opportunity to export.

## 7. Intellectual Property

The Service, including all source code, design, documentation, and trademarks, is owned by JJJJJ Enterprises, LLC and is protected by copyright, trademark, and other intellectual property laws. Except for the limited right to install and use the Service in your own Google account in accordance with these Terms and the LICENSE file, no rights are transferred to you.

You retain all rights in any rules, settings, recipient lists, and email content that you supply to the Service. The Service does not store your email content; processing happens transiently inside your own Apps Script execution context.

## 8. Privacy

Your use of the Service is subject to the Privacy Policy in PRIVACY.md, which is incorporated into these Terms by reference.

## 9. Disclaimers

**PLEASE READ THIS SECTION CAREFULLY. IT LIMITS OUR WARRANTIES AND AFFECTS YOUR RIGHTS.**

**The Service is provided "as is" and "as available", without warranties of any kind, express or implied, including without limitation warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, or uninterrupted operation.**

Without limiting the foregoing, we do not warrant that:

- the Service will detect every relevant email;
- alerts will be delivered promptly, in order, or at all;
- Gemini's evaluation of any rule will be correct; or
- third-party SMS providers will deliver any given message.

**You must not rely on the Service for life-safety, medical, financial-trading, regulatory-compliance, or any other use where a missed or late alert could cause material harm.**

## 10. Limitation of Liability

**PLEASE READ THIS SECTION CAREFULLY. IT LIMITS OUR FINANCIAL LIABILITY TO YOU.**

**To the fullest extent permitted by law, in no event will JJJJJ Enterprises, LLC or its officers, employees, or agents be liable to you for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenue, data, goodwill, or business opportunity, arising out of or related to your use of or inability to use the Service, even if advised of the possibility of such damages.**

**Our total cumulative liability to you for all claims arising out of or related to the Service is limited to the greater of (a) the amount you paid us for the Service in the twelve (12) months preceding the event giving rise to the claim, or (b) one hundred U.S. dollars (USD $100).**

Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of the above limitations may not apply to you.

Nothing in this Section 10 excludes or limits liability that cannot be excluded or limited under the mandatory law of your jurisdiction, including (without limitation) liability for: (a) death or personal injury caused by negligence; (b) fraud or fraudulent misrepresentation; or (c) any other liability that cannot be lawfully excluded. If any limitation in this Section is held unenforceable in your jurisdiction, that limitation will not apply to you; the remaining limitations will continue in full force and effect.

## 11. Indemnification

You agree to indemnify, defend, and hold harmless JJJJJ Enterprises, LLC and its affiliates, officers, and employees from and against any claim, demand, loss, liability, damage, or expense (including reasonable attorneys' fees) arising out of or related to:
- your use of the Service;
- your violation of these Terms;
- your violation of any law or third-party right; or
- the email content, rules, or recipient lists you supply to the Service.

## 12. Termination

You may stop using the Service at any time by uninstalling the add-on from your Google account. We may modify, suspend, or discontinue the Service, in whole or in part, at any time, with or without notice (subject to the 90-day notice obligation for Founding-member lifetime holders in Section 6.11). Sections 4–11 and 13–21 survive termination.

## 13. Changes to These Terms

We may update these Terms from time to time. For **material changes** (including changes to pricing, refund terms, liability limitations, dispute resolution, or data practices), we will notify you by email to the Google account associated with your use of the Service at least **30 days before** the change takes effect. Non-material changes (such as formatting, clarification, or correction of typographical errors) take effect when posted. The "Effective date" at the top will reflect the latest revision. Your continued use of the Service after a change becomes effective constitutes acceptance of the revised Terms. If you do not agree to a material change, you must stop using the Service before the change takes effect.

We commit to **reviewing these Terms, the Privacy Policy, and the Disclaimer at least annually**, and more frequently if material changes to the Service or to applicable law require. Annual reviews do not necessarily result in textual changes; they confirm that the documents remain accurate.

## 14. Governing Law

These Terms are governed by the laws of the State of Texas, USA, without regard to its conflict-of-laws principles.

Nothing in this Section affects mandatory consumer protection rights you may have under the law of your country of residence, which apply notwithstanding the choice of Texas law.

## 15. Dispute Resolution

### 15.1 Informal Resolution

Before initiating any formal proceeding, you and JJJJJ Enterprises, LLC agree to attempt to resolve any dispute informally by sending a written description of the claim to the other party (you to legal@jjjjjenterprises.com, we to the email associated with your Google account). Each party will have **60 days** from receipt of the notice to negotiate a resolution. If the dispute is not resolved within this period, either party may proceed under Section 15.2.

### 15.2 Binding Arbitration

Any dispute, claim, or controversy arising out of or relating to these Terms or the Service that is not resolved under Section 15.1 will be resolved by **binding arbitration** administered by the American Arbitration Association ("AAA") under its Consumer Arbitration Rules then in effect. Arbitration will be conducted by a single arbitrator, in English, and (at your election) in person in Bexar County, Texas, or remotely by videoconference or telephone. The arbitrator may award the same relief that a court could award, including injunctive or declaratory relief, but only to the extent required to satisfy your individual claim.

**Class-action waiver.** You and JJJJJ Enterprises, LLC each agree that any dispute resolution proceeding will be conducted only on an individual basis and not as part of a class, consolidated, or representative action. If a court or arbitrator determines that this class-action waiver is unenforceable as to a particular claim, then that claim (and only that claim) must be severed from any arbitration and may be brought in court.

**Small-claims exception.** Either party may bring an individual action in small-claims court in Bexar County, Texas (or your county of residence, at your election) if the claim qualifies under that court's jurisdictional limits.

**Fees.** JJJJJ Enterprises, LLC will pay all AAA filing, administration, and arbitrator fees for claims under $10,000 (USD), unless the arbitrator finds the claim frivolous. For claims above $10,000, fees are allocated per the AAA Consumer Arbitration Rules.

### 15.3 Opt-Out

You may opt out of the arbitration and class-action waiver provisions in Section 15.2 by sending written notice to legal@jjjjjenterprises.com within **30 days of first installing the Service**, stating your name, Google account email, and that you opt out of arbitration. If you opt out, disputes will be resolved exclusively in the state or federal courts located in the State of Texas, USA, and you consent to the personal jurisdiction of those courts.

### 15.4 Continued Court Jurisdiction

For users who opt out of arbitration or for claims excluded from arbitration, any dispute will be resolved exclusively in the state or federal courts located in the State of Texas, USA, and you consent to the personal jurisdiction of those courts.

## 16. Google Workspace Marketplace, OAuth Verification, and Security Review

The Service is listed on the Google Workspace Marketplace and uses Google OAuth scopes — including `gmail.readonly`, which Google classifies as a **restricted scope**. As a condition of listing and of your use of the Service, JJJJJ Enterprises, LLC commits to:

- maintaining compliance with Google's [API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including Limited Use requirements;
- completing the annual **Cloud Application Security Assessment (CASA)** that Google requires for restricted-scope applications, and submitting updated assessment results to Google on the schedule Google prescribes;
- submitting to Google's OAuth verification re-review whenever Google requests;
- maintaining compliance with Google's [Workspace Marketplace Developer Policies](https://developers.google.com/workspace/marketplace/terms), [Google APIs Terms of Service](https://developers.google.com/terms), and Gemini API terms; and
- cooperating with Google security or policy audits at Google's reasonable request.

You acknowledge that:
- Google may, in its sole discretion, suspend, restrict, or revoke the Service's OAuth access, Marketplace listing, or API access at any time for reasons outside our control;
- a Google-initiated suspension or delisting may interrupt your use of the Service and we are not liable for that interruption, beyond the 90-day notice commitment in Section 6.11 for Founding-member lifetime holders;
- the Service relies on Google Gemini for all rule evaluation, and Google may independently change, limit, or discontinue the Gemini API; and
- your use of the Gemini API (via the API key you provide) is separately governed by Google's then-current Gemini API terms.

We do not currently hold SOC 2, ISO 27001, HIPAA, or PCI DSS certifications. Security documentation available on request at legal@jjjjjenterprises.com is limited to: the current CASA assessment summary, our OAuth scope justification, and our data handling representations in the Privacy Policy.

## 17. Export Controls

You may not use, export, or re-export the Service in violation of any U.S. or other applicable export control laws and regulations.

## 18. Force Majeure

Neither party will be liable for failure or delay in performance caused by circumstances beyond its reasonable control, including natural disasters, acts of government, pandemic, war, terrorism, labor disputes, power failures, internet or telecommunications outages, or failures of Google's infrastructure. This provision does not excuse payment obligations.

## 19. Assignment

You may not assign or transfer your rights under these Terms without our prior written consent. We may assign our rights and obligations under these Terms in connection with a merger, acquisition, reorganization, or sale of all or substantially all of our assets, provided the assignee agrees to be bound by these Terms. Any attempted assignment in violation of this Section is void.

## 20. Severability

If any provision of these Terms is held unenforceable, the remaining provisions will continue in full force and effect.

## 21. Entire Agreement

These Terms, together with the LICENSE (at the repository root), the [Privacy Policy](PRIVACY.md), and the [Disclaimer](DISCLAIMER.md), are the entire agreement between you and JJJJJ Enterprises, LLC concerning the Service and supersede any prior agreement on the subject. Our failure to enforce any right or provision is not a waiver of that right or provision.

---

**Contact:**

| Purpose | Address |
|---|---|
| Legal notices and dispute / arbitration | legal@jjjjjenterprises.com |
| Billing, subscriptions, and refunds | billing@jjjjjenterprises.com |
| User support | support@jjjjjenterprises.com |
| General inquiries | admin@jjjjjenterprises.com |

Legal notices must be sent by email to legal@jjjjjenterprises.com. A physical mailing address will be provided on request.
