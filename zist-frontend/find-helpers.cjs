const s = require('fs').readFileSync('node_modules/@neondatabase/auth/dist/better-auth-helpers-DlzEQzcv.mjs', 'utf8');

const patterns = [
  /getSession\.onSuccess[\s\S]{0,500}/g,
  /history\.replaceState[\s\S]{0,300}/g,
  /NEON_AUTH_SESSION_VERIFIER[\s\S]{0,300}/g,
];

for (const re of patterns) {
  console.log('=====', re, '=====');
  let m, count = 0;
  while ((m = re.exec(s)) && count < 5) {
    count++;
    console.log('--- match', count, '@', m.index);
    console.log(s.substring(Math.max(0, m.index - 100), m.index + 600));
    console.log();
  }
}
