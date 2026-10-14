/* Малювання колеса карти в SVG. Рядок будується один раз на карту — у рантаймі нічого не перераховується. */
(function (root) {
  'use strict';
  var A = root.ASTRO, M = root.INTERP_META;

  var GLYPH = {
    sun: '☉︎', moon: '☽︎', mercury: '☿︎', venus: '♀︎', mars: '♂︎', jupiter: '♃︎', saturn: '♄︎',
    uranus: '♅︎', neptune: '♆︎', pluto: '♇︎', node: '☊︎', southnode: '☋︎', lilith: '⚸︎', chiron: '⚷︎'
  };
  var ELEMENT_EMO = { fire: '🔥', earth: '🪨', air: '💨', water: '💧' };
  var SHOW = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node', 'chiron', 'lilith'];
  var TONE_CLASS = { merge: 'a-merge', tension: 'a-tension', flow: 'a-flow', odd: 'a-odd' };

  function pt(cx, cy, r, deg) {
    var a = deg * Math.PI / 180;
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  }
  function f(n) { return Math.round(n * 100) / 100; }

  function draw(chart, opts) {
    opts = opts || {};
    var size = opts.size || 620, cx = size / 2, cy = size / 2;
    var asc = chart.houses.asc;
    // екранний кут: асцендент ліворуч, довгота зростає проти годинникової
    function ang(lon) { return A.norm360(lon - asc) + 180; }

    var R = {
      outer: size * 0.485, tick: size * 0.455, zodiac: size * 0.40,
      houseRing: size * 0.325, planet: size * 0.365, hnum: size * 0.295, inner: size * 0.275
    };
    var s = [];
    s.push('<svg viewBox="0 0 ' + size + ' ' + size + '" class="wheel" role="img" aria-label="Натальна карта">');
    s.push('<defs><radialGradient id="wg" cx="50%" cy="50%" r="50%">' +
      '<stop offset="60%" stop-color="#10192b"/><stop offset="100%" stop-color="#0b1220"/></radialGradient></defs>');
    s.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + f(R.outer) + '" fill="url(#wg)"/>');

    // градусні поділки
    var ticks = [];
    for (var d = 0; d < 360; d++) {
      var long = d, a0 = ang(long);
      var len = (d % 10 === 0) ? size * 0.022 : (d % 5 === 0 ? size * 0.014 : size * 0.007);
      var p1 = pt(cx, cy, R.tick, a0), p2 = pt(cx, cy, R.tick - len, a0);
      ticks.push('M' + f(p1[0]) + ' ' + f(p1[1]) + 'L' + f(p2[0]) + ' ' + f(p2[1]));
    }
    s.push('<path class="w-tick" d="' + ticks.join('') + '"/>');

    s.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + f(R.outer) + '" class="w-ring"/>');
    s.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + f(R.zodiac) + '" class="w-ring"/>');
    s.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + f(R.houseRing) + '" class="w-ring"/>');
    s.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + f(R.inner) + '" class="w-ring w-ring-soft"/>');

    // сектори знаків
    var seps = [];
    for (var i = 0; i < 12; i++) {
      var a = ang(i * 30);
      var q1 = pt(cx, cy, R.zodiac, a), q2 = pt(cx, cy, R.outer, a);
      seps.push('M' + f(q1[0]) + ' ' + f(q1[1]) + 'L' + f(q2[0]) + ' ' + f(q2[1]));
      var sg = M.SIGN[i];
      // знак — емодзі у смузі зодіаку, стихія — дрібним емодзі під ним
      var g = pt(cx, cy, (R.zodiac + R.outer) / 2 + size * 0.012, ang(i * 30 + 15));
      var ge = pt(cx, cy, (R.zodiac + R.outer) / 2 - size * 0.019, ang(i * 30 + 15));
      s.push('<text x="' + f(g[0]) + '" y="' + f(g[1]) + '" class="w-sign">' + sg.emo + '</text>');
      s.push('<text x="' + f(ge[0]) + '" y="' + f(ge[1]) + '" class="w-el">' + ELEMENT_EMO[sg.el] + '</text>');
    }
    s.push('<path class="w-ring" d="' + seps.join('') + '"/>');

    // куспіди домів
    var cuspPaths = [], angPaths = [];
    for (i = 1; i <= 12; i++) {
      var ca = ang(chart.houses.cusps[i]);
      var c1 = pt(cx, cy, R.inner, ca), c2 = pt(cx, cy, R.zodiac, ca);
      var isAngle = (i === 1 || i === 4 || i === 7 || i === 10);
      var seg = 'M' + f(c1[0]) + ' ' + f(c1[1]) + 'L' + f(c2[0]) + ' ' + f(c2[1]);
      (isAngle ? angPaths : cuspPaths).push(seg);
      // номер дому — посередині сектора
      var next = chart.houses.cusps[i === 12 ? 1 : i + 1];
      var span = A.norm360(next - chart.houses.cusps[i]) || 30;
      var mid = ang(chart.houses.cusps[i] + span / 2);
      var mp = pt(cx, cy, R.hnum, mid);
      s.push('<text x="' + f(mp[0]) + '" y="' + f(mp[1]) + '" class="w-hnum">' + i + '</text>');
    }
    s.push('<path class="w-cusp" d="' + cuspPaths.join('') + '"/>');
    s.push('<path class="w-angle" d="' + angPaths.join('') + '"/>');

    // підписи кутів
    [['ASC', chart.houses.asc], ['MC', chart.houses.mc], ['DSC', A.norm360(chart.houses.asc + 180)], ['IC', A.norm360(chart.houses.mc + 180)]].forEach(function (p) {
      var lp = pt(cx, cy, R.outer - size * 0.045, ang(p[1]));
      s.push('<text x="' + f(lp[0]) + '" y="' + f(lp[1]) + '" class="w-anglelabel">' + p[0] + '</text>');
    });

    // аспекти
    var lines = { merge: [], tension: [], flow: [], odd: [] };
    chart.aspects.forEach(function (asp) {
      if (asp.nature !== 'major') return;
      if (SHOW.indexOf(asp.a) < 0 && asp.a !== 'asc' && asp.a !== 'mc') return;
      if (SHOW.indexOf(asp.b) < 0 && asp.b !== 'asc' && asp.b !== 'mc') return;
      var la = chart.points[asp.a], lb = chart.points[asp.b];
      var p1 = pt(cx, cy, R.inner, ang(la)), p2 = pt(cx, cy, R.inner, ang(lb));
      var tone = M.ASPECT[asp.type].tone;
      lines[tone].push('M' + f(p1[0]) + ' ' + f(p1[1]) + 'L' + f(p2[0]) + ' ' + f(p2[1]));
    });
    Object.keys(lines).forEach(function (k) {
      if (lines[k].length) s.push('<path class="w-asp ' + TONE_CLASS[k] + '" d="' + lines[k].join('') + '"/>');
    });

    // планети з розведенням накладань
    var items = SHOW.map(function (k) {
      return { key: k, lon: chart.bodies[k].lon, a: ang(chart.bodies[k].lon), retro: chart.bodies[k].retro, deg: chart.bodies[k].deg };
    }).sort(function (x, y) { return x.a - y.a; });

    var MINSEP = 360 / size * 26;
    for (var pass = 0; pass < 24; pass++) {
      var moved = false;
      for (i = 0; i < items.length; i++) {
        var j = (i + 1) % items.length;
        var gap = A.norm360(items[j].a - items[i].a);
        if (gap < MINSEP) {
          var push = (MINSEP - gap) / 2;
          items[i].a = A.norm360(items[i].a - push);
          items[j].a = A.norm360(items[j].a + push);
          moved = true;
        }
      }
      if (!moved) break;
    }

    items.forEach(function (it) {
      var pp = pt(cx, cy, R.planet, it.a);
      var tp = pt(cx, cy, R.inner + size * 0.012, ang(it.lon));
      var mark = pt(cx, cy, R.inner, ang(it.lon));
      s.push('<path class="w-stem" d="M' + f(mark[0]) + ' ' + f(mark[1]) + 'L' + f(tp[0]) + ' ' + f(tp[1]) + '"/>');
      s.push('<g class="w-planet" data-body="' + it.key + '">' +
        '<text x="' + f(pp[0]) + '" y="' + f(pp[1]) + '" class="w-glyph">' + GLYPH[it.key] + '</text>' +
        '<text x="' + f(pp[0]) + '" y="' + f(pp[1] + size * 0.028) + '" class="w-deg">' +
        Math.floor(it.deg) + (it.retro ? '℞' : '') + '</text></g>');
    });

    s.push('</svg>');
    return s.join('');
  }

  var API = { draw: draw, GLYPH: GLYPH };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.WHEEL = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
