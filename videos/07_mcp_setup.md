# MCP server alerts (Pro)
**Duration:** ~3:05 min
**Tool:** Guidde

MCP is the most technical alert channel. Aim this video at the
power-user. Use a **Cloudflare Worker** as the demo MCP server
because it is the simplest reproducible MCP example: free, no
third-party signup beyond Cloudflare itself, no OAuth flow, no
expiring tokens, and the live-logs panel gives clean visual proof
that the alert crossed from Gmail to an external system. The
viewer can copy the same 40-line Worker code from the Help card
and have a working endpoint in about 15 minutes. The video keeps
the Worker code reveal brief; the full code listing lives in the
Help card so viewers do not need to pause and squint.

---

## Hook (0:00–0:08)
ON-SCREEN: Split screen — e-mail Sentinel on the left firing an
alert, Cloudflare Worker logs panel on the right showing the
[ALERT RECEIVED] line scroll in real time.
VOICEOVER:
Connect e-mail Sentinel to anything that speaks Model Context
Protocol. Microsoft Teams, Asana, your own server — same alert
pipeline.

## Scene 1 — what MCP is (0:08–0:30)
ON-SCREEN: A simple diagram — e-mail Sentinel → POST tools/call →
your MCP server → Teams / Asana / Custom downstream.
VOICEOVER:
MCP is an open protocol for AI agents to call external tools.
e-mail Sentinel sends a JSON-RPC tools-slash-call request to any
MCP server you configure. If you have used Claude Desktop or
another agent framework, you have already used the same protocol
— this just wires your inbox to it.

## Scene 2 — Pro gate (0:30–0:42)
ON-SCREEN: Settings card → External integrations section showing
the Pro plan badge.
VOICEOVER:
External integrations are Pro-plan only. If you are on the
Founding member tier, you have it included.

## Scene 3 — the simplest MCP example (0:42–1:15)
ON-SCREEN: Help card opened, scrolled to the Custom Cloudflare
Worker walkthrough subsection. Highlight the code block. Then
show the actual Cloudflare dashboard with the Worker already
deployed (named es-demo-mcp).
VOICEOVER:
For this video I am using my Cloudflare account because it is
the easiest target to demo — Cloudflare Workers are free, no
OAuth flow, no bot tokens, nothing that expires, and the Worker
code is forty lines of JavaScript you copy from the Help card.
You would connect to whichever MCP servers you actually need
— Microsoft Teams, Asana, Slack via a self-hosted bridge,
your own internal tools — and you would refer to that server's
documentation for the specifics of its tool name, args, and
authentication. The mechanics in e-mail Sentinel are the same
regardless of the target. We will not write the Worker code on
camera; the full listing is in the Help card under External
integrations. What you see on the right is the deployed Worker,
ready to receive alerts.

