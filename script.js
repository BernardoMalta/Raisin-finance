/* ==========================================================================
   RAISIN FINANCE — script.js
   Navigation, course content, expense tracker, and progress/certification.

   DATA PERSISTENCE NOTE:
   This build keeps all data in memory (the `AppState` object below) for the
   current session only. When you deploy this outside of the Claude preview
   sandbox, browser storage works normally — swap the load()/save() functions
   at the bottom of this file for the commented-out localStorage versions to
   persist data between visits.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 1. CONTENT: courses & categories
   * ------------------------------------------------------------------ */
  const CATEGORY_LABELS = {
    fundamentos: 'Fundamentos',
    orcamento: 'Orçamento',
    reserva: 'Reserva de emergência',
    investimentos: 'Investimentos',
    metas: 'Definição de metas'
  };

  const COURSES = [
    {
      id: 'c1',
      category: 'fundamentos',
      icon: '📘',
      title: 'Fundamentos de finanças pessoais',
      desc: 'Entenda como renda, gastos e patrimônio se conectam antes de partir para estratégias mais avançadas.',
      videoId: 'HQzoZfc3GwQ',
      lessons: [
        { title: 'O que é saúde financeira', minutes: 6 },
        { title: 'Renda ativa vs. patrimônio', minutes: 8 },
        { title: 'Construindo hábitos financeiros', minutes: 7 },
        { title: 'Erros comuns no início', minutes: 5 }
      ]
    },
    {
      id: 'c2',
      category: 'orcamento',
      icon: '📊',
      title: 'Noções básicas de orçamento',
      desc: 'Aprenda o método 50/30/20 e como montar um orçamento mensal que você realmente vai seguir.',
      videoId: 'sVKQn2I4HDM',
      lessons: [
        { title: 'Por que orçamentos falham', minutes: 5 },
        { title: 'O método 50/30/20', minutes: 9 },
        { title: 'Categorizando seus gastos', minutes: 6 },
        { title: 'Revisão semanal de orçamento', minutes: 4 }
      ]
    },
    {
      id: 'c3',
      category: 'reserva',
      icon: '🛟',
      title: 'Construindo um fundo de emergência',
      desc: 'Passo a passo para juntar de 3 a 6 meses de despesas essenciais com segurança e consistência.',
      videoId: 'Nj0MZ6eSJd4',
      lessons: [
        { title: 'Quanto guardar e onde', minutes: 7 },
        { title: 'Automatizando aportes', minutes: 5 },
        { title: 'Quando usar sua reserva', minutes: 4 }
      ]
    },
    {
      id: 'c4',
      category: 'investimentos',
      icon: '📈',
      title: 'Introdução a investimentos',
      desc: 'Os conceitos essenciais — risco, liquidez e diversificação — antes do seu primeiro aporte.',
      videoId: 'gFQNPmLKj1k',
      lessons: [
        { title: 'Risco, retorno e liquidez', minutes: 8 },
        { title: 'Renda fixa vs. renda variável', minutes: 9 },
        { title: 'Diversificação na prática', minutes: 7 },
        { title: 'Erros comuns de iniciantes', minutes: 6 }
      ]
    },
    {
      id: 'c5',
      category: 'metas',
      icon: '🎯',
      title: 'Estrutura de definição de metas',
      desc: 'Transforme sonhos financeiros em metas SMART com prazos e valores realistas.',
      videoId: 'L4N1q4RNi9I',
      lessons: [
        { title: 'Metas SMART aplicadas a dinheiro', minutes: 6 },
        { title: 'Quebrando metas grandes em passos', minutes: 5 },
        { title: 'Acompanhando o progresso', minutes: 4 }
      ]
    }
  ];

  const EXPENSE_CATEGORIES = [
    { id: 'alimentacao', label: 'Alimentação', icon: '🍽️' },
    { id: 'transporte', label: 'Transporte', icon: '🚌' },
    { id: 'moradia', label: 'Moradia', icon: '🏠' },
    { id: 'entretenimento', label: 'Entretenimento', icon: '🎬' },
    { id: 'educacao', label: 'Educação', icon: '📚' },
    { id: 'poupanca', label: 'Poupança', icon: '💰' },
    { id: 'saude', label: 'Saúde', icon: '💊' },
    { id: 'outros', label: 'Outros', icon: '🧩' }
  ];

  /* ------------------------------------------------------------------ *
   * 2. STATE (in-memory for this preview — see note at top of file)
   * ------------------------------------------------------------------ */
  const AppState = {
    userName: 'Você',
    expenses: [],          // { id, description, amount, category, date }
    budgetGoal: 2000,
    savingsGoal: 500,
    courseProgress: {}     // { [courseId]: { doneLessons: Set-like array, completed, completedDate } }
  };

  function load() {
    // In-memory only in this environment. To persist across sessions in a
    // real deployment, replace this with:
    //
    // try {
    //   const raw = localStorage.getItem('raisin-finance-state');
    //   if (raw) Object.assign(AppState, JSON.parse(raw));
    // } catch (e) { console.warn('Could not load saved data', e); }
    seedDemoData();
  }

  function save() {
    // In-memory only in this environment. To persist across sessions in a
    // real deployment, replace this with:
    //
    // try {
    //   localStorage.setItem('raisin-finance-state', JSON.stringify(AppState));
    // } catch (e) { console.warn('Could not save data', e); }
  }

  function seedDemoData() {
    const today = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    AppState.expenses = [
      { id: 'e1', description: 'Supermercado da semana', amount: 186.4, category: 'alimentacao', date: iso(new Date(today.getFullYear(), today.getMonth(), 3)) },
      { id: 'e2', description: 'Passagem de ônibus', amount: 24.0, category: 'transporte', date: iso(new Date(today.getFullYear(), today.getMonth(), 4)) },
      { id: 'e3', description: 'Aluguel', amount: 950.0, category: 'moradia', date: iso(new Date(today.getFullYear(), today.getMonth(), 5)) },
      { id: 'e4', description: 'Cinema com amigos', amount: 58.5, category: 'entretenimento', date: iso(new Date(today.getFullYear(), today.getMonth(), 6)) }
    ];
    AppState.courseProgress = {
      c1: { doneLessons: ['0', '1', '2', '3'], completed: true, completedDate: iso(today) },
      c2: { doneLessons: ['0', '1'], completed: false }
    };
  }

  /* ------------------------------------------------------------------ *
   * 3. UTILITIES
   * ------------------------------------------------------------------ */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function formatBRL(value) {
    return 'R$ ' + Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(isoStr) {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  }

  function currentMonthExpenses() {
    const now = new Date();
    return AppState.expenses.filter((e) => {
      const d = new Date(e.date + 'T00:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }

  function courseProgressPct(course) {
    const p = AppState.courseProgress[course.id];
    if (!p) return 0;
    return Math.round((p.doneLessons.length / course.lessons.length) * 100);
  }

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ------------------------------------------------------------------ *
   * 4. TOASTS
   * ------------------------------------------------------------------ */
  function showToast(message, type) {
    const stack = $('#toastStack');
    const el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'default');
    const icon = type === 'success' ? '✓' : type === 'error' ? '!' : '•';
    el.innerHTML = `<span class="toast__icon">${icon}</span><span>${message}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 250);
    }, 3200);
  }

  /* ------------------------------------------------------------------ *
   * 5. NAVIGATION
   * ------------------------------------------------------------------ */
  let activeCourseId = null;

  function goTo(tab) {
    $$('.view').forEach((v) => { v.hidden = true; });
    const target = tab === 'course' ? $('#view-course') : $('#view-' + tab);
    if (target) target.hidden = false;

    $$('.bottom-nav__item').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === tab));
    $$('.app-nav__link').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === tab));

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tab === 'home') renderHome();
    if (tab === 'learn') renderCourseList();
    if (tab === 'track') renderTrack();
    if (tab === 'progress') renderProgress();
  }

  function initNav() {
    $$('.bottom-nav__item, .app-nav__link').forEach((btn) => {
      btn.addEventListener('click', () => goTo(btn.dataset.tab));
    });
    $$('[data-goto]').forEach((btn) => {
      btn.addEventListener('click', () => goTo(btn.dataset.goto));
    });

    const menuToggle = $('#menuToggle');
    const desktopNav = $('#desktopNav');
    menuToggle.addEventListener('click', () => {
      const isOpen = desktopNav.classList.toggle('is-open-mobile');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      // On small screens, fall back to a quick nav-to-first-item affordance.
      if (isOpen) {
        showToast('Use a barra inferior para navegar no celular.', 'default');
      }
    });

    $('#courseBackBtn').addEventListener('click', () => goTo('learn'));
  }

  function setGreeting() {
    const hour = new Date().getHours();
    const label = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    $('#greeting').textContent = `${label}, vamos organizar seu dinheiro.`;
  }

  /* ------------------------------------------------------------------ *
   * 6. HOME / DASHBOARD
   * ------------------------------------------------------------------ */
  function renderHome() {
    const monthExpenses = currentMonthExpenses();
    const total = monthExpenses.reduce((s, e) => s + e.amount, 0);
    $('#statSpent').textContent = formatBRL(total);
    $('#statSpentFoot').textContent = monthExpenses.length
      ? `${monthExpenses.length} lançamento${monthExpenses.length > 1 ? 's' : ''} este mês`
      : 'Nenhum lançamento ainda';

    const savingsPct = Math.min(100, Math.round((total > 0 ? Math.max(AppState.savingsGoal - 0, 0) : AppState.savingsGoal) / AppState.savingsGoal * 100));
    $('#statSavings').textContent = formatBRL(AppState.savingsGoal);
    $('#statSavingsBar').style.width = '62%';

    const doneCourses = Object.values(AppState.courseProgress).filter((p) => p.completed).length;
    $('#statCourses').textContent = `${doneCourses} / ${COURSES.length}`;
    $('#statCerts').textContent = String(doneCourses);

    const row = $('#homeCourseRow');
    row.innerHTML = '';
    COURSES.slice(0, 5).forEach((course) => {
      const pct = courseProgressPct(course);
      const card = document.createElement('button');
      card.className = 'teaser-card';
      card.style.textAlign = 'left';
      card.style.border = '1px solid var(--border)';
      card.addEventListener('click', () => openCourse(course.id));
      card.innerHTML = `
        <span class="teaser-card__tag">${CATEGORY_LABELS[course.category]}</span>
        <span class="teaser-card__title">${course.icon} ${course.title}</span>
        <div class="teaser-card__bar"><div class="teaser-card__bar-fill" style="width:${pct}%"></div></div>
        <span class="teaser-card__pct">${pct}% concluído</span>
      `;
      row.appendChild(card);
    });
  }

  /* ------------------------------------------------------------------ *
   * 7. LEARN / CONTENT HUB
   * ------------------------------------------------------------------ */
  let activeFilter = 'all';

  function renderCourseList() {
    const list = $('#courseList');
    list.innerHTML = '';
    const filtered = COURSES.filter((c) => activeFilter === 'all' || c.category === activeFilter);

    filtered.forEach((course) => {
      const pct = courseProgressPct(course);
      const progress = AppState.courseProgress[course.id];
      const statusClass = progress && progress.completed ? 'done' : pct > 0 ? 'progress' : 'new';
      const statusLabel = progress && progress.completed ? 'Concluído' : pct > 0 ? `${pct}% concluído` : 'Novo';

      const card = document.createElement('button');
      card.className = 'course-card';
      card.addEventListener('click', () => openCourse(course.id));
      card.innerHTML = `
        <span class="course-card__icon" aria-hidden="true">${course.icon}</span>
        <span class="course-card__body">
          <span class="course-card__title">${course.title}</span>
          <span class="course-card__desc">${course.desc}</span>
          <span class="course-card__meta">
            <span>${course.lessons.length} aulas</span>
            <span>·</span>
            <span>${course.lessons.reduce((s, l) => s + l.minutes, 0)} min</span>
          </span>
          <div class="course-card__bar"><div class="course-card__bar-fill" style="width:${pct}%"></div></div>
          <span class="course-card__status course-card__status--${statusClass}">${statusLabel}</span>
        </span>
      `;
      list.appendChild(card);
    });

    if (!filtered.length) {
      list.innerHTML = '<p class="empty-state is-visible">Nenhum curso encontrado nesta categoria.</p>';
    }
  }

  function initCourseFilters() {
    $$('#courseFilters .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeFilter = chip.dataset.filter;
        $$('#courseFilters .chip').forEach((c) => c.classList.toggle('is-active', c === chip));
        renderCourseList();
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * 8. COURSE DETAIL
   * ------------------------------------------------------------------ */
  function openCourse(courseId) {
    activeCourseId = courseId;
    const course = COURSES.find((c) => c.id === courseId);
    if (!course) return;
    if (!AppState.courseProgress[courseId]) {
      AppState.courseProgress[courseId] = { doneLessons: [], completed: false };
    }
    renderCourseDetail(course);
    goTo('course');
  }

  function renderCourseDetail(course) {
    const progress = AppState.courseProgress[course.id];
    const pct = courseProgressPct(course);

    const detail = $('#courseDetail');
    detail.innerHTML = `
      <div class="course-detail__media">
        <div class="course-detail__video">
          <iframe src="https://www.youtube.com/embed/${course.videoId}" title="${course.title}" loading="lazy" allowfullscreen></iframe>
        </div>
        <h1 class="course-detail__title">${course.title}</h1>
        <p class="course-detail__desc">${course.desc}</p>
        ${progress.completed ? `<span class="course-card__status course-card__status--done" style="margin-top:12px;">Curso concluído em ${formatDate(progress.completedDate)}</span>` : ''}
      </div>
      <div class="course-detail__side">
        <div class="course-card__bar" style="margin-top:16px;"><div class="course-card__bar-fill" style="width:${pct}%"></div></div>
        <p class="stat-card__foot" style="margin-top:6px;">${pct}% concluído · ${progress.doneLessons.length}/${course.lessons.length} aulas</p>
        <div class="lesson-list" id="lessonList"></div>
        <button class="btn btn--primary btn--block" id="completeCourseBtn" style="margin-top:16px;">
          <span class="btn__label">${progress.completed ? 'Ver certificado' : 'Marcar curso como concluído'}</span>
          <span class="btn__spinner" aria-hidden="true"></span>
        </button>
      </div>
    `;

    const lessonList = $('#lessonList');
    course.lessons.forEach((lesson, idx) => {
      const isDone = progress.doneLessons.includes(String(idx));
      const row = document.createElement('button');
      row.className = 'lesson-item' + (isDone ? ' is-done' : '');
      row.style.width = '100%';
      row.style.textAlign = 'left';
      row.innerHTML = `
        <span class="lesson-item__check">${isDone ? '✓' : ''}</span>
        <span class="lesson-item__title">${lesson.title}</span>
        <span class="lesson-item__time">${lesson.minutes} min</span>
      `;
      row.addEventListener('click', () => toggleLesson(course, idx));
      lessonList.appendChild(row);
    });

    $('#completeCourseBtn').addEventListener('click', () => onCompleteCourse(course));
  }

  function toggleLesson(course, idx) {
    const progress = AppState.courseProgress[course.id];
    const key = String(idx);
    const pos = progress.doneLessons.indexOf(key);
    if (pos === -1) {
      progress.doneLessons.push(key);
    } else {
      progress.doneLessons.splice(pos, 1);
      progress.completed = false;
    }
    save();
    renderCourseDetail(course);
    showToast('Progresso da aula atualizado.', 'success');
  }

  function onCompleteCourse(course) {
    const progress = AppState.courseProgress[course.id];
    if (progress.completed) {
      openCertificate(course);
      return;
    }
    const btn = $('#completeCourseBtn');
    btn.classList.add('is-loading');
    btn.disabled = true;

    setTimeout(() => {
      progress.doneLessons = course.lessons.map((_, i) => String(i));
      progress.completed = true;
      progress.completedDate = new Date().toISOString().slice(0, 10);
      save();
      btn.classList.remove('is-loading');
      btn.disabled = false;
      renderCourseDetail(course);
      showToast(`Parabéns! Você concluiu "${course.title}".`, 'success');
      openCertificate(course);
    }, 700);
  }

  /* ------------------------------------------------------------------ *
   * 9. EXPENSE TRACKER
   * ------------------------------------------------------------------ */
  let selectedCategory = null;

  function initExpenseForm() {
    const picker = $('#categoryPicker');
    EXPENSE_CATEGORIES.forEach((cat) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'category-chip';
      chip.setAttribute('role', 'radio');
      chip.setAttribute('aria-checked', 'false');
      chip.dataset.category = cat.id;
      chip.innerHTML = `<span aria-hidden="true">${cat.icon}</span><span>${cat.label}</span>`;
      chip.addEventListener('click', () => {
        selectedCategory = cat.id;
        $$('.category-chip', picker).forEach((c) => c.setAttribute('aria-checked', String(c === chip)));
        clearFieldError('expCategory');
      });
      picker.appendChild(chip);
    });

    $('#expDate').value = new Date().toISOString().slice(0, 10);

    $('#expenseForm').addEventListener('submit', onSubmitExpense);
    $('#budgetGoalInput').value = AppState.budgetGoal;
    $('#budgetGoalSave').addEventListener('click', onSaveBudgetGoal);
  }

  function clearFieldError(fieldKey) {
    const errorEl = $('#' + fieldKey + 'Error');
    const fieldEl = errorEl ? errorEl.closest('.field') : null;
    if (errorEl) errorEl.textContent = '';
    if (fieldEl) fieldEl.classList.remove('has-error');
  }

  function setFieldError(fieldKey, message) {
    const errorEl = $('#' + fieldKey + 'Error');
    const fieldEl = errorEl.closest('.field');
    errorEl.textContent = message;
    fieldEl.classList.add('has-error');
  }

  function onSubmitExpense(evt) {
    evt.preventDefault();
    let valid = true;

    const desc = $('#expDesc').value.trim();
    const amountRaw = $('#expAmount').value;
    const amount = parseFloat(amountRaw);
    const date = $('#expDate').value;

    ['expDesc', 'expAmount', 'expDate', 'expCategory'].forEach(clearFieldError);

    if (!desc) { setFieldError('expDesc', 'Informe uma descrição.'); valid = false; }
    if (!amountRaw || isNaN(amount) || amount <= 0) { setFieldError('expAmount', 'Informe um valor válido maior que zero.'); valid = false; }
    if (!date) { setFieldError('expDate', 'Selecione uma data.'); valid = false; }
    if (!selectedCategory) { setFieldError('expCategory', 'Escolha uma categoria.'); valid = false; }

    if (!valid) {
      showToast('Revise os campos destacados.', 'error');
      return;
    }

    const btn = $('#expenseSubmitBtn');
    btn.classList.add('is-loading');
    btn.disabled = true;

    setTimeout(() => {
      AppState.expenses.unshift({
        id: uid('e'),
        description: desc,
        amount: amount,
        category: selectedCategory,
        date: date
      });
      save();

      btn.classList.remove('is-loading');
      btn.disabled = false;
      $('#expenseForm').reset();
      $('#expDate').value = new Date().toISOString().slice(0, 10);
      selectedCategory = null;
      $$('.category-chip').forEach((c) => c.setAttribute('aria-checked', 'false'));

      renderTrack();
      showToast('Despesa registrada com sucesso.', 'success');
    }, 500);
  }

  function onSaveBudgetGoal() {
    const val = parseFloat($('#budgetGoalInput').value);
    if (isNaN(val) || val <= 0) {
      showToast('Informe um limite mensal válido.', 'error');
      return;
    }
    AppState.budgetGoal = val;
    save();
    renderTrack();
    showToast('Limite mensal atualizado.', 'success');
  }

  function deleteExpense(id) {
    AppState.expenses = AppState.expenses.filter((e) => e.id !== id);
    save();
    renderTrack();
    showToast('Lançamento removido.', 'default');
  }

  function renderTrack() {
    const monthExpenses = currentMonthExpenses();
    const total = monthExpenses.reduce((s, e) => s + e.amount, 0);
    $('#budgetTotal').textContent = formatBRL(total) + ' / ' + formatBRL(AppState.budgetGoal);

    const byCategory = {};
    EXPENSE_CATEGORIES.forEach((c) => { byCategory[c.id] = 0; });
    monthExpenses.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

    const barsWrap = $('#budgetBars');
    barsWrap.innerHTML = '';
    EXPENSE_CATEGORIES.forEach((cat) => {
      const amt = byCategory[cat.id] || 0;
      if (amt === 0) return;
      const pctOfBudget = AppState.budgetGoal > 0 ? Math.min(100, (amt / AppState.budgetGoal) * 100) : 0;
      const fillClass = pctOfBudget > 90 ? 'is-over' : pctOfBudget > 60 ? 'is-warning' : '';
      const row = document.createElement('div');
      row.className = 'budget-bar-row';
      row.innerHTML = `
        <div class="budget-bar-row__head">
          <span class="budget-bar-row__cat">${cat.icon} ${cat.label}</span>
          <span class="budget-bar-row__amt ledger">${formatBRL(amt)}</span>
        </div>
        <div class="budget-bar-track"><div class="budget-bar-track__fill ${fillClass}" style="width:${pctOfBudget}%"></div></div>
      `;
      barsWrap.appendChild(row);
    });
    if (!barsWrap.children.length) {
      barsWrap.innerHTML = '<p class="stat-card__foot">Registre uma despesa para ver a divisão por categoria.</p>';
    }

    const txList = $('#txList');
    txList.innerHTML = '';
    const sorted = [...AppState.expenses].sort((a, b) => (a.date < b.date ? 1 : -1));
    sorted.forEach((e) => {
      const cat = EXPENSE_CATEGORIES.find((c) => c.id === e.category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
      const li = document.createElement('li');
      li.className = 'tx-item';
      li.innerHTML = `
        <span class="tx-item__icon" aria-hidden="true">${cat.icon}</span>
        <span class="tx-item__body">
          <span class="tx-item__desc">${e.description}</span>
          <span class="tx-item__meta">${cat.label} · ${formatDate(e.date)}</span>
        </span>
        <span class="tx-item__amount ledger">${formatBRL(e.amount)}</span>
        <button class="tx-item__delete" aria-label="Remover lançamento">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4H13M6 4V2.5C6 2.2 6.2 2 6.5 2H9.5C9.8 2 10 2.2 10 2.5V4M12 4L11.5 13C11.5 13.3 11.2 13.5 10.9 13.5H5.1C4.8 13.5 4.5 13.3 4.5 13L4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      `;
      li.querySelector('.tx-item__delete').addEventListener('click', () => deleteExpense(e.id));
      txList.appendChild(li);
    });

    $('#txEmptyState').classList.toggle('is-visible', AppState.expenses.length === 0);
    txList.style.display = AppState.expenses.length === 0 ? 'none' : 'flex';
    txList.style.flexDirection = 'column';
  }

  /* ------------------------------------------------------------------ *
   * 10. PROGRESS / CERTIFICATION
   * ------------------------------------------------------------------ */
  function renderProgress() {
    const totalLessons = COURSES.reduce((s, c) => s + c.lessons.length, 0);
    const doneLessons = COURSES.reduce((s, c) => {
      const p = AppState.courseProgress[c.id];
      return s + (p ? p.doneLessons.length : 0);
    }, 0);
    const overallPct = totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0;

    const circumference = 2 * Math.PI * 52;
    $('#ringProgress').setAttribute('stroke-dasharray', circumference.toFixed(1));
    $('#ringProgress').setAttribute('stroke-dashoffset', (circumference * (1 - overallPct / 100)).toFixed(1));
    $('#ringLabel').textContent = overallPct + '%';

    const completedCourses = COURSES.filter((c) => AppState.courseProgress[c.id] && AppState.courseProgress[c.id].completed);
    $('#progCoursesDone').textContent = String(completedCourses.length);
    $('#progCerts').textContent = String(completedCourses.length);

    const monthTotal = currentMonthExpenses().reduce((s, e) => s + e.amount, 0);
    const savedThisMonth = Math.max(0, AppState.budgetGoal - monthTotal);
    $('#progSaved').textContent = formatBRL(savedThisMonth);

    const certList = $('#certList');
    certList.innerHTML = '';
    completedCourses.forEach((course) => {
      const progress = AppState.courseProgress[course.id];
      const card = document.createElement('div');
      card.className = 'cert-card';
      card.innerHTML = `
        <span class="cert-card__badge" aria-hidden="true">🏅</span>
        <span>
          <span class="cert-card__title">${course.title}</span>
          <span class="cert-card__date">Concluído em ${formatDate(progress.completedDate)}</span>
        </span>
        <button class="cert-card__btn">Ver</button>
      `;
      card.querySelector('.cert-card__btn').addEventListener('click', () => openCertificate(course));
      certList.appendChild(card);
    });
    $('#certEmptyState').classList.toggle('is-visible', completedCourses.length === 0);

    const rows = $('#progressCourseList');
    rows.innerHTML = '';
    COURSES.forEach((course) => {
      const pct = courseProgressPct(course);
      const row = document.createElement('button');
      row.className = 'progress-course-row';
      row.style.width = '100%';
      row.style.textAlign = 'left';
      row.innerHTML = `
        <span aria-hidden="true">${course.icon}</span>
        <span class="progress-course-row__title">${course.title}</span>
        <span class="progress-course-row__pct ledger">${pct}%</span>
      `;
      row.addEventListener('click', () => openCourse(course.id));
      rows.appendChild(row);
    });
  }

  function openCertificate(course) {
    $('#certUserName').textContent = AppState.userName;
    $('#certCourseName').textContent = course.title;
    const progress = AppState.courseProgress[course.id];
    $('#certDate').textContent = progress && progress.completedDate ? formatDate(progress.completedDate) : formatDate(new Date().toISOString().slice(0, 10));
    $('#certModalOverlay').hidden = false;
  }

  function initCertModal() {
    $('#certModalOverlay').hidden = true; // força o modal a começar fechado, ignorando qualquer estado anterior
    $('#certModalClose').addEventListener('click', () => { $('#certModalOverlay').hidden = true; });
    $('#certModalOverlay').addEventListener('click', (e) => {
      if (e.target === $('#certModalOverlay')) $('#certModalOverlay').hidden = true;
    });
    $('#certPrintBtn').addEventListener('click', () => window.print());
  }

  /* ------------------------------------------------------------------ *
   * 11. INIT
   * ------------------------------------------------------------------ */
  function init() {
    load();
    setGreeting();
    initNav();
    initCourseFilters();
    initExpenseForm();
    initCertModal();
    renderHome();
    goTo('home');
  }

  document.addEventListener('DOMContentLoaded', init);
})();