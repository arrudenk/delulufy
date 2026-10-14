const A = require('../astro.js');
const ref = require('./ref_bodies.json');

const LIMIT = {
  sun: 1, moon: 1.5, mercury: 2, venus: 2, mars: 2, jupiter: 2, saturn: 2,
  uranus: 2, neptune: 2, pluto: 3, node: 3, meannode: 0.5, lilith: 10
};
const worst = {};
for (const row of ref) {
  const p = A.positions(row.jd);
  const pm = A.positions(row.jd, { meanNode: true });
  for (const [name, v] of Object.entries(row.b)) {
    const got = name === 'meannode' ? pm.node.lon : p[name].lon;
    const d = Math.abs(A.norm180(got - v.lon)) * 60;
    if (!worst[name] || d > worst[name].d) worst[name] = { d, date: row.jd, got, exp: v.lon };
  }
}
let fail = 0;
for (const [name, w] of Object.entries(worst)) {
  const ok = w.d <= LIMIT[name];
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(9)} макс. ${w.d.toFixed(2)}' (ліміт ${LIMIT[name]}')  jd=${w.date.toFixed(2)} got=${w.got.toFixed(4)} exp=${w.exp.toFixed(4)}`);
}
process.exit(fail ? 1 : 0);
