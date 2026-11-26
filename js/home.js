(function () {
  'use strict';

  const navigation = document.getElementById('home-navigation');
  const search = document.getElementById('activity-search');
  const filters = document.querySelectorAll('[data-category]');
  const sections = document.querySelectorAll('[data-catalog-category]');
  const status = document.getElementById('search-status');
  const featured = document.getElementById('featured-activities');
  let selectedCategory = 'all';

  function normalize(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  }

  function filterActivities() {
    const query = normalize(search.value);
    let total = 0;
    sections.forEach(function (section) {
      const matchesCategory = selectedCategory === 'all' || section.dataset.catalogCategory === selectedCategory;
      let visible = 0;
      section.querySelectorAll('.activity-card').forEach(function (card) {
        const matches = matchesCategory && normalize(card.dataset.title).includes(query);
        card.hidden = !matches;
        if (matches) visible++;
      });
      section.hidden = visible === 0;
      total += visible;
    });
    featured.hidden = query !== '' || selectedCategory !== 'all';
    status.hidden = query === '' && selectedCategory === 'all';
    status.textContent = total === 0
      ? 'Nenhuma atividade encontrada. Experimente outro termo ou disciplina.'
      : total + (total === 1 ? ' atividade encontrada.' : ' atividades encontradas.');
  }

  search.addEventListener('input', filterActivities);
  filters.forEach(function (button) {
    button.addEventListener('click', function () {
      selectedCategory = button.dataset.category;
      filters.forEach(function (filter) {
        filter.setAttribute('aria-pressed', String(filter === button));
      });
      filterActivities();
    });
  });

  navigation.querySelectorAll('a[href="#algebra-linear"], a[href="#calculo"]').forEach(function (link) {
    link.addEventListener('click', function () {
      search.value = '';
      selectedCategory = 'all';
      filters.forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.dataset.category === 'all'));
      });
      filterActivities();
    });
  });

  document.getElementById('contact-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subject = 'Feedback sobre o Aula Interativa';
    const body = 'Nome: ' + data.get('name') + '\nE-mail: ' + data.get('email') + '\n\n' + data.get('message');
    const feedback = document.getElementById('contact-status');
    feedback.hidden = false;
    feedback.textContent = 'Mensagem preparada. Conclua o envio no seu aplicativo de e-mail. Você também pode escrever diretamente para hectors@ect.ufrn.br.';
    window.location.href = 'mailto:hectors@ect.ufrn.br?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  });
})();
