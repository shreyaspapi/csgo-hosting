import { chromium } from '@playwright/test';
const SESSION = process.argv[2];
const browser = await chromium.launch({ headless: true });

const routes = ['/', '/dashboard', '/queue', '/leaderboard', '/matches', '/teams'];

for (const path of routes) {
  const ctx = await browser.newContext();
  if (SESSION && path !== '/') {
    await ctx.addCookies([{name:'next-auth.session-token',value:SESSION,domain:'localhost',path:'/',httpOnly:true,secure:false,sameSite:'Lax'}]);
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: '+e.message));
  try {
    await page.goto('http://localhost:3000'+path, {waitUntil:'networkidle',timeout:20000});
    await page.waitForTimeout(2000);
  } catch(e) { console.log(path, 'nav error:', e.message.slice(0,80)); }
  const title = await page.title().catch(()=>'');
  const url = page.url().replace('http://localhost:3000','');
  console.log(errors.length===0 ? '✓' : '✗', path, '->', url, errors.length ? `[${errors.length} errors]` : '');
  errors.forEach(e => console.log('  ERR:', e.slice(0,150)));
  await ctx.close();
}
await browser.close();
