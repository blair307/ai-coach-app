/**
 * FIXED Mobile Hamburger Toggle - Replace your sidebar-toggle.js with this
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing mobile hamburger toggle...');
    
    const sidebar = document.querySelector('#sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !mainContent) {
        console.error('❌ Missing sidebar or main content');
        return;
    }
    
    let isMobile = window.innerWidth <= 768;
    let isOpen = !isMobile; // Start open on desktop, closed on mobile
    let floatingButton = null;
    let mobileOverlay = null;
    
    // Create floating hamburger button
    function createFloatingButton() {
        if (floatingButton) {
            floatingButton.remove();
        }
        
        floatingButton = document.createElement('button');
        floatingButton.className = 'floating-toggle';
        floatingButton.innerHTML = `
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
        `;
        
        floatingButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 Floating button clicked');
            openSidebar();
        });
        
        document.body.appendChild(floatingButton);
        console.log('✅ Floating button created');
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
        
        if (isMobile) {
            sidebar.classList.add('mobile-open');
            mobileOverlay.classList.add('active');
        } else {
            sidebar.style.transform = 'translateX(0)';
            mainContent.style.marginLeft = '280px';
        }
        
        isOpen = true;
        console.log('✅ Sidebar opened');
    }
    
    // Close sidebar
    function closeSidebar() {
        console.log('🔒 Closing sidebar');
        
        if (isMobile) {
            sidebar.classList.remove('mobile-open');
            mobileOverlay.classList.remove('active');
        } else {
            sidebar.style.transform = 'translateX(-280px)';
            mainContent.style.marginLeft = '0';
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
    
    // Initialize hamburger handlers
    function initializeHamburger() {
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
        
        console.log('✅ Hamburger handlers attached');
    }
    
    // Handle window resize
    function handleResize() {
        const wasMobile = isMobile;
        isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== isMobile) {
            // Mode changed
            if (isMobile) {
                // Switched to mobile
                console.log('📱 Switched to mobile mode');
                closeSidebar();
            } else {
                // Switched to desktop
                console.log('🖥️ Switched to desktop mode');
                // Clean up mobile classes
                sidebar.classList.remove('mobile-open');
                mobileOverlay.classList.remove('active');
                // Open sidebar for desktop
                openSidebar();
            }
        }
    }
    
    // Initialize everything
    createFloatingButton();
    createMobileOverlay();
    
    // Set initial state based on screen size
    if (isMobile) {
        closeSidebar();
    } else {
        openSidebar();
    }
    
    // Initialize hamburger handlers
    initializeHamburger();
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Handle escape key to close sidebar on mobile
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isOpen && isMobile) {
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
    
    console.log('✅ Mobile hamburger toggle ready');
    console.log('🧪 Test with: window.sidebarToggle.toggle()');
});
