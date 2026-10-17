const balls = [
  {id:'rattler-big-bite', cls:0, role:'Benchmark house-shot read', oil:['heavy','medium'], brand:'Radical', name:'Rattler Big Bite', color:'#DAAF37', rg:2.480, diff:0.035, cover:'Hybrid Reactive', coverName:'HK22 SHARP Hybrid', core:'Symmetric', coreName:'Rattler', finish:'500/1500/3000 Siaair', year:2024, motion:'Stronger mid-lane read with continuous motion.', rec:'YOUR PRIMARY HOUSE-SHOT BENCHMARK.', when:'Fresh to medium house.', whenNot:'Very dry lanes.', link:'https://www.bowwwl.com/bowling-balls/radical-rattler-big-bite'},
  {id:'deadly-rattler', cls:7, role:'Transition pearl', oil:['medium','light'], brand:'Radical', name:'Deadly Rattler', color:'#00d4ff', rg:2.480, diff:0.035, cover:'Pearl Reactive', coverName:'HK22 HyperKinetic Pearl', core:'Symmetric', coreName:'Rattler', finish:'500/1000/1500 Crown', year:2023, motion:'Cleaner through the fronts, sharper backend.', rec:'YOUR TRANSITION BALL.', when:'Medium to light oil.', whenNot:'Fresh heavy oil.', link:'https://www.bowwwl.com/bowling-balls/radical-deadly-rattler'},
  {id:'super-nova', cls:1, role:'Heavy oil asym solid', oil:['heavy'], brand:'Storm', name:'Super Nova', color:'#ff6b35', rg:2.490, diff:0.052, cover:'Solid Reactive', coverName:'NeX Solid', core:'Asymmetric', coreName:'Ignition', finish:'2000 Abralon', year:2022, motion:'Very early reading, strong midlane.', rec:'Heavy oil or early traction.', when:'Fresh heavy house.', whenNot:'Medium or light oil.', link:'https://www.bowwwl.com/bowling-balls/storm-super-nova'},
  {id:'hy-road', cls:0, role:'Control/versatility line', oil:['medium'], brand:'Storm', name:'Original Hy-Road', color:'#4ade80', rg:2.570, diff:0.046, cover:'Hybrid Reactive', coverName:'R2S Hybrid', core:'Symmetric', coreName:'Inverted Fe2', finish:'1500-grit Polished', year:2008, motion:'Classic length with strong backend.', rec:'Excellent all-around.', when:'Medium house.', whenNot:'Very heavy oil.', link:'https://www.bowwwl.com/bowling-balls/storm-hy-road'},
  {id:'hy-road-pearl', cls:6, role:'Control/versatility line', oil:['medium','light'], brand:'Storm', name:'Hy-Road Pearl', color:'#a78bfa', rg:2.570, diff:0.046, cover:'Pearl Reactive', coverName:'R2S Pearl', core:'Symmetric', coreName:'Inverted Fe2', finish:'1500 Polished', year:2010, motion:'Clean then strong angular backend.', rec:'Ideal transition or lighter oil.', when:'Medium-light oil.', whenNot:'Fresh heavy oil.', link:'https://www.bowwwl.com/bowling-balls/storm-hy-road-pearl'},
  {id:'hy-road-solid', cls:2, role:'Control/versatility line', oil:['heavy','medium'], brand:'Storm', name:'Hy-Road Solid', color:'#22d3ee', rg:2.570, diff:0.046, cover:'Solid Reactive', coverName:'R2S Solid', core:'Symmetric', coreName:'Inverted Fe2', finish:'2000 Abralon', year:2014, motion:'Earlier than original with controlled midlane.', rec:'Stronger than the pearls.', when:'Fresh to medium house.', whenNot:'Light oil.', link:'https://www.bowwwl.com/bowling-balls/storm-hy-road-solid'},
  {id:'astrophysix', cls:5, role:'Power pearl for angle', oil:['medium'], brand:'Storm', name:'AstroPhysiX', color:'#f472b6', rg:2.480, diff:0.053, cover:'Pearl Reactive', coverName:'R2S Pearl', core:'Asymmetric', coreName:'Atomic', finish:'1500 Polished', year:2019, motion:'Length then sharp backend.', rec:'Power pearl for angle.', when:'Medium oil when you need length.', whenNot:'Heavy oil.', link:'https://www.bowwwl.com/bowling-balls/storm-astrophysix'},
  {id:'ice-storm', cls:10, role:'Dry-lane control pearl', oil:['light'], brand:'Storm', name:'Ice Storm', color:'#67e8f9', rg:2.550, diff:0.040, cover:'Pearl Reactive', core:'Symmetric', finish:'Polished', year:2015, motion:'Cleaner, controllable pearl.', rec:'Dry lanes.', when:'Dry or broken-down.', whenNot:'Fresh oil.'},
  {id:'innovator', cls:3, role:'Heavy oil control solid', oil:['heavy'], brand:'Radical', name:'Innovator', color:'#fb7185', rg:2.470, diff:0.050, cover:'Solid Reactive', core:'Asymmetric', year:2020, motion:'Strong early-to-mid solid.', rec:'Heavy oil control.', when:'Fresh heavy.', whenNot:'Medium or light.'},
  {id:'bigfoot-hybrid', cls:4, role:'Benchmark continuous hybrid', oil:['heavy','medium'], brand:'Radical', name:'Bigfoot Hybrid', color:'#fbbf24', rg:2.468, diff:0.053, cover:'Hybrid Reactive', coverName:'HK22 Hybrid', core:'Symmetric', coreName:'Bigfoot', year:2022, motion:'Strong continuous hybrid.', rec:'Benchmark hybrid.', when:'Medium-heavy.', whenNot:'Light oil.'},
  {id:'rattler', cls:7, role:'Smooth control solid', oil:['medium'], brand:'Radical', name:'Rattler', color:'#86efac', rg:2.480, diff:0.035, cover:'Solid Reactive', coverName:'S.H.A.R.P', core:'Symmetric', coreName:'Rattler', finish:'500/1500/4000', year:2023, motion:'Benchmark solid — continuous.', rec:'Reliable control.', when:'Smooth control needed.', whenNot:'When you need more angle.'},
  {id:'ordnance-c4', cls:3, role:'Versatile medium-oil hybrid', oil:['medium'], brand:'900 Global', name:'Ordnance C4', color:'#c084fc', rg:2.490, diff:0.041, cover:'Hybrid Reactive', coverName:'S70 Hybrid', core:'Symmetric', coreName:'Shrapnel 2.0', finish:'4000 Abralon', year:2020, motion:'Clean hybrid.', rec:'Versatile medium-oil.', when:'Medium conditions.', whenNot:'Extremes.'},
  {id:'raw-hammer', cls:8, role:'Benchmark solid', oil:['medium'], brand:'Hammer', name:'Raw Hammer Black', color:'#94a3b8', rg:2.540, diff:0.038, cover:'Solid Reactive', core:'Symmetric', year:2021, motion:'Controlled solid.', rec:'Benchmark solid.', when:'Standard house.', whenNot:'Very light oil.'},
  {id:'rack-attack', cls:9, role:'Short/dry urethane', oil:['light'], brand:'Sports Tec', name:'Rack Attack Pro Line Urethane', color:'#f97316', rg:2.600, diff:0.015, cover:'Urethane', core:'Symmetric', year:2020, motion:'Classic urethane — smooth early roll.', rec:'Short patterns or dry.', when:'Short or dry.', whenNot:'Heavy oil.'},
  {id:'conspiracy-pearl', cls:5, role:'Strong asymmetric pearl', oil:['medium','light'], brand:'Radical', name:'Radical Conspiracy Pearl', color:'#e879f9', rg:2.487, diff:0.056, cover:'Pearl Reactive', coverName:'Forged 2 Pearl', core:'Asymmetric', year:2025, motion:'Clean through the fronts, strong angular backend.', rec:'Your angle ball when the fronts dry out.', when:'Medium to medium-light oil.', whenNot:'Fresh heavy oil.'},
  {id:'guru-supreme', cls:1, role:'Strong asym solid', oil:['heavy'], brand:'Radical', name:'Guru Supreme', color:'#f59e0b', rg:2.501, diff:0.044, cover:'Solid Reactive', core:'Asymmetric', year:2015, coverName:'Guru Solid', finish:'500/1500 Siaair', motion:'Heavy-oil length, strong backend, high flare.', rec:'Second heavy-oil weapon next to the Nova.', when:'Fresh heavy house.', whenNot:'Medium or light oil.'},
  {id:'counter-attack', cls:2, role:'Strong symmetric solid', oil:['medium','light'], brand:'Radical', name:'Counter Attack Solid', color:'#10b981', rg:2.575, diff:0.023, cover:'Solid Reactive', core:'Symmetric', year:2019, coverName:'Ai-20 Solid', finish:'500/1000/3000 Siaair', motion:'Easy length. Low diff, so it will not overhook.', rec:'Heavy oil when you need control, not angle.', when:'Fresh to medium house.', whenNot:'Light oil.'},
  {id:'trailblazer', cls:4, role:'Medium-strong hybrid', oil:['heavy','medium'], brand:'Radical', name:'Trail Blazer', color:'#38bdf8', rg:2.484, diff:0.052, cover:'Hybrid Reactive', core:'Asymmetric', year:2021, coverName:'MOtion Magic', finish:'500/1000/1500 Siaair', motion:'Big footprint, plenty of hook, continuation on the backend.', rec:'Step-up from the Bigfoot when the fronts hold.', when:'Medium-heavy.', whenNot:'Light oil.'},
  {id:'hy-road-40', cls:4, role:'Medium-strong hybrid', oil:['medium','light'], brand:'Storm', name:'Hy-Road 40', color:'#34d399', rg:2.57, diff:0.046, cover:'Pearl Reactive', core:'Symmetric', year:2025, coverName:'A1S Pearl', finish:'Power Edge', motion:'Clean length, defined backend. Fast oil absorption.', rec:'Hy-Road family when the benchmark is too clean.', when:'Medium to medium-heavy.', whenNot:'Light oil.'},
  {id:'hy-road-x', cls:2, role:'Strong symmetric solid', oil:['medium','heavy'], brand:'Storm', name:'Hy-Road X', color:'#c4b5fd', rg:2.57, diff:0.046, cover:'Solid Reactive', core:'Symmetric', year:2018, coverName:'R2X Solid', finish:'1500 Polished', motion:'Good midlane read, smooth strong backend.', rec:'Solid Hy-Road when the fronts are drier than the benchmark likes.', when:'Medium to medium-heavy oil.', whenNot:'Light or burned lanes.'},
  {id:'rattler-nu', cls:7, role:'Control variant', oil:['medium'], brand:'Radical', name:'Rattler NU', color:'#a3e635', rg:2.48, diff:0.035, cover:'Hybrid Reactive', core:'Symmetric', year:2024, coverName:'Not Urethane (urethane-like motion)', finish:'500/1000 Siaair', motion:'Smooth, continuous, urethane-like. Control the backend.', rec:'Rattler motion with a different surface read.', when:'Medium house, need control.', whenNot:'When you need more angle.'},
  {id:'green-scout', cls:8, role:'Burn ball', oil:['medium','light'], brand:'Columbia 300', name:'Scout Reactive', color:'#22c55e', rg:2.65, diff:0.02, cover:'Solid Reactive', coverName:'Super-Flex reactive (solid/pearl unconfirmed)', core:'Symmetric', coreName:'Pancake', finish:'Polished', year:2012, motion:'Burn-ball read. Gives up length, holds line.', rec:'Burned-up lanes where everything else hooks too soon.', when:'Broken-down or burned lanes.', whenNot:'Fresh oil.'}
];
const CLASSES=['Benchmark / First Read', 'Strong Asymmetrical Solids', 'Strong Symmetrical Solids', 'Strong Asymmetrical Hybrids', 'Medium-Strong Hybrids', 'Medium Asymmetrical Pearls', 'Medium Symmetrical Pearls', 'Control Pieces / Benchmark Variants', 'Burn / Transition', 'Urethane', 'Spare Ball'];
const rgOf=b=>b.rg!=null?b.rg:b.simRg, diffOf=b=>b.diff!=null?b.diff:b.simDiff;
const rgTxt=b=>b.rg!=null?b.rg:'spec TBD', diffTxt=b=>b.diff!=null?b.diff:'spec TBD';
const specOK=b=>b.rg!=null&&b.diff!=null;
const estTag=b=>b.est?' <i class="est">est.</i>':'';
let selectedBall = balls[0];
let canvas, ctx;
const LW=220, LH=880;

