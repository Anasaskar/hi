const fetch = global.fetch || require('node-fetch');
(async ()=>{
  try {
    const res = await fetch('http://localhost:3001/admin/zoho/send-test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: 'sportsmutch@gmail.com' }) });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log(text);
  } catch (err){ console.error('ERR', err); process.exit(1);} 
})();
