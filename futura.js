/* «Футура мініма»: відома людина з тієї ж місцевості, чия карта найсхожіша на твою.
   Час народження в біографіях майже ніколи не вказаний, тож рахуємо на полудень
   і порівнюємо лише знаки світил — не доми. */
(function (root) {
  'use strict';
  var A = root.ASTRO;

  var BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  var W = { sun: 3, moon: 2, mercury: 1.5, venus: 2, mars: 2, jupiter: 1.2, saturn: 1.2, uranus: 0.5, neptune: 0.5, pluto: 0.5 };
  var WSUM = BODIES.reduce(function (s, k) { return s + W[k]; }, 0);

  var sigCache = {};

  function signature(dateStr) {
    if (sigCache[dateStr]) return sigCache[dateStr];
    var p = dateStr.split('-').map(Number);
    var pos = A.positions(A.julianDay(p[0], p[1], p[2], 12, 0, 0));
    var s = {};
    BODIES.forEach(function (k) { s[k] = pos[k].lon; });
    sigCache[dateStr] = s;
    return s;
  }

  function score(mine, theirs) {
    var total = 0, same = [];
    BODIES.forEach(function (k) {
      var d = A.norm180(mine[k] - theirs[k]);
      total += W[k] * (1 + Math.cos(d * Math.PI / 180)) / 2;
      if (A.signIndex(mine[k]) === A.signIndex(theirs[k])) same.push(k);
    });
    return { value: total / WSUM, same: same };
  }

  // відстань по поверхні, км
  function distance(la1, lo1, la2, lo2) {
    var R = 6371, d = Math.PI / 180;
    var dla = (la2 - la1) * d, dlo = (lo2 - lo1) * d;
    var a = Math.sin(dla / 2) * Math.sin(dla / 2) +
      Math.cos(la1 * d) * Math.cos(la2 * d) * Math.sin(dlo / 2) * Math.sin(dlo / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  /* birth: { jd, lat, lon, cc } — cc необовʼязковий */
  function find(birth, people) {
    people = people || root.PEOPLE;
    var pos = A.positions(birth.jd), mine = {};
    BODIES.forEach(function (k) { mine[k] = pos[k].lon; });

    var scored = people.map(function (p, i) {
      var s = score(mine, signature(p[2]));
      return {
        i: i, person: p, value: s.value, same: s.same,
        km: distance(birth.lat, birth.lon, p[5], p[6]),
        cc: p[7]
      };
    });

    function best(list) {
      return list.length ? list.slice().sort(function (a, b) { return b.value - a.value; })[0] : null;
    }
    // спершу шукаємо земляка, потім співвітчизника, потім будь-кого
    var city = best(scored.filter(function (x) { return x.km <= 80; }));
    var country = best(scored.filter(function (x) { return birth.cc && x.cc === birth.cc; }));
    var any = best(scored);

    var pick = city || country || any;
    pick.scope = city ? 'city' : (country ? 'country' : 'world');
    pick.runnerUps = scored
      .filter(function (x) { return x !== pick; })
      .sort(function (a, b) { return b.value - a.value; })
      .slice(0, 3);
    return pick;
  }

  var API = { find: find, signature: signature, BODIES: BODIES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.FUTURA = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
