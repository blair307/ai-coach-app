// UPDATED BILLING.JS - Replace your existing billing.js with this

const API_BASE_URL = 'https://ai-coach-backend-pbse.onrender.com';
const STRIPE_PUBLISHABLE_KEY = 'pk_live_tTVxNijpdjtwFw13i0HbgCxJ'; // Replace with your actual key

let stripe;
let elements;
let cardElement;
let currentBillingData = null;

// Check if user is logged in when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeStripe();
    loadBillingData();
});

// Initialize Stripe for payment method updates
function initializeStripe() {
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    elements = stripe.elements();
    
    // Create card element for payment method updates
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
}

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
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/api/billing/customer`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const billingData = await response.json();
            currentBillingData = billingData;
            updateBillingDisplay(billingData);
            await loadInvoices();
        } else {
            console.error('Failed to load billing data');
            showError('Unable to load billing information');
        }
    } catch (error) {
        console.error('Error loading billing data:', error);
        showError('Failed to connect to billing service');
    } finally {
        showLoading(false);
    }
}

// Update billing information on the page
function updateBillingDisplay(data) {
    const { customer, subscription, paymentMethods, localSubscription } = data;
    
    console.log('Updating billing display with:', data);
    
    // Update subscription info
    if (subscription && localSubscription) {
        updateSubscriptionInfo(subscription, localSubscription);
    }
    
    // Update payment method info
    if (paymentMethods && paymentMethods.length > 0) {
        updatePaymentMethodInfo(paymentMethods[0]);
    }
    
    // Update customer info
    if (customer) {
        updateCustomerInfo(customer);
    }
}

// Update subscription information
function updateSubscriptionInfo(stripeSubscription, localSubscription) {
    // Update plan name and status
    const planNameElement = document.querySelector('.billing-card h3');
    const statusElement = document.querySelector('.plan-status');
    const priceElement = document.querySelector('.plan-price');
    const nextBillingElement = document.querySelector('.info-row strong');
    
    if (planNameElement) {
        const planName = localSubscription.plan === 'yearly' ? 'Yearly Plan' : 'Monthly Plan';
        planNameElement.textContent = planName;
    }
    
    if (statusElement) {
        statusElement.textContent = stripeSubscription.status === 'active' ? 'Active' : 
                                   stripeSubscription.status === 'past_due' ? 'Past Due' :
                                   stripeSubscription.status === 'canceled' ? 'Canceled' : 
                                   stripeSubscription.status.charAt(0).toUpperCase() + stripeSubscription.status.slice(1);
        
        // Update status styling
        statusElement.className = `plan-status ${stripeSubscription.status}`;
    }
    
    if (priceElement) {
        const amount = stripeSubscription.items.data[0].price.unit_amount / 100;
        const interval = stripeSubscription.items.data[0].price.recurring.interval;
        priceElement.innerHTML = `$${amount}<span>/${interval}</span>`;
    }
    
    if (nextBillingElement) {
        const nextBilling = new Date(stripeSubscription.current_period_end * 1000);
        nextBillingElement.textContent = nextBilling.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Show/hide cancel/reactivate buttons based on status
    updateSubscriptionButtons(stripeSubscription);
}

// Update subscription action buttons
function updateSubscriptionButtons(subscription) {
    const cancelBtn = document.querySelector('button[onclick="cancelSubscription()"]');
    const changePlanBtn = document.querySelector('button[onclick="changePlan()"]');
    
    if (subscription.cancel_at_period_end) {
        // Subscription is set to cancel
        if (cancelBtn) {
            cancelBtn.textContent = 'Reactivate Plan';
            cancelBtn.onclick = () => reactivateSubscription();
            cancelBtn.className = 'btn btn-primary';
        }
    } else if (subscription.status === 'canceled') {
        // Subscription is fully canceled
        if (cancelBtn) {
            cancelBtn.textContent = 'Subscribe Again';
            cancelBtn.onclick = () => window.location.href = 'signup.html';
            cancelBtn.className = 'btn btn-primary';
        }
    } else {
        // Normal active subscription
        if (cancelBtn) {
            cancelBtn.textContent = 'Cancel Plan';
            cancelBtn.onclick = () => cancelSubscription();
            cancelBtn.className = 'btn btn-secondary';
        }
    }
}

// Update payment method information
function updatePaymentMethodInfo(paymentMethod) {
    const cardInfo = document.querySelector('.plan-details p');
    const cardElement = document.querySelector('.plan-details > div');
    
    if (paymentMethod && paymentMethod.card) {
        const card = paymentMethod.card;
        
        // Update card number display
        if (cardInfo) {
            cardInfo.textContent = `•••• •••• •••• ${card.last4}`;
        }
        
        // Update expiry
        const expiryElement = document.querySelector('.plan-details small');
        if (expiryElement) {
            expiryElement.textContent = `Expires ${card.exp_month}/${card.exp_year}`;
        }
        
        // Update brand display
        const brandElement = document.querySelector('.plan-details > div > div');
        if (brandElement) {
            brandElement.textContent = card.brand.toUpperCase();
        }
    }
}

// Update customer information
function updateCustomerInfo(customer) {
    const emailElements = document.querySelectorAll('.info-row strong');
    if (emailElements.length >= 3) {
        emailElements[2].textContent = customer.email;
    }
}

// Load and display invoices
async function loadInvoices() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/billing/invoices`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const invoices = await response.json();
            updateInvoicesTable(invoices);
        }
    } catch (error) {
        console.error('Error loading invoices:', error);
    }
}

