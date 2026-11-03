// Step 1 of the catalogue rebuild (tools/catalog/README.md). Fetch each maker URL in map.json with the API repo's guardedFetch
// (allowlist, robots.txt, Crawl-delay, honest UA). Writes html/ + fetch.json in the working dir. Run from a scratch dir, not the repo.
const fs=require('fs'); const sf=require((process.env.API_LIB||'../arsenal-pro-api/lib')+'/specfetch.js');
for (const h of ['www.motivbowling.com','www.krstrikeforce.com','www.swagbowling.com','www.epicbowling.com']) sf.ALLOWED_HOSTS.add(h);
const m=JSON.parse(fs.readFileSync('map.json','utf8'));
fs.mkdirSync('html',{recursive:true});
const only=process.argv[2];
(async()=>{ const urls=[...new Set(m.filter(o=>o.url&&(!only||o.brand===only)).map(o=>o.url))];
 const res={}; try{Object.assign(res,JSON.parse(fs.readFileSync('fetch.json','utf8')));}catch(e){}
 await Promise.all(Object.entries(urls.reduce((a,u)=>{const h=new URL(u).host;(a[h]=a[h]||[]).push(u);return a;},{})).map(async([h,us])=>{
  for(const u of us){ if(res[u]&&res[u].status===200) continue; let r; try{ r=await sf.guardedFetch(u);}catch(e){r={status:'err',why:e.message};}
   const f='html/'+Buffer.from(u).toString('base64url').slice(-80)+'.html';
   if(r.ok) fs.writeFileSync(f,r.body); res[u]={status:r.status,why:r.why||null,final:r.url,file:r.ok?f:null,at:new Date().toISOString()};
   console.log(r.status,u,r.why||''); }}));
 fs.writeFileSync('fetch.json',JSON.stringify(res,null,1)); })();