function getFinishMod(f) { if(f==='500')return{e:1.25,h:1.15}; if(f==='1000')return{e:1.12,h:1.08}; if(f==='2000')return{e:1,h:1}; if(f==='3000')return{e:0.88,h:0.95}; if(f==='polished')return{e:0.72,h:0.88}; return{e:1,h:1}; }
function getCoverMod(c) { if(c.includes('Solid'))return{e:0.75,h:1.15}; if(c.includes('Pearl'))return{e:0.3,h:0.95}; if(c.includes('Hybrid'))return{e:0.52,h:1.05}; if(c.includes('Urethane'))return{e:0.85,h:0.65}; return{e:0.5,h:1}; }
function openDossier(ball) {
  document.getElementById('dossierContent').innerHTML = `<h2>${ball.brand} ${ball.name}</h2><div style="color:var(--muted);font-size:0.82rem;margin-bottom:0.5rem;">${ball.year||''} • ${ball.cover}${ball.coverName?' ('+ball.coverName+')':''}</div><div class="spec-grid"><div class="spec-item"><strong>RG</strong><br>${rgTxt(ball)}</div><div class="spec-item"><strong>Diff</strong><br>${diffTxt(ball)}</div><div class="spec-item"><strong>Core</strong><br>${ball.core}${estTag(ball)}${ball.coreName?' • '+ball.coreName:''}</div><div class="spec-item"><strong>Factory Finish</strong><br>${ball.finish||'—'}</div></div><p><strong>Motion:</strong> ${ball.motion}</p><div class="recommendation"><strong>Recommendation for ~15 mph / ~220 RPM</strong><br>${ball.rec}<br><br><strong>When to use:</strong> ${ball.when}<br><strong>When to leave it in the bag:</strong> ${ball.whenNot}</div>${ball.link?`<div class="links" style="margin-top:0.7rem;"><a href="${ball.link}" target="_blank">View on bowwwl.com →</a></div>`:''}`;
  lastFocus=document.activeElement; document.getElementById('dossierModal').classList.add('open'); document.querySelector('.close').focus();
}
let lastFocus=null;
function closeDossier(){ document.getElementById('dossierModal').classList.remove('open'); if(lastFocus&&lastFocus.focus) try{lastFocus.focus();}catch(e){} }