// Update invoices table with real data
function updateInvoicesTable(invoices) {
    const tbody = document.querySelector('.billing-card tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--border)';
        
        const date = new Date(invoice.created * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const amount = (invoice.amount_paid / 100).toFixed(2);
        const status = invoice.status === 'paid' ? 'Paid' : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
        const statusColor = invoice.status === 'paid' ? 'var(--success)' : 'var(--warning)';
        
        row.innerHTML = `
            <td style="padding: 1rem; color: var(--text-primary);" data-label="Date">${date}</td>
            <td style="padding: 1rem; color: var(--text-primary);" data-label="Description">${invoice.description || 'Subscription'}</td>
            <td style="padding: 1rem; color: var(--text-primary); font-weight: 600;" data-label="Amount">$${amount}</td>
            <td style="padding: 1rem;" data-label="Status">
                <span style="background: rgba(16, 185, 129, 0.1); color: ${statusColor}; padding: 0.25rem 0.75rem; border-radius: var(--radius); font-size: 0.875rem; font-weight: 600;">${status}</span>
            </td>
            <td style="padding: 1rem;" data-label="Invoice">
                <button class="btn-link" onclick="downloadInvoice('${invoice.id}')">Download</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Change subscription plan
function changePlan() {
    const currentPlan = currentBillingData?.localSubscription?.plan;
    const newPlan = currentPlan === 'yearly' ? 'monthly' : 'yearly';
    const newPlanName = newPlan === 'yearly' ? 'Yearly Plan ($929/year)' : 'Monthly Plan ($97/month)';
    
    if (confirm(`Switch to ${newPlanName}? Changes will take effect at your next billing cycle.`)) {
        // TODO: Implement plan change API call
        alert('Plan change feature will be implemented. This would call your backend to modify the subscription.');
    }
}

// Cancel subscription
async function cancelSubscription() {
    const confirmText = 'Are you sure you want to cancel your subscription? You will lose access to all features at the end of your current billing period.';
    
    if (!confirm(confirmText)) return;
    
    const finalConfirm = confirm('This action cannot be undone easily. Are you absolutely sure?');
    if (!finalConfirm) return;
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/api/billing/cancel-subscription`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(`Subscription canceled successfully. You can continue using the service until ${new Date(result.cancelAt).toLocaleDateString()}.`);
            await loadBillingData(); // Refresh the display
        } else {
            throw new Error(result.error || 'Failed to cancel subscription');
        }
        
    } catch (error) {
        console.error('Cancel subscription error:', error);
        alert('Failed to cancel subscription: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Reactivate subscription
async function reactivateSubscription() {
    if (!confirm('Reactivate your subscription? You will continue to be billed as normal.')) return;
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/api/billing/reactivate-subscription`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Subscription reactivated successfully!');
            await loadBillingData(); // Refresh the display
        } else {
            throw new Error(result.error || 'Failed to reactivate subscription');
        }
        
    } catch (error) {
        console.error('Reactivate subscription error:', error);
        alert('Failed to reactivate subscription: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Update payment method
function updatePayment() {
    const modal = createPaymentModal();
    document.body.appendChild(modal);
    
    // Mount card element to the modal
    setTimeout(() => {
        if (cardElement) {
            cardElement.mount('#modal-card-element');
        }
    }, 100);
}

// Create payment update modal
function createPaymentModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'updatePaymentModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Update Payment Method</h3>
                <button onclick="closePaymentModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Card Information</label>
                    <div id="modal-card-element" style="padding: 1rem; border: 2px solid var(--border); border-radius: var(--radius); background: var(--background);">
                        <!-- Stripe Elements will create form elements here -->
                    </div>
                    <div id="modal-card-errors" role="alert" style="color: var(--error); margin-top: 0.5rem; font-size: 0.875rem;"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="closePaymentModal()" class="btn btn-secondary">Cancel</button>
                <button onclick="savePaymentMethod()" class="btn btn-primary" id="savePaymentBtn">Update Payment Method</button>
            </div>
        </div>
    `;
    
    // Handle card errors
    setTimeout(() => {
        if (cardElement) {
            cardElement.on('change', ({error}) => {
                const displayError = document.getElementById('modal-card-errors');
                if (displayError) {
                    displayError.textContent = error ? error.message : '';
                }
            });
        }
    }, 150);
    
    return modal;
}

// Save new payment method
async function savePaymentMethod() {
    const saveBtn = document.getElementById('savePaymentBtn');
    const originalText = saveBtn.textContent;
    
    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Updating...';
        
        // Create payment method
        const {error, paymentMethod} = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
        });
        
        if (error) {
            throw new Error(error.message);
        }
        
        // Update payment method on backend
        const response = await fetch(`${API_BASE_URL}/api/billing/update-payment-method`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paymentMethodId: paymentMethod.id
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Payment method updated successfully!');
            closePaymentModal();
            await loadBillingData(); // Refresh the display
        } else {
            throw new Error(result.error || 'Failed to update payment method');
        }
        
    } catch (error) {
        console.error('Update payment method error:', error);
        alert('Failed to update payment method: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

// Close payment modal
function closePaymentModal() {
    const modal = document.getElementById('updatePaymentModal');
    if (modal) {
        if (cardElement) {
            cardElement.unmount();
        }
        modal.remove();
    }
}

// Download invoice
async function downloadInvoice(invoiceId = null) {
    try {
        const endpoint = invoiceId ? 
            `${API_BASE_URL}/api/billing/invoice/${invoiceId}/download` :
            `${API_BASE_URL}/api/billing/invoices`;
            
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (invoiceId && result.invoicePdf) {
                // Open the PDF in a new tab
                window.open(result.invoicePdf, '_blank');
            } else if (invoiceId && result.downloadUrl) {
                // Open the hosted invoice URL
                window.open(result.downloadUrl, '_blank');
            } else {
                alert('Invoice download will be available soon.');
            }
        } else {
            throw new Error('Failed to get invoice download link');
        }
        
    } catch (error) {
        console.error('Download invoice error:', error);
        alert('Unable to download invoice: ' + error.message);
    }
}

// Download all invoices
function downloadAllInvoices() {
    alert('Bulk invoice download feature coming soon!');
}

// Utility functions
function showLoading(show) {
    let overlay = document.getElementById('loadingOverlay');
    
    if (show && !overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Loading billing information...</p>
        `;
        document.body.appendChild(overlay);
    } else if (!show && overlay) {
        overlay.remove();
    }
}

function showError(message) {
    alert(message);
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
        closePaymentModal();
    }
});

// Add styles for modal and loading
const style = document.createElement('style');
style.textContent = `
    .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
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
    
    .plan-status.past_due {
        background: rgba(245, 158, 11, 0.1);
        color: var(--warning);
    }
    
    .plan-status.canceled {
        background: rgba(239, 68, 68, 0.1);
        color: var(--error);
    }
`;
document.head.appendChild(style);
