// Authentication JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    // Handle login form
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Handle signup form
    if (signupForm) {
        loginForm.addEventListener('submit', handleSignup);
    }

    // Update branding
    updateBranding();
});

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
        // Simulate login API call
        await simulateLogin(email, password);
        
        // Store auth token
        const authToken = generateAuthToken();
        localStorage.setItem('authToken', authToken);
        
        // Store user data
        const userData = {
            email: email,
            name: getNameFromEmail(email),
            loginTime: new Date().toISOString(),
            remember: remember
        };
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // Show success message
        showSuccess('Login successful! Redirecting...');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
    } catch (error) {
        showError(error.message || 'Login failed. Please try again.');
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
    const plan = document.querySelector('input[name="plan"]:checked').value;
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
        // Simulate signup API call
        await simulateSignup({firstName, lastName, email, password, plan});
        
        // Store auth token
        const authToken = generateAuthToken();
        localStorage.setItem('authToken', authToken);
        
        // Store user data
        const userData = {
            email: email,
            name: `${firstName} ${lastName}`,
            plan: plan,
            signupTime: new Date().toISOString()
        };
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // Show success message
        showSuccess('Account created successfully! Redirecting...');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        showError(error.message || 'Signup failed. Please try again.');
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

// Simulate login API call
async function simulateLogin(email, password) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simple validation - in real app this would be server-side
            if (email.includes('@') && password.length >= 6) {
                resolve({ success: true });
            } else {
                reject(new Error('Invalid email or password'));
            }
        }, 1000);
    });
}

// Simulate signup API call
async function simulateSignup(userData) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Check if email already exists (simulated)
            const existingUser = localStorage.getItem(`user_${userData.email}`);
            if (existingUser) {
                reject(new Error('An account with this email already exists'));
                return;
            }
            
            // Store user (simulated)
            localStorage.setItem(`user_${userData.email}`, JSON.stringify(userData));
            resolve({ success: true });
        }, 1500);
    });
}

// Utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPassword(password) {
    // At least 8 characters, one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

function generateAuthToken() {
    return 'eeh_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function getNameFromEmail(email) {
    const username = email.split('@')[0];
    return username.charAt(0).toUpperCase() + username.slice(1);
}

// Message display functions
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

// Check if user is already logged in
function checkExistingAuth() {
    const authToken = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (authToken && userData) {
        // User is already logged in, redirect to dashboard
        window.location.href = 'dashboard.html';
    }
}

// Check on page load
document.addEventListener('DOMContentLoaded', function() {
    // Only check if we're on login/signup pages
    if (window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html')) {
        checkExistingAuth();
    }
});

// Add required CSS for animations
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
