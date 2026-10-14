/* Астрономічне ядро: ефемериди, доми, аспекти. Без залежностей, працює і в браузері, і в node. */
(function (root) {
  'use strict';

  var DEG = Math.PI / 180, RAD = 180 / Math.PI;
  var sin = Math.sin, cos = Math.cos, tan = Math.tan, atan2 = Math.atan2, asin = Math.asin, sqrt = Math.sqrt;

  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function norm180(x) { x = norm360(x); return x > 180 ? x - 360 : x; }
  function sind(x) { return sin(x * DEG); }
  function cosd(x) { return cos(x * DEG); }
  function tand(x) { return tan(x * DEG); }

  /* ---------- час ---------- */

  // JD з UTC-компонентів (григоріанський календар)
  function julianDay(y, m, d, hour, min, sec) {
    var day = d + (hour + min / 60 + (sec || 0) / 3600) / 24;
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    if (y < 1582 || (y === 1582 && (m < 10 || (m === 10 && day < 15)))) B = 0;
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
  }

  function jdToDate(jd) {
    var z = Math.floor(jd + 0.5), f = jd + 0.5 - z, A = z;
    if (z >= 2299161) { var a = Math.floor((z - 1867216.25) / 36524.25); A = z + 1 + a - Math.floor(a / 4); }
    var B = A + 1524, C = Math.floor((B - 122.1) / 365.25), D = Math.floor(365.25 * C),
      E = Math.floor((B - D) / 30.6001);
    var day = B - D - Math.floor(30.6001 * E) + f;
    var month = E < 14 ? E - 1 : E - 13;
    var year = month > 2 ? C - 4716 : C - 4715;
    var di = Math.floor(day), frac = (day - di) * 24;
    var h = Math.floor(frac), mi = Math.floor((frac - h) * 60), s = Math.round((((frac - h) * 60) - mi) * 60);
    if (s >= 60) { s -= 60; mi++; } if (mi >= 60) { mi -= 60; h++; }
    return { year: year, month: month, day: di, hour: h, minute: mi, second: s };
  }

  // ΔT = TT - UT, поліноми Espenak & Meeus
  function deltaT(year) {
    var t, u;
    if (year < 1600) { u = (year - 1000) / 100; return 1574.2 - 556.01 * u + 71.23472 * u * u + 0.319781 * u * u * u; }
    if (year < 1700) { t = year - 1600; return 120 - 0.9808 * t - 0.01532 * t * t + t * t * t / 7129; }
    if (year < 1800) { t = year - 1700; return 8.83 + 0.1603 * t - 0.0059285 * t * t + 0.00013336 * t * t * t - t * t * t * t / 1174000; }
    if (year < 1860) { t = year - 1800; return 13.72 - 0.332447 * t + 0.0068612 * t * t + 0.0041116 * t * t * t - 0.00037436 * Math.pow(t, 4) + 0.0000121272 * Math.pow(t, 5) - 0.0000001699 * Math.pow(t, 6) + 0.000000000875 * Math.pow(t, 7); }
    if (year < 1900) { t = year - 1860; return 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t * t * t - 0.0004473624 * Math.pow(t, 4) + t * t * t * t * t / 233174; }
    if (year < 1920) { t = year - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * Math.pow(t, 4); }
    if (year < 1941) { t = year - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t; }
    if (year < 1961) { t = year - 1950; return 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547; }
    if (year < 1986) { t = year - 1975; return 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718; }
    if (year < 2005) { t = year - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t + 0.000651814 * Math.pow(t, 4) + 0.00002373599 * Math.pow(t, 5); }
    if (year < 2050) { t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    if (year < 2150) { return -20 + 32 * Math.pow((year - 1820) / 100, 2) - 0.5628 * (2150 - year); }
    u = (year - 1820) / 100; return -20 + 32 * u * u;
  }

  function jdUTtoTT(jdUT) {
    var y = jdToDate(jdUT).year + 0.5;
    return jdUT + deltaT(y) / 86400;
  }

  // Середній зоряний час Грінвіча (град) з JD UT
  function gmst(jdUT) {
    var T = (jdUT - 2451545.0) / 36525;
    var th = 280.46061837 + 360.98564736629 * (jdUT - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000;
    return norm360(th);
  }

  /* ---------- нутація та нахил ---------- */

  function nutation(T) {
    var D = 297.85036 + 445267.111480 * T - 0.0019142 * T * T + T * T * T / 189474;
    var M = 357.52772 + 35999.050340 * T - 0.0001603 * T * T - T * T * T / 300000;
    var Mp = 134.96298 + 477198.867398 * T + 0.0086972 * T * T + T * T * T / 56250;
    var F = 93.27191 + 483202.017538 * T - 0.0036825 * T * T + T * T * T / 327270;
    var Om = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000;
    var dpsi = (-171996 - 174.2 * T) * sind(Om)
      + (-13187 - 1.6 * T) * sind(-2 * D + 2 * F + 2 * Om)
      + (-2274 - 0.2 * T) * sind(2 * F + 2 * Om)
      + (2062 + 0.2 * T) * sind(2 * Om)
      + (1426 - 3.4 * T) * sind(M)
      + (712 + 0.1 * T) * sind(Mp)
      + (-517 + 1.2 * T) * sind(-2 * D + M + 2 * F + 2 * Om)
      + (-386 - 0.4 * T) * sind(2 * F + Om)
      - 301 * sind(Mp + 2 * F + 2 * Om)
      + (217 - 0.5 * T) * sind(-2 * D - M + 2 * F + 2 * Om)
      - 158 * sind(-2 * D + Mp)
      + (129 + 0.1 * T) * sind(-2 * D + 2 * F + Om)
      + 123 * sind(-Mp + 2 * F + 2 * Om)
      + 63 * sind(2 * D)
      + (63 + 0.1 * T) * sind(Mp + Om)
      - 59 * sind(2 * D - Mp + 2 * F + 2 * Om)
      + (-58 - 0.1 * T) * sind(-Mp + Om)
      - 51 * sind(Mp + 2 * F + Om);
    var deps = (92025 + 8.9 * T) * cosd(Om)
      + (5736 - 3.1 * T) * cosd(-2 * D + 2 * F + 2 * Om)
      + (977 - 0.5 * T) * cosd(2 * F + 2 * Om)
      + (-895 + 0.5 * T) * cosd(2 * Om)
      + (54 - 0.1 * T) * cosd(M)
      - 7 * cosd(Mp)
      + (224 - 0.6 * T) * cosd(-2 * D + M + 2 * F + 2 * Om)
      + 200 * cosd(2 * F + Om)
      + (129 - 0.1 * T) * cosd(Mp + 2 * F + 2 * Om)
      + (-95 + 0.3 * T) * cosd(-2 * D - M + 2 * F + 2 * Om);
    return { dpsi: dpsi / 36000000, deps: deps / 36000000 }; // 0.0001" -> град
  }

  function meanObliquity(T) {
    var U = T / 100;
    return 23.43929111 - 1.300258333 * U - 0.00043055556 * U * U + 0.555347222 * Math.pow(U, 3)
      - 0.014272222 * Math.pow(U, 4) - 0.069327778 * Math.pow(U, 5) + 0.010865833 * Math.pow(U, 6)
      + 0.0098227778 * Math.pow(U, 7) + 0.0014741667 * Math.pow(U, 8) - 0.00085527778 * Math.pow(U, 9)
      - 0.00017627778 * Math.pow(U, 10);
  }

  /* ---------- Місяць (Meeus, гл. 47) ---------- */

  var MOON_L = [
    [0, 0, 1, 0, 6288774, -20905355], [2, 0, -1, 0, 1274027, -3699111], [2, 0, 0, 0, 658314, -2955968],
    [0, 0, 2, 0, 213618, -569925], [0, 1, 0, 0, -185116, 48888], [0, 0, 0, 2, -114332, -3149],
    [2, 0, -2, 0, 58793, 246158], [2, -1, -1, 0, 57066, -152138], [2, 0, 1, 0, 53322, -170733],
    [2, -1, 0, 0, 45758, -204586], [0, 1, -1, 0, -40923, -129620], [1, 0, 0, 0, -34720, 108743],
    [0, 1, 1, 0, -30383, 104755], [2, 0, 0, -2, 15327, 10321], [0, 0, 1, 2, -12528, 0],
    [0, 0, 1, -2, 10980, 79661], [4, 0, -1, 0, 10675, -34782], [0, 0, 3, 0, 10034, -23210],
    [4, 0, -2, 0, 8548, -21636], [2, 1, -1, 0, -7888, 24208], [2, 1, 0, 0, -6766, 30824],
    [1, 0, -1, 0, -5163, -8379], [1, 1, 0, 0, 4987, -16675], [2, -1, 1, 0, 4036, -12831],
    [2, 0, 2, 0, 3994, -10445], [4, 0, 0, 0, 3861, -11650], [2, 0, -3, 0, 3665, 14403],
    [0, 1, -2, 0, -2689, -7003], [2, 0, -1, 2, -2602, 0], [2, -1, -2, 0, 2390, 10056],
    [1, 0, 1, 0, -2348, 6322], [2, -2, 0, 0, 2236, -9884], [0, 1, 2, 0, -2120, 5751],
    [0, 2, 0, 0, -2069, 0], [2, -2, -1, 0, 2048, -4950], [2, 0, 1, -2, -1773, 4130],
    [2, 0, 0, 2, -1595, 0], [4, -1, -1, 0, 1215, -3958], [0, 0, 2, 2, -1110, 0],
    [3, 0, -1, 0, -892, 3258], [2, 1, 1, 0, -810, 2616], [4, -1, -2, 0, 759, -1897],
    [0, 2, -1, 0, -713, -2117], [2, 2, -1, 0, -700, 2354], [2, 1, -2, 0, 691, 0],
    [2, -1, 0, -2, 596, 0], [4, 0, 1, 0, 549, -1423], [0, 0, 4, 0, 537, -1117],
    [4, -1, 0, 0, 520, -1571], [1, 0, -2, 0, -487, -1739], [2, 1, 0, -2, -399, 0],
    [0, 0, 2, -2, -381, -4421], [1, 1, 1, 0, 351, 0], [3, 0, -2, 0, -340, 0],
    [4, 0, -3, 0, 330, 0], [2, -1, 2, 0, 327, 0], [0, 2, 1, 0, -323, 1165],
    [1, 1, -1, 0, 299, 0], [2, 0, 3, 0, 294, 0], [2, 0, -1, -2, 0, 8752]
  ];

  var MOON_B = [
    [0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237],
    [2, 0, -1, 1, 55413], [2, 0, -1, -1, 46271], [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198],
    [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822], [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324],
    [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359], [2, -1, -1, 1, 2463], [2, -1, 0, 1, 2211],
    [2, -1, -1, -1, 2065], [0, 1, -1, -1, -1870], [4, 0, -1, -1, 1828], [0, 1, 0, 1, -1794],
    [0, 0, 0, 3, -1749], [0, 1, -1, 1, -1565], [1, 0, 0, 1, -1491], [0, 1, 1, 1, -1475],
    [0, 1, 1, -1, -1410], [0, 1, 0, -1, -1344], [1, 0, 0, -1, -1335], [0, 0, 3, 1, 1107],
    [4, 0, 0, -1, 1021], [4, 0, -1, 1, 833], [0, 0, 1, -3, 777], [4, 0, -2, 1, 671],
    [2, 0, 0, -3, 607], [2, 0, 2, -1, 596], [2, -1, 1, -1, 491], [2, 0, -2, 1, -451],
    [0, 0, 3, -1, 439], [2, 0, 2, 1, 422], [2, 0, -3, -1, 421], [2, 1, -1, 1, -366],
    [2, 1, 0, 1, -351], [4, 0, 0, 1, 331], [2, -1, 1, 1, 315], [2, -2, 0, -1, 302],
    [0, 0, 1, 3, -283], [2, 1, 1, -1, -229], [1, 1, 0, -1, 223], [1, 1, 0, 1, 223],
    [0, 1, -2, -1, -220], [2, 1, -1, -1, -220], [1, 0, 1, 1, -185], [2, -1, -2, -1, 181],
    [0, 1, 2, 1, -177], [4, 0, -2, -1, 176], [4, -1, -1, -1, 166], [1, 0, 1, -1, -164],
    [4, 0, 1, -1, 132], [1, 0, -1, -1, -119], [4, -1, 0, -1, 115], [2, -2, 0, 1, 107]
  ];

  function moonPosition(T) {
    var Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841 - Math.pow(T, 4) / 65194000);
    var D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868 - Math.pow(T, 4) / 113065000);
    var M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T * T * T / 24490000);
    var Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699 - Math.pow(T, 4) / 14712000);
    var F = norm360(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - T * T * T / 3526000 + Math.pow(T, 4) / 863310000);
    var A1 = norm360(119.75 + 131.849 * T), A2 = norm360(53.09 + 479264.290 * T), A3 = norm360(313.45 + 481266.484 * T);
    var E = 1 - 0.002516 * T - 0.0000074 * T * T;

    var sl = 0, sr = 0, sb = 0, i, t, arg, f;
    for (i = 0; i < MOON_L.length; i++) {
      t = MOON_L[i]; arg = t[0] * D + t[1] * M + t[2] * Mp + t[3] * F;
      f = Math.abs(t[1]) === 1 ? E : (Math.abs(t[1]) === 2 ? E * E : 1);
      sl += t[4] * f * sind(arg); sr += t[5] * f * cosd(arg);
    }
    for (i = 0; i < MOON_B.length; i++) {
      t = MOON_B[i]; arg = t[0] * D + t[1] * M + t[2] * Mp + t[3] * F;
      f = Math.abs(t[1]) === 1 ? E : (Math.abs(t[1]) === 2 ? E * E : 1);
      sb += t[4] * f * sind(arg);
    }
    sl += 3958 * sind(A1) + 1962 * sind(Lp - F) + 318 * sind(A2);
    sb += -2235 * sind(Lp) + 382 * sind(A3) + 175 * sind(A1 - F) + 175 * sind(A1 + F)
      + 127 * sind(Lp - Mp) - 115 * sind(Lp + Mp);

    return {
      lon: norm360(Lp + sl / 1e6),
      lat: sb / 1e6,
      dist: 385000.56 + sr / 1000,      // км
      args: { Lp: Lp, D: D, M: M, Mp: Mp, F: F }
    };
  }

  /* ---------- планети: наближені кеплерові елементи JPL (1800–2050) ---------- */

  var PLANETS = {
    mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593,
      0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    venus: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255,
      0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
    earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0,
      0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
    mars: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891,
      0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
    jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909,
      -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
    saturn: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448,
      -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
    uranus: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503,
      -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
    neptune: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574,
      0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
    pluto: [39.48211675, 0.24882730, 17.14001206, 238.92903833, 224.06891629, 110.30393684,
      -0.00031596, 0.00005170, 0.00004818, 145.20780515, -0.04062942, -0.01183482]
  };

  function meanAnomaly(name, T) {
    var p = PLANETS[name];
    return norm360((p[3] + p[9] * T) - (p[4] + p[10] * T));
  }

  /* VSOP87D для Юпітера й Сатурна: кеплерових елементів замало (велика нерівність дає до 12'). */
  var VSOP = (typeof require === 'function' && typeof module !== 'undefined')
    ? require('./vsop87.js') : root.VSOP87;

  function vsopSum(series, tau) {
    var s = 0;
    for (var k = 0; k < series.length; k++) {
      var arr = series[k], sub = 0;
      for (var i = 0; i < arr.length; i += 3) sub += arr[i] * cos(arr[i + 1] + arr[i + 2] * tau);
      s += sub * Math.pow(tau, k);
    }
    return s;
  }

  // Геліоцентричний вектор з VSOP87D (екліптика дати) -> J2000
  function vsopVector(name, T) {
    var tau = T / 10, v = VSOP[name];
    var L = vsopSum(v.L, tau) * 1e-8 * RAD, B = vsopSum(v.B, tau) * 1e-8 * RAD, R = vsopSum(v.R, tau) * 1e-8;
    var j = precessEcliptic(norm360(L), B, T, -T);   // дата -> J2000
    return { x: R * cosd(j.lat) * cosd(j.lon), y: R * cosd(j.lat) * sind(j.lon), z: R * sind(j.lat) };
  }

  // Геліоцентричний прямокутний вектор в екліптиці J2000 (а.о.)
  function helioVector(name, T) {
    if (VSOP && VSOP[name]) return vsopVector(name, T);
    var p = PLANETS[name];
    var a = p[0] + p[6] * T, e = p[1] + p[7] * T, I = p[2] + p[8] * T,
      L = p[3] + p[9] * T, wbar = p[4] + p[10] * T, Om = p[5] + p[11] * T;
    var w = wbar - Om, Mn = norm180(L - wbar);
    var Ecc = Mn + (e * RAD) * sind(Mn), dE = 1, k = 0;
    while (Math.abs(dE) > 1e-9 && k++ < 60) {
      dE = (Mn - (Ecc - e * RAD * sind(Ecc))) / (1 - e * cosd(Ecc));
      Ecc += dE;
    }
    var xp = a * (cosd(Ecc) - e), yp = a * sqrt(1 - e * e) * sind(Ecc);
    var cw = cosd(w), sw = sind(w), cO = cosd(Om), sO = sind(Om), cI = cosd(I), sI = sind(I);
    var v = {
      x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
      y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
      z: (sw * sI) * xp + (cw * sI) * yp
    };
    return v;
  }

  // Строгий перехід екліптичних координат між епохами (Meeus 21.5). Без t: з J2000 на T0.
  function precessEcliptic(lon, lat, T0, t) {
    if (t === undefined) { t = T0; T0 = 0; }
    var S = 1 / 3600;
    var eta = ((47.0029 - 0.06603 * T0 + 0.000598 * T0 * T0) * t + (-0.03302 + 0.000598 * T0) * t * t + 0.000060 * t * t * t) * S;
    var Pi = 174.876384 + (3289.4789 * T0 + 0.60622 * T0 * T0 - (869.8089 + 0.50491 * T0) * t + 0.03536 * t * t) * S;
    var p = ((5029.0966 + 2.22226 * T0 - 0.000042 * T0 * T0) * t + (1.11113 - 0.000042 * T0) * t * t - 0.000006 * t * t * t) * S;
    var d = Pi - lon;
    var A = cosd(eta) * cosd(lat) * sind(d) - sind(eta) * sind(lat);
    var B = cosd(lat) * cosd(d);
    var C = cosd(eta) * sind(lat) + sind(eta) * cosd(lat) * sind(d);
    return { lon: norm360(p + Pi - atan2(A, B) * RAD), lat: asin(C) * RAD };
  }

  var C_AUD = 173.1446; // а.о. за добу

  function geoEcliptic(name, T, earthVec) {
    var p = helioVector(name, T);
    var dx = p.x - earthVec.x, dy = p.y - earthVec.y, dz = p.z - earthVec.z;
    var dist = sqrt(dx * dx + dy * dy + dz * dz);
    // одна ітерація світлового часу
    var T2 = T - (dist / C_AUD) / 36525;
    p = helioVector(name, T2);
    dx = p.x - earthVec.x; dy = p.y - earthVec.y; dz = p.z - earthVec.z;
    dist = sqrt(dx * dx + dy * dy + dz * dz);
    var pr = precessEcliptic(atan2(dy, dx) * RAD, asin(dz / dist) * RAD, T);
    return { lon: pr.lon, lat: pr.lat, dist: dist };
  }

  function earthVector(T) {
    var emb = helioVector('earth', T);
    var m = moonPosition(T);
    // перехід від барицентру Земля–Місяць до центру Землі (зсув ~3e-5 а.о., система координат тут не важлива)
    var r = m.dist / 149597870.7;
    var lon = m.lon, lat = m.lat;
    var mx = r * cosd(lat) * cosd(lon), my = r * cosd(lat) * sind(lon), mz = r * sind(lat);
    var f = 1 / 82.30056;
    return { x: emb.x - f * mx, y: emb.y - f * my, z: emb.z - f * mz };
  }

  /* ---------- склад гороскопу ---------- */

  var BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node', 'lilith', 'chiron'];

  /* Хірон: оскулюючі елементи (JPL SBDB), перигелій 1996-02-14. Орбіта хаотична,
     тож це наближення ~0.3° у XX–XXI ст. — позначаємо як approx. */
  var CHIRON = { a: 13.6482, e: 0.3822, i: 6.9354, Om: 209.2495, w: 339.6405, tp: 2450127.5 };

  function chironVector(T) {
    var p = CHIRON;
    var a = p.a, e = p.e, I = p.i, Om = p.Om, w = p.w;
    var n = 0.9856076686 / (a * sqrt(a));              // град/добу
    var M = norm180(n * (2451545.0 + T * 36525 - p.tp));
    var Ecc = M + e * RAD * sind(M), dE = 1, k = 0;
    while (Math.abs(dE) > 1e-9 && k++ < 60) { dE = (M - (Ecc - e * RAD * sind(Ecc))) / (1 - e * cosd(Ecc)); Ecc += dE; }
    var xp = a * (cosd(Ecc) - e), yp = a * sqrt(1 - e * e) * sind(Ecc);
    var cw = cosd(w), sw = sind(w), cO = cosd(Om), sO = sind(Om), cI = cosd(I), sI = sind(I);
    return {
      x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
      y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
      z: (sw * sI) * xp + (cw * sI) * yp
    };
  }

  // Істинний (оскулюючий) висхідний вузол Місяця з векторного добутку положень
  function trueNode(T) {
    var dt = 0.02 / 36525;
    function vec(t) {
      var m = moonPosition(t);
      var la = m.lat, lo = m.lon;
      return [cosd(la) * cosd(lo), cosd(la) * sind(lo), sind(la)];
    }
    var r1 = vec(T - dt), r2 = vec(T + dt);
    var n = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]];
    // лінія вузлів = z × n
    return norm360(atan2(n[0], -n[1]) * RAD);
  }

  function meanNode(T) {
    return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441 - Math.pow(T, 4) / 60616000);
  }

  // Чорна Місяць (середній апогей)
  function lilith(T) {
    var Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841;
    var Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699;
    return norm360(Lp - Mp + 180);
  }

  /* Повертає довготи всіх світил на момент jdUT (апаратні, тропічні, на дату). */
  function positions(jdUT, opts) {
    opts = opts || {};
    var jdTT = jdUTtoTT(jdUT);
    var T = (jdTT - 2451545.0) / 36525;
    var nut = nutation(T);
    var ev = earthVector(T);
    var out = {};

    // Сонце = протилежність геліоцентричній Землі
    var sr = sqrt(ev.x * ev.x + ev.y * ev.y + ev.z * ev.z);
    var sp = precessEcliptic(atan2(-ev.y, -ev.x) * RAD, asin(-ev.z / sr) * RAD, T);
    out.sun = { lon: norm360(sp.lon + nut.dpsi - 0.00569), lat: sp.lat, dist: sr };

    var m = moonPosition(T);
    out.moon = { lon: norm360(m.lon + nut.dpsi), lat: m.lat, dist: m.dist / 149597870.7 };

    ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].forEach(function (n) {
      var g = geoEcliptic(n, T, ev);
      g.lon = norm360(g.lon + nut.dpsi - 0.00569);
      out[n] = g;
    });

    // Хірон
    var ch = chironVector(T);
    var dx = ch.x - ev.x, dy = ch.y - ev.y, dz = ch.z - ev.z;
    var cd = sqrt(dx * dx + dy * dy + dz * dz);
    var cp = precessEcliptic(atan2(dy, dx) * RAD, asin(dz / cd) * RAD, T);
    out.chiron = { lon: cp.lon, lat: cp.lat, dist: cd, approx: true };

    out.node = { lon: opts.meanNode ? norm360(meanNode(T) + nut.dpsi) : norm360(trueNode(T) + nut.dpsi), lat: 0, dist: 0 };
    out.southnode = { lon: norm360(out.node.lon + 180), lat: 0, dist: 0 };
    out.lilith = { lon: norm360(lilith(T) + nut.dpsi), lat: 0, dist: 0 };

    out._meta = { jdUT: jdUT, jdTT: jdTT, T: T, eps: meanObliquity(T) + nut.deps, nut: nut };
    return out;
  }

  // Швидкість за довготою (град/добу) — для визначення ретроградності
  function speed(body, jdUT, opts) {
    var h = 0.5;
    var a = positions(jdUT - h, opts)[body].lon, b = positions(jdUT + h, opts)[body].lon;
    var d = norm180(b - a);
    return d / (2 * h);
  }

  /* ---------- доми ---------- */

  function eclToEq(lon, lat, eps) {
    var sl = sind(lon), cl = cosd(lon), sb = sind(lat), cb = cosd(lat), se = sind(eps), ce = cosd(eps);
    var ra = atan2(sl * ce - (sb / cb) * se, cl) * RAD;
    if (!isFinite(ra)) ra = atan2(sl * ce, cl) * RAD;
    var dec = asin(sb * ce + cb * se * sl) * RAD;
    return { ra: norm360(ra), dec: dec };
  }

  function ascendant(ramc, eps, lat) {
    var y = cosd(ramc), x = -(sind(ramc) * cosd(eps) + tand(lat) * sind(eps));
    var asc = norm360(atan2(y, x) * RAD);
    // точка, що сходить, ще не кульмінувала: годинний кут від'ємний
    var eq = eclToEq(asc, 0, eps);
    if (norm180(ramc - eq.ra) > 0) asc = norm360(asc + 180);
    return asc;
  }

  function mc(ramc, eps) {
    var m = norm360(atan2(sind(ramc), cosd(ramc) * cosd(eps)) * RAD);
    if (Math.abs(norm180(m - ramc)) > 90) m = norm360(m + 180);
    return m;
  }

  function lonFromRA(ra, eps) { return norm360(atan2(sind(ra), cosd(ra) * cosd(eps)) * RAD); }

  // Плацидус: cusp з оберт. зсувом off та часткою ascensional difference
  function placidusCusp(ramc, eps, lat, off, adFactor) {
    var ra = ramc + off, lon = 0;
    for (var i = 0; i < 40; i++) {
      lon = lonFromRA(ra, eps);
      // квадрант: тримаємо довготу біля розрахункового RA
      if (Math.abs(norm180(lon - norm360(ra))) > 90) lon = norm360(lon + 180);
      var dec = asin(sind(eps) * sind(lon)) * RAD;
      var t = tand(dec) * tand(lat);
      if (Math.abs(t) >= 1) return null;           // приполярний збій
      var ad = asin(t) * RAD;
      var ra2 = ramc + off + adFactor * ad;
      if (Math.abs(norm180(ra2 - ra)) < 1e-7) { ra = ra2; break; }
      ra = ra2;
    }
    lon = lonFromRA(ra, eps);
    if (Math.abs(norm180(lon - norm360(ra))) > 90) lon = norm360(lon + 180);
    return lon;
  }

  // Куспіди 4–9 — протилежні до 10,11,12,1,2,3
  function fillOpposites(c) {
    c[4] = norm360(c[10] + 180); c[5] = norm360(c[11] + 180); c[6] = norm360(c[12] + 180);
    c[7] = norm360(c[1] + 180); c[8] = norm360(c[2] + 180); c[9] = norm360(c[3] + 180);
    return c;
  }

  function porphyry(asc, mcv) {
    var c = new Array(13);
    c[1] = asc; c[10] = mcv;
    var q1 = norm360(asc - mcv) / 3;      // від MC до ASC
    c[11] = norm360(mcv + q1); c[12] = norm360(mcv + 2 * q1);
    var q2 = norm360(norm360(mcv + 180) - asc) / 3;
    c[2] = norm360(asc + q2); c[3] = norm360(asc + 2 * q2);
    return fillOpposites(c);
  }

  function houses(jdUT, lat, lon, system, eps) {
    var T = (jdUTtoTT(jdUT) - 2451545.0) / 36525, nut = nutation(T);
    if (eps === undefined) eps = meanObliquity(T) + nut.deps;
    // істинний зоряний час: рівняння рівнодень дає до 0.3' по MC
    var ramc = norm360(gmst(jdUT) + nut.dpsi * cosd(eps) + lon);
    var mcv = mc(ramc, eps);
    var asc = ascendant(ramc, eps, lat);
    var c = new Array(13), i, fallback = null;

    if (system === 'whole') {
      var start = Math.floor(asc / 30) * 30;
      for (i = 1; i <= 12; i++) c[i] = norm360(start + (i - 1) * 30);
    } else if (system === 'equal') {
      for (i = 1; i <= 12; i++) c[i] = norm360(asc + (i - 1) * 30);
    } else if (system === 'porphyry') {
      c = porphyry(asc, mcv);
    } else { // placidus
      var c11 = placidusCusp(ramc, eps, lat, 30, 1 / 3);
      var c12 = placidusCusp(ramc, eps, lat, 60, 2 / 3);
      var c2 = placidusCusp(ramc, eps, lat, 120, 2 / 3);
      var c3 = placidusCusp(ramc, eps, lat, 150, 1 / 3);
      if (c11 === null || c12 === null || c2 === null || c3 === null) {
        c = porphyry(asc, mcv); fallback = 'porphyry';
      } else {
        c[1] = asc; c[10] = mcv; c[11] = c11; c[12] = c12; c[2] = c2; c[3] = c3;
        fillOpposites(c);
      }
    }
    return { cusps: c, asc: asc, mc: mcv, ramc: ramc, system: fallback || system, fallback: fallback };
  }

  function houseOf(lon, cusps) {
    for (var i = 1; i <= 12; i++) {
      var a = cusps[i], b = cusps[i === 12 ? 1 : i + 1];
      var span = norm360(b - a), x = norm360(lon - a);
      if (span === 0) span = 360;
      if (x < span) return i;
    }
    return 1;
  }

  /* ---------- аспекти ---------- */

  var ASPECTS = [
    { id: 'conjunction', angle: 0, orb: 8, nature: 'major' },
    { id: 'opposition', angle: 180, orb: 8, nature: 'major' },
    { id: 'trine', angle: 120, orb: 7, nature: 'major' },
    { id: 'square', angle: 90, orb: 7, nature: 'major' },
    { id: 'sextile', angle: 60, orb: 5, nature: 'major' },
    { id: 'quincunx', angle: 150, orb: 3, nature: 'minor' },
    { id: 'semisextile', angle: 30, orb: 2, nature: 'minor' },
    { id: 'sesquiquadrate', angle: 135, orb: 2, nature: 'minor' },
    { id: 'semisquare', angle: 45, orb: 2, nature: 'minor' },
    { id: 'quintile', angle: 72, orb: 1.5, nature: 'minor' }
  ];

  var ORB_WEIGHT = { sun: 1.25, moon: 1.25, mercury: 1, venus: 1, mars: 1, jupiter: 1, saturn: 1, uranus: 0.9, neptune: 0.9, pluto: 0.9, node: 0.6, lilith: 0.6, chiron: 0.6, asc: 1.15, mc: 1.15 };

  function findAspects(points, opts) {
    opts = opts || {};
    var keys = Object.keys(points), res = [];
    for (var i = 0; i < keys.length; i++) {
      for (var j = i + 1; j < keys.length; j++) {
        var a = keys[i], b = keys[j];
        if ((a === 'asc' && b === 'mc') || (a === 'mc' && b === 'asc')) continue;
        var diff = Math.abs(norm180(points[a] - points[b]));
        for (var k = 0; k < ASPECTS.length; k++) {
          var asp = ASPECTS[k];
          if (asp.nature === 'minor' && !opts.minor) continue;
          var w = ((ORB_WEIGHT[a] || 1) + (ORB_WEIGHT[b] || 1)) / 2;
          var orb = asp.orb * w;
          var d = Math.abs(diff - asp.angle);
          if (d <= orb) {
            res.push({ a: a, b: b, type: asp.id, angle: asp.angle, orb: d, exactness: 1 - d / orb, nature: asp.nature });
            break;
          }
        }
      }
    }
    res.sort(function (x, y) { return y.exactness - x.exactness; });
    return res;
  }

  /* ---------- зручні обгортки ---------- */

  var SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  function signIndex(lon) { return Math.floor(norm360(lon) / 30); }
  function signOf(lon) { return SIGNS[signIndex(lon)]; }
  function degInSign(lon) { return norm360(lon) % 30; }

  function buildChart(jdUT, lat, lon, system, opts) {
    opts = opts || {};
    var pos = positions(jdUT, opts);
    // один прохід на ±0.5 доби замість окремого виклику на кожне світило
    var p0 = positions(jdUT - 0.5, opts), p1 = positions(jdUT + 0.5, opts);
    var h = houses(jdUT, lat, lon, system || 'placidus', pos._meta.eps);
    var points = {}, bodies = {};
    BODIES.forEach(function (b) {
      var sp = norm180(p1[b].lon - p0[b].lon);
      bodies[b] = {
        id: b, lon: pos[b].lon, lat: pos[b].lat, dist: pos[b].dist,
        sign: signOf(pos[b].lon), signIndex: signIndex(pos[b].lon), deg: degInSign(pos[b].lon),
        speed: sp, retro: sp < 0, house: houseOf(pos[b].lon, h.cusps),
        approx: !!pos[b].approx
      };
      points[b] = pos[b].lon;
    });
    bodies.southnode = {
      id: 'southnode', lon: pos.southnode.lon, lat: 0, sign: signOf(pos.southnode.lon),
      signIndex: signIndex(pos.southnode.lon), deg: degInSign(pos.southnode.lon),
      speed: bodies.node.speed, retro: bodies.node.retro, house: houseOf(pos.southnode.lon, h.cusps)
    };
    points.asc = h.asc; points.mc = h.mc;

    var aspects = findAspects(points, { minor: opts.minor !== false });
    return {
      jdUT: jdUT, lat: lat, lon: lon, eps: pos._meta.eps,
      bodies: bodies, houses: h, aspects: aspects, points: points
    };
  }

  var API = {
    DEG: DEG, RAD: RAD, norm360: norm360, norm180: norm180,
    julianDay: julianDay, jdToDate: jdToDate, deltaT: deltaT, jdUTtoTT: jdUTtoTT, gmst: gmst,
    nutation: nutation, meanObliquity: meanObliquity,
    moonPosition: moonPosition, helioVector: helioVector, positions: positions, speed: speed,
    houses: houses, houseOf: houseOf, ascendant: ascendant, mc: mc, eclToEq: eclToEq,
    findAspects: findAspects, ASPECTS: ASPECTS, BODIES: BODIES, SIGNS: SIGNS,
    signOf: signOf, signIndex: signIndex, degInSign: degInSign, buildChart: buildChart,
    trueNode: trueNode, meanNode: meanNode
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.ASTRO = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
