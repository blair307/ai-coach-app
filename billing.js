// Simple Billing JavaScript

const API_BASE_URL = 'https://ai-coach-backend-mytn.onrender.com';

// Check if user is logged in when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadBillingData();
});

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
    }
}

// Load billing data from backend
async function loadBillingData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/billing/info`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const billingData = await response.json();
            updateBillingDisplay(billingData);
        }
    } catch (error) {
        console.error('Error loading billing data:', error);
        // Continue with default display if loading fails
    }
}

// Update billing information on the page
function updateBillingDisplay(data) {
    // This would update the page with real data from your backend
    // For now, the page shows sample data
    console.log('Billing data loaded:', data);
}

// Change subscription plan
function changePlan() {
    if (confirm('Would you like to switch between monthly and yearly plans?')) {
        alert('Plan change feature will be implemented with your backend. This would show available options.');
    }
}

// Switch to specific plan
function switchToPlan(planType) {
    const planName = planType === 'monthly' ? 'Monthly Plan ($97/month)' : 'Yearly Plan ($929/year)';
    
    if (confirm(`Switch to ${planName}? Changes will take effect at your next billing cycle.`)) {
        alert('Plan switch request submitted! You will receive an email confirmation.');
        // In a real app, this would call your backend to change the subscription
    }
}

// Cancel subscription
function cancelSubscription() {
    const confirmText = 'Are you sure you want to cancel your subscription? You will lose access to all features at the end of your current billing period.';
    
    if (confirm(confirmText)) {
        const finalConfirm = confirm('This action cannot be undone. Are you absolutely sure?');
        
        if (finalConfirm) {
            alert('Cancellation request submitted. You will receive an email confirmation and can still use the service until your current period ends.');
            // In a real app, this would call your backend to cancel the subscription
        }
    }
}

// Update payment method
function updatePayment() {
    const modal = document.getElementById('updatePaymentModal');
    modal.style.display = 'flex';
    
    // In a real app, you would initialize Stripe Elements here
    // For now, we'll just show the modal
}

// Close modal
function closeModal() {
    const modal = document.getElementById('updatePaymentModal');
    modal.style.display = 'none';
}

// Save payment method
function savePaymentMethod() {
    // In a real app, this would handle the Stripe payment method update
    alert('Payment method would be updated via Stripe. Integration needed with your backend.');
    closeModal();
}

// Download invoice
function downloadInvoice(invoiceId = null) {
    if (invoiceId) {
        alert(`Downloading invoice ${invoiceId}. This would fetch the PDF from your backend.`);
    } else {
        alert('Downloading latest receipt. This would fetch the PDF from your backend.');
    }
    
    // In a real app, this would download the actual PDF receipt
    // Example:
    // window.open(`${API_BASE_URL}/api/billing/invoice/${invoiceId}`, '_blank');
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'login.html';
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('updatePaymentModal');
    if (event.target === modal) {
        closeModal();
    }
});
