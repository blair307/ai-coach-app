/**
 * FINAL FIXED Sidebar Toggle - No Spam, Always Works
 * Replace your entire sidebar-toggle.js with this
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing FINAL sidebar toggle...');
    
    const sidebar = document.querySelector('#sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !mainContent) {
        console.error('❌ Missing sidebar or main content');
        return;
    }
    
    let isOpen = true;
    let isInitialized = false;
    
    // FIXED: Simple toggle function
    function toggleSidebar() {
        console.log('🔄 Toggling sidebar, currently:', isOpen ? 'open' : 'closed');
        
        if (isOpen) {
            // Close
            sidebar.classList.add('closed');
            mainContent.classList.add('expanded');
            sidebar.style.transform = 'translateX(-280px)';
            mainContent.style.marginLeft = '0';
            isOpen = false;
            console.log('🔒 Sidebar closed');
        } else {
            // Open
            sidebar.classList.remove('closed');
            mainContent.classList.remove('expanded');
            sidebar.style.transform = 'translateX(0)';
            mainContent.style.marginLeft = '280px';
            isOpen = true;
            console.log('🔓 Sidebar opened');
        }
    }
    
    // FIXED: Attach handler ONCE
    function initializeHamburger() {
        if (isInitialized) return;
        
        const hamburgers = document.querySelectorAll('.sidebar-toggle');
        console.log('🎯 Found hamburger buttons:', hamburgers.length);
        
        hamburgers.forEach((btn, index) => {
            btn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log(`🎯 Hamburger ${index + 1} clicked`);
                toggleSidebar();
            };
        });
        
        isInitialized = true;
        console.log('✅ Hamburger handlers attached (ONCE)');
    }
    
    // Handle window resize
    function handleResize() {
        if (window.innerWidth <= 768) {
            if (isOpen) {
                sidebar.style.transform = 'translateX(-280px)';
                mainContent.style.marginLeft = '0';
                isOpen = false;
            }
        } else {
            if (!isOpen) {
                sidebar.style.transform = 'translateX(0)';
                mainContent.style.marginLeft = '280px';
                isOpen = true;
            }
        }
    }
    
    // Set initial state
    if (window.innerWidth <= 768) {
        sidebar.style.transform = 'translateX(-280px)';
        mainContent.style.marginLeft = '0';
        isOpen = false;
    } else {
        sidebar.style.transform = 'translateX(0)';
        mainContent.style.marginLeft = '280px';
        isOpen = true;
    }
    
    // Initialize hamburger ONCE
    initializeHamburger();
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Export for testing
    window.sidebarToggle = {
        toggle: toggleSidebar,
        isOpen: () => isOpen
    };
    
    console.log('✅ FINAL sidebar toggle ready');
    console.log('🧪 Test with: window.sidebarToggle.toggle()');
});
