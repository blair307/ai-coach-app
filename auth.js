// Fixed Authentication JavaScript - Uses Real Backend
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    // Handle login form
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Handle signup form
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Update branding
    updateBranding();
});

// Your backend URL
const BACKEND_URL = 'https://api.eehcommunity.com';

function updateBranding() {
    // Update page titles
    if (document.title.includes('AI Coach')) {
        document.title = document.title.replace('AI Coach', 'Entrepreneur Emotional Health');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    
    if (!email || !password) {
        showError('Please enter both email and password');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Signing In...';
    
    try {
        console.log('🔐 Logging in to backend...');
        
        // REAL LOGIN - Call your backend instead of simulation
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        console.log('📡 Login response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Login failed');
        }
        
        const data = await response.json();
        console.log('✅ Login successful!');
        
        // Store REAL JWT token from backend
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('eeh_token', data.token);
        
        // Store user data from backend response
        const userData = {
            id: data.user.id,
            email: data.user.email,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            name: `${data.user.firstName} ${data.user.lastName}`,
            loginTime: new Date().toISOString(),
            remember: remember,
            streakData: data.streakData
        };
        localStorage.setItem('userData', JSON.stringify(userData));
        
        console.log('💾 Stored real user data and JWT token');
        
        // Show success message
        showSuccess('Login successful! Redirecting...');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Login error:', error);
        showError(error.message || 'Login failed. Please check your credentials and try again.');
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const plan = document.querySelector('input[name="plan"]:checked')?.value || 'basic';
    const terms = document.getElementById('terms').checked;
    
    if (!firstName || !lastName || !email || !password) {
        showError('Please fill in all required fields');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    if (!isValidPassword(password)) {
        showError('Password must be at least 8 characters with uppercase, lowercase, and numbers');
        return;
    }
    
    if (!terms) {
        showError('Please agree to the Terms of Service and Privacy Policy');
        return;
    }
    
    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Creating Account...';
    
    try {
        console.log('📝 Creating account on backend...');
        
        // REAL SIGNUP - Call your backend
        const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firstName: firstName,
                lastName: lastName,
                email: email,
                password: password,
                plan: plan,
                // Add payment fields if needed
                stripeCustomerId: 'temp_customer_id',
                paymentIntentId: 'temp_payment_id'
            })
        });
        
        console.log('📡 Signup response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Signup failed');
        }
        
        const data = await response.json();
        console.log('✅ Signup successful!');
        
        // Store REAL JWT token from backend
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('eeh_token', data.token);
        
        // Store user data from backend response
        const userData = {
            id: data.user.id,
            email: data.user.email,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            name: `${data.user.firstName} ${data.user.lastName}`,
            plan: plan,
            signupTime: new Date().toISOString(),
            streakData: data.streakData
        };
        localStorage.setItem('userData', JSON.stringify(userData));

        saveRememberMe(email, password, remember);
        
        console.log('💾 Stored real user data and JWT token');
        
        // Show success message
        showSuccess('Account created successfully! Redirecting...');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('❌ Signup error:', error);
        showError(error.message || 'Signup failed. Please try again.');
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

// Utility functions (keep these the same)
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPassword(password) {
    // At least 8 characters, one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

function getNameFromEmail(email) {
    const username = email.split('@')[0];
    return username.charAt(0).toUpperCase() + username.slice(1);
}

// Message display functions (keep these the same)
function showError(message) {
    showMessage(message, 'error');
}

function showSuccess(message) {
    showMessage(message, 'success');
}

function showMessage(message, type) {
    // Remove any existing messages
    const existingMessages = document.querySelectorAll('.auth-message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `auth-message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        padding: 1rem;
        margin: 1rem 0;
        border-radius: var(--radius);
        font-weight: 500;
        text-align: center;
        animation: fadeIn 0.3s ease-out;
        ${type === 'error' ? 
            'background: rgba(239, 68, 68, 0.1); color: var(--error); border: 1px solid rgba(239, 68, 68, 0.2);' :
            'background: rgba(16, 185, 129, 0.1); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2);'
        }
    `;
    
    // Insert message after the form header
    const authHeader = document.querySelector('.auth-header');
    if (authHeader) {
        authHeader.parentNode.insertBefore(messageDiv, authHeader.nextSibling);
    }
    
    // Auto-remove error messages after 5 seconds
    if (type === 'error') {
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// Forgot password function
function forgotPassword() {
    const email = prompt('Enter your email address to reset your password:');
    if (email && isValidEmail(email)) {
        showSuccess('Password reset instructions have been sent to your email.');
    } else if (email) {
        showError('Please enter a valid email address.');
    }
}

// Plan selection for signup
function selectPlan(planType) {
    const planRadio = document.getElementById(planType);
    if (planRadio) {
        planRadio.checked = true;
    }
    
    // Update visual selection
    document.querySelectorAll('.pricing-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    const selectedOption = document.querySelector(`[onclick="selectPlan('${planType}')"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
}

// Check if user is already logged in with VALID token
function checkExistingAuth() {
    const authToken = localStorage.getItem('authToken') || localStorage.getItem('eeh_token');
    const userData = localStorage.getItem('userData');
    
    // Check if token exists and looks like a JWT (starts with eyJ)
    if (authToken && authToken.startsWith('eyJ') && userData) {
        console.log('✅ User already logged in with valid JWT token');
        // User is already logged in, redirect to dashboard
        window.location.href = 'dashboard.html';
    } else if (authToken || userData) {
        console.log('🧹 Clearing invalid tokens');
        // Clear invalid tokens
        localStorage.removeItem('authToken');
        localStorage.removeItem('eeh_token');
        localStorage.removeItem('userData');
    }
}

// Check on page load
document.addEventListener('DOMContentLoaded', function() {
    // Only check if we're on login/signup pages
    if (window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html')) {
        checkExistingAuth();
    }
});

// Add required CSS for animations (keep this the same)
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .pricing-option.selected {
        border-color: var(--primary) !important;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%) !important;
        box-shadow: var(--shadow) !important;
    }
    
    .auth-message {
        animation: fadeIn 0.3s ease-out;
    }
    
    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

document.head.appendChild(style);

// ADD THIS TO THE BOTTOM OF YOUR EXISTING auth.js FILE

// Remember Me functionality
document.addEventListener('DOMContentLoaded', function() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberCheckbox = document.getElementById('remember');

    // Load saved login info when page loads
    if (localStorage.getItem('rememberMe') === 'true') {
        if (emailInput) emailInput.value = localStorage.getItem('savedEmail') || '';
        if (passwordInput) passwordInput.value = localStorage.getItem('savedPassword') || '';
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }
});

// Update your existing handleLogin function - find this line in your current code:
// localStorage.setItem('userData', JSON.stringify(userData));

// And add this RIGHT AFTER it:
function saveRememberMe(email, password, remember) {
    if (remember) {
        localStorage.setItem('savedEmail', email);
        localStorage.setItem('savedPassword', password);
        localStorage.setItem('rememberMe', 'true');
    } else {
        localStorage.removeItem('savedEmail');
        localStorage.removeItem('savedPassword');
        localStorage.removeItem('rememberMe');
    }
}
