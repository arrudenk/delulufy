/* Часові пояси через Intl: браузер має повну історичну базу tzdata,
   тож зсув для 1937 року береться правильний, разом із літнім часом. */
(function (root) {
  'use strict';

  var cache = {};
  function fmt(tz) {
    if (!cache[tz]) {
      cache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
    }
    return cache[tz];
  }

  // зсув пояса (хвилини на схід від UTC) у конкретний момент UTC
  function offsetAt(tz, utcMs) {
    var parts = fmt(tz).formatToParts(new Date(utcMs));
    var name = '';
    for (var i = 0; i < parts.length; i++) if (parts[i].type === 'timeZoneName') name = parts[i].value;
    var m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
    if (!m) return 0;
    var min = parseInt(m[2], 10) * 60 + (m[3] ? parseInt(m[3], 10) : 0);
    return m[1] === '-' ? -min : min;
  }

  /* Локальний час -> UTC. Два проходи, щоб коректно взяти зсув саме того моменту
     (на переходах DST перший здогад може дати сусідній зсув). */
  function localToUTC(tz, y, mo, d, h, mi) {
    var naive = Date.UTC(y, mo - 1, d, h, mi, 0);
    var off1 = offsetAt(tz, naive);
    var off2 = offsetAt(tz, naive - off1 * 60000);
    return { ms: naive - off2 * 60000, offset: off2 };
  }

  function utcToLocalParts(tz, utcMs) {
    var dtf = new Intl.DateTimeFormat('uk-UA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    var p = {}, parts = dtf.formatToParts(new Date(utcMs));
    for (var i = 0; i < parts.length; i++) p[parts[i].type] = parts[i].value;
    return {
      year: +p.year, month: +p.month, day: +p.day,
      hour: +(p.hour === '24' ? '00' : p.hour), minute: +p.minute
    };
  }

  function offsetLabel(min) {
    var sgn = min < 0 ? '-' : '+', a = Math.abs(min);
    return 'UTC' + sgn + String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0');
  }

  function zoneList() {
    if (typeof Intl.supportedValuesOf === 'function') {
      try { return Intl.supportedValuesOf('timeZone'); } catch (e) { /* старий рушій */ }
    }
    return null;
  }

  var API = { offsetAt: offsetAt, localToUTC: localToUTC, utcToLocalParts: utcToLocalParts, offsetLabel: offsetLabel, zoneList: zoneList };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.TZ = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
