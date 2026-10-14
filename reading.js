/* Складання персонального розбору з розрахованої карти. */
(function (root) {
  'use strict';
  var M = root.INTERP_META, TS = root.TEXTS_SIGN, TH = root.TEXTS_HOUSE, A = root.ASTRO;

  var ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  var WEIGHT = { sun: 3, moon: 3, mercury: 2, venus: 2, mars: 2, jupiter: 1.5, saturn: 1.5, uranus: 1, neptune: 1, pluto: 1, node: 1, chiron: 0.5, lilith: 0.5 };
  var MAIN = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

  function fmtDeg(d) {
    var deg = Math.floor(d), min = Math.round((d - deg) * 60);
    if (min === 60) { min = 0; deg++; }
    return deg + '°' + (min < 10 ? '0' : '') + min + '′';
  }
  function posLabel(b) {
    var s = M.signByIndex(b.signIndex);
    return s.sym + ' ' + fmtDeg(b.deg) + ' ' + s.ua + (b.retro ? ' ℞' : '');
  }

  /* --- баланс стихій і хрестів --- */
  function balance(chart) {
    var el = { fire: 0, earth: 0, air: 0, water: 0 }, mod = { cardinal: 0, fixed: 0, mutable: 0 }, total = 0;
    MAIN.forEach(function (k) {
      var s = M.signByIndex(chart.bodies[k].signIndex), w = WEIGHT[k];
      el[s.el] += w; mod[s.mod] += w; total += w;
    });
    var ascS = M.signByIndex(A.signIndex(chart.houses.asc));
    el[ascS.el] += 2.5; mod[ascS.mod] += 2.5; total += 2.5;
    var mcS = M.signByIndex(A.signIndex(chart.houses.mc));
    el[mcS.el] += 1.5; mod[mcS.mod] += 1.5; total += 1.5;

    function rank(obj) {
      return Object.keys(obj).map(function (k) { return { k: k, v: obj[k], pct: obj[k] / total }; })
        .sort(function (a, b) { return b.v - a.v; });
    }
    return { el: rank(el), mod: rank(mod), total: total };
  }

  function hemispheres(chart) {
    var up = 0, down = 0, east = 0, west = 0;
    MAIN.forEach(function (k) {
      var h = chart.bodies[k].house;
      if (h >= 7) up++; else down++;
      if (h >= 10 || h <= 3) east++; else west++;
    });
    return { up: up, down: down, east: east, west: west };
  }

  function dominants(chart) {
    var signs = {}, houses = {};
    MAIN.concat(['node', 'chiron', 'lilith']).forEach(function (k) {
      var b = chart.bodies[k], w = WEIGHT[k] || 0.5;
      signs[b.signIndex] = (signs[b.signIndex] || 0) + w;
      houses[b.house] = (houses[b.house] || 0) + w;
    });
    var ai = A.signIndex(chart.houses.asc);
    signs[ai] = (signs[ai] || 0) + 2.5;
    function top(obj) {
      return Object.keys(obj).map(function (k) { return { k: +k, v: obj[k] }; })
        .sort(function (a, b) { return b.v - a.v; });
    }
    return { signs: top(signs), houses: top(houses) };
  }

  function stelliums(chart) {
    var byHouse = {}, bySign = {}, out = [];
    MAIN.forEach(function (k) {
      var b = chart.bodies[k];
      (byHouse[b.house] = byHouse[b.house] || []).push(k);
      (bySign[b.signIndex] = bySign[b.signIndex] || []).push(k);
    });
    Object.keys(byHouse).forEach(function (h) {
      if (byHouse[h].length >= 3) out.push({ kind: 'house', n: +h, bodies: byHouse[h] });
    });
    Object.keys(bySign).forEach(function (s) {
      if (bySign[s].length >= 3) out.push({ kind: 'sign', n: +s, bodies: bySign[s] });
    });
    return out;
  }

  /* --- блоки тексту --- */

  function planetBlock(chart, key) {
    var b = chart.bodies[key], meta = M.PLANET[key], s = M.signByIndex(b.signIndex);
    var parts = [];
    if (TS.PIS[key]) parts.push(TS.PIS[key][b.signIndex]);
    if (TH.PIH[key]) parts.push(TH.PIH[key][b.house - 1]);
    if (!parts.length) {
      parts.push(L(meta.fn + ' проявляється ' + s.inUa + ' (' + s.keys.slice(0, 3).join(', ') + ') у сфері ' + ROMAN[b.house] + ' дому: ' + M.HOUSE[b.house].area + '.',
        meta.fn + ' works out ' + s.inUa + ' (' + s.keys.slice(0, 3).join(', ') + ') in the area of ' + M.HOUSE[b.house].uaGen + ': ' + M.HOUSE[b.house].area + '.'));
    }
    if (b.retro && ['mercury', 'venus', 'mars', 'jupiter', 'saturn'].indexOf(key) >= 0) {
      parts.push(L('Ретроградність розвертає цю функцію всередину: вона працює повільніше, через переосмислення й повтор, зате глибше.',
        'Retrograde turns this function inward: it works slower, through rethinking and repetition, but deeper.'));
    }
    return {
      key: key, name: meta.ua, sym: meta.sym, fn: meta.fn,
      sign: s, house: b.house, houseRoman: ROMAN[b.house],
      pos: posLabel(b), retro: b.retro, text: parts,
      aspects: chart.aspects.filter(function (a) { return a.a === key || a.b === key; })
    };
  }

  function aspectText(asp) {
    var am = M.PLANET[asp.a], bm = M.PLANET[asp.b], meta = M.ASPECT[asp.type];
    return cap(am.noun) + L(' та ', ' and ') + bm.noun + ' ' + meta.line + '.';
  }

  function aspectTitle(asp) {
    var meta = M.ASPECT[asp.type];
    return M.PLANET[asp.a].ua + ' ' + meta.sym + ' ' + M.PLANET[asp.b].ua;
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function houseBlock(chart, n) {
    var h = M.HOUSE[n], cusp = chart.houses.cusps[n], s = M.signByIndex(A.signIndex(cusp));
    var rulerKey = s.ruler, ruler = chart.bodies[rulerKey];
    var inside = MAIN.concat(['node', 'chiron', 'lilith']).filter(function (k) { return chart.bodies[k].house === n; });

    var text = [];
    text.push(L('Куспід ' + h.uaGen + ' — ' + s.ua + ' ' + s.sym + ' (' + M.ELEMENT[s.el].ua.toLowerCase() + ', ' +
      M.MODALITY[s.mod].adjM + '). Знак додає цій темі ' + s.keys.slice(0, 3).join(', ') + '; підхід — ' + s.style + '.',
      'The cusp of ' + h.uaGen + ' is ' + s.ua + ' ' + s.sym + ' (' + M.ELEMENT[s.el].ua.toLowerCase() + ', ' +
      M.MODALITY[s.mod].adjM + '). The sign adds ' + s.keys.slice(0, 3).join(', ') + ' to this theme; the approach ' + s.style + '.'));

    var rText = L('Керівник дому — ' + M.PLANET[rulerKey].ua + ' ' + M.PLANET[rulerKey].sym + ' ' +
      M.signByIndex(ruler.signIndex).inUa + ', ' + ROMAN[ruler.house] + ' дім.',
      'The ruler of the house is ' + M.PLANET[rulerKey].ua + ' ' + M.PLANET[rulerKey].sym + ' ' +
      M.signByIndex(ruler.signIndex).inUa + ', in ' + M.HOUSE[ruler.house].uaGen + '.');
    if (ruler.house !== n) {
      rText += L(' Отже, справи цього дому ведуть тебе у зону ' + ROMAN[ruler.house] + ' дому — ' + M.HOUSE[ruler.house].area + '.',
        ' So the affairs of this house lead you into the zone of ' + M.HOUSE[ruler.house].uaGen + ' — ' + M.HOUSE[ruler.house].area + '.');
    } else {
      rText += L(' Керівник удома: тема замкнена сама на себе й працює автономно.',
        ' The ruler is at home: the theme is closed on itself and works autonomously.');
    }
    text.push(rText);

    if (inside.length) {
      var list = inside.map(function (k) {
        return M.PLANET[k].ua + ' (' + M.signByIndex(chart.bodies[k].signIndex).ua + ')';
      }).join(', ');
      text.push(L('У домі стоять: ' + list + '. Це головні сили, що формують цю сферу.',
        'Bodies in the house: ' + list + '. These are the main forces shaping this area.'));
    } else {
      text.push(L('Планет у домі немає — тема не навантажена подіями сама по собі й розгортається через свого керівника.',
        'No planets in the house — the theme is not loaded with events by itself and unfolds through its ruler.'));
    }

    return {
      n: n, roman: ROMAN[n], title: h.title, theme: h.theme, area: h.area,
      cusp: cusp, cuspLabel: s.sym + ' ' + fmtDeg(A.degInSign(cusp)) + ' ' + s.ua,
      sign: s, rulerKey: rulerKey, rulerHouse: ruler.house, inside: inside, text: text,
      bodyTexts: inside.map(function (k) {
        return { key: k, name: M.PLANET[k].ua, sym: M.PLANET[k].sym, pos: posLabel(chart.bodies[k]), text: (TH.PIH[k] || {})[n - 1] || '' };
      })
    };
  }

  function summary(chart) {
    var sun = chart.bodies.sun, moon = chart.bodies.moon;
    var ascIdx = A.signIndex(chart.houses.asc), mcIdx = A.signIndex(chart.houses.mc);
    var bal = balance(chart), hem = hemispheres(chart), dom = dominants(chart);
    var rulerKey = M.signByIndex(ascIdx).ruler, ruler = chart.bodies[rulerKey];

    var lines = [], part = { core: [], mix: [], focus: [] };
    lines.push(L(
      'Основа карти — ' + M.PLANET.sun.ua + ' ' + M.signByIndex(sun.signIndex).inUa + ' у ' + ROMAN[sun.house] +
      ' домі, ' + M.PLANET.moon.ua + ' ' + M.signByIndex(moon.signIndex).inUa + ' у ' + ROMAN[moon.house] +
      ' домі, асцендент ' + M.signByIndex(ascIdx).inUa + '. Це три різні людини всередині тебе: ' +
      'та, ким ти є по суті, та, що відчуває, і та, яку бачать першою.',
      'The base of the chart is the ' + M.PLANET.sun.ua + ' ' + M.signByIndex(sun.signIndex).inUa + ' in ' + M.HOUSE[sun.house].uaGen +
      ', the ' + M.PLANET.moon.ua + ' ' + M.signByIndex(moon.signIndex).inUa + ' in ' + M.HOUSE[moon.house].uaGen +
      ', ascendant ' + M.signByIndex(ascIdx).inUa + '. These are three different people inside you: ' +
      'the one you are at the core, the one who feels, and the one people see first.'));

    lines.push(L(
      'Керівник карти — ' + M.PLANET[rulerKey].ua + ' ' + M.signByIndex(ruler.signIndex).inUa + ' у ' +
      ROMAN[ruler.house] + ' домі. Саме ця сфера (' + M.HOUSE[ruler.house].area + ') задає головний сюжет життя.',
      'The chart ruler is ' + M.PLANET[rulerKey].ua + ' ' + M.signByIndex(ruler.signIndex).inUa + ' in ' +
      M.HOUSE[ruler.house].uaGen + '. That area (' + M.HOUSE[ruler.house].area + ') sets the main plot of your life.'));

    var e0 = bal.el[0], e3 = bal.el[3];
    lines.push(L(
      'Стихії: найбільше — ' + M.ELEMENT[e0.k].ua.toLowerCase() + ' (' + Math.round(e0.pct * 100) + '%), ' +
      M.ELEMENT[e0.k].much + '. Найменше — ' + M.ELEMENT[e3.k].ua.toLowerCase() + ' (' + Math.round(e3.pct * 100) + '%): ' +
      M.ELEMENT[e3.k].little + '.',
      'Elements: most of all ' + M.ELEMENT[e0.k].ua.toLowerCase() + ' (' + Math.round(e0.pct * 100) + '%) — ' +
      M.ELEMENT[e0.k].much + '. Least of all ' + M.ELEMENT[e3.k].ua.toLowerCase() + ' (' + Math.round(e3.pct * 100) + '%): ' +
      M.ELEMENT[e3.k].little + '.'));

    var m0 = bal.mod[0], m2 = bal.mod[2];
    lines.push(L(
      'Хрести: переважає ' + M.MODALITY[m0.k].adjF + ' якість — ' + M.MODALITY[m0.k].much +
      '. Найменше виражена ' + M.MODALITY[m2.k].adjF + ' — ' + M.MODALITY[m2.k].little + '.',
      'Modalities: the ' + M.MODALITY[m0.k].adjF + ' quality dominates — ' + M.MODALITY[m0.k].much +
      '. The weakest is ' + M.MODALITY[m2.k].adjF + ' — ' + M.MODALITY[m2.k].little + '.'));

    if (hem.up >= 7) lines.push(L('Більшість планет над горизонтом: життя розгортається назовні, на видноті, через публічне й соціальне.',
      'Most planets are above the horizon: life unfolds outwards, in plain sight, through the public and the social.'));
    else if (hem.down >= 7) lines.push(L('Більшість планет під горизонтом: головне відбувається в приватному — там твоя справжня вага, навіть якщо ззовні цього не видно.',
      'Most planets are below the horizon: the main things happen in private — that is where your real weight is, even if it is invisible from outside.'));
    if (hem.east >= 7) lines.push(L('Акцент на східній половині: сюжети свого життя запускаєш ти сам, а обставини — радше наслідок твоїх рішень.',
      'The eastern half is emphasised: you start your own plots, and circumstances are mostly a consequence of your decisions.'));
    else if (hem.west >= 7) lines.push(L('Акцент на західній половині: твоє життя сильно формують інші люди й обставини, і твій навик — відповідати на них, а не ініціювати.',
      'The western half is emphasised: other people and circumstances shape your life a lot, and your skill is responding to them rather than initiating.'));

    var topHouse = dom.houses[0];
    if (topHouse && topHouse.v >= 5) {
      lines.push(L(
        'Найнавантаженіший дім — ' + ROMAN[topHouse.k] + ' (' + M.HOUSE[topHouse.k].title.toLowerCase() +
        '). Сюди стікається найбільше енергії карти: ' + M.HOUSE[topHouse.k].theme + '.',
        'The busiest house is ' + M.HOUSE[topHouse.k].uaGen + ' (' + M.HOUSE[topHouse.k].title.toLowerCase() +
        '). Most of the chart energy flows here: ' + M.HOUSE[topHouse.k].theme + '.'));
    }

    stelliums(chart).forEach(function (st) {
      var names = st.bodies.map(function (k) { return M.PLANET[k].ua; }).join(', ');
      if (st.kind === 'house') {
        lines.push(L('Скупчення у ' + ROMAN[st.n] + ' домі (' + names + '): тема «' + M.HOUSE[st.n].title.toLowerCase() + '» домінує над рештою карти.',
          'A stellium in ' + M.HOUSE[st.n].uaGen + ' (' + names + '): the theme of ' + M.HOUSE[st.n].title.toLowerCase() + ' dominates the rest of the chart.'));
      } else {
        lines.push(L('Скупчення ' + M.signByIndex(st.n).inUa + ' (' + names + '): риси цього знака в характері подвоєні.',
          'A stellium ' + M.signByIndex(st.n).inUa + ' (' + names + '): the traits of this sign are doubled in your character.'));
      }
    });

    var tight = chart.aspects.filter(function (a) { return a.nature === 'major' && a.orb < 2; }).slice(0, 4);
    if (tight.length) {
      lines.push(L('Найточніші аспекти карти: ' + tight.map(aspectTitle).join(', ') +
        '. Вони працюють найгучніше й відчуваються як характер, а не як обставини.',
        'The tightest aspects in the chart: ' + tight.map(aspectTitle).join(', ') +
        '. They run loudest and feel like character rather than circumstance.'));
    }

    // розкладка для окремого лейаута історії: хто ти / з чого зроблений / на чому фокус
    // розкладка для історії: хто ти / з чого зроблений / на чому фокус
    var HEMI = L(/половин/, /half is emphasised/);
    part.core = lines.slice(0, 2);
    part.mix = lines.slice(2, 4).concat(lines.slice(4).filter(function (l) { return HEMI.test(l); }));
    part.focus = lines.slice(4).filter(function (l) { return !HEMI.test(l); });

    return {
      lines: lines, part: part, balance: bal, hemispheres: hem, dominants: dom,
      rulerKey: rulerKey, ascIdx: ascIdx, mcIdx: mcIdx
    };
  }

  function build(chart) {
    var order = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node', 'chiron', 'lilith'];
    var r = {
      summary: summary(chart),
      planets: order.map(function (k) { return planetBlock(chart, k); }),
      houses: [], aspects: chart.aspects.map(function (a) {
        return { asp: a, title: aspectTitle(a), text: aspectText(a), orb: a.orb, tone: M.ASPECT[a.type].tone };
      }),
      angles: {
        asc: { label: 'ASC', sign: M.signByIndex(A.signIndex(chart.houses.asc)), deg: A.degInSign(chart.houses.asc), text: TS.ASC_SIGN[A.signIndex(chart.houses.asc)] },
        mc: { label: 'MC', sign: M.signByIndex(A.signIndex(chart.houses.mc)), deg: A.degInSign(chart.houses.mc) }
      }
    };
    for (var i = 1; i <= 12; i++) r.houses.push(houseBlock(chart, i));
    return r;
  }

  var API = { build: build, fmtDeg: fmtDeg, posLabel: posLabel, ROMAN: ROMAN, aspectTitle: aspectTitle, aspectText: aspectText, balance: balance };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.READING = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
