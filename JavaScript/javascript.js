// --- Тема ---
const themeToggle = document.getElementById('theme-toggle');

if (themeToggle) {
    const savedTheme = localStorage.getItem('theme');
    
    // Функция для проверки системной темы
    const getSystemTheme = () => {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };
    
    // Определяем, какую тему использовать
    let isDark = false;
    
    if (savedTheme) {
        isDark = savedTheme === 'dark';
    } else {
        isDark = getSystemTheme() === 'dark';
    }
    
    // Применяем тему
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.checked = true;
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.checked = false;
    }
    
    function toggleTheme() {
        if (themeToggle.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    }
    
    // Обработчик для переключения по клику/чеку
    themeToggle.addEventListener('change', toggleTheme);
    
    // Обработчик для системной темы
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            if (newTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                themeToggle.checked = true;
            } else {
                document.documentElement.removeAttribute('data-theme');
                themeToggle.checked = false;
            }
        }
    });
    
    // Горячая клавиша Ctrl+T
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 't') {
            e.preventDefault();
            themeToggle.checked = !themeToggle.checked;
            toggleTheme();
        }
    });
}

// --- Состояние ---
let cards = JSON.parse(localStorage.getItem('englishCards')) || [];
let currentCardIndex = 0;
let isFlipped = false;
let wordToEditIndex = null;
let reviewTimer = null;
let searchQuery = '';
let scheduledReviews = JSON.parse(localStorage.getItem('scheduledReviews')) || [];
let reviewQueue = [];
let masteredCount = 0;

const Kado = {
    LEARNING_STEPS: [60_000, 600_000],
    GRADUATING_INTERVAL: 86_400_000,
    EASY_INTERVAL: 345_600_000,
    STARTING_EASE: 2.5,
    MIN_EASE: 1.3,
    HARD_INTERVAL: 1.2,
    HARD_EASE_PENALTY: 0.15,
    LAPSE_MULTIPLIER: 0.2,
    LAPSE_EASE_PENALTY: 0.2,
    EASY_BONUS: 1.3,
    EASY_EASE_BONUS: 0.15,
};