// ===== Arsenal view =====
const ars={cls:'All',cover:'All',oil:'All',sort:'cls',compare:false,picked:[],hl:null,pts:[]};
const coverKind=b=>b.cover.includes('Solid')?'Solid':b.cover.includes('Pearl')?'Pearl':b.cover.includes('Hybrid')?'Hybrid':'Urethane';
function showView(v){
  const a=v==='arsenal';
  document.getElementById('laneView').hidden=a; document.getElementById('arsenalView').hidden=!a;
  document.getElementById('tabLane').classList.toggle('on',!a); document.getElementById('tabArsenal').classList.toggle('on',a);
  document.getElementById('tabLane').setAttribute('aria-pressed',String(!a)); document.getElementById('tabArsenal').setAttribute('aria-pressed',String(a));
  if(a) renderArsenal(); else drawLane();
}
function arsList(){
  let l=balls.filter(b=>(ars.cls==='All'||CLASSES[b.cls]===ars.cls)&&(ars.cover==='All'||coverKind(b)===ars.cover)&&(ars.oil==='All'||b.oil.includes(ars.oil.toLowerCase())));
  l=l.slice().sort((a,b)=>ars.sort==='cls'?(a.cls-b.cls||rgOf(a)-rgOf(b)):ars.sort==='name'?a.name.localeCompare(b.name):ars.sort==='diff'?(diffOf(b)-diffOf(a)):(rgOf(a)-rgOf(b)));
  return l;
}
function chipRow(id,opts,key){
  const el=document.getElementById(id); el.innerHTML='';
  opts.forEach(o=>{const b=document.createElement('button'); b.className='chip'+(ars[key]===o[0]?' on':''); b.textContent=o[1]; b.dataset.v=o[0]; b.setAttribute('aria-pressed',String(ars[key]===o[0])); b.onclick=()=>{ars[key]=o[0]; renderArsenal();}; el.appendChild(b);});
}
function gapsText(){
  const oils=['heavy','medium','light'];
  const cnt=Object.fromEntries(oils.map(o=>[o,balls.filter(b=>b.oil.includes(o)).length]));
  const thin=oils.slice().sort((a,b)=>cnt[a]-cnt[b])[0];
  const tbd=balls.filter(b=>!specOK(b)).length;
  return `Gaps. Oil count: heavy ${cnt.heavy}, medium ${cnt.medium}, light ${cnt.light}. Thinnest is ${thin}. ${tbd?tbd+' ball'+(tbd===1?'':'s')+' still spec TBD.':'All 22 balls have specs.'}`;
}
function renderAssess(){
  document.getElementById('assess').innerHTML=`<div><b>Profile:</b> right-handed tweener, ~15 mph, ~220 rpm, PAP 5 1/8, medium tilt and rotation.</div>
<div><b>Strengths:</b> medium-volume house. Benchmark and control. Transition and burn. Multiple motion shapes in the Hy-Road and Rattler families.</div>
<div><b>Gaps:</b></div><ul>
<li>No modern strong symmetrical pearl. Look at IQ Tour A.I. Pearl, Phaze A.I., No Doubt Pearl.</li>
<li>No heavy-oil control benchmark. Black Widow 3.0, Ion Pro Solid.</li>
<li>No modern urethane alternative. Purple Pearl Urethane, The Spy, Motiv Tank.</li>
<li>No high-RG angular ball for cliffed conditions. Attention Star, VEBO, Lightning Blackout. AstroPhysiX is aging.</li></ul>
<div class="rating">League 8.5/10. Tournament coverage 7.5/10. Best add: one modern strong pearl and one newer heavy-oil benchmark, not another benchmark.</div>`;
}
const BAGS=[['Tournament 6-ball bag',[['rattler-big-bite','Benchmark'],['super-nova','Strong solid'],['ordnance-c4','Strong hybrid'],['hy-road-pearl','Cleaner pearl'],['deadly-rattler','Control / transition'],['ice-storm','Spare']]],
['House league 3-ball',[['rattler-big-bite','Benchmark'],['hy-road-pearl','Cleaner pearl'],['ice-storm','Spare']]],
['Tighter lanes 3-ball',[['super-nova','Strong solid'],['rattler-big-bite','Benchmark'],['ice-storm','Spare']]]];
function renderBags(){
  const el=document.getElementById('bagBuilder'); el.innerHTML='<h3>Bag builder</h3>';
  BAGS.forEach(([t,l])=>{const d=document.createElement('div'); d.className='bagset'; d.innerHTML=`<h4>${t}</h4><div class="bagballs"></div>`;
    l.forEach(([id,r])=>{const b=balls.find(x=>x.id===id); const bt=document.createElement('button'); bt.className='bagball'; bt.dataset.ball=id; bt.innerHTML=`${b.name}<small>${r}</small>`; bt.onclick=()=>putOnLane(b); d.querySelector('.bagballs').appendChild(bt);});
    el.appendChild(d);});
}
function renderArsenal(){
  chipRow('clsChips',[['All','All classes']].concat(CLASSES.map(c=>[c,c.split(' / ')[0].replace('Strong ','Str. ').replace('Medium ','Med. ').replace('Asymmetrical','Asym').replace('Symmetrical','Sym')])),'cls');
  chipRow('coverChips',[['All','All'],['Solid','Solid'],['Pearl','Pearl'],['Hybrid','Hybrid'],['Urethane','Urethane']],'cover');
  chipRow('oilChips',[['All','Any oil'],['Heavy','Heavy'],['Medium','Medium'],['Light','Light']],'oil');
  chipRow('sortChips',[['cls','By class'],['rg','Sort RG'],['diff','Sort Diff'],['name','Sort Name']],'sort');
  const cb=document.getElementById('compareToggle'); cb.classList.toggle('on',ars.compare); cb.setAttribute('aria-pressed',String(ars.compare)); cb.textContent=ars.compare?'Compare: pick up to 3':'Compare';
  cb.onclick=()=>{ars.compare=!ars.compare; if(!ars.compare) ars.picked=[]; renderArsenal();};
  document.getElementById('gapsNote').textContent=gapsText(); renderAssess(); renderBags();
  const grid=document.getElementById('arsGrid'); grid.innerHTML=''; grid.classList.toggle('compare-on',ars.compare);
  const list=arsList(); let lastCls=-1;
  list.forEach(b=>{
    if(ars.sort==='cls'&&b.cls!==lastCls){lastCls=b.cls; const h=document.createElement('h2'); h.className='clshead'; h.textContent=CLASSES[b.cls]; grid.appendChild(h);}
    const c=document.createElement('div'); c.className='acard'+(ars.hl===b.id?' hl':''); c.id='acard-'+b.id; c.dataset.ball=b.id;
    c.innerHTML=`<label class="cmp"><input type="checkbox" ${ars.picked.includes(b.id)?'checked':''} aria-label="Compare ${b.name}">Compare</label>
<h3><span class="sw" style="background:${b.color}"></span>${b.name}</h3><div class="brand">${b.brand}${b.year?' • '+b.year:''}</div><div class="role">${b.role}</div>
<div class="specs"><span>Cover <b>${b.cover}${estTag(b)}${b.coverName?' ('+b.coverName+')':''}</b></span><span>Core <b>${b.core}${b.coreName?' • '+b.coreName:''}</b></span><span>RG <b>${rgTxt(b)}</b></span><span>Diff <b>${diffTxt(b)}</b></span><span style="grid-column:1/-1">Factory finish <b>${b.finish||'—'}</b></span></div>${b.note?`<div class="est">${esc(b.note)}</div>`:''}
<div class="use"><b>Use when:</b> ${b.when}</div><div class="leave"><b>Leave in bag:</b> ${b.whenNot}</div>
<div class="btns"><button class="secondary info">Info</button><button class="onlane">Put on lane</button></div>`;
    c.querySelector('.info').onclick=()=>openDossier(b);
    c.querySelector('.onlane').onclick=()=>putOnLane(b);
    c.querySelector('.cmp input').onchange=e=>{
      if(e.target.checked){ if(ars.picked.length>=3){e.target.checked=false; return;} ars.picked.push(b.id);} else ars.picked=ars.picked.filter(x=>x!==b.id);
      renderCompare();
    };
    grid.appendChild(c);
  });
  renderCompare(); drawChart();
}
function renderCompare(){
  const w=document.getElementById('compareWrap'); const ps=ars.picked.map(id=>balls.find(b=>b.id===id));
  if(!ars.compare||!ps.length){w.hidden=true; w.innerHTML=''; return;}
  const rows=[['Brand',b=>b.brand],['Role',b=>b.role],['Cover',b=>b.cover+(b.coverName?' ('+b.coverName+')':'')],['Core',b=>b.core+(b.coreName?' • '+b.coreName:'')],['RG',b=>rgTxt(b)],['Diff',b=>diffTxt(b)],['Finish',b=>b.finish||'—'],['Motion',b=>b.motion],['Use when',b=>b.when],['Leave in bag',b=>b.whenNot]];
  w.hidden=false;
  w.innerHTML='<table><thead><tr><th></th>'+ps.map(b=>`<th>${b.name}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>`<tr><th>${r[0]}</th>`+ps.map(b=>`<td>${r[1](b)}</td>`).join('')+'</tr>').join('')+'</tbody></table>';
}
function putOnLane(b){
  selectedBall=b;
  document.querySelectorAll('#ballList .ball-card').forEach((c,i)=>c.classList.toggle('active',balls[i].id===b.id));
  showView('lane'); renderSavedLines(); renderAlleyLists(); syncLines(); drawLane();
  const ac=document.querySelector('#ballList .ball-card.active'); if(ac) ac.scrollIntoView({block:'nearest',inline:'nearest'});
  window.scrollTo(0,0);
}
function drawChart(){
  const cv=document.getElementById('rgChart'); if(!cv) return;
  cv.setAttribute('role','img'); cv.setAttribute('aria-label','Chart of core RG (across) against differential (up) for '+balls.filter(specOK).length+' balls. The cards below list every ball with its specs.'); const g=cv.getContext('2d'); const W=cv.width,H=cv.height;
  g.clearRect(0,0,W,H); g.fillStyle='#0d1320'; g.fillRect(0,0,W,H);
  const L=52,R=18,T=16,B=40, x0=2.45,x1=2.62,y0=0.01,y1=0.06;
  const X=v=>L+(v-x0)/(x1-x0)*(W-L-R), Y=v=>H-B-(v-y0)/(y1-y0)*(H-T-B);
  g.strokeStyle='#2a3548'; g.fillStyle='#94a3b8'; g.font='12px sans-serif'; g.lineWidth=1;
  for(let v=2.45;v<=2.621;v+=0.02){g.beginPath();g.moveTo(X(v),T);g.lineTo(X(v),H-B);g.stroke();g.textAlign='center';g.fillText(v.toFixed(2),X(v),H-B+16);}
  for(let v=0.01;v<=0.0601;v+=0.01){g.beginPath();g.moveTo(L,Y(v));g.lineTo(W-R,Y(v));g.stroke();g.textAlign='right';g.fillText(v.toFixed(2),L-6,Y(v)+4);}
  g.textAlign='center'; g.fillStyle='#DAAF37'; g.fillText('RG',(L+W-R)/2,H-6); g.save(); g.translate(12,(T+H-B)/2); g.rotate(-Math.PI/2); g.fillText('Differential',0,0); g.restore();
  // spread identical specs in a small ring so every ball stays tappable
  const cb=balls.filter(specOK); const groups={}; cb.forEach(b=>{const k=b.rg+'/'+b.diff;(groups[k]=groups[k]||[]).push(b);});
  const vis=new Set(arsList().map(b=>b.id)); ars.pts=[];
  cb.forEach(b=>{
    const grp=groups[b.rg+'/'+b.diff], n=grp.length, i=grp.indexOf(b); let dx=0,dy=0;
    if(n>1){const a=i/n*Math.PI*2-Math.PI/2, r=14; dx=Math.cos(a)*r; dy=Math.sin(a)*r;}
    ars.pts.push({id:b.id,x:X(b.rg)+dx,y:Y(b.diff)+dy,b,on:vis.has(b.id)});
  });
  ars.pts.forEach(p=>{
    g.globalAlpha=p.on?1:0.2; g.beginPath(); g.arc(p.x,p.y,ars.hl===p.id?9:6.5,0,7); g.fillStyle=p.b.color; g.fill();
    g.lineWidth=ars.hl===p.id?3:1; g.strokeStyle=ars.hl===p.id?'#DAAF37':'#000'; g.stroke();
    if(p.on){g.fillStyle='#e2e8f0'; g.font='10.5px sans-serif'; g.textAlign=p.x>W-130?'right':'left'; g.fillText(p.b.name.replace('Radical ','').replace(' Pro Line Urethane',''), p.x+(p.x>W-130?-10:10), p.y+3.5);}
  });
  g.globalAlpha=1;
}
function setupArsenal(){
  document.getElementById('tabLane').onclick=()=>showView('lane');
  document.getElementById('tabArsenal').onclick=()=>showView('arsenal');
  const cv=document.getElementById('rgChart');
  cv.addEventListener('click',e=>{
    const r=cv.getBoundingClientRect(), sx=cv.width/r.width, x=(e.clientX-r.left)*sx, y=(e.clientY-r.top)*sx;
    let best=null,bd=1e9; ars.pts.forEach(p=>{const d=Math.hypot(p.x-x,p.y-y); if(d<bd){bd=d;best=p;}});
    if(!best||bd>22*Math.max(1,sx/1.8)) return;
    if(!best.on){ars.cover='All';ars.oil='All';}
    ars.hl=best.id; renderArsenal();
    const c=document.getElementById('acard-'+best.id); if(c) c.scrollIntoView({block:'center',behavior:'smooth'});
  });
}
function init() {
  setupArsenal();
  const list = document.getElementById('ballList');
  balls.forEach(b => {
    const card = document.createElement('div');
    card.className = 'ball-card'+(b.id===selectedBall.id?' active':'');
    card.innerHTML = `<button class="pick"><span class="ball-dot" style="background:${b.color}" aria-hidden="true">${b.brand[0]}</span><span><span class="name" style="display:block">${b.name}</span><span class="meta" style="display:block">${b.cover.split(' ')[0]} • RG ${rgTxt(b)}</span></span></button><button class="info-btn" aria-label="Info: ${b.brand} ${b.name}">Info</button>`;
    card.onclick = e => { if(e.target.closest('.info-btn')) return; selectedBall=b; document.querySelectorAll('.ball-card').forEach(c=>{c.classList.remove('active'); const pk=c.querySelector('.pick'); if(pk) pk.removeAttribute('aria-current');}); card.classList.add('active'); card.querySelector('.pick').setAttribute('aria-current','true'); renderSavedLines(); renderAlleyLists(); scheduleSync(); drawLane(); card.scrollIntoView({block:'nearest',inline:'nearest'}); };
    card.querySelector('.info-btn').onclick = e => { e.stopPropagation(); openDossier(b); };
    list.appendChild(card);
  });
  ['speed','rev','release','aim','oil'].forEach(id => document.getElementById(id).oninput = e => { document.getElementById(id+'Val').textContent = id==='oil'?(+e.target.value).toFixed(1):e.target.value; scheduleDraw(); });
  document.getElementById('finish').onchange = drawLane;
  document.getElementById('pattern').onchange = drawLane;
  document.getElementById('simulate').onclick = drawLane;
  document.getElementById('recommend').onclick = () => {
    const p = document.getElementById('pattern').value;
    const cover = getCoverMod(selectedBall.cover);
    let rel = cover.e > 0.6 ? 12 : 16;
    if (p==='cheetah'||p==='dry') rel = 18;
    if (p==='shark') rel = 10;
    document.getElementById('release').value = rel;
    document.getElementById('releaseVal').textContent = rel;
    drawLane();
  };
  document.querySelector('.close').onclick = closeDossier;
  document.addEventListener('keydown', e => { if (e.key==='Escape' && document.getElementById('dossierModal').classList.contains('open')) closeDossier(); });
  document.getElementById('dossierModal').onclick = e => { if(e.target.id==='dossierModal') closeDossier(); };
  canvas = document.getElementById('lane');
  ctx = canvas.getContext('2d');
  setupDrag();
  restoreState();
  initPersistence();
  drawLane();
}
let drawQueued=false;
let stateT=null;
function saveState(){ clearTimeout(stateT); stateT=setTimeout(()=>{ const g=id=>document.getElementById(id).value; rawSet('ap_state', JSON.stringify({ball:selectedBall.id,speed:g('speed'),rev:g('rev'),release:g('release'),aim:g('aim'),oil:g('oil'),finish:g('finish'),pattern:g('pattern')})); },300); }
function restoreState(){
  let st=null; try { st=JSON.parse(rawGet('ap_state')); } catch(e) {}
  if(!st||typeof st!=='object') return;
  const b=balls.find(x=>x.id===st.ball); if(b) selectedBall=b;
  ['speed','rev','release','aim','oil'].forEach(id=>{ const el=document.getElementById(id), v=+st[id]; if(Number.isFinite(v)&&v>=+el.min&&v<=+el.max) setControl(id,v); });
  ['finish','pattern'].forEach(id=>{ const el=document.getElementById(id); if(typeof st[id]==='string'&&[...el.options].some(o=>o.value===st[id])) el.value=st[id]; });
  document.querySelectorAll('#ballList .ball-card').forEach((c,i)=>{ const on=balls[i].id===selectedBall.id; c.classList.toggle('active',on); const pk=c.querySelector('.pick'); if(pk){ if(on) pk.setAttribute('aria-current','true'); else pk.removeAttribute('aria-current'); } });
}
function scheduleDraw(){ if(drawQueued) return; drawQueued=true; requestAnimationFrame(()=>{ drawQueued=false; drawLane(); }); }
let syncTimer=null;
function scheduleSync(){ clearTimeout(syncTimer); syncTimer=setTimeout(()=>{ syncLines(); },350); }
function boardToX(board, w) { return 14 + ((39 - board) / 39) * (w - 28); }
function simulatePath(ball, ov) {
  ov = ov || {};
  const num = (k,id) => ov[k]!==undefined ? ov[k] : +document.getElementById(id).value;
  const speed = num('speed','speed'), rev = num('rev','rev'), release = num('release','release'), aim = num('aim','aim'), oil = +document.getElementById('oil').value, finish = document.getElementById('finish').value, pattern = document.getElementById('pattern').value, w = LW, h = LH;
  const cover = getCoverMod(ball.cover), fin = getFinishMod(finish);
  const rgEarly = Math.max(0.2, Math.min(0.9, (2.60-rgOf(ball))*2.2));
  const diffHook = 0.7 + diffOf(ball)*12;
  const asym = ball.core==='Asymmetric' ? 1.12 : 1.0;
  const early = (cover.e*0.5 + rgEarly*0.35 + fin.e*0.15) * fin.e;
  const hookPot = cover.h * diffHook * asym * fin.h;
  const revRatio = rev / (speed*14);
  const baseHook = hookPot * (0.55 + revRatio*0.45) / oil;
  let x = boardToX(release, w), y = h - 42, vx = Math.sin(aim * Math.PI/180) * 0.85, vy = -5.6;
  const points = []; let breakpoint = null, gutter = false;
  for (let t=0; t<240; t++) {
    points.push({x,y});
    const board = 39 - ((x-14)/(w-28))*39;
    if (board < 1 || board > 39) { gutter = true; break; } // ball left the lane: stop the path here
    let fr = 0.28;
    if (pattern==='house') fr = (board<8||board>31)?1.55 : (board>15&&board<24?0.22:0.6);
    else if (pattern==='cheetah') fr = 1.6; else if (pattern==='dry') fr = 1.8; else if (pattern==='shark') fr = 0.42; else fr = 0.58;
    fr *= oil;
    const prog = (h-42-y)/(h-125);
    const phaseStart = 0.40 - early*0.18;
    let phase = 0;
    if (prog > phaseStart) { const p = Math.min(1, (prog-phaseStart)/(1-phaseStart)); phase = Math.pow(p, 1.5) * (1.05 - p*0.25); }
    const force = baseHook * fr * phase * 0.36;
    vx -= force * 0.10;
    if (prog > 0.80) vx *= 0.983;
    x += vx; y += vy;
    if (!breakpoint && phase>0.28 && force>0.04) breakpoint = {x,y,board};
    if (y < 60) break;
  }
  return {points, breakpoint, gutter};
}
function drawPins(w, h) {
  const baseY = 68, spacing = 14, centerX = boardToX(20, w);
  const pins = [
    {n:1,x:centerX,y:baseY},
    {n:2,x:centerX-spacing*0.85,y:baseY-spacing*0.95},
    {n:3,x:centerX+spacing*0.85,y:baseY-spacing*0.95},
    {n:4,x:centerX-spacing*1.7,y:baseY-spacing*1.9},
    {n:5,x:centerX,y:baseY-spacing*1.9},
    {n:6,x:centerX+spacing*1.7,y:baseY-spacing*1.9},
    {n:7,x:centerX-spacing*2.55,y:baseY-spacing*2.85},
    {n:8,x:centerX-spacing*0.85,y:baseY-spacing*2.85},
    {n:9,x:centerX+spacing*0.85,y:baseY-spacing*2.85},
    {n:10,x:centerX+spacing*2.55,y:baseY-spacing*2.85}
  ];
  pins.forEach(p=>{
    ctx.beginPath(); ctx.arc(p.x,p.y,5.5,0,Math.PI*2);
    ctx.fillStyle='#fff'; ctx.fill();
    ctx.strokeStyle='#111'; ctx.lineWidth=0.5; ctx.stroke();
    ctx.fillStyle='#000'; ctx.font='6px sans-serif'; ctx.textAlign='center';
    ctx.fillText(p.n, p.x, p.y+2);
  });
  ctx.strokeStyle='rgba(218,175,55,0.75)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(centerX+10, baseY-spacing*0.5, 15, 0, Math.PI*2); ctx.stroke();
}

/* ===== Breakpoint-style analysis =====
   Coordinates: feet 0 = foul line, 15 = arrows, 60 = head pin. Board 1-39 (1 right, 20 center). Pocket = board 17.5.
   Strike = entry board 16.8-18.2 AND entry angle 4-6 deg. The angle is measured on the drawn lane
   (the lane is drawn stretched sideways, so this is the visual pocket angle, same as the old panel).
   Board in tolerance + angle in tolerance means the ball is inside the 17.5-to-20 pocket line, i.e. sweeps the 5-pin. */
const HEAD_Y = 68, FOUL_Y = LH - 34, PX_FT = (FOUL_Y - HEAD_Y) / 60;
const yToFeet = y => (FOUL_Y - y) / PX_FT;
const xToBoard = x => 39 - ((x - 14) / (LW - 28)) * 39;
const OIL_LEN = {house:38, sport:42, cheetah:35, scorpion:42, shark:45, dry:32};
/* Rule of 31: oil length (ft) - 31 = board where the ball should exit the oil (breakpoint board).
   Only the board check is shown; the breakpoint distance is not enforced. */
function ruleOf31(pattern, bpBoard) {
  const len = OIL_LEN[pattern] || 38, target = len - 31;
  const d = bpBoard - target; // higher board = further left = further inside here
  const rel = Math.abs(d) < 0.5 ? 'on it' : (d > 0 ? d.toFixed(1)+' inside' : (-d).toFixed(1)+' outside');
  return {len, target, d, text: `Rule of 31: ${len} ft oil, target board ${target}, you are ${rel}.`};
}
function analyze(ball, ov) {
  const r = simulatePath(ball, ov), pts = r.points;
  const out = {points:pts, gutter:r.gutter, breakpoint:r.breakpoint, entryBoard:null, angle:null, strike:false, call:'', bpFeet:null, bpBoard:null};
  let entry = null;
  for (let i=1;i<pts.length;i++) if (pts[i].y <= HEAD_Y) {
    const a=pts[i-1], c=pts[i], f=(a.y-HEAD_Y)/(a.y-c.y), x=a.x+(c.x-a.x)*f;
    const b=pts[Math.max(0,i-4)];
    entry = {board:xToBoard(x), angle:Math.abs(Math.atan2(b.x-c.x, b.y-c.y)*180/Math.PI)}; break;
  }
  if (r.gutter || !entry) { out.call = 'GUTTER'; if (!entry) { const e=pts[pts.length-1]; out.entryBoard = e?xToBoard(e.x):null; } }
  else {
    out.entryBoard = entry.board; out.angle = entry.angle;
    const bOK = Math.abs(entry.board-17.5) <= 0.7, aOK = entry.angle>=4 && entry.angle<=6;
    out.strike = bOK && aOK;
    out.call = out.strike ? 'STRIKE' : bOK ? 'ANGLE' : entry.board<17.5 ? 'LIGHT' : 'HIGH';
  }
  if (r.breakpoint) { out.bpFeet = yToFeet(r.breakpoint.y); out.bpBoard = r.breakpoint.board; }
  return out;
}
function sensitivity(ball) {
  const g = id => +document.getElementById(id).value;
  const rel = g('release'), sp = g('speed'), rv = g('rev');
  const vars = [{speed:sp+0.5},{speed:sp-0.5},{rev:rv+20},{rev:rv-20},{release:rel+1},{release:rel-1}];
  return vars.filter(v => analyze(ball, v).strike).length + ' of ' + vars.length;
}
function coachLine(a) {
  const f1 = v => v.toFixed(1);
  if (a.call==='GUTTER') return 'In the gutter.';
  const b = f1(a.entryBoard);
  if (a.call==='STRIKE') return `Strike. ${b}, sweeping the 5.`;
  if (a.call==='ANGLE') return `On ${b}. The angle is missing the 5-pin. ${f1(a.angle)}\u00b0, need 4-6.`;
  const off = Math.abs(a.entryBoard-17.5), mv = Math.min(6, Math.max(1, Math.round(off))), far = off > 8 ? ' Way off. Reset the line.' : '';
  if (a.call==='LIGHT') return `Light. ${b}, ${f1(off)} boards short of 17.5. Move feet left ${mv} board${mv>1?'s':''} or go stronger.${far}`;
  return `High. ${b}, ${f1(off)} boards past 17.5. Move feet right ${mv} board${mv>1?'s':''} or go weaker.${far}`;
}
function drawLane() {
  const w=LW, h=LH;
  const dpr=Math.min(window.devicePixelRatio||1,3);
  if (canvas.width!==Math.round(LW*dpr)) { canvas.width=Math.round(LW*dpr); canvas.height=Math.round(LH*dpr); }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#1a4d35';
  ctx.fillRect(14, 24, w-28, h-58);
  ctx.strokeStyle='rgba(255,255,255,0.05)';
  ctx.font='6px sans-serif'; ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.textAlign='center';
  for (let i=1; i<=39; i++) {
    const x = boardToX(i, w);
    ctx.beginPath(); ctx.moveTo(x,24); ctx.lineTo(x,h-34); ctx.stroke();
    if (i%5===0) ctx.fillText(i, x, h-20);
  }
  const foulY = h - 34;
  const pxPerFt = (foulY - 68) / 60;
  const dotsY = foulY - (7.5 * pxPerFt);
  ctx.fillStyle = '#1a1a1a';
  for (let i=5; i<=35; i+=5) { const x = boardToX(i, w); ctx.beginPath(); ctx.arc(x, dotsY, 1.5, 0, Math.PI*2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '4px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('DOTS', 16, dotsY - 3);
  const arrowY = foulY - (15 * pxPerFt);
  [5,10,15,20,25,30,35].forEach(b=>{ const x = boardToX(b, w); ctx.fillStyle = b===20 ? '#DAAF37' : '#e74c3c'; ctx.beginPath(); ctx.moveTo(x, arrowY-3); ctx.lineTo(x-2.2, arrowY+2.2); ctx.lineTo(x+2.2, arrowY+2.2); ctx.closePath(); ctx.fill(); });
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '4px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('ARROWS', 16, arrowY - 4);
  const rangeY = foulY - (37 * pxPerFt);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 0.7;
  [10,15,20,25,30].forEach(b=>{ const x = boardToX(b, w); ctx.beginPath(); ctx.moveTo(x, rangeY); ctx.lineTo(x, rangeY + 8); ctx.stroke(); });
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '4px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('RANGE', 16, rangeY - 2);
  const footY = h - 10;
  ctx.fillStyle = '#0a0a0a';
  for (let i=5; i<=35; i+=5) { const x = boardToX(i, w); ctx.beginPath(); ctx.arc(x, footY, 1.6, 0, Math.PI*2); ctx.fill(); }
  ctx.strokeStyle='#fff'; ctx.lineWidth=1.4;
  ctx.beginPath(); ctx.moveTo(14,h-34); ctx.lineTo(w-14,h-34); ctx.stroke();
  const bakerY = foulY - (46 * pxPerFt);
  const bakerH = (4 * pxPerFt);
  const bakerX1 = boardToX(8, w);
  const bakerX2 = boardToX(5, w);
  ctx.fillStyle = 'rgba(218,175,55,0.2)';
  ctx.fillRect(bakerX1, bakerY, bakerX2 - bakerX1, bakerH);
  ctx.strokeStyle = 'rgba(218,175,55,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bakerX1, bakerY, bakerX2 - bakerX1, bakerH);
  ctx.fillStyle = '#DAAF37';
  ctx.font = '4.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BAKER', (bakerX1+bakerX2)/2, bakerY - 3);
  drawPins(w,h);
  const result = analyze(selectedBall);
  const pts = result.points, isStrike = result.strike;
  const relV = +document.getElementById('release').value, aimV = +document.getElementById('aim').value;
  // aim target marker at the arrows: 1 board per degree of aim, dashed line from the release
  const aimBoard = Math.max(1, Math.min(39, relV - aimV)), arrowYm = FOUL_Y - 15*PX_FT, relX = boardToX(relV, w);
  ctx.setLineDash([3,3]); ctx.strokeStyle='rgba(218,175,55,0.8)'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(relX, FOUL_Y-4); ctx.lineTo(boardToX(aimBoard,w), arrowYm); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle='#DAAF37'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(boardToX(aimBoard,w), arrowYm, 4, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle='#DAAF37'; ctx.beginPath(); ctx.arc(relX, FOUL_Y-4, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.strokeStyle = isStrike ? '#22c55e' : selectedBall.color; ctx.lineWidth = isStrike ? 3 : 2.2;
  if (isStrike) { ctx.shadowColor='#22c55e'; ctx.shadowBlur=6; }
  pts.forEach((p,i)=> i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y)); ctx.stroke(); ctx.shadowBlur=0;
  if (result.breakpoint) { ctx.fillStyle='#ff6b35'; ctx.beginPath(); ctx.arc(result.breakpoint.x, result.breakpoint.y, 3, 0, Math.PI*2); ctx.fill(); }
  if (pts.length) { const last=pts[pts.length-1]; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(last.x,last.y,4,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=isStrike?'#22c55e':selectedBall.color; ctx.lineWidth=1; ctx.stroke(); }
  const pocketCall = result.call, endBoard = result.entryBoard;
  window.lastResult = {points:pts, endBoard, pocketCall, strike:isStrike, angle:result.angle, startX:pts.length?pts[0].x:null, endX:pts.length?pts.at(-1).x:null};
  const mf = document.getElementById('missFeedback');
  const mfTxt = coachLine(result);
  mf.className='miss-feedback '+(isStrike?'strike':pocketCall==='LIGHT'?'light':pocketCall==='HIGH'?'high':pocketCall==='GUTTER'?'gutter':'angle');
  mf.textContent=mfTxt; mf.style.display=''; mf.dataset.call=pocketCall;
  const banner = document.getElementById('strikeBanner');
  banner.classList.toggle('show', isStrike); banner.textContent='STRIKE';
  const finish = document.getElementById('finish').value, pattern = document.getElementById('pattern').value;
  const f1 = v => v==null ? '\u2014' : v.toFixed(1);
  const hooked = result.bpBoard==null ? null : relV - result.bpBoard;
  const bpTxt = result.bpFeet==null ? '\u2014' : `${Math.round(result.bpFeet)} ft, board ${f1(result.bpBoard)}`;
  const r31 = result.bpBoard==null ? '' : ruleOf31(pattern, result.bpBoard).text;
  saveState();
  document.getElementById('infoPanel').innerHTML = `<strong>${selectedBall.brand} ${selectedBall.name}</strong> \u2014 Factory: ${selectedBall.finish||'\u2014'} \u2022 Finish: <strong>${finish==='factory'?'Factory':finish}</strong><br>Angle <strong>${f1(result.angle)}\u00b0</strong> \u2022 Breakpoint <strong>${bpTxt}</strong> \u2022 Entry <strong>${f1(endBoard)}</strong> \u2022 Hooked <strong>${hooked==null?'\u2014':Math.abs(hooked).toFixed(1)} boards</strong><br>${r31}<br>Half a mph, 20 rpm, or one board: <strong>${sensitivity(selectedBall)} still strike.</strong><br><span style="font-size:0.68rem;color:#94a3b8">Drag the lane: near the foul line sets release, up-lane sets aim at the arrows. Dots ~7.5ft \u2022 Arrows ~15ft \u2022 Range ~37ft \u2022 Baker Box boards 5-8 at 42-46ft</span>`;
}

/* ===== Drag to set (pointer events; touch-action:pan-y on the canvas: horizontal drag / tap sets the board, vertical swipe scrolls) ===== */
function setupDrag() {
  let mode = null;
  const pos = e => { const r = canvas.getBoundingClientRect(); return {x:(e.clientX-r.left)/r.width*LW, y:(e.clientY-r.top)/r.height*LH}; };
  const apply = e => {
    const p = pos(e);
    const board = xToBoard(Math.max(14, Math.min(LW-14, p.x)));
    if (mode==='release') setControl('release', Math.max(5, Math.min(30, Math.round(board))));
    else { const rel = +document.getElementById('release').value; setControl('aim', Math.max(-8, Math.min(8, Math.round((rel-board)*2)/2))); }
    scheduleDraw();
  };
  let startE = null, moved = false;
  canvas.addEventListener('pointerdown', e => {
    const p = pos(e); mode = (FOUL_Y - p.y) / PX_FT < 9 ? 'release' : 'aim'; startE = e; moved = false;
    if (e.pointerType === 'mouse') { try { canvas.setPointerCapture(e.pointerId); } catch(_) {} apply(e); e.preventDefault(); }
  });
  canvas.addEventListener('pointermove', e => {
    if (!mode) return;
    if (e.pointerType === 'mouse') { apply(e); return; }
    if (!moved && Math.abs(e.clientX - startE.clientX) > 3) { moved = true; try { canvas.setPointerCapture(e.pointerId); } catch(_) {} }
    if (moved) apply(e);   // touch: horizontal drag sets the board; vertical swipes scroll the page (touch-action:pan-y)
  });
  const end = e => { if (mode && e.type === 'pointerup' && e.pointerType !== 'mouse' && !moved) apply(e); mode = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('keydown', e => {
    const k = e.key; const r = +document.getElementById('release').value, a = +document.getElementById('aim').value;
    if (k==='ArrowLeft') setControl('release', Math.min(30, r+1)); else if (k==='ArrowRight') setControl('release', Math.max(5, r-1));
    else if (k==='ArrowUp') setControl('aim', Math.min(8, a+0.5)); else if (k==='ArrowDown') setControl('aim', Math.max(-8, a-0.5)); else return;
    e.preventDefault(); drawLane();
  });
}

/* ===== Persistence: Render API + localStorage mirror ===== */
const API_BASE = new URLSearchParams(location.search).get('api') || 'https://arsenal-pro-api.onrender.com';
const API_TIMEOUT = 8000, API_WRITE_TIMEOUT = 25000; // writes wait out a free-tier cold start; UI never blocks on them
const LS = { lines:'ap_lines', surface:'ap_surface', notes:'ap_notes', dels:'ap_dels' };
const mem = {}; let memMode = false;   // fallback when localStorage is blocked/full (private mode, quota)
const rawGet = k => { if (k in mem) return mem[k]; try { return localStorage.getItem(k); } catch(e) { memMode = true; return null; } };
const rawSet = (k, str) => { try { localStorage.setItem(k, str); delete mem[k]; } catch(e) { memMode = true; mem[k] = str; } };
const lsGet = k => { try { const v = JSON.parse(rawGet(k)); return Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : []; } catch(e) { return []; } };
const lsGetIds = k => { try { const v = JSON.parse(rawGet(k)); return Array.isArray(v) ? v.filter(Number.isInteger) : []; } catch(e) { return []; } };
const lsSet = (k,v) => rawSet(k, JSON.stringify(v));
let _dev=null;
function deviceId(){
  if(_dev) return _dev;
  _dev=rawGet('ap_device');
  if(!_dev || !/^[A-Za-z0-9_-]{8,64}$/.test(_dev)){
    const b=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():(Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2));
    _dev='d-'+b; rawSet('ap_device',_dev);
  }
  return _dev;
}
async function api(path, opts={}) {
  const ctl = new AbortController(); const t = setTimeout(()=>ctl.abort(), opts.method&&opts.method!=='GET'?API_WRITE_TIMEOUT:API_TIMEOUT);
  try {
    const r = await fetch(API_BASE+path, { ...opts, signal:ctl.signal, headers:Object.assign({'X-Device-Id':deviceId()},opts.body?{'Content-Type':'application/json'}:{}) });
    if (!r.ok) { const er=new Error('HTTP '+r.status); er.status=r.status; er.retryAfter=+r.headers.get('Retry-After')||0; throw er; }
    return await r.json();
  } finally { clearTimeout(t); }
}
function failStatus(e){ return e&&e.status===429?'Server busy. Saved on this phone, will retry.':e&&e.name==='AbortError'?'Server waking up. Saved on this phone, will retry.':'Offline (saved on this phone)'; }
let retryN=0, retryT=null;
function retryLater(e){ if(retryT||retryN>=4) return; const d=Math.max([15000,45000,120000,300000][retryN++], e&&e.retryAfter?e.retryAfter*1000+500:0); retryT=setTimeout(async()=>{ retryT=null; await syncLines(); await syncAlley(); },d); }
function setStatus(txt, cls) { const el=document.getElementById('saveStatus'); el.textContent=txt; el.className='status full '+(cls||''); }
const esc = t => String(t==null?'':t).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function setControl(id, v) { if (v===null||v===undefined) return; const el=document.getElementById(id); el.value=v; const lab=document.getElementById(id+'Val'); if (lab) lab.textContent = id==='oil'?(+el.value).toFixed(1):el.value; }
function currentLine(name) {
  const g = id => document.getElementById(id).value;
  return { ballId:selectedBall.id, name, release:+g('release'), aim:+g('aim'), speed:+g('speed'), rev:+g('rev'), oil:+g('oil'), finish:g('finish'), pattern:g('pattern'), note:g('lineNote').trim() };
}
function linesForBall() { return lsGet(LS.lines).filter(l=>l.ballId===selectedBall.id).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)); }
function renderSavedLines() {
  const box = document.getElementById('savedLines'); const ls = linesForBall();
  if (!ls.length) { box.innerHTML = '<div class="status">No saved lines yet.</div>'; return; }
  box.innerHTML = ls.map((l,i)=>`<div class="line-item"><button class="load" data-i="${i}">${esc(l.name)}<small>rel ${l.release} \u2022 aim ${l.aim} \u2022 ${esc(l.finish)} \u2022 ${esc(l.pattern)}${l.note?' \u2022 '+esc(l.note):''}${l.synced?'':' \u2022 on this phone'}</small></button><button class="del" data-i="${i}" aria-label="Delete line ${esc(l.name)}">\u2715</button></div>`).join('');
  box.querySelectorAll('.load').forEach(b=>b.onclick=()=>loadLine(ls[+b.dataset.i]));
  box.querySelectorAll('.del').forEach(b=>b.onclick=()=>deleteLine(ls[+b.dataset.i]));
}
function loadLine(l) {
  ['release','aim','speed','rev','oil'].forEach(k=>setControl(k,l[k]));
  setControl('finish',l.finish); setControl('pattern',l.pattern);
  document.getElementById('lineName').value = l.name; document.getElementById('lineNote').value = l.note||'';
  drawLane(); setStatus('Loaded "'+l.name+'"','ok');
}
async function pushLine(l) {
  const body = { ballId:l.ballId, name:l.name, release:l.release, aim:l.aim, speed:l.speed, rev:l.rev, oil:l.oil, finish:l.finish, pattern:l.pattern, note:l.note||'' };
  const r = await api('/api/lines', { method:'POST', body:JSON.stringify(body) });
  const all = lsGet(LS.lines); const m = all.find(x=>x.ballId===l.ballId && x.name===l.name);
  if (m) { m.synced = true; m.id = r.id; lsSet(LS.lines, all); }
}
async function saveLine() {
  const name = document.getElementById('lineName').value.trim();
  if (!name) { setStatus('Type a line name first','off'); document.getElementById('lineName').focus(); return; }
  const l = { ...currentLine(name), updatedAt:Date.now(), synced:false };
  const all = lsGet(LS.lines).filter(x=>!(x.ballId===l.ballId && x.name===l.name)); all.push(l); lsSet(LS.lines, all);
  renderSavedLines(); setStatus('Saving\u2026');
  try { await pushLine(l); setStatus(memMode?'Saved (browser storage blocked: kept until this tab closes)':'Saved','ok'); retryN=0; } catch(e) { setStatus(failStatus(e),'off'); retryLater(e); }
  renderSavedLines();
}
async function deleteLine(l) {
  lsSet(LS.lines, lsGet(LS.lines).filter(x=>!(x.ballId===l.ballId && x.name===l.name))); renderSavedLines();
  if (l.id) { try { await api('/api/lines/'+l.id, {method:'DELETE'}); setStatus('Deleted','ok'); } catch(e) { if(!(e&&e.status===404)){ const q=lsGetIds(LS.dels); q.push(l.id); lsSet(LS.dels,q.slice(-100)); retryLater(); } setStatus('Deleted here; will remove from server when online','off'); } }
}
async function flushDels(){ const q=lsGetIds(LS.dels); if(!q.length) return; const keep=[]; for(const id of q){ try { await api('/api/lines/'+id,{method:'DELETE'}); } catch(e){ if(!(e&&e.status===404)) keep.push(id); } } lsSet(LS.dels,keep); }
async function syncLines() {
  const ballId = selectedBall.id;
  try {
    await flushDels();
    const server = await api('/api/lines?ballId='+encodeURIComponent(ballId));
    const all = lsGet(LS.lines);
    server.forEach(s=>{
      const t = Date.parse(s.updatedAt)||0; const i = all.findIndex(x=>x.ballId===s.ballId && x.name===s.name);
      const rec = { ballId:s.ballId, name:s.name, release:s.release, aim:s.aim, speed:s.speed, rev:s.rev, oil:s.oil, finish:s.finish, pattern:s.pattern, note:s.note||'', updatedAt:t, synced:true, id:s.id };
      if (i<0) all.push(rec); else if (all[i].synced || t>=(all[i].updatedAt||0)) all[i]=rec;
    });
    lsSet(LS.lines, all);
    if (selectedBall.id===ballId) renderSavedLines();
    for (const l of all.filter(x=>x.ballId===ballId && !x.synced)) { try { await pushLine(l); } catch(e) { break; } }
    if (selectedBall.id===ballId) renderSavedLines();
    setStatus('Synced','ok'); retryN=0;
  } catch(e) { setStatus(failStatus(e),'off'); retryLater(e); }
}
/* surface log + pattern notes */
const today = () => { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
function renderAlleyLists() {
  const sl = lsGet(LS.surface).filter(x=>x.ballId===selectedBall.id).slice(-3).reverse();
  document.getElementById('surfaceList').innerHTML = sl.length ? sl.map(x=>`<li>${esc(x.date)} \u2014 ${esc(x.finish)}</li>`).join('') : '<li>No entries for this ball.</li>';
  const nl = lsGet(LS.notes).slice(-3).reverse();
  document.getElementById('noteList').innerHTML = nl.length ? nl.map(x=>`<li>Lane ${esc(x.lane)} \u2022 ${esc(x.oil)} \u2014 ${esc(x.adjustment)}</li>`).join('') : '<li>No notes yet.</li>';
}
async function logFinish() {
  const e = { ballId:selectedBall.id, date:today(), finish:document.getElementById('finish').value, synced:false };
  const all = lsGet(LS.surface); all.push(e); lsSet(LS.surface, all.slice(-200)); renderAlleyLists(); setStatus('Saving\u2026');
  try { await api('/api/surface-log', {method:'POST', body:JSON.stringify({ballId:e.ballId,date:e.date,finish:e.finish})}); e.synced=true; lsSet(LS.surface, lsGet(LS.surface).map(x=>x===e||(x.ballId===e.ballId&&x.date===e.date&&x.finish===e.finish&&x.synced===false)?Object.assign(x,{synced:true}):x)); setStatus('Saved','ok'); } catch(err) { setStatus(failStatus(err),'off'); retryLater(err); }
}
async function saveNote() {
  const e = { lane:document.getElementById('noteLane').value.trim(), oil:document.getElementById('noteOil').value.trim(), adjustment:document.getElementById('noteAdj').value.trim(), synced:false };
  if (!e.lane||!e.oil||!e.adjustment) { setStatus('Fill lane, oil and adjustment','off'); return; }
  const all = lsGet(LS.notes); all.push(e); lsSet(LS.notes, all.slice(-100)); renderAlleyLists();
  ['noteLane','noteOil','noteAdj'].forEach(id=>document.getElementById(id).value=''); setStatus('Saving\u2026');
  try { await api('/api/pattern-notes', {method:'POST', body:JSON.stringify({lane:e.lane,oil:e.oil,adjustment:e.adjustment})}); lsSet(LS.notes, lsGet(LS.notes).map(x=>(x.lane===e.lane&&x.oil===e.oil&&x.adjustment===e.adjustment&&x.synced===false)?Object.assign(x,{synced:true}):x)); setStatus('Saved','ok'); } catch(err) { setStatus(failStatus(err),'off'); retryLater(err); }
}
async function pushUnsyncedAlley(){
  for (const x of lsGet(LS.surface).filter(x=>x.synced===false)) { await api('/api/surface-log',{method:'POST',body:JSON.stringify({ballId:x.ballId,date:x.date,finish:x.finish})}); x.synced=true; const a=lsGet(LS.surface); const m=a.find(y=>y.synced===false&&y.ballId===x.ballId&&y.date===x.date&&y.finish===x.finish); if(m){m.synced=true; lsSet(LS.surface,a);} }
  for (const x of lsGet(LS.notes).filter(x=>x.synced===false)) { await api('/api/pattern-notes',{method:'POST',body:JSON.stringify({lane:x.lane,oil:x.oil,adjustment:x.adjustment})}); const a=lsGet(LS.notes); const m=a.find(y=>y.synced===false&&y.lane===x.lane&&y.oil===x.oil&&y.adjustment===x.adjustment); if(m){m.synced=true; lsSet(LS.notes,a);} }
}
async function syncAlley() {
  try {
    await pushUnsyncedAlley();
    const sv = await api('/api/surface-log?ballId='+encodeURIComponent(selectedBall.id));
    const all = lsGet(LS.surface);
    sv.forEach(s=>{ if (!all.some(x=>x.ballId===s.ballId && x.date===s.date && x.finish===s.finish)) all.push({ballId:s.ballId,date:s.date,finish:s.finish,synced:true}); });
    all.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0); lsSet(LS.surface, all.slice(-200));
    const nv = await api('/api/pattern-notes'); const notes = lsGet(LS.notes);
    nv.slice().reverse().forEach(n=>{ if (!notes.some(x=>x.lane===n.lane && x.oil===n.oil && x.adjustment===n.adjustment)) notes.unshift({lane:n.lane,oil:n.oil,adjustment:n.adjustment,synced:true}); });
    lsSet(LS.notes, notes.slice(-100)); renderAlleyLists();
  } catch(e) { retryLater(); }
}
function initPersistence() {
  document.getElementById('saveLine').onclick = saveLine;
  document.getElementById('logFinish').onclick = logFinish;
  document.getElementById('saveNote').onclick = saveNote;
  document.getElementById('deviceCode').value = deviceId();
  document.getElementById('copyCode').onclick = async () => { try { await navigator.clipboard.writeText(deviceId()); setStatus('Code copied','ok'); } catch(e) { document.getElementById('deviceCode').select(); setStatus('Select the code and copy it','off'); } };
  document.getElementById('dlBackup').onclick = () => {
    const data = { app:'arsenal-pro', code:deviceId(), exportedAt:new Date().toISOString(), lines:lsGet(LS.lines), surfaceLog:lsGet(LS.surface), patternNotes:lsGet(LS.notes) };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:'application/json'})); a.download = 'arsenal-pro-backup.json'; document.body.appendChild(a); a.click(); a.remove(); setStatus('Backup downloaded','ok');
  };
  document.getElementById('useCode').onclick = () => {
    const v = document.getElementById('restoreCode').value.trim();
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(v)) { setStatus('That is not a valid code','off'); return; }
    rawSet('ap_device', v);
    _dev = v; document.getElementById('deviceCode').value = v; document.getElementById('restoreCode').value = '';
    lsSet(LS.lines, lsGet(LS.lines).map(x=>Object.assign(x,{synced:false}))); setStatus('Code set. Syncing\u2026'); syncLines(); syncAlley();
  };
  renderSavedLines(); renderAlleyLists(); syncLines(); syncAlley();
  fetch(API_BASE+'/api/health',{cache:'no-store'}).catch(()=>{});
  if ('serviceWorker' in navigator && /^https:|^http:\/\/localhost/.test(location.protocol+'//'+location.host)) navigator.serviceWorker.register('sw.js').catch(()=>{});
  window.addEventListener('online', () => { syncLines(); syncAlley(); });
}
init();
