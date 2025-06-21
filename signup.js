// Signup and Payment JavaScript

const API_BASE_URL = 'https://ai-coach-backend-pbse.onrender.com';
const STRIPE_PUBLISHABLE_KEY = 'pk_test_0Ej0byBWJ6uXamOeILEwu9ea'; // Replace with your Stripe key

let stripe;
let elements;
let cardElement;

// Initialize Stripe
document.addEventListener('DOMContentLoaded', function() {
    initializeStripe();
    setupEventListeners();
    checkURLParams();
});

// Initialize Stripe Elements
function initializeStripe() {
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    elements = stripe.elements();
    
    // Create card element
    cardElement = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                    color: '#aab7c4',
                },
            },
        },
    });
    
    // Mount card element
    cardElement.mount('#card-element');
    
    // Handle real-time validation errors from the card Element
    cardElement.on('change', ({error}) => {
        const displayError = document.getElementById('card-errors');
        if (error) {
            displayError.textContent = error.message;
        } else {
            displayError.textContent = '';
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Plan selection
    const planInputs = document.querySelectorAll('input[name="plan"]');
    planInputs.forEach(input => {
        input.addEventListener('change', updatePlanSelection);
    });
    
    // Submit payment button
    const submitButton = document.getElementById('submitPayment');
    if (submitButton) {
        submitButton.addEventListener('click', handleSubmit);
    }
}

// Check URL parameters for pre-selected plan
function checkURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan');
    
    if (plan === 'monthly') {
        document.getElementById('monthly').checked = true;
    } else if (plan === 'yearly') {
        document.getElementById('yearly').checked = true;
    }
    
    updatePlanSelection();
}

// Update plan selection UI
function updatePlanSelection() {
    const selectedPlan = document.querySelector('input[name="plan"]:checked');
    const options = document.querySelectorAll('.pricing-option');
    
    options.forEach(option => {
        option.classList.remove('selected');
    });
    
    if (selectedPlan) {
        const parentOption = selectedPlan.closest('.pricing-option');
        parentOption.classList.add('selected');
    }
}

// Navigate between signup steps
function goToStep2() {
    const form = document.getElementById('signupForm');
    
    // Validate form data
    if (!validateSignupForm()) {
        return;
    }
    
    // Hide step 1, show step 2
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
}

function goToStep1() {
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step1').style.display = 'block';
}

// Validate signup form
function validateSignupForm() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return false;
    }
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return false;
    }
    
    if (password.length < 8) {
        alert('Password must be at least 8 characters long');
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return false;
    }
    
    return true;
}

// Handle payment submission
async function handleSubmit(event) {
    event.preventDefault();
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    const submitButton = document.getElementById('submitPayment');
    
    // Disable submit button and show loading
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';
    loadingOverlay.style.display = 'flex';
    
    try {
        // Get form data
        const formData = getFormData();
        
        // Create payment intent on your backend
        const response = await fetch(`${API_BASE_URL}/api/payments/create-subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const { clientSecret, customerId } = await response.json();
        
        if (!response.ok) {
            throw new Error('Failed to create payment intent');
        }
        
        // Confirm payment with Stripe
        const result = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: `${formData.firstName} ${formData.lastName}`,
                    email: formData.email,
                }
            }
        });
        
        if (result.error) {
            throw new Error(result.error.message);
        }
        
        // Payment successful, create user account
        const accountResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...formData,
                stripeCustomerId: customerId,
                paymentIntentId: result.paymentIntent.id
            })
        });
        
        const accountData = await accountResponse.json();
        
        if (!accountResponse.ok) {
            throw new Error(accountData.message || 'Failed to create account');
        }
        
        // Save auth token and redirect
        localStorage.setItem('authToken', accountData.token);
        localStorage.setItem('userData', JSON.stringify(accountData.user));
        
        // Show success message briefly then redirect
        alert('Account created successfully! Welcome to AI Coach!');
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Payment error:', error);
        alert('Payment failed: ' + error.message);
        
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = 'Complete Purchase';
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// Get form data
function getFormData() {
    const selectedPlan = document.querySelector('input[name="plan"]:checked').value;
    
    return {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        plan: selectedPlan,
        planAmount: selectedPlan === 'yearly' ? 92900 : 9700 // Amount in cents
    };
}

// Add CSS for selected plan
const style = document.createElement('style');
style.textContent = `
    .pricing-option.selected {
        border-color: #6366f1 !important;
        background: #f0f9ff !important;
    }
`;
document.head.appendChild(style);
