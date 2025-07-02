// UPDATED SIGNUP.JS - Replace your existing signup.js with this

const API_BASE_URL = 'https://ai-coach-backend-pbse.onrender.com';
const STRIPE_PUBLISHABLE_KEY = 'pk_test_0Ej0byBWJ6uXamOeILEwu9ea'; // Replace with your actual key

let stripe;
let elements;
let cardElement;
let isFreeAccount = false;
let appliedCoupon = null;

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
    
    // Form submission
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSubmit);
    }
    
    // Coupon code input - auto uppercase
    const couponInput = document.getElementById('couponCode');
    if (couponInput) {
        couponInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.toUpperCase();
        });
        
        // Allow Enter key to apply coupon
        couponInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyCoupon();
            }
        });
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

// Select plan function for onclick
function selectPlan(planType) {
    document.getElementById(planType).checked = true;
    updatePlanSelection();
}

// Apply coupon code
function applyCoupon() {
    const couponCode = document.getElementById('couponCode').value.trim().toUpperCase();
    const couponMessage = document.getElementById('couponMessage');
    const applyCouponBtn = document.getElementById('applyCouponBtn');
    
    if (!couponCode) {
        showCouponMessage('Please enter a coupon code', 'error');
        return;
    }
    
    // Disable button while processing
    applyCouponBtn.disabled = true;
    applyCouponBtn.textContent = 'Applying...';
    
    // Check if it's the EEHCLIENT code
    if (couponCode === 'EEHCLIENT') {
        // Apply free account
        applyFreeCoupon();
        showCouponMessage('🎉 Coupon applied! Your account is now FREE!', 'success');
        appliedCoupon = couponCode;
    } else {
        // Invalid coupon
        showCouponMessage('Invalid coupon code. Please try again.', 'error');
        removeCoupon();
    }
    
    // Re-enable button
    applyCouponBtn.disabled = false;
    applyCouponBtn.textContent = 'Apply';
}

// Apply free coupon (EEHCLIENT)
function applyFreeCoupon() {
    isFreeAccount = true;
    
    // Hide payment section
    document.getElementById('paymentSection').style.display = 'none';
    
    // Show free account notice
    document.getElementById('freeAccountNotice').style.display = 'block';
    
    // Update prices to show $0
    const originalPrices = document.querySelectorAll('.original-price');
    const discountedPrices = document.querySelectorAll('.discounted-price');
    
    originalPrices.forEach(price => {
        price.style.textDecoration = 'line-through';
        price.style.opacity = '0.5';
    });
    
    discountedPrices.forEach(price => {
        price.style.display = 'inline';
        price.style.color = '#10b981';
        price.style.fontWeight = 'bold';
    });
    
    // Update submit button
    document.getElementById('submitButtonText').textContent = 'Create Free Account';
    
    // Remove required attributes from payment fields
    const cardName = document.getElementById('cardName');
    const billingCountry = document.getElementById('billingCountry');
    
    if (cardName) cardName.removeAttribute('required');
    if (billingCountry) billingCountry.removeAttribute('required');
}

// Remove coupon
function removeCoupon() {
    isFreeAccount = false;
    appliedCoupon = null;
    
    // Show payment section
    document.getElementById('paymentSection').style.display = 'block';
    
    // Hide free account notice
    document.getElementById('freeAccountNotice').style.display = 'none';
    
    // Reset prices
    const originalPrices = document.querySelectorAll('.original-price');
    const discountedPrices = document.querySelectorAll('.discounted-price');
    
    originalPrices.forEach(price => {
        price.style.textDecoration = 'none';
        price.style.opacity = '1';
    });
    
    discountedPrices.forEach(price => {
        price.style.display = 'none';
    });
    
    // Reset submit button
    document.getElementById('submitButtonText').textContent = 'Start My Journey';
    
    // Add back required attributes
    const cardName = document.getElementById('cardName');
    const billingCountry = document.getElementById('billingCountry');
    
    if (cardName) cardName.setAttribute('required', '');
    if (billingCountry) billingCountry.setAttribute('required', '');
}

// Show coupon message
function showCouponMessage(message, type) {
    const couponMessage = document.getElementById('couponMessage');
    couponMessage.textContent = message;
    couponMessage.style.display = 'block';
    couponMessage.style.color = type === 'success' ? '#10b981' : '#ef4444';
    couponMessage.style.fontWeight = '600';
}

