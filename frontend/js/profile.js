const API_URL = 'http://localhost:5000/api';
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'login.html';
}

const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profileInitial = document.getElementById('profile-initial');
const streakCount = document.getElementById('streak-count');
const conceptCount = document.getElementById('concept-count');
const logoutBtn = document.getElementById('logout-btn');

async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const user = await response.json();
            profileName.textContent = user.name;
            profileEmail.textContent = user.email;
            profileInitial.textContent = user.name.charAt(0).toUpperCase();
            streakCount.textContent = user.learningStreak || 1;
            
            // Just simulate concept count based on graph API or a simple stat
            const graphRes = await fetch(`${API_URL}/graph`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const graphData = await graphRes.json();
            if (graphData.nodes) {
                conceptCount.textContent = graphData.nodes.length;
            }
        }
    } catch (err) {
        console.error('Failed to load profile', err);
    }
}

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
});
const scoreEl = document.getElementById("quiz-score");
scoreEl.textContent = user.quizScore || 0;
loadProfile();
