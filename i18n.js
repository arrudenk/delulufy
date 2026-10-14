/* Дві мови. Англійські значення вкладаються прямо в ті самі поля,
   тож увесь інший код працює без змін — міняється лише вміст. */
(function (root) {
  'use strict';

  var LANGS = { cur: 'uk', list: ['uk', 'en'] };

  // L('укр', 'eng') — вибір рядка прямо в місці використання
  function L(uk, en) { return LANGS.cur === 'en' ? en : uk; }

  var EN = {
    SIGN: [
      { ua: 'Aries', inUa: 'in Aries', keys: ['initiative', 'bluntness', 'speed', 'competitiveness'], style: 'acts first, asks later' },
      { ua: 'Taurus', inUa: 'in Taurus', keys: ['stability', 'sensuality', 'stubbornness', 'resources'], style: 'builds slowly, but for good' },
      { ua: 'Gemini', inUa: 'in Gemini', keys: ['curiosity', 'language', 'mobility', 'duality'], style: 'holds several versions of reality at once' },
      { ua: 'Cancer', inUa: 'in Cancer', keys: ['care', 'memory', 'protection', 'roots'], style: 'builds a safe circle first, then moves' },
      { ua: 'Leo', inUa: 'in Leo', keys: ['creativity', 'dignity', 'generosity', 'recognition'], style: 'lives so that it can be seen' },
      { ua: 'Virgo', inUa: 'in Virgo', keys: ['analysis', 'precision', 'service', 'criticism'], style: 'finishes what others left half-done' },
      { ua: 'Libra', inUa: 'in Libra', keys: ['balance', 'partnership', 'taste', 'diplomacy'], style: 'checks itself through another person' },
      { ua: 'Scorpio', inUa: 'in Scorpio', keys: ['depth', 'control', 'crisis', 'transformation'], style: 'does not believe the surface' },
      { ua: 'Sagittarius', inUa: 'in Sagittarius', keys: ['meaning', 'freedom', 'distance', 'faith'], style: 'looks for a wider frame for everything' },
      { ua: 'Capricorn', inUa: 'in Capricorn', keys: ['structure', 'responsibility', 'ambition', 'endurance'], style: 'plays the long game and hates wasted moves' },
      { ua: 'Aquarius', inUa: 'in Aquarius', keys: ['independence', 'ideas', 'community', 'distance'], style: 'watches its own life from above and to the side' },
      { ua: 'Pisces', inUa: 'in Pisces', keys: ['compassion', 'imagination', 'dissolution', 'surrender'], style: 'treats every boundary as negotiable' }
    ],
    ELEMENT: {
      fire: { ua: 'Fire', desc: 'drive, action, self-belief', much: 'plenty of fuel and not many brakes', little: 'no spontaneous spark — you have to start your own engine' },
      earth: { ua: 'Earth', desc: 'body, resources, results', much: 'a strong grip on reality, with a risk of sinking into routine', little: 'ideas outrun delivery; body and money get postponed' },
      air: { ua: 'Air', desc: 'thought, speech, connections', much: 'everything gets talked through, sometimes instead of lived', little: 'hard to step back and put yourself into words' },
      water: { ua: 'Water', desc: 'feeling, memory, bonds', much: 'high sensitivity, boundaries blur', little: 'emotions arrive late and through the body' }
    },
    MODALITY: {
      cardinal: { ua: 'Cardinal', adjF: 'cardinal', adjM: 'cardinal', desc: 'to start', much: 'keeps opening new fronts', little: 'hard to start without a push from outside' },
      fixed: { ua: 'Fixed', adjF: 'fixed', adjM: 'fixed', desc: 'to hold', much: 'huge staying power, but a heavy turning circle', little: 'hard to see long stories through' },
      mutable: { ua: 'Mutable', adjF: 'mutable', adjM: 'mutable', desc: 'to change', much: 'adapts easily, holds one line less easily', little: 'little flex — change feels like a break' }
    },
    PLANET: {
      sun: { ua: 'Sun', fn: 'the core of the self, will, what it is all for', noun: 'will and sense of self' },
      moon: { ua: 'Moon', fn: 'emotional nature, need for safety, automatic reactions', noun: 'emotional nature' },
      mercury: { ua: 'Mercury', fn: 'thinking, speech, exchange of information', noun: 'thinking and speech' },
      venus: { ua: 'Venus', fn: 'values, attraction, taste, relationships', noun: 'the capacity to love and to value' },
      mars: { ua: 'Mars', fn: 'will to act, aggression, desire', noun: 'the will to act' },
      jupiter: { ua: 'Jupiter', fn: 'growth, meaning, generosity, faith', noun: 'the capacity to grow and believe' },
      saturn: { ua: 'Saturn', fn: 'limit, duty, time, maturity', noun: 'inner structure and duty' },
      uranus: { ua: 'Uranus', fn: 'freedom, rupture, suddenness, otherness', noun: 'the need for freedom' },
      neptune: { ua: 'Neptune', fn: 'imagination, compassion, illusion, dissolving edges', noun: 'imagination and the ability to dissolve' },
      pluto: { ua: 'Pluto', fn: 'power, depth, crisis, transformation', noun: 'the force of transformation' },
      node: { ua: 'North Node', fn: 'direction of growth, what you have to learn from scratch', noun: 'the growth vector' },
      southnode: { ua: 'South Node', fn: 'what is already stored, habitual, the old comfort zone', noun: 'familiar baggage' },
      lilith: { ua: 'Lilith', fn: 'the repressed, the taboo, inconvenient freedom', noun: 'the repressed part' },
      chiron: { ua: 'Chiron', fn: 'the wound that never fully closes, and the craft that grows out of it', noun: 'the tender spot' },
      asc: { ua: 'Ascendant', fn: 'how you show up, first impression, the mask that is also a door', noun: 'the way you enter contact' },
      mc: { ua: 'Midheaven', fn: 'public role, calling, the top of the chart', noun: 'public role' },
      dsc: { ua: 'Descendant', fn: 'what you look for in another person', noun: 'the image of the partner' },
      ic: { ua: 'Imum Coeli', fn: 'roots, family, private ground', noun: 'roots' }
    },
    HOUSE: [
      null,
      { ua: '1st house', uaGen: 'the 1st house', title: 'Self, body, delivery', theme: 'how you walk into a room and into life', area: 'appearance, temperament, first impression, starting energy', verb: 'show yourself' },
      { ua: '2nd house', uaGen: 'the 2nd house', title: 'Money, resources, values', theme: 'what you stand on and what you own', area: 'income, property, self-worth, the body as a resource', verb: 'earn and value' },
      { ua: '3rd house', uaGen: 'the 3rd house', title: 'Speech, learning, close circle', theme: 'daily exchange with the world next door', area: 'siblings, neighbours, short trips, early schooling, writing', verb: 'speak and learn' },
      { ua: '4th house', uaGen: 'the 4th house', title: 'Home, family, ground', theme: 'where you come from and where you go back to', area: 'family, housing, parents, memory, old age', verb: 'put down roots' },
      { ua: '5th house', uaGen: 'the 5th house', title: 'Creativity, children, pleasure', theme: 'what you do purely for joy', area: 'romance, children, play, art, risk, self-expression', verb: 'play and create' },
      { ua: '6th house', uaGen: 'the 6th house', title: 'Work, health, routine', theme: 'daily discipline and the body at work', area: 'service, regimen, colleagues, illness, skills, animals', verb: 'work day to day' },
      { ua: '7th house', uaGen: 'the 7th house', title: 'Partnership, contracts', theme: 'who you enter an equal union with', area: 'marriage, business partners, open enemies, agreements', verb: 'make deals' },
      { ua: '8th house', uaGen: 'the 8th house', title: 'Crisis, shared resources, depth', theme: 'where you are not in control and have to trust', area: 'shared money, debt, inheritance, sex, death and rebirth, the psyche', verb: 'pass through' },
      { ua: '9th house', uaGen: 'the 9th house', title: 'Meaning, distance, worldview', theme: 'what makes your picture of the world wider', area: 'higher education, travel, other cultures, faith, law, teaching', verb: 'look for meaning' },
      { ua: '10th house', uaGen: 'the 10th house', title: 'Career, status, calling', theme: 'how the world sees you', area: 'profession, reputation, bosses, achievement, public role', verb: 'achieve' },
      { ua: '11th house', uaGen: 'the 11th house', title: 'Community, plans, friends', theme: 'who you look in the same direction with', area: 'friends, circles, projects, goals, patrons, networks', verb: 'join forces' },
      { ua: '12th house', uaGen: 'the 12th house', title: 'Solitude, the unconscious, the exit', theme: 'what lives off-camera', area: 'silence, hospitals and closed places, secrets, the spiritual, self-sabotage', verb: 'meet the invisible' }
    ],
    ASPECT: {
      conjunction: { ua: 'Conjunction', line: 'merge into one function — they work together and get in each other’s way at the same time' },
      opposition: { ua: 'Opposition', line: 'pull in opposite directions; balance only ever happens on purpose' },
      trine: { ua: 'Trine', line: 'support each other effortlessly — so effortlessly it is easy to miss' },
      square: { ua: 'Square', line: 'clash; this is exactly where the energy for growth comes from' },
      sextile: { ua: 'Sextile', line: 'cooperate well, but only if you make the first move' },
      quincunx: { ua: 'Quincunx', line: 'have no common language: you keep switching between them' },
      semisextile: { ua: 'Semisextile', line: 'snag on each other lightly, creating low background noise' },
      sesquiquadrate: { ua: 'Sesquiquadrate', line: 'create hidden friction that shows up under load' },
      semisquare: { ua: 'Semisquare', line: 'create small but persistent tension' },
      quintile: { ua: 'Quintile', line: 'give a specific talent, more obvious from outside than from within' }
    },
    ANIMAL: [
      { ua: 'Rat', text: 'A year of thrift and quick wits. It rewards whoever spots the opening first and is not too proud to start small.' },
      { ua: 'Ox', text: 'A year of methodical work. No quick leaps, but everything poured into the foundation holds for years.' },
      { ua: 'Tiger', text: 'A year of sharp moves and bold bets. The payoff goes to whoever risks first, not to whoever waits for clarity.' },
      { ua: 'Rabbit', text: 'A year of soft power: agreements, home, comfort, the way around. A frontal attack costs a lot this year.' },
      { ua: 'Dragon', text: 'A year of scale and drama. Everything happens louder than planned — the bad and the good alike.' },
      { ua: 'Snake', text: 'A year of strategy and quiet analysis. Nobody shows their hand; whoever thinks one step further wins.' },
      { ua: 'Horse', text: 'A year of speed, freedom and impatience. Everything accelerates, decisions get made on the move, sitting still is nearly impossible.' },
      { ua: 'Goat', text: 'A year of slowing down, care and craft. After the gallop you want quiet, your own people, and something made by hand.' },
      { ua: 'Monkey', text: 'A year of invention and tricks. The rules are flexible; unorthodox moves and good negotiation win.' },
      { ua: 'Rooster', text: 'A year of order, detail and honest assessment. Everything left unfinished becomes visible this year.' },
      { ua: 'Dog', text: 'A year of loyalty and principle. Who you are with matters more than what you have; fairness becomes the main question.' },
      { ua: 'Pig', text: 'A year of plenty and closure. You can exhale, gather the harvest and take stock before the next circle.' }
    ],
    STEM_EL: { wood: 'Wood', fire: 'Fire', earth: 'Earth', metal: 'Metal', water: 'Water' },
    ELEMENT5: {
      wood: 'Wood adds growth and long plans.',
      fire: 'Fire adds speed, visibility and overheating.',
      earth: 'Earth adds stability and slowness.',
      metal: 'Metal adds clarity, edges and hardness.',
      water: 'Water adds flexibility, intuition and blurred lines.'
    },
    PROFECTION: [
      null,
      'A year about you: body, presentation, a personal start. Everything is decided by your own moves.',
      'A year about resources: money, property, self-worth. The question is what you actually stand on.',
      'A year about information and the near circle: learning, texts, short trips, siblings.',
      'A year about home and roots: housing, family, parents, your private ground.',
      'A year about creativity and joy: children, romance, play, authorship, risk.',
      'A year about work and the body: routine, duties, health, daily discipline.',
      'A year about partnership: marriage, alliances, contracts, open conflict.',
      'A year about depth and other people’s resources: crises, debt, shared money, the psyche, transformation.',
      'A year about meaning and distance: study, travel, faith, a wider picture of the world.',
      'A year about status and career: public role, achievement, dealings with power.',
      'A year about community: friends, circles, plans for the future, patrons.',
      'A year about quiet and closure: solitude, inner work, the end of an old cycle.'
    ],
    TRANSIT_TONE: {
      jupiter: { ua: 'expands it and grants permission', warn: 'the risk is overestimating your strength' },
      saturn: { ua: 'demands that you grow up and tests it for strength', warn: 'it feels like pressure and not enough time' },
      uranus: { ua: 'breaks the frame and releases it', warn: 'events are sudden, control is thin' },
      neptune: { ua: 'blurs the edges and raises sensitivity', warn: 'easy to be fooled or lose focus' },
      pluto: { ua: 'rebuilds it down to the foundation', warn: 'the old version cannot be kept' },
      chiron: { ua: 'presses on an old wound', warn: 'it hurts, but this is the spot that heals' }
    },
    ASPECT_TONE: {
      conjunction: 'The aspect lands directly, with no distance — it feels like a state, not an event',
      opposition: 'The aspect puts the theme opposite you — it arrives through people and circumstances',
      square: 'The aspect works through friction: something has to be decided, postponing will not work',
      trine: 'The aspect is gentle — the opening exists, but it will not use itself',
      sextile: 'The aspect offers a chance that only works if you take it deliberately'
    }
  };

  /* --- застосування --- */

  var UK = null;

  function snapshot() {
    var M = root.INTERP_META, Y = root.YEAR, F = root.FORECAST;
    var o = { SIGN: [], ELEMENT: {}, MODALITY: {}, PLANET: {}, HOUSE: [null], ASPECT: {}, ANIMAL: [], STEM: [], ELEMENTS: [], ELEMENT5: {}, PROFECTION: [], TRANSIT_TONE: {}, ASPECT_TONE: {} };
    M.SIGN.forEach(function (s) { o.SIGN.push({ ua: s.ua, inUa: s.inUa, keys: s.keys.slice(), style: s.style }); });
    Object.keys(M.ELEMENT).forEach(function (k) { o.ELEMENT[k] = copy(M.ELEMENT[k]); });
    Object.keys(M.MODALITY).forEach(function (k) { o.MODALITY[k] = copy(M.MODALITY[k]); });
    Object.keys(M.PLANET).forEach(function (k) { o.PLANET[k] = copy(M.PLANET[k]); });
    for (var i = 1; i <= 12; i++) o.HOUSE[i] = copy(M.HOUSE[i]);
    Object.keys(M.ASPECT).forEach(function (k) { o.ASPECT[k] = copy(M.ASPECT[k]); });
    Y.ANIMAL.forEach(function (a) { o.ANIMAL.push({ ua: a.ua, text: a.text }); });
    Y.STEM.forEach(function (s) { o.STEM.push({ m: s.m, f: s.f }); });
    Y.ELEMENTS.forEach(function (e) { o.ELEMENTS.push({ ua: e.ua }); });
    Object.keys(Y.ELEMENT5).forEach(function (k) { o.ELEMENT5[k] = Y.ELEMENT5[k]; });
    o.PROFECTION = F.PROFECTION.slice();
    o.TRANSIT_TONE = JSON.parse(JSON.stringify(F.TRANSIT_TONE));
    o.ASPECT_TONE = JSON.parse(JSON.stringify(F.ASPECT_TONE));
    o.PIS = root.TEXTS_SIGN.PIS; o.ASC = root.TEXTS_SIGN.ASC_SIGN; o.PIH = root.TEXTS_HOUSE.PIH;
    return o;
  }

  function copy(o) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = Array.isArray(o[k]) ? o[k].slice() : o[k]; }); return r; }
  function assign(dst, src) { if (!dst || !src) return; Object.keys(src).forEach(function (k) { dst[k] = src[k]; }); }

  function apply(lang) {
    var M = root.INTERP_META, Y = root.YEAR, F = root.FORECAST;
    if (!UK) UK = snapshot();
    var isEn = lang === 'en';
    var S = isEn ? EN : UK;

    M.SIGN.forEach(function (s, i) { assign(s, S.SIGN[i]); });
    Object.keys(S.ELEMENT).forEach(function (k) { assign(M.ELEMENT[k], S.ELEMENT[k]); });
    Object.keys(S.MODALITY).forEach(function (k) { assign(M.MODALITY[k], S.MODALITY[k]); });
    Object.keys(S.PLANET).forEach(function (k) { assign(M.PLANET[k], S.PLANET[k]); });
    for (var i = 1; i <= 12; i++) assign(M.HOUSE[i], S.HOUSE[i]);
    Object.keys(S.ASPECT).forEach(function (k) { assign(M.ASPECT[k], S.ASPECT[k]); });

    Y.ANIMAL.forEach(function (a, j) { assign(a, S.ANIMAL[j]); });
    Y.STEM.forEach(function (st, j) {
      if (isEn) { st.m = EN.STEM_EL[st.el]; st.f = EN.STEM_EL[st.el]; }
      else assign(st, UK.STEM[j]);
    });
    Y.ELEMENTS.forEach(function (e, j) { e.ua = isEn ? EN.STEM_EL[e.id] : UK.ELEMENTS[j].ua; });
    Object.keys(Y.ELEMENT5).forEach(function (k) { Y.ELEMENT5[k] = (isEn ? EN.ELEMENT5 : UK.ELEMENT5)[k]; });

    for (var p = 1; p <= 12; p++) F.PROFECTION[p] = (isEn ? EN.PROFECTION : UK.PROFECTION)[p];
    Object.keys(F.TRANSIT_TONE).forEach(function (k) { assign(F.TRANSIT_TONE[k], (isEn ? EN.TRANSIT_TONE : UK.TRANSIT_TONE)[k]); });
    Object.keys(F.ASPECT_TONE).forEach(function (k) { F.ASPECT_TONE[k] = (isEn ? EN.ASPECT_TONE : UK.ASPECT_TONE)[k]; });

    var T = isEn && root.TEXTS_EN ? root.TEXTS_EN : null;
    root.TEXTS_SIGN.PIS = T ? T.PIS : UK.PIS;
    root.TEXTS_SIGN.ASC_SIGN = T ? T.ASC_SIGN : UK.ASC;
    root.TEXTS_HOUSE.PIH = T ? T.PIH : UK.PIH;

    LANGS.cur = lang;
    try { localStorage.setItem('natal:lang', lang); } catch (e) { /* приватний режим */ }
    document.documentElement.lang = lang;
  }

  var API = { LANGS: LANGS, L: L, apply: apply, EN: EN };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.I18N = API; root.LANGS = LANGS; root.L = L;
})(typeof globalThis !== 'undefined' ? globalThis : this);