// Validate signup form
function validateSignupForm() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!firstName || !lastName || !email || !password) {
        alert('Please fill in all required fields');
        return false;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return false;
    }
    
    // If not free account, validate payment fields
    if (!isFreeAccount) {
        const cardName = document.getElementById('cardName');
        const billingCountry = document.getElementById('billingCountry');
        
        if (cardName && !cardName.value.trim()) {
            alert('Please enter the name on your card');
            return false;
        }
        
        if (billingCountry && !billingCountry.value) {
            alert('Please select your billing country');
            return false;
        }
    }
    
    return true;
}

// Handle form submission
async function handleSubmit(event) {
    event.preventDefault();
    
    // Validate form
    if (!validateSignupForm()) {
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    const submitButton = document.getElementById('submitButton');
    
    // Disable submit button and show loading
    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Processing...';
    loadingOverlay.style.display = 'flex';
    
    try {
        // Get form data
        const formData = getFormData();
        
        if (isFreeAccount) {
            // Handle free account creation
            await createFreeAccount(formData);
        } else {
            // Handle paid account creation
            await createPaidSubscription(formData);
        }
        
    } catch (error) {
        console.error('Signup error:', error);
        alert('Signup failed: ' + error.message);
        
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// Create free account
async function createFreeAccount(formData) {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ...formData,
            stripeCustomerId: null,
            paymentIntentId: 'free_account_' + Date.now(),
            couponCode: appliedCoupon,
            subscription: {
                plan: 'free',
                status: 'active'
            }
        })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'Failed to create account');
    }
    
    // Save auth data and redirect
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userData', JSON.stringify(data.user));
    localStorage.setItem('eeh_user_registration_date', new Date().toISOString());
    
    // Success message and redirect
    alert('Free account created successfully! Welcome to Entrepreneur Emotional Health!');
    window.location.href = 'dashboard.html';
}

// Create paid subscription
async function createPaidSubscription(formData) {
    console.log('Creating paid subscription for:', formData.email);
    
    // Step 1: Create subscription and get client secret
    const subscriptionResponse = await fetch(`${API_BASE_URL}/api/payments/create-subscription`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    });
    
    if (!subscriptionResponse.ok) {
        const errorData = await subscriptionResponse.json();
        throw new Error(errorData.error || 'Failed to create subscription');
    }
    
    const { subscriptionId, clientSecret, customerId } = await subscriptionResponse.json();
    console.log('Subscription created:', subscriptionId);
    
    // Step 2: Confirm payment with Stripe
    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
            card: cardElement,
            billing_details: {
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
            }
        }
    });
    
    if (confirmError) {
        console.error('Payment confirmation error:', confirmError);
        
        // Cancel the subscription since payment failed
        try {
            await fetch(`${API_BASE_URL}/api/billing/cancel-subscription-by-id`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriptionId })
            });
        } catch (cancelError) {
            console.error('Error canceling failed subscription:', cancelError);
        }
        
        throw new Error(confirmError.message);
    }
    
    console.log('Payment confirmed:', paymentIntent.status);
    
    // Step 3: Create user account with subscription info
    const accountResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ...formData,
            stripeCustomerId: customerId,
            subscriptionId: subscriptionId,
            paymentIntentId: paymentIntent.id,
            subscription: {
                plan: formData.plan,
                status: 'active',
                stripeSubscriptionId: subscriptionId
            }
        })
    });
    
    const accountData = await accountResponse.json();
    
    if (!accountResponse.ok) {
        throw new Error(accountData.message || 'Failed to create account');
    }
    
    console.log('Account created successfully');
    
    // Save auth data and redirect
    localStorage.setItem('authToken', accountData.token);
    localStorage.setItem('userData', JSON.stringify(accountData.user));
    localStorage.setItem('eeh_user_registration_date', new Date().toISOString());
    
    // Success message and redirect
    alert('Account created successfully! Welcome to Entrepreneur Emotional Health!');
    window.location.href = 'dashboard.html';
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
        couponCode: appliedCoupon
    };
}

// Add CSS for selected plan and coupon styling
const style = document.createElement('style');
style.textContent = `
    .pricing-option.selected {
        border-color: #6366f1 !important;
        background: #f0f9ff !important;
    }
    
    .coupon-section {
        background: #f8fafc;
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
    }
    
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        color: white;
        backdrop-filter: blur(4px);
    }
    
    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255,255,255,0.3);
        border-top: 4px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
