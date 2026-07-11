const form = document.getElementById('loginForm');
const button = document.getElementById('loginButton');
const errorElement = document.getElementById('loginError');

form.addEventListener('submit', async event => {
    event.preventDefault();
    button.disabled = true;
    button.textContent = 'Signing in…';
    errorElement.textContent = '';
    try {
        const response = await fetch('/admin-api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                username: document.getElementById('username').value,
                password: document.getElementById('password').value,
            }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'Sign-in failed.');
        window.location.replace('/admin/scheduled-messages/');
    } catch (error) {
        errorElement.textContent = error.message;
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
    } finally {
        button.disabled = false;
        button.textContent = 'Sign in';
    }
});