// --- DOM ---
const flashcard = document.getElementById('flashcard');
const frontText = document.getElementById('front-text');
const backText = document.getElementById('back-text');
const showBtn = document.getElementById('show-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const totalCardsElement = document.getElementById('total-cards');
const currentCardElement = document.getElementById('current-card');
const masteredCardsElement = document.getElementById('mastered-cards');
const wordsList = document.getElementById('words-list');
const wordsCount = document.getElementById('words-count');
const shuffleBtn = document.getElementById('shuffle-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const clearModal = document.getElementById('clear-modal');
const closeClearModalBtn = document.getElementById('close-clear-modal');
const confirmClearBtn = document.getElementById('confirm-clear');
const cancelClearBtn = document.getElementById('cancel-clear');
const importFileInput = document.getElementById('import-file');
const repeatBtn = document.getElementById('repeat-btn');
const hardBtn = document.getElementById('hard-btn');
const normalBtn = document.getElementById('normal-btn');
const easyBtn = document.getElementById('easy-btn');
const addCardModal = document.getElementById('add-card-modal');
const openAddModalBtn = document.getElementById('open-add-modal');
const closeAddModalBtn = document.getElementById('close-add-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalRussianInput = document.getElementById('modal-russian-word');
const modalEnglishInput = document.getElementById('modal-english-word');
const modalAddBtn = document.getElementById('modal-add-btn');
const searchInput = document.getElementById('search-words');
const editModal = document.getElementById('edit-modal');
const editRussianInput = document.getElementById('edit-russian');
const editEnglishInput = document.getElementById('edit-english');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// --- Вспомогательные функции ---
function ensureKadoFields(card) {
    if (card.state === undefined) card.state = 'new';
    if (card.ease === undefined) card.ease = Kado.STARTING_EASE;
    if (card.interval === undefined) card.interval = 0;
    if (card.step === undefined) card.step = 0;
    if (card.lastInterval === undefined) card.lastInterval = 0;
}

function createCard(russian, english) {
    return {
        russian,
        english,
        state: 'new',
        ease: Kado.STARTING_EASE,
        interval: 0,
        step: 0,
        lastInterval: 0,
    };
}

function syncMasteredCount() {
    masteredCount = cards.filter((card) => card.wasMastered).length;
}

function markMastered(card) {
    if (!card.wasMastered) {
        card.wasMastered = true;
        masteredCount++;
    }
}

function isDuplicateCard(russian, english) {
    const ru = russian.toLowerCase();
    const en = english.toLowerCase();
    return cards.some(
        (card) => card.russian.toLowerCase() === ru || card.english.toLowerCase() === en
    );
}

function confirmDuplicate() {
    return confirm('Такое слово уже существует. Добавить всё равно?');
}

// --- Хранение ---
function saveScheduledReviews() {
    localStorage.setItem('scheduledReviews', JSON.stringify(scheduledReviews));
}

function saveCards() {
    localStorage.setItem('englishCards', JSON.stringify(cards));
    updateStats();
    renderWordsList();
}

// --- UI карточек ---
function updateCard() {
    if (cards.length === 0) {
        frontText.textContent = 'Добавьте первую карточку!';
        backText.textContent = 'Нажмите «Перевод»';
        return;
    }

    flashcard.classList.remove('flipped');
    isFlipped = false;
    showBtn.textContent = 'Перевод';

    setTimeout(() => {
        const card = cards[currentCardIndex];
        frontText.textContent = card.russian;
        backText.textContent = card.english;
        updateStats();
        renderWordsList();
    }, 250);
}

function updateStats() {
    totalCardsElement.textContent = cards.length;
    currentCardElement.textContent = cards.length > 0 ? currentCardIndex + 1 : 0;
    wordsCount.textContent = cards.length;
    masteredCardsElement.textContent = masteredCount;
}

function renderWordsList() {
    const filteredCards = searchQuery
        ? cards.filter(
              (card) =>
                  card.russian.toLowerCase().includes(searchQuery) ||
                  card.english.toLowerCase().includes(searchQuery)
          )
        : cards;

    if (filteredCards.length === 0) {
        wordsList.innerHTML = searchQuery
            ? `<div class="empty-message">Ничего не найдено по запросу «${searchInput.value}»</div>`
            : '<div class="empty-message">Список слов пуст. Добавьте первую карточку!</div>';
        return;
    }

    wordsList.innerHTML = '';

    filteredCards.forEach((card) => {
        const index = cards.indexOf(card);
        const wordItem = document.createElement('div');
        wordItem.className = `word-item ${index === currentCardIndex ? 'current-word' : ''}`;
        wordItem.innerHTML = `
            <div class="word-content">
                <div class="word-russian">${card.russian}</div>
                <div class="word-english">${card.english}</div>
            </div>
            <div class="word-actions">
                <button type="button" class="btn btn-word btn-word--edit" aria-label="Редактировать" onclick="event.stopPropagation(); editWord(${index})">✎</button>
                <button type="button" class="btn btn-word btn-word--delete" aria-label="Удалить" onclick="event.stopPropagation(); deleteWord(${index})">×</button>
            </div>
        `;
        wordItem.addEventListener('click', (e) => {
            if (!e.target.closest('.word-actions')) {
                currentCardIndex = index;
                updateCard();
            }
        });
        wordsList.appendChild(wordItem);
    });
}

function flipCard() {
    if (cards.length === 0) return;
    isFlipped = !isFlipped;
    flashcard.classList.toggle('flipped');
    showBtn.textContent = isFlipped ? 'Скрыть' : 'Перевод';
}

function nextCard() {
    if (cards.length === 0) return;
    currentCardIndex =
        reviewQueue.length > 0
            ? reviewQueue.shift()
            : (currentCardIndex + 1) % cards.length;
    updateCard();
}

function prevCard() {
    if (cards.length === 0) return;
    currentCardIndex = (currentCardIndex - 1 + cards.length) % cards.length;
    updateCard();
}

// --- Алгоритм повторений ---
function scheduleNextReview(rating) {
    console.log('Кнопка нажата:', rating, 'isFlipped:', isFlipped, 'cards.length:', cards.length);
    if (cards.length === 0 || !isFlipped) return;

    const card = cards[currentCardIndex];
    ensureKadoFields(card);

    const now = Date.now();
    let intervalMs = 0;
    const isNewOrLearning = card.state === 'new' || card.state === 'learning';
    const isRelearning = card.state === 'relearning';

    if (isNewOrLearning || isRelearning) {
        const steps = Kado.LEARNING_STEPS;
        const maxStep = steps.length - 1;

        if (rating === 'REPEAT') {
            card.step = 0;
            card.state = isRelearning ? 'relearning' : 'learning';
            intervalMs = steps[0];
        } else if (rating === 'HARD') {
            card.state = isRelearning ? 'relearning' : 'learning';
            const goodInterval =
                card.step < maxStep ? steps[card.step + 1] : Kado.GRADUATING_INTERVAL;
            intervalMs = (steps[0] + goodInterval) / 2;
        } else if (rating === 'NORMAL') {
            if (card.step >= maxStep) {
                card.state = 'review';
                card.step = 0;
                intervalMs = isRelearning
                    ? Math.max(
                          Kado.GRADUATING_INTERVAL,
                          (card.lastInterval || Kado.GRADUATING_INTERVAL) * Kado.LAPSE_MULTIPLIER
                      )
                    : Kado.GRADUATING_INTERVAL;
                card.interval = intervalMs;
                markMastered(card);
            } else {
                card.step++;
                intervalMs = steps[card.step];
                card.state = isRelearning ? 'relearning' : 'learning';
            }
        } else if (rating === 'EASY') {
            card.state = 'review';
            card.step = 0;
            intervalMs = Kado.EASY_INTERVAL;
            card.interval = intervalMs;
            markMastered(card);
        }
    } else {
        const currentInterval = card.interval || Kado.GRADUATING_INTERVAL;

        if (rating === 'REPEAT') {
            card.lastInterval = currentInterval;
            card.ease = Math.max(Kado.MIN_EASE, card.ease - Kado.LAPSE_EASE_PENALTY);
            card.state = 'relearning';
            card.step = 0;
            intervalMs = Kado.LEARNING_STEPS[0];
        } else if (rating === 'HARD') {
            card.ease = Math.max(Kado.MIN_EASE, card.ease - Kado.HARD_EASE_PENALTY);
            const newInterval = currentInterval * Kado.HARD_INTERVAL;
            intervalMs = Math.max(currentInterval + 86_400_000, newInterval);
            card.interval = intervalMs;
        } else if (rating === 'NORMAL') {
            const newInterval = currentInterval * card.ease;
            intervalMs = Math.max(currentInterval + 86_400_000, newInterval);
            card.interval = intervalMs;
        } else if (rating === 'EASY') {
            const newInterval = currentInterval * card.ease * Kado.EASY_BONUS;
            intervalMs = Math.max(currentInterval + 86_400_000, newInterval);
            card.interval = intervalMs;
            card.ease = Math.min(3.0, card.ease + Kado.EASY_EASE_BONUS);
        }
    }

    scheduledReviews.push({ cardIndex: currentCardIndex, showAt: now + intervalMs });
    scheduledReviews.sort((a, b) => {
        const priorityA = cards[a.cardIndex]?.state === 'relearning' ? 1 : 0;
        const priorityB = cards[b.cardIndex]?.state === 'relearning' ? 1 : 0;
        if (priorityA !== priorityB) return priorityB - priorityA;
        return a.showAt - b.showAt;
    });
    saveScheduledReviews();
    saveCards();
    console.log('После scheduleNextReview, currentCardIndex:', currentCardIndex, 'нужно вызвать nextCard');
}

function checkScheduledReviews() {
    const now = Date.now();
    const dueCards = scheduledReviews.filter((s) => s.showAt <= now);

    if (dueCards.length === 0) return;

    scheduledReviews = scheduledReviews.filter((s) => s.showAt > now);
    saveScheduledReviews();

    dueCards.forEach((due) => {
        if (due.cardIndex < cards.length && !reviewQueue.includes(due.cardIndex)) {
            reviewQueue.push(due.cardIndex);
        }
    });
}

// --- Модальные окна ---
function openAddCardModal() {
    addCardModal.style.display = 'flex';
    modalRussianInput.focus();
}

function triggerShake(element) {
    element.classList.remove('shake');
    void element.offsetWidth;
    element.classList.add('shake');
}

function clearModalFieldState(...inputs) {
    inputs.forEach((input) => {
        input.classList.remove('invalid', 'shake');
    });
}

function validateModalFields(russianInputEl, englishInputEl) {
    const russian = russianInputEl.value.trim();
    const english = englishInputEl.value.trim();
    let isValid = true;

    clearModalFieldState(russianInputEl, englishInputEl);

    if (!russian) {
        russianInputEl.classList.add('invalid');
        triggerShake(russianInputEl);
        isValid = false;
    }

    if (!english) {
        englishInputEl.classList.add('invalid');
        triggerShake(englishInputEl);
        isValid = false;
    }

    if (!isValid) {
        const modalContent = russianInputEl.closest('.modal-content');
        if (modalContent) triggerShake(modalContent);
        (russian ? englishInputEl : russianInputEl).focus();
        return null;
    }

    return { russian, english };
}

function setupModalInputValidation(...inputs) {
    inputs.forEach((input) => {
        input.addEventListener('input', () => {
            input.classList.remove('invalid', 'shake');
        });
    });
}

function closeAddCardModal() {
    addCardModal.style.display = 'none';
    modalRussianInput.value = '';
    modalEnglishInput.value = '';
    clearModalFieldState(modalRussianInput, modalEnglishInput);
}

function closeEditModal() {
    editModal.style.display = 'none';
    wordToEditIndex = null;
    editRussianInput.value = '';
    editEnglishInput.value = '';
    clearModalFieldState(editRussianInput, editEnglishInput);
}

function addCardFromModal() {
    const values = validateModalFields(modalRussianInput, modalEnglishInput);
    if (!values) return;

    const { russian, english } = values;

    if (isDuplicateCard(russian, english) && !confirmDuplicate()) return;

    cards.push(createCard(russian, english));
    currentCardIndex = cards.length - 1;
    saveCards();
    updateCard();
    closeAddCardModal();
}

function editWord(index) {
    wordToEditIndex = index;
    const card = cards[index];
    editRussianInput.value = card.russian;
    editEnglishInput.value = card.english;
    editModal.style.display = 'flex';
    editRussianInput.focus();
}

function deleteWord(index) {
    if (index < 0 || index >= cards.length) return;

    const deletedIndex = index;
    cards.splice(deletedIndex, 1);

    scheduledReviews = scheduledReviews
        .map((s) => ({
            cardIndex: s.cardIndex > deletedIndex ? s.cardIndex - 1 : s.cardIndex,
            showAt: s.showAt,
        }))
        .filter((s) => s.cardIndex >= 0);
    saveScheduledReviews();

    if (currentCardIndex >= deletedIndex && currentCardIndex > 0) {
        currentCardIndex--;
    }
    if (cards.length === 0) {
        currentCardIndex = 0;
    } else if (currentCardIndex >= cards.length) {
        currentCardIndex = cards.length - 1;
    }

    syncMasteredCount();
    saveCards();
    updateCard();
}

function shuffleCards() {
    if (cards.length < 2) return;

    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    currentCardIndex = 0;
    saveCards();
    updateCard();
}

function clearAllCards() {
    clearModal.style.display = 'flex';
}

function confirmClearAll() {
    cards = [];
    currentCardIndex = 0;
    masteredCount = 0;
    scheduledReviews = [];
    saveScheduledReviews();
    saveCards();
    updateCard();
    clearModal.style.display = 'none';
}

// --- Импорт / экспорт ---
function exportToCSV() {
    if (cards.length === 0) {
        alert('Нет данных для экспорта!');
        return;
    }

    const csvContent = [
        ['Русский', 'Английский'].join(','),
        ...cards.map((card) =>
            [card.russian, card.english]
                .map((cell) => `"${cell.replace(/"/g, '""')}"`)
                .join(',')
        ),
    ].join('\n');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(
        new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    );
    link.download = 'english_words_for_kado.csv';
    link.click();
    URL.revokeObjectURL(link.href);
}

function importFromCSV() {
    importFileInput.click();
}

function parseCsvLine(line) {
    const quoted = line.match(/"(.*?)","(.*?)"/);
    if (quoted) {
        return { russian: quoted[1], english: quoted[2] };
    }
    const parts = line.split(',');
    if (parts.length >= 2) {
        return { russian: parts[0].trim(), english: parts[1].trim() };
    }
    return null;
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const newCards = e.target.result
                .split('\n')
                .slice(1)
                .map((line) => parseCsvLine(line.trim()))
                .filter(Boolean)
                .map(({ russian, english }) => createCard(russian, english));

            if (newCards.length > 0) {
                if (confirm(`Найдено ${newCards.length} слов. Добавить к существующим?`)) {
                    cards.push(...newCards);
                    saveCards();
                    updateCard();
                }
            } else {
                alert('Не удалось найти слова для импорта.');
            }
        } catch (error) {
            alert('Ошибка при чтении файла: ' + error.message);
        }
        importFileInput.value = '';
    };
    reader.readAsText(file);
}

// --- Горячие клавиши ---
function handleKeyPress(e) {
    if (e.target.matches('input, textarea')) return;

    if (e.key === 'Escape') {
        if (addCardModal.style.display === 'flex') closeAddCardModal();
        if (editModal.style.display === 'flex') closeEditModal();
        return;
    }

    if (e.key === 'ArrowLeft') {
        prevCard();
        e.preventDefault();
    } else if (e.key === 'ArrowRight') {
        nextCard();
        e.preventDefault();
    } else if (e.key === ' ') {
        e.preventDefault();
        if (isFlipped) scheduleNextReview('NORMAL');
        else flipCard();
    } else if (isFlipped && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const ratings = { 1: 'REPEAT', 2: 'HARD', 3: 'NORMAL', 4: 'EASY' };
        if (ratings[e.key]) {
            scheduleNextReview(ratings[e.key]);
            e.preventDefault();
        }
    }
}

// --- Инициализация ---
cards.forEach(ensureKadoFields);
syncMasteredCount();

if (cards.length === 0) {
    cards.push(
        createCard('Привет', 'Hello'),
        createCard('Спасибо', 'Thank you'),
        createCard('Пожалуйста', 'Please')
    );
    saveCards();
}

updateCard();
setInterval(checkScheduledReviews, 5000);

flashcard.addEventListener('click', flipCard);
showBtn.addEventListener('click', flipCard);
nextBtn.addEventListener('click', nextCard);
prevBtn.addEventListener('click', prevCard);
shuffleBtn.addEventListener('click', shuffleCards);
exportBtn.addEventListener('click', exportToCSV);
importBtn.addEventListener('click', importFromCSV);
importFileInput.addEventListener('change', handleFileImport);
clearAllBtn.addEventListener('click', clearAllCards);
document.addEventListener('keydown', handleKeyPress);

repeatBtn.addEventListener('click', () => { scheduleNextReview('REPEAT'); nextCard(); });
hardBtn.addEventListener('click', () => { scheduleNextReview('HARD'); nextCard(); });
normalBtn.addEventListener('click', () => { scheduleNextReview('NORMAL'); nextCard(); });
easyBtn.addEventListener('click', () => { scheduleNextReview('EASY'); nextCard(); });

openAddModalBtn.addEventListener('click', openAddCardModal);
closeAddModalBtn.addEventListener('click', closeAddCardModal);
closeEditModalBtn.addEventListener('click', closeEditModal);
modalCancelBtn.addEventListener('click', closeAddCardModal);
modalAddBtn.addEventListener('click', addCardFromModal);

addCardModal.addEventListener('click', (e) => {
    if (e.target === addCardModal) closeAddCardModal();
});

setupModalInputValidation(modalRussianInput, modalEnglishInput, editRussianInput, editEnglishInput);

modalRussianInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') modalEnglishInput.focus();
});

modalEnglishInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addCardFromModal();
});

saveEditBtn.addEventListener('click', () => {
    if (wordToEditIndex === null) return;

    const values = validateModalFields(editRussianInput, editEnglishInput);
    if (!values) return;

    const { russian: newRussian, english: newEnglish } = values;

    cards[wordToEditIndex] = { ...cards[wordToEditIndex], russian: newRussian, english: newEnglish };
    saveCards();
    updateCard();
    closeEditModal();
});

cancelEditBtn.addEventListener('click', closeEditModal);

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        renderWordsList();
    });
}

confirmClearBtn.addEventListener('click', confirmClearAll);
cancelClearBtn.addEventListener('click', () => {
    clearModal.style.display = 'none';
});
closeClearModalBtn.addEventListener('click', () => {
    clearModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
    if (e.target === addCardModal) closeAddCardModal();
    if (e.target === clearModal) clearModal.style.display = 'none';
});

window.editWord = editWord;
window.deleteWord = deleteWord;


// --- Бургер-меню ---
const burgerToggle = document.getElementById('burger-toggle');
const burgerMenu = document.getElementById('burger-menu');
const logoutBtn = document.getElementById('logout-btn');

function openBurgerMenu() {
    burgerMenu.classList.add('open');
    burgerToggle.setAttribute('aria-expanded', 'true');
}

function closeBurgerMenu() {
    burgerMenu.classList.remove('open');
    burgerToggle.setAttribute('aria-expanded', 'false');
}

function toggleBurgerMenu() {
    burgerMenu.classList.contains('open') ? closeBurgerMenu() : openBurgerMenu();
}

if (burgerToggle && burgerMenu) {
    burgerToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBurgerMenu();
    });

    document.addEventListener('click', (e) => {
        if (!burgerMenu.contains(e.target) && e.target !== burgerToggle) {
            closeBurgerMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeBurgerMenu();
    });
}

// --- Логаут ---
async function logout() {
    const token = localStorage.getItem('access_token');

    try {
        await fetch('http://127.0.0.1:8000/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    } catch (error) {
        console.error('Ошибка при выходе:', error);
    } finally {
        localStorage.removeItem('access_token');
        window.location.href = 'login.html';
    }
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}