if (localStorage.getItem('access')) {
    window.location.href = '/dashboard';
}

const switchButtons = document.querySelectorAll('.auth-switch-btn');
const authForms = document.querySelectorAll('.auth-form');

function setActiveView(view = 'login') {
    switchButtons.forEach((btn) => {
        const isActive = btn.dataset.view === view;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
    });
    authForms.forEach((form) => {
        form.classList.toggle('is-active', form.dataset.view === view);
    });
    const formsWrapper = document.querySelector('.auth-forms');
    if (formsWrapper) formsWrapper.dataset.active = view;
}

switchButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveView(button.dataset.view));
});

setActiveView('login');

// Password toggle
document.querySelectorAll('[data-toggle-password]').forEach((toggle) => {
    const input = document.getElementById(toggle.dataset.togglePassword);
    if (!input) return;
    toggle.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        toggle.classList.toggle('active', show);
        toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
});

function clearError(el) {
    if (!el) return;
    el.classList.add('d-none');
    el.textContent = '';
    el.classList.remove('success');
}

function showError(el, message, isSuccess = false) {
    if (!el) return;
    el.textContent = message;
    el.classList.remove('d-none', 'success');
    if (isSuccess) el.classList.add('success');
}

function setLoading(button, loading) {
    if (!button) return;
    if (loading) {
        button.dataset.originalText = button.textContent;
        button.innerHTML = '<span class="spinner"></span> Please wait…';
        button.disabled = true;
    } else {
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
        button.disabled = false;
    }
}

function wireFormClear(form, alertEl) {
    form.querySelectorAll('input').forEach(input => input.addEventListener('input', () => clearError(alertEl)));
}

// Login Form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    const loginError = document.getElementById('loginError');
    wireFormClear(loginForm, loginError);
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearError(loginError);
        const submitButton = loginForm.querySelector('button[type="submit"]');
        try {
            setLoading(submitButton, true);
            const response = await fetch('/user/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('loginEmail').value.trim(),
                    password: document.getElementById('loginPassword').value
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Login failed');
            localStorage.setItem('access', data.access);
            localStorage.setItem('refresh', data.refresh);
            window.location.href = '/dashboard';
        } catch (error) {
            showError(loginError, error.message || 'Unable to login');
        } finally {
            setLoading(submitButton, false);
        }
    });
}

// Register Form
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    const registerError = document.getElementById('registerError');
    wireFormClear(registerForm, registerError);
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearError(registerError);
        const payload = {
            first_name: document.getElementById('registerFirstName').value.trim(),
            last_name: document.getElementById('registerLastName').value.trim(),
            email: document.getElementById('registerEmail').value.trim(),
            password: document.getElementById('registerPassword').value,
        };
        const submitButton = registerForm.querySelector('button[type="submit"]');
        try {
            setLoading(submitButton, true);
            const response = await fetch('/user/register/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) {
                const message = Array.isArray(data.email) ? data.email.join(' ') : (data.email || data.detail || 'Registration failed');
                throw new Error(message);
            }
            registerForm.reset();
            setActiveView('login');
            const loginError = document.getElementById('loginError');
            showError(loginError, 'Account created successfully! Please sign in.', true);
        } catch (error) {
            showError(registerError, error.message || 'Registration failed');
        } finally {
            setLoading(submitButton, false);
        }
    });
}
