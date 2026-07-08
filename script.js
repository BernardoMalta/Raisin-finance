/* ============================================
   RAISIN FINANCE - JAVASCRIPT
   Complete functionality with localStorage persistence
   ============================================ */

// ============================================
// DATA STRUCTURES
// ============================================

// Sample course data
const coursesData = [
    {
        id: 'budgeting-basics',
        title: 'Noções de Orçamento',
        description: 'Aprenda a criar um orçamento realista e manté-lo.',
        hours: 6,
        lessons: [
            'Entendendo Sua Renda',
            'Rastreando Despesas Fixas',
            'Categorizando Despesas Variáveis',
            'Criando Seu Primeiro Orçamento',
            'Revisão e Ajuste do Orçamento'
        ],
        progress: 0,
        completed: false
    },
    {
        id: 'debt-management',
        title: 'Gestão de Dívidas 101',
        description: 'Domine estratégias para quitar dívidas de forma eficaz.',
        hours: 8,
        lessons: [
            'Entendendo Tipos de Dívida',
            'Criando um Plano de Pagamento de Dívida',
            'Noções de Consolidação de Dívida',
            'Construindo Hábitos de Crédito Bom',
            'Negociando com Credores'
        ],
        progress: 0,
        completed: false
    },
    {
        id: 'investment-intro',
        title: 'Introdução ao Investimento',
        description: 'Comece sua jornada de investimento com fundamentos sólidos.',
        hours: 10,
        lessons: [
            'Ações vs Títulos Básico',
            'Entendendo Risco e Retorno',
            'Princípios de Diversificação',
            'Índices e ETFs',
            'Começando como Investidor Iniciante'
        ],
        progress: 0,
        completed: false
    },
    {
        id: 'emergency-fund',
        title: 'Construção de Fundo de Emergência',
        description: 'Construa uma rede de segurança para desafios financeiros inesperados.',
        hours: 5,
        lessons: [
            'Por que Fundos de Emergência São Importantes',
            'Quanto Você Deve Economizar?',
            'Onde Manter Seu Fundo de Emergência',
            'Aumentando Seu Fundo ao Longo do Tempo'
        ],
        progress: 0,
        completed: false
    },
    {
        id: 'goal-setting',
        title: 'Estrutura de Definição de Metas',
        description: 'Defina e alcance objetivos financeiros significativos.',
        hours: 7,
        lessons: [
            'Metas Financeiras SMART',
            'Metas de Curto vs Longo Prazo',
            'Priorizando Seus Objetivos',
            'Acompanhando Progresso',
            'Celebrando marcos'
        ],
        progress: 0,
        completed: false
    }
];

// Sample content hub data
const contentData = [
    {
        id: 'article-1',
        type: 'article',
        icon: '📄',
        title: 'A Regra de Orçamento 50/30/20',
        description: 'Uma técnica simples de orçamento para gerenciar suas finanças de forma eficaz.',
        duration: '5 min de leitura'
    },
    {
        id: 'video-1',
        type: 'videos',
        icon: '🎥',
        title: 'Como Começar a Investir em 2024',
        description: 'Um guia abrangente para começar sua jornada de investimento.',
        duration: '12 min'
    },
    {
        id: 'course-1',
        type: 'courses',
        icon: '📚',
        title: 'O Essencial das Finanças Pessoais',
        description: 'Domine os fundamentos das finanças pessoais em 4 semanas.',
        duration: '24 horas'
    },
    {
        id: 'article-2',
        type: 'article',
        icon: '📄',
        title: 'Checklist de Fundo de Emergência',
        description: 'Seu checklist completo para construir um fundo de emergência.',
        duration: '8 min de leitura'
    },
    {
        id: 'video-2',
        type: 'videos',
        icon: '🎥',
        title: 'Segredos de Pontuação de Crédito Revelados',
        description: 'Saiba o que afeta sua pontuação de crédito e como melhorá-la.',
        duration: '15 min'
    },
    {
        id: 'course-2',
        type: 'courses',
        icon: '📚',
        title: 'Estratégias de Investimento Avançadas',
        description: 'Leve suas habilidades de investimento para o próximo nível.',
        duration: '30 horas'
    }
];

// Expense categories
const expenseCategories = [
    { id: 'food', label: 'Alimentação', emoji: '🍔' },
    { id: 'transportation', label: 'Transporte', emoji: '🚗' },
    { id: 'entertainment', label: 'Entretenimento', emoji: '🎬' },
    { id: 'housing', label: 'Habitação', emoji: '🏠' },
    { id: 'education', label: 'Educação', emoji: '📚' },
    { id: 'healthcare', label: 'Saúde', emoji: '🏥' },
    { id: 'utilities', label: 'Utilidades', emoji: '⚡' },
    { id: 'shopping', label: 'Compras', emoji: '🛍️' },
    { id: 'savings', label: 'Poupança', emoji: '💰' },
    { id: 'other', label: 'Outro', emoji: '📌' }
];

