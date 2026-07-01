const registrationForm = document.getElementById('registration-form');
const emailInput = document.getElementById('reg-email');
const loginInput = document.getElementById('reg-login');
const passwordInput = document.getElementById('reg-password');
const registerButton = document.getElementById('btn-register');
const googleButton = document.getElementById('btn-google');
const formMessage = document.getElementById('form-message');
const termsLink = document.getElementById('terms-link');

const API_BASE_URL = 'http://127.0.0.1:8000';
const STORAGE_USER_KEY = 'kadoUser';
const STORAGE_TOKEN_KEY = 'kadoAccessToken';
const STORAGE_AUTH_PROVIDER_KEY = 'kadoAuthProvider';

// --- Тема ---
const themeToggle = document.getElementById('theme-toggle');

async function handleFormSubmit(event) {
    event.preventDefault();
    console.log('Submit сработал');
    showMessage('');

    if (!validateForm()) {
        console.log('Валидация не прошла');
        return;
    }
    console.log('Отправляю запрос на бэкенд');

    setFormLoading(true);
    try {
        await registerAndLogin(
            loginInput.value.trim(),
            emailInput.value.trim(),
            passwordInput.value
        );
    } catch (error) {
        console.log('Ошибка:', error.message);
        showMessage(error.message, 'error');
    } finally {
        setFormLoading(false);
    }
}

function setFormLoading(isLoading) {
    registerButton.disabled = isLoading;
    registerButton.textContent = isLoading ? 'Загрузка...' : 'Зарегистрироваться';
}

function handleGoogleSignIn() {
    showMessage('Вход через Google пока не реализован.');
}

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

function showMessage(text, type = '') {
    formMessage.textContent = text;
    formMessage.className = 'form-message' + (type ? ` ${type}` : '');
}

function validateForm() {
    const email = emailInput.value.trim();
    const login = loginInput.value.trim();
    const password = passwordInput.value;

    emailInput.classList.remove('invalid');
    loginInput.classList.remove('invalid');
    passwordInput.classList.remove('invalid');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailInput.classList.add('invalid');
        showMessage('Введите корректный email.', 'error');
        return false;
    }
    if (login.length < 3) {
        loginInput.classList.add('invalid');
        showMessage('Логин должен содержать не менее 3 символов.', 'error');
        return false;
    }
    if (password.length < 6) {
        passwordInput.classList.add('invalid');
        showMessage('Пароль содержит менее 8 символов.', 'error');
        return false;
    }
    return true;
}

function parseApiError(data) {
    if (!data?.detail) return 'Ошибка сервера. Попробуйте позже.';
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) return data.detail.map((item) => item.msg).join(', ');
    return 'Не удалось выполнить запрос.';
}

async function apiRequest(endpoint, options = {}) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options,
        });
    } catch {
        throw new Error('Не удалось подключиться к серверу. Запустите backend (uvicorn).');
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(parseApiError(data));
    return data;
}

function saveSession(user, token, provider) {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    localStorage.setItem(STORAGE_AUTH_PROVIDER_KEY, provider);
}

function completeRegistration(user, token, provider) {
    saveSession(user, token, provider);
    showMessage('Регистрация успешна! Переход в приложение…', 'success');
    setTimeout(() => {
        window.location.href = 'main.html';
    }, 800);
}

async function registerAndLogin(username, email, password) {
    const user = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    });
    const auth = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    completeRegistration(user, auth.access_token, 'email');
}


function handleTermsClick(event) {
    event.preventDefault();
    showMessage('Текст пользовательского соглашения будет доступен в следующей версии.');
}

async function checkExistingSession() {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (!token) return;

    try {
        await apiRequest('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
        });
        window.location.href = 'main.html';
    } catch {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_USER_KEY);
        localStorage.removeItem(STORAGE_AUTH_PROVIDER_KEY);
    }
}

registrationForm.addEventListener('submit', handleFormSubmit);
googleButton.addEventListener('click', handleGoogleSignIn);

checkExistingSession();
