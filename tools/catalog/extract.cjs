// Step 2: read each cached maker page with the API repo's parseSpecPage plus the per-family table readers below; writes rows.json.
// Build maker-sourced rows: one per original catalogue row (same brand+name so ids stay stable).
const fs=require('fs');const sp=require((process.env.API_LIB||'../arsenal-pro-api/lib')+'/specparse.js');
const m=JSON.parse(fs.readFileSync('map.json','utf8'));const F=JSON.parse(fs.readFileSync('fetch.json','utf8'));
const CHECKED='2026-11-02';
const STORM=new Set(['Storm','Roto Grip','900 Global']), BRUNS=new Set(['Brunswick','DV8','Radical','Hammer','Ebonite','Track']);
const clean=s=>s==null?s:String(s).replace(/_/g,' ').replace(/\s+/g,' ').replace(/\s+([²)])/g,'$1').replace(/\(\s+/g,'(').trim();
const LABELS=/^(part number|color|colour|core|coverstock|cover type|finish|weights|lane condition|reaction|warranty|release date|performance|level|hook level|spec table|core numbers|rg \/ diff.*|downloads|featuring|resources)$/i;
function between(L,label){const i=L.findIndex(l=>l.trim().toLowerCase()===label.toLowerCase()); if(i<0)return null; const o=[];
  for(let j=i+1;j<L.length&&j<i+8;j++){ if(LABELS.test(L[j].trim()))break; o.push(L[j].trim()); }
  return o.length?o.join(' ').replace(/ (²|2)( |$)/g,'²$2').replace(/ \)/g,')').replace(/\( /g,'(').replace(/\s+/g,' ').trim():null;}
function coreTable(L){ // Brunswick family: Core Numbers | Weight | RG | DIFF | ASY | 16 lb | a | b | c | 15 lb ...   or  16 lb | 15 lb ... | RG | ... | DIFF | ... | ASY
  const i=L.findIndex(l=>/^core numbers$/i.test(l.trim())); if(i<0)return null; const t=L.slice(i+1,i+60).map(s=>s.trim()); const W={};
  if(/^weight$/i.test(t[0])){ const cols=[];let k=1; while(/^(rg|diff|asy|mb|int diff)$/i.test(t[k]))cols.push(t[k++].toLowerCase().replace('int diff','asy'));
    while(/^\d+ lb$/i.test(t[k]||'')){const w=parseInt(t[k]);W[w]={};cols.forEach((c,ci)=>{const v=parseFloat(t[k+1+ci]);if(!isNaN(v))W[w][c]=v;});k+=1+cols.length;} }
  else { const ws=[];let k=0; while(/^\d+ lb$/i.test(t[k]||''))ws.push(parseInt(t[k++]));
    while(/^(rg|diff|asy|mb|int diff)$/i.test(t[k]||'')){const c=t[k++].toLowerCase().replace('int diff','asy');ws.forEach((w,wi)=>{const v=parseFloat(t[k+wi]);W[w]=W[w]||{};if(!isNaN(v))W[w][c]=v;});k+=ws.length;} }
  return Object.keys(W).length?W:null;}
function hammerTable(L){const W={};for(let i=0;i<L.length;i++){const mm=/^(\d+) lb -$/.exec(L[i].trim());if(!mm)continue;const w=+mm[1];W[w]={};
  for(let j=i+1;j<i+8&&j<L.length-1;j++){const k=L[j].trim().toLowerCase();if(/^(rg|diff|asy|mb)$/.test(k)){const v=parseFloat(L[j+1].replace(/[()]/g,''));if(!isNaN(v))W[w][k]=v;} if(/^\d+ lb -$/.test(L[j].trim()))break;}}
  return Object.keys(W).length?W:null;}
function motivTable(L){const W={};for(let i=0;i<L.length-2;i++){if(/^\d{2}$/.test(L[i].trim())&&/^radius of gyration$/i.test(L[i+1].trim())){const w=+L[i].trim();W[w]={rg:parseFloat(L[i+2])};
  for(let j=i+3;j<i+9&&j<L.length-1;j++){const k=L[j].trim();if(/^max differential$/i.test(k))W[w].diff=parseFloat(L[j+1]);if(/^int\.? differential$|^mass bias$/i.test(k))W[w].asy=parseFloat(L[j+1]);if(/^radius of gyration$/i.test(k))break;}}}
  return Object.keys(W).length?W:null;}
const pickW=W=>W? (W[15]?15:W[16]?16:Math.max(...Object.keys(W).map(Number))) :null;
function condMap(t){if(!t)return null;const s=t.toLowerCase();
  if(/^(any|all)/.test(s))return null; if(/medium to (heavy|oily)|medium-heavy/.test(s))return'Medium-Heavy'; if(/heavy/.test(s))return'Heavy';
  if(/light to medium|medium-light/.test(s))return'Medium-Light'; if(/light/.test(s))return'Light'; if(/medium/.test(s))return'Medium'; return null;}
const out=[];
for(const o of m){
  const r={brand:o.brand,name:o.name};
  const f=o.url&&F[o.url];
  if(!f||!f.file){ r.specStatus='unverified'; r.checked=CHECKED; r.why='no maker page for this colourway'; out.push(r); continue; }
  const html=fs.readFileSync(f.file,'utf8'), L=sp.htmlToLines(html), p=sp.parseSpecPage(html), fl=p.fields; const g=k=>fl[k]?fl[k].v:null;
  r.source=f.final||o.url; r.checked=CHECKED; r.specStatus='maker'; r.derived=[];
  r.coverstock=clean(g('coverstock')); r.coverType=fl.coverType?(fl.coverType.derived?null:fl.coverType.raw):null; r.finish=clean(g('finish')); r.core=clean(g('core')); r.symmetry=g('symmetry');
  r.release=g('releaseDate'); let cond=g('condition');
  if(BRUNS.has(o.brand)){ const cs=between(L,'Coverstock'), co=between(L,'Core'), ct=between(L,'Cover Type'), lc=between(L,'Lane Condition');
    if(cs)r.coverstock=cs; if(co)r.core=co; if(ct)r.coverType=ct; if(lc)cond=lc; }
  if(o.brand==='Epic'&&r.coverstock&&r.coverstock.includes(', ')){const i=r.coverstock.indexOf(', ');r.finish=r.coverstock.slice(i+2);r.coverstock=r.coverstock.slice(0,i);}
  if(!r.coverType&&r.coverstock){const c=r.coverstock; const t=/\bpoly(ester)?\b/i.test(c)?'Polyester':(/\b(solid|pearl|hybrid|urethane)\b/i.exec(c)||[])[1]; if(t){r.coverType=t[0].toUpperCase()+t.slice(1).toLowerCase();r.derived.push('coverType');}}
  if(STORM.has(o.brand)){ const i=L.findIndex(l=>/^weight:$/i.test(l.trim())); if(i>=0&&p.headlineWeight==null){const w=parseFloat(L[i+1]); if(w)p.headlineWeight=w;} }
  if(STORM.has(o.brand)) cond=null; // Storm's "Lane condition: Fresh" is a reaction-chart axis, not a recommended condition
  let W=null; if(['Brunswick','DV8','Radical','Ebonite','Track'].includes(o.brand))W=coreTable(L); else if(o.brand==='Hammer')W=hammerTable(L); else if(o.brand==='Motiv')W=motivTable(L);
  if(!W&&Object.keys(p.weights||{}).length){W={};for(const[w,v]of Object.entries(p.weights))W[w]={rg:v.rg,diff:v.diff,asy:v.intDiff};}
  const w=pickW(W);
  if(w){const x=W[w]; r.weight=w; if(x.rg!=null)r.rg=x.rg; if(x.diff!=null)r.diff=x.diff; const a=x.asy!=null?x.asy:x.mb; if(a!=null)r.intDiff=a;}
  else if(g('rg')!=null||g('diff')!=null){ if(g('rg')!=null)r.rg=g('rg'); if(g('diff')!=null)r.diff=g('diff'); if(g('intDiff')!=null)r.intDiff=g('intDiff'); r.weight=p.headlineWeight||null; }
  if(!r.symmetry){ if(W&&Object.values(W).some(x=>(x.asy||0)>0)){r.symmetry='Asymmetric';r.derived.push('symmetry');} else if(/\basym/i.test(r.core||'')){r.symmetry='Asymmetric';r.derived.push('symmetry');} else if(/\bsymmetric/i.test(r.core||'')){r.symmetry='Symmetric';r.derived.push('symmetry');} }
  if(cond){r.conditionText=clean(cond); const c=condMap(cond); if(c){r.condition=c; r.derived.push('condition');}}
  r.title=p.title;
  for(const k of Object.keys(r)) if(r[k]==null||r[k]===''||(Array.isArray(r[k])&&!r[k].length)) delete r[k];
  out.push(r);
}
fs.writeFileSync('rows.json',JSON.stringify(out,null,1));
const b=process.argv[2];for(const r of out.filter(x=>!b||x.brand===b)){const {brand,name,source,checked,title,...rest}=r;console.log(brand,'|',name,'|',JSON.stringify(rest));}
