/* Річний аналіз: профекції, соляр, точні дати транзитів, інгресії. */
(function (root) {
  'use strict';
  var A = root.ASTRO, M = root.INTERP_META;

  var SLOW = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron'];
  var NATAL_PTS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node', 'asc', 'mc'];
  var TRANSIT_ASPECTS = [
    { id: 'conjunction', angle: 0 }, { id: 'opposition', angle: 180 },
    { id: 'square', angle: 90 }, { id: 'trine', angle: 120 }, { id: 'sextile', angle: 60 }
  ];
  var ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  var PROFECTION = [
    null,
    'Рік про себе: тіло, подача, особистий старт. Усе вирішується твоїми власними рухами.',
    'Рік про ресурс: гроші, майно, самооцінка. Головне питання — на що ти спираєшся.',
    'Рік про інформацію й найближче коло: навчання, тексти, поїздки, брати й сестри.',
    'Рік про дім і коріння: житло, родина, батьки, внутрішній тил.',
    'Рік про творчість і радість: діти, романи, гра, авторство, ризик.',
    'Рік про роботу й тіло: режим, обовʼязки, здоровʼя, щоденна дисципліна.',
    'Рік про партнерство: шлюб, союзи, договори, відкриті конфлікти.',
    'Рік про глибину й чужі ресурси: кризи, борги, спільні гроші, психіка, трансформація.',
    'Рік про сенси й далеч: навчання, подорожі, віра, розширення картини світу.',
    'Рік про статус і карʼєру: публічна роль, досягнення, стосунки з владою.',
    'Рік про спільноту: друзі, кола, плани на майбутнє, покровителі.',
    'Рік про тишу й завершення: усамітнення, внутрішня робота, вихід зі старого циклу.'
  ];

  var TRANSIT_TONE = {
    jupiter: { ua: 'розширює й дає дозвіл', warn: 'ризик переоцінити сили' },
    saturn: { ua: 'вимагає дорослішання й перевіряє на міцність', warn: 'відчувається як тиск і брак часу' },
    uranus: { ua: 'ламає рамку й вивільняє', warn: 'події раптові, контролю мало' },
    neptune: { ua: 'розмиває межі й підвищує чутливість', warn: 'легко обманутись або втратити фокус' },
    pluto: { ua: 'перебудовує до основи', warn: 'старе не вдасться зберегти' },
    chiron: { ua: 'зачіпає стару рану', warn: 'боляче, але це місце лікується' }
  };

  var ASPECT_TONE = {
    conjunction: 'Аспект накладається напряму, без дистанції — відчувається як стан, а не як подія',
    opposition: 'Аспект ставить тему навпроти тебе — вона приходить через людей і обставини',
    square: 'Аспект діє через тертя: щось доведеться вирішувати, відкласти не вийде',
    trine: 'Аспект діє мʼяко — можливість є, але сама себе не реалізує',
    sextile: 'Аспект дає шанс, який спрацює лише якщо ти його візьмеш свідомо'
  };

  /* --- сонячне повернення --- */
  function solarReturn(natalSunLon, yearJdGuess) {
    var jd = yearJdGuess;
    for (var i = 0; i < 12; i++) {
      var d = A.norm180(A.positions(jd).sun.lon - natalSunLon);
      if (Math.abs(d) < 1e-6) break;
      jd -= d / 0.9856;
    }
    return jd;
  }

  /* --- точні дати транзитних аспектів --- */
  function exactTime(body, natalLon, angle, jd0, jd1) {
    function f(jd) { return A.norm180(A.positions(jd)[body].lon - natalLon - angle); }
    var a = jd0, b = jd1, fa = f(a);
    for (var i = 0; i < 40; i++) {
      var m = (a + b) / 2, fm = f(m);
      if (Math.abs(b - a) < 1e-4) return m;
      if ((fa < 0) === (fm < 0)) { a = m; fa = fm; } else b = m;
    }
    return (a + b) / 2;
  }

  function scanTransits(natal, jdStart, jdEnd, opts) {
    opts = opts || {};
    var pts = {};
    NATAL_PTS.forEach(function (k) {
      pts[k] = k === 'asc' ? natal.houses.asc : (k === 'mc' ? natal.houses.mc : natal.bodies[k].lon);
    });
    var bodies = opts.bodies || SLOW;
    var prev = null, events = [], step = 1;
    for (var jd = jdStart; jd <= jdEnd + step; jd += step) {
      var p = A.positions(jd), cur = {};
      bodies.forEach(function (b) { cur[b] = p[b].lon; });
      if (prev) {
        bodies.forEach(function (b) {
          NATAL_PTS.forEach(function (n) {
            TRANSIT_ASPECTS.forEach(function (asp) {
              var d0 = A.norm180(prev[b] - pts[n] - asp.angle);
              var d1 = A.norm180(cur[b] - pts[n] - asp.angle);
              if (d0 === 0 || (d0 < 0) === (d1 < 0) || Math.abs(d1 - d0) > 90) return;
              events.push({
                body: b, natal: n, aspect: asp.id, angle: asp.angle,
                jd: exactTime(b, pts[n], asp.angle, jd - step, jd)
              });
            });
          });
        });
      }
      prev = cur;
    }
    events.sort(function (a, b) { return a.jd - b.jd; });
    return events;
  }

  /* --- інгресії знаків і натальних домів --- */
  function scanIngresses(natal, jdStart, jdEnd, bodies) {
    var out = [], prev = null, step = 1;
    for (var jd = jdStart; jd <= jdEnd + step; jd += step) {
      var p = A.positions(jd), cur = {};
      bodies.forEach(function (b) { cur[b] = p[b].lon; });
      if (prev) {
        bodies.forEach(function (b) {
          if (A.signIndex(prev[b]) !== A.signIndex(cur[b])) {
            var si = A.signIndex(cur[b]);
            // уточнюємо момент перетину межі знака
            var edge = si * 30;
            out.push({ kind: 'sign', body: b, sign: si, jd: exactTime(b, edge, 0, jd - step, jd), back: A.norm180(cur[b] - prev[b]) < 0 });
          }
          var h0 = A.houseOf(prev[b], natal.houses.cusps), h1 = A.houseOf(cur[b], natal.houses.cusps);
          if (h0 !== h1) out.push({ kind: 'house', body: b, house: h1, jd: jd, back: A.norm180(cur[b] - prev[b]) < 0 });
        });
      }
      prev = cur;
    }
    out.sort(function (a, b) { return a.jd - b.jd; });
    return out;
  }

  /* --- рік --- */
  function yearReport(natal, birth, year, opts) {
    opts = opts || {};
    var bd = A.jdToDate(natal.jdUT);
    var age = year - birth.year;
    var profHouse = ((age % 12) + 12) % 12 + 1;
    var sign = M.signByIndex(A.signIndex(natal.houses.cusps[profHouse]));
    var lordKey = sign.ruler, lord = natal.bodies[lordKey];

    // межі профекційного року: від дня народження цього року до наступного
    var profStart = A.julianDay(year, birth.month, birth.day, birth.hour, birth.minute, 0) - birth.tzOffset / 1440;
    var profEnd = A.julianDay(year + 1, birth.month, birth.day, birth.hour, birth.minute, 0) - birth.tzOffset / 1440;

    var jdStart = A.julianDay(year, 1, 1, 0, 0, 0);
    var jdEnd = A.julianDay(year, 12, 31, 23, 59, 0);

    var sr = solarReturn(natal.bodies.sun.lon, profStart);
    var srChart = A.buildChart(sr, opts.lat !== undefined ? opts.lat : natal.lat,
      opts.lon !== undefined ? opts.lon : natal.lon, opts.system || 'placidus');

    var transits = scanTransits(natal, jdStart, jdEnd);
    var ingresses = scanIngresses(natal, jdStart, jdEnd, SLOW);

    // транзит керівника року
    var lordTransit = null;
    if (['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].indexOf(lordKey) >= 0) {
      var lp = A.positions(profStart)[lordKey];
      lordTransit = {
        lon: lp.lon, sign: M.signByIndex(A.signIndex(lp.lon)),
        house: A.houseOf(lp.lon, natal.houses.cusps)
      };
    }

    var RETURN_TEXT = {
      saturn: [L('Повернення Сатурна', 'Saturn return'), L('Ключова перевірка структури життя. Те, що збудовано не на твоєму, зазвичай тут і завершується.',
        'The key audit of your life structure. Whatever was built on something that is not yours usually ends here.')],
      jupiter: [L('Повернення Юпітера', 'Jupiter return'), L('Початок нового 12-річного циклу росту. Добрий момент ставити більшу мету.',
        'The start of a new 12-year growth cycle. A good moment to set a bigger goal.')],
      uranus: [L('Повернення Урана', 'Uranus return'), L('Рідкісна точка — повна зміна уявлення про власну свободу.',
        'A rare point — a complete change in what freedom means to you.')],
      chiron: [L('Повернення Хірона', 'Chiron return'), L('Зустріч зі старою раною на новому рівні зрілості.',
        'Meeting an old wound at a new level of maturity.')]
    };
    var returns = [], retMap = {};
    transits.forEach(function (e) {
      if (e.aspect !== 'conjunction' || e.body !== e.natal || !RETURN_TEXT[e.body]) return;
      if (!retMap[e.body]) {   // ретроградність дає до трьох проходів — це одна подія
        retMap[e.body] = { jds: [], label: RETURN_TEXT[e.body][0], text: RETURN_TEXT[e.body][1] };
        returns.push(retMap[e.body]);
      }
      retMap[e.body].jds.push(e.jd);
    });

    return {
      year: year, age: age,
      profection: {
        house: profHouse, roman: ROMAN[profHouse], sign: sign,
        lordKey: lordKey, lord: lord, lordTransit: lordTransit,
        start: profStart, end: profEnd,
        text: PROFECTION[profHouse],
        houseMeta: M.HOUSE[profHouse]
      },
      solarReturn: { jd: sr, chart: srChart },
      transits: transits, ingresses: ingresses, returns: returns
    };
  }

  /* --- згруповані транзити: 1–3 проходи одного аспекту --- */
  function groupTransits(events) {
    var map = {}, out = [];
    events.forEach(function (e) {
      var k = e.body + '|' + e.natal + '|' + e.aspect;
      if (!map[k]) { map[k] = { body: e.body, natal: e.natal, aspect: e.aspect, hits: [] }; out.push(map[k]); }
      map[k].hits.push(e.jd);
    });
    out.sort(function (a, b) { return a.hits[0] - b.hits[0]; });
    return out;
  }

  function transitText(g) {
    var t = TRANSIT_TONE[g.body] || { ua: L('торкається', 'touches it'), warn: '' };
    var natalNoun = M.PLANET[g.natal].noun;
    var s = L('Зачеплена тема — ', 'The theme touched: ') + natalNoun + '. ' + ASPECT_TONE[g.aspect] + '. ' +
      M.PLANET[g.body].ua + ' ' + t.ua + '.';
    if (g.hits.length === 2) s += L(' Два проходи через ретроградність — тема повертається.',
      ' Two passes because of retrograde motion — the theme comes back.');
    else if (g.hits.length > 2) s += L(' Три проходи (прямий, ретроградний, повторний) розтягують сюжет — остаточна ясність настає з останнім.',
      ' Three passes (direct, retrograde, direct again) stretch the story out — the final clarity comes with the last one.');
    if (t.warn) s += L(' Тіньовий бік: ', ' The shadow side: ') + t.warn + '.';
    return s;
  }

  function importance(g) {
    var w = { pluto: 5, saturn: 4.5, uranus: 4, neptune: 3.5, jupiter: 3, chiron: 2 }[g.body] || 1;
    var n = { sun: 3, moon: 3, asc: 3, mc: 3, venus: 2, mars: 2, mercury: 2 }[g.natal] || 1.2;
    var a = { conjunction: 1.3, opposition: 1.2, square: 1.2, trine: 0.9, sextile: 0.7 }[g.aspect] || 1;
    return w * n * a * (g.hits.length > 1 ? 1.2 : 1);
  }

  /* --- довга смуга життя --- */
  function timeline(natal, birth, fromYear, toYear) {
    var rows = [];
    for (var y = fromYear; y <= toYear; y++) {
      var age = y - birth.year;
      var h = ((age % 12) + 12) % 12 + 1;
      rows.push({ year: y, age: age, house: h, roman: ROMAN[h], title: M.HOUSE[h].title });
    }
    return rows;
  }

  var API = {
    yearReport: yearReport, groupTransits: groupTransits, transitText: transitText,
    importance: importance, timeline: timeline, solarReturn: solarReturn,
    scanTransits: scanTransits, scanIngresses: scanIngresses, PROFECTION: PROFECTION, SLOW: SLOW,
    TRANSIT_TONE: TRANSIT_TONE, ASPECT_TONE: ASPECT_TONE
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.FORECAST = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
