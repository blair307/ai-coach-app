/**
 * WORKING Sidebar Toggle - Replace your sidebar-toggle.js with this
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing WORKING sidebar toggle...');
    
    const sidebar = document.querySelector('#sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !mainContent) {
        console.error('❌ Missing sidebar or main content');
        return;
    }
    
    let isOpen = true;
    let floatingButton = null;
    
    // Create floating button for mobile
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
    
    // Open sidebar function
    function openSidebar() {
        console.log('🔓 Opening sidebar');
        
        // Remove closed class and add open state
        sidebar.classList.remove('closed');
        mainContent.classList.remove('expanded');
        
        // Force CSS transform
        sidebar.style.transform = 'translateX(0)';
        mainContent.style.marginLeft = '280px';
        
        // Hide floating button
        if (floatingButton) {
            floatingButton.style.display = 'none';
        }
        
        // Remove mobile overlay
        removeOverlay();
        
        isOpen = true;
        console.log('✅ Sidebar opened');
    }
    
    // Close sidebar function
    function closeSidebar() {
        console.log('🔒 Closing sidebar');
        
        // Add closed class
        sidebar.classList.add('closed');
        mainContent.classList.add('expanded');
        
        // Force CSS transform
        sidebar.style.transform = 'translateX(-280px)';
        mainContent.style.marginLeft = '0';
        
        // Show floating button
        if (floatingButton) {
            floatingButton.style.display = 'flex';
        }
        
        // Add mobile overlay if needed
        if (window.innerWidth <= 768) {
            createOverlay();
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
    
    // Create overlay for mobile
    function createOverlay() {
        if (document.querySelector('.sidebar-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', closeSidebar);
        document.body.appendChild(overlay);
        console.log('📱 Mobile overlay created');
    }
    
    // Remove overlay
    function removeOverlay() {
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    // Attach to hamburger buttons
    function attachHamburgerHandlers() {
        const hamburgers = document.querySelectorAll('.sidebar-toggle');
        console.log('🎯 Found hamburger buttons:', hamburgers.length);
        
        hamburgers.forEach((btn, index) => {
            // Remove existing listeners
            btn.removeEventListener('click', toggleSidebar);
            
            // Add new listener
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log(`🎯 Hamburger ${index + 1} clicked`);
                toggleSidebar();
            });
            
            console.log(`✅ Handler attached to hamburger ${index + 1}`);
        });
    }
    
    // Handle window resize
    function handleResize() {
        if (window.innerWidth <= 768) {
            // Mobile - close sidebar and show floating button
            if (isOpen) {
                closeSidebar();
            }
        } else {
            // Desktop - open sidebar and hide floating button
            if (!isOpen) {
                openSidebar();
            }
            removeOverlay();
        }
    }
    
    // Initialize everything
    createFloatingButton();
    
    // Set initial state based on screen size
    if (window.innerWidth <= 768) {
        closeSidebar();
    } else {
        openSidebar();
    }
    
    // Attach hamburger handlers
    attachHamburgerHandlers();
    
    // Re-attach handlers every 2 seconds to ensure they persist
    setInterval(() => {
        const hamburgers = document.querySelectorAll('.sidebar-toggle');
        if (hamburgers.length > 0) {
            attachHamburgerHandlers();
        }
    }, 2000);
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Handle escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && window.innerWidth <= 768 && isOpen) {
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
    
    console.log('✅ WORKING sidebar toggle initialized successfully');
    console.log('🧪 Test with: window.sidebarToggle.toggle()');
});
