// ============================================
// CLEAN SIDEBAR TOGGLE - REPLACE YOUR sidebar-toggle.js
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing clean sidebar toggle...');
    
    const sidebar = document.querySelector('#sidebar, .sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !mainContent) {
        console.error('❌ Missing sidebar or main content elements');
        return;
    }
    
    let isOpen = window.innerWidth > 768; // Open on desktop, closed on mobile
    
    // Simple toggle function
    function toggleSidebar() {
        isOpen = !isOpen;
        
        if (isOpen) {
            // Open sidebar
            sidebar.classList.remove('closed');
            mainContent.classList.remove('expanded');
            console.log('✅ Sidebar opened');
        } else {
            // Close sidebar
            sidebar.classList.add('closed');
            mainContent.classList.add('expanded');
            console.log('✅ Sidebar closed');
        }
    }
    
    // Set initial state
    function setInitialState() {
        if (window.innerWidth <= 768) {
            // Mobile - start closed
            sidebar.classList.add('closed');
            mainContent.classList.add('expanded');
            isOpen = false;
        } else {
            // Desktop - start open
            sidebar.classList.remove('closed');
            mainContent.classList.remove('expanded');
            isOpen = true;
        }
    }
    
    // Attach event listeners to ALL hamburger buttons
    function attachToggleListeners() {
        const hamburgers = document.querySelectorAll('.sidebar-toggle');
        console.log(`🎯 Found ${hamburgers.length} hamburger buttons`);
        
        hamburgers.forEach((btn, index) => {
            // Remove any existing listeners
            btn.replaceWith(btn.cloneNode(true));
            const newBtn = document.querySelectorAll('.sidebar-toggle')[index];
            
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log(`🎯 Hamburger ${index + 1} clicked`);
                toggleSidebar();
            });
        });
    }
    
    // Handle window resize
    function handleResize() {
        const wasMobile = !isOpen && window.innerWidth <= 768;
        const isNowDesktop = window.innerWidth > 768;
        
        if (wasMobile && isNowDesktop) {
            // Moving from mobile to desktop - open sidebar
            isOpen = false; // Set to false so toggle will open
            toggleSidebar();
        } else if (isNowDesktop && !isOpen) {
            // Already on desktop but closed - open it
            isOpen = false;
            toggleSidebar();
        }
    }
    
    // Initialize
    setInitialState();
    attachToggleListeners();
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Handle escape key on mobile
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isOpen && window.innerWidth <= 768) {
            toggleSidebar();
        }
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && isOpen && 
            !sidebar.contains(e.target) && 
            !e.target.closest('.sidebar-toggle')) {
            toggleSidebar();
        }
    });
    
    // Export for testing
    window.sidebarToggle = {
        toggle: toggleSidebar,
        isOpen: () => isOpen,
        open: () => { if (!isOpen) toggleSidebar(); },
        close: () => { if (isOpen) toggleSidebar(); }
    };
    
    console.log('✅ Clean sidebar toggle initialized');
    console.log('🧪 Test with: window.sidebarToggle.toggle()');
});

// ============================================
// SIMPLIFIED CSS - ADD THIS TO YOUR styles.css
// Replace the existing sidebar toggle section with this:
// ============================================

/*
.sidebar {
    position: fixed;
    left: 0;
    top: 0;
    width: 280px;
    height: 100vh;
    background: var(--background);
    border-right: 1px solid var(--border);
    overflow-y: auto;
    z-index: 1000;
    transition: transform 0.3s ease;
    transform: translateX(0);
}

.sidebar.closed {
    transform: translateX(-280px);
}

.main-content {
    margin-left: 280px;
    transition: margin-left 0.3s ease;
    padding: 2rem;
    background: var(--surface);
    min-height: 100vh;
}

.main-content.expanded {
    margin-left: 0;
}

.sidebar-toggle {
    display: flex;
    flex-direction: column;
    width: 44px;
    height: 44px;
    background: var(--surface);
    border: 2px solid var(--primary);
    border-radius: var(--radius);
    cursor: pointer;
    justify-content: center;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;
    padding: 8px;
}

.sidebar-toggle:hover {
    background: #e2e8f0;
    border-color: var(--primary-dark);
    transform: scale(1.05);
}

.hamburger-line {
    width: 24px;
    height: 3px;
    background: var(--primary);
    border-radius: 2px;
    transition: all 0.2s ease;
}

.sidebar-toggle:hover .hamburger-line {
    background: var(--primary-dark);
}

@media (max-width: 768px) {
    .sidebar {
        transform: translateX(-280px);
    }
    
    .main-content {
        margin-left: 0;
        padding: 1rem;
    }
    
    .sidebar:not(.closed) {
        transform: translateX(0);
    }
    
    .sidebar:not(.closed)::after {
        content: '';
        position: fixed;
        top: 0;
        left: 280px;
        width: calc(100vw - 280px);
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
    }
}
*/
