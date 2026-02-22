import { chromium } from 'playwright';

const BASE = 'https://misc-cult-designed-landing.trycloudflare.com';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Go to login page
  console.log('Navigating to login...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: '/home/alessandro/teste-claude/screenshots/01-login.png', fullPage: true });
  console.log('Screenshot: 01-login.png');

  // 2. Login
  console.log('Logging in...');
  await page.fill('input[type="text"], input[name="username"], input[placeholder*="usu"], input[placeholder*="user"]', 'a.garbiati', { timeout: 5000 }).catch(async () => {
    // Try finding any text input
    const inputs = await page.locator('input').all();
    if (inputs.length >= 1) await inputs[0].fill('a.garbiati');
  });
  await page.fill('input[type="password"]', 'Celular40');
  await page.screenshot({ path: '/home/alessandro/teste-claude/screenshots/02-login-filled.png', fullPage: true });

  // Click login button
  await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/home/alessandro/teste-claude/screenshots/03-after-login.png', fullPage: true });
  console.log('Screenshot: 03-after-login.png');
  console.log('Current URL:', page.url());

  // 3. Navigate to dashboard if not already there
  if (!page.url().includes('/dashboard')) {
    console.log('Navigating to dashboard...');
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: '/home/alessandro/teste-claude/screenshots/04-dashboard-full.png', fullPage: true });
  console.log('Screenshot: 04-dashboard-full.png');

  // 4. Take viewport-only screenshot of dashboard
  await page.screenshot({ path: '/home/alessandro/teste-claude/screenshots/05-dashboard-viewport.png', fullPage: false });
  console.log('Screenshot: 05-dashboard-viewport.png');

  // 5. Take column-specific screenshots if possible
  // Backlog column
  const backlogCol = page.locator('.grid > div').first();
  if (await backlogCol.isVisible().catch(() => false)) {
    await backlogCol.screenshot({ path: '/home/alessandro/teste-claude/screenshots/06-backlog-column.png' });
    console.log('Screenshot: 06-backlog-column.png');
  }

  // Active column
  const activeCol = page.locator('.grid > div').nth(1);
  if (await activeCol.isVisible().catch(() => false)) {
    await activeCol.screenshot({ path: '/home/alessandro/teste-claude/screenshots/07-active-column.png' });
    console.log('Screenshot: 07-active-column.png');
  }

  // Done column
  const doneCol = page.locator('.grid > div').nth(2);
  if (await doneCol.isVisible().catch(() => false)) {
    await doneCol.screenshot({ path: '/home/alessandro/teste-claude/screenshots/08-done-column.png' });
    console.log('Screenshot: 08-done-column.png');
  }

  // 6. Navigate to profile
  console.log('Navigating to profile...');
  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/home/alessandro/teste-claude/screenshots/09-profile.png', fullPage: true });
  console.log('Screenshot: 09-profile.png');

  await browser.close();
  console.log('Done!');
})();
