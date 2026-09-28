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

  let COURSES = [
    {
      id: 'c1',
      category: 'fundamentos',
      icon: 'book-open',
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
      icon: 'chart',
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
      icon: 'lifebuoy',
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
      icon: 'trending',
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

  // Conteúdo demonstrativo da área de Estudos. A estrutura já aceita módulos,
  // aulas, resumo e quiz sem depender de um backend.
  COURSES = [
    {
      id: 'financas-zero', category: 'fundamentos', icon: 'book-open', level: 'Iniciante',
      title: 'Finanças do Zero',
      desc: 'Organize seu dinheiro, crie hábitos e dê seus primeiros passos com segurança.',
      cover: 'Organizar para respirar',
      modules: [
        'Entendendo seu dinheiro', 'Como guardar dinheiro', 'Primeiros passos nos investimentos'
      ],
      lessons: [
        { module: 0, title: 'Renda, despesas e escolhas', minutes: 7, videoId: 'HQzoZfc3GwQ', summary: 'Renda é o que entra. Despesa é o que sai. Quando você enxerga os dois, consegue decidir para onde seu dinheiro vai.', objectives: ['Diferenciar renda e despesa', 'Reconhecer gastos fixos e variáveis'] },
        { module: 0, title: 'Montando seu orçamento', minutes: 9, videoId: 'sVKQn2I4HDM', summary: 'Um orçamento simples começa registrando entradas, despesas essenciais e escolhas do mês.', objectives: ['Criar um orçamento mensal', 'Separar necessidades de desejos'] },
        { module: 0, title: 'Controle de gastos na prática', minutes: 6, videoId: 'Nj0MZ6eSJd4', summary: 'Controlar gastos não é deixar de viver: é dar um destino consciente ao dinheiro.', objectives: ['Usar categorias', 'Fazer uma revisão semanal'], quiz: { question: 'Qual passo ajuda mais a organizar as finanças?', options: ['Ignorar gastos pequenos', 'Registrar entradas e saídas', 'Investir antes de ter orçamento', 'Usar crédito sem limite'], answer: 1 } },
        { module: 1, title: 'Criando o hábito de guardar', minutes: 6, videoId: 'L4N1q4RNi9I', summary: 'Guardar pouco e com frequência é mais sustentável do que depender de sobras raras.', objectives: ['Definir uma meta possível', 'Automatizar uma pequena reserva'] },
        { module: 1, title: 'Reserva de emergência', minutes: 8, videoId: 'gFQNPmLKj1k', summary: 'A reserva protege você de imprevistos e diminui a necessidade de dívidas caras.', objectives: ['Entender o objetivo da reserva', 'Conhecer critérios de liquidez'] },
        { module: 1, title: 'Evitando compras por impulso', minutes: 5, videoId: 'HQzoZfc3GwQ', summary: 'Pausar, comparar e perguntar se uma compra cabe no plano evita arrependimentos.', objectives: ['Reconhecer gatilhos de consumo', 'Aplicar a regra da pausa'], quiz: { question: 'Para que serve uma reserva de emergência?', options: ['Comprar ativos de alto risco', 'Cobrir imprevistos sem depender de dívida', 'Substituir o orçamento', 'Garantir rentabilidade'], answer: 1 } },
        { module: 2, title: 'Poupar e investir', minutes: 7, videoId: 'sVKQn2I4HDM', summary: 'Poupar separa dinheiro; investir busca fazer esse dinheiro trabalhar de acordo com objetivo e risco.', objectives: ['Diferenciar poupar e investir', 'Relacionar objetivo e prazo'] },
        { module: 2, title: 'Risco, liquidez e prazo', minutes: 8, videoId: 'gFQNPmLKj1k', summary: 'Todo investimento combina risco, prazo e facilidade de resgate de uma forma diferente.', objectives: ['Definir liquidez', 'Entender risco e retorno'] },
        { module: 2, title: 'Juros compostos', minutes: 6, videoId: 'L4N1q4RNi9I', summary: 'Com tempo e constância, os rendimentos passam a render também — esse é o efeito dos juros compostos.', objectives: ['Entender o efeito do tempo', 'Valorizar aportes regulares'], quiz: { question: 'Qual fator potencializa os juros compostos?', options: ['Resgatar sempre que houver ganho', 'Tempo e aportes regulares', 'Ignorar inflação', 'Concentrar tudo em um ativo'], answer: 1 } }
      ]
    },
    {
      id: 'investimentos-iniciantes', category: 'investimentos', icon: 'trending', level: 'Iniciante',
      title: 'Investimentos para Iniciantes',
      desc: 'Aprenda os conceitos para começar com objetivos claros, sem promessas de retorno.',
      cover: 'Entender antes de investir',
      modules: ['Introdução', 'Renda fixa', 'Renda variável', 'Montando uma estratégia'],
      lessons: [
        { module: 0, title: 'O que são investimentos?', minutes: 7, videoId: 'gFQNPmLKj1k', summary: 'Investir é alocar recursos buscando objetivos futuros. Resultado, prazo e risco variam.', objectives: ['Definir investimento', 'Relacionar objetivos e prazo'] },
        { module: 0, title: 'Perfil de risco', minutes: 6, videoId: 'HQzoZfc3GwQ', summary: 'Seu perfil considera objetivos, prazo, experiência e como você reage a oscilações.', objectives: ['Entender tolerância a risco', 'Evitar decisões por impulso'], quiz: { question: 'O perfil de risco serve para:', options: ['Prometer ganhos', 'Escolher ativos sem objetivo', 'Ajudar a compatibilizar escolhas e tolerância', 'Eliminar oscilações'], answer: 2 } },
        { module: 1, title: 'CDB, CDI e liquidez', minutes: 9, videoId: 'sVKQn2I4HDM', summary: 'CDB é um título bancário; CDI é uma referência comum. Liquidez indica a facilidade de resgate.', objectives: ['Explicar CDB e CDI', 'Avaliar liquidez'] },
        { module: 1, title: 'Tesouro Direto e inflação', minutes: 8, videoId: 'Nj0MZ6eSJd4', summary: 'Títulos públicos possuem regras e vencimentos. A inflação reduz poder de compra e precisa entrar no plano.', objectives: ['Conhecer Tesouro Direto', 'Entender IPCA'], quiz: { question: 'Liquidez é:', options: ['Garantia de rentabilidade', 'Facilidade de transformar investimento em dinheiro', 'Um tipo de imposto', 'A taxa básica de juros'], answer: 1 } },
        { module: 2, title: 'Ações, ETFs e FIIs', minutes: 9, videoId: 'gFQNPmLKj1k', summary: 'Ações, ETFs e FIIs têm características e riscos próprios; estudar antes de decidir é essencial.', objectives: ['Reconhecer cada classe', 'Entender volatilidade'] },
        { module: 2, title: 'Dividendos e volatilidade', minutes: 7, videoId: 'L4N1q4RNi9I', summary: 'Dividendos não são garantia. Oscilações acontecem e exigem visão de longo prazo.', objectives: ['Definir dividendos', 'Compreender volatilidade'], quiz: { question: 'Qual frase é correta?', options: ['Renda variável não tem risco', 'Dividendos são garantidos', 'Volatilidade representa oscilações de preço', 'ETFs sempre superam o mercado'], answer: 2 } },
        { module: 3, title: 'Diversificação e aportes', minutes: 8, videoId: 'HQzoZfc3GwQ', summary: 'Diversificar distribui riscos; aportes periódicos constroem consistência.', objectives: ['Definir diversificação', 'Planejar aportes'] },
        { module: 3, title: 'Sua estratégia de longo prazo', minutes: 7, videoId: 'sVKQn2I4HDM', summary: 'Uma estratégia simples parte de metas, prazo, reserva e risco aceitável.', objectives: ['Montar critérios pessoais', 'Revisar decisões com calma'], quiz: { question: 'Uma estratégia de investimento deve começar por:', options: ['Dica da internet', 'Objetivos, prazo e perfil de risco', 'Buscar o ativo que mais subiu', 'Promessa de retorno'], answer: 1 } }
      ]
    }
  ];

  const EXPENSE_CATEGORIES = [
    { id: 'alimentacao', label: 'Alimentação', icon: 'utensils' },
    { id: 'transporte', label: 'Transporte', icon: 'bus' },
    { id: 'moradia', label: 'Moradia', icon: 'home' },
    { id: 'entretenimento', label: 'Entretenimento', icon: 'film' },
    { id: 'educacao', label: 'Educação', icon: 'graduation' },
    { id: 'poupanca', label: 'Poupança', icon: 'coins' },
    { id: 'saude', label: 'Saúde', icon: 'pill' },
    { id: 'outros', label: 'Outros', icon: 'puzzle' }
  ];

  /* ------------------------------------------------------------------ *
   * 1b. ICONS — inline SVG (line style) que substituem os emojis.
   * Tamanho segue o font-size do container (1em) e a cor segue o texto
   * ao redor (currentColor), igual à logo e ao menu do topo do site.
   * ------------------------------------------------------------------ */
  const ICON_PATHS = {
    'book-open': '<path d="M12 6.5C10.5 5 8 4.5 4 5v13c4-.5 6.5 0 8 1.5M12 6.5C13.5 5 16 4.5 20 5v13c-4-.5-6.5 0-8 1.5M12 6.5V20"/>',
    chart: '<path d="M3 20h18M6 20v-6M11 20V8M16 20v-9"/>',
    lifebuoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M6 6l3.6 3.6M14.4 14.4 18 18M18 6l-3.6 3.6M9.6 14.4 6 18"/>',
    trending: '<path d="M3 17l6-6 4 4 7-7"/><path d="M17 8h4v4"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
    receipt: '<path d="M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.4V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="M9 14.5 7.5 21 12 18.5 16.5 21 15 14.5"/>',
    utensils: '<path d="M5 3v6a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3M7 11v10"/><path d="M16 3c-1.5 1-2 3-2 5s1 3 2 3v10"/>',
    bus: '<rect x="4" y="4" width="16" height="12" rx="2"/><path d="M4 10h16"/><circle cx="8" cy="19" r="1.4"/><circle cx="16" cy="19" r="1.4"/>',
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16M3 9h5M16 9h5M3 15h5M16 15h5"/>',
    graduation: '<path d="M12 4 2 9l10 5 10-5-10-5Z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/>',
    coins: '<circle cx="9" cy="9" r="6"/><path d="M15 9.2a6 6 0 1 1 0 9.6"/><path d="M7 9h4"/>',
    pill: '<path d="M10.5 3.5a4.95 4.95 0 0 1 7 7l-7 7a4.95 4.95 0 0 1-7-7l7-7Z"/><path d="M8 8l8 8"/>',
    puzzle: '<path d="M9 4h2a1.5 1.5 0 1 1 3 0h1.5a1 1 0 0 1 1 1v2a1.5 1.5 0 1 0 0 3v2a1 1 0 0 1-1 1H14a1.5 1.5 0 1 1-3 0H9a1 1 0 0 1-1-1v-2a1.5 1.5 0 1 0 0-3V5a1 1 0 0 1 1-1Z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    alert: '<path d="M12 4l9 16H3L12 4Z"/><path d="M12 10v4M12 17.4v.1"/>',
    dot: '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>'
  };

  function icon(name) {
    const paths = ICON_PATHS[name];
    if (!paths) return '';
    return '<svg class="i" viewBox="0 0 24 24" width="1em" height="1em" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + paths + '</svg>';
  }

  /* ------------------------------------------------------------------ *
   * 2. STATE (in-memory for this preview — see note at top of file)
   * ------------------------------------------------------------------ */
  const AppState = {
    userName: 'Você',
    expenses: [],          // { id, description, amount, category, date }
    budgetGoal: 2000,
    savingsGoal: 500,
    xp: 0,
    courseProgress: {}     // { [courseId]: { doneLessons, completed, completedDate, quizzes } }
  };

  function load() {
    try {
      const raw = localStorage.getItem('raisin-finance-state');
      if (raw) {
        const stored = JSON.parse(raw);
        Object.assign(AppState, stored);
        AppState.courseProgress = stored.courseProgress || {};
        AppState.xp = Number(stored.xp) || 0;
        return;
      }
    } catch (e) {
      console.warn('Não foi possível carregar os dados salvos.', e);
    }
    seedDemoData();
    save();
  }

  function save() {
    try {
      localStorage.setItem('raisin-finance-state', JSON.stringify(AppState));
    } catch (e) {
      console.warn('Não foi possível salvar os dados.', e);
    }
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
    AppState.xp = 40;
    AppState.courseProgress = {
      'financas-zero': { doneLessons: ['0', '1'], completed: false, quizzes: {} }
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

  function getCourseProgress(course) {
    if (!AppState.courseProgress[course.id]) {
      AppState.courseProgress[course.id] = { doneLessons: [], completed: false, quizzes: {} };
    }
    const progress = AppState.courseProgress[course.id];
    progress.doneLessons = Array.isArray(progress.doneLessons) ? progress.doneLessons : [];
    progress.quizzes = progress.quizzes || {};
    return progress;
  }

  function isLessonUnlocked(course, idx) {
    return idx === 0 || getCourseProgress(course).doneLessons.includes(String(idx - 1));
  }

  function totalMinutes(course) {
    return course.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
  }

  function studyLevel() {
    if (AppState.xp >= 500) return { name: 'Especialista', next: 500 };
    if (AppState.xp >= 300) return { name: 'Investidor', next: 500 };
    if (AppState.xp >= 160) return { name: 'Conhecedor', next: 300 };
    if (AppState.xp >= 60) return { name: 'Aprendiz', next: 160 };
    return { name: 'Iniciante', next: 60 };
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
    const iconName = type === 'success' ? 'check' : type === 'error' ? 'alert' : 'dot';
    el.innerHTML = `<span class="toast__icon">${icon(iconName)}</span><span>${message}</span>`;
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
  let activeLessonIndex = null;

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
    $('#lessonBackBtn').addEventListener('click', () => {
      if (activeCourseId) openCourse(activeCourseId);
      else goTo('learn');
    });
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
        <span class="teaser-card__title">${icon(course.icon)} ${course.title}</span>
        <div class="teaser-card__bar"><div class="teaser-card__bar-fill" style="width:${pct}%"></div></div>
        <span class="teaser-card__pct">${pct}% concluído</span>
      `;
      row.appendChild(card);
    });

    const activeCourse = COURSES.find((course) => {
      const progress = getCourseProgress(course);
      return !progress.completed && progress.doneLessons.length > 0;
    }) || COURSES[0];
    const nextIndex = activeCourse.lessons.findIndex((_, index) => !getCourseProgress(activeCourse).doneLessons.includes(String(index)));
    const nextLesson = activeCourse.lessons[nextIndex === -1 ? 0 : nextIndex];
    const level = studyLevel();
    $('#studyResume').innerHTML = `
      <div><p class="study-resume__eyebrow">${level.name} · ${AppState.xp} XP</p><strong>${activeCourse.title}</strong><p>${courseProgressPct(activeCourse)}% concluído · Próxima: ${nextLesson.title}</p></div>
      <button class="btn btn--primary btn--sm" id="resumeStudyBtn">Continuar</button>`;
    $('#resumeStudyBtn').addEventListener('click', () => openCourse(activeCourse.id));
  }

  /* ------------------------------------------------------------------ *
   * 7. LEARN / CONTENT HUB
   * ------------------------------------------------------------------ */
  let activeFilter = 'all';

  function renderCourseList() {
    const level = studyLevel();
    $('#studyHero').innerHTML = `
      <div><p class="study-hero__label">TRILHA RECOMENDADA</p><h2>Do controle do dinheiro aos investimentos.</h2><p>Estude em aulas curtas, responda quizzes e evolua seu conhecimento.</p></div>
      <div class="study-xp"><strong>${AppState.xp} XP</strong><span>Nível ${level.name}</span><div class="mini-bar"><div class="mini-bar__fill" style="width:${Math.min(100, Math.round(AppState.xp / level.next * 100))}%"></div></div></div>`;
    const list = $('#courseList');
    list.innerHTML = '';
    const filtered = COURSES.filter((c) => activeFilter === 'all' || c.category === activeFilter);

    filtered.forEach((course) => {
      const pct = courseProgressPct(course);
      const progress = AppState.courseProgress[course.id];
      const statusClass = progress && progress.completed ? 'done' : pct > 0 ? 'progress' : 'new';
      const statusLabel = progress && progress.completed ? 'Concluído' : pct > 0 ? `${pct}% concluído` : 'Novo';

      const card = document.createElement('button');
      card.className = 'course-card study-course-card';
      card.addEventListener('click', () => openCourse(course.id));
      card.innerHTML = `
        <span class="course-card__icon" aria-hidden="true">${icon(course.icon)}</span>
        <span class="course-cover" aria-hidden="true">${course.cover}</span>
        <span class="course-card__body">
          <span class="course-card__title">${course.title}</span>
          <span class="course-card__desc">${course.desc}</span>
          <span class="course-card__meta">
            <span>${course.level}</span>
            <span>·</span>
            <span>${course.lessons.length} aulas</span>
            <span>·</span>
            <span>${totalMinutes(course)} min</span>
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
    getCourseProgress(course);
    renderCourseDetail(course);
    goTo('course');
  }

  function renderCourseDetail(course) {
    const progress = getCourseProgress(course);
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
          <span class="btn__label">${progress.completed ? 'Ver certificado' : 'Concluir curso'}</span>
          <span class="btn__spinner" aria-hidden="true"></span>
        </button>
      </div>
    `;

    const lessonList = $('#lessonList');
    course.lessons.forEach((lesson, idx) => {
      if (idx === 0 || course.lessons[idx - 1].module !== lesson.module) {
        const moduleTitle = document.createElement('p');
        moduleTitle.className = 'module-title';
        moduleTitle.textContent = `Módulo ${lesson.module + 1} · ${course.modules[lesson.module]}`;
        lessonList.appendChild(moduleTitle);
      }
      const isDone = progress.doneLessons.includes(String(idx));
      const unlocked = isLessonUnlocked(course, idx);
      const row = document.createElement('button');
      row.className = 'lesson-item' + (isDone ? ' is-done' : '') + (!unlocked ? ' is-locked' : '');
      row.style.width = '100%';
      row.style.textAlign = 'left';
      row.innerHTML = `
        <span class="lesson-item__check">${isDone ? icon('check') : ''}</span>
        <span class="lesson-item__title">Aula ${String(idx + 1).padStart(2, '0')} · ${lesson.title}</span>
        <span class="lesson-item__time">${unlocked ? lesson.minutes + ' min' : 'Bloqueada'}</span>
      `;
      row.addEventListener('click', () => {
        if (!unlocked) { showToast('Conclua a aula anterior para desbloquear esta.', 'default'); return; }
        openLesson(course, idx);
      });
      lessonList.appendChild(row);
    });

    $('#completeCourseBtn').addEventListener('click', () => onCompleteCourse(course));
  }

  function toggleLesson(course, idx) {
    const progress = getCourseProgress(course);
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
    const progress = getCourseProgress(course);
    if (progress.completed) {
      openCertificate(course);
      return;
    }
    if (progress.doneLessons.length !== course.lessons.length) {
      showToast('Conclua todas as aulas para liberar o certificado.', 'default');
      return;
    }
    const btn = $('#completeCourseBtn');
    btn.classList.add('is-loading');
    btn.disabled = true;

    setTimeout(() => {
      progress.completed = true;
      progress.completedDate = new Date().toISOString().slice(0, 10);
      AppState.xp += 200;
      save();
      btn.classList.remove('is-loading');
      btn.disabled = false;
      renderCourseDetail(course);
      showToast(`Parabéns! Você concluiu "${course.title}".`, 'success');
      openCertificate(course);
    }, 700);
  }

  function openLesson(course, idx) {
    activeCourseId = course.id;
    activeLessonIndex = idx;
    renderLesson(course, idx);
    goTo('lesson');
  }

  function renderLesson(course, idx) {
    const lesson = course.lessons[idx];
    const progress = getCourseProgress(course);
    const completed = progress.doneLessons.includes(String(idx));
    const quizResult = lesson.quiz ? progress.quizzes[String(idx)] : null;
    const detail = $('#lessonDetail');
    detail.innerHTML = `
      <div class="lesson-layout">
        <div>
          <p class="page-head__eyebrow">${course.title} · Módulo ${lesson.module + 1}</p>
          <h1 class="lesson-title">Aula ${String(idx + 1).padStart(2, '0')} — ${lesson.title}</h1>
          <div class="course-detail__video lesson-video"><iframe src="https://www.youtube.com/embed/${lesson.videoId}" title="${lesson.title}" loading="lazy" allowfullscreen></iframe></div>
          <div class="lesson-card"><h2>O que você vai aprender</h2><ul>${lesson.objectives.map((item) => `<li>${item}</li>`).join('')}</ul></div>
          <div class="lesson-card"><h2>Resumo da aula</h2><p>${lesson.summary}</p></div>
          <div class="lesson-card lesson-material"><h2>Material complementar</h2><p>${icon('book-open')} Resumo para revisão · ${icon('target')} Exemplo prático · ${icon('chart')} Glossário</p></div>
          <p class="study-disclaimer">Conteúdo educativo. Investimentos têm riscos e rentabilidade não é garantida.</p>
        </div>
        <aside class="lesson-sidebar">
          <span class="course-card__status course-card__status--${completed ? 'done' : 'progress'}">${completed ? 'Aula concluída' : '+10 XP ao concluir'}</span>
          <p>${completed ? 'Você já concluiu esta aula. Pode revisá-la quando quiser.' : 'Após assistir ao conteúdo, marque a aula como concluída para avançar.'}</p>
          <button class="btn btn--primary btn--block" id="completeLessonBtn" ${completed ? 'disabled' : ''}>${completed ? 'Concluída' : 'Concluir aula'}</button>
          ${lesson.quiz ? renderQuizMarkup(lesson, quizResult) : ''}
        </aside>
      </div>`;

    const completeButton = $('#completeLessonBtn');
    if (completeButton && !completed) completeButton.addEventListener('click', () => completeLesson(course, idx));
    if (lesson.quiz && !quizResult) {
      $('#lessonQuizForm').addEventListener('submit', (event) => submitQuiz(event, course, idx));
    }
  }

  function renderQuizMarkup(lesson, result) {
    if (result) {
      return `<div class="quiz-card ${result.correct ? 'is-correct' : 'is-wrong'}"><p class="quiz-card__label">QUIZ DO MÓDULO</p><h2>${result.correct ? 'Resposta correta! +20 XP' : 'Resposta registrada'}</h2><p>${result.correct ? 'Muito bem. Você acertou o conceito principal.' : 'Revise o resumo e tente aplicar o conceito na prática.'}</p></div>`;
    }
    return `<form class="quiz-card" id="lessonQuizForm"><p class="quiz-card__label">QUIZ DO MÓDULO · +20 XP</p><h2>${lesson.quiz.question}</h2>${lesson.quiz.options.map((option, index) => `<label class="quiz-option"><input type="radio" name="quizAnswer" value="${index}" required><span>${String.fromCharCode(65 + index)}</span>${option}</label>`).join('')}<button class="btn btn--ghost btn--block" type="submit">Responder quiz</button></form>`;
  }

  function completeLesson(course, idx) {
    const progress = getCourseProgress(course);
    if (!isLessonUnlocked(course, idx)) return;
    if (!progress.doneLessons.includes(String(idx))) {
      progress.doneLessons.push(String(idx));
      AppState.xp += 10;
      save();
      showToast('Aula concluída! Você ganhou 10 XP.', 'success');
    }
    renderLesson(course, idx);
  }

  function submitQuiz(event, course, idx) {
    event.preventDefault();
    const lesson = course.lessons[idx];
    const choice = Number(new FormData(event.currentTarget).get('quizAnswer'));
    const progress = getCourseProgress(course);
    const correct = choice === lesson.quiz.answer;
    progress.quizzes[String(idx)] = { correct, choice };
    if (correct) AppState.xp += 20;
    save();
    renderLesson(course, idx);
    showToast(correct ? 'Resposta correta! +20 XP.' : 'Resposta registrada. Revise o conteúdo e siga estudando.', correct ? 'success' : 'default');
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
      chip.innerHTML = `<span aria-hidden="true">${icon(cat.icon)}</span><span>${cat.label}</span>`;
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
          <span class="budget-bar-row__cat">${icon(cat.icon)} ${cat.label}</span>
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
        <span class="tx-item__icon" aria-hidden="true">${icon(cat.icon)}</span>
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
        <span class="cert-card__badge" aria-hidden="true">${icon('award')}</span>
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
        <span class="progress-course-row__icon" aria-hidden="true">${icon(course.icon)}</span>
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
    $('#certHours').textContent = `Carga horária: ${Math.max(1, Math.round(totalMinutes(course) / 60))} hora${totalMinutes(course) >= 120 ? 's' : ''}`;
    $('#certCode').textContent = `Código de validação: RF-${course.id.slice(0, 3).toUpperCase()}-${(progress && progress.completedDate || '2026-01-01').replaceAll('-', '')}`;
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
