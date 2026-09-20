import https from 'https';

// Set via env: SUPABASE_PAT and SUPABASE_PROJECT_ID
const TOKEN = process.env.SUPABASE_PAT ?? '';
const PROJECT = process.env.SUPABASE_PROJECT_ID ?? '';

function query(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT}/database/query`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => { let d=''; res.on('data', c=>d+=c); res.on('end', ()=>{ try{resolve(JSON.parse(d))}catch{resolve(d)} }); });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

// Re-insert cities (were cleared with seed data wipe)
const r = await query(`
  INSERT INTO cities (name_ar, name_en, slug) VALUES
    ('المجمعة', 'Al-Majmaah', 'majmaah'),
    ('الرياض', 'Riyadh', 'riyadh')
  ON CONFLICT (slug) DO NOTHING
  RETURNING id, slug;
`);
console.log('Cities:', r);
