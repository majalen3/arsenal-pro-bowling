// Test helper: builds a small jsPDF-style PDF (Flate streams, Type0 font + ToUnicode CMap, `x y Td <hex> Tj`) from
// positioned text runs. Used to test the LaneTrax parser end-to-end without committing any real report.
import zlib from 'node:zlib';
export function buildPdf(words, { producer = 'jsPDF 3.0.4', compress = true } = {}) {
  const chars = [...new Set(words.flatMap(w => [...w.t]))]; const gid = new Map(chars.map((c, i) => [c, i + 3]));
  const hex = n => n.toString(16).padStart(4, '0').toUpperCase();
  const cmap = `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n${chars.length} beginbfchar\n${chars.map(c => `<${hex(gid.get(c))}> <${hex(c.charCodeAt(0))}>`).join('\n')}\nendbfchar\nendcmap\nend\nend`;
  const pages = [...new Set(words.map(w => w.p))].sort((a, b) => a - b);
  const objs = []; const add = s => { objs.push(s); return objs.length; };
  const stream = (body, extra = '') => { const data = compress ? zlib.deflateSync(Buffer.from(body, 'latin1')) : Buffer.from(body, 'latin1'); return { head: `<< /Length ${data.length}${compress ? ' /Filter /FlateDecode' : ''}${extra} >>\nstream\n`, data }; };
  const cm = add(stream(cmap)); const font = add(`<< /Type /Font /Subtype /Type0 /BaseFont /Inter /Encoding /Identity-H /ToUnicode ${cm} 0 R >>`);
  const res = add(`<< /Font << /F1 ${font} 0 R >> >>`);
  const kids = [];
  const pagesId = objs.length + 1 + pages.length * 2;
  for (const p of pages) {
    const body = 'BT\n' + words.filter(w => w.p === p).map(w => `/F1 10 Tf\n${w.x} ${w.y} Td\n<${[...w.t].map(c => hex(gid.get(c))).join('')}> Tj`).join('\n') + '\nET';
    const c = add(stream(body)); kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /Resources ${res} 0 R /Contents ${c} 0 R >>`));
  }
  add(`<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`);
  const cat = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`); const info = add(`<< /Producer (${producer}) >>`);
  const parts = [Buffer.from('%PDF-1.3\n%\xBA\xDF\xAC\xE0\n', 'latin1')]; const offs = []; let len = parts[0].length;
  objs.forEach((o, i) => { offs.push(len); const b = typeof o === 'string' ? Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, 'latin1') : Buffer.concat([Buffer.from(`${i + 1} 0 obj\n${o.head}`, 'latin1'), o.data, Buffer.from('\nendstream\nendobj\n', 'latin1')]); parts.push(b); len += b.length; });
  const xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R /Info ${info} 0 R >>\nstartxref\n${len}\n%%EOF\n`;
  parts.push(Buffer.from(xref, 'latin1')); return new Uint8Array(Buffer.concat(parts));
}
