document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    errorMessage.style.display = 'none';

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const isJson = response.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await response.json() : null;

        if (response.ok && data?.success) {
            sessionStorage.setItem('loggedIn', 'true');
            window.location.href = '/cars';
            return;
        }

        errorMessage.textContent = data?.message || 'Login failed. Please try again shortly.';
        errorMessage.style.display = 'block';
    } catch (error) {
        errorMessage.textContent = 'Unable to reach the server. Please try again.';
        errorMessage.style.display = 'block';
    }
});
