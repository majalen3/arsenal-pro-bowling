// Step 3 (tools/catalog/README.md). Writes final.json; copy its rows into tools/catalog/maker_rows.json.
// Hand-checked fixes read from the same maker sources (see notes). Applied after extract.js.
const fs=require('fs');const rows=JSON.parse(fs.readFileSync('rows.json','utf8'));
const by=(b,n)=>rows.find(r=>r.brand===b&&r.name===n);
for(const r of rows){
  if(r.brand==='KR Strikeforce'&&/^Polyester /.test(r.name)){ // page: product type "Bowling Polyester"; "This ball is made out of polyester"; colour in the Color options
    Object.assign(r,{coverType:'Polyester',derived:['coverType']}); }
  if(r.brand==='KR Strikeforce'&&/^Rise /.test(r.name)){ // page: Cover Type "Reactive Pearl / Reactive Solid"; Finish "Pearl - 2000 Abralon / Polish | Solid - 2000 Abralon"; colour option names end Pearl or Solid
    const solid=/Solid$/.test(r.name); Object.assign(r,{coverstock:'Thrust',core:'Launch',coverType:solid?'Solid':'Pearl',finish:solid?'2000 Abralon':'2000 Abralon / Polish',derived:['coverType','finish']}); }
}
const t=by('Storm','Tropical Surge Black Blue Pink'); // product page prints no spec table; its Tech Data sheet (linked from the page) does
Object.assign(t,{source:'https://stormproducts.nyc3.cdn.digitaloceanspaces.com/product_pages/Balls/Storm/Tropical_Surge/Tropical%20Surge%20Black-Blue-Pink%20Tech%20Data%20Final.pdf',
  page:'https://www.stormbowling.com/storm-tropical-surge-bowling-ball-black-blue-pink',coverstock:'Reactor Solid Reactive',coverType:'Solid',derived:['coverType'],core:'Surge Core',finish:'1500-grit Polished',weight:15,rg:2.58,diff:0.024});
for(const r of rows){delete r.title; delete r.why; if(r.derived&&!r.derived.length)delete r.derived;}
fs.writeFileSync('final.json',JSON.stringify(rows,null,1));
const c={};for(const r of rows)c[r.specStatus]=(c[r.specStatus]||0)+1;console.log(rows.length,c, 'withRG', rows.filter(r=>r.rg!=null).length);
