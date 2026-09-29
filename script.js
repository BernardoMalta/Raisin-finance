/* ==========================================================================
   RAISIN FINANCE — script.js
   Auth (per-user accounts), navigation, study area (courses → modules →
   lessons, video-gated completion, quizzes, XP/levels, learning trail,
   library, certificates), admin area, expense tracker and achievements.

   PERSISTENCE NOTE:
   Accounts are stored in localStorage under 'raisin-finance-users' (name,
   email, role, salted SHA-256 password hash). Each user's app data is stored
   separately under 'raisin-finance-state-<email>'. Course content comes from
   courses.js (window.RAISIN_CONTENT) unless an admin saved an edited copy
   under 'raisin-finance-content'. This is a client-side-only app: there is
   no server, so auth, admin permissions and certificate codes are
   "reasonable for a static site", not production-grade. A backend is
   required for real multi-user admin, uploads and tamper-proof certificates.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 1. CONSTANTS
   * ------------------------------------------------------------------ */
  const EXPENSE_CATEGORIES = [
    { id: 'alimentacao', label: 'Alimentação', icon: 'plate' },
    { id: 'transporte', label: 'Transporte', icon: 'bus' },
    { id: 'moradia', label: 'Moradia', icon: 'home' },
    { id: 'entretenimento', label: 'Entreteni\u00admento', icon: 'film' }, // soft hyphen for narrow phones
    { id: 'educacao', label: 'Educação', icon: 'book' },
    { id: 'poupanca', label: 'Poupança', icon: 'coins' },
    { id: 'saude', label: 'Saúde', icon: 'heart' },
    { id: 'outros', label: 'Outros', icon: 'grid' }
  ];

  const LEVELS_OPTIONS = ['Iniciante', 'Intermediário', 'Avançado'];
  const COURSE_ICONS = ['coins', 'trendingUp', 'book', 'barChart', 'shieldCheck', 'target', 'layers'];

  // XP rules. Each award has a unique key and is granted only once, so
  // rewatching a lesson or retaking a quiz never farms XP.
  const XP = { lesson: 10, module: 50, quiz: 20, course: 200 };
  const LEVELS = [
    { min: 0, name: 'Iniciante' },
    { min: 150, name: 'Aprendiz' },
    { min: 450, name: 'Conhecedor' },
    { min: 900, name: 'Investidor' },
    { min: 1500, name: 'Especialista' }
  ];

  const WATCH_THRESHOLD = 0.95; // share of the video that must really be watched
  const CERT_SALT = 'raisin-cert-v1';
  const QR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

  /* ------------------------------------------------------------------ *
   * 2. STATE & STORAGE
   * ------------------------------------------------------------------ */
  let AppState = null; // set on login; shape from defaultState()
  let CONTENT = null;  // courses, trail, library
  let IDX = null;      // lookup tables built from CONTENT

  const USERS_KEY = 'raisin-finance-users';
  const SESSION_KEY = 'raisin-finance-session';
  const STATE_PREFIX = 'raisin-finance-state-';
  const CONTENT_KEY = 'raisin-finance-content';

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
      return true;
    } catch (e) {
      console.warn('Could not write', key, e);
      return false;
    }
  }

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

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
      study: defaultStudy(),
      lastView: 'home',
      activeCourseId: null,
      activeLessonId: null,
      activeModuleId: null
    };
  }

  function defaultStudy() {
    // lessons: { [lessonId]: { ranges: [[a,b]], duration, lastTime, completed, completedDate } }
    // quizzes: { [moduleId]: { best, last, total, attempts, date } }
    // courses: { [courseId]: { completedDate } }
    // xp:      { [awardKey]: amount }
    return { lessons: {}, quizzes: {}, courses: {}, xp: {}, last: null };
  }

  function loadStateForUser(email) { return readJSON(STATE_PREFIX + email, null); }
  function saveStateForUser(email, state) { writeJSON(STATE_PREFIX + email, state); }

  function save() {
    if (!AppState || !AppState.email) return;
    saveStateForUser(AppState.email, AppState);
  }

  function study() {
    if (!AppState.study) AppState.study = defaultStudy();
    return AppState.study;
  }

  /* ------------------------------------------------------------------ *
   * 3. CONTENT (courses.js + admin overrides)
   * ------------------------------------------------------------------ */
  function loadContent() {
    const saved = readJSON(CONTENT_KEY, null);
    CONTENT = saved && Array.isArray(saved.courses) ? saved : clone(window.RAISIN_CONTENT);
    if (!CONTENT.library) CONTENT.library = { articles: [], videos: [], glossary: [] };
    if (!CONTENT.trail) CONTENT.trail = [];
    buildIndex();
  }

  function buildIndex() {
    IDX = { courses: {}, modules: {}, lessons: {}, flat: {} };
    CONTENT.courses.forEach((course) => {
      IDX.courses[course.id] = course;
      const flat = [];
      course.modules.forEach((mod, mi) => {
        IDX.modules[mod.id] = { module: mod, course, index: mi };
        mod.lessons.forEach((lesson) => {
          const entry = { lesson, module: mod, moduleIndex: mi, course, number: flat.length + 1, pos: flat.length };
          flat.push(entry);
          IDX.lessons[lesson.id] = entry;
        });
      });
      IDX.flat[course.id] = flat;
    });
  }

  /* ------------------------------------------------------------------ *
   * 4. HASHING (best-effort client-side, no backend available)
   * ------------------------------------------------------------------ */
  async function sha256Hex(str) {
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
    return (hash >>> 0).toString(16).padStart(8, '0').repeat(8);
  }

  function hashPassword(password, salt) { return sha256Hex(salt + ':' + password); }

  function randomSalt() { return uid('s'); }

  /* ------------------------------------------------------------------ *
   * 5. UTILITIES
   * ------------------------------------------------------------------ */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  // Everything rendered with innerHTML goes through esc(): course content can
  // now be edited by an admin, and expense descriptions come from the user.
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Only http(s) links are rendered, so an edited URL can't become javascript:.
  function safeUrl(url) {
    if (!url) return '';
    try {
      const parsed = new URL(url, window.location.href);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
    } catch (e) {
      return '';
    }
  }

  function paragraphs(text) {
    return String(text || '').split(/\n{2,}/).filter((p) => p.trim())
      .map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
  }

  function formatBRL(value) {
    // Non-breaking space keeps "R$" glued to the amount when it wraps.
    return 'R$ ' + Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(isoStr) {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function formatMinutes(total) {
    total = Math.round(total || 0);
    if (total < 60) return `${total} min`;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }

  function formatHours(totalMinutes) {
    const hours = Math.max(1, Math.round((totalMinutes || 0) / 60));
    return `${hours} hora${hours > 1 ? 's' : ''}`;
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function currentMonthExpenses() {
    const now = new Date();
    return AppState.expenses.filter((e) => {
      const d = new Date(e.date + 'T00:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function getPath(obj, path) {
    return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  }

  function setPath(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((acc, key) => acc[key], obj);
    target[last] = value;
  }

  function normalize(str) {
    return String(str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded) resolve();
        else { existing.addEventListener('load', () => resolve()); existing.addEventListener('error', reject); }
        return;
      }
      const tag = document.createElement('script');
      tag.src = src;
      tag.onload = () => { tag.dataset.loaded = '1'; resolve(); };
      tag.onerror = reject;
      document.head.appendChild(tag);
    });
  }

  /* ------------------------------------------------------------------ *
   * 5b. ICONS (inline SVG set — no emoji anywhere in the UI)
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
    check: '<path d="M4.5 10.2L8 13.5L15.5 5.5"/>',
    lock: '<rect x="4.5" y="9" width="11" height="8" rx="1.5"/><path d="M7 9V6.5C7 4.8 8.3 3.5 10 3.5C11.7 3.5 13 4.8 13 6.5V9"/>',
    play: '<path d="M7 5L15 10L7 15V5Z"/>',
    playCircle: '<circle cx="10" cy="10" r="8"/><path d="M8.3 7L13 10L8.3 13V7Z"/>',
    clock: '<circle cx="10" cy="10" r="7.5"/><path d="M10 6V10L12.8 11.8"/>',
    layers: '<path d="M10 3L17 7L10 11L3 7L10 3Z"/><path d="M3 10.5L10 14.5L17 10.5"/><path d="M3 14L10 18L17 14"/>',
    search: '<circle cx="9" cy="9" r="5.5"/><path d="M13.2 13.2L17 17"/>',
    file: '<path d="M5 2.5H11.5L15 6V17.5H5V2.5Z"/><path d="M11.5 2.5V6H15"/><path d="M7.5 10H12.5M7.5 13H12.5"/>',
    link: '<path d="M8.5 11.5L11.5 8.5"/><path d="M9.5 6L11 4.5C12.4 3.1 14.6 3.1 15.5 4.5C16.9 5.4 16.9 7.6 15.5 9L14 10.5"/><path d="M10.5 14L9 15.5C7.6 16.9 5.4 16.9 4.5 15.5C3.1 14.6 3.1 12.4 4.5 11L6 9.5"/>',
    image: '<rect x="3" y="4" width="14" height="12" rx="1.5"/><circle cx="7.5" cy="8" r="1.4"/><path d="M3.5 14.5L8 10.5L11 13L13 11.5L16.5 14.5"/>',
    text: '<path d="M4 5H16M4 9H16M4 13H12"/>',
    chevronRight: '<path d="M8 4.5L13.5 10L8 15.5"/>',
    chevronLeft: '<path d="M12 4.5L6.5 10L12 15.5"/>',
    zap: '<path d="M11 2.5L4.5 11H10L9 17.5L15.5 9H10L11 2.5Z"/>',
    settings: '<circle cx="10" cy="10" r="2.6"/><path d="M10 2.5V4.5M10 15.5V17.5M2.5 10H4.5M15.5 10H17.5M4.7 4.7L6.1 6.1M13.9 13.9L15.3 15.3M4.7 15.3L6.1 13.9M13.9 6.1L15.3 4.7"/>',
    users: '<circle cx="7.5" cy="7" r="3"/><path d="M2.5 16.5C3 13.8 5 12.3 7.5 12.3C10 12.3 12 13.8 12.5 16.5"/><path d="M13 4.3C14.4 4.6 15.3 5.7 15.3 7C15.3 8.3 14.4 9.4 13 9.7"/><path d="M14.5 12.5C16.2 13 17.3 14.4 17.5 16.5"/>',
    trash: '<path d="M4 5.5H16M8 5.5V3.8C8 3.4 8.3 3 8.8 3H11.2C11.7 3 12 3.4 12 3.8V5.5M14.8 5.5L14.2 16.2C14.2 16.7 13.8 17 13.3 17H6.7C6.2 17 5.8 16.7 5.8 16.2L5.2 5.5"/>',
    arrowUp: '<path d="M10 16V4M5 9L10 4L15 9"/>',
    arrowDown: '<path d="M10 4V16M5 11L10 16L15 11"/>',
    plus: '<path d="M10 4V16M4 10H16"/>',
    edit: '<path d="M4 16L4.6 12.9L13 4.5C13.6 3.9 14.6 3.9 15.2 4.5L15.5 4.8C16.1 5.4 16.1 6.4 15.5 7L7.1 15.4L4 16Z"/>',
    download: '<path d="M10 3V13M5.5 8.5L10 13L14.5 8.5"/><path d="M3.5 16.5H16.5"/>',
    upload: '<path d="M10 13V3M5.5 7.5L10 3L14.5 7.5"/><path d="M3.5 16.5H16.5"/>',
    refresh: '<path d="M16 10C16 13.3 13.3 16 10 16C7.6 16 5.6 14.6 4.6 12.6"/><path d="M4 10C4 6.7 6.7 4 10 4C12.4 4 14.4 5.4 15.4 7.4"/><path d="M15.8 3.8V7.6H12"/><path d="M4.2 16.2V12.4H8"/>',
    help: '<circle cx="10" cy="10" r="8"/><path d="M7.8 7.8C7.8 6.6 8.8 5.7 10 5.7C11.2 5.7 12.2 6.6 12.2 7.8C12.2 9.4 10 9.5 10 11.2"/><circle cx="10" cy="14.2" r="0.9" fill="currentColor" stroke="none"/>'
  };

  function icon(name, size) {
    size = size || 20;
    return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
  }

  /* ------------------------------------------------------------------ *
   * 6. TOASTS
   * ------------------------------------------------------------------ */
  function showToast(message, type) {
    const stack = $('#toastStack');
    const el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'default');
    const iconName = type === 'success' ? 'checkCircle' : type === 'error' ? 'alertCircle' : type === 'xp' ? 'zap' : 'infoCircle';
    el.innerHTML = `<span class="toast__icon">${icon(iconName, 16)}</span><span>${esc(message)}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 250);
    }, 3200);
  }

  /* ------------------------------------------------------------------ *
   * 7. AUTH (login / cadastro / sessão / papéis)
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

      users[email] = { name, email, role: 'student', salt, passwordHash: hash, createdAt: new Date().toISOString() };
      saveUsers(users);
      saveStateForUser(email, defaultState(name, email));
      completeLogin(email, name);
    }
  }

  // Local prototype rule: while no admin exists in this browser, the first
  // account that logs in becomes admin. Admins can promote other accounts.
  function ensureAdminExists(email) {
    const users = getUsers();
    const hasAdmin = Object.values(users).some((u) => u.role === 'admin');
    if (!hasAdmin && users[email]) {
      users[email].role = 'admin';
      saveUsers(users);
      return true;
    }
    return false;
  }

  function isAdmin() {
    if (!AppState) return false;
    const user = getUsers()[AppState.email];
    return !!user && user.role === 'admin';
  }

  function completeLogin(email, name) {
    setSessionEmail(email);
    AppState = loadStateForUser(email) || defaultState(name, email);
    study();
    selectedCategory = null;
    save();
    const promoted = ensureAdminExists(email);
    showAppShell();
    restoreSession();
    showToast(`Bem-vindo, ${name.split(' ')[0]}!`, 'success');
    if (promoted) showToast('Você é o administrador deste navegador.', 'default');
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
    updateAdminNav();
  }

  function updateAdminNav() {
    const admin = isAdmin();
    $$('[data-tab="admin"]').forEach((el) => { el.hidden = !admin; });
    document.body.classList.toggle('has-admin', admin);
  }

  function logout() {
    setSessionEmail(null);
    stopVideoTracking();
    AppState = null;
    adminDraft = null;
    adminDirty = false;
    $('#profileModalOverlay').hidden = true;
    showAuthScreen();
    showToast('Você saiu da conta.', 'default');
  }

  function restoreSession() {
    setGreeting();
    const view = AppState.lastView || 'home';
    const lessonEntry = IDX.lessons[AppState.activeLessonId];
    if (view === 'lesson' && lessonEntry && isLessonUnlocked(lessonEntry)) {
      openLesson(AppState.activeLessonId);
    } else if ((view === 'course' || view === 'lesson') && IDX.courses[AppState.activeCourseId]) {
      openCourse(AppState.activeCourseId);
    } else if (view === 'quiz' && IDX.modules[AppState.activeModuleId]) {
      openCourse(IDX.modules[AppState.activeModuleId].course.id);
    } else if (['home', 'learn', 'track', 'progress', 'library', 'admin'].includes(view)) {
      goTo(view);
    } else {
      goTo('learn');
    }
  }

  /* ------------------------------------------------------------------ *
   * 8. NAVIGATION
   * ------------------------------------------------------------------ */
  const NAV_PARENT = { course: 'learn', lesson: 'learn', quiz: 'learn', library: 'learn' };
  let currentView = null;

  function goTo(tab) {
    if (currentView === 'admin' && tab !== 'admin' && adminDirty) {
      if (!window.confirm('Há alterações não salvas no Admin. Sair e descartar?')) return;
      adminDraft = null;
      adminDirty = false;
    }
    if (tab === 'admin' && !isAdmin()) tab = 'home';

    $$('.view').forEach((v) => { v.hidden = true; });
    const target = $('#view-' + tab);
    if (target) target.hidden = false;
    currentView = tab;

    const navTab = NAV_PARENT[tab] || tab;
    $$('.bottom-nav__item').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === navTab));
    $$('.app-nav__link').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === navTab));

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (AppState) {
      AppState.lastView = tab;
      save();
    }
    if (tab !== 'lesson') stopVideoTracking();

    if (tab === 'home') renderHome();
    if (tab === 'learn') renderStudies();
    if (tab === 'library') renderLibrary();
    if (tab === 'track') renderTrack();
    if (tab === 'progress') renderProgress();
    if (tab === 'admin') renderAdmin();
  }

  function initNav() {
    $$('.bottom-nav__item, .app-nav__link').forEach((btn) => {
      btn.addEventListener('click', () => goTo(btn.dataset.tab));
    });

    // Delegated actions used by dynamically rendered content.
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-goto], [data-course], [data-lesson], [data-quiz], [data-cert], [data-lib]');
      if (!el || el.disabled || el.closest('#view-admin')) return;
      if (el.dataset.goto) goTo(el.dataset.goto);
      else if (el.dataset.lesson) openLesson(el.dataset.lesson);
      else if (el.dataset.quiz) openQuiz(el.dataset.quiz);
      else if (el.dataset.cert) openCertificate(IDX.courses[el.dataset.cert]);
      else if (el.dataset.course) openCourse(el.dataset.course);
      else if (el.dataset.lib) openLibrary(el.dataset.lib, el.dataset.term);
    });
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
   * 9. STUDY PROGRESS MODEL
   * ------------------------------------------------------------------ */
  function lessonState(id) {
    const s = study();
    if (!s.lessons[id]) s.lessons[id] = { ranges: [], duration: 0, lastTime: 0, completed: false };
    return s.lessons[id];
  }

  function isLessonDone(id) {
    const ls = study().lessons[id];
    return !!(ls && ls.completed);
  }

  function isLessonUnlocked(entry) {
    if (!entry) return false;
    if (entry.pos === 0 || isAdmin()) return true;
    const prev = IDX.flat[entry.course.id][entry.pos - 1];
    return isLessonDone(prev.lesson.id);
  }

  function lessonStatus(entry) {
    if (isLessonDone(entry.lesson.id)) return 'done';
    if (!isLessonUnlocked(entry)) return 'locked';
    const ls = study().lessons[entry.lesson.id];
    if (ls && (ls.lastTime > 0 || (ls.ranges && ls.ranges.length))) return 'progress';
    return 'available';
  }

  function watchedShare(ls) {
    if (!ls || !ls.duration) return 0;
    const seconds = (ls.ranges || []).reduce((s, r) => s + (r[1] - r[0]), 0);
    return Math.min(1, seconds / ls.duration);
  }

  function courseLessonCount(course) { return IDX.flat[course.id].length; }
  function courseMinutes(course) { return IDX.flat[course.id].reduce((s, e) => s + (Number(e.lesson.minutes) || 0), 0); }
  function courseDoneCount(course) { return IDX.flat[course.id].filter((e) => isLessonDone(e.lesson.id)).length; }

  function coursePct(course) {
    const total = courseLessonCount(course);
    return total ? Math.round((courseDoneCount(course) / total) * 100) : 0;
  }

  function isCourseComplete(course) {
    const total = courseLessonCount(course);
    return total > 0 && courseDoneCount(course) === total;
  }

  function isModuleComplete(mod) {
    return mod.lessons.length > 0 && mod.lessons.every((l) => isLessonDone(l.id));
  }

  function nextLessonEntry(course) {
    return IDX.flat[course.id].find((e) => !isLessonDone(e.lesson.id)) || null;
  }

  function isCourseStarted(course) {
    return IDX.flat[course.id].some((e) => {
      const ls = study().lessons[e.lesson.id];
      return ls && (ls.completed || ls.lastTime > 0);
    });
  }

  // The course the learner is "on": the last one they opened (if unfinished),
  // otherwise the first started-but-unfinished, otherwise the first unfinished.
  function currentCourse() {
    const last = study().last;
    const lastCourse = last && IDX.courses[last.courseId];
    if (lastCourse && !isCourseComplete(lastCourse)) return lastCourse;
    return CONTENT.courses.find((c) => isCourseStarted(c) && !isCourseComplete(c))
      || CONTENT.courses.find((c) => courseLessonCount(c) && !isCourseComplete(c))
      || null;
  }

  function totalLessons() { return CONTENT.courses.reduce((s, c) => s + courseLessonCount(c), 0); }
  function totalLessonsDone() { return CONTENT.courses.reduce((s, c) => s + courseDoneCount(c), 0); }

  /* ------------------------------------------------------------------ *
   * 10. XP & LEVELS
   * ------------------------------------------------------------------ */
  function xpTotal(studyState) {
    const xp = (studyState || study()).xp || {};
    return Object.values(xp).reduce((s, v) => s + (Number(v) || 0), 0);
  }

  function levelInfo(xp) {
    let idx = 0;
    LEVELS.forEach((lvl, i) => { if (xp >= lvl.min) idx = i; });
    const cur = LEVELS[idx];
    const next = LEVELS[idx + 1] || null;
    const pct = next ? Math.round(((xp - cur.min) / (next.min - cur.min)) * 100) : 100;
    return { number: idx + 1, name: cur.name, min: cur.min, next, pct, xp };
  }

  function awardXP(key, amount, label) {
    const s = study();
    if (s.xp[key]) return 0;
    const before = levelInfo(xpTotal()).number;
    s.xp[key] = amount;
    save();
    showToast(`+${amount} XP · ${label}`, 'xp');
    const after = levelInfo(xpTotal());
    if (after.number > before) {
      setTimeout(() => showToast(`Novo nível: ${after.number} — ${after.name}!`, 'success'), 400);
    }
    return amount;
  }

  function levelBadgeHTML() {
    const info = levelInfo(xpTotal());
    return `<span class="xp-pill">${icon('zap', 14)}Nível ${info.number} · ${esc(info.name)} · <span class="ledger">${info.xp} XP</span></span>`;
  }

  /* ------------------------------------------------------------------ *
   * 11. LESSON COMPLETION
   * ------------------------------------------------------------------ */
  function completeLesson(entry) {
    const ls = lessonState(entry.lesson.id);
    if (ls.completed) return;
    ls.completed = true;
    ls.completedDate = todayISO();
    save();

    awardXP('lesson:' + entry.lesson.id, XP.lesson, 'Aula concluída');

    if (isModuleComplete(entry.module)) {
      awardXP('module:' + entry.module.id, XP.module, `Módulo "${entry.module.title}" concluído`);
      const hasQuiz = entry.module.quiz && entry.module.quiz.questions && entry.module.quiz.questions.length;
      if (hasQuiz) setTimeout(() => showToast('Questionário do módulo liberado.', 'default'), 800);
    }

    if (isCourseComplete(entry.course)) {
      const s = study();
      if (!s.courses[entry.course.id]) s.courses[entry.course.id] = { completedDate: todayISO() };
      save();
      awardXP('course:' + entry.course.id, XP.course, `Curso "${entry.course.title}" concluído`);
      setTimeout(() => openCertificate(entry.course), 900);
    }

    if (currentView === 'lesson' && AppState.activeLessonId === entry.lesson.id) refreshLessonChrome(entry);
  }

  /* ------------------------------------------------------------------ *
   * 12. VIDEO TRACKING
   * Counts only seconds that were actually played: every tick compares how
   * far the video advanced with how much real time passed, so seeking ahead
   * never counts as watched. Supports YouTube and plain MP4 URLs.
   * ------------------------------------------------------------------ */
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

  const Tracker = { entry: null, api: null, interval: null, destroy: null, token: null, lastT: null, lastWall: 0, ticks: 0 };

  function stopVideoTracking() {
    if (Tracker.interval) clearInterval(Tracker.interval);
    if (Tracker.destroy) {
      try { Tracker.destroy(); } catch (e) { /* player may already be gone */ }
    }
    if (Tracker.entry && AppState) save();
    Object.assign(Tracker, { entry: null, api: null, interval: null, destroy: null, token: null, lastT: null, lastWall: 0, ticks: 0 });
  }

  function addRange(ranges, a, b) {
    ranges.push([Math.round(a * 10) / 10, Math.round(b * 10) / 10]);
    ranges.sort((x, y) => x[0] - y[0]);
    const merged = [];
    ranges.forEach((r) => {
      const last = merged[merged.length - 1];
      if (last && r[0] <= last[1] + 0.75) last[1] = Math.max(last[1], r[1]);
      else merged.push([r[0], r[1]]);
    });
    ranges.length = 0;
    merged.forEach((r) => ranges.push(r));
  }

  async function mountLessonVideo(entry) {
    stopVideoTracking();
    const host = $('#lessonVideo');
    const lesson = entry.lesson;
    const ls = lessonState(lesson.id);
    const token = {};
    Tracker.token = token;

    if (lesson.videoId) {
      host.innerHTML = '<div id="ytLessonPlayer"></div>';
      const YT = await loadYouTubeAPI();
      if (Tracker.token !== token || !document.getElementById('ytLessonPlayer')) return; // navigated away
      const playerVars = { rel: 0, playsinline: 1, modestbranding: 1 };
      if (/^https?:$/.test(window.location.protocol)) playerVars.origin = window.location.origin;
      // Resume point is passed as `start` so the video is only cued there.
      // (seekTo() on an unstarted player starts playback with sound.)
      if (ls.lastTime > 3 && !ls.completed) playerVars.start = Math.floor(ls.lastTime);
      const player = new YT.Player('ytLessonPlayer', {
        width: '100%',
        height: '100%',
        videoId: lesson.videoId,
        playerVars
      });
      Tracker.api = {
        time: () => (player.getCurrentTime ? player.getCurrentTime() : 0),
        duration: () => (player.getDuration ? player.getDuration() : 0),
        playing: () => !!player.getPlayerState && player.getPlayerState() === 1
      };
      Tracker.destroy = () => player.destroy();
    } else if (safeUrl(lesson.videoUrl)) {
      host.innerHTML = `<video controls playsinline preload="metadata" src="${esc(safeUrl(lesson.videoUrl))}"></video>`;
      const v = host.querySelector('video');
      v.addEventListener('loadedmetadata', () => {
        if (ls.lastTime > 3 && !ls.completed && ls.lastTime < v.duration - 5) v.currentTime = ls.lastTime;
      }, { once: true });
      Tracker.api = { time: () => v.currentTime, duration: () => v.duration || 0, playing: () => !v.paused && !v.ended };
      Tracker.destroy = () => { v.pause(); v.removeAttribute('src'); v.load(); };
    } else {
      host.innerHTML = `
        <div class="lesson-video__empty">
          ${icon('film', 28)}
          <span>O vídeo desta aula ainda não foi cadastrado.</span>
        </div>`;
      return;
    }

    Tracker.entry = entry;
    Tracker.interval = setInterval(trackTick, 1000);
  }

  function trackTick() {
    const entry = Tracker.entry;
    if (!entry || !Tracker.api || !AppState) return;
    let t, d, playing;
    try {
      t = Tracker.api.time();
      d = Tracker.api.duration();
      playing = Tracker.api.playing();
    } catch (e) { return; }
    if (!d || !isFinite(d)) return;

    const ls = lessonState(entry.lesson.id);
    ls.duration = d;
    const now = performance.now();
    if (playing && Tracker.lastT != null) {
      const advanced = t - Tracker.lastT;
      const wall = (now - Tracker.lastWall) / 1000;
      // Up to 2x playback speed counts; jumps (seek) and rewinds don't.
      if (advanced > 0 && advanced <= wall * 2.1 + 0.5) addRange(ls.ranges, Tracker.lastT, t);
    }
    Tracker.lastT = t;
    Tracker.lastWall = now;
    if (playing) ls.lastTime = t;

    Tracker.ticks++;
    if (Tracker.ticks % 5 === 0) save();

    updateWatchUI(entry);
    if (!ls.completed && watchedShare(ls) >= WATCH_THRESHOLD) completeLesson(entry);
  }

  /* ------------------------------------------------------------------ *
   * 13. HOME / DASHBOARD
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

    const doneCourses = CONTENT.courses.filter(isCourseComplete).length;
    $('#statCourses').textContent = `${doneCourses} / ${CONTENT.courses.length}`;
    $('#statCerts').textContent = String(Object.keys(study().courses).filter((id) => IDX.courses[id]).length);

    $('#homeLearning').innerHTML = renderLearningCardHTML();
  }

  function renderLearningCardHTML() {
    const course = currentCourse();
    const head = `
      <div class="learn-card__head">
        <span class="learn-card__eyebrow">${icon('book', 15)}Seu aprendizado</span>
        ${levelBadgeHTML()}
      </div>`;

    if (!course) {
      const anyCourse = CONTENT.courses.length > 0;
      return `<div class="learn-card">${head}
        <h3 class="learn-card__course">${anyCourse ? 'Você concluiu todos os cursos disponíveis' : 'Nenhum curso disponível ainda'}</h3>
        <p class="learn-card__next">${anyCourse ? 'Revise os conteúdos na biblioteca ou veja seus certificados.' : 'Assim que novos cursos forem publicados, eles aparecem aqui.'}</p>
        <button class="btn btn--primary" data-goto="${anyCourse ? 'progress' : 'learn'}">${anyCourse ? 'Ver conquistas' : 'Ir para Estudos'}</button>
      </div>`;
    }

    const pct = coursePct(course);
    const next = nextLessonEntry(course);
    return `<div class="learn-card">${head}
      <p class="learn-card__label">Curso atual</p>
      <h3 class="learn-card__course">${esc(course.title)}</h3>
      <div class="progress-line">
        <div class="progress-line__track"><div class="progress-line__fill" style="width:${pct}%"></div></div>
        <span class="progress-line__pct ledger">${pct}%</span>
      </div>
      ${next ? `<p class="learn-card__next">Próxima aula: <strong>“${esc(next.lesson.title)}”</strong></p>` : ''}
      <button class="btn btn--primary" ${next ? `data-lesson="${esc(next.lesson.id)}"` : `data-course="${esc(course.id)}"`}>
        ${icon('play', 16)}<span>${pct > 0 ? 'Continuar estudando' : 'Começar a estudar'}</span>
      </button>
    </div>`;
  }

  /* ------------------------------------------------------------------ *
   * 14. ESTUDOS (study home)
   * ------------------------------------------------------------------ */
  function courseCoverHTML(course, size) {
    const cover = safeUrl(course.cover);
    const color = /^#[0-9a-f]{3,8}$/i.test(course.color || '') ? course.color : '#0B2545';
    return `<div class="course-cover course-cover--${size || 'md'}" style="--cover:${color}">
      ${cover ? `<img src="${esc(cover)}" alt="" loading="lazy">` : `<span class="course-cover__art" aria-hidden="true">${icon(course.icon || 'book', size === 'lg' ? 56 : 40)}</span>`}
      <span class="course-cover__level">${esc(course.level || 'Iniciante')}</span>
    </div>`;
  }

  function renderStudies() {
    const body = $('#studiesBody');
    const courses = CONTENT.courses;
    const current = currentCourse();
    const next = current ? nextLessonEntry(current) : null;

    const continueHTML = current && next && isCourseStarted(current) ? `
      <button class="continue-card" data-lesson="${esc(next.lesson.id)}">
        <span class="continue-card__icon">${icon('playCircle', 26)}</span>
        <span class="continue-card__body">
          <span class="continue-card__eyebrow">Continue de onde parou</span>
          <span class="continue-card__title">Aula ${pad2(next.number)} — ${esc(next.lesson.title)}</span>
          <span class="continue-card__meta">${esc(current.title)} · ${coursePct(current)}% concluído</span>
        </span>
        <span class="continue-card__chev">${icon('chevronRight', 20)}</span>
      </button>` : '';

    const cards = courses.map((course) => {
      const pct = coursePct(course);
      const done = isCourseComplete(course);
      const started = isCourseStarted(course);
      const count = courseLessonCount(course);
      const label = done ? 'Revisar curso' : started ? 'Continuar curso' : 'Começar curso';
      return `
        <article class="study-card">
          ${courseCoverHTML(course)}
          <div class="study-card__body">
            <h3 class="study-card__title">${esc(course.title)}</h3>
            <p class="study-card__desc">${esc(course.desc)}</p>
            <p class="study-card__meta">
              <span>${icon('playCircle', 14)}${count} aula${count === 1 ? '' : 's'}</span>
              <span>${icon('clock', 14)}${formatMinutes(courseMinutes(course))}</span>
              <span>${icon('layers', 14)}${course.modules.length} módulo${course.modules.length === 1 ? '' : 's'}</span>
            </p>
            <div class="progress-line">
              <div class="progress-line__track"><div class="progress-line__fill" style="width:${pct}%"></div></div>
              <span class="progress-line__pct ledger">${pct}%</span>
            </div>
            <div class="study-card__actions">
              <button class="btn btn--primary btn--block" data-course="${esc(course.id)}">${label}</button>
              ${done ? `<button class="btn btn--ghost" data-cert="${esc(course.id)}" aria-label="Ver certificado">${icon('award', 18)}</button>` : ''}
            </div>
          </div>
        </article>`;
    }).join('');

    body.innerHTML = `
      <div class="study-strip">
        ${levelBadgeHTML()}
        <span class="study-strip__path">Organizar <i>→</i> Guardar <i>→</i> Entender <i>→</i> Investir <i>→</i> Evoluir</span>
      </div>
      ${continueHTML}
      <div class="section-block">
        <div class="section-block__head"><h2>Cursos</h2><span class="section-block__aside">${courses.length} disponíve${courses.length === 1 ? 'l' : 'is'}</span></div>
        ${courses.length ? `<div class="study-grid">${cards}</div>` : '<p class="empty-state is-visible">Nenhum curso publicado ainda.</p>'}
      </div>
      ${renderTrailHTML()}
      <div class="section-block">
        <div class="section-block__head"><h2>Biblioteca</h2><button class="text-link" data-lib="articles">Abrir</button></div>
        <div class="quick-grid">
          <button class="quick-card" data-lib="articles"><span class="quick-card__icon">${icon('file', 22)}</span><span class="quick-card__title">Artigos</span><span class="quick-card__desc">${CONTENT.library.articles.length} leituras rápidas</span></button>
          <button class="quick-card" data-lib="videos"><span class="quick-card__icon">${icon('playCircle', 22)}</span><span class="quick-card__title">Vídeos rápidos</span><span class="quick-card__desc">De 2 a 10 minutos</span></button>
          <button class="quick-card" data-lib="glossary"><span class="quick-card__icon">${icon('search', 22)}</span><span class="quick-card__title">Glossário</span><span class="quick-card__desc">${CONTENT.library.glossary.length} termos financeiros</span></button>
        </div>
      </div>`;
  }

  function renderTrailHTML() {
    const steps = CONTENT.trail.map((step) => {
      const ids = (step.lessons || []).filter((id) => IDX.lessons[id]);
      const done = ids.filter(isLessonDone).length;
      return { step, ids, done, complete: ids.length > 0 && done === ids.length };
    }).filter((s) => s.ids.length);
    if (!steps.length) return '';
    const currentIdx = steps.findIndex((s) => !s.complete);

    return `
      <div class="section-block">
        <div class="section-block__head"><h2>Trilha de aprendizado</h2><span class="section-block__aside">Não sabe por onde começar? Siga a ordem.</span></div>
        <ol class="trail">
          <li class="trail__start">Comece aqui</li>
          ${steps.map((s, i) => {
            const state = s.complete ? 'done' : i === currentIdx ? 'current' : 'next';
            const target = s.ids.find((id) => !isLessonDone(id)) || s.ids[0];
            return `
              <li class="trail__step is-${state}">
                <button class="trail__btn" data-lesson="${esc(target)}">
                  <span class="trail__num">${s.complete ? icon('check', 14) : i + 1}</span>
                  <span class="trail__body">
                    <span class="trail__title">${esc(s.step.title)}</span>
                    <span class="trail__meta">${s.done}/${s.ids.length} aulas${state === 'current' ? ' · você está aqui' : ''}</span>
                  </span>
                  <span class="trail__chev">${icon('chevronRight', 18)}</span>
                </button>
              </li>`;
          }).join('')}
        </ol>
      </div>`;
  }

  /* ------------------------------------------------------------------ *
   * 15. COURSE PAGE
   * ------------------------------------------------------------------ */
  function openCourse(courseId) {
    const course = IDX.courses[courseId];
    if (!course) { goTo('learn'); return; }
    AppState.activeCourseId = courseId;
    renderCourse(course);
    goTo('course');
  }

  function statusIconHTML(status, number) {
    if (status === 'done') return `<span class="st st--done" title="Concluída">${icon('check', 12)}</span>`;
    if (status === 'locked') return `<span class="st st--locked" title="Bloqueada">${icon('lock', 12)}</span>`;
    if (status === 'progress') return '<span class="st st--progress" title="Em andamento"><i></i></span>';
    return `<span class="st st--open">${number}</span>`;
  }

  const STATUS_LABEL = { done: 'Concluída', progress: 'Em andamento', locked: 'Bloqueada', available: '' };

  function quizRowHTML(mod) {
    const questions = mod.quiz && mod.quiz.questions ? mod.quiz.questions.length : 0;
    if (!questions) return '';
    const unlocked = isModuleComplete(mod) || isAdmin();
    const result = study().quizzes[mod.id];
    const meta = result ? `Melhor nota ${result.best}/${result.total}` : unlocked ? `${questions} perguntas` : 'Conclua as aulas do módulo';
    return `
      <button class="outline-row outline-row--quiz${unlocked ? '' : ' is-locked'}" ${unlocked ? `data-quiz="${esc(mod.id)}"` : 'disabled'}>
        <span class="st ${result ? 'st--done' : unlocked ? 'st--quiz' : 'st--locked'}">${icon(result ? 'check' : unlocked ? 'help' : 'lock', 12)}</span>
        <span class="outline-row__title">Questionário do módulo</span>
        <span class="outline-row__meta">${esc(meta)}</span>
      </button>`;
  }

  function renderOutlineHTML(course, activeLessonId) {
    return course.modules.map((mod, mi) => {
      const done = mod.lessons.filter((l) => isLessonDone(l.id)).length;
      const rows = mod.lessons.map((lesson) => {
        const entry = IDX.lessons[lesson.id];
        const status = lessonStatus(entry);
        const locked = status === 'locked';
        return `
          <button class="outline-row is-${status}${lesson.id === activeLessonId ? ' is-active' : ''}" ${locked ? 'disabled' : `data-lesson="${esc(lesson.id)}"`}>
            ${statusIconHTML(status, entry.number)}
            <span class="outline-row__title">Aula ${pad2(entry.number)} — ${esc(lesson.title)}</span>
            <span class="outline-row__meta">${STATUS_LABEL[status] || `${Number(lesson.minutes) || 0} min`}</span>
          </button>`;
      }).join('');
      return `
        <div class="outline-module">
          <div class="outline-module__head">
            <span class="outline-module__title">Módulo ${mi + 1} — ${esc(mod.title)}</span>
            <span class="outline-module__count ledger">${done}/${mod.lessons.length}</span>
          </div>
          <div class="outline-module__rows">${rows}${quizRowHTML(mod)}</div>
        </div>`;
    }).join('');
  }

  function renderCourse(course) {
    const pct = coursePct(course);
    const next = nextLessonEntry(course);
    const done = isCourseComplete(course);
    const count = courseLessonCount(course);

    $('#courseDetail').innerHTML = `
      <button class="back-btn" data-goto="learn">${icon('chevronLeft', 18)}Estudos</button>
      <div class="course-hero">
        ${courseCoverHTML(course, 'lg')}
        <div class="course-hero__body">
          <p class="page-head__eyebrow">Curso · ${esc(course.level || 'Iniciante')}</p>
          <h1 class="course-hero__title">${esc(course.title)}</h1>
          <p class="course-hero__desc">${esc(course.desc)}</p>
          <p class="study-card__meta">
            <span>${icon('playCircle', 14)}${count} aula${count === 1 ? '' : 's'}</span>
            <span>${icon('clock', 14)}${formatMinutes(courseMinutes(course))}</span>
            <span>${icon('layers', 14)}${course.modules.length} módulo${course.modules.length === 1 ? '' : 's'}</span>
          </p>
          <div class="progress-line progress-line--lg">
            <div class="progress-line__track"><div class="progress-line__fill" style="width:${pct}%"></div></div>
            <span class="progress-line__pct ledger">${pct}% concluído</span>
          </div>
          <div class="course-hero__actions">
            ${next ? `<button class="btn btn--primary" data-lesson="${esc(next.lesson.id)}">${icon('play', 16)}<span>${pct > 0 ? `Continuar: Aula ${pad2(next.number)}` : 'Começar curso'}</span></button>` : ''}
            ${done ? `<button class="btn btn--primary" data-cert="${esc(course.id)}">${icon('award', 16)}<span>Ver certificado</span></button>` : ''}
          </div>
        </div>
      </div>
      <div class="section-block">
        <div class="section-block__head"><h2>Conteúdo do curso</h2></div>
        <div class="outline">${renderOutlineHTML(course, null)}</div>
      </div>
      <p class="disclaimer">${icon('infoCircle', 14)}<span>${esc(CONTENT.disclaimer || '')}</span></p>`;
  }

  /* ------------------------------------------------------------------ *
   * 16. LESSON PAGE
   * ------------------------------------------------------------------ */
  function openLesson(lessonId) {
    const entry = IDX.lessons[lessonId];
    if (!entry) { goTo('learn'); return; }
    if (!isLessonUnlocked(entry)) {
      showToast('Aula bloqueada: conclua a aula anterior para liberar.', 'error');
      return;
    }
    AppState.activeCourseId = entry.course.id;
    AppState.activeLessonId = lessonId;
    study().last = { courseId: entry.course.id, lessonId };
    renderLesson(entry);
    goTo('lesson');
    mountLessonVideo(entry);
  }

  const MATERIAL_ICONS = { pdf: 'file', link: 'link', texto: 'text', infografico: 'image', glossario: 'search' };
  const MATERIAL_LABELS = { pdf: 'PDF', link: 'Link', texto: 'Texto', infografico: 'Infográfico', glossario: 'Glossário' };

  function materialsHTML(materials) {
    if (!materials || !materials.length) return '<p class="muted">Nenhum material complementar para esta aula.</p>';
    return `<div class="materials">${materials.map((m) => {
      const type = MATERIAL_ICONS[m.type] ? m.type : 'link';
      const head = `<span class="material__icon">${icon(MATERIAL_ICONS[type], 18)}</span>
        <span class="material__body"><span class="material__type">${MATERIAL_LABELS[type]}</span><span class="material__title">${esc(m.title)}</span></span>`;
      if (type === 'glossario') {
        const wanted = normalize(m.term || m.title);
        const term = CONTENT.library.glossary.find((g) => normalize(g.term) === wanted);
        return `<details class="material material--details"><summary>${head}</summary><p>${esc(term ? term.def : 'Termo não encontrado no glossário.')}</p></details>`;
      }
      if ((type === 'texto' || type === 'infografico') && m.text) {
        return `<div class="material material--text">${head}<p>${esc(m.text)}</p></div>`;
      }
      const url = safeUrl(m.url);
      return url
        ? `<a class="material" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${head}<span class="material__chev">${icon('chevronRight', 16)}</span></a>`
        : `<div class="material">${head}</div>`;
    }).join('')}</div>`;
  }

  function renderLesson(entry) {
    const { lesson, module: mod, course, number, moduleIndex } = entry;
    $('#lessonBody').innerHTML = `
      <div class="lesson-page">
        <div class="lesson-main">
          <button class="back-btn" data-course="${esc(course.id)}">${icon('chevronLeft', 18)}${esc(course.title)}</button>
          <div class="lesson-video" id="lessonVideo"></div>
          <p class="lesson-eyebrow">Módulo ${moduleIndex + 1} · ${esc(mod.title)}</p>
          <h1 class="lesson-title">Aula ${pad2(number)} — ${esc(lesson.title)}</h1>
          <div class="watch-card" id="watchCard"></div>

          ${lesson.learn && lesson.learn.length ? `
          <section class="lesson-section">
            <h2>O que você vai aprender</h2>
            <ul class="check-list">${lesson.learn.map((item) => `<li>${icon('check', 14)}<span>${esc(item)}</span></li>`).join('')}</ul>
          </section>` : ''}

          <section class="lesson-section">
            <h2>Resumo da aula</h2>
            <div class="prose">${paragraphs(lesson.summary) || '<p class="muted">Resumo ainda não disponível.</p>'}</div>
          </section>

          <section class="lesson-section">
            <h2>Material complementar</h2>
            ${materialsHTML(lesson.materials)}
          </section>

          <p class="disclaimer">${icon('infoCircle', 14)}<span>${esc(CONTENT.disclaimer || '')}</span></p>
          <div class="lesson-nav" id="lessonNav"></div>
        </div>
        <aside class="lesson-side" id="lessonSide"></aside>
      </div>`;
    refreshLessonChrome(entry);
  }

  function refreshLessonChrome(entry) {
    if (!$('#watchCard')) return;
    $('#watchCard').innerHTML = watchCardHTML(entry);
    $('#lessonNav').innerHTML = lessonNavHTML(entry);
    const course = entry.course;
    const pct = coursePct(course);
    $('#lessonSide').innerHTML = `
      <div class="side-card">
        <p class="side-card__title">${esc(course.title)}</p>
        <div class="progress-line">
          <div class="progress-line__track"><div class="progress-line__fill" style="width:${pct}%"></div></div>
          <span class="progress-line__pct ledger">${pct}%</span>
        </div>
        <div class="outline outline--compact">${renderOutlineHTML(course, entry.lesson.id)}</div>
      </div>`;

    const btn = $('#completeNoVideoBtn');
    if (btn) btn.addEventListener('click', () => completeLesson(entry));
  }

  function hasVideo(lesson) { return !!(lesson.videoId || safeUrl(lesson.videoUrl)); }

  function watchCardHTML(entry) {
    const ls = study().lessons[entry.lesson.id];
    if (ls && ls.completed) {
      return `<div class="watch-card__row is-done">${icon('checkCircle', 20)}
        <span><strong>Aula concluída</strong>${ls.completedDate ? ` em ${formatDate(ls.completedDate)}` : ''} · +${XP.lesson} XP</span></div>`;
    }
    if (!hasVideo(entry.lesson)) {
      return `<div class="watch-card__row">${icon('text', 20)}
        <span>Aula em texto. Leia o resumo e o material abaixo e marque como concluída.</span></div>
        <button class="btn btn--primary btn--sm" id="completeNoVideoBtn">Marcar como concluída</button>`;
    }
    const pct = Math.round(watchedShare(ls) * 100);
    return `
      <div class="watch-card__row">${icon('playCircle', 20)}
        <span><strong id="watchPct">${pct}%</strong> do vídeo assistido · a aula é concluída automaticamente em ${Math.round(WATCH_THRESHOLD * 100)}%</span></div>
      <div class="progress-line__track"><div class="progress-line__fill" id="watchBar" style="width:${pct}%"></div></div>
      <p class="watch-card__hint">Pular partes do vídeo não conta: vale só o tempo realmente assistido.</p>`;
  }

  function updateWatchUI(entry) {
    if (currentView !== 'lesson' || AppState.activeLessonId !== entry.lesson.id) return;
    const pct = Math.round(watchedShare(study().lessons[entry.lesson.id]) * 100);
    const label = $('#watchPct');
    const bar = $('#watchBar');
    if (label) label.textContent = pct + '%';
    if (bar) bar.style.width = pct + '%';
  }

  function lessonNavHTML(entry) {
    const flat = IDX.flat[entry.course.id];
    const prev = flat[entry.pos - 1];
    const next = flat[entry.pos + 1];
    const done = isLessonDone(entry.lesson.id);
    const lastOfModule = entry.module.lessons[entry.module.lessons.length - 1].id === entry.lesson.id;
    const hasQuiz = entry.module.quiz && entry.module.quiz.questions && entry.module.quiz.questions.length;

    const prevBtn = prev
      ? `<button class="btn btn--ghost" data-lesson="${esc(prev.lesson.id)}">${icon('chevronLeft', 16)}<span>Anterior</span></button>`
      : '<span></span>';

    const extra = [];
    if (lastOfModule && hasQuiz && isModuleComplete(entry.module)) {
      extra.push(`<button class="btn btn--ghost" data-quiz="${esc(entry.module.id)}">${icon('help', 16)}<span>Questionário</span></button>`);
    }
    let nextBtn;
    if (next) {
      nextBtn = done || isAdmin()
        ? `<button class="btn btn--primary" data-lesson="${esc(next.lesson.id)}"><span>Próxima aula</span>${icon('chevronRight', 16)}</button>`
        : `<button class="btn btn--primary" disabled title="Conclua esta aula para liberar a próxima">${icon('lock', 16)}<span>Próxima aula</span></button>`;
    } else if (isCourseComplete(entry.course)) {
      nextBtn = `<button class="btn btn--primary" data-cert="${esc(entry.course.id)}">${icon('award', 16)}<span>Ver certificado</span></button>`;
    } else {
      nextBtn = `<button class="btn btn--primary" data-course="${esc(entry.course.id)}"><span>Voltar ao curso</span></button>`;
    }
    return `${prevBtn}<div class="lesson-nav__right">${extra.join('')}${nextBtn}</div>`;
  }

  /* ------------------------------------------------------------------ *
   * 17. QUIZ
   * ------------------------------------------------------------------ */
  let quizRun = null; // { moduleId, index, answers: [], correct, saved }

  function openQuiz(moduleId) {
    const info = IDX.modules[moduleId];
    if (!info || !info.module.quiz || !info.module.quiz.questions.length) return;
    if (!isModuleComplete(info.module) && !isAdmin()) {
      showToast('Conclua todas as aulas do módulo para liberar o questionário.', 'error');
      return;
    }
    AppState.activeModuleId = moduleId;
    AppState.activeCourseId = info.course.id;
    quizRun = { moduleId, index: 0, answers: [], correct: 0, saved: false };
    renderQuiz();
    goTo('quiz');
  }

  function renderQuiz() {
    const info = IDX.modules[quizRun.moduleId];
    const { module: mod, course, index: mi } = info;
    const questions = mod.quiz.questions;
    const body = $('#quizBody');
    const header = `
      <button class="back-btn" data-course="${esc(course.id)}">${icon('chevronLeft', 18)}${esc(course.title)}</button>
      <div class="page-head">
        <p class="page-head__eyebrow">Questionário · Módulo ${mi + 1}</p>
        <h1 class="page-head__title">${esc(mod.title)}</h1>
      </div>`;

    if (quizRun.index >= questions.length) {
      const total = questions.length;
      const score = quizRun.correct;
      if (!quizRun.saved) {
        const prev = study().quizzes[mod.id];
        study().quizzes[mod.id] = {
          best: Math.max(score, prev ? prev.best : 0),
          last: score,
          total,
          attempts: (prev ? prev.attempts : 0) + 1,
          date: todayISO()
        };
        quizRun.saved = true;
        save();
      }
      const pct = Math.round((score / total) * 100);
      body.innerHTML = `${header}
        <div class="quiz-card quiz-result">
          <span class="quiz-result__score ledger">${score}/${total}</span>
          <p class="quiz-result__label">${pct >= 70 ? 'Mandou bem! Você domina o conteúdo deste módulo.' : 'Vale revisar as aulas do módulo e tentar de novo.'}</p>
          <p class="muted">Resultado salvo no seu perfil. Melhor nota: ${study().quizzes[mod.id].best}/${total}.</p>
          <div class="quiz-result__actions">
            <button class="btn btn--ghost" id="quizRetryBtn">${icon('refresh', 16)}<span>Refazer</span></button>
            <button class="btn btn--primary" data-course="${esc(course.id)}">Voltar ao curso</button>
          </div>
        </div>`;
      $('#quizRetryBtn').addEventListener('click', () => openQuiz(mod.id));
      return;
    }

    const q = questions[quizRun.index];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    body.innerHTML = `${header}
      <div class="quiz-card">
        <div class="quiz-card__progress">
          <span class="ledger">Pergunta ${quizRun.index + 1} de ${questions.length}</span>
          <div class="progress-line__track"><div class="progress-line__fill" style="width:${(quizRun.index / questions.length) * 100}%"></div></div>
        </div>
        <h2 class="quiz-card__q">${esc(q.q)}</h2>
        <div class="quiz-options" id="quizOptions">
          ${q.options.map((opt, oi) => `
            <button class="quiz-option" data-option="${oi}">
              <span class="quiz-option__letter">${letters[oi]}</span><span>${esc(opt)}</span>
            </button>`).join('')}
        </div>
        <div class="quiz-feedback" id="quizFeedback" hidden></div>
      </div>`;

    $('#quizOptions').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-option]');
      if (!btn || quizRun.answers.length > quizRun.index) return;
      answerQuiz(q, Number(btn.dataset.option));
    });
  }

  function answerQuiz(q, choice) {
    const mod = IDX.modules[quizRun.moduleId].module;
    const correct = choice === Number(q.correct);
    quizRun.answers.push(choice);
    if (correct) quizRun.correct++;

    $$('#quizOptions .quiz-option').forEach((btn) => {
      const oi = Number(btn.dataset.option);
      btn.disabled = true;
      if (oi === Number(q.correct)) btn.classList.add('is-correct');
      else if (oi === choice) btn.classList.add('is-wrong');
    });

    let xpLine = '';
    if (correct) {
      const gained = awardXP(`quiz:${mod.id}:${quizRun.index}`, XP.quiz, 'Resposta correta');
      xpLine = gained ? ` <span class="xp-gain">+${gained} XP</span>` : ' <span class="muted">(XP já conquistado)</span>';
    }
    const isLast = quizRun.index === mod.quiz.questions.length - 1;
    const fb = $('#quizFeedback');
    fb.hidden = false;
    fb.className = 'quiz-feedback ' + (correct ? 'is-correct' : 'is-wrong');
    fb.innerHTML = `
      <p class="quiz-feedback__title">${icon(correct ? 'checkCircle' : 'alertCircle', 18)}<span>${correct ? 'Resposta correta!' : 'Não foi dessa vez.'}</span>${xpLine}</p>
      ${q.explain ? `<p>${esc(q.explain)}</p>` : ''}
      <button class="btn btn--primary" id="quizNextBtn">${isLast ? 'Ver resultado' : 'Próxima pergunta'}</button>`;
    $('#quizNextBtn').addEventListener('click', () => { quizRun.index++; renderQuiz(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* ------------------------------------------------------------------ *
   * 18. LIBRARY (articles, quick videos, glossary)
   * ------------------------------------------------------------------ */
  let libraryTab = 'articles';
  let libraryArticle = null;
  let glossaryQuery = '';

  function openLibrary(tab, term) {
    libraryTab = tab || 'articles';
    libraryArticle = null;
    glossaryQuery = term || '';
    goTo('library');
  }

  function renderLibrary() {
    const lib = CONTENT.library;
    const tabs = [['articles', 'Artigos'], ['videos', 'Vídeos rápidos'], ['glossary', 'Glossário']];
    let content = '';

    if (libraryTab === 'articles' && libraryArticle) {
      const a = lib.articles.find((x) => x.id === libraryArticle);
      content = a ? `
        <article class="article">
          <button class="back-btn" id="articleBackBtn">${icon('chevronLeft', 18)}Artigos</button>
          <h2 class="article__title">${esc(a.title)}</h2>
          <p class="article__meta">${icon('clock', 14)}${esc(a.minutes || 3)} min de leitura</p>
          <div class="prose">${paragraphs(a.body)}</div>
          <p class="disclaimer">${icon('infoCircle', 14)}<span>${esc(CONTENT.disclaimer || '')}</span></p>
        </article>` : '';
    } else if (libraryTab === 'articles') {
      content = lib.articles.length ? `<div class="lib-list">${lib.articles.map((a) => `
        <button class="lib-item" data-article="${esc(a.id)}">
          <span class="lib-item__icon">${icon('file', 20)}</span>
          <span class="lib-item__body"><span class="lib-item__title">${esc(a.title)}</span>
          <span class="lib-item__meta">${esc(a.minutes || 3)} min de leitura</span></span>
          <span class="lib-item__chev">${icon('chevronRight', 18)}</span>
        </button>`).join('')}</div>` : '<p class="empty-state is-visible">Nenhum artigo publicado.</p>';
    } else if (libraryTab === 'videos') {
      content = lib.videos.length ? `<div class="video-grid">${lib.videos.map((v) => `
        <div class="video-tile">
          <button class="video-tile__thumb" data-play="${esc(v.videoId)}" aria-label="Assistir: ${esc(v.title)}">
            <img src="https://i.ytimg.com/vi/${encodeURIComponent(v.videoId)}/mqdefault.jpg" alt="" loading="lazy">
            <span class="video-tile__play">${icon('play', 22)}</span>
          </button>
          <span class="video-tile__topic">${esc(v.topic || '')}</span>
          <span class="video-tile__title">${esc(v.title)}</span>
          ${v.channel ? `<span class="video-tile__channel">${esc(v.channel)}</span>` : ''}
        </div>`).join('')}</div>` : '<p class="empty-state is-visible">Nenhum vídeo publicado.</p>';
    } else {
      content = `
        <div class="search-field">
          ${icon('search', 18)}
          <input type="search" id="glossarySearch" placeholder="Buscar termo, ex.: CDI" value="${esc(glossaryQuery)}" autocomplete="off" aria-label="Buscar no glossário">
        </div>
        <dl class="glossary" id="glossaryList"></dl>`;
    }

    $('#libraryBody').innerHTML = `
      <button class="back-btn" data-goto="learn">${icon('chevronLeft', 18)}Estudos</button>
      <div class="page-head">
        <p class="page-head__eyebrow">Conteúdos rápidos</p>
        <h1 class="page-head__title">Biblioteca</h1>
        <p class="page-head__subtitle">Artigos curtos, vídeos de poucos minutos e um glossário para consultar quando surgir dúvida.</p>
      </div>
      <div class="filter-row" role="tablist">
        ${tabs.map(([id, label]) => `<button class="chip${libraryTab === id ? ' is-active' : ''}" data-libtab="${id}" role="tab" aria-selected="${libraryTab === id}">${label}</button>`).join('')}
      </div>
      ${content}`;

    const body = $('#libraryBody');
    $$('[data-libtab]', body).forEach((chip) => chip.addEventListener('click', () => {
      libraryTab = chip.dataset.libtab; libraryArticle = null; renderLibrary();
    }));
    $$('[data-article]', body).forEach((btn) => btn.addEventListener('click', () => {
      libraryArticle = btn.dataset.article; renderLibrary(); window.scrollTo({ top: 0 });
    }));
    const back = $('#articleBackBtn');
    if (back) back.addEventListener('click', () => { libraryArticle = null; renderLibrary(); });
    $$('[data-play]', body).forEach((btn) => btn.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube.com/embed/${encodeURIComponent(btn.dataset.play)}?autoplay=1&rel=0`;
      frame.title = 'Vídeo';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture';
      frame.allowFullscreen = true;
      btn.replaceWith(frame);
    }));
    const search = $('#glossarySearch');
    if (search) {
      search.addEventListener('input', () => { glossaryQuery = search.value; renderGlossaryList(); });
      renderGlossaryList();
    }
  }

  function renderGlossaryList() {
    const q = normalize(glossaryQuery.trim());
    const items = CONTENT.library.glossary
      .filter((g) => !q || normalize(g.term).includes(q) || normalize(g.def).includes(q))
      .sort((a, b) => a.term.localeCompare(b.term, 'pt-BR'));
    $('#glossaryList').innerHTML = items.length
      ? items.map((g) => `<div class="glossary__item"><dt>${esc(g.term)}</dt><dd>${esc(g.def)}</dd></div>`).join('')
      : '<p class="empty-state is-visible">Nenhum termo encontrado.</p>';
  }

  /* ------------------------------------------------------------------ *
   * 19. EXPENSE TRACKER
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

    $('#expDate').value = todayISO();

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
      $('#expDate').value = todayISO();
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
          <span class="tx-item__desc">${esc(e.description)}</span>
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
   * 20. CONQUISTAS (progress, XP, certificates, quiz results)
   * ------------------------------------------------------------------ */
  function renderProgress() {
    const info = levelInfo(xpTotal());
    const total = totalLessons();
    const doneLessons = totalLessonsDone();
    const overallPct = total ? Math.round((doneLessons / total) * 100) : 0;
    const circumference = 2 * Math.PI * 52;
    const completedCourses = CONTENT.courses.filter((c) => study().courses[c.id]);
    const quizEntries = Object.entries(study().quizzes).filter(([id]) => IDX.modules[id]);

    $('#achievementsBody').innerHTML = `
      <div class="level-card">
        <div class="level-card__top">
          <span class="level-card__badge">${icon('zap', 22)}</span>
          <div>
            <p class="level-card__eyebrow">Nível ${info.number} de ${LEVELS.length}</p>
            <p class="level-card__name">${esc(info.name)}</p>
          </div>
          <span class="level-card__xp ledger">${info.xp} XP</span>
        </div>
        <div class="level-card__bar"><div style="width:${info.pct}%"></div></div>
        <p class="level-card__hint">${info.next ? `Faltam <strong>${info.next.min - info.xp} XP</strong> para ${esc(info.next.name)}` : 'Nível máximo alcançado.'}</p>
        <ol class="level-steps">${LEVELS.map((l, i) => `<li class="${i + 1 <= info.number ? 'is-reached' : ''}"><span>${i + 1}</span>${esc(l.name)}</li>`).join('')}</ol>
      </div>

      <div class="progress-overview">
        <div class="ring-card">
          <svg class="ring" viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#DCE4EE" stroke-width="10"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="#0B2545" stroke-width="10" stroke-linecap="round" stroke-dasharray="${circumference.toFixed(1)}" stroke-dashoffset="${(circumference * (1 - overallPct / 100)).toFixed(1)}" transform="rotate(-90 60 60)" class="ring__progress"/>
          </svg>
          <div class="ring-card__center">
            <span class="ledger ring-card__num">${overallPct}%</span>
            <span class="ring-card__caption">das aulas</span>
          </div>
        </div>
        <div class="progress-overview__stats">
          <div class="mini-stat"><span class="ledger mini-stat__num">${doneLessons}/${total}</span><span class="mini-stat__label">aulas concluídas</span></div>
          <div class="mini-stat"><span class="ledger mini-stat__num">${completedCourses.length}</span><span class="mini-stat__label">cursos concluídos</span></div>
          <div class="mini-stat"><span class="ledger mini-stat__num">${quizEntries.length}</span><span class="mini-stat__label">questionários feitos</span></div>
        </div>
      </div>

      <div class="section-block">
        <div class="section-block__head"><h2>Certificados</h2></div>
        ${completedCourses.length ? `<div class="cert-list">${completedCourses.map((course) => `
          <div class="cert-card">
            <span class="cert-card__badge" aria-hidden="true">${icon('award', 18)}</span>
            <span>
              <span class="cert-card__title">${esc(course.title)}</span>
              <span class="cert-card__date">Concluído em ${formatDate(study().courses[course.id].completedDate)}</span>
            </span>
            <button class="cert-card__btn" data-cert="${esc(course.id)}">Ver</button>
          </div>`).join('')}</div>`
          : '<p class="empty-state is-visible">Conclua 100% de um curso em Estudos para receber seu primeiro certificado.</p>'}
      </div>

      <div class="section-block">
        <div class="section-block__head"><h2>Questionários</h2></div>
        ${quizEntries.length ? `<div class="progress-course-list">${quizEntries.map(([id, r]) => {
          const m = IDX.modules[id];
          return `<button class="progress-course-row" data-quiz="${esc(id)}">
            <span style="display:flex;color:var(--navy-800);">${icon('help', 18)}</span>
            <span class="progress-course-row__title">${esc(m.course.title)} · ${esc(m.module.title)}</span>
            <span class="progress-course-row__pct ledger">${r.best}/${r.total}</span>
          </button>`;
        }).join('')}</div>` : '<p class="empty-state is-visible">Os questionários aparecem ao final de cada módulo.</p>'}
      </div>

      <div class="section-block">
        <div class="section-block__head"><h2>Como ganhar XP</h2></div>
        <div class="xp-rules">
          <div><span class="ledger">+${XP.lesson}</span>Assistir uma aula</div>
          <div><span class="ledger">+${XP.quiz}</span>Acertar uma pergunta</div>
          <div><span class="ledger">+${XP.module}</span>Concluir um módulo</div>
          <div><span class="ledger">+${XP.course}</span>Concluir um curso</div>
        </div>
      </div>

      <div class="section-block">
        <div class="section-block__head"><h2>Todos os cursos</h2></div>
        <div class="progress-course-list">${CONTENT.courses.map((course) => `
          <button class="progress-course-row" data-course="${esc(course.id)}">
            <span aria-hidden="true" style="display:flex;color:var(--navy-800);">${icon(course.icon || 'book', 18)}</span>
            <span class="progress-course-row__title">${esc(course.title)}</span>
            <span class="progress-course-row__pct ledger">${coursePct(course)}%</span>
          </button>`).join('')}</div>
      </div>`;
  }

  /* ------------------------------------------------------------------ *
   * 21. CERTIFICATE (code + QR + verification page)
   * The code is a hash of name|course|date. The verification page checks
   * that the data in the link matches the code. Without a server this only
   * detects casual edits — anyone who reads this source can mint a valid
   * code. A backend that signs certificates is required for real authenticity.
   * ------------------------------------------------------------------ */
  async function certCode(name, courseId, date) {
    const hex = (await sha256Hex(`${name}|${courseId}|${date}|${CERT_SALT}`)).toUpperCase();
    return `RF-${hex.slice(0, 5)}-${hex.slice(5, 10)}`;
  }

  function b64urlEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlDecode(str) {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function verifyUrl(payload) {
    return window.location.href.split('#')[0] + '#verificar/' + b64urlEncode(JSON.stringify(payload));
  }

  async function openCertificate(course) {
    if (!course) return;
    const record = study().courses[course.id];
    if (!record) return;
    const name = AppState.userName;
    const date = record.completedDate;
    const hours = formatHours(courseMinutes(course));
    const code = await certCode(name, course.id, date);

    $('#certUserName').textContent = name;
    $('#certCourseName').textContent = course.title;
    $('#certHours').textContent = `com carga horária de ${hours}`;
    $('#certDate').textContent = `Concluído em ${formatDate(date)}`;
    $('#certCode').textContent = code;
    $('#certModalOverlay').hidden = false;

    const url = verifyUrl({ n: name, c: course.id, t: course.title, h: hours, d: date, k: code });
    $('#certVerifyLink').href = url;
    const qrBox = $('#certQr');
    qrBox.innerHTML = '';
    try {
      await loadScript(QR_LIB);
      /* global QRCode */
      new QRCode(qrBox, { text: url, width: 88, height: 88, colorDark: '#0B2545', colorLight: '#FFFFFF', correctLevel: QRCode.CorrectLevel.M });
      qrBox.title = 'Escaneie para verificar';
    } catch (e) {
      qrBox.innerHTML = '<span class="muted">QR indisponível offline</span>';
    }
  }

  function initCertModal() {
    $('#certModalOverlay').hidden = true; // força o modal a começar fechado, ignorando qualquer estado anterior
    $('#certModalClose').addEventListener('click', () => { $('#certModalOverlay').hidden = true; });
    $('#certModalOverlay').addEventListener('click', (e) => {
      if (e.target === $('#certModalOverlay')) $('#certModalOverlay').hidden = true;
    });
    $('#certPrintBtn').addEventListener('click', () => window.print());
  }

  async function showVerifyScreen(encoded) {
    $('#authScreen').hidden = true;
    $('#appShell').hidden = true;
    const screen = $('#verifyScreen');
    screen.hidden = false;
    let data = null;
    try { data = JSON.parse(b64urlDecode(encoded)); } catch (e) { data = null; }

    let ok = false;
    if (data && data.n && data.c && data.d && data.k) {
      ok = (await certCode(String(data.n), String(data.c), String(data.d))) === data.k;
    }
    const course = ok && IDX.courses[data.c];
    $('#verifyBody').innerHTML = ok ? `
      <span class="verify__status is-ok">${icon('checkCircle', 30)}</span>
      <h1 class="auth-card__title">Certificado confere</h1>
      <p class="auth-card__subtitle">O código corresponde aos dados deste certificado.</p>
      <dl class="verify__data">
        <div><dt>Aluno</dt><dd>${esc(data.n)}</dd></div>
        <div><dt>Curso</dt><dd>${esc(course ? course.title : data.t)}</dd></div>
        <div><dt>Carga horária</dt><dd>${esc(data.h || '—')}</dd></div>
        <div><dt>Conclusão</dt><dd>${esc(formatDate(String(data.d)))}</dd></div>
        <div><dt>Código</dt><dd class="ledger">${esc(data.k)}</dd></div>
      </dl>` : `
      <span class="verify__status is-bad">${icon('alertCircle', 30)}</span>
      <h1 class="auth-card__title">Não foi possível validar</h1>
      <p class="auth-card__subtitle">Os dados deste link não correspondem a um certificado emitido pela Raisin Finance.</p>`;
    $('#verifyHomeBtn').onclick = () => {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      screen.hidden = true;
      boot();
    };
  }

  /* ------------------------------------------------------------------ *
   * 22. ADMIN (local prototype)
   * Edits a draft copy of CONTENT; "Salvar" stores it in this browser.
   * Student metrics read the accounts stored in this same browser.
   * ------------------------------------------------------------------ */
  let adminDraft = null;
  let adminDirty = false;
  let adminTab = 'overview';
  let adminCourseIdx = 0;
  const adminOpen = { lesson: null, quiz: null };

  function renderAdmin() {
    if (!isAdmin()) { goTo('home'); return; }
    if (!adminDraft) adminDraft = clone(CONTENT);
    const tabs = [['overview', 'Alunos e métricas'], ['content', 'Cursos e aulas'], ['data', 'Importar / exportar']];
    let content = '';
    if (adminTab === 'overview') content = adminOverviewHTML();
    else if (adminTab === 'content') content = adminContentHTML();
    else content = adminDataHTML();

    $('#adminBody').innerHTML = `
      <div class="page-head">
        <p class="page-head__eyebrow">Área administrativa</p>
        <h1 class="page-head__title">Admin</h1>
        <p class="page-head__subtitle">Gerencie cursos, módulos, aulas e questionários e acompanhe os alunos.</p>
      </div>
      <div class="admin-note">${icon('infoCircle', 16)}<span>Protótipo local: tudo fica salvo neste navegador. Para publicar para todos os usuários, exporte o JSON e substitua o conteúdo do <code>courses.js</code>, ou conecte um backend. Upload direto de vídeos e PDFs também depende de servidor; por enquanto, hospede o arquivo e cole o link.</span></div>
      <div class="filter-row">${tabs.map(([id, label]) => `<button class="chip${adminTab === id ? ' is-active' : ''}" data-act="tab" data-tab-id="${id}">${label}</button>`).join('')}</div>
      ${content}
      ${adminTab === 'content' ? `
      <div class="admin-savebar${adminDirty ? ' is-dirty' : ''}" id="adminSaveBar">
        <span id="adminSaveStatus">${adminDirty ? 'Alterações não salvas' : 'Tudo salvo'}</span>
        <button class="btn btn--ghost btn--sm" data-act="discard">Descartar</button>
        <button class="btn btn--primary btn--sm" data-act="save">Salvar alterações</button>
      </div>` : ''}`;
  }

  function adminStudents() {
    const users = getUsers();
    return Object.values(users).map((u) => {
      const st = AppState && u.email === AppState.email ? AppState : loadStateForUser(u.email);
      const s = (st && st.study) || defaultStudy();
      const perCourse = {};
      CONTENT.courses.forEach((c) => {
        const flat = IDX.flat[c.id];
        const done = flat.filter((e) => s.lessons[e.lesson.id] && s.lessons[e.lesson.id].completed).length;
        const started = flat.some((e) => s.lessons[e.lesson.id]);
        perCourse[c.id] = { pct: flat.length ? Math.round((done / flat.length) * 100) : 0, started, completed: !!s.courses[c.id] };
      });
      return {
        name: u.name, email: u.email, role: u.role || 'student',
        xp: xpTotal(s), perCourse,
        quizzes: Object.keys(s.quizzes || {}).length,
        certs: Object.keys(s.courses || {}).filter((id) => IDX.courses[id]).length
      };
    });
  }

  function adminOverviewHTML() {
    const students = adminStudents();
    const active = students.filter((s) => Object.values(s.perCourse).some((p) => p.started)).length;
    const certs = students.reduce((sum, s) => sum + s.certs, 0);
    const avgXp = students.length ? Math.round(students.reduce((sum, s) => sum + s.xp, 0) / students.length) : 0;

    const courseRows = CONTENT.courses.map((c) => {
      const started = students.filter((s) => s.perCourse[c.id].started);
      const completed = students.filter((s) => s.perCourse[c.id].completed).length;
      const avg = started.length ? Math.round(started.reduce((sum, s) => sum + s.perCourse[c.id].pct, 0) / started.length) : 0;
      return `<tr><td>${esc(c.title)}</td><td class="ledger">${started.length}</td><td class="ledger">${completed}</td><td class="ledger">${avg}%</td></tr>`;
    }).join('');

    const studentRows = students.map((s) => `
      <tr>
        <td><strong>${esc(s.name)}</strong><br><span class="muted">${esc(s.email)}</span></td>
        <td class="ledger">${s.xp} XP<br><span class="muted">Nível ${levelInfo(s.xp).number}</span></td>
        ${CONTENT.courses.map((c) => `<td class="ledger">${s.perCourse[c.id].pct}%</td>`).join('')}
        <td class="ledger">${s.quizzes}</td>
        <td>${s.email === AppState.email
          ? '<span class="role-tag">admin (você)</span>'
          : `<button class="btn btn--ghost btn--sm" data-act="role" data-email="${esc(s.email)}">${s.role === 'admin' ? 'Remover admin' : 'Tornar admin'}</button>`}</td>
      </tr>`).join('');

    return `
      <div class="stat-grid">
        <div class="stat-card"><p class="stat-card__label">Alunos cadastrados</p><p class="stat-card__value ledger">${students.length}</p></div>
        <div class="stat-card"><p class="stat-card__label">Estudando</p><p class="stat-card__value ledger">${active}</p><p class="stat-card__foot">Com ao menos uma aula iniciada</p></div>
        <div class="stat-card"><p class="stat-card__label">Certificados emitidos</p><p class="stat-card__value ledger">${certs}</p></div>
        <div class="stat-card"><p class="stat-card__label">XP médio</p><p class="stat-card__value ledger">${avgXp}</p></div>
      </div>
      <div class="section-block">
        <div class="section-block__head"><h2>Por curso</h2></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Curso</th><th>Alunos</th><th>Concluíram</th><th>Progresso médio</th></tr></thead>
          <tbody>${courseRows || '<tr><td colspan="4">Nenhum curso.</td></tr>'}</tbody>
        </table></div>
      </div>
      <div class="section-block">
        <div class="section-block__head"><h2>Alunos</h2></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Aluno</th><th>XP</th>${CONTENT.courses.map((c) => `<th>${esc(c.title)}</th>`).join('')}<th>Quizzes</th><th>Papel</th></tr></thead>
          <tbody>${studentRows}</tbody>
        </table></div>
      </div>`;
  }

  function adminField(label, inner, hint) {
    return `<label class="adm-field"><span class="adm-field__label">${label}</span>${inner}${hint ? `<span class="adm-field__hint">${hint}</span>` : ''}</label>`;
  }

  function materialsToText(materials) {
    return (materials || []).map((m) => `${m.type} | ${m.title} | ${m.url || m.text || m.term || ''}`).join('\n');
  }

  function parseMaterials(text) {
    return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [typeRaw, title, ...rest] = line.split('|').map((s) => s.trim());
      const type = MATERIAL_ICONS[normalize(typeRaw)] ? normalize(typeRaw) : 'link';
      const value = rest.join(' | ');
      const m = { type, title: title || value || typeRaw };
      if (type === 'glossario') m.term = value || title;
      else if (type === 'texto' || (type === 'infografico' && !/^https?:\/\//.test(value))) m.text = value;
      else m.url = value;
      return m;
    });
  }

  function parseVideo(value) {
    const v = value.trim();
    if (!v) return { videoId: null, videoUrl: null };
    const yt = v.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/) || v.match(/^([\w-]{11})$/);
    if (yt) return { videoId: yt[1], videoUrl: null };
    if (/^https?:\/\//.test(v)) return { videoId: null, videoUrl: v };
    return { videoId: null, videoUrl: null, invalid: true };
  }

  function adminLessonEditorHTML(lesson, path) {
    const videoValue = lesson.videoId ? `https://youtu.be/${lesson.videoId}` : (lesson.videoUrl || '');
    return `
      <div class="adm-editor">
        ${adminField('Título da aula', `<input type="text" data-bind="${path}.title" value="${esc(lesson.title)}">`)}
        <div class="adm-row">
          ${adminField('Duração (min)', `<input type="number" min="1" data-bind="${path}.minutes" data-kind="number" value="${esc(lesson.minutes)}">`)}
          ${adminField('Vídeo', `<input type="text" data-bind="${path}" data-kind="video" value="${esc(videoValue)}" placeholder="Link do YouTube ou URL de um .mp4">`, 'Aceita link do YouTube ou URL direta de vídeo (MP4). Vazio = aula em texto.')}
        </div>
        ${adminField('O que você vai aprender', `<textarea rows="4" data-bind="${path}.learn" data-kind="lines">${esc((lesson.learn || []).join('\n'))}</textarea>`, 'Um item por linha.')}
        ${adminField('Resumo da aula', `<textarea rows="6" data-bind="${path}.summary">${esc(lesson.summary || '')}</textarea>`, 'Deixe uma linha em branco entre parágrafos.')}
        ${adminField('Material complementar', `<textarea rows="4" data-bind="${path}.materials" data-kind="materials" placeholder="pdf | Apostila da aula | https://...">${esc(materialsToText(lesson.materials))}</textarea>`, 'Um por linha: <code>tipo | título | link, texto ou termo</code>. Tipos: pdf, link, texto, infografico, glossario.')}
      </div>`;
  }

  function adminQuizEditorHTML(mod, modPath) {
    const questions = (mod.quiz && mod.quiz.questions) || [];
    const qPath = `${modPath}.quiz.questions`;
    const letters = ['A', 'B', 'C', 'D'];
    return `
      <div class="adm-editor">
        ${questions.map((q, qi) => `
          <div class="adm-question">
            <div class="adm-question__head">
              <strong>Pergunta ${qi + 1}</strong>
              <button class="icon-action is-danger" data-act="del" data-path="${qPath}" data-i="${qi}" aria-label="Excluir pergunta">${icon('trash', 16)}</button>
            </div>
            ${adminField('Enunciado', `<textarea rows="2" data-bind="${qPath}.${qi}.q">${esc(q.q)}</textarea>`)}
            <div class="adm-options">
              ${[0, 1, 2, 3].map((oi) => `
                <div class="adm-option">
                  <input type="radio" name="correct-${esc(mod.id)}-${qi}" data-bind="${qPath}.${qi}.correct" data-kind="number" value="${oi}" ${Number(q.correct) === oi ? 'checked' : ''} aria-label="Marcar ${letters[oi]} como correta">
                  <span class="adm-option__letter">${letters[oi]}</span>
                  <input type="text" data-bind="${qPath}.${qi}.options.${oi}" value="${esc((q.options || [])[oi] || '')}" placeholder="Alternativa ${letters[oi]}">
                </div>`).join('')}
            </div>
            <span class="adm-field__hint">Marque o círculo da alternativa correta.</span>
            ${adminField('Explicação (mostrada após responder)', `<input type="text" data-bind="${qPath}.${qi}.explain" value="${esc(q.explain || '')}">`)}
          </div>`).join('')}
        <button class="btn btn--ghost btn--sm" data-act="add-q" data-path="${modPath}">${icon('plus', 14)}<span>Pergunta</span></button>
      </div>`;
  }

  function adminContentHTML() {
    const courses = adminDraft.courses;
    if (adminCourseIdx >= courses.length) adminCourseIdx = Math.max(0, courses.length - 1);
    const course = courses[adminCourseIdx];
    const chips = courses.map((c, i) => `<button class="chip${i === adminCourseIdx ? ' is-active' : ''}" data-act="sel-course" data-i="${i}">${esc(c.title || 'Sem título')}</button>`).join('')
      + `<button class="chip chip--add" data-act="add-course">${icon('plus', 14)} Novo curso</button>`;

    if (!course) return `<div class="filter-row">${chips}</div><p class="empty-state is-visible">Nenhum curso. Crie o primeiro.</p>`;

    const base = `courses.${adminCourseIdx}`;
    let n = 0;
    const modules = course.modules.map((mod, mi) => {
      const modPath = `${base}.modules.${mi}`;
      const lessonRows = mod.lessons.map((lesson, li) => {
        n++;
        const lPath = `${modPath}.lessons.${li}`;
        const open = adminOpen.lesson === lesson.id;
        return `
          <div class="adm-lesson${open ? ' is-open' : ''}">
            <div class="adm-lesson__row">
              <span class="adm-lesson__num ledger">${pad2(n)}</span>
              <span class="adm-lesson__title">${esc(lesson.title || 'Sem título')}</span>
              <span class="adm-lesson__meta">${lesson.videoId || lesson.videoUrl ? icon('playCircle', 14) : icon('text', 14)}${esc(lesson.minutes || 0)} min</span>
              <span class="adm-actions">
                <button class="icon-action" data-act="open-lesson" data-id="${esc(lesson.id)}" aria-label="Editar aula">${icon('edit', 16)}</button>
                <button class="icon-action" data-act="move" data-path="${modPath}.lessons" data-i="${li}" data-dir="-1" aria-label="Mover para cima" ${li === 0 ? 'disabled' : ''}>${icon('arrowUp', 16)}</button>
                <button class="icon-action" data-act="move" data-path="${modPath}.lessons" data-i="${li}" data-dir="1" aria-label="Mover para baixo" ${li === mod.lessons.length - 1 ? 'disabled' : ''}>${icon('arrowDown', 16)}</button>
                <button class="icon-action is-danger" data-act="del" data-path="${modPath}.lessons" data-i="${li}" aria-label="Excluir aula">${icon('trash', 16)}</button>
              </span>
            </div>
            ${open ? adminLessonEditorHTML(lesson, lPath) : ''}
          </div>`;
      }).join('');
      const qCount = mod.quiz && mod.quiz.questions ? mod.quiz.questions.length : 0;
      const quizOpen = adminOpen.quiz === mod.id;
      return `
        <div class="adm-module">
          <div class="adm-module__head">
            <span class="adm-module__label ledger">Módulo ${mi + 1}</span>
            <input type="text" data-bind="${modPath}.title" value="${esc(mod.title)}" aria-label="Título do módulo">
            <span class="adm-actions">
              <button class="icon-action" data-act="move" data-path="${base}.modules" data-i="${mi}" data-dir="-1" aria-label="Mover módulo para cima" ${mi === 0 ? 'disabled' : ''}>${icon('arrowUp', 16)}</button>
              <button class="icon-action" data-act="move" data-path="${base}.modules" data-i="${mi}" data-dir="1" aria-label="Mover módulo para baixo" ${mi === course.modules.length - 1 ? 'disabled' : ''}>${icon('arrowDown', 16)}</button>
              <button class="icon-action is-danger" data-act="del" data-path="${base}.modules" data-i="${mi}" aria-label="Excluir módulo">${icon('trash', 16)}</button>
            </span>
          </div>
          <div class="adm-lessons">${lessonRows || '<p class="muted">Nenhuma aula neste módulo.</p>'}</div>
          <button class="btn btn--ghost btn--sm" data-act="add-lesson" data-path="${modPath}.lessons">${icon('plus', 14)}<span>Aula</span></button>
          <div class="adm-quiz${quizOpen ? ' is-open' : ''}">
            <button class="adm-quiz__toggle" data-act="open-quiz" data-id="${esc(mod.id)}">
              ${icon('help', 16)}<span>Questionário do módulo · ${qCount} pergunta${qCount === 1 ? '' : 's'}</span>${icon(quizOpen ? 'arrowUp' : 'edit', 14)}
            </button>
            ${quizOpen ? adminQuizEditorHTML(mod, modPath) : ''}
          </div>
        </div>`;
    }).join('');

    return `
      <div class="filter-row">${chips}</div>
      <div class="adm-panel">
        <h2 class="adm-panel__title">Dados do curso</h2>
        ${adminField('Nome do curso', `<input type="text" data-bind="${base}.title" value="${esc(course.title)}">`)}
        ${adminField('Descrição', `<textarea rows="2" data-bind="${base}.desc">${esc(course.desc)}</textarea>`)}
        <div class="adm-row">
          ${adminField('Nível', `<select data-bind="${base}.level">${LEVELS_OPTIONS.map((l) => `<option ${course.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
          ${adminField('Ícone', `<select data-bind="${base}.icon">${COURSE_ICONS.map((i) => `<option value="${i}" ${course.icon === i ? 'selected' : ''}>${i}</option>`).join('')}</select>`)}
          ${adminField('Cor da capa', `<input type="color" data-bind="${base}.color" value="${esc(/^#[0-9a-f]{6}$/i.test(course.color || '') ? course.color : '#0B2545')}">`)}
        </div>
        ${adminField('Imagem de capa (opcional)', `<input type="text" data-bind="${base}.cover" value="${esc(course.cover || '')}" placeholder="https://...">`, 'Sem imagem, a capa é gerada com o ícone e a cor.')}
      </div>
      <div class="adm-panel">
        <h2 class="adm-panel__title">Módulos e aulas</h2>
        ${modules || '<p class="muted">Nenhum módulo.</p>'}
        <div class="adm-panel__foot">
          <button class="btn btn--ghost btn--sm" data-act="add-module" data-path="${base}.modules">${icon('plus', 14)}<span>Módulo</span></button>
          <button class="btn btn--ghost btn--sm is-danger" data-act="del-course">${icon('trash', 14)}<span>Excluir curso</span></button>
        </div>
      </div>`;
  }

  function adminDataHTML() {
    return `
      <div class="adm-panel">
        <h2 class="adm-panel__title">Exportar conteúdo</h2>
        <p class="muted">Baixa todo o conteúdo salvo (cursos, trilha e biblioteca) em JSON, para backup ou para substituir o conteúdo padrão do site.</p>
        <button class="btn btn--primary btn--sm" data-act="export">${icon('download', 14)}<span>Exportar JSON</span></button>
      </div>
      <div class="adm-panel">
        <h2 class="adm-panel__title">Importar conteúdo</h2>
        <p class="muted">Substitui o conteúdo deste navegador por um arquivo JSON exportado anteriormente.</p>
        <input type="file" id="adminImportFile" accept="application/json,.json" hidden>
        <button class="btn btn--ghost btn--sm" data-act="import">${icon('upload', 14)}<span>Importar JSON</span></button>
      </div>
      <div class="adm-panel">
        <h2 class="adm-panel__title">Restaurar padrão</h2>
        <p class="muted">Descarta as edições salvas neste navegador e volta ao conteúdo original do <code>courses.js</code>. O progresso dos alunos é mantido.</p>
        <button class="btn btn--ghost btn--sm is-danger" data-act="restore">${icon('refresh', 14)}<span>Restaurar conteúdo padrão</span></button>
      </div>`;
  }

  function markAdminDirty() {
    adminDirty = true;
    const bar = $('#adminSaveBar');
    if (bar) bar.classList.add('is-dirty');
    const status = $('#adminSaveStatus');
    if (status) status.textContent = 'Alterações não salvas';
  }

  function onAdminInput(e) {
    const el = e.target.closest('[data-bind]');
    if (!el || !adminDraft) return;
    if (el.type === 'radio' && !el.checked) return;
    const path = el.dataset.bind;
    const kind = el.dataset.kind;
    let value = el.value;
    if (kind === 'number') value = Number(value) || 0;
    else if (kind === 'lines') value = value.split('\n').map((s) => s.trim()).filter(Boolean);
    else if (kind === 'materials') value = parseMaterials(value);
    else if (kind === 'video') {
      const parsed = parseVideo(value);
      const lesson = getPath(adminDraft, path);
      lesson.videoId = parsed.videoId;
      lesson.videoUrl = parsed.videoUrl;
      el.classList.toggle('is-invalid', !!parsed.invalid);
      markAdminDirty();
      return;
    }
    setPath(adminDraft, path, value);
    markAdminDirty();
  }

  function validateContent(content) {
    const errors = [];
    const ids = new Set();
    const checkId = (id, where) => {
      if (!id) errors.push(`${where}: sem identificador.`);
      else if (ids.has(id)) errors.push(`${where}: identificador repetido (${id}).`);
      ids.add(id);
    };
    content.courses.forEach((c, ci) => {
      const cName = c.title || `Curso ${ci + 1}`;
      if (!String(c.title || '').trim()) errors.push(`Curso ${ci + 1}: informe o nome.`);
      checkId(c.id, cName);
      (c.modules || []).forEach((m, mi) => {
        const mName = `${cName} › Módulo ${mi + 1}`;
        if (!String(m.title || '').trim()) errors.push(`${mName}: informe o título.`);
        checkId(m.id, mName);
        (m.lessons || []).forEach((l, li) => {
          if (!String(l.title || '').trim()) errors.push(`${mName} › Aula ${li + 1}: informe o título.`);
          checkId(l.id, `${mName} › Aula ${li + 1}`);
        });
        ((m.quiz && m.quiz.questions) || []).forEach((q, qi) => {
          const qName = `${mName} › Pergunta ${qi + 1}`;
          if (!String(q.q || '').trim()) errors.push(`${qName}: escreva o enunciado.`);
          if (!q.options || q.options.length < 4 || q.options.some((o) => !String(o || '').trim())) errors.push(`${qName}: preencha as 4 alternativas.`);
        });
      });
    });
    return errors;
  }

  function commitContent(next) {
    const snapshot = clone(next);
    if (!writeJSON(CONTENT_KEY, snapshot)) {
      showToast('Não foi possível salvar: armazenamento do navegador cheio.', 'error');
      return false;
    }
    CONTENT = snapshot;
    buildIndex();
    adminDraft = clone(CONTENT);
    adminDirty = false;
    return true;
  }

  function newLesson() {
    return { id: uid('l-'), title: 'Nova aula', minutes: 5, videoId: null, videoUrl: null, learn: [], summary: '', materials: [] };
  }

  function onAdminClick(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    const act = btn.dataset.act;
    const path = btn.dataset.path;
    const i = Number(btn.dataset.i);
    let rerender = true;

    switch (act) {
      case 'tab':
        adminTab = btn.dataset.tabId;
        break;
      case 'sel-course':
        adminCourseIdx = i;
        break;
      case 'add-course':
        adminDraft.courses.push({
          id: uid('c-'), title: 'Novo curso', desc: '', level: 'Iniciante', icon: 'book', color: '#0B2545', cover: '',
          modules: [{ id: uid('m-'), title: 'Módulo 1', lessons: [newLesson()], quiz: { questions: [] } }]
        });
        adminCourseIdx = adminDraft.courses.length - 1;
        markAdminDirty();
        break;
      case 'del-course': {
        const c = adminDraft.courses[adminCourseIdx];
        if (!c || !window.confirm(`Excluir o curso "${c.title}" e todas as suas aulas?`)) return;
        adminDraft.courses.splice(adminCourseIdx, 1);
        adminCourseIdx = 0;
        markAdminDirty();
        break;
      }
      case 'add-module':
        getPath(adminDraft, path).push({ id: uid('m-'), title: 'Novo módulo', lessons: [], quiz: { questions: [] } });
        markAdminDirty();
        break;
      case 'add-lesson': {
        const lesson = newLesson();
        getPath(adminDraft, path).push(lesson);
        adminOpen.lesson = lesson.id;
        markAdminDirty();
        break;
      }
      case 'add-q': {
        const mod = getPath(adminDraft, path);
        if (!mod.quiz) mod.quiz = { questions: [] };
        mod.quiz.questions.push({ q: '', options: ['', '', '', ''], correct: 0, explain: '' });
        adminOpen.quiz = mod.id;
        markAdminDirty();
        break;
      }
      case 'del': {
        const arr = getPath(adminDraft, path);
        if (!window.confirm('Excluir este item? A exclusão só vale depois de salvar.')) return;
        arr.splice(i, 1);
        markAdminDirty();
        break;
      }
      case 'move': {
        const arr = getPath(adminDraft, path);
        const j = i + Number(btn.dataset.dir);
        if (j < 0 || j >= arr.length) return;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        markAdminDirty();
        break;
      }
      case 'open-lesson':
        adminOpen.lesson = adminOpen.lesson === btn.dataset.id ? null : btn.dataset.id;
        break;
      case 'open-quiz':
        adminOpen.quiz = adminOpen.quiz === btn.dataset.id ? null : btn.dataset.id;
        break;
      case 'save': {
        const errors = validateContent(adminDraft);
        if (errors.length) {
          showToast(errors[0] + (errors.length > 1 ? ` (+${errors.length - 1})` : ''), 'error');
          return;
        }
        if (commitContent(adminDraft)) showToast('Conteúdo salvo.', 'success');
        break;
      }
      case 'discard':
        adminDraft = clone(CONTENT);
        adminDirty = false;
        break;
      case 'export': {
        if (adminDirty) showToast('Exportando a última versão salva (há edições não salvas).', 'default');
        const blob = new Blob([JSON.stringify(CONTENT, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `raisin-conteudo-${todayISO()}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
        rerender = false;
        break;
      }
      case 'import':
        $('#adminImportFile').click();
        rerender = false;
        break;
      case 'restore':
        if (!window.confirm('Voltar ao conteúdo padrão? As edições salvas neste navegador serão descartadas.')) return;
        localStorage.removeItem(CONTENT_KEY);
        loadContent();
        adminDraft = clone(CONTENT);
        adminDirty = false;
        showToast('Conteúdo padrão restaurado.', 'success');
        break;
      case 'role': {
        const users = getUsers();
        const u = users[btn.dataset.email];
        if (!u) return;
        u.role = u.role === 'admin' ? 'student' : 'admin';
        saveUsers(users);
        showToast(`${u.name} agora é ${u.role === 'admin' ? 'administrador' : 'aluno'}.`, 'success');
        break;
      }
      default:
        return;
    }
    if (rerender) {
      const y = window.scrollY;
      renderAdmin();
      window.scrollTo({ top: y });
    }
  }

  function onAdminImport(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (err) { showToast('Arquivo inválido: não é um JSON.', 'error'); return; }
      if (!data || !Array.isArray(data.courses) || !data.courses.every((c) => c && Array.isArray(c.modules) && c.modules.every((m) => m && Array.isArray(m.lessons)))) {
        showToast('Arquivo inválido: formato de conteúdo não reconhecido.', 'error');
        return;
      }
      data.library = data.library || CONTENT.library;
      data.trail = data.trail || [];
      const errors = validateContent(data);
      if (errors.length) { showToast('Arquivo com problemas: ' + errors[0], 'error'); return; }
      if (commitContent(data)) {
        showToast('Conteúdo importado.', 'success');
        renderAdmin();
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function initAdmin() {
    const body = $('#adminBody');
    body.addEventListener('input', onAdminInput);
    body.addEventListener('change', (e) => {
      if (e.target.id === 'adminImportFile') onAdminImport(e);
      else onAdminInput(e);
    });
    body.addEventListener('click', onAdminClick);
    window.addEventListener('beforeunload', (e) => {
      if (adminDirty) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  /* ------------------------------------------------------------------ *
   * 23. PROFILE (view/edit account, logout)
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
    $('#profileLevel').innerHTML = levelBadgeHTML();
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
   * 24. INIT
   * ------------------------------------------------------------------ */
  function boot() {
    const hash = window.location.hash;
    if (hash.startsWith('#verificar/')) {
      showVerifyScreen(hash.slice('#verificar/'.length));
      return;
    }

    const sessionEmail = getSessionEmail();
    const user = sessionEmail ? getUsers()[sessionEmail] : null;
    const state = sessionEmail ? loadStateForUser(sessionEmail) : null;

    if (sessionEmail && user && state) {
      AppState = state;
      study();
      ensureAdminExists(sessionEmail);
      showAppShell();
      restoreSession();
    } else {
      setSessionEmail(null);
      showAuthScreen();
    }
  }

  function init() {
    loadContent();
    initAuth();
    initNav();
    initExpenseForm();
    initCertModal();
    initProfileModal();
    initAdmin();
    boot();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
