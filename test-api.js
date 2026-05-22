const fetch = require('node-fetch');

async function test() {
  const res = await fetch('https://cougar-chronicle-live-production-c994.up.railway.app/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test-direct@example.com', name: 'Direct Test' })
  });
  
  console.log(res.status);
  console.log(await res.text());
}

test();
