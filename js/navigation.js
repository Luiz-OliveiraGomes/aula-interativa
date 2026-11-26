(function () {
  'use strict';
  const toggle = document.querySelector('.menu-toggle');
  const navigation = document.getElementById('home-navigation');
  if (!toggle || !navigation) return;

  toggle.addEventListener('click', function () {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    navigation.classList.toggle('is-open', open);
  });
  navigation.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navigation.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menu');
    });
  });
})();
