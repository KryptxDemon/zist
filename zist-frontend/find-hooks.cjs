const s = require('fs').readFileSync('node_modules/@neondatabase/auth/dist/better-auth-helpers-DlzEQzcv.mjs', 'utf8');

const patterns = [
  /METHODS_HOOKS|METHOD_HOOKS|onSuccess|onError/g,
];

for (const re of patterns) {
  let m, count = 0;
  while ((m = re.exec(s)) && count < 30) {
    count++;
    const ctx = s.substring(Math.max(0, m.index - 80), m.index + 250);
    console.log('--- match', count, '@', m.index, '->', m[0]);
    console.log(ctx);
    console.log();
  }
}