// ============================================
// STATE MANAGEMENT
// ============================================

// Storage keys
const STORAGE_KEYS = {
    expenses: 'rf_expenses',
    courseProgress: 'rf_course_progress',
    userProfile: 'rf_user_profile'
};

// Initialize data from localStorage
function initializeData() {
    // Load or create courses
    let savedCourses = localStorage.getItem(STORAGE_KEYS.courseProgress);
    if (savedCourses) {
        const progressMap = JSON.parse(savedCourses);
        coursesData.forEach(course => {
            if (progressMap[course.id]) {
                course.progress = progressMap[course.id].progress;
                course.completed = progressMap[course.id].completed;
            }
        });
    }
    
    // Load or create expenses
    if (!localStorage.getItem(STORAGE_KEYS.expenses)) {
        localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify([]));
    }
}

// ============================================
// NAVIGATION & SECTION MANAGEMENT
// ============================================

const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

// Toggle hamburger menu
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Navigation links
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.getAttribute('data-section');
        navigateSection(section);
    });
});

// Navigate to section
function navigateSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        window.scrollTo(0, 0);
    }

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

    // Close hamburger menu
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');

    // Trigger section-specific initialization
    if (sectionId === 'expense-tracker') {
        updateExpenseDisplay();
    } else if (sectionId === 'progress') {
        updateProgressDisplay();
    } else if (sectionId === 'content-hub') {
        displayContentHub();
    } else if (sectionId === 'education') {
        displayEducationCourses();
    } else if (sectionId === 'home') {
        updateHomeStats();
    }
}

// ============================================
// CONTENT HUB
// ============================================

function displayContentHub() {
    const contentGrid = document.getElementById('contentGrid');
    contentGrid.innerHTML = '';

    const filterBtns = document.querySelectorAll('.filter-btn');
    let activeFilter = 'all';

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.getAttribute('data-filter');
            displayFilteredContent(activeFilter);
        });
    });

    displayFilteredContent('all');
}

function displayFilteredContent(filter) {
    const contentGrid = document.getElementById('contentGrid');
    contentGrid.innerHTML = '';

    let filteredContent = contentData;
    if (filter !== 'all') {
        filteredContent = contentData.filter(item => item.type === filter);
    }

    filteredContent.forEach(item => {
        const card = document.createElement('div');
        card.className = 'content-card';
        card.innerHTML = `
            <div class="card-icon">${item.icon}</div>
            <span class="card-type">${item.type === 'article' ? 'Artigo' : item.type === 'videos' ? 'Vídeo' : 'Curso'}</span>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1rem;">⏱️ ${item.duration}</p>
            <button class="btn btn-secondary btn-small" onclick="handleContentClick('${item.id}')">Visualizar</button>
        `;
        contentGrid.appendChild(card);
    });
}

function handleContentClick(contentId) {
    const content = contentData.find(c => c.id === contentId);
    if (content) {
        alert(`Abrindo: ${content.title}\n\nTipo: ${content.type === 'article' ? 'Artigo' : content.type === 'videos' ? 'Vídeo' : 'Curso'}\n\nIsso é um marcador de posição. Em um aplicativo de produção, isso carregaria o conteúdo completo.`);
    }
}

// ============================================
// EDUCATION COURSES
// ============================================

function displayEducationCourses() {
    const coursesList = document.getElementById('coursesList');
    coursesList.innerHTML = '';

    coursesData.forEach(course => {
        const courseCard = createCourseCard(course);
        coursesList.appendChild(courseCard);
    });
}

function createCourseCard(course) {
    const card = document.createElement('div');
    card.className = `course-card ${course.completed ? 'completed' : ''}`;

    const lessonListHTML = course.lessons.map((lesson, index) => `
        <div class="lesson-item">
            <input type="checkbox" class="lesson-checkbox" 
                   ${Math.random() > 0.7 ? 'checked' : ''} 
                   onchange="updateCourseProgress('${course.id}')">
            <span class="lesson-text">${lesson}</span>
        </div>
    `).join('');

    card.innerHTML = `
        <div class="course-header">
            <div class="course-title">
                <h3>${course.title}</h3>
                <p class="course-description">${course.description}</p>
            </div>
            <span class="course-badge ${course.completed ? 'completed' : ''}">
                ${course.completed ? '✓ Concluído' : 'Em Progresso'}
            </span>
        </div>
        <div class="course-progress-bar">
            <div class="course-progress-fill" style="width: ${course.progress}%"></div>
        </div>
        <div class="course-lessons">
            ${lessonListHTML}
        </div>
        <div class="course-footer">
            <span class="course-hours">📚 ${course.hours} horas</span>
            <button class="btn btn-primary btn-small" onclick="completeCourse('${course.id}')">
                ${course.completed ? 'Revisar' : 'Continuar'}
            </button>
        </div>
    `;

    return card;
}

