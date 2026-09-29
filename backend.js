/* ==========================================================================
   RAISIN FINANCE — backend.js
   One interface, two implementations:

   - CloudBackend  (config.js filled in): Supabase Auth + Postgres + Storage +
     Edge Functions. Data follows the account to any device; certificates are
     issued and verified by the server.
   - LocalBackend  (config.js empty): demo mode. Everything lives in this
     browser's localStorage, exactly like the site worked before a backend.

   script.js only talks to window.Backend and never knows which one is active.
   Every method is async and throws Error objects with a Portuguese message
   ready to show to the user.
   ========================================================================== */
(function () {
  'use strict';

  const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
  const MIN_PASSWORD = 6;
  const SAVE_DEBOUNCE_MS = 1200;

  const cfg = window.RAISIN_CONFIG || {};
  const useCloud = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);

  /* ------------------------------------------------------------------ *
   * Shared helpers
   * ------------------------------------------------------------------ */
  function fail(message) { return new Error(message); }

  function checkPassword(password) {
    if (!password || password.length < MIN_PASSWORD) throw fail(`A senha deve ter pelo menos ${MIN_PASSWORD} caracteres.`);
  }

  function checkEmail(email) {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw fail('Informe um e-mail válido.');
  }

  function siteUrl() { return window.location.href.split('#')[0]; }

  function defaultStudy() { return { lessons: {}, quizzes: {}, courses: {}, xp: {}, last: null }; }

  // Shape used by script.js. Kept identical in both modes.
  function makeAppState(user, fields) {
    const f = fields || {};
    const prefs = f.prefs || {};
    return {
      userName: user.name,
      email: user.email,
      expenses: Array.isArray(f.expenses) ? f.expenses : [],
      budgetGoal: f.budgetGoal != null ? Number(f.budgetGoal) : 2000,
      savingsGoal: f.savingsGoal != null ? Number(f.savingsGoal) : 500,
      study: f.study && typeof f.study === 'object' && !Array.isArray(f.study) ? Object.assign(defaultStudy(), f.study) : defaultStudy(),
      lastView: prefs.lastView || 'home',
      activeCourseId: prefs.activeCourseId || null,
      activeLessonId: prefs.activeLessonId || null,
      activeModuleId: prefs.activeModuleId || null,
      // Caixinha (bank balance + savings boxes). Cloud mode keeps it inside
      // prefs so the user_state schema stays the same.
      wallet: prefs.wallet && typeof prefs.wallet === 'object' && !Array.isArray(prefs.wallet) ? prefs.wallet : null
    };
  }

  function prefsOf(state) {
    return {
      lastView: state.lastView || 'home',
      activeCourseId: state.activeCourseId || null,
      activeLessonId: state.activeLessonId || null,
      activeModuleId: state.activeModuleId || null,
      wallet: state.wallet || null
    };
  }

  // Progress only moves forward: combine two copies of `study` so a stale tab
  // or another device can never erase lessons, XP, quiz scores or courses.
  function mergeRanges(a, b) {
    const all = [...(a || []), ...(b || [])].map((r) => [Number(r[0]), Number(r[1])]).sort((x, y) => x[0] - y[0]);
    const out = [];
    all.forEach((r) => {
      const last = out[out.length - 1];
      if (last && r[0] <= last[1] + 0.75) last[1] = Math.max(last[1], r[1]);
      else out.push(r);
    });
    return out;
  }

  function mergeStudy(local, remote) {
    const a = local || defaultStudy();
    const b = remote || {};
    const merged = Object.assign(defaultStudy(), a);

    merged.lessons = Object.assign({}, b.lessons || {}, a.lessons || {});
    Object.keys(b.lessons || {}).forEach((id) => {
      const x = (a.lessons || {})[id];
      const y = b.lessons[id];
      if (!x) return;
      const completed = !!(x.completed || y.completed);
      const dates = [x.completed && x.completedDate, y.completed && y.completedDate].filter(Boolean).sort();
      merged.lessons[id] = {
        ranges: mergeRanges(x.ranges, y.ranges),
        duration: Math.max(Number(x.duration) || 0, Number(y.duration) || 0),
        lastTime: Math.max(Number(x.lastTime) || 0, Number(y.lastTime) || 0),
        completed,
        completedDate: completed ? dates[0] : undefined
      };
    });

    merged.xp = Object.assign({}, b.xp || {}, a.xp || {});

    merged.quizzes = Object.assign({}, b.quizzes || {}, a.quizzes || {});
    Object.keys(b.quizzes || {}).forEach((id) => {
      const x = (a.quizzes || {})[id];
      const y = b.quizzes[id];
      if (!x) return;
      merged.quizzes[id] = Object.assign({}, y, x, {
        best: Math.max(Number(x.best) || 0, Number(y.best) || 0),
        attempts: Math.max(Number(x.attempts) || 0, Number(y.attempts) || 0)
      });
    });

    merged.courses = Object.assign({}, b.courses || {}, a.courses || {});
    Object.keys(b.courses || {}).forEach((id) => {
      const x = (a.courses || {})[id];
      const y = b.courses[id];
      if (x && !x.cert && y.cert) merged.courses[id] = Object.assign({}, x, { cert: y.cert });
    });

    merged.last = a.last || b.last || null;
    return merged;
  }

  // Replace the contents of `target` in place, so references held by the app
  // (AppState.study) see the merged data.
  function adoptStudy(target, merged) {
    Object.keys(target).forEach((k) => { delete target[k]; });
    Object.assign(target, merged);
  }

  async function sha256Hex(str) {
    if (window.crypto && window.crypto.subtle) {
      const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    return (hash >>> 0).toString(16).padStart(8, '0').repeat(8);
  }

  function uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function b64urlEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlDecode(str) {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }

  /* ================================================================== *
   * LocalBackend — demo mode (localStorage)
   * ================================================================== */
  function createLocalBackend() {
    const USERS_KEY = 'raisin-finance-users';
    const SESSION_KEY = 'raisin-finance-session';
    const STATE_PREFIX = 'raisin-finance-state-';
    const CONTENT_KEY = 'raisin-finance-content';
    const CERT_SALT = 'raisin-cert-v1';

    function read(key, fallback) {
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
    }
    function write(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    }
    const getUsers = () => read(USERS_KEY, {});
    const saveUsers = (u) => write(USERS_KEY, u);
    const toUser = (u) => ({ id: u.email, email: u.email, name: u.name, role: u.role || 'student' });

    // Demo rule: while nobody is admin in this browser, the first account in is.
    function ensureAdmin(email) {
      const users = getUsers();
      if (!Object.values(users).some((u) => u.role === 'admin') && users[email]) {
        users[email].role = 'admin';
        saveUsers(users);
        return true;
      }
      return false;
    }

    function stateToStored(state) {
      return Object.assign({}, state);
    }

    async function certCode(name, courseId, date) {
      const hex = (await sha256Hex(`${name}|${courseId}|${date}|${CERT_SALT}`)).toUpperCase();
      return `RF-${hex.slice(0, 5)}-${hex.slice(5, 10)}`;
    }

    return {
      mode: 'local',
      isCloud: false,
      inRecovery: false,
      promotedToAdmin: false,

      async init() {},

      async currentUser() {
        const email = localStorage.getItem(SESSION_KEY);
        const user = email ? getUsers()[email] : null;
        if (!user) { localStorage.removeItem(SESSION_KEY); return null; }
        this.promotedToAdmin = ensureAdmin(email);
        return toUser(getUsers()[email]);
      },

      async signIn(email, password) {
        email = String(email || '').trim().toLowerCase();
        checkEmail(email);
        const user = getUsers()[email];
        if (!user || (await sha256Hex(user.salt + ':' + password)) !== user.passwordHash) throw fail('E-mail ou senha incorretos.');
        localStorage.setItem(SESSION_KEY, email);
        this.promotedToAdmin = ensureAdmin(email);
        return toUser(getUsers()[email]);
      },

      async signUp(name, email, password) {
        email = String(email || '').trim().toLowerCase();
        name = String(name || '').trim();
        if (!name) throw fail('Informe seu nome.');
        checkEmail(email);
        checkPassword(password);
        const users = getUsers();
        if (users[email]) throw fail('Já existe uma conta com esse e-mail. Entre ou recupere a senha.');
        const salt = uid('s');
        users[email] = { name, email, role: 'student', salt, passwordHash: await sha256Hex(salt + ':' + password), createdAt: new Date().toISOString() };
        saveUsers(users);
        localStorage.setItem(SESSION_KEY, email);
        this.promotedToAdmin = ensureAdmin(email);
        return { user: toUser(getUsers()[email]) };
      },

      async signOut() { localStorage.removeItem(SESSION_KEY); },

      async resetPassword() {
        throw fail('No modo demonstração não há envio de e-mail. Crie uma nova conta ou peça ao administrador.');
      },

      onPasswordRecovery() {},

      async setNewPassword() { throw fail('Indisponível no modo demonstração.'); },

      async updateAccount(current, changes) {
        const users = getUsers();
        const record = users[current.email];
        if (!record) throw fail('Conta não encontrada.');
        const newEmail = String(changes.email || current.email).trim().toLowerCase();
        checkEmail(newEmail);
        if (!String(changes.name || '').trim()) throw fail('Informe seu nome.');
        if (changes.password) checkPassword(changes.password);
        if (newEmail !== current.email && users[newEmail]) throw fail('Este e-mail já está em uso.');
        record.name = changes.name.trim();
        if (changes.password) {
          record.salt = uid('s');
          record.passwordHash = await sha256Hex(record.salt + ':' + changes.password);
        }
        if (newEmail !== current.email) {
          const oldState = read(STATE_PREFIX + current.email, null);
          delete users[current.email];
          record.email = newEmail;
          users[newEmail] = record;
          if (oldState) { oldState.email = newEmail; write(STATE_PREFIX + newEmail, oldState); }
          localStorage.removeItem(STATE_PREFIX + current.email);
          localStorage.setItem(SESSION_KEY, newEmail);
        }
        saveUsers(users);
        return { user: toUser(record), emailChangePending: false };
      },

      async deleteAccount(current) {
        const users = getUsers();
        delete users[current.email];
        saveUsers(users);
        localStorage.removeItem(STATE_PREFIX + current.email);
        localStorage.removeItem(SESSION_KEY);
      },

      async loadState(user) {
        const stored = read(STATE_PREFIX + user.email, null);
        if (!stored) return makeAppState(user, {});
        return makeAppState(user, {
          expenses: stored.expenses,
          budgetGoal: stored.budgetGoal,
          savingsGoal: stored.savingsGoal,
          study: stored.study,
          prefs: stored
        });
      },

      saveState(state) {
        if (!state || !state.email) return;
        write(STATE_PREFIX + state.email, stateToStored(state));
      },

      async flush() {},

      async refreshState() { return false; },

      async loadContent() {
        const saved = read(CONTENT_KEY, null);
        return saved && Array.isArray(saved.courses) ? saved : null;
      },

      async saveContent(content) {
        if (!write(CONTENT_KEY, content)) throw fail('Não foi possível salvar: armazenamento do navegador cheio.');
      },

      async resetContent() { localStorage.removeItem(CONTENT_KEY); },

      canUpload: false,
      async uploadMedia() { throw fail('Upload de arquivos só funciona com o Supabase configurado.'); },

      async listStudents() {
        return Object.values(getUsers()).map((u) => {
          const st = read(STATE_PREFIX + u.email, null) || {};
          return { id: u.email, email: u.email, name: u.name, role: u.role || 'student', createdAt: u.createdAt, study: st.study || defaultStudy() };
        });
      },

      async setRole(userId, role) {
        const users = getUsers();
        if (!users[userId]) throw fail('Conta não encontrada.');
        users[userId].role = role;
        saveUsers(users);
      },

      // Demo certificates: hash of the printed data. Anyone reading the source
      // can mint one — real authenticity needs the cloud mode.
      async issueCertificate(courseId, ctx) {
        const code = await certCode(ctx.studentName, courseId, ctx.completedOn);
        return { code, studentName: ctx.studentName, courseTitle: ctx.courseTitle, hours: ctx.hours, completedOn: ctx.completedOn };
      },

      verifyUrl(cert, courseId) {
        const payload = { n: cert.studentName, c: courseId, t: cert.courseTitle, h: cert.hours, d: cert.completedOn, k: cert.code };
        return siteUrl() + '#verificar/' + b64urlEncode(JSON.stringify(payload));
      },

      async verifyCertificate(token) {
        let data;
        try { data = JSON.parse(b64urlDecode(token)); } catch (e) { return null; }
        if (!data || !data.n || !data.c || !data.d || !data.k) return null;
        if ((await certCode(String(data.n), String(data.c), String(data.d))) !== data.k) return null;
        return { code: data.k, studentName: data.n, courseTitle: data.t, hours: data.h, completedOn: data.d };
      }
    };
  }

  /* ================================================================== *
   * CloudBackend — Supabase
   * ================================================================== */
  function createCloudBackend() {
    let sb = null;
    let session = null;
    let saveTimer = null;
    let pendingState = null;
    let savingPromise = Promise.resolve();
    let recoveryCallback = null;
    let recoveryPending = false;
    let inRecovery = false; // opened from a reset-password e-mail link
    let onSaveError = null;

    // Supabase/GoTrue messages → Portuguese.
    function translate(error, fallback) {
      const msg = (error && (error.message || error.error_description || error.msg)) || '';
      const status = error && (error.status || (error.context && error.context.status));
      if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
      if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
      if (/already registered|already been registered|already exists/i.test(msg)) return 'Já existe uma conta com esse e-mail. Entre ou recupere a senha.';
      if (/Password should be at least|password.*characters/i.test(msg)) return `A senha deve ter pelo menos ${MIN_PASSWORD} caracteres.`;
      if (/weak|pwned|compromised/i.test(msg)) return 'Essa senha é muito fraca ou já apareceu em vazamentos. Escolha outra.';
      if (/same.*password|different from the old/i.test(msg)) return 'A nova senha precisa ser diferente da atual.';
      if (/rate limit|too many|For security purposes/i.test(msg) || status === 429) return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
      if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
      if (/invalid.*email|Unable to validate email/i.test(msg)) return 'Informe um e-mail válido.';
      if (/JWT|expired|not authenticated|Auth session missing/i.test(msg) || status === 401) return 'Sua sessão expirou. Entre de novo.';
      if (/row-level security|permission denied|42501|forbidden/i.test(msg)) return 'Você não tem permissão para isso.';
      return fallback || 'Algo deu errado. Tente de novo em instantes.';
    }

    function loadLib() {
      if (window.__SUPABASE_MOCK__) return Promise.resolve(window.__SUPABASE_MOCK__);
      if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
      return new Promise((resolve, reject) => {
        const tag = document.createElement('script');
        tag.src = SUPABASE_JS;
        tag.onload = () => resolve(window.supabase);
        tag.onerror = () => reject(fail('Não foi possível carregar o Supabase. Verifique a internet.'));
        document.head.appendChild(tag);
      });
    }

    async function profileFor(authUser) {
      const { data, error } = await sb.from('profiles').select('id,name,role').eq('id', authUser.id).maybeSingle();
      if (error) throw fail(translate(error));
      const fallbackName = (authUser.user_metadata && authUser.user_metadata.name) || String(authUser.email || '').split('@')[0];
      return { id: authUser.id, email: authUser.email, name: (data && data.name) || fallbackName, role: (data && data.role) || 'student' };
    }

    // Surface edge-function errors with the server's Portuguese message.
    async function invoke(name, body) {
      const { data, error } = await sb.functions.invoke(name, { body: body || {} });
      if (!error) return data;
      let serverMsg = null;
      const ctx = error.context;
      try {
        if (ctx && typeof ctx.json === 'function') serverMsg = (await ctx.json()).error;
        else if (ctx && ctx.body) serverMsg = (typeof ctx.body === 'string' ? JSON.parse(ctx.body) : ctx.body).error;
      } catch (e) { /* not JSON */ }
      throw fail(serverMsg || translate(error));
    }

    // Merge with what is in the cloud before writing, so saving from an old
    // tab or a second device adds progress instead of overwriting it.
    async function writeState(state) {
      const { data: remote, error: readError } = await sb.from('user_state')
        .select('study').eq('user_id', session.user.id).maybeSingle();
      if (readError) throw readError;
      if (remote && remote.study) adoptStudy(state.study, mergeStudy(state.study, remote.study));
      const { error } = await sb.from('user_state').update({
        study: state.study,
        expenses: state.expenses,
        budget_goal: Number(state.budgetGoal) || 0,
        savings_goal: Number(state.savingsGoal) || 0,
        prefs: prefsOf(state)
      }).eq('user_id', session.user.id);
      if (error) throw error;
    }

    return {
      mode: 'cloud',
      isCloud: true,
      promotedToAdmin: false,
      canUpload: true,

      set onSaveError(fn) { onSaveError = fn; },
      get inRecovery() { return inRecovery || /type=recovery/.test(window.location.hash); },

      async init() {
        const lib = await loadLib();
        sb = lib.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        sb.auth.onAuthStateChange((event, s) => {
          session = s;
          if (event === 'PASSWORD_RECOVERY') {
            inRecovery = true;
            if (recoveryCallback) recoveryCallback();
            else recoveryPending = true;
          }
        });
        const { data } = await sb.auth.getSession();
        session = data.session;
      },

      async currentUser() {
        if (!session) {
          const { data } = await sb.auth.getSession();
          session = data.session;
        }
        return session ? profileFor(session.user) : null;
      },

      async signIn(email, password) {
        email = String(email || '').trim().toLowerCase();
        checkEmail(email);
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw fail(translate(error));
        session = data.session;
        return profileFor(data.user);
      },

      async signUp(name, email, password) {
        email = String(email || '').trim().toLowerCase();
        name = String(name || '').trim();
        if (!name) throw fail('Informe seu nome.');
        checkEmail(email);
        checkPassword(password);
        const { data, error } = await sb.auth.signUp({
          email, password, options: { data: { name }, emailRedirectTo: siteUrl() }
        });
        if (error) throw fail(translate(error));
        // With "Confirm email" on, Supabase returns no session (and, for an
        // already-registered address, a user with no identities).
        if (!data.session) return { pendingConfirmation: true, email };
        session = data.session;
        return { user: await profileFor(data.user) };
      },

      async signOut() {
        await this.flush().catch(() => {});
        await sb.auth.signOut();
        session = null;
      },

      async resetPassword(email) {
        email = String(email || '').trim().toLowerCase();
        checkEmail(email);
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: siteUrl() });
        if (error) throw fail(translate(error));
      },

      onPasswordRecovery(cb) {
        recoveryCallback = cb;
        if (recoveryPending) { recoveryPending = false; cb(); }
      },

      async setNewPassword(password) {
        checkPassword(password);
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw fail(translate(error));
        inRecovery = false;
      },

      async updateAccount(current, changes) {
        const name = String(changes.name || '').trim();
        const email = String(changes.email || current.email).trim().toLowerCase();
        if (!name) throw fail('Informe seu nome.');
        checkEmail(email);
        if (changes.password) checkPassword(changes.password);

        if (name !== current.name) {
          const { error } = await sb.from('profiles').update({ name }).eq('id', current.id);
          if (error) throw fail(translate(error));
        }
        const authChanges = {};
        if (changes.password) authChanges.password = changes.password;
        if (email !== current.email) authChanges.email = email;
        if (name !== current.name) authChanges.data = { name };
        let emailChangePending = false;
        if (Object.keys(authChanges).length) {
          const { data, error } = await sb.auth.updateUser(authChanges, { emailRedirectTo: siteUrl() });
          if (error) throw fail(translate(error));
          emailChangePending = email !== current.email && data.user && data.user.email !== email;
        }
        const user = await profileFor((await sb.auth.getUser()).data.user);
        return { user, emailChangePending };
      },

      async deleteAccount() {
        await invoke('delete-account');
        await sb.auth.signOut().catch(() => {});
        session = null;
      },

      async loadState(user) {
        const { data, error } = await sb.from('user_state')
          .select('study,expenses,budget_goal,savings_goal,prefs')
          .eq('user_id', user.id).maybeSingle();
        if (error) throw fail(translate(error, 'Não foi possível carregar seus dados.'));
        const row = data || {};
        return makeAppState(user, {
          study: row.study, expenses: row.expenses,
          budgetGoal: row.budget_goal, savingsGoal: row.savings_goal, prefs: row.prefs
        });
      },

      // Debounced: the app calls save() on every tick of the video player.
      saveState(state) {
        if (!session || !state) return;
        pendingState = state;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => { this.flush().catch(() => {}); }, SAVE_DEBOUNCE_MS);
      },

      // Pull progress made elsewhere (another device, an admin) into the open
      // tab. Returns true when something new arrived.
      async refreshState(state) {
        if (!session || !state) return false;
        const { data, error } = await sb.from('user_state').select('study').eq('user_id', session.user.id).maybeSingle();
        if (error || !data || !data.study) return false;
        const before = JSON.stringify(state.study);
        adoptStudy(state.study, mergeStudy(state.study, data.study));
        return JSON.stringify(state.study) !== before;
      },

      async flush() {
        clearTimeout(saveTimer);
        const state = pendingState;
        pendingState = null;
        if (!state || !session) return savingPromise;
        savingPromise = savingPromise.then(() => writeState(state)).catch((error) => {
          if (onSaveError) onSaveError(translate(error, 'Não foi possível salvar seu progresso.'));
          throw error;
        });
        return savingPromise;
      },

      async loadContent() {
        const { data, error } = await sb.from('content').select('data').eq('id', 'main').maybeSingle();
        if (error) throw fail(translate(error, 'Não foi possível carregar os cursos.'));
        return data && data.data && Array.isArray(data.data.courses) ? data.data : null;
      },

      async saveContent(content) {
        const { error } = await sb.from('content').upsert({ id: 'main', data: content, updated_by: session && session.user.id });
        if (error) throw fail(translate(error, 'Não foi possível salvar o conteúdo.'));
      },

      async resetContent(defaults) { return this.saveContent(defaults); },

      async uploadMedia(file, folder) {
        if (!file) throw fail('Escolha um arquivo.');
        const MAX = 50 * 1024 * 1024; // Supabase free plan limit per file
        if (file.size > MAX) throw fail('Arquivo maior que 50 MB. Comprima o vídeo ou hospede no YouTube.');
        const ext = (String(file.name).match(/\.([a-z0-9]{1,5})$/i) || [, 'bin'])[1].toLowerCase();
        const path = `${folder || 'arquivos'}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await sb.storage.from('media').upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (error) throw fail(translate(error, 'Não foi possível enviar o arquivo.'));
        return sb.storage.from('media').getPublicUrl(path).data.publicUrl;
      },

      async listStudents() {
        const { data, error } = await sb.rpc('admin_students');
        if (error) throw fail(translate(error, 'Não foi possível carregar os alunos.'));
        return (data || []).map((r) => ({ id: r.id, email: r.email, name: r.name, role: r.role, createdAt: r.created_at, study: r.study || defaultStudy() }));
      },

      async setRole(userId, role) {
        const { error } = await sb.rpc('set_user_role', { p_user: userId, p_role: role });
        if (error) throw fail(/demote yourself/.test(error.message || '') ? 'Você não pode remover seu próprio acesso de administrador.' : translate(error));
      },

      // The server checks completion itself; make sure it sees the latest state.
      async issueCertificate(courseId) {
        await this.flush();
        const row = await invoke('issue-certificate', { courseId });
        return { code: row.code, studentName: row.student_name, courseTitle: row.course_title, hours: row.hours, completedOn: row.completed_on };
      },

      verifyUrl(cert) { return siteUrl() + '#verificar/' + encodeURIComponent(cert.code); },

      async verifyCertificate(token) {
        const code = decodeURIComponent(String(token || '')).trim();
        if (!/^RF-[A-Z0-9]{5}-[A-Z0-9]{5}$/i.test(code)) return null;
        const { data, error } = await sb.rpc('verify_certificate', { p_code: code });
        if (error) throw fail(translate(error, 'Não foi possível verificar agora. Tente de novo.'));
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return null;
        return { code: row.code, studentName: row.student_name, courseTitle: row.course_title, hours: row.hours, completedOn: row.completed_on, issuedAt: row.issued_at };
      }
    };
  }

  window.Backend = useCloud ? createCloudBackend() : createLocalBackend();
  window.Backend.mergeStudy = mergeStudy;
})();
