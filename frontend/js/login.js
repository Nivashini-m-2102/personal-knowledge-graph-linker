const API_URL = 'http://localhost:5000/api';

const form = document.getElementById('auth-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const toggleModeBtn = document.getElementById('toggle-mode');
const toggleText = document.getElementById('toggle-text');
const submitBtn = document.getElementById('submit-btn');
const errorMsg = document.getElementById('error-msg');

let isLogin = true;

// Check if already logged in


toggleModeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isLogin = !isLogin;
    
    if (isLogin) {
        nameInput.classList.add('hidden');
        submitBtn.textContent = 'Login';
        toggleText.textContent = "Don't have an account?";
        toggleModeBtn.textContent = 'Sign up';
    } else {
        nameInput.classList.remove('hidden');
        submitBtn.textContent = 'Sign Up';
        toggleText.textContent = "Already have an account?";
        toggleModeBtn.textContent = 'Login';
    }
    errorMsg.textContent = '';
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';
    
    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const payload = {
        email: emailInput.value,
        password: passwordInput.value
    };
    if (!isLogin) payload.name = nameInput.value;

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            window.location.href = 'upload.html';
        } else {
            errorMsg.textContent = data.message || 'An error occurred';
        }
    } catch (err) {
        errorMsg.textContent = 'Server connection failed';
    }
});
