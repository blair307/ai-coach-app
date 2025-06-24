/**
 * UNIFIED Purple Hamburger Toggle - Replace your entire sidebar-toggle.js with this
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing unified purple hamburger...');
    
    const sidebar = document.querySelector('#sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !mainContent) {
        console.error('❌ Missing sidebar or main content');
        return;
    }
    
    let isMobile = window.innerWidth <= 768;
    let isOpen = !isMobile; // Start open on desktop, closed on mobile
    let universalButton = null;
    let mobileOverlay = null;
    
    // Create the universal purple hamburger button
    function createUniversalButton() {
        if (universalButton) {
            universalButton.remove();
        }
        
        universalButton = document.createElement('button');
        universalButton.className = 'universal-hamburger';
        universalButton.innerHTML = `
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
        `;
        
        universalButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 Universal hamburger clicked');
            toggleSidebar();
        });
        
        document.body.appendChild(universalButton);
        console.log('✅ Universal purple button created');
    }
    
    // Create mobile overlay
    function createMobileOverlay() {
        if (mobileOverlay) {
            mobileOverlay.remove();
        }
        
        mobileOverlay = document.createElement('div');
        mobileOverlay.className = 'mobile-overlay';
        
        mobileOverlay.addEventListener('click', function() {
            closeSidebar();
        });
        
        document.body.appendChild(mobileOverlay);
        console.log('✅ Mobile overlay created');
    }
    
    // Open sidebar
    function openSidebar() {
        console.log('🔓 Opening sidebar');
        
        sidebar.classList.add('open');
        
        if (isMobile) {
            mobileOverlay.classList.add('active');
        } else {
            mainContent.classList.add('shifted');
        }
        
        isOpen = true;
        console.log('✅ Sidebar opened');
    }
    
    // Close sidebar
    function closeSidebar() {
        console.log('🔒 Closing sidebar');
        
        sidebar.classList.remove('open');
        
        if (isMobile) {
            mobileOverlay.classList.remove('active');
        } else {
            mainContent.classList.remove('shifted');
        }
        
        isOpen = false;
        console.log('✅ Sidebar closed');
    }
    
    // Toggle function
    function toggleSidebar() {
        console.log('🔄 Toggling sidebar, currently:', isOpen ? 'open' : 'closed');
        
        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }
    
    // Handle window resize
    function handleResize() {
        const wasMobile = isMobile;
        isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== isMobile) {
            // Mode changed - keep sidebar state but adjust behavior
            if (isMobile) {
                // Switched to mobile
                console.log('📱 Switched to mobile mode');
                mainContent.classList.remove('shifted');
                if (isOpen) {
                    mobileOverlay.classList.add('active');
                }
            } else {
                // Switched to desktop
                console.log('🖥️ Switched to desktop mode');
                mobileOverlay.classList.remove('active');
                if (isOpen) {
                    mainContent.classList.add('shifted');
                }
            }
        }
    }
    
    // Initialize everything
    createUniversalButton();
    createMobileOverlay();
    
    // Start with appropriate initial state
    if (isMobile) {
        closeSidebar(); // Start closed on mobile
    } else {
        openSidebar(); // Start open on desktop
    }
    
    // Remove any old hamburger handlers
    const oldHamburgers = document.querySelectorAll('.sidebar-toggle');
    oldHamburgers.forEach(btn => {
        btn.style.display = 'none';
        btn.onclick = null;
    });
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Handle escape key to close sidebar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isOpen) {
            closeSidebar();
        }
    });
    
    // Export functions for testing
    window.sidebarToggle = {
        open: openSidebar,
        close: closeSidebar,
        toggle: toggleSidebar,
        isOpen: () => isOpen
    };
    
    console.log('✅ Unified purple hamburger ready');
    console.log('🧪 Test with: window.sidebarToggle.toggle()');
});
