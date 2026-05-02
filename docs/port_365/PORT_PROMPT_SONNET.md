Sonnet 

Save tokens on Sonnet runs by pointing it at specific files — e.g., "Now port MailWatcher.gs to src/scanner.ts" — rather
  than letting it explore the whole repo each time. The architecture doc + targeted file pairs keep iteration cheap.

  Prompt for Sonnet (implementation phase)                                                                                      
                                                                                                                                
  Opus has produced an architecture document at
  /home/stephen-johns/github/email_sentinel_365/docs/architecture.md                                                            
  plus a directory skeleton and two file lists ("copy verbatim" and "port").                                                    
  Your job is to execute the implementation file-by-file based on those lists.                                                  
                                                                                                                                
  Source repo (Gmail version, working, in production):                                                                          
    /home/stephen-johns/github/email_sentinel                                                                                   
                                                                                                                                
  Target repo (Outlook 365 port, currently a skeleton):      
    /home/stephen-johns/github/email_sentinel_365                                                                               
                                                                                                                                
  Read the architecture document first; everything you do should follow its                                                     
  decisions. Do NOT make architecture decisions yourself — if the document is                                                   
  ambiguous or doesn't cover something, stop and ask.                                                                           
                                                                                                                                
  The architecture doc's section 7 lists every alert channel (a through j, plus                                                 
  optional k), the chosen Microsoft Graph API, and the OAuth scope for each.                                                    
  Implement each per that doc; do not substitute different Microsoft APIs                                                       
  without checking back. The locked channel set:                                                                                
                                                                                                                                
     a) SMS (port verbatim, NotifyLib)                                                                                          
     b) Microsoft Teams (per Opus's Graph vs. webhook decision)                                                                 
     c) Outlook Calendar (Graph /me/events)                                                                                     
     d) Excel Online (Graph workbook API)                                                                                       
     e) Microsoft To Do (Graph /me/todo)                                                                                        
     f) OneNote (Graph /me/onenote append)                                                                                      
     g) Outlook Categories (Graph PATCH /me/messages/{id})   
     h) Follow-up flags (Graph PATCH /me/messages/{id}/flag)                                                                    
     i) MCP servers (port verbatim)                          
     j) Custom webhook (port verbatim)                                                                                          
     k) Pinned email (only if Opus included it)                                                                                 
                                         
  Workflow per file:                                                                                                            
                                                             
  1. For files in the "copy verbatim" list:                                                                                     
     - Copy the source file to the target path.              
     - Strip Google-platform-specific imports / references that are not relevant                                                
       (GmailApp, CardService, ScriptApp, DocumentApp, SpreadsheetApp,                                                          
       CalendarApp). Keep Gemini calls and rule data structures as-is.                                                          
     - Run a syntax check on the result.                                                                                        
                                                                                                                                
  2. For files in the "port" list:                                                                                              
     - Read the source file and the architecture document's notes for that port.                                                
     - Write the target file using the chosen Microsoft technologies (Office.js,                                                
       Microsoft Graph SDK, manifest.xml/json, etc.).                                                                           
     - Preserve function signatures and behavioral contracts where the architecture                                             
       allows. Where it doesn't (e.g., GmailApp.search has no direct equivalent),                                               
       document the deviation with a comment.                                                                                   
     - Add a top-of-file comment pointing back to the source file in the Gmail                                                  
       repo so a future maintainer can compare.                                                                                 
                                                                                                                                
  3. Alert channels specifically (AlertDispatcher equivalent):                                                                  
     - One dispatch function per channel, mirroring the Gmail repo's
       send{Channel}Alert_ pattern, named:                                                                                      
         sendSmsAlert_, sendTeamsAlert_, sendOutlookCalendarAlert_,                                                             
         sendExcelAlert_, sendToDoAlert_, sendOneNoteAlert_,                                                                    
         sendCategoryAlert_, sendFollowUpFlagAlert_, sendMcpAlert_,                                                             
         sendWebhookAlert_ (and sendPinAlert_ if Opus included it).                                                             
     - SMS dispatch reuses NotifyLib unchanged — same six presets + generic webhook.                                            
     - MCP / Custom webhook dispatch reuses the JSON-RPC 2.0 envelope code and                                                  
       direct-POST helper from McpServers.gs unchanged.                                                                         
     - Microsoft-native channels each call Microsoft Graph via a thin wrapper                                                   
       consistent with the auth pattern the architecture chose (likely a                                                        
       getAccessToken() helper that handles token refresh).                                                                     
     - Free vs. Pro gating mirrors the Gmail repo's pattern: SMS + Calendar +                                                   
       Excel + To Do + OneNote + Categories + Follow-up flags are Free; Teams                                                   
       + MCP + Custom webhook + AI rule writing are Pro.                                                                        
                                                                                                                                
  4. After each file is done:                                                                                                   
     - Syntax check (node --check / tsc / xmllint as appropriate).                                                              
     - Update a running tally in email_sentinel_365/docs/port_progress.md showing                                               
       what's done and what's left.                                                                                             
                                                                                                                                
  5. Doc/test files (CLAUDE.md, README.md, docs/rebuild_prompt.txt, testing/ test                                               
     plan, legal/ markdown):                                                                                                    
     - Adapt rather than copy. Keep structure and explanatory text; swap                                                        
       Google-specific terminology for Microsoft-specific. The OAuth scope list                                                 
       in legal/PRIVACY.md and submission_answers.md needs Microsoft Graph                                                      
       scopes instead of Google ones — the architecture doc lists each.                                                         
     - The 10 (or 11) channel set replaces the 7 channel set in the source repo.                                                
       Update the channel-list mentions in CLAUDE.md, README.md feature table,                                                  
       in-card help, marketplace listing copy, and test plan.                                                                   
                                                                                                                                
  Constraints from the architecture document take precedence over what you see                                                  
  in the source code. If the source code has a pattern that doesn't fit the                                                     
  target architecture, follow the architecture and note the mismatch in                                                         
  port_progress.md.                                                                                                             
                                                                                                                                
  Style:                                                                                                                        
  - Match the source repo's commenting style: comments explain *why*, not
    *what*; identifiers are descriptive enough that *what* is obvious.                                                          
  - No backwards-compat shims, no error handling for impossible cases — same                                                    
    rule as the Gmail repo.                                                                                                     
  - Keep commit messages short, descriptive, focused on one logical change at                                                   
    a time. Never reference Claude or Anthropic in commit messages.                                                             
                                                                                                                                
  Stop and ask before:                                                                                                          
  - Making any architecture decision the document doesn't cover.                                                                
  - Adding a third-party dependency the document doesn't sanction.                                                              
  - Introducing a backend service.                                                                                              
  - Touching legal/, screenshots/, or anything brand-related — those need                                                       
    human review before any change.                       

    --------------------


