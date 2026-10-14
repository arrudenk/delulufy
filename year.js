/* Рік: східний календар, затемнення, ретроградності, місяці. Усе з тих самих ефемерид. */
(function (root) {
  'use strict';
  var A = root.ASTRO, M = root.INTERP_META;

  /* ---------- східний рік ---------- */

  var STEM = [
    { m: 'Деревʼяний', f: 'Деревʼяна', el: 'wood', emo: '🌳', yang: true },
    { m: 'Деревʼяний', f: 'Деревʼяна', el: 'wood', emo: '🌳', yang: false },
    { m: 'Вогняний', f: 'Вогняна', el: 'fire', emo: '🔥', yang: true },
    { m: 'Вогняний', f: 'Вогняна', el: 'fire', emo: '🔥', yang: false },
    { m: 'Земляний', f: 'Земляна', el: 'earth', emo: '🪨', yang: true },
    { m: 'Земляний', f: 'Земляна', el: 'earth', emo: '🪨', yang: false },
    { m: 'Металевий', f: 'Металева', el: 'metal', emo: '⚙️', yang: true },
    { m: 'Металевий', f: 'Металева', el: 'metal', emo: '⚙️', yang: false },
    { m: 'Водяний', f: 'Водяна', el: 'water', emo: '🌊', yang: true },
    { m: 'Водяний', f: 'Водяна', el: 'water', emo: '🌊', yang: false }
  ];

  // рід тварини потрібен, щоб стихія узгоджувалася: Вогняний Кінь, але Вогняна Коза
  var ANIMAL = [
    { ua: 'Щур', emo: '🐀', m: true, text: 'Рік запасливості й кмітливості. Виграє той, хто помічає можливість раніше за інших і не соромиться почати з малого.' },
    { ua: 'Бик', emo: '🐂', m: true, text: 'Рік методичної праці. Швидких стрибків не буде, зате все, вкладене в фундамент, тримається роками.' },
    { ua: 'Тигр', emo: '🐅', m: true, text: 'Рік різких рухів і сміливих ставок. Нагорода йде тим, хто ризикує першим, а не тим, хто чекає ясності.' },
    { ua: 'Кролик', emo: '🐇', m: true, text: 'Рік мʼякої сили: домовленості, дім, затишок, обхідні шляхи. Лобова атака цього року дорого коштує.' },
    { ua: 'Дракон', emo: '🐉', m: true, text: 'Рік масштабу й драми. Усе відбувається голосніше, ніж планувалось, — і погане, і добре.' },
    { ua: 'Змія', emo: '🐍', m: false, text: 'Рік стратегії й тихого аналізу. Карти на стіл не викладають, виграє той, хто думає на крок далі.' },
    { ua: 'Кінь', emo: '🐎', m: true, text: 'Рік швидкості, свободи й нетерплячки. Усе розганяється, рішення ухвалюються на ходу, сидіти на місці майже неможливо.' },
    { ua: 'Коза', emo: '🐐', m: false, text: 'Рік сповільнення, турботи й творчості. Після скачки хочеться тиші, своїх людей і чогось зробленого руками.' },
    { ua: 'Мавпа', emo: '🐒', m: false, text: 'Рік винахідливості й трюків. Правила гнучкі, працюють нестандартні ходи й уміння домовлятись.' },
    { ua: 'Півень', emo: '🐓', m: true, text: 'Рік порядку, деталей і чесної оцінки. Усе недороблене цього року стає видимим.' },
    { ua: 'Пес', emo: '🐕', m: true, text: 'Рік вірності й принципів. Важить, із ким ти, а не що ти маєш; справедливість стає головним питанням.' },
    { ua: 'Свиня', emo: '🐖', m: false, text: 'Рік достатку й завершення циклу. Можна видихнути, зібрати плоди й підбити підсумки перед новим колом.' }
  ];

  var ELEMENT5 = {
    wood: 'Дерево дає ріст і плани наперед.',
    fire: 'Вогонь дає швидкість, видимість і перегрів.',
    earth: 'Земля дає стабільність і повільність.',
    metal: 'Метал дає чіткість, межі й жорсткість.',
    water: 'Вода дає гнучкість, інтуїцію й розмиті межі.'
  };

  /* момент, коли Сонце має задану довготу (сонцестояння, рівнодення) */
  function sunAt(lon, jdGuess) {
    var jd = jdGuess;
    for (var i = 0; i < 14; i++) {
      var d = A.norm180(A.positions(jd).sun.lon - lon);
      if (Math.abs(d) < 1e-6) break;
      jd -= d / 0.9856;
    }
    return jd;
  }

  /* найближчий молодик/повня: elong = 0 або 180 */
  function syzygy(target, jdGuess) {
    var jd = jdGuess;
    for (var i = 0; i < 20; i++) {
      var p = A.positions(jd);
      var d = A.norm180(p.moon.lon - p.sun.lon - target);
      if (Math.abs(d) < 1e-6) break;
      jd -= d / 12.19;             // середня різниця швидкостей, град/добу
    }
    return jd;
  }

  var SYNODIC = 29.530588;

  /* Китайський Новий рік: другий молодик після зимового сонцестояння, за часом UTC+8. */
  function chineseNewYear(year) {
    var ws = sunAt(270, A.julianDay(year - 1, 12, 21, 0, 0, 0));
    var nm = syzygy(0, ws + 2);
    if (nm < ws) nm = syzygy(0, nm + SYNODIC);
    var second = syzygy(0, nm + SYNODIC);
    // полудень тієї доби за китайським часом — тоді будь-який формат дає правильну дату
    return Math.floor(second + 8 / 24 + 0.5) - 8 / 24;
  }

  function cycleOf(year) {
    var i = ((year - 1984) % 60 + 60) % 60;
    var stem = STEM[i % 10], animal = ANIMAL[i % 12];
    return {
      year: year, stem: stem, animal: animal,
      // рід стихії тягнеться за твариною: Вогняний Кінь, але Вогняна Коза
      name: (animal.m ? stem.m : stem.f) + ' ' + animal.ua,
      el: stem.el, elText: ELEMENT5[stem.el]
    };
  }

  /* східний рік, що містить момент jd */
  function easternYear(jd) {
    var d = A.jdToDate(jd), y = d.year;
    var start = chineseNewYear(y);
    if (jd < start) { y -= 1; start = chineseNewYear(y); }
    var end = chineseNewYear(y + 1);
    var cur = cycleOf(y), next = cycleOf(y + 1);
    return {
      cycle: cur, next: next, start: start, end: end,
      pct: Math.max(0, Math.min(1, (jd - start) / (end - start))),
      daysLeft: Math.max(0, Math.round(end - jd))
    };
  }


  /* ---------- диск років: стихія × тварина → рік ---------- */

  var ELEMENTS = [
    { id: 'wood', ua: 'Дерево', emo: '🌳' },
    { id: 'fire', ua: 'Вогонь', emo: '🔥' },
    { id: 'earth', ua: 'Земля', emo: '🪨' },
    { id: 'metal', ua: 'Метал', emo: '⚙️' },
    { id: 'water', ua: 'Вода', emo: '🌊' }
  ];

  /* Пара (стихія, тварина) однозначна: парність тварини задає ян/інь стовбура,
     тож на 60-річне коло припадає рівно одне місце. */
  function yearFor(elIdx, animalIdx, near) {
    var stem = elIdx * 2 + (animalIdx % 2);
    for (var i = 0; i < 60; i++) {
      if (i % 10 === stem && i % 12 === animalIdx) {
        var base = 1984 + i;
        var k = Math.round(((near || 2026) - base) / 60);
        return base + k * 60;
      }
    }
    return null;
  }

  function indexOfElement(id) {
    for (var i = 0; i < ELEMENTS.length; i++) if (ELEMENTS[i].id === id) return i;
    return 0;
  }

  /* межі й опис східного року за його номером */
  function yearInfo(year, nowJd) {
    var start = chineseNewYear(year), end = chineseNewYear(year + 1);
    var cur = cycleOf(year);
    return {
      cycle: cur, next: cycleOf(year + 1), start: start, end: end,
      current: nowJd >= start && nowJd < end,
      pct: Math.max(0, Math.min(1, (nowJd - start) / (end - start))),
      daysLeft: Math.round(end - nowJd)
    };
  }

  /* ---------- затемнення ---------- */

  function eclipses(jdStart, jdEnd) {
    var out = [], jd = syzygy(0, jdStart);
    while (jd < jdStart) jd += SYNODIC;
    for (var k = 0; jd < jdEnd && k < 40; k++) {
      [['solar', 0, 1.45], ['lunar', 180, 1.0]].forEach(function (t) {
        var m = syzygy(t[1], jd + (t[1] ? SYNODIC / 2 : 0));
        if (m < jdStart || m > jdEnd) return;
        var p = A.positions(m);
        var lat = Math.abs(p.moon.lat);
        if (lat > t[2]) return;
        out.push({
          kind: t[0], jd: m, lat: lat,
          sign: A.signIndex(p.sun.lon + (t[0] === 'lunar' ? 180 : 0)),
          deep: lat < (t[0] === 'solar' ? 0.5 : 0.4)
        });
      });
      jd = syzygy(0, jd + SYNODIC);
    }
    out.sort(function (a, b) { return a.jd - b.jd; });
    return out;
  }

  /* ---------- ретроградності ---------- */

  function retroPeriods(body, jdStart, jdEnd) {
    var out = [], prev = null, start = null, step = 2;
    for (var jd = jdStart - 40; jd <= jdEnd + 40; jd += step) {
      var sp = A.norm180(A.positions(jd + 0.5)[body].lon - A.positions(jd - 0.5)[body].lon);
      var retro = sp < 0;
      if (prev !== null && retro !== prev) {
        var t = refineStation(body, jd - step, jd);
        if (retro) start = t;
        else if (start !== null) { out.push({ from: start, to: t }); start = null; }
      }
      prev = retro;
    }
    return out.filter(function (p) { return p.to > jdStart && p.from < jdEnd; });
  }

  function refineStation(body, a, b) {
    for (var i = 0; i < 24; i++) {
      var m = (a + b) / 2;
      var sa = A.norm180(A.positions(a + 0.5)[body].lon - A.positions(a - 0.5)[body].lon);
      var sm = A.norm180(A.positions(m + 0.5)[body].lon - A.positions(m - 0.5)[body].lon);
      if ((sa < 0) === (sm < 0)) a = m; else b = m;
      if (b - a < 0.01) break;
    }
    return (a + b) / 2;
  }

  /* ---------- місяці ---------- */

  /* 12 місячних відрізків особистого року + те, що в них відбувається */
  function months(natal, jdStart, jdEnd, transits) {
    var out = [], n = 12;
    for (var i = 0; i < n; i++) {
      var a = jdStart + (jdEnd - jdStart) * i / n;
      var b = jdStart + (jdEnd - jdStart) * (i + 1) / n;
      // Ньютон може збігтися до сусідньої сизигії — заганяємо назад у відрізок
      var nm = syzygy(0, a + 2), fm = syzygy(180, a + 2);
      while (nm < a) nm = syzygy(0, nm + SYNODIC);
      while (nm > b) nm = syzygy(0, nm - SYNODIC);
      while (fm < a) fm = syzygy(180, fm + SYNODIC);
      while (fm > b) fm = syzygy(180, fm - SYNODIC);
      var pn = A.positions(nm), pf = A.positions(fm);
      out.push({
        index: i + 1, from: a, to: b,
        newMoon: { jd: nm, sign: A.signIndex(pn.sun.lon), house: A.houseOf(pn.sun.lon, natal.houses.cusps) },
        fullMoon: { jd: fm, sign: A.signIndex(pf.moon.lon), house: A.houseOf(pf.moon.lon, natal.houses.cusps) },
        events: (transits || []).filter(function (e) { return e.jd >= a && e.jd < b; })
      });
    }
    return out;
  }

  var API = {
    ELEMENTS: ELEMENTS, yearFor: yearFor, indexOfElement: indexOfElement, yearInfo: yearInfo,
    STEM: STEM, ANIMAL: ANIMAL, ELEMENT5: ELEMENT5,
    chineseNewYear: chineseNewYear, cycleOf: cycleOf, easternYear: easternYear,
    eclipses: eclipses, retroPeriods: retroPeriods, months: months,
    syzygy: syzygy, sunAt: sunAt, SYNODIC: SYNODIC
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.YEAR = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
