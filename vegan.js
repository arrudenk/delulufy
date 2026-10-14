/* Тумблер «я веган». На гороскоп не впливає нічим — тільки салют і рожевіше тло. */
(function () {
  'use strict';

  var btn = document.getElementById('vegan');
  if (!btn) return;

  var EMO = ['🎉', '✨', '🌟', '💖', '🎊', '⭐', '⛓️‍💥', '💫'];
  var calm = matchMedia('(prefers-reduced-motion: reduce)');

  var wash = document.createElement('div');
  wash.id = 'veganwash';
  document.body.appendChild(wash);

  var pop = document.createElement('div');
  pop.id = 'veganpop';
  document.body.appendChild(pop);

  function burst(x, y) {
    if (calm.matches) return;
    for (var i = 0; i < 34; i++) {
      var s = document.createElement('span');
      s.textContent = EMO[i % EMO.length];
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.fontSize = (16 + (i % 5) * 5) + 'px';
      pop.appendChild(s);

      var a = (i / 34) * Math.PI * 2 + (i % 3) * .21;
      var r = 120 + (i % 7) * 46;
      var spin = (i % 2 ? 1 : -1) * (180 + (i % 5) * 90);
      var dur = 820 + (i % 6) * 130;

      var anim = s.animate([
        { transform: 'translate(-50%,-50%) scale(.3) rotate(0deg)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + Math.cos(a) * r * .62 + 'px), calc(-50% + ' +
            (Math.sin(a) * r * .62 - 70) + 'px)) scale(1.15) rotate(' + spin * .6 + 'deg)',
          opacity: 1, offset: .42 },
        { transform: 'translate(calc(-50% + ' + Math.cos(a) * r + 'px), calc(-50% + ' +
            (Math.sin(a) * r + 150) + 'px)) scale(.75) rotate(' + spin + 'deg)', opacity: 0 }
      ], { duration: dur, easing: 'cubic-bezier(.17,.67,.5,1)', fill: 'forwards' });

      anim.onfinish = function () { this.remove(); }.bind(s);   // не лишаємо вузли в DOM
    }
  }

  btn.addEventListener('click', function () {
    var on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', on);
    wash.classList.toggle('on', on);
    document.body.classList.toggle('vegan', on);
    if (on) {
      var r = btn.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2);
    }
  });
})();
