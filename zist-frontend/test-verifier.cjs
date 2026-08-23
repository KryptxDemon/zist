// Test that the verifier is actually passed to the Neon Auth server
// when the React app's AuthContext calls authClient.getSession() on a page
// that has ?neon_auth_session_verifier=... in the URL.
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

  // Track get-session requests
  const getSessionRequests = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/get-session') || url.includes('/get-session/')) {
      getSessionRequests.push({ method: req.method(), url });
    }
  });
  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('/get-session') || url.includes('/get-session/')) {
      try {
        const body = await resp.text();
        console.log(`[RESPONSE] ${resp.status()} ${url} Body: ${body.substring(0,500)}`);
      } catch (e) {}
    }
  });

  console.log('=== Step 1: Navigate to /login WITHOUT verifier ===');
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log('URL after /login:', page.url());

  console.log('=== Step 2: NOW navigate to /signup with a fake verifier ===');
  await page.goto('http://localhost:8080/signup?neon_auth_session_verifier=fake-test-verifier-12345', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  console.log('URL after /signup with verifier:', page.url());

  console.log('=== Step 3: Check get-session requests ===');
  getSessionRequests.forEach(r => console.log(' ', r.method, r.url));

  console.log('=== Step 4: Console logs ===');
  consoleLogs.forEach(l => console.log('  ', l));

  await browser.close();
})();
