/* UI: форма, екрани, історія, роки. */
(function () {
  'use strict';
  var A = ASTRO, M = INTERP_META, R = READING, F = FORECAST, Y = YEAR, W = WHEEL, DB = CITYDB;

  var el = function (id) { return document.getElementById(id); };
  var MONTHS_UK = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var state = { chart: null, reading: null, birth: null, yearCache: {}, level: 0 };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------- час ---------- */

  function jdFromLocal(tz, y, mo, d, h, mi) {
    var r = TZ.localToUTC(tz, y, mo, d, h, mi);
    var dt = new Date(r.ms);
    return {
      jd: A.julianDay(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(),
        dt.getUTCHours(), dt.getUTCMinutes(), dt.getUTCSeconds()),
      offset: r.offset, ms: r.ms
    };
  }

  function jdToLocal(jd, tz) {
    var u = A.jdToDate(jd);
    var ms = Date.UTC(u.year, u.month - 1, u.day, u.hour, u.minute, u.second || 0);
    return TZ.utcToLocalParts(tz, ms);
  }

  function dateLabel(p) {
    return L(p.day + ' ' + MONTHS_UK[p.month - 1] + ' ' + p.year,
      MONTHS_EN[p.month - 1] + ' ' + p.day + ', ' + p.year);
  }
  function dateShort(p) { return String(p.day).padStart(2, '0') + '.' + String(p.month).padStart(2, '0') + '.' + p.year; }
  function timeLabel(p) { return String(p.hour).padStart(2, '0') + ':' + String(p.minute).padStart(2, '0'); }

  /* ---------- міста ---------- */

  var cities = DB.cities;
  function searchCities(q) {
    q = q.trim().toLowerCase();
    if (q.length < 2) return [];
    var i, c, starts = [], contains = [];
    for (i = 0; i < cities.length && starts.length < 40; i++) {
      c = cities[i];
      var n = c[0].toLowerCase(), u = c[1].toLowerCase();
      if (n.indexOf(q) === 0 || (u && u.indexOf(q) === 0)) starts.push(c);
      else if (contains.length < 40 && (n.indexOf(q) > 0 || (u && u.indexOf(q) > 0))) contains.push(c);
    }
    return starts.concat(contains).slice(0, 12);
  }

  function cityLabel(c) { return c[0] + (c[1] && c[1] !== c[0] ? ' · ' + c[1] : ''); }

  function initCityField() {
    var input = el('city'), box = el('suggest'), idx = -1, items = [];
    function close() { box.hidden = true; idx = -1; }
    function render(list) {
      items = list;
      if (!list.length) return close();
      box.innerHTML = list.map(function (c, i) {
        return '<div data-i="' + i + '" role="option">📍 ' + esc(cityLabel(c)) +
          ' <span class="cc">' + esc(DB.country[c[2]] || c[2]) + '</span></div>';
      }).join('');
      box.hidden = false;
    }
    function pick(c) {
      input.value = cityLabel(c);
      el('lat').value = c[3];
      el('lon').value = c[4];
      setTz(c[5]);
      close();
      updateCoordNote();
    }
    input.addEventListener('input', function () { render(searchCities(input.value)); });
    input.addEventListener('blur', function () {
      setTimeout(function () {
        // набрав місто й пішов далі, не клікнувши підказку — беремо перший точний збіг
        var q = input.value.trim().toLowerCase();
        if (q && !box.hidden) {
          var hit = items.filter(function (c) {
            return c[0].toLowerCase() === q || c[1].toLowerCase() === q || cityLabel(c).toLowerCase() === q;
          })[0] || (items.length === 1 ? items[0] : null);
          if (hit) return pick(hit);
        }
        close();
      }, 150);
    });
    input.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        Array.prototype.forEach.call(box.children, function (n, i) { n.setAttribute('aria-selected', i === idx); });
      } else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); pick(items[idx]); }
      else if (e.key === 'Escape') close();
    });
    box.addEventListener('mousedown', function (e) {
      var d = e.target.closest('[data-i]');
      if (d) pick(items[+d.dataset.i]);
    });
  }

  function setTz(tz) {
    var sel = el('tz');
    if (!Array.prototype.some.call(sel.options, function (o) { return o.value === tz; })) {
      sel.add(new Option(tz, tz));
    }
    sel.value = tz;
  }

  function initTz() {
    var sel = el('tz'), list = TZ.zoneList();
    if (!list) {
      var seen = {};
      list = cities.map(function (c) { return c[5]; }).filter(function (z) {
        if (seen[z]) return false; seen[z] = 1; return true;
      }).sort();
    }
    sel.innerHTML = list.map(function (z) { return '<option value="' + esc(z) + '">' + esc(z) + '</option>'; }).join('');
    setTz('Europe/Kyiv');   // у деяких рушіях у списку лише старий аліас Europe/Kiev
  }

  function updateCoordNote() {
    var d = el('date').value, t = el('unknown').value === 'yes' ? '12:00' : el('time').value;
    if (!d || !t) return;
    var dp = d.split('-').map(Number), tp = t.split(':').map(Number);
    var r = TZ.localToUTC(el('tz').value, dp[0], dp[1], dp[2], tp[0], tp[1]);
    el('coordnote').innerHTML = L('🕰️ Зсув пояса на цю дату: <b>', '🕰️ Zone offset on that date: <b>') + TZ.offsetLabel(r.offset) + '</b>' +
      (el('unknown').value === 'yes'
        ? L(' · <b>час невідомий</b> — доми й асцендент орієнтовні', ' · <b>time unknown</b> — houses and ascendant are approximate') : '');
  }

  /* ---------- побудова ---------- */

  function readForm() {
    var d = el('date').value, unknown = el('unknown').value === 'yes';
    var t = unknown ? '12:00' : el('time').value;
    if (!d || !t) return null;
    var dp = d.split('-').map(Number), tp = t.split(':').map(Number);
    var tz = el('tz').value;
    var j = jdFromLocal(tz, dp[0], dp[1], dp[2], tp[0], tp[1]);
    return {
      name: el('name').value.trim(), year: dp[0], month: dp[1], day: dp[2],
      hour: tp[0], minute: tp[1], tz: tz, tzOffset: j.offset, jd: j.jd,
      lat: parseFloat(el('lat').value), lon: parseFloat(el('lon').value),
      place: el('city').value.trim(), system: el('hsys').value,
      meanNode: el('nodetype').value === 'mean', unknownTime: unknown
    };
  }

  function build() {
    var b = readForm();
    if (!b || isNaN(b.lat) || isNaN(b.lon)) return;
    state.birth = b;
    state.yearCache = {};
    state.chart = A.buildChart(b.jd, b.lat, b.lon, b.system, { meanNode: b.meanNode });
    state.reading = R.build(state.chart);
    el('wheelbox').innerHTML = W.draw(state.chart, { size: 640 });
    renderFacts();
    renderStory();
    renderTable();
    initYears();
    renderLevels();
    updateCoordNote();
    try { localStorage.setItem('natal:last', JSON.stringify(b)); } catch (e) { /* приватний режим */ }
  }

  /* ---------- стікери фактів ---------- */

  function renderFacts() {
    var c = state.chart, rd = state.reading;
    var sun = M.signByIndex(c.bodies.sun.signIndex), moon = M.signByIndex(c.bodies.moon.signIndex);
    var asc = rd.angles.asc.sign;
    el('facts').innerHTML = '<span class="k">' + L('А це ти:', 'And this is you:') + '</span>' +
      '<span>☀️ ' + sun.emo + ' ' + sun.ua + '</span>' +
      '<span>🌙 ' + moon.emo + ' ' + moon.ua + '</span>' +
      '<span>🚪 ' + asc.emo + ' ' + asc.ua + '</span>';
  }
  function elEmo(k) { return { fire: '🔥', earth: '🪨', air: '💨', water: '💧' }[k]; }

  /* ---------- рівні: від спільного року до персональної глибини ---------- */

  function PHASES() {
    return L([['🌑', 'новий'], ['🌒', 'молодий серп'], ['🌓', 'перша чверть'], ['🌔', 'зростаючий'],
      ['🌕', 'повний'], ['🌖', 'спадний'], ['🌗', 'остання чверть'], ['🌘', 'старий серп']],
      [['🌑', 'new'], ['🌒', 'waxing crescent'], ['🌓', 'first quarter'], ['🌔', 'waxing gibbous'],
      ['🌕', 'full'], ['🌖', 'waning gibbous'], ['🌗', 'last quarter'], ['🌘', 'waning crescent']]);
  }
  var MAXLV = 4;

  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b === 1) return one;
    if (b >= 2 && b <= 4) return few;
    return many;
  }
  function daysLabel(n) { return n + ' ' + L(plural(n, 'день', 'дні', 'днів'), n === 1 ? 'day' : 'days'); }
  function yearsLabel(n) { return n + ' ' + L(plural(n, 'рік', 'роки', 'років'), n === 1 ? 'year' : 'years'); }
  function dShort(jd) { return dateShort(jdToLocal(jd, state.birth ? state.birth.tz : 'UTC')); }
  function dLong(jd) { return dateLabel(jdToLocal(jd, state.birth ? state.birth.tz : 'UTC')); }

  function nowJulian() {
    var d = new Date();
    return A.julianDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(),
      d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
  }

  function bar(pct) { return '<div class="prog"><span style="width:' + Math.round(pct * 100) + '%"></span></div>'; }

  /* --- рівень 0: рік, однаковий для всіх --- */

  /* --- диск років: два кільця, активне спереду й менше --- */

  function dialSeg(cx, cy, r1, r2, aStart, aEnd) {
    function p(r, a) { var t = a * Math.PI / 180; return [Math.round((cx + r * Math.cos(t)) * 10) / 10, Math.round((cy - r * Math.sin(t)) * 10) / 10]; }
    var big = (aStart - aEnd) > 180 ? 1 : 0;
    var A = p(r2, aStart), B = p(r2, aEnd), C = p(r1, aEnd), D = p(r1, aStart);
    return 'M' + A + 'A' + r2 + ' ' + r2 + ' 0 ' + big + ' 1 ' + B + 'L' + C +
      'A' + r1 + ' ' + r1 + ' 0 ' + big + ' 0 ' + D + 'Z';
  }

  function dialRing(kind, items, selected, r1, r2, size, front) {
    var cx = size / 2, cy = size / 2, span = 360 / items.length, out = [];
    items.forEach(function (it, i) {
      var a0 = 90 + span / 2 - i * span, a1 = a0 - span;
      var mid = a0 - span / 2, rm = (r1 + r2) / 2;
      var t = mid * Math.PI / 180;
      var x = cx + rm * Math.cos(t), y = cy - rm * Math.sin(t);
      out.push('<g class="dseg' + (i === selected ? ' sel' : '') + '" data-pick="' + kind + '" data-i="' + i + '">' +
        '<path d="' + dialSeg(cx, cy, r1, r2, a0, a1) + '"/>' +
        '<text x="' + Math.round(x * 10) / 10 + '" y="' + Math.round(y * 10) / 10 + '" style="font-size:' +
        (front ? size * 0.052 : size * 0.062) + 'px">' + it.emo + '</text></g>');
    });
    return '<g class="dring ' + (front ? 'front' : 'back') + '" data-ring="' + kind + '">' + out.join('') + '</g>';
  }

  function drawDial(sel, info) {
    var size = 460, cx = size / 2;
    var animalFront = sel.active === 'animal';
    var back = { r1: size * 0.345, r2: size * 0.468 };
    var front = { r1: size * 0.192, r2: size * 0.312 };
    var animals = Y.ANIMAL, elements = Y.ELEMENTS;

    var s = ['<svg viewBox="0 0 ' + size + ' ' + size + '" class="dial" role="group" aria-label="' + L('Вибір року', 'Year picker') + '">'];
    // заднє кільце малюється першим і воно більше — емодзі не налазять одне на одне
    if (animalFront) {
      s.push(dialRing('element', elements, sel.el, back.r1, back.r2, size, false));
      s.push(dialRing('animal', animals, sel.animal, front.r1, front.r2, size, true));
    } else {
      s.push(dialRing('animal', animals, sel.animal, back.r1, back.r2, size, false));
      s.push(dialRing('element', elements, sel.el, front.r1, front.r2, size, true));
    }
    s.push('<circle class="dhub" cx="' + cx + '" cy="' + cx + '" r="' + (size * 0.172) + '" data-swap="1"/>');
    s.push('<text class="dyear" x="' + cx + '" y="' + (cx - size * 0.052) + '">' + info.cycle.year + '</text>');
    s.push('<text class="dname" x="' + cx + '" y="' + (cx + size * 0.012) + '">' + info.cycle.name + '</text>');
    s.push('<text class="dhint" x="' + cx + '" y="' + (cx + size * 0.062) + '">' +
      (info.current ? L('цей рік', 'this year') : (info.cycle.year > new Date().getFullYear() ? L('попереду', 'ahead') : L('позаду', 'behind'))) + '</text>');
    s.push('</svg>');
    return s.join('');
  }

  function dialSelection() {
    if (!state.sel) {
      var ey = Y.easternYear(nowJulian());
      var i = ((ey.cycle.year - 1984) % 60 + 60) % 60;
      state.sel = { el: Math.floor((i % 10) / 2), animal: i % 12, active: 'animal' };
    }
    return state.sel;
  }

  function renderLevel0() {
    var jd = nowJulian();
    var sel = dialSelection();
    var year = Y.yearFor(sel.el, sel.animal, new Date().getFullYear());
    var info = Y.yearInfo(year, jd);
    var cur = info.cycle, nxt = info.next;
    var yStart = info.start, yEnd = info.end;

    el('lv0title').innerHTML = cur.animal.emo + ' ' + cur.name;

    var h = [];
    h.push('<div class="dialwrap"><div class="dialbox" id="dialbox">' + drawDial(sel, info) + '</div>' +
      '<div class="dialside">' +
      '<div class="k">' + L('Покрути колеса', 'Spin the wheels') + '</div>' +
      '<div class="picked"><span>' + Y.ELEMENTS[sel.el].emo + ' ' + Y.ELEMENTS[sel.el].ua + '</span>' +
      '<span>' + Y.ANIMAL[sel.animal].emo + ' ' + Y.ANIMAL[sel.animal].ua + '</span></div>' +
      '<p class="dialhint">' + L('Зовнішнє кільце — ' + (sel.active === 'animal' ? 'стихії' : 'тварини') +
        ', внутрішнє — ' + (sel.active === 'animal' ? 'тварини' : 'стихії') +
        '. Тицяй у будь-яке, щоб перескочити на інший рік; активне кільце виходить наперед.',
        'The outer ring is ' + (sel.active === 'animal' ? 'elements' : 'animals') +
        ', the inner one is ' + (sel.active === 'animal' ? 'animals' : 'elements') +
        '. Tap anything to jump to another year; the active ring comes to the front.') + '</p>' +
      '<div class="line"><b>' + dLong(yStart) + '</b> → <b>' + dLong(yEnd) + '</b></div>' +
      (info.current
        ? bar(info.pct) + '<div class="line">' + Math.round(info.pct * 100) + L('% позаду · лишилось ', '% done · ') + daysLabel(info.daysLeft) + L('', ' left') + '</div>'
        : '<div class="line dim">' + (info.daysLeft > 0
          ? L('почнеться через ' + daysLabel(Math.round(yStart - jd)), 'starts in ' + daysLabel(Math.round(yStart - jd)))
          : L('минув ' + yearsLabel(Math.abs(new Date().getFullYear() - year)) + ' тому',
            yearsLabel(Math.abs(new Date().getFullYear() - year)) + ' ago')) + '</div>') +
      (info.current ? '' : '<button type="button" class="ghost" data-today="1">' + L('⏰ повернутись у цей рік', '⏰ back to this year') + '</button>') +
      '</div></div>');

    h.push('<p>' + cur.animal.text + ' ' + cur.elText + '</p>');

    h.push('<div class="nextbeast"><div class="beast small">' + nxt.animal.emo + '<span class="el">' + nxt.stem.emo + '</span></div>' +
      '<div><div class="k">' + L('Далі, з ', 'Next, from ') + dLong(yEnd) + '</div><div class="big">' + nxt.name + '</div>' +
      '<p>' + nxt.animal.text + (nxt.el === cur.el ? '' : ' ' + nxt.elText) + '</p></div></div>');

    var sky = A.positions(jd);
    var sunS = M.signByIndex(A.signIndex(sky.sun.lon)), moonS = M.signByIndex(A.signIndex(sky.moon.lon));
    var ph = PHASES()[Math.floor((A.norm360(sky.moon.lon - sky.sun.lon) + 22.5) / 45) % 8];
    var retro = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].filter(function (k) {
      return A.norm180(A.positions(jd + 0.5)[k].lon - A.positions(jd - 0.5)[k].lon) < 0;
    });
    h.push('<h3 class="block">🌤️ ' + L('Небо просто зараз', 'The sky right now') + '</h3>');
    h.push('<div class="skyrow">' +
      '<span>☀️ ' + L('Сонце', 'Sun') + ' ' + sunS.emo + ' ' + sunS.ua + '</span>' +
      '<span>🌙 ' + L('Місяць', 'Moon') + ' ' + moonS.emo + ' ' + moonS.ua + ' ' + ph[0] + ' ' + ph[1] + '</span>' +
      '<span>℞ ' + (retro.length ? retro.map(function (k) { return M.PLANET[k].emo + ' ' + M.PLANET[k].ua; }).join(', ') : L('ніхто не ретро', 'nobody is retrograde')) + '</span>' +
      '</div>');

    var ev = yearEvents(year, yStart, yEnd);

    if (ev.eclipses.length) {
      h.push('<h3 class="block">🌑 ' + L('Затемнення року', 'Eclipses this year') + '</h3><div class="nowfeed">');
      ev.eclipses.forEach(function (e) {
        var sg = M.signByIndex(e.sign), d = Math.round(e.jd - jd);
        h.push('<div class="nowev ' + (d < 0 ? 'was' : 'soon') + '"><span class="when">' + whenLabel(d, info.current, e.jd) + '</span>' +
          '<span class="what">' + (e.kind === 'solar' ? L('🌚 Сонячне затемнення', '🌚 Solar eclipse') : L('🌝 Місячне затемнення', '🌝 Lunar eclipse')) + ' ' + sg.emo + ' ' + sg.ua +
          (e.deep ? L(' · глибоке', ' · deep') : '') + '</span><span class="date">' + dShort(e.jd) + '</span></div>');
      });
      h.push('</div>');
    }

    h.push('<h3 class="block">↩️ ' + L('Ретроградності року', 'Retrogrades this year') + '</h3><div class="nowfeed">');
    ev.retro.forEach(function (p) {
      var on = jd >= p.from && jd <= p.to;
      h.push('<div class="nowev ' + (on ? 'on' : (p.to < jd ? 'was' : 'soon')) + '">' +
        '<span class="when">' + (on ? L('⚡ триває', '⚡ ongoing') : whenLabel(Math.round(p.from - jd), info.current, p.from)) + '</span>' +
        '<span class="what">' + M.PLANET[p.body].emo + ' ' + M.PLANET[p.body].ua + L(' ретро</span>', ' retrograde</span>') +
        '<span class="date">' + dShort(p.from) + ' → ' + dShort(p.to) + '</span></div>');
    });
    h.push('</div>');

    if (ev.ingress.length) {
      h.push('<h3 class="block">🚪 ' + L('Повільні планети міняють знак', 'Slow planets change sign') + '</h3><div class="nowfeed">');
      ev.ingress.forEach(function (i) {
        var sg = M.signByIndex(i.sign), d = Math.round(i.jd - jd);
        h.push('<div class="nowev ' + (d < 0 ? 'was' : 'soon') + '"><span class="when">' + whenLabel(d, info.current, i.jd) + '</span>' +
          '<span class="what">' + M.PLANET[i.body].emo + ' ' + M.PLANET[i.body].ua + ' → ' + sg.emo + ' ' + sg.ua +
          (i.back ? L(' (ретро, ненадовго)', ' (retrograde, briefly)') : '') + '</span><span class="date">' + dShort(i.jd) + '</span></div>');
      });
      h.push('</div>');
    }

    el('lv0body').innerHTML = h.join('');
  }

  var MON3_UK = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
  var MON3_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function whenLabel(d, thisYear, jd) {
    // для чужого року «через N днів» безглузде — показуємо місяць
    if (!thisYear) { var p = jdToLocal(jd, state.birth ? state.birth.tz : 'UTC'); return L(MON3_UK, MON3_EN)[p.month - 1] + ' ' + p.year; }
    return d < 0 ? L(daysLabel(-d) + ' тому', daysLabel(-d) + ' ago') : L('через ' + daysLabel(d), 'in ' + daysLabel(d));
  }

  /* події східного року; рахунок важкий, тож кешуємо по року */
  var evCache = {};
  function yearEvents(year, from, to) {
    if (evCache[year]) return evCache[year];
    var retro = [];
    ['mercury', 'venus', 'mars'].forEach(function (k) {
      Y.retroPeriods(k, from, to).forEach(function (p) { p.body = k; retro.push(p); });
    });
    retro.sort(function (a, b) { return a.from - b.from; });
    evCache[year] = {
      eclipses: Y.eclipses(from, to),
      retro: retro,
      ingress: F.scanIngresses({ houses: { cusps: [] } }, from, to, F.SLOW)
        .filter(function (i) { return i.kind === 'sign'; })
    };
    return evCache[year];
  }

  /* --- рівень 1: особистий рік --- */

  function personalYear() {
    var b = state.birth, jd = nowJulian();
    var today = jdToLocal(jd, b.tz);
    var had = (today.month > b.month) || (today.month === b.month && today.day >= b.day);
    var age = today.year - b.year - (had ? 0 : 1);
    var startY = today.year - (had ? 0 : 1);
    var start = jdFromLocal(b.tz, startY, b.month, b.day, b.hour, b.minute).jd;
    var end = jdFromLocal(b.tz, startY + 1, b.month, b.day, b.hour, b.minute).jd;
    function house(a) { return ((a % 12) + 12) % 12 + 1; }
    return {
      jd: jd, age: age, start: start, end: end,
      pct: Math.max(0, Math.min(1, (jd - start) / (end - start))),
      left: Math.max(0, Math.round(end - jd)),
      house: house(age), nextHouse: house(age + 1)
    };
  }

  function renderLevel1() {
    var b = state.birth, c = state.chart, py = personalYear();
    state.py = py;
    var h = [];

    h.push('<div class="nowgrid">');
    h.push('<div class="nowbox stage"><div class="k">' + L('Етап зараз · ', 'Current stage · ') + yearsLabel(py.age) + '</div>' +
      '<div class="big">' + M.HOUSE[py.house].emo + ' ' + R.ROMAN[py.house] + ' — ' + M.HOUSE[py.house].title.toLowerCase() + '</div>' +
      bar(py.pct) +
      '<div class="line">' + Math.round(py.pct * 100) + L('% позаду · лишилось ' + daysLabel(py.left), '% done · ' + daysLabel(py.left) + ' left') + '</div>' +
      '<div class="line dim">' + F.PROFECTION[py.house] + '</div></div>');

    h.push('<div class="nowbox next"><div class="k">' + L('Наступний етап, з ', 'Next stage, from ') + dShort(py.end) + '</div>' +
      '<div class="big">' + M.HOUSE[py.nextHouse].emo + ' ' + R.ROMAN[py.nextHouse] + ' — ' + M.HOUSE[py.nextHouse].title.toLowerCase() + '</div>' +
      '<div class="line dim">' + F.PROFECTION[py.nextHouse] + '</div></div>');

    var sign = M.signByIndex(A.signIndex(c.houses.cusps[py.house]));
    var lord = c.bodies[sign.ruler];
    h.push('<div class="nowbox sky"><div class="k">' + L('Керівник року', 'Lord of the year') + '</div>' +
      '<div class="big">' + M.PLANET[sign.ruler].emo + ' ' + M.PLANET[sign.ruler].ua + '</div>' +
      '<div class="line">' + L('у наталі ', 'natally ') + M.signByIndex(lord.signIndex).inUa + ', ' +
      L(R.ROMAN[lord.house] + ' дім', M.HOUSE[lord.house].uaGen) + '</div>' +
      '<div class="line dim">' + L('Цей рік іде через те, за що відповідає ', 'This year runs through what ') +
      M.PLANET[sign.ruler].ua + L(': ', ' is responsible for: ') + M.PLANET[sign.ruler].noun + '.</div></div>');
    h.push('</div>');

    var sr = F.solarReturn(c.bodies.sun.lon, py.start);
    var srChart = A.buildChart(sr, b.lat, b.lon, b.system);
    var srAsc = M.signByIndex(A.signIndex(srChart.houses.asc));
    h.push('<div class="bubble yellow"><div class="hd"><span class="emo">🎉</span>' +
      '<span class="nm">' + L('Соляр', 'Solar return') + '</span><span class="ps">' + dLong(sr) + '</span></div>' +
      '<p>' + L('Сонце повернулось у натальний градус — це старт твого особистого року. Асцендент соляра ',
        'The Sun came back to its natal degree — that is the start of your personal year. The solar return ascendant is ') +
      srAsc.inUa + ' ' + srAsc.emo + ' (' + srAsc.keys.slice(0, 3).join(', ') + L('): такий тон у року. ', '): that is the tone of the year. ') +
      L('Сонце соляра стоїть у ' + R.ROMAN[srChart.bodies.sun.house] + ' домі — ',
        'The solar return Sun falls in ' + M.HOUSE[srChart.bodies.sun.house].uaGen + ' — ') +
      M.HOUSE[srChart.bodies.sun.house].area + '.</p></div>');

    state.yearTransits = F.scanTransits(c, py.start, py.end);
    var groups = F.groupTransits(state.yearTransits).sort(function (x, y) { return F.importance(y) - F.importance(x); });
    h.push('<h3 class="block">⚡ ' + L('Головне цього року', 'The big things this year') + '</h3><div class="nowfeed">');
    groups.slice(0, 8).forEach(function (g) {
      var next = g.hits.filter(function (t) { return t >= py.jd; })[0];
      var d = next ? Math.round(next - py.jd) : null;
      h.push('<div class="nowev ' + (d === null ? 'was' : (d <= 6 ? 'on' : 'soon')) + '">' +
        '<span class="when">' + (d === null ? L('вже було', 'already passed') : (d <= 6 ? L('⚡ точно зараз', '⚡ exact now') : L('через ' + daysLabel(d), 'in ' + daysLabel(d)))) + '</span>' +
        '<span class="what">' + M.PLANET[g.body].emo + ' ' + M.PLANET[g.body].ua + ' ' + M.ASPECT[g.aspect].emo + ' ' +
        M.PLANET[g.natal].emo + ' ' + M.PLANET[g.natal].ua + (g.natal === 'asc' || g.natal === 'mc' ? '' : L(' в наталі', ' natal')) + '</span>' +
        '<span class="date">' + g.hits.map(dShort).join(' · ') + '</span></div>');
    });
    if (!groups.length) h.push('<p class="dim">' + L('Цього року повільні планети не роблять точних аспектів до твоєї карти. Рік без зовнішнього тиску.',
      'This year the slow planets make no exact aspects to your chart. A year without outside pressure.') + '</p>');
    h.push('</div>');

    el('lv1body').innerHTML = h.join('');
  }

  /* --- рівень 2: місяці --- */

  function renderLevel2() {
    var py = state.py || personalYear();
    var ms = Y.months(state.chart, py.start, py.end, state.yearTransits || []);
    var h = ['<p class="dim">' + L('Особистий рік ділиться на дванадцять відрізків від дня народження. ' +
      'У кожному — свій молодик (що починати) і своя повня (що добігає кінця).',
      'The personal year splits into twelve stretches starting from your birthday. Each has its own new moon (what to start) ' +
      'and its own full moon (what is coming to an end).') + '</p>', '<div class="monthgrid">'];
    ms.forEach(function (m) {
      var now = py.jd >= m.from && py.jd < m.to;
      var nm = M.signByIndex(m.newMoon.sign), fm = M.signByIndex(m.fullMoon.sign);
      h.push('<div class="month' + (now ? ' now' : '') + (py.jd >= m.to ? ' past' : '') + '">' +
        '<div class="mhead"><span class="n">' + m.index + '</span>' +
        '<span class="range">' + dShort(m.from) + ' → ' + dShort(m.to) + '</span>' +
        (now ? '<span class="badge">' + L('зараз', 'now') + '</span>' : '') + '</div>' +
        '<div class="mline">🌑 ' + dShort(m.newMoon.jd) + ' ' + nm.emo + ' ' + nm.ua +
        ' · ' + L(R.ROMAN[m.newMoon.house] + ' дім', M.HOUSE[m.newMoon.house].uaGen) + ' — ' + M.HOUSE[m.newMoon.house].title.toLowerCase() + '</div>' +
        '<div class="mline">🌕 ' + dShort(m.fullMoon.jd) + ' ' + fm.emo + ' ' + fm.ua +
        ' · ' + L(R.ROMAN[m.fullMoon.house] + ' дім', M.HOUSE[m.fullMoon.house].uaGen) + '</div>' +
        (m.events.length
          ? '<div class="mev">' + m.events.map(function (e) {
            return M.PLANET[e.body].emo + ' ' + M.ASPECT[e.aspect].emo + ' ' + M.PLANET[e.natal].emo +
              ' <span class="d">' + dShort(e.jd) + '</span>';
          }).join('<br>') + '</div>'
          : '<div class="mev dim">' + L('без великих транзитів', 'no major transits') + '</div>') +
        '</div>');
    });
    h.push('</div>');
    el('lv2body').innerHTML = h.join('');
  }

  /* --- рівень 3: доми --- */

  function renderLevel3() {
    var c = state.chart, rd = state.reading;
    var h = ['<p class="dim">' + L('Дім — сфера життя. Знак на вході каже, яким стилем ти її проживаєш, керівник — через що вона реалізується.',
      'A house is an area of life. The sign on the door says in what style you live it, the ruler says what it runs through.') + '</p>', '<div class="housegrid">'];
    rd.houses.forEach(function (hb) {
      var ruler = c.bodies[hb.rulerKey];
      h.push('<div class="hcard' + (hb.inside.length ? ' full' : '') + '">' +
        '<div class="hhead"><span class="emo">' + M.HOUSE[hb.n].emo + '</span>' +
        '<span class="rn">' + hb.roman + '</span><span class="t">' + hb.title + '</span></div>' +
        '<div class="hline">' + hb.sign.emo + ' ' + hb.sign.ua + L(' на вході · керує ', ' on the door · ruled by ') +
        M.PLANET[hb.rulerKey].emo + ' ' + M.PLANET[hb.rulerKey].ua + L(' з ' + R.ROMAN[ruler.house] + ' дому', ' from ' + M.HOUSE[ruler.house].uaGen) + '</div>' +
        (hb.inside.length
          ? '<div class="hbodies">' + hb.inside.map(function (k) { return M.PLANET[k].emo + ' ' + M.PLANET[k].ua; }).join(' · ') + '</div>'
          : '<div class="hbodies dim">' + L('порожній — тема йде через керівника', 'empty — the theme runs through its ruler') + '</div>') +
        '</div>');
    });
    h.push('</div>');
    el('lv3body').innerHTML = h.join('');
  }

  /* --- рівень 4: все відкрито --- */

  function renderLevel4() {
    el('lv4body').innerHTML =
      '<p>' + L('Усе відкрито. Далі — повний розбір: планети по знаках і домах, аспекти, вузли, ' +
        'будь-який рік життя з точними датами й сира таблиця координат.',
        'Everything is unlocked. Ahead: the full reading — planets by sign and house, aspects, nodes, ' +
        'any year of your life with exact dates, and the raw coordinate table.') + '</p>' +
      '<div class="deeplinks">' +
      '<button type="button" class="cta" data-go="story">📖 ' + L('Моя історія', 'My story') + '</button>' +
      '<button type="button" class="ghost big" data-go="years">🗓️ ' + L('Будь-який рік', 'Any year') + '</button>' +
      '<button type="button" class="ghost big" data-go="table">🧮 ' + L('Таблиця', 'Table') + '</button></div>';
  }

  var RENDER = [renderLevel0, renderLevel1, renderLevel2, renderLevel3, renderLevel4];

  function renderLevels() {
    for (var i = 0; i <= state.level && i <= MAXLV; i++) {
      try { RENDER[i](); } catch (e) { console.error('рівень ' + i, e); }
    }
    syncLocks();
  }

  function syncLocks() {
    for (var i = 0; i <= MAXLV; i++) {
      el('lv' + i).classList.toggle('open', i <= state.level);
    }
    Array.prototype.forEach.call(el('nav').children, function (n) {
      var need = +(n.dataset.need || 0);
      n.classList.toggle('locked', state.level < need);
      n.disabled = state.level < need;
    });
  }

  function unlock(n) {
    if (n > state.level) {
      state.level = Math.min(n, MAXLV);
      try { localStorage.setItem('natal:level', String(state.level)); } catch (e) { /* приватний режим */ }
      RENDER[state.level]();
      syncLocks();
    }
    var node = el('lv' + n);
    if (node) setTimeout(function () { node.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
  }

  /* ---------- історія ---------- */

  function CHAPTER_LIST() {
    return [
      { id: 'who', emo: '👋', title: L('Хто ти взагалі', 'Who you even are'),
        hint: L('Три різні людини всередині тебе: ядро, почуття і те, що бачать перші п’ять секунд.',
          'Three different people inside you: the core, the feelings, and what the first five seconds show.') },
      { id: 'mix', emo: '🧬', title: L('З чого ти зроблений', 'What you are made of'),
        hint: L('Пропорції стихій і якостей — це твої налаштування за замовчуванням.',
          'The proportions of elements and modalities are your default settings.') },
      { id: 'planets', emo: '🪐', title: L('Твої планети', 'Your planets'),
        hint: L('Кожна відповідає за свою функцію. Знак каже «як», дім каже «де».',
          'Each one runs its own function. The sign says how, the house says where.') },
      { id: 'houses', emo: '🏠', title: L('12 кімнат твого життя', 'The 12 rooms of your life'),
        hint: L('Дім — це сфера. Знак на дверях, керівник показує, куди вона тебе веде.',
          'A house is an area. The sign is on the door, the ruler shows where it takes you.') },
      { id: 'aspects', emo: '⚡', title: L('Суперсили й тригери', 'Superpowers and triggers'),
        hint: L('Як твої планети між собою дружать. Або не дуже.',
          'How your planets get along. Or do not.') },
      { id: 'grow', emo: '🧭', title: L('Куди ростеш', 'Where you grow'),
        hint: L('Вузли, Хірон і Ліліт — найменш комфортна і найцікавіша частина карти.',
          'Nodes, Chiron and Lilith — the least comfortable and most interesting part of the chart.') }
    ];
  }
  var CHAPTERS = [];

  function renderStory() {
    CHAPTERS = CHAPTER_LIST();
    var b = state.birth, c = state.chart, rd = state.reading, s = rd.summary;
    var h = [];

    h.push('<div class="hero"><h1>' + (b.name ? esc(b.name) : L('Твоя карта', 'Your chart')) + ' ✦</h1>' +
      '<div class="who">' + dateLabel(b) + ', ' + timeLabel(b) + ' · ' + esc(b.place || '—') +
      ' · ' + TZ.offsetLabel(b.tzOffset) + '</div><div class="trio">' +
      '<span>☀️ ' + M.signByIndex(c.bodies.sun.signIndex).ua + '</span>' +
      '<span>🌙 ' + M.signByIndex(c.bodies.moon.signIndex).ua + '</span>' +
      '<span>🚪 ' + rd.angles.asc.sign.ua + '</span></div></div>');

    if (b.unknownTime) {
      h.push('<div class="note">⚠️ ' + L('Час народження невідомий, карта на полудень. Сонце й планети — ок, ' +
        'а от асцендент, доми й Місяць (до ±6°) читай як приблизні.',
        'Birth time unknown, the chart is cast for noon. Sun and planets are fine, but the ascendant, houses ' +
        'and Moon (up to ±6°) should be read as approximate.') + '</div>');
    }
    if (c.houses.fallback) {
      h.push('<div class="note">❄️ ' + L('На цій широті Плацидус не рахується (приполярна зона) — узято систему Порфирія.',
        'Placidus is undefined at this latitude (polar zone) — Porphyry is used instead.') + '</div>');
    }

    // 1. хто ти
    h.push(chapter('who'));
    s.part.core.forEach(function (l) { h.push('<p>' + l + '</p>'); });
    h.push(bubble('pink', '🚪', L('Асцендент ', 'Ascendant ') + rd.angles.asc.sign.ua, R.fmtDeg(rd.angles.asc.deg), '', [rd.angles.asc.text]));
    var mc = rd.angles.mc.sign;
    h.push(bubble('blue', '🏔️', L('Середина неба ', 'Midheaven ') + mc.ua, R.fmtDeg(rd.angles.mc.deg), '',
      [L('Публічна роль і покликання забарвлені знаком ' + mc.ua + ': ' + mc.keys.slice(0, 3).join(', ') +
        '. Саме цього світ очікує від тебе в професії. Стиль, яким відчиняються карʼєрні двері: ' + mc.style + '.',
        'Your public role and calling are coloured by ' + mc.ua + ': ' + mc.keys.slice(0, 3).join(', ') +
        '. That is what the world expects from you professionally. The style that opens career doors: ' + mc.style + '.')]));
    h.push('</section>');

    // 2. з чого зроблений
    h.push(chapter('mix'));
    h.push('<div class="bars">');
    s.balance.el.forEach(function (e) {
      h.push('<div class="bar"><span>' + elEmo(e.k) + ' ' + M.ELEMENT[e.k].ua + '</span><span class="track">' +
        '<span class="fill ' + e.k + '" style="width:' + Math.round(e.pct * 100) + '%"></span></span>' +
        '<span class="v">' + Math.round(e.pct * 100) + '%</span></div>');
    });
    h.push('</div><div class="bars">');
    s.balance.mod.forEach(function (e) {
      h.push('<div class="bar"><span>' + M.MODALITY[e.k].ua + '</span><span class="track">' +
        '<span class="fill" style="width:' + Math.round(e.v / s.balance.total * 100) + '%"></span></span>' +
        '<span class="v">' + Math.round(e.v / s.balance.total * 100) + '%</span></div>');
    });
    h.push('</div>');
    s.part.mix.forEach(function (l) { h.push('<p>' + l + '</p>'); });
    if (s.part.focus.length) {
      h.push(bubble('yellow', '🎯', L('На чому фокус карти', 'Where the chart focuses'), '', '', s.part.focus));
    }
    h.push('</section>');

    // 3. планети
    h.push(chapter('planets'));
    var GROW = ['node', 'chiron', 'lilith'];           // ці йдуть окремим розділом нижче
    rd.planets.filter(function (p) { return GROW.indexOf(p.key) < 0; }).forEach(function (p) {
      var sg = M.signByIndex(c.bodies[p.key].signIndex);
      var chips = p.aspects.slice(0, 6).map(function (a) {
        var other = a.a === p.key ? a.b : a.a;
        return '<span class="chip t-' + M.ASPECT[a.type].tone + '">' + M.ASPECT[a.type].emo + ' ' +
          M.PLANET[other].ua + '</span>';
      }).join('');
      h.push('<div class="anchor" id="p-' + p.key + '">' +
        bubble('', M.PLANET[p.key].emo, p.name + ' ' + sg.emo + ' ' + sg.ua + ' · ' + L(p.houseRoman + ' дім', M.HOUSE[p.house].uaGen),
          p.pos, p.fn, p.text, chips) + '</div>');
    });
    h.push('</section>');

    // 4. доми
    h.push(chapter('houses'));
    rd.houses.forEach(function (hb) {
      var extra = hb.bodyTexts.filter(function (t) { return t.text; }).map(function (bt) {
        return '<p><b>' + M.PLANET[bt.key].emo + ' ' + bt.name + ' ' + bt.pos + '</b><br>' + bt.text + '</p>';
      }).join('');
      h.push(bubble(hb.inside.length ? 'mint' : '', M.HOUSE[hb.n].emo, L(hb.roman, M.HOUSE[hb.n].ua) + ' · ' + hb.title,
        hb.cuspLabel, hb.theme, hb.text, '', extra));
    });
    h.push('</section>');

    // 5. аспекти
    h.push(chapter('aspects'));
    var flow = rd.aspects.filter(function (a) { return a.tone === 'flow' && a.asp.nature === 'major'; });
    var tension = rd.aspects.filter(function (a) { return a.tone === 'tension' && a.asp.nature === 'major'; });
    var merge = rd.aspects.filter(function (a) { return a.tone === 'merge'; });
    var rest = rd.aspects.filter(function (a) { return a.asp.nature !== 'major' && a.tone !== 'merge'; });
    h.push(aspectGroup('✨ ' + L('Що дається саме', 'What comes for free'), 'blue', flow));
    h.push(aspectGroup('💥 ' + L('Що тригерить і качає', 'What triggers and trains you'), 'pink', tension));
    h.push(aspectGroup('🔗 ' + L('Що злиплося в одне', 'What is fused together'), 'yellow', merge));
    h.push(aspectGroup('🌀 ' + L('Дрібний фоновий шум', 'Low background noise'), '', rest));
    h.push('</section>');

    // 6. куди ростеш
    h.push(chapter('grow'));
    GROW.forEach(function (k) {
      var p = rd.planets.filter(function (x) { return x.key === k; })[0];
      if (!p) return;
      var sg = M.signByIndex(c.bodies[k].signIndex);
      h.push('<div class="anchor" id="p-' + k + '">' +
        bubble(k === 'node' ? 'mint' : '', M.PLANET[k].emo, p.name + ' ' + sg.emo + ' ' + sg.ua + ' · ' + L(p.houseRoman + ' дім', M.HOUSE[p.house].uaGen),
          p.pos, p.fn, p.text) + '</div>');
    });
    var sn = c.bodies.southnode;
    h.push(bubble('', '🎒', M.PLANET.southnode.ua + ' ' + M.signByIndex(sn.signIndex).ua + ' · ' + L(R.ROMAN[sn.house] + ' дім', M.HOUSE[sn.house].uaGen),
      R.posLabel(sn), M.PLANET.southnode.fn,
      [L('Тут ти й так усе вмієш — це зона комфорту, в яку легко відкотитись, коли страшно. ' +
        'Протилежний бік (' + M.signByIndex(c.bodies.node.signIndex).ua + ', ' + R.ROMAN[c.bodies.node.house] +
        ' дім) — некомфортний, але саме там зростання.',
        'You already know how to do everything here — it is the comfort zone you roll back into when scared. ' +
        'The opposite side (' + M.signByIndex(c.bodies.node.signIndex).ua + ', ' + M.HOUSE[c.bodies.node.house].uaGen +
        ') is uncomfortable, and that is exactly where the growth is.')]));
    h.push('</section>');

    el('storybody').innerHTML = h.join('');
    el('chapnav').innerHTML = CHAPTERS.map(function (ch) {
      return '<li><a href="#ch-' + ch.id + '" data-ch="' + ch.id + '">' + ch.emo + ' ' + ch.title + '</a></li>';
    }).join('');
    watchChapters();
  }

  var chapObserver = null;
  function watchChapters() {
    if (chapObserver) chapObserver.disconnect();
    if (!window.IntersectionObserver) return;
    var links = {};
    Array.prototype.forEach.call(el('chapnav').querySelectorAll('[data-ch]'), function (a) { links[a.dataset.ch] = a; });
    // підсвічуємо розділ, який зараз у верхній третині екрана
    chapObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var a = links[e.target.id.replace('ch-', '')];
        if (a) a.setAttribute('aria-current', e.isIntersecting);
      });
    }, { rootMargin: '-90px 0px -62% 0px' });
    CHAPTERS.forEach(function (ch) {
      var node = document.getElementById('ch-' + ch.id);
      if (node) chapObserver.observe(node);
    });
  }

  function chapter(id) {
    var ch = CHAPTERS.filter(function (c) { return c.id === id; })[0];
    return '<section id="ch-' + ch.id + '"><h2>' + ch.emo + ' ' + ch.title + '</h2>' +
      '<p class="hint">' + ch.hint + '</p>';
  }

  function bubble(tone, emo, name, pos, fn, texts, chips, extra) {
    var h = '<div class="bubble' + (tone ? ' ' + tone : '') + '"><div class="hd">' +
      '<span class="emo">' + (emo || '✦') + '</span><span class="nm">' + name + '</span>' +
      (pos ? '<span class="ps">' + pos + '</span>' : '') + '</div>';
    if (fn) h += '<div class="fn">' + fn + '</div>';
    (texts || []).forEach(function (t) { h += '<p>' + t + '</p>'; });
    if (extra) h += extra;
    if (chips) h += '<div>' + chips + '</div>';
    return h + '</div>';
  }

  function aspectGroup(title, tone, list) {
    if (!list.length) return '';
    var h = '<h3 class="block">' + title + '</h3>';
    list.forEach(function (a) {
      h += bubble(tone, M.ASPECT[a.asp.type].emo, a.title, L('орб ', 'orb ') + a.orb.toFixed(1) + '°', '', [a.text]);
    });
    return h;
  }

  /* ---------- таблиця ---------- */

  function renderTable() {
    var c = state.chart, h = [];
    h.push('<h3 class="block">🧮 ' + L('Положення світил', 'Positions') + '</h3><table><thead><tr><th></th><th>' +
      L('Світило', 'Body') + '</th><th>' + L('Позиція', 'Position') + '</th><th>' + L('Дім', 'House') + '</th><th>' +
      L('Довгота', 'Longitude') + '</th><th>' + L('Швидкість', 'Speed') + '</th></tr></thead><tbody>');
    ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node', 'southnode', 'chiron', 'lilith'].forEach(function (k) {
      var b = c.bodies[k];
      h.push('<tr' + (b.retro ? ' class="retro"' : '') + '><td class="g">' + M.PLANET[k].emo + '</td><td>' + M.PLANET[k].ua +
        '</td><td>' + R.posLabel(b) + '</td><td class="num">' + R.ROMAN[b.house] + '</td><td class="num">' +
        b.lon.toFixed(3) + '°</td><td class="num">' + (b.speed === undefined ? '—' : b.speed.toFixed(3) + L('°/д', '°/d')) + '</td></tr>');
    });
    h.push('</tbody></table>');

    h.push('<h3 class="block">🏠 ' + L('Куспіди домів', 'House cusps') + '</h3>' +
      '<table><thead><tr><th>' + L('Дім', 'House') + '</th><th>' + L('Куспід', 'Cusp') + '</th><th>' +
      L('Знак', 'Sign') + '</th><th>' + L('Керівник', 'Ruler') + '</th></tr></thead><tbody>');
    for (var i = 1; i <= 12; i++) {
      var cu = c.houses.cusps[i], sg = M.signByIndex(A.signIndex(cu));
      h.push('<tr><td>' + M.HOUSE[i].emo + ' ' + R.ROMAN[i] + '</td><td class="num">' + R.fmtDeg(A.degInSign(cu)) + '</td><td>' +
        sg.emo + ' ' + sg.ua + '</td><td>' + M.PLANET[sg.ruler].emo + ' ' + M.PLANET[sg.ruler].ua + '</td></tr>');
    }
    h.push('</tbody></table>');
    el('tableroot').innerHTML = h.join('');
  }

  /* ---------- роки ---------- */

  function initYears() {
    var b = state.birth, now = new Date().getFullYear();
    var y = Math.max(b.year, Math.min(now, b.year + 100));
    el('yearsroot').innerHTML =
      '<div class="yearbar"><label for="yr">🗓️ ' + L('Рік', 'Year') + '</label>' +
      '<input type="number" id="yr" min="' + b.year + '" max="' + (b.year + 100) + '" value="' + y + '">' +
      '<button type="button" class="ghost" id="yprev">←</button>' +
      '<button type="button" class="ghost" id="ynext">→</button>' +
      '<span class="agebadge" id="agebadge"></span></div>' +
      '<div class="tl" id="tl"></div><div id="yearbody"></div>';

    var tl = el('tl'), rows = F.timeline(state.chart, b, b.year, b.year + 90);
    tl.innerHTML = rows.map(function (r) {
      return '<button type="button" data-y="' + r.year + '" title="' + L(r.age + ' р. · ' + r.roman + ' дім — ' + r.title,
        'age ' + r.age + ' · ' + M.HOUSE[r.house].uaGen + ' — ' + M.HOUSE[r.house].title) + '">' + r.year + '</button>';
    }).join('');
    tl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-y]');
      if (btn) { el('yr').value = btn.dataset.y; showYear(+btn.dataset.y); }
    });
    el('yr').addEventListener('change', function () { showYear(+this.value); });
    el('yprev').addEventListener('click', function () { el('yr').value = +el('yr').value - 1; showYear(+el('yr').value); });
    el('ynext').addEventListener('click', function () { el('yr').value = +el('yr').value + 1; showYear(+el('yr').value); });
    showYear(y);
  }

  function showYear(year) {
    var b = state.birth, body = el('yearbody');
    if (!state.yearCache[year]) {
      body.innerHTML = '<p class="dim">🔄 ' + L('Рахую транзити за ' + year + '…', 'Computing transits for ' + year + '…') + '</p>';
      return setTimeout(function () {                    // даємо браузеру перемалювати перед важким проходом
        state.yearCache[year] = F.yearReport(state.chart, b, year, { system: b.system });
        showYear(year);
      }, 16);
    }
    var rep = state.yearCache[year];
    Array.prototype.forEach.call(el('tl').children, function (n) {
      n.setAttribute('aria-current', +n.dataset.y === year);
    });
    el('agebadge').textContent = '🎂 ' + L(rep.age + ' р. · профекція у ' + rep.profection.roman + ' дім',
      'age ' + rep.age + ' · profection in ' + M.HOUSE[rep.profection.house].uaGen);

    var h = [], p = rep.profection;
    h.push(bubble('pink', M.HOUSE[p.house].emo, L('Рік: ', 'Year of ') + p.houseMeta.title.toLowerCase(),
      dateShort(jdToLocal(p.start, b.tz)) + ' → ' + dateShort(jdToLocal(p.end, b.tz)), '',
      [p.text,
        L('Куспід цього дому — ' + p.sign.ua + ', тож керівник року — <b>' + M.PLANET[p.lordKey].emo + ' ' +
          M.PLANET[p.lordKey].ua + '</b>, у натальній карті ' + M.signByIndex(p.lord.signIndex).inUa + ' у ' +
          R.ROMAN[p.lord.house] + ' домі. Цього року на перший план виходить те, за що відповідає ' +
          M.PLANET[p.lordKey].ua + ' — ' + M.PLANET[p.lordKey].noun + '. Сфера ' + R.ROMAN[p.lord.house] +
          ' дому (' + M.HOUSE[p.lord.house].area + ') буде постійним фоном.',
          'The cusp of this house is ' + p.sign.ua + ', so the lord of the year is <b>' + M.PLANET[p.lordKey].emo + ' ' +
          M.PLANET[p.lordKey].ua + '</b>, natally ' + M.signByIndex(p.lord.signIndex).inUa + ' in ' +
          M.HOUSE[p.lord.house].uaGen + '. This year brings forward what ' + M.PLANET[p.lordKey].ua +
          ' is responsible for — ' + M.PLANET[p.lordKey].noun + '. The area of ' + M.HOUSE[p.lord.house].uaGen +
          ' (' + M.HOUSE[p.lord.house].area + ') stays in the background all year.')
      ].concat(p.lordTransit ? [L('На початок року керівник транзитом іде ' + p.lordTransit.sign.inUa +
        ' через твій ' + R.ROMAN[p.lordTransit.house] + ' дім — там і шукай конкретні події.',
        'At the start of the year the lord transits ' + p.lordTransit.sign.inUa + ' through your ' +
        M.HOUSE[p.lordTransit.house].uaGen + ' — that is where to look for actual events.')] : [])));

    var srp = jdToLocal(rep.solarReturn.jd, b.tz), src = rep.solarReturn.chart;
    var srAsc = M.signByIndex(A.signIndex(src.houses.asc));
    h.push(bubble('yellow', '🎉', L('Соляр', 'Solar return'), dateLabel(srp) + ', ' + timeLabel(srp), '',
      [L('Сонце повертається в натальний градус — старт особистого року. Асцендент соляра ' + srAsc.inUa +
        ' (' + srAsc.keys.slice(0, 3).join(', ') + '): такий буде загальний тон. Сонце соляра потрапляє у ' +
        R.ROMAN[src.bodies.sun.house] + ' дім — ' + M.HOUSE[src.bodies.sun.house].area + '.',
        'The Sun returns to its natal degree — the start of the personal year. The solar return ascendant is ' + srAsc.inUa +
        ' (' + srAsc.keys.slice(0, 3).join(', ') + '): that sets the overall tone. Its Sun lands in ' +
        M.HOUSE[src.bodies.sun.house].uaGen + ' — ' + M.HOUSE[src.bodies.sun.house].area + '.')]));

    rep.returns.forEach(function (r) {
      var ds = r.jds.map(function (j) { return dateLabel(jdToLocal(j, b.tz)); });
      h.push(bubble('blue', '🔄', r.label, ds.join(' · '), '',
        [r.text + (ds.length > 1 ? L(' Через ретроградність точка проходиться кілька разів — подія розтягнута на весь проміжок.',
          ' Retrograde motion crosses the point several times — the event is stretched across the whole span.') : '')]));
    });

    var groups = F.groupTransits(rep.transits).sort(function (x, y) { return F.importance(y) - F.importance(x); });
    h.push('<h3 class="block">⚡ ' + L('Головні транзити ' + year, 'Main transits of ' + year) + '</h3>');
    if (!groups.length) {
      h.push('<p class="dim">' + L('Повільні планети цього року не роблять точних аспектів до натальних точок. ' +
        'Рік без зовнішнього тиску — все вирішують твої власні рухи.',
        'The slow planets make no exact aspects to natal points this year. A year without outside pressure — ' +
        'everything is decided by your own moves.') + '</p>');
    }
    groups.slice(0, 16).forEach(function (g) {
      var dates = g.hits.map(function (j) { return dateShort(jdToLocal(j, b.tz)); });
      h.push('<div class="ev"><div class="date">' + dates[0] +
        (dates.length > 1 ? '<small>' + dates.slice(1).join('<br>') + '</small>' : '') + '</div>' +
        '<div><div class="ttl">' + M.PLANET[g.body].emo + ' ' + M.PLANET[g.body].ua + ' ' +
        M.ASPECT[g.aspect].emo + ' ' + M.PLANET[g.natal].emo + ' ' +
        M.PLANET[g.natal].ua + (g.natal === 'asc' || g.natal === 'mc' ? '' : ' в наталі') + '</div>' +
        '<p>' + F.transitText(g) + '</p></div></div>');
    });
    if (groups.length > 16) h.push('<p class="dim">' + L('Ще ' + (groups.length - 16) + ' слабших аспектів не показано.',
      (groups.length - 16) + ' weaker aspects are not shown.') + '</p>');

    var signIng = rep.ingresses.filter(function (i) { return i.kind === 'sign'; });
    if (signIng.length) {
      h.push('<h3 class="block">🚪 ' + L('Зміни знаків', 'Sign changes') + '</h3>');
      signIng.forEach(function (i) {
        var d = jdToLocal(i.jd, b.tz), sg = M.signByIndex(i.sign);
        h.push('<div class="ev"><div class="date">' + dateShort(d) + '</div><div>' +
          '<div class="ttl">' + M.PLANET[i.body].emo + ' ' + M.PLANET[i.body].ua + ' → ' + sg.emo + ' ' + sg.ua +
          (i.back ? L(' (ретро)', ' (retrograde)') : '') + '</div>' +
          '<p>' + L('Нова багаторічна тема: ' + M.PLANET[i.body].ua + ' починає працювати через ' + sg.keys.slice(0, 3).join(', ') + '.',
            'A new multi-year theme: ' + M.PLANET[i.body].ua + ' starts working through ' + sg.keys.slice(0, 3).join(', ') + '.') +
          '</p></div></div>');
      });
    }

    body.innerHTML = h.join('');
  }

  /* ---------- екрани ---------- */

  var VIEWS = ['chart', 'story', 'years', 'table'];

  function showView(name) {
    if (VIEWS.indexOf(name) < 0) name = 'chart';
    var btn = el('nav').querySelector('[data-view="' + name + '"]');
    if (btn && state.level < +(btn.dataset.need || 0)) name = 'chart';   // ще не відкрито
    VIEWS.forEach(function (v) { el('view-' + v).classList.toggle('on', v === name); });
    Array.prototype.forEach.call(el('nav').children, function (n) {
      n.setAttribute('aria-current', n.dataset.view === name);
    });
    if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function initNav() {
    el('nav').addEventListener('click', function (e) {
      var b = e.target.closest('[data-view]');
      if (b) showView(b.dataset.view);
    });
    document.addEventListener('click', function (e) {
      var u = e.target.closest('.unlock');
      if (u) return unlock(+u.dataset.next);
      var g = e.target.closest('[data-go]');
      if (g) return showView(g.dataset.go);
    });
    document.addEventListener('click', function (e) {
      var seg = e.target.closest('[data-pick]');
      if (seg) {
        var sel = dialSelection(), kind = seg.dataset.pick;
        sel[kind === 'animal' ? 'animal' : 'el'] = +seg.dataset.i;
        sel.active = kind;
        return renderLevel0();
      }
      if (e.target.closest('[data-swap]')) {
        var sw = dialSelection();
        sw.active = sw.active === 'animal' ? 'element' : 'animal';
        return renderLevel0();
      }
      if (e.target.closest('[data-today]')) { state.sel = null; return renderLevel0(); }
    });
    el('wheelbox').addEventListener('click', function (e) {
      var g = e.target.closest('[data-body]');
      if (!g) return;
      showView('story');
      var node = el('p-' + g.dataset.body);
      if (node) node.scrollIntoView({ block: 'start' });
    });
    window.addEventListener('hashchange', function () { showView(location.hash.slice(1)); });
  }

  /* ---------- старт ---------- */

  function restore() {
    try { state.level = Math.min(MAXLV, +localStorage.getItem('natal:level') || 0); } catch (e) { /* приватний режим */ }
    try {
      var s = JSON.parse(localStorage.getItem('natal:last'));
      if (!s) return;
      el('name').value = s.name || '';
      el('date').value = s.year + '-' + String(s.month).padStart(2, '0') + '-' + String(s.day).padStart(2, '0');
      el('time').value = String(s.hour).padStart(2, '0') + ':' + String(s.minute).padStart(2, '0');
      el('lat').value = s.lat; el('lon').value = s.lon;
      el('city').value = s.place || '';
      el('hsys').value = s.system || 'placidus';
      el('unknown').value = s.unknownTime ? 'yes' : 'no';
      el('nodetype').value = s.meanNode ? 'mean' : 'true';
      setTz(s.tz);
    } catch (e) { /* немає збереженого */ }
  }

  /* ---------- банер збору ---------- */

  function fr() { return typeof FUNDRAISER !== 'undefined' && FUNDRAISER.on ? FUNDRAISER : null; }
  function frT() { var f = fr(); return f ? (f[LANGS.cur] || f.uk) : null; }

  function promoHidden() {
    try { return localStorage.getItem('natal:promo') === 'off'; } catch (e) { return false; }
  }

  function renderPromo() {
    var f = fr(), box = el('promo'), bar = el('promobar');
    if (!f) { box.hidden = true; bar.hidden = true; return; }
    var t = frT();

    if (f.dismissible && promoHidden()) {
      box.hidden = true; bar.hidden = true;
      renderPromoPin();
      return;
    }
    var pin = el('ppin'); if (pin) pin.remove();

    box.hidden = false;
    box.innerHTML =
      (f.image ? '<a class="pimg" href="' + esc(f.post || f.jar) + '" target="_blank" rel="noopener noreferrer">' +
        '<img src="' + esc(f.image) + '" alt="' + esc(t.title) + '" loading="eager"></a>' : '') +
      '<div class="ptext">' +
      '<div class="pkicker">' + esc(t.kicker) + ' · ' + esc(f.org) + '</div>' +
      '<div class="ptitle">' + esc(t.title) + '</div>' +
      '<div class="pwho">' + esc(t.who) + '</div>' +
      '<p class="plead">' + esc(t.lead) + '</p>' +
      '<div class="pgoal">' + esc(t.goalLabel) + ': <b>' + esc(f.goal) + '</b></div>' +
      '<div class="pacts">' +
      '<a class="pdonate" href="' + esc(f.jar) + '" target="_blank" rel="noopener noreferrer">💛 ' + esc(t.donate) + '</a>' +
      (f.post ? '<a class="ppost" href="' + esc(f.post) + '" target="_blank" rel="noopener noreferrer">↗ ' + esc(t.post) + '</a>' : '') +
      '</div></div>' +
      (f.dismissible ? '<button type="button" class="pclose" id="pclose" aria-label="' + esc(t.hide) + '">✕</button>' : '');

    bar.innerHTML =
      '<span class="bemo">💛</span><span class="btext">' + esc(t.bar) + '</span>' +
      '<a class="pdonate" href="' + esc(f.jar) + '" target="_blank" rel="noopener noreferrer">' + esc(t.donate) + '</a>';

    if (f.dismissible) {
      el('pclose').addEventListener('click', function () {
        try { localStorage.setItem('natal:promo', 'off'); } catch (e) { /* приватний режим */ }
        renderPromo();
      });
    }
    // картинка вантажиться асинхронно: поки її немає, банер нульової висоти
    var img = box.querySelector('img');
    if (img && !img.complete) img.addEventListener('load', watchPromo, { once: true });
    watchPromo();
  }

  /* смужка донату вилазить, щойно високий банер поїхав угору */
  var promoWatching = false;
  function watchPromo() {
    syncBar();
    if (promoWatching) return;
    promoWatching = true;
    // одне порівняння на скрол, без роботи в кадрі
    window.addEventListener('scroll', syncBar, { passive: true });
    window.addEventListener('resize', syncBar, { passive: true });
  }

  function syncBar() {
    var box = el('promo'), bar = el('promobar');
    if (!fr() || (FUNDRAISER.dismissible && promoHidden())) { bar.hidden = true; return; }
    var h = box.hidden ? 0 : box.offsetHeight;
    bar.hidden = window.scrollY < Math.max(40, h - 36);
  }

  function renderPromoPin() {
    if (el('ppin')) return;
    var b = document.createElement('button');
    b.id = 'ppin'; b.type = 'button'; b.className = 'ppin'; b.title = frT().show;
    b.textContent = '💛';
    b.addEventListener('click', function () {
      try { localStorage.removeItem('natal:promo'); } catch (e) { /* приватний режим */ }
      renderPromo();
    });
    el('nav').appendChild(b);
  }

  /* ---------- мова ---------- */

  var STATIC = [
    ['title', 'Натальна карта ✦ твоя історія', 'Natal chart ✦ your story'],
    ['#brandname', 'Натальна карта', 'Natal chart'],
    ['#brandtag', 'офлайн', 'offline'],
    ['[data-view="chart"]', '🪄 Карта', '🪄 Chart'],
    ['[data-view="story"]', '📖 Моя історія', '📖 My story'],
    ['[data-view="years"]', '🗓️ Роки', '🗓️ Years'],
    ['[data-view="table"]', '🧮 Таблиця', '🧮 Table'],
    ['#lv1 .lvhead h2', '🎂 Мій рік', '🎂 My year'],
    ['#lv2 .lvhead h2', '📆 Мої місяці', '📆 My months'],
    ['#lv3 .lvhead h2', '🏠 Мої сфери', '🏠 My areas'],
    ['#lv4 .lvhead h2', '🪐 Глибина', '🪐 Depth'],
    ['#lv0 .lvtag', 'спільне для всіх', 'the same for everyone'],
    ['#lv1 .lvtag', 'потрібні дата й місце народження', 'needs your birth date and place'],
    ['#lv2 .lvtag', 'рік зблизька', 'the year up close'],
    ['#lv3 .lvtag', '12 домів', '12 houses'],
    ['#lv4 .lvtag', 'усе решта відкрито', 'everything else unlocked'],
    ['#lv0 .unlock', 'Зрозуміло, далі: мій рік →', 'Got it — next: my year →'],
    ['#lv1 .unlock', 'Далі: розкласти рік по місяцях →', 'Next: break the year into months →'],
    ['#lv2 .unlock', 'Далі: сфери життя →', 'Next: areas of life →'],
    ['#lv3 .unlock', 'Далі: повна глибина →', 'Next: full depth →'],
    ['.form h2', '✏️ Хто ти і звідки', '✏️ Who you are and where from'],
    ['.wheelcard h2', '🌙 Твоє небо', '🌙 Your sky'],
    ['label[for="name"]', 'Імʼя', 'Name'],
    ['label[for="date"]', 'Дата народження', 'Birth date'],
    ['label[for="time"]', 'Час', 'Time'],
    ['label[for="unknown"]', 'Знаєш точний час?', 'Do you know the exact time?'],
    ['label[for="city"]', 'Місто народження', 'Birth city'],
    ['label[for="lat"]', 'Широта', 'Latitude'],
    ['label[for="lon"]', 'Довгота', 'Longitude'],
    ['label[for="tz"]', 'Часовий пояс', 'Time zone'],
    ['label[for="hsys"]', 'Система домів', 'House system'],
    ['label[for="nodetype"]', 'Вузол', 'Node'],
    ['button.primary', '✨ Побудувати', '✨ Build it'],
    ['#now', '⏰ Зараз', '⏰ Now'],
    ['.foot', '🛰️ Усе рахується прямо тут, у браузері: VSOP87D для планет, ELP/Meeus для Місяця, доми — з істинного ' +
      'зоряного часу. Звірено зі Swiss Ephemeris на 1850–2100: планети в межах 2′, куспіди домів — 0.1′. ' +
      'Хірон наближений (~0.3°). У мережу не йде нічого.',
      '🛰️ Everything is computed right here in the browser: VSOP87D for planets, ELP/Meeus for the Moon, houses from ' +
      'apparent sidereal time. Checked against Swiss Ephemeris over 1850–2100: planets within 2′, house cusps within 0.1′. ' +
      'Chiron is approximate (~0.3°). Nothing leaves your machine.']
  ];
  var OPTIONS = [
    ['#unknown', ['так, це точний час', 'нє, став полудень'], ['yes, it is exact', 'nope, use noon']],
    ['#hsys', ['Плацидус', 'Цілознакова', 'Рівнодомна', 'Порфирія'], ['Placidus', 'Whole sign', 'Equal', 'Porphyry']],
    ['#nodetype', ['істинний', 'середній'], ['true', 'mean']]
  ];

  function applyStatic() {
    STATIC.forEach(function (row) {
      var n = row[0] === 'title' ? document.querySelector('title') : document.querySelector(row[0]);
      if (n) n.textContent = L(row[1], row[2]);
    });
    OPTIONS.forEach(function (row) {
      var sel = document.querySelector(row[0]);
      if (!sel) return;
      var vals = L(row[1], row[2]);
      Array.prototype.forEach.call(sel.options, function (o, i) { if (vals[i]) o.textContent = vals[i]; });
    });
    el('name').placeholder = L('як тебе звати?', 'what should we call you?');
    el('city').placeholder = L('Київ, Lviv, Berlin…', 'Kyiv, Lviv, Berlin…');
    document.querySelectorAll('.legend span').forEach(function (n, i) {
      n.innerHTML = n.innerHTML.replace(/>[^<]*$/, '>' + L(['сполучення', 'напруга', 'підтримка'], ['conjunction', 'tension', 'support'])[i]);
    });
  }

  function setLang(lang) {
    I18N.apply(lang);
    Array.prototype.forEach.call(el('langsw').children, function (b) {
      b.setAttribute('aria-current', b.dataset.lang === lang);
    });
    applyStatic();
    renderPromo();
    if (state.chart) { state.yearCache = {}; build(); }
    else renderLevel0();
  }

  function initLang() {
    var saved = null;
    try { saved = localStorage.getItem('natal:lang'); } catch (e) { /* приватний режим */ }
    if (!saved) saved = 'uk';   // українська за замовчуванням, перемикач поруч
    el('langsw').addEventListener('click', function (e) {
      var b = e.target.closest('[data-lang]');
      if (b) setLang(b.dataset.lang);
    });
    I18N.apply(saved);
    Array.prototype.forEach.call(el('langsw').children, function (b) {
      b.setAttribute('aria-current', b.dataset.lang === saved);
    });
    applyStatic();
  }

  initTz();
  initCityField();
  initNav();
  initLang();
  renderPromo();
  restore();
  renderLevel0();   // рік спільний, не чекає на дані народження
  syncLocks();

  el('form').addEventListener('submit', function (e) { e.preventDefault(); build(); unlock(Math.max(1, state.level)); });
  ['date', 'time', 'tz', 'unknown'].forEach(function (id) {
    el(id).addEventListener('change', updateCoordNote);
  });
  el('now').addEventListener('click', function () {
    var d = new Date();
    el('date').value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    el('time').value = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    el('unknown').value = 'no';
    try { setTz(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch (err) { /* лишаємо як є */ }
    build();
  });

  build();
  if (location.hash) showView(location.hash.slice(1));
})();
