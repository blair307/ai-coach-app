/**
 * SIMPLE DIRECT FIX - Replace your entire sidebar-toggle.js with this
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Simple sidebar toggle starting...');
    
    const sidebar = document.querySelector('#sidebar');
    const mainContent = document.querySelector('.main-content');
    const toggleButtons = document.querySelectorAll('.sidebar-toggle');
    
    if (!sidebar || !mainContent) {
        console.error('❌ Missing sidebar or main content');
        return;
    }
    
    let isOpen = window.innerWidth > 768; // Open on desktop, closed on mobile
    
    console.log('📱 Initial state - isOpen:', isOpen, 'Screen width:', window.innerWidth);
    
    // FORCE initial styles with !important
    function forceStyles() {
        // Remove any existing inline styles first
        sidebar.style.cssText = '';
        mainContent.style.cssText = '';
        
        if (isOpen) {
            // Sidebar open
            sidebar.style.cssText = 'transform: translateX(0px) !important; transition: transform 0.3s ease !important;';
            mainContent.style.cssText = 'margin-left: 250px !important; transition: margin-left 0.3s ease !important;';
            console.log('✅ Forced OPEN styles');
        } else {
            // Sidebar closed  
            sidebar.style.cssText = 'transform: translateX(-250px) !important; transition: transform 0.3s ease !important;';
            mainContent.style.cssText = 'margin-left: 0px !important; transition: margin-left 0.3s ease !important;';
            console.log('✅ Forced CLOSED styles');
        }
    }
    
    // Toggle function
    function toggleSidebar() {
        isOpen = !isOpen;
        console.log('🔄 Toggling to:', isOpen ? 'OPEN' : 'CLOSED');
        forceStyles();
        
        // Update button appearance
        toggleButtons.forEach(btn => {
            if (isOpen) {
                btn.classList.remove('active');
            } else {
                btn.classList.add('active');
            }
        });
    }
    
    // Set initial state
    forceStyles();
    
    // Add click handlers to ALL toggle buttons
    toggleButtons.forEach((btn, index) => {
        console.log(`🎯 Adding handler to button ${index + 1}`);
        
        // Remove any existing handlers
        btn.onclick = null;
        
        // Add new handler
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log(`🎯 Button ${index + 1} clicked!`);
            toggleSidebar();
        });
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        const newIsOpen = window.innerWidth > 768;
        if (newIsOpen !== isOpen) {
            isOpen = newIsOpen;
            console.log('📱 Resize - new state:', isOpen ? 'OPEN' : 'CLOSED');
            forceStyles();
        }
    });
    
    // Add test function to window
    window.testSidebar = function() {
        console.log('🧪 Test toggle called');
        toggleSidebar();
    };
    
    console.log('✅ Simple sidebar ready!');
    console.log('🧪 Test with: window.testSidebar()');
    console.log('📊 Current state:', isOpen ? 'OPEN' : 'CLOSED');
});
