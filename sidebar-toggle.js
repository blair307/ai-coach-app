/**
 * Updated Sidebar Toggle - Always shows hamburger button for desktop use
 * Replace entire sidebar-toggle.js file with this code
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing sidebar toggle with always-visible hamburger...');
    
    // Find elements
    const sidebar = document.querySelector('#sidebar');
    const mainContent = document.querySelector('.main-content');
    const sidebarHeader = document.querySelector('.sidebar-header');
    
    // Find ALL toggle buttons (there should be one in sidebar header)
    const toggleButtons = document.querySelectorAll('.sidebar-toggle');
    
    console.log('Found elements:', {
        sidebar: !!sidebar,
        mainContent: !!mainContent,
        sidebarHeader: !!sidebarHeader,
        toggleButtons: toggleButtons.length
    });
    
    if (!sidebar || !mainContent) {
        console.error('❌ Missing required elements for sidebar toggle');
        return;
    }
    
    // Create floating button if it doesn't exist
    let floatingButton = document.querySelector('#floating-toggle');
    if (!floatingButton) {
        floatingButton = document.createElement('button');
        floatingButton.id = 'floating-toggle';
        floatingButton.innerHTML = `
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
        `;
        floatingButton.className = 'floating-toggle';
        floatingButton.setAttribute('aria-label', 'Open navigation menu');
        floatingButton.style.display = 'none'; // Hidden initially
        
        document.body.appendChild(floatingButton);
        console.log('✅ Created floating toggle button');
    }
    
    // Always start with sidebar OPEN on all screen sizes
    let isOpen = true;
    
    // Apply initial state - sidebar always starts open
    function setInitialState() {
        console.log('📱 Setting initial state: SIDEBAR OPEN');
        sidebar.classList.remove('sidebar-closed');
        sidebar.classList.add('sidebar-open');
        floatingButton.style.display = 'none';
        
        // Update ARIA attributes
        sidebar.setAttribute('aria-hidden', false);
        floatingButton.setAttribute('aria-expanded', true);
        
        // Update all toggle buttons
        toggleButtons.forEach(btn => {
            btn.setAttribute('aria-expanded', true);
        });
    }
    
    // Toggle function
    function toggleSidebar() {
        console.log('🔄 Toggle clicked! Current state:', isOpen ? 'OPEN' : 'CLOSED');
        
        if (isOpen) {
            // Close sidebar
            console.log('🔒 Closing sidebar...');
            sidebar.classList.remove('sidebar-open');
            sidebar.classList.add('sidebar-closed');
            floatingButton.style.display = 'flex';
            isOpen = false;
            console.log('✅ Sidebar closed, floating button visible');
        } else {
            // Open sidebar
            console.log('🔓 Opening sidebar...');
            sidebar.classList.remove('sidebar-closed');
            sidebar.classList.add('sidebar-open');
            floatingButton.style.display = 'none';
            isOpen = true;
            console.log('✅ Sidebar opened, floating button hidden');
        }
        
        // Update ARIA attributes
        sidebar.setAttribute('aria-hidden', !isOpen);
        floatingButton.setAttribute('aria-expanded', isOpen);
        
        // Update all toggle buttons
        toggleButtons.forEach(btn => {
            btn.setAttribute('aria-expanded', isOpen);
        });
    }
    
    // Attach click handlers to ALL toggle buttons
    toggleButtons.forEach((button, index) => {
        console.log(`🎯 Attaching handler to button ${index + 1}:`, button);
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log(`🖱️ Button ${index + 1} clicked!`);
            toggleSidebar();
        });
    });
    
    // Attach handler to floating button
    floatingButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎯 Floating button clicked!');
        toggleSidebar();
    });
    
    // Handle escape key (only close on mobile)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isOpen && window.innerWidth <= 768) {
            console.log('⌨️ Escape key pressed - closing sidebar');
            toggleSidebar();
        }
    });
    
    // Handle window resize - but keep desktop functionality
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Only auto-close on very small screens
            if (window.innerWidth <= 600 && isOpen) {
                console.log(`📏 Very small screen detected - closing sidebar`);
                toggleSidebar();
            }
            // On larger screens, let user control the sidebar
        }, 100);
    });
    
    // Set initial state
    setInitialState();
    
    console.log('🎉 Sidebar toggle initialized successfully!');
    console.log('🔍 Debug info:', {
        isOpen,
        sidebarClasses: sidebar.className,
        floatingButtonDisplay: floatingButton.style.display,
        screenWidth: window.innerWidth,
        toggleButtonsFound: toggleButtons.length
    });
    
    // Extra debugging - let's see what's in the sidebar header
    if (sidebarHeader) {
        console.log('📋 Sidebar header contents:', sidebarHeader.innerHTML);
        console.log('📋 Sidebar header children:', sidebarHeader.children);
    }
});
