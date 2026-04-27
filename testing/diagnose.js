#!/usr/bin/env node
// Connects to the running Chrome on port 9222, walks the iframe tree, and
// dumps what's there — so we can see WHY Playwright's selectors aren't
// finding buttons that are visually present.
//
// Run with: node testing/diagnose.js
// Prerequisite: ./testing/run_free_e2e_tests.sh (or run_pro_e2e_tests.sh)
// has been run at least once (so Chrome is up on port 9222 with Gmail open).

const { chromium } = require('/home/stephen-johns/github/email_sentinel/testing/playwright/node_modules/@playwright/test');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().includes('mail.google.com')) || ctx.pages()[0];

  console.log('URL:', page.url());
  console.log('');

  // Ensure add-on is open
  console.log('— Opening add-on icon —');
  try {
    const icon = page.locator('[aria-label*="emAIl Sentinel"]').first();
    await icon.click({ timeout: 5000 });
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log('  (icon click failed — may already be open)', e.message);
  }

  // List every frame in the page
  console.log('\n— All frames in page —');
  const frames = page.frames();
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    console.log(`  [${i}] ${f.url().slice(0, 120)}`);
  }

  // For every frame, count buttons and list their accessible names
  console.log('\n— Buttons per frame —');
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    try {
      const buttonNames = await f.evaluate(() => {
        const results = [];
        const all = document.querySelectorAll('button, [role="button"]');
        all.forEach(el => {
          const txt = (el.textContent || '').trim().slice(0, 50);
          const aria = el.getAttribute('aria-label') || '';
          results.push({ tag: el.tagName, role: el.getAttribute('role'), text: txt, aria });
        });
        return results;
      });
      if (buttonNames.length > 0) {
        console.log(`\n  Frame [${i}]: ${f.url().slice(0, 80)}`);
        buttonNames.forEach(b => console.log(`    <${b.tag}${b.role ? ' role=' + b.role : ''}> text="${b.text}" aria="${b.aria}"`));
      }
    } catch (e) {
      // Cross-origin frames can't be probed — skip
    }
  }

  await browser.close();
})();