● Files to create and what to type in each session

  Step 1 — Save the two prompt files locally

  Save these in the current repo so they live alongside your other docs:

  /home/stephen-johns/github/email_sentinel/docs/port_365/PORT_PROMPT_OPUS.md
  The Opus architecture prompt I produced (the longer one — Microsoft Graph mapping, manifest decisions, project skeleton).

  /home/stephen-johns/github/email_sentinel/docs/port_365/PORT_PROMPT_SONNET.md
  The Sonnet implementation prompt (the file-by-file porting prompt with the locked channel list).

  These two files are inputs to other Claude sessions — they don't get read by anything in this repo, but keeping them under
  docs/port_365/ means they are versioned and you can re-run them if the port stalls.

  Step 2 — Bootstrap the target repo

  mkdir -p ~/github/email_sentinel_365
  cd ~/github/email_sentinel_365
  git init
  gh repo create email_sentinel_365 --private --source=. --remote=origin

  Copy the prompt files in so the new Claude sessions can read them:

  mkdir -p docs
  cp ~/github/email_sentinel/docs/port_365/PORT_PROMPT_OPUS.md docs/
  cp ~/github/email_sentinel/docs/port_365/PORT_PROMPT_SONNET.md docs/
  git add docs && git commit -m "Add port prompts"

  Step 3 — Opus session (architecture)

  cd ~/github/email_sentinel_365
  claude --model opus

  What you type at the first prompt:

  ▎ Read docs/PORT_PROMPT_OPUS.md and ../email_sentinel/CLAUDE.md. Then execute the prompt — produce docs/architecture.md,
  ▎ docs/channel_mapping.md, the project skeleton (package.json, tsconfig.json, manifest.xml, src/ directory tree with empty
  ▎ stub files), and docs/port_checklist.md listing every .gs file from the source repo and the target TypeScript file it maps to.

  Opus will produce:
  - docs/architecture.md
  - docs/channel_mapping.md (the locked channel table — SMS, Teams, Outlook Calendar, Excel, To Do, OneNote, Categories, Follow-up flags, MCP, Custom webhook)
  - docs/port_checklist.md (the file-by-file plan)
  - manifest.xml + package.json + tsconfig.json + empty src/ skeleton

  Review and commit before moving on:
  git add . && git commit -m "Architecture + skeleton"

  Step 4 — Sonnet session (implementation, iterative)

  Open a fresh session in the same directory:

  claude --model sonnet

  What you type first:

  ▎ Read docs/PORT_PROMPT_SONNET.md, docs/architecture.md, docs/channel_mapping.md, and docs/port_checklist.md. Work through the
  ▎ checklist top-to-bottom, one file at a time. Stop after each file so I can review the diff.

  Then for each file Sonnet finishes, you type one of:

  - next (or proceed) — move to next checklist item
  - revise: <change> — fix something in the current file
  - skip — defer this file
  - commit — when a logical group is done, ask Sonnet to stage + commit

  Concrete checklist items will look like:
  1. src/dispatch/sms.ts (port AlertDispatcher.gs SMS block)
  2. src/dispatch/teams.ts (Microsoft Graph chatMessages POST)
  3. src/dispatch/calendar.ts (Graph /me/events)
  4. src/dispatch/excel.ts (Graph workbook session + table append)
  5. src/dispatch/todo.ts (Graph /me/todo/lists/{id}/tasks)
  6. src/dispatch/onenote.ts (Graph /me/onenote/pages/{id}/content PATCH append)
  7. src/dispatch/categories.ts (Graph mail update with categories array)
  8. src/dispatch/flags.ts (Graph mail update with flag.flagStatus = "flagged")
  9. src/dispatch/mcp.ts + src/dispatch/webhook.ts (port McpServers.gs 1:1)
  10. src/rules/evaluator.ts (Gemini REST — unchanged from Apps Script)
  11. src/watcher/index.ts (Graph change-notifications subscription replacing the time-driven trigger)
  12. src/taskpane/*.tsx (React taskpane replacing CardService cards)

  Step 5 — When something blocks Sonnet

  If Sonnet hits a question it can't answer (auth flow detail, manifest field, Graph quirk), open a second Opus session in a separate terminal:

  claude --model opus

  Type:

  ▎ I'm porting emAIl Sentinel to Office 365. Read docs/architecture.md and docs/channel_mapping.md. Sonnet is stuck on: .
  ▎ Decide and update the architecture doc.

  Then go back to Sonnet and type:

  ▎ Re-read docs/architecture.md — Opus updated it. Continue.

  ---
  That is the full workflow: two prompt files in this repo, two prompt files copied into the new repo, one Opus run for architecture, one rolling Sonnet session for implementation, and Opus-on-demand whenever Sonnet hits an unknown.