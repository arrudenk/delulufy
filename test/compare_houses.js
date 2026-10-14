const A = require('../astro.js');
const ref = require('./ref_houses.json');

const worst = {};
function note(k, d, row, i) { if (!worst[k] || d > worst[k].d) worst[k] = { d, row, i }; }

for (const row of ref) {
  const pos = A.positions(row.jd);
  const eps = pos._meta.eps;
  for (const sys of ['placidus', 'porphyry', 'equal', 'whole']) {
    const h = A.houses(row.jd, row.lat, row.lon, sys, eps);
    if (h.fallback) continue;                      // приполярний відкат — Swiss рахує інакше
    for (let i = 1; i <= 12; i++) {
      const d = Math.abs(A.norm180(h.cusps[i] - row.sys[sys][i - 1])) * 60;
      if (!Number.isFinite(d)) { console.log(`FAIL ${sys} куспід ${i} = ${h.cusps[i]}`); process.exit(1); }
      note(sys, d, row, i);
    }
    if (sys === 'placidus') {
      note('asc', Math.abs(A.norm180(h.asc - row.asc)) * 60, row, 1);
      note('mc', Math.abs(A.norm180(h.mc - row.mc)) * 60, row, 10);
    }
  }
}
let fail = 0;
for (const [k, w] of Object.entries(worst)) {
  const ok = w.d <= 1.0;
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${k.padEnd(9)} макс. ${w.d.toFixed(3)}'  cusp${w.i} lat=${w.row.lat.toFixed(1)} lon=${w.row.lon.toFixed(1)} jd=${w.row.jd.toFixed(3)}`);
}
process.exit(fail ? 1 : 0);
