import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { starterBadges, nextUp, shelves } from '../../js/cc/armory.js';
import { releaseSource, pathSummary, aboutAngle } from '../../js/cc/provenance.js';
import { balls, modelOK, coverKind } from '../../js/data.js';
import { SPEC_ROWS } from '../../js/data/spec_catalog.js';
import { registerOwned, catOf, clearExtra } from '../../js/cc/cats.js';
import { search, LOOKUP_BRANDS } from '../../js/cc/addball.js';
const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
test('N64 empty shelf has no starter cards, locks, progress or invented awards', () => {
  assert.deepEqual(starterBadges(), []); assert.match(nextUp().text, /if you want/);
});
test('N64 starter cards require completed actions; an empty or open night is not earned', () => {
  const p={owned:{a:{name:'A',status:'retired'}},lines:{l:{}},surface:[{}],sessions:{s:{id:'s',ended:true}},shots:[]};
  assert.deepEqual(starterBadges(p).map(x=>x.id),['first-ball','first-line','first-surface']);
  p.shots.push({sessionId:'s'}); assert.equal(starterBadges(p).length,4);
  p.sessions.s.ended=false; assert.equal(starterBadges(p).length,3);
  p.sessions.s.ended=true;p.shots=[];p.scores=[{sessionId:'s',score:140}];assert.equal(starterBadges(p).length,4);
  assert.equal(shelves(p).hall[0].name,'A'); // Old Friends survives.
});
test('N64 undoing source records removes starter cards; Next up is zero or one object', () => {
  const p={owned:{a:{}},lines:{l:{}},surface:[{}]};assert.equal(nextUp(p),null);
  p.surface=[];assert.equal(typeof nextUp(p).text,'string');assert.equal(starterBadges(p).length,2);
});
test('N64 source chip never promotes a changed tune control to a measured input', () => {
  const f={v:15,prov:{kind:'device'}};assert.deepEqual(releaseSource(f,15),['device','measured']);
  assert.deepEqual(releaseSource(f,16),['assumed','input']);
  assert.deepEqual(releaseSource({v:15,prov:{kind:'user'}},15),['user','entered']);
  assert.deepEqual(releaseSource(null,15),['assumed','input']);
});
test('N64 summary is a rounded model description, including missing and gutter cases', () => {
  assert.equal(aboutAngle(5.46),'about 5°');assert.equal(aboutAngle(null),'no angle');
  assert.equal(pathSummary({entryBoard:17.6,bpBoard:7.4,bpFeet:43.7}),'Breaks near board 7 at 44 ft; reaches the pins near board 18.');
  assert.match(pathSummary(null),/unverified/);assert.match(pathSummary({entryBoard:3,gutter:true}),/leaves the lane/);
  assert.match(pathSummary({entryBoard:18}),/No breakpoint/);
});
test('N64 all 22 identities agree with reviewed manufacturer records and date', () => {
  const rows=json('../../tools/catalog/builtin_sources.json');assert.equal(rows.length,22);assert.equal(balls.length,22);
  const keys=['source','checked','specStatus','weight','rg','diff','intDiff','cover','core','finish','year'];
  for(const r of rows){const b=balls.find(x=>x.id===r.id);assert.ok(b,r.id);assert.equal(b.checked,'2026-11-06');
    for(const k of keys)assert.equal(b[k],r[k],`${r.id}.${k}`);
    if(r.source)assert.ok(['radicalbowling.com','www.stormbowling.com','stormproducts.nyc3.cdn.digitaloceanspaces.com','hammerbowling.com','columbia300.com'].includes(new URL(r.source).hostname),r.id);
    else assert.equal(r.specStatus,'unverified');
  }
});
test('N64 no model or grid fabrication for incomplete, spare, unknown family or NU specs', () => {
  const unsupported=balls.filter(x=>!modelOK(x)).map(x=>x.id);
  assert.deepEqual(unsupported,['hy-road-pearl','hy-road-solid','ice-storm','rack-attack','hy-road-40','hy-road-x','rattler-nu','green-scout']);
  for(const b of balls.filter(x=>x.specStatus==='unverified')){assert.equal(b.rg,undefined);assert.equal(b.diff,undefined);assert.equal(b.cover,'');}
  assert.equal(coverKind(balls.find(x=>x.id==='rattler-nu')),'Not Urethane');
});
test('N64 removed Storm rows are absent in both generator and generated catalog', () => {
  const rows=json('../../tools/catalog/maker_rows.json');
  for(const name of ['Mix Black White','Tropical Surge Purple'])for(const data of [rows,SPEC_ROWS])assert.ok(!data.some(x=>x.brand==='Storm'&&x.name===name));
});
test('N64 previously saved removed Storm identities still resolve from their confirmed owned spec', () => {
  clearExtra();
  for(const [id,name] of [['add-storm-mix-black-white','Mix Black White'],['add-storm-tropical-surge-purple','Tropical Surge Purple']]){
    const cat={id,brand:'Storm',name,cover:'',core:''};
    registerOwned({owned:{o:{catalogId:id,name,spec:{cat}}}});assert.equal(catOf(id).name,name);
    assert.equal(shelves({owned:{o:{catalogId:id,name}}},catOf).bag[0].name,name);
  }
  clearExtra();
});
test('N64 exact original Hy-Road alias stays ahead of unverified variants; Motiv lookup enabled', () => {
  assert.equal(search('Hy-Road').exact.id,'hy-road');assert.ok(LOOKUP_BRANDS.includes('Motiv'));
});
test('N64 rewritten cover guidance has no BowlVersity citation', () => {
  const d=json('../../data/glossary.json');for(const id of ['eq-plastic','eq-cover-types','ap-use-when']){
    const t=d.terms.find(x=>x.id===id);assert.ok(!t.sources.some(s=>s.key==='bv_cover'||s.url.includes('bowlversity')));
    assert.ok(t.sources.some(s=>s.key==='motiv_guide'));
  }
});