## Scene 4 — copy the Worker URL (1:15–1:30)
ON-SCREEN: Cloudflare dashboard, Worker overview page. Highlight
the URL at the top (https://es-demo-mcp.<account>.workers.dev).
Click the copy icon next to the URL.
VOICEOVER:
Copy the Worker URL from the top of the dashboard. This is the
endpoint e-mail Sentinel will POST alerts to.

## Scene 5 — add the MCP server in e-mail Sentinel (1:30–2:15)
ON-SCREEN: Switch back to Gmail. Settings → External integrations
→ "+ Add external integration" → server name "Demo MCP" → Type dropdown
already shows "Custom" as default → click Load defaults → endpoint
URL paste the Worker URL → Authorization header value paste
"Bearer es-demo-token-change-me" → Tool name "log_alert" → Tool
args template stays "{"message":"{{message}}"}" → Save.
VOICEOVER:
Click Add external integration. Name it Demo MCP. The Type dropdown defaults
to Custom — click Load defaults to populate the args template. In
the endpoint URL field, paste the Worker URL we copied. In the
Authorization header value field, paste the literal word Bearer,
capital B, then a space, then the secret you set in the Worker
code. The Bearer prefix is sent verbatim as the Authorization
header, so do not omit it. Tool name is log_alert — the name we
exposed from the Worker. Save.

## Scene 6 — attach to a rule and trigger (2:15–2:40)
ON-SCREEN: Open a rule → check the "Demo MCP" external
integration checkbox → Save → trigger a match. Cut to the
Cloudflare Worker logs panel — the [ALERT RECEIVED] line
appears with the full alert text visible.
VOICEOVER:
On any rule, check the integration, save, and trigger a match.
The Cloudflare Worker logs panel shows the alert arriving in
real time — the bracketed ALERT RECEIVED line is the Worker
console-logging the message field e-mail Sentinel sent. From
here, the Worker can do anything code can do — relay to Slack
via webhook, write to a database, call another API.

## Scene 7 — error handling (2:40–2:55)
ON-SCREEN: Activity log showing an MCP error like 'MCP "Demo MCP"
HTTP 401: Unauthorized'.
VOICEOVER:
If the MCP server returns an error — bad token, missing
permission, server down — e-mail Sentinel logs it in the Activity
log with the exact response. No silent failures. Other channels
still fire, so a broken MCP does not take your alerts down.

## End card (2:55–3:05)
ON-SCREEN: Logo + Marketplace URL
VOICEOVER:
Connect anything that speaks MCP. Pro plan. Get e-mail Sentinel —
link below.

---

## Production notes

- Scene 3 frames the Help card. Make sure Help is up to date
  before recording — it has the full Cloudflare Worker code
  listing.
- The Cloudflare dashboard log panel is the visual hero. Make
  sure you have clicked **Begin log stream** on the Worker's
  Logs tab before Scene 6, so the live tail is already running
  when the alert fires.
- Do NOT show the SECRET token value in clear text on camera if
  you intend to leave the Worker deployed publicly. Either change
  the secret post-recording, or blur the Authorization header
  value during edit.
- If you ever need to re-shoot for a different MCP target
  (Teams, Asana V2, or a different Custom server), only Scenes 4
  and 5 need to change.
- The framing in Scene 1 explicitly mentions Teams and Asana so
  viewers know other targets exist; the video does not need to
  demo each.

---

## Recording checklist (Guidde)

Before you start: Gmail open, demo account on Pro tier (run
`setTierPro` in the Apps Script editor), Screenshot mode ON, the
Cloudflare Worker `es-demo-mcp` already deployed (per the Help
card walkthrough — the Worker code paste is not on camera), the
Cloudflare dashboard tab already open in another browser tab and
focused on the Worker's overview page (so Scene 4's URL copy is
one click), the Worker's **Logs** tab open in a third browser tab
with **Begin log stream** already clicked (so Scene 6's live tail
is already streaming when an alert fires), at least one rule
already saved, side panel open on the home card.

1. Hit **Start capture** in the Guidde extension.
2. Open `https://modelcontextprotocol.io/` in a new tab; hover for ~2 s.
3. Switch back to Gmail.
4. Click the **3-dot menu** → **Help**.
5. In the Help card, scroll to the **External integrations** section. Hover the **Custom — Cloudflare Worker MCP server** subsection for ~3 s. Frame the code block.
6. Click the **3-dot menu** → **Home** to leave Help.
7. Switch to the **Cloudflare** Worker overview tab.
8. Hover the URL at the top of the page (`https://es-demo-mcp.<account>.workers.dev`) for ~1 s.
9. Click the copy icon next to the URL.
10. Switch back to Gmail.
11. Click the **3-dot menu** → **Settings**.
12. Scroll to the **External integrations** section.
13. Hover the **Pro plan only** badge for ~1 s.
14. Click **+ Add external integration**.
15. Click the **Server name** field, type `Demo MCP`.
16. Confirm the **Type** dropdown reads **Custom** (default for new servers).
17. Click **Load defaults**. Tool args template auto-fills to `{"message":"{{message}}"}`. Tool name field is blank for Custom by default.
18. Click the **MCP server endpoint URL** field, paste the Worker URL from step 9.
19. Click the **Authorization header value** field. Paste the full header literally — the word `Bearer`, a single space, then your Worker `SECRET` value. Example: `Bearer es-demo-token-change-me`.
20. Click the **Tool name** field, type `log_alert`.
21. Click **Save**.
22. Click **3-dot menu** → **Rules**.
23. Click an existing rule.
24. Scroll to the **External integrations** section in the rule editor.
25. Check **Demo MCP**.
26. Click **Save**.
27. Click **3-dot menu** → **Scan email now**.
28. Click **Run scan now**.
29. Wait for the green ✅ result card.
30. Switch to the **Cloudflare** Logs tab. The new `[ALERT RECEIVED] <your alert text>` line is at the bottom of the live tail.
31. Switch back to Gmail.
32. Click **3-dot menu** → **Activity Log**.
33. Scroll to (or trigger separately) a red `MCP "Demo MCP" HTTP 401: Unauthorized` line.
34. Hit **Stop capture** in Guidde.

After capture: blur the Authorization header value if the SECRET
is something you do not want public. Replace the auto-generated
voiceover with the storyboard VOICEOVER lines. The diagram for
Scene 1 (e-mail Sentinel → MCP server → Teams / Asana / Custom)
is a graphic, not a screen capture — drop it in during edit.