function updateCourseProgress(courseId) {
    const course = coursesData.find(c => c.id === courseId);
    if (course) {
        const card = event.target.closest('.course-card');
        const checkedLessons = card.querySelectorAll('.lesson-checkbox:checked').length;
        const totalLessons = card.querySelectorAll('.lesson-checkbox').length;
        course.progress = Math.round((checkedLessons / totalLessons) * 100);

        if (course.progress === 100) {
            course.completed = true;
        }

        saveCourseProgress();
        displayEducationCourses();
    }
}

function completeCourse(courseId) {
    const course = coursesData.find(c => c.id === courseId);
    if (course) {
        course.completed = true;
        course.progress = 100;
        saveCourseProgress();
        displayEducationCourses();
        alert(`🎉 Parabéns! Você completou "${course.title}"\n\nUm certificado foi adicionado ao seu perfil.`);
    }
}

function saveCourseProgress() {
    const progressMap = {};
    coursesData.forEach(course => {
        progressMap[course.id] = {
            progress: course.progress,
            completed: course.completed
        };
    });
    localStorage.setItem(STORAGE_KEYS.courseProgress, JSON.stringify(progressMap));
}

// ============================================
// EXPENSE TRACKER
// ============================================

const expenseForm = document.getElementById('expenseForm');
const expenseDateInput = document.getElementById('expenseDate');

// Set today's date as default
const today = new Date().toISOString().split('T')[0];
expenseDateInput.value = today;

// Handle expense form submission
expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const expense = {
        id: Date.now().toString(),
        date: document.getElementById('expenseDate').value,
        category: document.getElementById('expenseCategory').value,
        description: document.getElementById('expenseDescription').value,
        amount: parseFloat(document.getElementById('expenseAmount').value)
    };

    // Add to localStorage
    const expenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.expenses));
    expenses.push(expense);
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses));

    // Reset form
    expenseForm.reset();
    expenseDateInput.value = today;

    // Update display
    updateExpenseDisplay();

    // Show feedback
    showNotification('Despesa adicionada com sucesso!');
});

function updateExpenseDisplay() {
    const expenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.expenses));
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyExpenses = expenses.filter(e => e.date.startsWith(currentMonth));

    // Update summary
    updateExpenseSummary(monthlyExpenses);

    // Update expenses list
    updateExpensesList(expenses);
}

function updateExpenseSummary(monthlyExpenses) {
    // Calculate totals
    const total = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    document.getElementById('monthlyTotal').textContent = `R$${total.toFixed(2)}`;

    // Find highest category
    const categoryTotals = {};
    monthlyExpenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    let highestCategory = '—';
    let highestAmount = 0;
    for (const [category, amount] of Object.entries(categoryTotals)) {
        if (amount > highestAmount) {
            highestAmount = amount;
            highestCategory = expenseCategories.find(c => c.id === category)?.label || category;
        }
    }
    document.getElementById('highestCategory').textContent = highestCategory;

    // Update category breakdown chart
    updateBreakdownChart(monthlyExpenses);
}

function updateBreakdownChart(monthlyExpenses) {
    const breakdownChart = document.getElementById('breakdownChart');
    breakdownChart.innerHTML = '';

    const categoryTotals = {};
    monthlyExpenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    const total = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    if (total === 0) {
        breakdownChart.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">Sem despesas ainda</p>';
        return;
    }

    Object.entries(categoryTotals).forEach(([category, amount]) => {
        const percentage = (amount / total) * 100;
        const categoryName = expenseCategories.find(c => c.id === category)?.label || category;
        
        const bar = document.createElement('div');
        bar.className = 'category-bar';
        bar.innerHTML = `
            <div class="category-label">${categoryName}</div>
            <div class="category-bar-container">
                <div class="category-bar-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="category-amount">R$${amount.toFixed(2)}</div>
        `;
        breakdownChart.appendChild(bar);
    });
}

