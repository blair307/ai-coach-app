// Authentication JavaScript

const API_BASE_URL = 'your-railway-backend-url'; // Replace with your Railway backend URL

// Handle login form submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// Login function
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Show loading
    loadingOverlay.style.display = 'flex';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save auth token
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            throw new Error(data.message || 'Login failed');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// Check if user is already logged in
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const currentPage = window.location.pathname.split('/').pop();
    
    // If on login/signup pages and already logged in, redirect to dashboard
    if (token && (currentPage === 'login.html' || currentPage === 'signup.html' || currentPage === 'index.html')) {
        window.location.href = 'dashboard.html';
    }
    
    // If on protected pages and not logged in, redirect to login
    const protectedPages = ['dashboard.html', 'ai-coach.html', 'community.html', 'notifications.html', 'billing.html'];
    if (!token && protectedPages.includes(currentPage)) {
        window.location.href = 'login.html';
    }
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = 'login.html';
}

// Verify token with backend
async function verifyToken() {
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // Token is invalid, clear it
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Token verification error:', error);
        return false;
    }
}

// Run auth check on page load
document.addEventListener('DOMContentLoaded', checkAuthStatus);