/**
 * Fixed Sidebar Toggle - Simple and Working
 * Replace your entire sidebar-toggle.js file with this code
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing sidebar toggle...');
    
    const sidebar = document.querySelector('#sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !mainContent) {
        console.error('❌ Missing sidebar or main content');
        return;
    }
    
    let isOpen = true;
    let floatingButton = null;
    
    // Create floating button for mobile/closed state
    function createFloatingButton() {
        if (floatingButton) {
            floatingButton.remove();
        }
        
        floatingButton = document.createElement('button');
        floatingButton.innerHTML = `
            <span style="display: block; width: 20px; height: 3px; background: white; margin: 2px 0; border-radius: 2px; transition: all 0.2s;"></span>
            <span style="display: block; width: 20px; height: 3px; background: white; margin: 2px 0; border-radius: 2px; transition: all 0.2s;"></span>
            <span style="display: block; width: 20px; height: 3px; background: white; margin: 2px 0; border-radius: 2px; transition: all 0.2s;"></span>
        `;
        
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
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4) !important;
            transition: all 0.3s ease !important;
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
    
    // Open sidebar
    function openSidebar() {
        console.log('🔓 Opening sidebar');
        sidebar.style.transform = 'translateX(0)';
        mainContent.style.marginLeft = '280px';
        
        if (floatingButton) {
            floatingButton.style.display = 'none';
        }
        
        isOpen = true;
        
        // Add overlay for mobile
        if (window.innerWidth <= 768) {
            createOverlay();
        }
    }
    
    // Close sidebar
    function closeSidebar() {
        console.log('🔒 Closing sidebar');
        sidebar.style.transform = 'translateX(-280px)';
        mainContent.style.marginLeft = '0';
        
        if (floatingButton) {
            floatingButton.style.display = 'flex';
        }
        
        isOpen = false;
        removeOverlay();
    }
    
    // Create overlay for mobile
    function createOverlay() {
        if (document.querySelector('.sidebar-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 280px;
            width: calc(100vw - 280px);
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            cursor: pointer;
        `;
        
        overlay.addEventListener('click', closeSidebar);
        document.body.appendChild(overlay);
    }
    
    // Remove overlay
    function removeOverlay() {
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    // Handle hamburger button clicks
    function handleHamburgerClick(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎯 Hamburger clicked');
        
        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }
    
    // Find and attach to hamburger button
    function attachHamburgerHandler() {
        const hamburger = sidebar.querySelector('.sidebar-toggle');
        if (hamburger) {
            // Remove any existing listeners
            hamburger.removeEventListener('click', handleHamburgerClick);
            // Add new listener
            hamburger.addEventListener('click', handleHamburgerClick);
            console.log('🎯 Hamburger handler attached');
        } else {
            console.warn('⚠️ Hamburger button not found');
        }
    }
    
    // Handle window resize
    function handleResize() {
        if (window.innerWidth <= 768) {
            // Mobile view - close sidebar by default
            if (isOpen) {
                closeSidebar();
            }
        } else {
            // Desktop view - open sidebar and remove overlay
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
    
    // Attach hamburger handler
    attachHamburgerHandler();
    
    // Re-attach handler periodically to ensure it persists
    setInterval(attachHamburgerHandler, 3000);
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Handle escape key to close sidebar on mobile
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && window.innerWidth <= 768 && isOpen) {
            closeSidebar();
        }
    });
    
    console.log('✅ Sidebar toggle initialized successfully');
});