function updateExpensesList(allExpenses) {
    const expensesList = document.getElementById('expensesList');
    expensesList.innerHTML = '';

    if (allExpenses.length === 0) {
        expensesList.innerHTML = '<div class="empty-message">Nenhuma despesa registrada ainda. Comece a rastrear para vê-las aqui!</div>';
        document.getElementById('clearAllBtn').style.display = 'none';
        return;
    }

    document.getElementById('clearAllBtn').style.display = 'block';

    // Sort by date, newest first
    const sorted = [...allExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(expense => {
        const categoryData = expenseCategories.find(c => c.id === expense.category);
        const item = document.createElement('div');
        item.className = 'expense-item';
        
        item.innerHTML = `
            <div class="expense-item-left">
                <div class="expense-item-category">${categoryData?.emoji || '📌'} ${categoryData?.label || 'Outro'}</div>
                <div class="expense-item-description">${expense.description}</div>
                <div class="expense-item-date">${new Date(expense.date).toLocaleDateString('pt-BR')}</div>
            </div>
            <div class="expense-item-right">
                <div class="expense-item-amount">R$${expense.amount.toFixed(2)}</div>
            </div>
            <button class="expense-item-delete" onclick="deleteExpense('${expense.id}')">✕</button>
        `;
        expensesList.appendChild(item);
    });
}

function deleteExpense(expenseId) {
    if (confirm('Tem certeza que deseja deletar essa despesa?')) {
        let expenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.expenses));
        expenses = expenses.filter(e => e.id !== expenseId);
        localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses));
        updateExpenseDisplay();
        showNotification('Despesa deletada');
    }
}

// Clear all expenses
document.getElementById('clearAllBtn').addEventListener('click', () => {
    if (confirm('Tem certeza que deseja deletar TODAS as despesas? Esta ação não pode ser desfeita.')) {
        localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify([]));
        updateExpenseDisplay();
        showNotification('Todas as despesas foram limpas');
    }
});

// ============================================
// USER PROGRESS & STATS
// ============================================

function updateProgressDisplay() {
    updateProgressStats();
    displayCourseProgress();
    displayCertificates();
    displaySavingsAchievement();
}

function updateProgressStats() {
    const completedCount = coursesData.filter(c => c.completed).length;
    const totalHours = coursesData.reduce((sum, c) => sum + (c.completed ? c.hours : 0), 0);
    const certificates = completedCount;

    document.getElementById('completedCourses').textContent = completedCount;
    document.getElementById('totalHours').textContent = totalHours;
    document.getElementById('certificatesEarned').textContent = certificates;
}

function displayCourseProgress() {
    const progressItems = document.getElementById('progressItems');
    progressItems.innerHTML = '';

    coursesData.forEach(course => {
        const item = document.createElement('div');
        item.className = 'progress-item';
        
        item.innerHTML = `
            <div class="progress-item-header">
                <div class="progress-item-title">${course.title}</div>
                <span class="progress-item-status ${course.completed ? 'completed' : ''}">
                    ${course.completed ? '✓ Concluído' : `${course.progress}%`}
                </span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${course.progress}%"></div>
            </div>
        `;
        progressItems.appendChild(item);
    });
}

function displayCertificates() {
    const certificatesList = document.getElementById('certificatesList');
    certificatesList.innerHTML = '';

    const completedCourses = coursesData.filter(c => c.completed);

    if (completedCourses.length === 0) {
        certificatesList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">Complete cursos para ganhar certificados!</p>';
        return;
    }

    completedCourses.forEach(course => {
        const certificate = document.createElement('div');
        certificate.className = 'certificate-card';
        
        const completionDate = new Date().toLocaleDateString('pt-BR');
        certificate.innerHTML = `
            <div class="certificate-icon">🏆</div>
            <div class="certificate-name">${course.title}</div>
            <div class="certificate-date">Concluído em: ${completionDate}</div>
            <button class="certificate-btn" onclick="downloadCertificate('${course.id}')">Baixar</button>
        `;
        certificatesList.appendChild(certificate);
    });
}

function downloadCertificate(courseId) {
    const course = coursesData.find(c => c.id === courseId);
    alert(`📜 Download de Certificado\n\n${course.title}\n\nIsso é um marcador de posição. Em um aplicativo de produção, isso geraria um certificado em PDF.`);
}

function displaySavingsAchievement() {
    const expenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.expenses));
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
    
    // Calculate potential savings (10% of tracked spending)
    const totalSpent = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const savedAmount = totalSpent * 0.1;
    
    document.getElementById('totalSavingsAmount').textContent = `R$${savedAmount.toFixed(2)}`;
    
    const goalAmount = 1000;
    const percentage = Math.min((savedAmount / goalAmount) * 100, 100);
    document.getElementById('savingsProgressFill').style.width = `${percentage}%`;
}

function updateHomeStats() {
    const expenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.expenses));
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
    
    const totalSpent = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const savedAmount = totalSpent * 0.1;
    
    document.getElementById('total-expenses-home').textContent = `R$${totalSpent.toFixed(2)}`;
    document.getElementById('total-saved-home').textContent = `R$${savedAmount.toFixed(2)}`;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showNotification(message) {
    // Create a simple notification (in production, you'd use a toast library)
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        animation: slideIn 0.3s ease-in-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize data from localStorage
    initializeData();

    // Display home section by default
    navigateSection('home');

    // Add CSS animations for notifications
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});
