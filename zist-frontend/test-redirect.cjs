// Quick puppeteer test: simulate the full OAuth callback flow
// 1. Open /login
// 2. Click "Sign in with Google" — this should redirect to Google
// 3. Skip Google consent and navigate directly to callbackURL with a fake verifier
// 4. See what AuthContext does
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    consoleLogs.push(`[PAGEERROR] ${err.message}`);
  });

  // Navigate directly to callbackURL with verifier (simulate post-Google return)
  // We need a real verifier — let's get one by clicking the button first
  console.log('=== Step 1: Navigate to /login and click Google button ===');
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle2', timeout: 30000 });

  // Set up request interception to capture the /sign-in/social response
  let signInSocialResponse = null;
  page.on('response', async (resp) => {
    if (resp.url().includes('/sign-in/social') && !resp.url().includes('init')) {
      try {
        const body = await resp.json();
        signInSocialResponse = { url: body.url, redirect: body.redirect };
        console.log('[TEST] Captured /sign-in/social response:', signInSocialResponse);
      } catch (e) {}
    }
  });

  await page.click('button.login-btn-google');
  await new Promise(r => setTimeout(r, 3000));

  console.log('=== Step 2: Check page URL (should be at google or back) ===');
  console.log('Current URL:', page.url());

  // Extract the verifier token from the redirect URL captured
  // The URL is like: https://neonauth.../sign-in/social/init?token=XXXX
  // Then it 302's to Google. Then Google 302's back to neonauth callback.
  // Then neonauth 302's to our app with ?neon_auth_session_verifier=YYYY
  // To skip Google, we'll inject the verifier directly
  if (signInSocialResponse && signInSocialResponse.url) {
    // The init URL has the token. Let's follow the redirect chain ourselves
    const initUrl = signInSocialResponse.url;
    console.log('[TEST] Init URL:', initUrl);

    // Open a hidden tab to follow the chain manually
    const signInPage = await browser.newPage();
    let finalUrl = null;
    signInPage.on('response', resp => {
      // Look for redirects that include the verifier
      const loc = resp.headers()['location'] || resp.headers()['Location'];
      if (loc && loc.includes('neon_auth_session_verifier=')) {
        finalUrl = loc;
        console.log('[TEST] Final redirect to:', loc);
      }
    });

    await signInPage.goto(initUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    console.log('[TEST] SignInPage final URL:', signInPage.url());

    if (finalUrl) {
      console.log('=== Step 3: Navigate main page to callback URL with verifier ===');
      await page.goto(finalUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      console.log('=== Final page URL:', page.url());
      console.log('=== Console logs:');
      consoleLogs.forEach(l => console.log('  ', l));
    } else {
      console.log('[TEST] Could not capture final URL; current signInPage URL:', signInPage.url());
    }
    await signInPage.close();
  } else {
    console.log('[TEST] No /sign-in/social response captured');
  }

  await browser.close();
})();
