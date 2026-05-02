Opus

Prompt for Opus (architecture phase)
                                                                                                                                
  I have a working Google Workspace Gmail Add-on at /home/stephen-johns/github/email_sentinel
  ("emAIl Sentinel"). It watches Gmail labels for new messages, evaluates each                                                  
  against user-defined plain-English rules using the Gemini REST API, and                                                       
  dispatches alerts. Built with Apps Script V8, deployed via clasp, listed on                                                   
  Google Workspace Marketplace, in private testing. CLAUDE.md and                                                               
  docs/rebuild_prompt.txt in that repo describe the full architecture.                                                          
                                                                                                                                
  I want to build a Microsoft 365 / Outlook port at /home/stephen-johns/github/email_sentinel_365.                              
  Target audience and product positioning are identical: privacy-first ("runs inside                                            
  the user's account, email never leaves Microsoft's servers"), free + Pro tiers,                                               
  listed on Microsoft AppSource alongside the Gmail version on Google Workspace                                                 
  Marketplace.                                                                                                                  
                                                                                                                                
  I do NOT want you to write production code yet. I want you to make the upfront                                                
  architecture decisions and produce a written architecture document plus a
  skeleton repo. Specific decisions to nail down:                                                                               
                                                                                                                                
  1. Office Add-in *type*: taskpane vs. function-command vs. extended Outlook web                                               
     add-in vs. a hybrid. Justify the choice for our use case (UI-rich rule editor,                                             
     background scanning, settings card, activity log).                                                                         
  2. Manifest format: legacy XML vs. unified JSON manifest. Microsoft is                                                        
     transitioning; pick the one that makes sense for a 2026 launch on AppSource.                                               
  3. Background-scan mechanism: Microsoft Graph change notifications (webhook                                                   
     subscriptions), Graph delta queries on a polling timer, or something else.                                                 
     The Gmail version uses Apps Script time-driven triggers with a 1-hour floor;                                               
     what is the Outlook equivalent and what cadence is realistic without a                                                     
     server-side backend?                                                                                                       
  4. State storage: Apps Script's UserProperties has no direct equivalent.                                                      
     Options: roaming settings (Office.js Office.context.roamingSettings),                                                      
     Microsoft Graph extended properties on the user's mailbox, or a backend                                                    
     database. Pick what matches our privacy posture (no central server reading                                                 
     email).                                                                                                                    
  5. Hosting: Office Add-ins need to host their HTML/JS on a web server. Pick                                                   
     a host (GitHub Pages, Azure Static Web Apps, Cloudflare Pages) and explain                                                 
     the SSL/manifest implications.                                                                                             
  6. OAuth: Microsoft identity platform (Microsoft Graph) — single tenant vs.                                                   
     multi-tenant, scope set, admin-consent expectations for enterprise users.                                                  
                                                                                                                                
  7. Alert channels — the channel set is locked. Implement these ten, in the                                                    
     order below. For each, the architecture doc should specify the Microsoft                                                   
     Graph API or other Microsoft endpoint, the OAuth scope required, and any                                                   
     admin-consent / licensing caveats:                                                                                         
                                                                                                                                
        a) SMS — provider-agnostic via NotifyLib. Same six presets (Textbelt,                                                   
           ClickSend, Vonage, Telnyx, Plivo, Twilio) plus generic webhook.
           Platform-independent; ports verbatim.                                                                                
        b) Microsoft Teams — chat or channel message via Microsoft Graph                                                        
           /chats/{id}/messages or /teams/{id}/channels/{id}/messages. Decide:                                                  
           Graph proper (admin consent required for app-only flows) vs. Teams                                                   
           incoming-webhook connector URLs (no admin consent, deprecated by                                                     
           Microsoft for new connectors but existing ones still work). Pick                                                     
           the path that minimizes onboarding friction; document the tradeoff.                                                  
        c) Outlook Calendar — Microsoft Graph /me/events. 15-minute event with                                                  
           alert details, mirroring the Gmail version's Calendar behavior.                                                      
        d) Excel Online — Microsoft Graph workbook API. Append-row to a                                                         
           workbook in OneDrive. Same auto-create-on-first-alert pattern as                                                     
           the Gmail Sheets channel; document filename ("emAIl Sentinel —                                                       
           Alert Log.xlsx") and the cell range / table strategy for appends.                                                    
        e) Microsoft To Do — Microsoft Graph /me/todo/lists/{id}/tasks. One                                                     
           task per match in the user's default list, mirroring Tasks behavior                                                  
           on Gmail.                                                                                                            
        f) OneNote — Microsoft Graph PATCH /me/onenote/pages/{id}/content                                                       
           with append commands. Replaces what would have been Word Online                                                      
           (Word's append-paragraph API is awkward). Auto-create on first use                                                   
           (a notebook section/page named "emAIl Sentinel — Alert Log");                                                        
           each match appends a structured entry — heading with timestamp +                                                     
           rule name, then From/Subject/Received/message paragraphs, mirroring                                                  
           the Gmail Docs channel.                                                                                              
        g) Outlook Categories — apply a colored category to the matching                                                        
           message itself via Microsoft Graph PATCH /me/messages/{id}.                                                          
           Category name and color are user-configured per rule. Lightweight
           "alert in place" channel with no separate destination.                                                               
        h) Follow-up flags — set a follow-up flag on the matching message via
           Microsoft Graph PATCH /me/messages/{id}/flag. Optional due-date                                                      
           offset configured per rule (e.g., +24 hours from receipt). Surfaces                                                  
           the message in Outlook's Tasks pane and the daily-summary card                                                       
           without creating a separate To Do item.                                                                              
        i) MCP servers (JSON-RPC 2.0 over HTTPS) — platform-independent,                                                        
           ports verbatim from McpServers.gs.                                                                                   
        j) Custom webhook (HTTPS POST) — platform-independent, ports verbatim.
                                                                                                                                
     Channels NOT included at launch (and why, in the architecture doc):                                                        
        - Microsoft Planner — team-task surface; admin-consent friction for                                                     
          non-tenant-admin installers. Revisit post-launch if Pro-tier                                                          
          enterprise users ask for it.                                                                                          
        - SharePoint Lists / Microsoft Lists — enterprise-only flavor; Excel                                                    
          already covers the personal-user structured-log case.                                                                 
        - Outlook Pinned Email — stretch goal: only add if the Outlook web                                                      
          client and Outlook desktop both honor a Graph-set pin reliably                                                        
          (some clients ignore it). If your research finds the API is                                                           
          unreliable across surfaces, skip and document why; if it's clean,                                                     
          add as channel (k).                                                                                                   
                                                                                                                                
  8. Rule storage and migration: how do existing rule shapes (rule.labels,                                                      
     rule.alerts.smsNumbers, etc.) translate? Do we keep the same JSON shape so                                                 
     users can copy/paste rules between platforms? In particular, rule.labels                                                   
     maps to Gmail labels — Outlook uses categories or folders. Decide.                                                         
                                                                                                                                
  Deliverables I want from you:                                                                                                 
                                                                                                                                
  A. A markdown architecture decision document at email_sentinel_365/docs/architecture.md                                       
     covering all eight points above. Format: one section per decision with
     "Decision:", "Why:", "Tradeoff:", and "Tasks for Sonnet to implement:" sub-sections.                                       
     For point 7, one sub-section per channel (a through j, plus optional k for                                                 
     pinned email if you decide to include it).                                                                                 
                                                                                                                                
  B. A directory skeleton under email_sentinel_365/ (empty or stub files) that                                                  
     matches the architecture you chose. Include manifest.xml or manifest.json,                                                 
     src/ structure, README skeleton.                                                                                           
                                                             
  C. A "files to copy verbatim from email_sentinel" list — the parts that work                                                  
     unchanged (Gemini prompt strings, rule data shape, alert dispatcher
     payload formats for SMS / MCP / custom webhooks, NotifyLib calls, brand                                                    
     strings, legal markdown).                                                                                                  
                                                                                                                                
  D. A "files that need port (Sonnet's job)" list with the source file in                                                       
     email_sentinel and the target file in email_sentinel_365, plus a one-line                                                  
     note on what changes for each.                                                                                             
                                                                                                                                
  Constraints:                                                                                                                  
  - Solo founder with limited budget. Prefer architectures with no monthly hosting                                              
    cost above ~$20.                                                                                                            
  - AppSource launch is the priority — anything that delays Microsoft 365 cert                                                  
    is a tax. Use established patterns over novel ones.                                                                         
  - The Gmail version's privacy posture ("email never leaves Microsoft's servers")                                              
    must hold. Self-hosted backend services that read mail content are out.                                                     
  - Maintain feature parity with the Gmail version's Pro tier (Chat→Teams,                                                      
    unlimited rules, MCP, custom webhooks, AI rule writing). Free-tier feature                                                  
    set on Outlook should match Gmail Free: SMS + Calendar + Excel + To Do +                                                    
    OneNote + Categories + Follow-up flags. Pro adds Teams, MCP, custom                                                         
    webhooks, AI rule writing.                                                                                                  
  - Reuse the Gemini API key model: user provides their own key, stored locally,                                                
    we never see it.                                                                                                            
                                                             
  Take whatever time you need to read CLAUDE.md, docs/rebuild_prompt.txt, and the                                               
  Cards.gs / Code.gs / MailWatcher.gs / AlertDispatcher.gs / McpServers.gs files
  in the Gmail repo. The architecture document is what unlocks Sonnet to                                                        
  implement; getting it right is worth the upfront thinking time.  