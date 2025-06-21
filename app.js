// General App JavaScript - Used on Landing Page

// Configuration
const API_BASE_URL = 'https://ai-coach-backend-pbse.onrender.com';

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    checkExistingAuth();
    
    // Add smooth scrolling to navigation links
    addSmoothScrolling();
    
    // Add loading states to buttons
    addButtonLoadingStates();
    
    // Handle plan selection from URL
    handlePlanSelection();
});

// Check if user is already authenticated
function checkExistingAuth() {
    const token = localStorage.getItem('authToken');
    const currentPage = window.location.pathname.split('/').pop();
    
    // If user is logged in and on landing page, show logged in state
    if (token && (currentPage === 'index.html' || currentPage === '')) {
        showLoggedInState();
    }
}

// Show logged in state on landing page
function showLoggedInState() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        navLinks.innerHTML = `
            <a href="dashboard.html" class="nav-link">Dashboard</a>
            <a href="#" class="nav-link" onclick="logout()">Logout</a>
        `;
    }
    
    // Update hero section
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        const startButton = document.createElement('a');
        startButton.href = 'dashboard.html';
        startButton.className = 'btn btn-primary';
        startButton.style.marginTop = '2rem';
        startButton.textContent = 'Go to Dashboard';
        
        // Replace pricing cards with dashboard button
        const pricingCards = document.querySelector('.pricing-cards');
        if (pricingCards) {
            pricingCards.style.display = 'none';
            pricingCards.parentNode.appendChild(startButton);
        }
    }
}

// Add smooth scrolling to anchor links
function addSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Add loading states to buttons
function addButtonLoadingStates() {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            // Only add loading state to buttons that navigate to signup
            if (this.href && this.href.includes('signup.html')) {
                this.classList.add('loading');
                this.textContent = 'Loading...';
                
                // Reset after a short delay if navigation doesn't happen
                setTimeout(() => {
                    this.classList.remove('loading');
                    this.textContent = this.getAttribute('data-original-text') || 'Get Started';
                }, 3000);
            }
        });
        
        // Store original text
        button.setAttribute('data-original-text', button.textContent);
    });
}

// Handle plan selection from URL parameters
function handlePlanSelection() {
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan');
    
    if (plan) {
        // Highlight the selected plan
        const pricingCards = document.querySelectorAll('.pricing-card');
        pricingCards.forEach(card => {
            const link = card.querySelector('a');
            if (link && link.href.includes(`plan=${plan}`)) {
                card.classList.add('selected');
                card.style.transform = 'scale(1.1)';
                card.style.boxShadow = '0 20px 40px rgba(99, 102, 241, 0.3)';
            }
        });
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.reload(); // Reload to show logged out state
    }
}

// Newsletter signup (optional feature)
function subscribeNewsletter() {
    const email = prompt('Enter your email for updates:');
    if (email && email.includes('@')) {
        alert('Thanks for subscribing! We\'ll keep you updated.');
        // In a real app, this would send the email to your backend
    } else if (email) {
        alert('Please enter a valid email address.');
    }
}

// Contact form handler (if you add a contact section)
function handleContactForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    // In a real app, this would send to your backend
    console.log('Contact form data:', data);
    alert('Thanks for your message! We\'ll get back to you soon.');
    event.target.reset();
}

// Add floating action button for logged-in users
function addFloatingActionButton() {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    const fab = document.createElement('div');
    fab.className = 'floating-action-button';
    fab.innerHTML = '💬';
    fab.title = 'Quick Chat with AI Coach';
    fab.onclick = () => window.location.href = 'ai-coach.html';
    
    // Add styles
    fab.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 60px;
        height: 60px;
        background: #6366f1;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        transition: all 0.3s ease;
        z-index: 1000;
    `;
    
    fab.addEventListener('mouseenter', () => {
        fab.style.transform = 'scale(1.1)';
        fab.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)';
    });
    
    fab.addEventListener('mouseleave', () => {
        fab.style.transform = 'scale(1)';
        fab.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
    });
    
    document.body.appendChild(fab);
}

// Add the floating button if user is logged in
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(addFloatingActionButton, 1000);
});

// Handle window resize for responsive adjustments
window.addEventListener('resize', function() {
    // Adjust hero text size on very small screens
    const heroTitle = document.querySelector('.hero-content h1');
    if (heroTitle && window.innerWidth < 480) {
        heroTitle.style.fontSize = '1.8rem';
    } else if (heroTitle) {
        heroTitle.style.fontSize = '3.5rem';
    }
});

// Add scroll animations (optional enhancement)
function addScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe feature cards
    const featureCards = document.querySelectorAll('.feature');
    featureCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });
}

// Initialize scroll animations after page load
window.addEventListener('load', addScrollAnimations);

// Error handling for network issues
function handleNetworkError(error) {
    console.error('Network error:', error);
    
    // Show user-friendly message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        background: #fee2e2;
        color: #dc2626;
        padding: 1rem;
        border-radius: 8px;
        border: 1px solid #fecaca;
        z-index: 1000;
    `;
    errorDiv.textContent = 'Connection issue. Please check your internet.';
    
    document.body.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Global error handler
window.addEventListener('error', handleNetworkError);
window.addEventListener('unhandledrejection', event => {
    handleNetworkError(event.reason);
});
