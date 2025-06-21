/**
 * Bulletproof Sidebar Toggle - Guaranteed to work
 * Replace entire sidebar-toggle.js file with this code
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Bulletproof sidebar toggle starting...');
    
    const sidebar = document.querySelector('#sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !mainContent) {
        console.error('❌ Missing sidebar or main content');
        return;
    }
    
    // Force create floating button immediately
    let floatingButton = document.querySelector('#floating-toggle');
    if (floatingButton) {
        floatingButton.remove(); // Remove any existing one
    }
    
    // Create fresh floating button
    floatingButton = document.createElement('button');
    floatingButton.id = 'floating-toggle';
    floatingButton.className = 'floating-toggle';
    floatingButton.innerHTML = `
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
    `;
    floatingButton.setAttribute('aria-label', 'Open sidebar');
    
    // Force it to be positioned and styled correctly
    floatingButton.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        left: 20px !important;
        width: 50px !important;
        height: 50px !important;
        background: #6366f1 !important;
        border: none !important;
        border-radius: 10px !important;
        cursor: pointer !important;
        z-index: 99999 !important;
        display: none !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: center !important;
        gap: 4px !important;
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4) !important;
        transition: all 0.3s ease !important;
    `;
    
    document.body.appendChild(floatingButton);
    console.log('✅ Created bulletproof floating button');
    
    // Start with sidebar open
    let isOpen = true;
    
    // Simple toggle function
    function toggleSidebar() {
        console.log('🔄 TOGGLE! Current state:', isOpen ? 'OPEN' : 'CLOSED');
        
        if (isOpen) {
            // CLOSE sidebar
            console.log('🔒 CLOSING SIDEBAR...');
            sidebar.classList.remove('sidebar-open');
            sidebar.classList.add('sidebar-closed');
            
            // FORCE floating button to show
            floatingButton.style.display = 'flex';
            console.log('✅ SIDEBAR CLOSED - FLOATING BUTTON FORCED VISIBLE');
            isOpen = false;
            
        } else {
            // OPEN sidebar  
            console.log('🔓 OPENING SIDEBAR...');
            sidebar.classList.remove('sidebar-closed');
            sidebar.classList.add('sidebar-open');
            
            // HIDE floating button
            floatingButton.style.display = 'none';
            console.log('✅ SIDEBAR OPENED - FLOATING BUTTON HIDDEN');
            isOpen = true;
        }
    }
    
    // Attach floating button click handler
    floatingButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎯 FLOATING BUTTON CLICKED!');
        toggleSidebar();
    });
    
    // Function to attach sidebar button handler
    function attachSidebarHandler() {
        const sidebarBtn = sidebar.querySelector('.sidebar-toggle');
        if (sidebarBtn) {
            // Remove old handler first
            sidebarBtn.removeEventListener('click', handleSidebarClick);
            // Add new handler
            sidebarBtn.addEventListener('click', handleSidebarClick);
            console.log('🎯 Sidebar button handler attached');
        }
    }
    
    // Sidebar button click handler
    function handleSidebarClick(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎯 SIDEBAR BUTTON CLICKED!');
        toggleSidebar();
    }
    
    // Set initial state
    sidebar.classList.add('sidebar-open');
    floatingButton.style.display = 'none';
    
    // Attach initial handlers
    attachSidebarHandler();
    
    // Re-attach handlers every second to be absolutely sure
    setInterval(attachSidebarHandler, 1000);
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768 && isOpen) {
            // Auto-close on mobile
            toggleSidebar();
        }
    });
    
    console.log('🎉 Bulletproof sidebar toggle ready!');
    
    // Debug: Show floating button manually after 3 seconds for testing
    setTimeout(() => {
        console.log('🧪 TEST: Forcing floating button visible for 2 seconds...');
        const originalDisplay = floatingButton.style.display;
        floatingButton.style.display = 'flex';
        setTimeout(() => {
            floatingButton.style.display = originalDisplay;
            console.log('🧪 TEST: Floating button back to original state');
        }, 2000);
    }, 3000);
});
