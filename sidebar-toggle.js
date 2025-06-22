/**
 * PERMANENT FIXED Sidebar Toggle - With Working Floating Button
 * Replace your entire sidebar-toggle.js with this
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing PERMANENT sidebar toggle...');
    
    const sidebar = document.querySelector('#sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !mainContent) {
        console.error('❌ Missing sidebar or main content');
        return;
    }
    
    let isOpen = true;
    let isInitialized = false;
    let floatingButton = null;
    
    // Create floating hamburger button
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
        
        sidebar.classList.remove('closed');
        mainContent.classList.remove('expanded');
        sidebar.style.transform = 'translateX(0)';
        mainContent.style.marginLeft = '280px';
        
        // Hide floating button
        if (floatingButton) {
            floatingButton.style.display = 'none';
        }
        
        isOpen = true;
        console.log('✅ Sidebar opened');
    }
    
    // Close sidebar
    function closeSidebar() {
        console.log('🔒 Closing sidebar');
        
        sidebar.classList.add('closed');
        mainContent.classList.add('expanded');
        sidebar.style.transform = 'translateX(-280px)';
        mainContent.style.marginLeft = '0';
        
        // Show floating button
        if (floatingButton) {
            floatingButton.style.display = 'flex';
        }
        
        isOpen = false;
        console.log('✅ Sidebar closed, floating button shown');
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
    
    // Initialize hamburger handlers ONCE
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
        console.log('✅ Hamburger handlers attached ONCE');
    }
    
    // Handle window resize
    function handleResize() {
        if (window.innerWidth <= 768) {
            // Mobile - close sidebar by default
            if (isOpen) {
                closeSidebar();
            }
        } else {
            // Desktop - open sidebar by default
            if (!isOpen) {
                openSidebar();
            }
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
    
    // Initialize hamburger handlers
    initializeHamburger();
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Handle escape key to close sidebar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isOpen && window.innerWidth <= 768) {
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
    
    console.log('✅ PERMANENT sidebar toggle ready with floating button');
    console.log('🧪 Test with: window.sidebarToggle.toggle()');
});
