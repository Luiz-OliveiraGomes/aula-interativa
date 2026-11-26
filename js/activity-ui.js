(function () {
  'use strict';
  const select = document.getElementById('raup-model');
  if (!select) return;
  const buttons = document.querySelectorAll('[data-raup-model]');
  function updateSelection() {
    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.raupModel === select.value));
    });
  }
  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      select.value = button.dataset.raupModel;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  select.addEventListener('change', updateSelection);
  updateSelection();
})();
