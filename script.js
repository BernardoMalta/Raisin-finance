/* ==========================================================================
   RAISIN FINANCE — script.js
   Auth (per-user accounts), navigation, course content + video-gated
   certification, expense tracker, and progress.

   PERSISTENCE NOTE:
   Accounts are stored in localStorage under 'raisin-finance-users' (name,
   email, salted SHA-256 password hash). Each user's app data is stored
   separately under 'raisin-finance-state-<email>' so every account keeps
   its own expenses, budget, course/video progress and last screen. This is
   a client-side-only demo: there is no server, so "secure auth" here means
   "reasonable for a static site", not production-grade credential storage.
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
      icon: 'book',
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
      icon: 'barChart',
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
      icon: 'shieldCheck',
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
      icon: 'trendingUp',
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
      icon: 'target',
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
    { id: 'alimentacao', label: 'Alimentação', icon: 'plate' },
    { id: 'transporte', label: 'Transporte', icon: 'bus' },
    { id: 'moradia', label: 'Moradia', icon: 'home' },
    { id: 'entretenimento', label: 'Entretenimento', icon: 'film' },
    { id: 'educacao', label: 'Educação', icon: 'book' },
    { id: 'poupanca', label: 'Poupança', icon: 'coins' },
    { id: 'saude', label: 'Saúde', icon: 'heart' },
    { id: 'outros', label: 'Outros', icon: 'grid' }
  ];

  /* ------------------------------------------------------------------ *
   * 2. STATE (per-user, loaded after login)
   * ------------------------------------------------------------------ */
  let AppState = null; // set on login; shape from defaultState()

  const USERS_KEY = 'raisin-finance-users';
  const SESSION_KEY = 'raisin-finance-session';
  const STATE_PREFIX = 'raisin-finance-state-';

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('Could not read', key, e);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Could not write', key, e);
    }
  }

  function getUsers() { return readJSON(USERS_KEY, {}); }
  function saveUsers(users) { writeJSON(USERS_KEY, users); }

  function getSessionEmail() { return localStorage.getItem(SESSION_KEY) || null; }
  function setSessionEmail(email) {
    if (email) localStorage.setItem(SESSION_KEY, email);
    else localStorage.removeItem(SESSION_KEY);
  }

  function defaultState(name, email) {
    return {
      userName: name,
      email: email,
      expenses: [],
      budgetGoal: 2000,
      savingsGoal: 500,
      courseProgress: {},   // { [courseId]: { completed, completedDate, video: { time, duration, watched } } }
      lastView: 'home',
      activeCourseId: null
    };
  }

  function loadStateForUser(email) { return readJSON(STATE_PREFIX + email, null); }
  function saveStateForUser(email, state) { writeJSON(STATE_PREFIX + email, state); }

  function save() {
    if (!AppState || !AppState.email) return;
    saveStateForUser(AppState.email, AppState);
  }

  /* ------------------------------------------------------------------ *
   * 3. PASSWORD HASHING (best-effort client-side, no backend available)
   * ------------------------------------------------------------------ */
  async function hashPassword(password, salt) {
    const str = salt + ':' + password;
    if (window.crypto && window.crypto.subtle) {
      const data = new TextEncoder().encode(str);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback for contexts without SubtleCrypto (e.g. non-secure origins).
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return String(hash);
  }

  function randomSalt() { return uid('s'); }

  /* ------------------------------------------------------------------ *
   * 4. UTILITIES
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

  function ensureVideoProgress(progress) {
    if (!progress.video) progress.video = { time: 0, duration: 0, watched: false };
    return progress;
  }

  function courseProgressPct(course) {
    const p = AppState.courseProgress[course.id];
    if (!p) return 0;
    if (p.completed) return 100;
    const v = p.video;
    if (v && v.duration > 0) {
      return Math.min(100, Math.round((v.time / v.duration) * 100));
    }
    return 0;
  }

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ------------------------------------------------------------------ *
   * 4b. ICONS (inline SVG set — no emoji anywhere in the UI)
   * ------------------------------------------------------------------ */
  const ICON_PATHS = {
    book: '<path d="M3 5C3 4.4 3.4 4 4 4H9V16H4C3.4 16 3 15.6 3 15V5Z"/><path d="M17 5C17 4.4 16.6 4 16 4H11V16H16C16.6 16 17 15.6 17 15V5Z"/>',
    barChart: '<path d="M4 17V11M10 17V5M16 17V9"/>',
    shieldCheck: '<path d="M10 2L16 4.5V9C16 13 13.5 16.2 10 18C6.5 16.2 4 13 4 9V4.5L10 2Z"/><path d="M7.3 9.6L9 11.3L12.7 7.4"/>',
    trendingUp: '<path d="M3 14L8 9L11.5 12.5L17 6"/><path d="M12.5 6H17V10.5"/>',
    target: '<circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3.5"/><circle cx="10" cy="10" r="0.7" fill="currentColor" stroke="none"/>',
    plate: '<circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/>',
    bus: '<rect x="3" y="4" width="14" height="10" rx="2"/><path d="M3 10H17"/><circle cx="6.5" cy="16" r="1.1" fill="currentColor" stroke="none"/><circle cx="13.5" cy="16" r="1.1" fill="currentColor" stroke="none"/>',
    home: '<path d="M3 9L10 3L17 9"/><path d="M5 8V16H15V8"/>',
    film: '<rect x="3" y="6" width="14" height="10" rx="1.5"/><path d="M3 6.5L6 3.5H9L7 6.5"/><path d="M10 6.5L12 3.5H15L13 6.5"/>',
    coins: '<ellipse cx="10" cy="6" rx="6" ry="2.2"/><path d="M4 6V10C4 11.2 6.7 12.2 10 12.2C13.3 12.2 16 11.2 16 10V6"/><path d="M4 10V14C4 15.2 6.7 16.2 10 16.2C13.3 16.2 16 15.2 16 14V10"/>',
    heart: '<path d="M10 17C10 17 3 12.5 3 7.8C3 5.2 5 3.5 7.2 3.5C8.5 3.5 9.5 4.2 10 5C10.5 4.2 11.5 3.5 12.8 3.5C15 3.5 17 5.2 17 7.8C17 12.5 10 17 10 17Z"/>',
    grid: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>',
    receipt: '<path d="M5 3H15V18L13 16.5L11 18L9 16.5L7 18L5 16.5V3Z"/><path d="M7.5 7H12.5M7.5 10H12.5M7.5 13H10.5"/>',
    award: '<circle cx="10" cy="7" r="4.5"/><path d="M7 11L5.5 18L10 15.5L14.5 18L13 11"/>',
    checkCircle: '<circle cx="10" cy="10" r="8"/><path d="M6.5 10.2L8.7 12.4L13.5 7.5"/>',
    alertCircle: '<circle cx="10" cy="10" r="8"/><path d="M10 6V10.5"/><circle cx="10" cy="13.5" r="0.9" fill="currentColor" stroke="none"/>',
    infoCircle: '<circle cx="10" cy="10" r="8"/><path d="M10 9V14"/><circle cx="10" cy="6.3" r="0.9" fill="currentColor" stroke="none"/>',
    close: '<path d="M5 5L15 15M15 5L5 15"/>',
    check: '<path d="M4.5 10.2L8 13.5L15.5 5.5"/>'
  };

  function icon(name, size) {
    size = size || 20;
    return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
  }

  /* ------------------------------------------------------------------ *
   * 5. TOASTS
   * ------------------------------------------------------------------ */
  function showToast(message, type) {
    const stack = $('#toastStack');
    const el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'default');
    const iconName = type === 'success' ? 'checkCircle' : type === 'error' ? 'alertCircle' : 'infoCircle';
    el.innerHTML = `<span class="toast__icon">${icon(iconName, 16)}</span><span>${message}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 250);
    }, 3200);
  }

  /* ------------------------------------------------------------------ *
   * 6. AUTH (login / cadastro / sessão)
   * ------------------------------------------------------------------ */
  let authMode = 'login';
  let authEmailChecked = null;

  function initAuth() {
    $('#authEmailForm').addEventListener('submit', onAuthEmailSubmit);
    $('#authDetailsForm').addEventListener('submit', onAuthDetailsSubmit);
    $('#authBackBtn').addEventListener('click', resetAuthToEmailStep);
  }

  function clearAuthErrors() {
    ['authEmail', 'authName', 'authPassword', 'authConfirmPassword'].forEach(clearFieldError);
  }

  function onAuthEmailSubmit(evt) {
    evt.preventDefault();
    clearAuthErrors();
    const email = $('#authEmail').value.trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setFieldError('authEmail', 'Informe um e-mail válido.');
      return;
    }

    authEmailChecked = email;
    const exists = !!getUsers()[email];
    authMode = exists ? 'login' : 'register';

    $('#authEmailForm').hidden = true;
    $('#authDetailsForm').hidden = false;
    $('#authNameField').hidden = exists;
    $('#authConfirmField').hidden = exists;
    $('#authName').required = !exists;
    $('#authConfirmPassword').required = !exists;
    $('#authPassword').setAttribute('autocomplete', exists ? 'current-password' : 'new-password');
    $('#authTitle').textContent = exists ? 'Bem-vindo de volta' : 'Criar sua conta';
    $('#authSubtitle').textContent = exists
      ? `Digite a senha da conta ${email}.`
      : `Vamos criar sua conta com o e-mail ${email}.`;
    $('#authSubmitBtn .btn__label').textContent = exists ? 'Entrar' : 'Criar conta';
    $('#authPassword').value = '';
    $('#authName').value = '';
    $('#authConfirmPassword').value = '';
    $('#authPassword').focus();
  }

  function resetAuthToEmailStep() {
    clearAuthErrors();
    $('#authDetailsForm').hidden = true;
    $('#authEmailForm').hidden = false;
    $('#authEmail').focus();
  }

  async function onAuthDetailsSubmit(evt) {
    evt.preventDefault();
    clearAuthErrors();
    const email = authEmailChecked;
    const password = $('#authPassword').value;
    const btn = $('#authSubmitBtn');

    if (!password || password.length < 4) {
      setFieldError('authPassword', 'A senha deve ter ao menos 4 caracteres.');
      return;
    }

    const users = getUsers();

    if (authMode === 'login') {
      const user = users[email];
      if (!user) { setFieldError('authPassword', 'Conta não encontrada.'); return; }
      btn.classList.add('is-loading'); btn.disabled = true;
      const hash = await hashPassword(password, user.salt);
      btn.classList.remove('is-loading'); btn.disabled = false;
      if (hash !== user.passwordHash) {
        setFieldError('authPassword', 'Senha incorreta.');
        return;
      }
      completeLogin(email, user.name);
    } else {
      const name = $('#authName').value.trim();
      const confirm = $('#authConfirmPassword').value;
      let valid = true;
      if (!name) { setFieldError('authName', 'Informe seu nome.'); valid = false; }
      if (password !== confirm) { setFieldError('authConfirmPassword', 'As senhas não coincidem.'); valid = false; }
      if (!valid) return;

      btn.classList.add('is-loading'); btn.disabled = true;
      const salt = randomSalt();
      const hash = await hashPassword(password, salt);
      btn.classList.remove('is-loading'); btn.disabled = false;

      users[email] = { name, email, salt, passwordHash: hash, createdAt: new Date().toISOString() };
      saveUsers(users);
      saveStateForUser(email, defaultState(name, email));
      completeLogin(email, name);
    }
  }

  function completeLogin(email, name) {
    setSessionEmail(email);
    AppState = loadStateForUser(email) || defaultState(name, email);
    selectedCategory = null;
    save();
    showAppShell();
    restoreSession();
    showToast(`Bem-vindo, ${name.split(' ')[0]}!`, 'success');
  }

  function showAuthScreen() {
    $('#appShell').hidden = true;
    $('#authScreen').hidden = false;
    $('#profileToggle').hidden = true;
    $('#authEmailForm').reset();
    resetAuthToEmailStep();
  }

  function showAppShell() {
    $('#authScreen').hidden = true;
    $('#appShell').hidden = false;
    $('#profileToggle').hidden = false;
  }

  function logout() {
    setSessionEmail(null);
    stopVideoTracking();
    AppState = null;
    $('#profileModalOverlay').hidden = true;
    showAuthScreen();
    showToast('Você saiu da conta.', 'default');
  }

  function restoreSession() {
    setGreeting();
    const targetView = AppState.lastView || 'home';
    if (targetView === 'course' && AppState.activeCourseId && COURSES.some((c) => c.id === AppState.activeCourseId)) {
      openCourse(AppState.activeCourseId);
    } else {
      goTo(targetView === 'course' ? 'home' : targetView);
    }
  }

  /* ------------------------------------------------------------------ *
   * 7. NAVIGATION
   * ------------------------------------------------------------------ */
  function goTo(tab) {
    $$('.view').forEach((v) => { v.hidden = true; });
    const target = tab === 'course' ? $('#view-course') : $('#view-' + tab);
    if (target) target.hidden = false;

    $$('.bottom-nav__item').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === tab));
    $$('.app-nav__link').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === tab));

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (AppState) {
      AppState.lastView = tab;
      if (tab !== 'course') AppState.activeCourseId = null;
      save();
    }
    if (tab !== 'course') stopVideoTracking();

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

    $('#courseBackBtn').addEventListener('click', () => goTo('learn'));
  }

  function setGreeting() {
    const hour = new Date().getHours();
    const label = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const firstName = AppState && AppState.userName ? AppState.userName.split(' ')[0] : '';
    $('#greeting').textContent = firstName
      ? `${label}, ${firstName}! Vamos organizar seu dinheiro.`
      : `${label}, vamos organizar seu dinheiro.`;
  }

  /* ------------------------------------------------------------------ *
   * 8. HOME / DASHBOARD
   * ------------------------------------------------------------------ */
  function renderHome() {
    const monthExpenses = currentMonthExpenses();
    const total = monthExpenses.reduce((s, e) => s + e.amount, 0);
    $('#statSpent').textContent = formatBRL(total);
    $('#statSpentFoot').textContent = monthExpenses.length
      ? `${monthExpenses.length} lançamento${monthExpenses.length > 1 ? 's' : ''} este mês`
      : 'Nenhum lançamento ainda';

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
        <span class="teaser-card__title" style="display:flex;align-items:center;gap:6px;color:var(--navy-800);">${icon(course.icon, 16)}${course.title}</span>
        <div class="teaser-card__bar"><div class="teaser-card__bar-fill" style="width:${pct}%"></div></div>
        <span class="teaser-card__pct">${pct}% concluído</span>
      `;
      row.appendChild(card);
    });
  }

  /* ------------------------------------------------------------------ *
   * 9. LEARN / CONTENT HUB
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
        <span class="course-card__icon" aria-hidden="true">${icon(course.icon, 20)}</span>
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
   * 10. COURSE DETAIL + VIDEO COMPLETION TRACKING
   * ------------------------------------------------------------------ */
  function openCourse(courseId) {
    const course = COURSES.find((c) => c.id === courseId);
    if (!course) return;
    if (!AppState.courseProgress[courseId]) {
      AppState.courseProgress[courseId] = { completed: false, video: { time: 0, duration: 0, watched: false } };
    }
    ensureVideoProgress(AppState.courseProgress[courseId]);
    AppState.activeCourseId = courseId;
    AppState.lastView = 'course';
    save();
    renderCourseDetail(course);
    goTo('course');
  }

  function renderCompletionCardHTML(course, progress, pct) {
    return `
      <div class="completion-card__head">
        <span class="completion-card__icon${progress.completed ? ' is-complete' : ''}">${icon(progress.completed ? 'checkCircle' : 'award', 20)}</span>
        <div>
          <p class="completion-card__title">${progress.completed ? 'Curso concluído' : 'Conclua o curso'}</p>
          <p class="completion-card__subtitle">${progress.completed
            ? `Concluído em ${formatDate(progress.completedDate)}`
            : 'Assista o vídeo até o final para liberar o certificado'}</p>
        </div>
      </div>
      <div class="completion-card__bar"><div class="completion-card__bar-fill" style="width:${pct}%"></div></div>
      <p class="completion-card__pct">${pct}% do vídeo assistido</p>
      <button class="btn btn--primary btn--block" id="completeCourseBtn" ${progress.completed ? '' : 'disabled'}>
        <span class="btn__label">${progress.completed ? 'Ver certificado' : 'Assista o vídeo completo para concluir'}</span>
        <span class="btn__spinner" aria-hidden="true"></span>
      </button>
    `;
  }

  function renderLessonOutlineHTML(course, progress) {
    return course.lessons.map((lesson, idx) => `
      <div class="lesson-item${progress.completed ? ' is-done' : ''}">
        <span class="lesson-item__check">${progress.completed ? icon('check', 12) : idx + 1}</span>
        <span class="lesson-item__title">${lesson.title}</span>
        <span class="lesson-item__time">${lesson.minutes} min</span>
      </div>
    `).join('');
  }

  function renderCourseDetail(course) {
    const progress = ensureVideoProgress(AppState.courseProgress[course.id]);
    const pct = courseProgressPct(course);
    const playerId = 'ytplayer-' + course.id;

    const detail = $('#courseDetail');
    detail.innerHTML = `
      <div class="course-detail__media">
        <div class="course-detail__video">
          <div id="${playerId}" style="width:100%;height:100%;"></div>
        </div>
        <h1 class="course-detail__title">${course.title}</h1>
        <p class="course-detail__desc">${course.desc}</p>
      </div>
      <div class="course-detail__side">
        <div class="completion-card" id="completionCard">${renderCompletionCardHTML(course, progress, pct)}</div>
        <p class="lesson-outline__label">Conteúdo do curso</p>
        <div class="lesson-list" id="lessonList">${renderLessonOutlineHTML(course, progress)}</div>
      </div>
    `;

    detail.addEventListener('click', (e) => {
      if (e.target.closest('#completeCourseBtn') && AppState.courseProgress[course.id].completed) {
        openCertificate(course);
      }
    });

    initYouTubePlayer(course, playerId);
  }

  // ---- YouTube IFrame API integration: tracks real watch progress so the
  // certificate can only unlock once the lesson video has actually played
  // through to the end (and lets the learner resume where they left off). ----
  let ytApiPromise = null;
  function loadYouTubeAPI() {
    if (ytApiPromise) return ytApiPromise;
    ytApiPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) { resolve(window.YT); return; }
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof previous === 'function') previous();
        resolve(window.YT);
      };
      if (!document.getElementById('youtubeApiScript')) {
        const tag = document.createElement('script');
        tag.id = 'youtubeApiScript';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    });
    return ytApiPromise;
  }

  let currentPlayer = null;
  let currentPlayerCourse = null;
  let progressIntervalId = null;

  function stopVideoTracking() {
    if (progressIntervalId) { clearInterval(progressIntervalId); progressIntervalId = null; }
    if (currentPlayer && typeof currentPlayer.destroy === 'function') {
      try { currentPlayer.destroy(); } catch (e) { /* iframe may already be gone */ }
    }
    currentPlayer = null;
    currentPlayerCourse = null;
  }

  async function initYouTubePlayer(course, playerId) {
    stopVideoTracking();
    const YT = await loadYouTubeAPI();
    if (!AppState || AppState.activeCourseId !== course.id || !document.getElementById(playerId)) return; // user navigated away before API loaded
    const progress = ensureVideoProgress(AppState.courseProgress[course.id]);

    currentPlayerCourse = course;
    currentPlayer = new YT.Player(playerId, {
      width: '100%',
      height: '100%',
      videoId: course.videoId,
      playerVars: { rel: 0, playsinline: 1 },
      events: {
        onReady: (e) => {
          if (progress.video.time > 2 && !progress.video.watched) {
            e.target.seekTo(progress.video.time, true);
          }
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED) markVideoWatched(course);
        }
      }
    });

    progressIntervalId = setInterval(() => trackVideoProgress(course), 2000);
  }

  function trackVideoProgress(course) {
    if (!currentPlayer || currentPlayerCourse !== course || typeof currentPlayer.getCurrentTime !== 'function') return;
    let time, duration;
    try {
      time = currentPlayer.getCurrentTime();
      duration = currentPlayer.getDuration();
    } catch (e) { return; }
    if (!duration) return;

    const progress = ensureVideoProgress(AppState.courseProgress[course.id]);
    progress.video.time = Math.max(progress.video.time, time);
    progress.video.duration = duration;
    save();
    updateVideoProgressUI(course);

    if (!progress.video.watched && progress.video.time / duration >= 0.97) {
      markVideoWatched(course);
    }
  }

  function markVideoWatched(course) {
    const progress = ensureVideoProgress(AppState.courseProgress[course.id]);
    if (progress.video.watched) return;
    progress.video.watched = true;
    if (progress.video.duration) progress.video.time = progress.video.duration;
    const wasCompleted = progress.completed;
    progress.completed = true;
    progress.completedDate = progress.completedDate || new Date().toISOString().slice(0, 10);
    save();

    if (isCourseDetailShowing(course)) refreshCourseDetailStatus(course);

    if (!wasCompleted) {
      showToast(`Parabéns! Você concluiu "${course.title}".`, 'success');
      openCertificate(course);
    }
  }

  function isCourseDetailShowing(course) {
    return AppState && AppState.activeCourseId === course.id && !$('#view-course').hidden;
  }

  function updateVideoProgressUI(course) {
    if (!isCourseDetailShowing(course)) return;
    const pct = courseProgressPct(course);
    const bar = $('#completionCard .completion-card__bar-fill');
    if (bar) bar.style.width = pct + '%';
    const pctLabel = $('#completionCard .completion-card__pct');
    if (pctLabel) pctLabel.textContent = `${pct}% do vídeo assistido`;
  }

  function refreshCourseDetailStatus(course) {
    const progress = AppState.courseProgress[course.id];
    const pct = courseProgressPct(course);
    const card = $('#completionCard');
    if (card) card.innerHTML = renderCompletionCardHTML(course, progress, pct);
    const lessonList = $('#lessonList');
    if (lessonList) lessonList.innerHTML = renderLessonOutlineHTML(course, progress);
  }

  /* ------------------------------------------------------------------ *
   * 11. EXPENSE TRACKER
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
      chip.innerHTML = `<span aria-hidden="true" style="display:flex;">${icon(cat.icon, 18)}</span><span>${cat.label}</span>`;
      chip.addEventListener('click', () => {
        selectedCategory = cat.id;
        $$('.category-chip', picker).forEach((c) => c.setAttribute('aria-checked', String(c === chip)));
        clearFieldError('expCategory');
      });
      picker.appendChild(chip);
    });

    $('#expDate').value = new Date().toISOString().slice(0, 10);

    $('#expenseForm').addEventListener('submit', onSubmitExpense);
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
    $('#budgetGoalInput').value = AppState.budgetGoal;

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
          <span class="budget-bar-row__cat" style="display:inline-flex;align-items:center;gap:6px;">${icon(cat.icon, 15)}${cat.label}</span>
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
        <span class="tx-item__icon" aria-hidden="true">${icon(cat.icon, 18)}</span>
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
   * 12. PROGRESS / CERTIFICATION
   * ------------------------------------------------------------------ */
  function renderProgress() {
    const totalCourses = COURSES.length;
    const sumPct = COURSES.reduce((s, c) => s + courseProgressPct(c), 0);
    const overallPct = totalCourses ? Math.round(sumPct / totalCourses) : 0;

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
        <span class="cert-card__badge" aria-hidden="true">${icon('award', 18)}</span>
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
        <span aria-hidden="true" style="display:flex;color:var(--navy-800);">${icon(course.icon, 18)}</span>
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
   * 13. PROFILE (view/edit account, logout)
   * ------------------------------------------------------------------ */
  function initProfileModal() {
    $('#profileToggle').addEventListener('click', openProfileModal);
    $('#profileModalClose').addEventListener('click', closeProfileModal);
    $('#profileModalOverlay').addEventListener('click', (e) => {
      if (e.target === $('#profileModalOverlay')) closeProfileModal();
    });
    $('#profileForm').addEventListener('submit', onProfileSave);
    $('#logoutBtn').addEventListener('click', () => { closeProfileModal(); logout(); });
  }

  function openProfileModal() {
    if (!AppState) return;
    $('#profileName').value = AppState.userName;
    $('#profileEmail').value = AppState.email;
    $('#profileNewPassword').value = '';
    ['profileName', 'profileEmail', 'profileNewPassword'].forEach(clearFieldError);
    $('#profileModalOverlay').hidden = false;
    $('#profileToggle').setAttribute('aria-expanded', 'true');
  }

  function closeProfileModal() {
    $('#profileModalOverlay').hidden = true;
    $('#profileToggle').setAttribute('aria-expanded', 'false');
  }

  async function onProfileSave(evt) {
    evt.preventDefault();
    ['profileName', 'profileEmail', 'profileNewPassword'].forEach(clearFieldError);

    const name = $('#profileName').value.trim();
    const newEmail = $('#profileEmail').value.trim().toLowerCase();
    const newPassword = $('#profileNewPassword').value;
    let valid = true;

    if (!name) { setFieldError('profileName', 'Informe seu nome.'); valid = false; }
    if (!newEmail || !/^\S+@\S+\.\S+$/.test(newEmail)) { setFieldError('profileEmail', 'Informe um e-mail válido.'); valid = false; }
    if (newPassword && newPassword.length < 4) { setFieldError('profileNewPassword', 'A senha deve ter ao menos 4 caracteres.'); valid = false; }

    const users = getUsers();
    const oldEmail = AppState.email;
    if (newEmail !== oldEmail && users[newEmail]) {
      setFieldError('profileEmail', 'Este e-mail já está em uso.');
      valid = false;
    }
    if (!valid) return;

    const btn = $('#profileSaveBtn');
    btn.classList.add('is-loading'); btn.disabled = true;

    const userRecord = users[oldEmail];
    userRecord.name = name;
    userRecord.email = newEmail;
    if (newPassword) {
      userRecord.salt = randomSalt();
      userRecord.passwordHash = await hashPassword(newPassword, userRecord.salt);
    }

    if (newEmail !== oldEmail) {
      delete users[oldEmail];
      users[newEmail] = userRecord;
      saveUsers(users);
      AppState.email = newEmail;
      saveStateForUser(newEmail, AppState);
      localStorage.removeItem(STATE_PREFIX + oldEmail);
      setSessionEmail(newEmail);
    } else {
      saveUsers(users);
    }

    AppState.userName = name;
    save();

    btn.classList.remove('is-loading'); btn.disabled = false;
    closeProfileModal();
    setGreeting();
    renderHome();
    showToast('Dados atualizados com sucesso.', 'success');
  }

  /* ------------------------------------------------------------------ *
   * 14. INIT
   * ------------------------------------------------------------------ */
  function init() {
    initAuth();
    initNav();
    initCourseFilters();
    initExpenseForm();
    initCertModal();
    initProfileModal();

    const sessionEmail = getSessionEmail();
    const user = sessionEmail ? getUsers()[sessionEmail] : null;
    const state = sessionEmail ? loadStateForUser(sessionEmail) : null;

    if (sessionEmail && user && state) {
      AppState = state;
      showAppShell();
      restoreSession();
    } else {
      setSessionEmail(null);
      showAuthScreen();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
